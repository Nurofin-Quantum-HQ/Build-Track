const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const Transaction = require("../models/Transaction");
const Worker = require("../models/Worker");
const Project = require("../models/Project");
const User = require("../models/User");
const mongoose = require("mongoose");
const { protect, requirePermission, getAdminId, canAccessProjectFilter } = require("../middleware/auth");
const ledger = require("../services/ledger");
router.use(protect);
function getDateRange(query) {
  const { year, month, rangeStart, rangeEnd } = query;
  if (rangeStart && rangeEnd) {
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }
  const parsedYear = parseInt(year) || new Date().getFullYear();
  const parsedMonth = parseInt(month) || new Date().getMonth();
  return {
    startDate: new Date(parsedYear, parsedMonth, 1, 0, 0, 0, 0),
    endDate: new Date(parsedYear, parsedMonth + 1, 0, 23, 59, 59, 999),
  };
}
function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}
function normalizeProjectStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed" || s === "planning") return "ON TRACK";
  if (s === "on hold" || s === "cancelled") return "REVIEW NEEDED";
  return "IN PROGRESS";
}
async function buildProjectScope(req) {
  const isAdmin = req.user.role === "Admin";
  if (isAdmin) {
    const projects = await Project.find({ createdBy: req.user._id }).select("_id").lean();
    const ids = projects.map((p) => p._id);
    return {
      projectFilter: { createdBy: req.user._id },
      projectIds: ids,
      isAdmin: true,
    };
  }
  const projectFilter = canAccessProjectFilter(req);
  const projects = await Project.find(projectFilter).select("_id").lean();
  const ids = projects.map((p) => p._id);
  return {
    projectFilter,
    projectIds: ids,
    isAdmin: false,
  };
}
router.get("/financial", async (req, res) => {
  try {
    const { type, category, project } = req.query;
    const userId = req.user._id;
    const { startDate, endDate } = getDateRange(req.query);
    const { projectFilter, projectIds, isAdmin } = await buildProjectScope(req);
    const query = {
      date: { $gte: startDate, $lte: endDate },
    };
    const adminId = await getAdminId(req.user);
    if (isAdmin) {
      query.$or = [{ createdBy: userId }, { project: { $in: projectIds } }];
    } else {
      query.$or = [
        { project: { $in: projectIds } },
        { project: null, createdBy: { $in: [userId, adminId].filter(Boolean) } }
      ];
    }
    if (type && type !== "All") query.type = type;
    if (category) query.category = category;
    if (project) {
      const pDoc = await Project.findOne(canAccessProjectFilter(req, project));
      if (!pDoc) {
        return res.status(403).json({ message: "Access denied to this project" });
      }
      query.project = project;
      delete query.$or;
    }
    const transactions = await Transaction.find(query)
      .populate("project", "projectName status budget progress")
      .populate("worker", "_id name trade dailyWage")
      .sort({ date: -1, createdAt: -1 });
    const income = transactions
      .filter((t) => t.type === "Income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expenses = transactions
      .filter((t) => t.type !== "Income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const profit = income - expenses;
    const totalVolume = income + expenses;
    const compliance =
      totalVolume > 0
        ? Math.min(100, Math.max(0, (income / totalVolume) * 100))
        : 100;
    const projects = await Project.find(projectFilter).lean();
    const projectAnalytics = projects.map((p) => {
      const pTransactions = transactions.filter(
        (t) => t.project?._id?.toString() === p._id.toString()
      );
      const spent = pTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalBudget = Number(p.budget?.total || 0);
      const remaining = totalBudget - spent;
      const utilization =
        totalBudget > 0 ? ((spent / totalBudget) * 100).toFixed(1) : 0;
      return {
        _id: p._id,
        projectName: p.projectName,
        status: p.status,
        progress: p.progress || 0,
        totalBudget,
        spentAmount: spent,
        remainingBudget: remaining,
        utilization,
      };
    });
    const workersRecords = await Worker.find({ createdBy: adminId }).lean();
    const wageTransactions = transactions.filter((t) => t.type === "Wages");
    const workerStats = {};
    wageTransactions.forEach((t) => {
      const wId = t.worker?._id?.toString() || t.worker?.toString();
      if (!wId) return;
      if (!workerStats[wId]) {
        workerStats[wId] = { totalPayout: 0, daySet: new Set(), project: null };
      }
      workerStats[wId].totalPayout += Number(t.amount || 0);
      workerStats[wId].daySet.add(new Date(t.date).toISOString().slice(0, 10));
      if (!workerStats[wId].project && t.project) {
        workerStats[wId].project = t.project;
      }
    });
    const workers = workersRecords
      .filter((w) => workerStats[w._id.toString()])
      .map((w) => {
        const stats = workerStats[w._id.toString()];
        return {
          _id: w._id,
          name: w.name,
          trade: w.trade || "General Labor",
          dailyWage: w.dailyWage || 0,
          totalDays: stats.daySet.size,
          estimatedMonthlyPayout: stats.totalPayout,
          project: stats.project?.projectName || "Various",
          projectStatus: normalizeProjectStatus(stats.project?.status),
        };
      });
    const categoryBreakdown = {
      Materials: 0,
      Wages: 0,
      Expense: 0,
      Income: 0,
      Equipment: 0,
      Misc: 0,
    };
    transactions.forEach((t) => {
      const amount = Number(t.amount || 0);
      const typeKey = t.type || "Misc";
      if (categoryBreakdown[typeKey] === undefined) categoryBreakdown[typeKey] = 0;
      categoryBreakdown[typeKey] += amount;
    });
    const monthlyTrend = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyTrend[key]) monthlyTrend[key] = { income: 0, expenses: 0 };
      if (t.type === "Income") {
        monthlyTrend[key].income += Number(t.amount || 0);
      } else {
        monthlyTrend[key].expenses += Number(t.amount || 0);
      }
    });
    const targetCost = projects.reduce((sum, p) => {
      return sum + Number(p.budget?.total || p.totalBudget || 0);
    }, 0);
    const analytics = {
      material: categoryBreakdown["Materials"] || 0,
      labour: categoryBreakdown["Wages"] || 0,
      equipment: categoryBreakdown["Equipment"] || 0,
      misc: categoryBreakdown["Expense"] || 0,
      targetCost,
    };
    const latestActual =
      analytics.material + analytics.labour + analytics.equipment + analytics.misc;
    analytics.latestActual = latestActual;
    analytics.chartStatus = targetCost > 0 && latestActual > targetCost ? "OVER_BUDGET" : "ON_TRACK";
    const recentTransactions = transactions.slice(0, 10).map((t) => ({
      _id: t._id,
      title: t.title,
      type: t.type,
      amount: t.amount,
      date: t.date,
      category: t.category,
      project: t.project?.projectName || "N/A",
      worker: t.worker?.name || "N/A",
    }));

    // Update onboarding flag
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { "onboarding.hasViewedReports": true }
      });
    }

    res.json({
      success: true,
      income,
      expenses,
      profit,
      compliance,
      transactionCount: transactions.length,
      workers,
      projects: projectAnalytics,
      categoryBreakdown,
      analytics,
      monthlyTrend,
      recentTransactions,
      dateRange: { startDate, endDate },
    });
  } catch (err) {
    console.error("Financial report error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch financial report" });
  }
});
router.get("/financial/export-csv", async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query);
    const { projectIds, isAdmin } = await buildProjectScope(req);
    const txQuery = {
      type: "Wages",
      date: { $gte: startDate, $lte: endDate },
    };
    const adminId = await getAdminId(req.user);
    if (isAdmin) {
      txQuery.$or = [{ createdBy: req.user._id }, { project: { $in: projectIds } }];
    } else {
      txQuery.$or = [
        { project: { $in: projectIds } },
        { project: null, createdBy: { $in: [req.user._id, adminId].filter(Boolean) } }
      ];
    }
    const wageTransactions = await Transaction.find(txQuery)
      .populate("worker", "name trade dailyWage")
      .populate("project", "projectName");
    const header = "Worker Name,Role,Project,Date,Daily Rate,Amount\n";
    const rows = wageTransactions
      .map((t) => {
        const worker = t.worker || {};
        const project = t.project || {};
        return [
          `"${(worker.name || "").replace(/"/g, '""')}"`,
          `"${(worker.trade || "General Labor").replace(/"/g, '""')}"`,
          `"${(project.projectName || "Various").replace(/"/g, '""')}"`,
          new Date(t.date).toISOString().slice(0, 10),
          worker.dailyWage || 0,
          t.amount || 0,
        ].join(",");
      })
      .join("\n");
    const csv = header + rows;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="BuildTrack_Wages_Report.csv"'
    );
    res.send(csv);
  } catch (err) {
    console.error("CSV export error:", err);
    res.status(500).json({ message: "Failed to export CSV" });
  }
});
router.get("/financial/export-pdf", async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query);
    const { projectIds, isAdmin } = await buildProjectScope(req);
    const txQuery = {
      date: { $gte: startDate, $lte: endDate },
    };
    const adminId = await getAdminId(req.user);
    if (isAdmin) {
      txQuery.$or = [{ createdBy: req.user._id }, { project: { $in: projectIds } }];
    } else {
      txQuery.$or = [
        { project: { $in: projectIds } },
        { project: null, createdBy: { $in: [req.user._id, adminId].filter(Boolean) } }
      ];
    }
    const transactions = await Transaction.find(txQuery).populate("project", "projectName");
    const income = transactions
      .filter((t) => t.type === "Income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expenses = transactions
      .filter((t) => t.type !== "Income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const profit = income - expenses;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="financial-report.pdf"'
    );
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    doc.fontSize(22).text("BuildTrack Financial Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();
    doc.text(`Income: ${formatINR(income)}`);
    doc.text(`Expenses: ${formatINR(expenses)}`);
    doc.text(`Profit: ${formatINR(profit)}`);
    doc.moveDown();
    doc.fontSize(16).text("Recent Transactions");
    doc.moveDown(0.5);
    transactions.slice(0, 15).forEach((t) => {
      doc
        .fontSize(11)
        .text(
          `${new Date(t.date).toLocaleDateString()} | ${t.title} | ${t.type} | ${formatINR(t.amount)}`
        );
    });
    doc.end();
  } catch (err) {
    console.error("PDF export error:", err);
    res.status(500).json({ message: "Failed to export PDF" });
  }
});
// ---------------------------------------------------------------------------
// GET /api/reports/ledger — money in / money out, filterable and groupable.
// Admin (the company account) or anyone holding the `view_finances` permission.
// Company scope is identical to GET /api/transactions.
// ---------------------------------------------------------------------------
const LEDGER_ROW_CAP = 5000;
const LEDGER_GROUPS = ["category", "project", "month", "payee", "none"];

async function ledgerScope(req) {
  if (req.user.role !== "Admin") {
    const projects = await Project.find(canAccessProjectFilter(req)).select("_id").lean();
    const adminId = await getAdminId(req.user);
    return {
      $or: [
        { project: { $in: projects.map((p) => p._id) } },
        { project: null, createdBy: { $in: [req.user._id, adminId].filter(Boolean) } },
      ],
    };
  }
  const projects = await Project.find({ createdBy: req.user._id }).select("_id").lean();
  return {
    $or: [
      { project: { $in: projects.map((p) => p._id) } },
      { project: null, createdBy: req.user._id },
    ],
  };
}

router.get("/ledger", requirePermission(["view_finances"]), async (req, res) => {
  try {
    const q = req.query;
    const bad = (message) => res.status(400).json({ message });

    const from = q.from ? String(q.from) : "";
    const to = q.to ? String(q.to) : "";
    if ((from && !ledger.DATE_RE.test(from)) || (to && !ledger.DATE_RE.test(to))) {
      return bad("from/to must be YYYY-MM-DD");
    }
    const direction = q.direction ? String(q.direction) : "all";
    if (!["in", "out", "all"].includes(direction)) return bad("direction must be in, out or all");
    const groupBy = q.groupBy ? String(q.groupBy) : "none";
    if (!LEDGER_GROUPS.includes(groupBy)) return bad(`groupBy must be one of ${LEDGER_GROUPS.join(", ")}`);
    const categories = q.category
      ? String(q.category).split(",").map((c) => c.trim()).filter(Boolean)
      : [];
    const unknownCat = categories.find((c) => !ledger.LEDGER_CATEGORIES.includes(c));
    if (unknownCat) return bad(`Unknown category: ${unknownCat}`);
    const search = q.q ? String(q.q).trim().slice(0, 100) : "";

    const scope = await ledgerScope(req);
    const projectId = q.projectId ? String(q.projectId) : "";
    if (projectId && projectId !== "all") {
      if (!mongoose.Types.ObjectId.isValid(projectId)) return bad("Invalid projectId");
      const pDoc = await Project.findOne(canAccessProjectFilter(req, projectId)).select("_id").lean();
      if (!pDoc) return res.status(403).json({ message: "Access denied to this project" });
      // Same as GET /transactions: a project filter replaces the $or scope.
      delete scope.$or;
      scope.project = new mongoose.Types.ObjectId(projectId);
    }

    let workerIds = [];
    if (search) {
      const adminId = await getAdminId(req.user);
      const ws = await Worker.find({
        createdBy: adminId,
        name: { $regex: ledger.escapeRegex(search), $options: "i" },
      })
        .select("_id")
        .lean();
      workerIds = ws.map((w) => w._id);
    }

    const base = ledger.buildBaseStages(scope, {
      from,
      to,
      direction,
      categories,
      q: search,
      workerIds,
    });
    const gStages = ledger.groupStages(groupBy);
    const [sumAgg, groupAgg, rowAgg] = await Promise.all([
      Transaction.aggregate([...base, ...ledger.summaryStages()]),
      gStages ? Transaction.aggregate([...base, ...gStages]) : Promise.resolve([]),
      Transaction.aggregate([...base, ...ledger.rowStages(LEDGER_ROW_CAP + 1)]),
    ]);

    const sum = sumAgg[0] || { moneyIn: 0, moneyOut: 0, count: 0 };
    const summary = {
      moneyIn: ledger.round2(sum.moneyIn),
      moneyOut: ledger.round2(sum.moneyOut),
      net: ledger.round2(sum.moneyIn - sum.moneyOut),
      count: sum.count,
    };

    const truncated = rowAgg.length > LEDGER_ROW_CAP;
    const rawRows = truncated ? rowAgg.slice(0, LEDGER_ROW_CAP) : rowAgg;

    // Resolve names for the rows and groups we actually return.
    const idStr = (v) => (v ? String(v) : "");
    const projIds = new Set(rawRows.map((r) => idStr(r.project)).filter(Boolean));
    const workerIdSet = new Set(rawRows.map((r) => idStr(r.worker)).filter(Boolean));
    if (groupBy === "project") groupAgg.forEach((g) => g._id && projIds.add(String(g._id)));
    if (groupBy === "payee") {
      groupAgg.forEach((g) => {
        if (String(g._id).startsWith("w:")) workerIdSet.add(String(g._id).slice(2));
      });
    }
    const validIds = (set) => [...set].filter((i) => mongoose.Types.ObjectId.isValid(i));
    const [projDocs, workerDocs] = await Promise.all([
      projIds.size ? Project.find({ _id: { $in: validIds(projIds) } }).select("projectName").lean() : [],
      workerIdSet.size ? Worker.find({ _id: { $in: validIds(workerIdSet) } }).select("name").lean() : [],
    ]);
    const projName = new Map(projDocs.map((p) => [String(p._id), p.projectName || ""]));
    const workerName = new Map(workerDocs.map((w) => [String(w._id), w.name || ""]));

    const rows = ledger.withRunningBalance(
      rawRows.map((r) => ({
        id: String(r._id),
        date: r._d,
        projectId: r.project ? String(r.project) : null,
        projectName: r.project ? projName.get(String(r.project)) || "" : "",
        direction: r._dir,
        category: r._cat,
        title: r.title || "",
        payee: r.supplier || (r.worker ? workerName.get(String(r.worker)) || "" : ""),
        notes: r.notes || "",
        amount: Number(r.amount) || 0,
        paymentStatus: r.paymentStatus || "",
        runningBalance: 0,
        type: r.type,
        approvalStatus: r.approvalStatus || "",
      })),
      summary.net
    );

    const labelFor = (key) => {
      if (groupBy === "category") return ledger.CATEGORY_LABELS[key] || key;
      if (groupBy === "project") return key ? projName.get(key) || "Unknown project" : "No project";
      if (groupBy === "payee") {
        if (key.startsWith("s:")) return key.slice(2);
        if (key.startsWith("w:")) return workerName.get(key.slice(2)) || "Unknown worker";
        return "Unspecified";
      }
      if (groupBy === "month") {
        const [y, m] = key.split("-");
        const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return names[Number(m) - 1] ? `${names[Number(m) - 1]} ${y}` : key || "Unknown";
      }
      return key;
    };
    const groups = groupAgg
      .map((g) => ({
        key: String(g._id ?? ""),
        label: labelFor(String(g._id ?? "")),
        moneyIn: ledger.round2(g.moneyIn),
        moneyOut: ledger.round2(g.moneyOut),
        net: ledger.round2(g.moneyIn - g.moneyOut),
        count: g.count,
      }))
      .sort((a, b) =>
        groupBy === "month"
          ? b.key.localeCompare(a.key)
          : b.moneyIn + b.moneyOut - (a.moneyIn + a.moneyOut)
      );

    res.json({ summary, rows, groups, truncated });
  } catch (err) {
    console.error("Ledger report error:", err);
    res.status(500).json({ message: "Failed to fetch ledger" });
  }
});

module.exports = router;
