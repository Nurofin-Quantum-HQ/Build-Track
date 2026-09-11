const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Inventory = require("../models/Inventory");
const Project = require("../models/Project");
const { protect, getAdminId, canAccessProjectFilter } = require("../middleware/auth");
router.use(protect);
function fmtDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
function fmtINR(n) {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}
async function getProjectIds(req) {
  const isAdmin = req.user.role === "Admin";
  const filter = isAdmin
    ? { createdBy: req.user._id }
    : canAccessProjectFilter(req);
  const projects = await Project.find(filter).select("_id").lean();
  return projects.map((p) => p._id);
}
async function baseTxQuery(req) {
  const ids = await getProjectIds(req);
  if (req.user.role === "Admin") {
    return { $or: [{ createdBy: req.user._id }, { project: { $in: ids } }] };
  }
  const adminId = await getAdminId(req.user);
  return {
    $or: [
      { project: { $in: ids } },
      { project: null, createdBy: { $in: [req.user._id, adminId].filter(Boolean) } }
    ]
  };
}
function detectIntent(q) {
  const lower = q.toLowerCase();
  const dateRangeMatch = lower.match(
    /(?:from\s+)?(\w+\s+\d+)\s+(?:to|-)\s+(\w+\s+\d+)/
  );
  const monthNames = ["january","february","march","april","may","june",
                      "july","august","september","october","november","december"];
  const monthMatch = monthNames.find((m) => lower.includes(m));
  const isToday    = /\btoday\b/.test(lower);
  const isYesterday= /\byesterday\b/.test(lower);
  const isThisWeek = /this week|last 7 days/.test(lower);
  const isThisMonth= /this month|current month/.test(lower);
  const isLastMonth= /last month/.test(lower);
  const isMaterial  = /material|cement|sand|steel|brick|paint|stone|purchase|aggregate|gravel|concrete/i.test(q);
  const isLabour    = /labour|labor|wage|worker/i.test(q);
  const isEquipment = /equipment|machine|machinery/i.test(q);
  const isExpense   = /expense|misc/i.test(q);
  const isInventory = /inventory|stock|threshold|low stock|reorder|all items|all material/i.test(q);
  const isBudget    = /budget|health|overspent|over budget|remaining/i.test(q);
  const isTotal     = /total|sum|spent|cost|how much/i.test(q);
  const isPending   = /pending|unpaid/i.test(q);
  const isProgress  = /progress|activit|task|phase|done|complet|milestone/i.test(q);
  const isEntries   = /entr|transaction|record|list|show/i.test(q);
  const materialNames = ["cement","sand","steel","brick","paint","stone",
                         "aggregate","gravel","concrete","tile","wood","glass"];
  const specificMaterial = materialNames.find((m) => lower.includes(m));
  return {
    dateRangeMatch, monthMatch,
    isToday, isYesterday, isThisWeek, isThisMonth, isLastMonth,
    isMaterial, isLabour, isEquipment, isExpense,
    isInventory, isBudget, isTotal, isPending, isProgress, isEntries,
    specificMaterial,
  };
}
const FOLLOWUP_HINTS = /\b(instead|what about|and|also|same|now|this time)\b/i;
function mergeWithHistory(intent, question, history) {
  if (!Array.isArray(history) || history.length === 0) return intent;
  const priorUserQuestions = history
    .filter((h) => h.role === "user" && h.text && h.text.trim())
    .map((h) => h.text)
    .reverse();
  if (priorUserQuestions.length === 0) return intent;
  const looksLikeFollowUp =
    FOLLOWUP_HINTS.test(question) || question.trim().split(/\s+/).length <= 4;
  for (const prevQ of priorUserQuestions) {
    const prevIntent = detectIntent(prevQ);
    const currentHasDateSignal =
      intent.dateRangeMatch || intent.monthMatch || intent.isToday ||
      intent.isYesterday || intent.isThisWeek || intent.isThisMonth || intent.isLastMonth;
    const prevHasDateSignal =
      prevIntent.dateRangeMatch || prevIntent.monthMatch || prevIntent.isToday ||
      prevIntent.isYesterday || prevIntent.isThisWeek || prevIntent.isThisMonth || prevIntent.isLastMonth;
    if (!currentHasDateSignal && prevHasDateSignal && looksLikeFollowUp) {
      intent.dateRangeMatch = prevIntent.dateRangeMatch;
      intent.monthMatch     = prevIntent.monthMatch;
      intent.isToday        = prevIntent.isToday;
      intent.isYesterday    = prevIntent.isYesterday;
      intent.isThisWeek     = prevIntent.isThisWeek;
      intent.isThisMonth    = prevIntent.isThisMonth;
      intent.isLastMonth    = prevIntent.isLastMonth;
    }
    const currentHasTypeSignal =
      intent.isMaterial || intent.isLabour || intent.isEquipment || intent.isExpense;
    const prevHasTypeSignal =
      prevIntent.isMaterial || prevIntent.isLabour || prevIntent.isEquipment || prevIntent.isExpense;
    if (!currentHasTypeSignal && prevHasTypeSignal && looksLikeFollowUp) {
      intent.isMaterial  = prevIntent.isMaterial;
      intent.isLabour    = prevIntent.isLabour;
      intent.isEquipment = prevIntent.isEquipment;
      intent.isExpense   = prevIntent.isExpense;
    }
    if (!intent.specificMaterial && prevIntent.specificMaterial && looksLikeFollowUp) {
      intent.specificMaterial = prevIntent.specificMaterial;
    }
    if (prevHasDateSignal || prevHasTypeSignal || prevIntent.specificMaterial) {
      break;
    }
  }
  return intent;
}
function resolveDateWindow(intent) {
  const now = new Date();
  const year = now.getFullYear();
  if (intent.dateRangeMatch) {
    const start = parseShortDate(intent.dateRangeMatch[1], year);
    const end   = parseShortDate(intent.dateRangeMatch[2], year);
    if (start && end) {
      end.setHours(23, 59, 59, 999);
      return { start, end, label: `${fmtDate(start)}–${fmtDate(end)}` };
    }
  }
  if (intent.monthMatch) {
    const monthIndex = ["january","february","march","april","may","june",
                        "july","august","september","october","november","december"]
                       .indexOf(intent.monthMatch);
    const start = new Date(year, monthIndex, 1);
    const end   = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    const label = intent.monthMatch.charAt(0).toUpperCase() + intent.monthMatch.slice(1);
    return { start, end, label };
  }
  if (intent.isToday) {
    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);
    return { start, end, label: "Today" };
  }
  if (intent.isYesterday) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const start = new Date(d); start.setHours(0,0,0,0);
    const end   = new Date(d); end.setHours(23,59,59,999);
    return { start, end, label: "Yesterday" };
  }
  if (intent.isThisWeek) {
    const start = new Date(); start.setDate(now.getDate() - 6); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);
    return { start, end, label: "Last 7 days" };
  }
  if (intent.isThisMonth) {
    const start = new Date(year, now.getMonth(), 1);
    const end   = new Date(); end.setHours(23,59,59,999);
    return { start, end, label: "This month" };
  }
  if (intent.isLastMonth) {
    const start = new Date(year, now.getMonth() - 1, 1);
    const end   = new Date(year, now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, label: "Last month" };
  }
  return null;
}
function parseShortDate(str, referenceYear) {
  const months = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,
    jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
  };
  const parts = str.trim().toLowerCase().split(/\s+/);
  const month = months[parts[0].slice(0, 3)];
  const day   = parseInt(parts[1]);
  if (month === undefined || isNaN(day)) return null;
  return new Date(referenceYear || new Date().getFullYear(), month, day);
}
router.post("/ai-chat", async (req, res) => {
  try {
    const { question, projectId, history = [] } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }
    let intent  = detectIntent(question);
    intent = mergeWithHistory(intent, question, history);
    const scope   = await baseTxQuery(req);
    const adminId = await getAdminId(req.user);
    if (projectId && projectId !== "all") {
      scope.project = projectId;
    }
    if (intent.isProgress) {
      const projectIds = await getProjectIds(req);
      const projectFilter = req.user.role === "Admin"
        ? { createdBy: req.user._id }
        : canAccessProjectFilter(req);
      let query = Project.find(projectFilter)
        .select("projectName progress status selectedPhases expectedEndDate");
      if (projectId && projectId !== "all") {
        query = Project.findById(projectId)
          .select("projectName progress status selectedPhases expectedEndDate");
      }
      const projects = projectId && projectId !== "all"
        ? [await query]
        : await query;
      const rows = [];
      for (const p of projects.filter(Boolean)) {
        const phases = p.selectedPhases || [];
        const totalActs = phases.reduce((s, ph) => s + (ph.activities?.length || 0), 0);
        const doneActs  = phases.reduce((s, ph) =>
          s + (ph.activities?.filter((a) => a.completed).length || 0), 0);
        const pct = totalActs > 0
          ? `${Math.round((doneActs / totalActs) * 100)}%`
          : `${Math.round((p.progress || 0) * 100)}%`;
        rows.push({
          date: p.status || "Active",
          item: p.projectName || "Project",
          quantity: pct,
          unit: "done",
          amount: doneActs,
        });
      }
      const avgPct = rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + parseFloat(r.quantity), 0) / rows.length)
        : 0;
      return res.json({
        result: {
          text: rows.length === 0
            ? "No project progress data found."
            : `Overall progress across ${rows.length} project${rows.length > 1 ? "s" : ""} is ${avgPct}% complete. See the breakdown below.`,
          table_type: "entries",
          table_title: "Project progress",
          rows,
          inventory_rows: [],
          total_amount: null,
        },
      });
    }
    if (intent.isInventory) {
      const invQuery = { createdBy: adminId };
      if (projectId && projectId !== "all") invQuery.project = projectId;
      const items = await Inventory.find(invQuery).lean();
      if (items.length === 0) {
        return res.json({
          result: {
            text: "No inventory records found. Add material transactions to start tracking stock.",
            table_type: "none",
            table_title: null,
            rows: [],
            inventory_rows: [],
            total_amount: null,
          },
        });
      }
      const inventoryRows = items.map((i) => {
        const pct      = i.threshold > 0 ? i.closingStock / i.threshold : 1;
        const severity = i.closingStock <= 0
          ? "critical"
          : pct < 0.30
            ? "critical"
            : pct < 0.60
              ? "low"
              : "ok";
        return {
          name: i.materialName,
          quantity: i.closingStock,
          unit: i.unit || "units",
          severity,
        };
      });
      const order = { critical: 0, low: 1, ok: 2 };
      inventoryRows.sort((a, b) => order[a.severity] - order[b.severity]);
      const critical = inventoryRows.filter((r) => r.severity === "critical").length;
      const low      = inventoryRows.filter((r) => r.severity === "low").length;
      const ok       = inventoryRows.filter((r) => r.severity === "ok").length;
      const summaryText = critical > 0
        ? `${items.length} material${items.length > 1 ? "s" : ""} tracked. ${critical} critical, ${low} low, ${ok} OK. Restock critical items immediately.`
        : low > 0
          ? `${items.length} material${items.length > 1 ? "s" : ""} tracked. ${low} item${low > 1 ? "s" : ""} running low — consider restocking soon.`
          : `All ${items.length} material${items.length > 1 ? "s" : ""} are at healthy stock levels.`;
      return res.json({
        result: {
          text: summaryText,
          table_type: "inventory",
          table_title: `Stock levels (${items.length} items)`,
          rows: [],
          inventory_rows: inventoryRows,
          total_amount: null,
        },
      });
    }
    if (intent.isBudget) {
      const projectIds = await getProjectIds(req);
      const projectFilter = req.user.role === "Admin"
        ? { createdBy: req.user._id }
        : canAccessProjectFilter(req);
      const projects = await Project.find(projectFilter).lean();
      const txQuery  = { ...scope, paymentStatus: { $in: ["Paid", "Partial"] } };
      const transactions = await Transaction.find(txQuery).lean();
      let totalBudget = 0, totalSpent = 0;
      const rows = [];
      for (const p of projects) {
        const pTx    = transactions.filter((t) => t.project?.toString() === p._id.toString());
        const spent  = pTx.reduce((s, t) => s + Number(t.amount || 0), 0);
        const budget = Number(p.budget?.total || 0);
        totalBudget += budget;
        totalSpent  += spent;
        const pct    = budget > 0 ? `${((spent / budget) * 100).toFixed(1)}%` : "-";
        rows.push({
          date: p.status || "-",
          item: p.projectName || p.name || "Project",
          quantity: pct,
          unit: "used",
          amount: spent,
        });
      }
      const overallPct = totalBudget > 0
        ? ((totalSpent / totalBudget) * 100).toFixed(1)
        : "N/A";
      const isOver = totalBudget > 0 && totalSpent > totalBudget;
      const summaryText = isOver
        ? `Budget exceeded. Spent ${fmtINR(totalSpent)} of ${fmtINR(totalBudget)} — over by ${fmtINR(totalSpent - totalBudget)}.`
        : `Budget on track. ${fmtINR(totalSpent)} spent of ${fmtINR(totalBudget)} total (${overallPct}% used). ${fmtINR(totalBudget - totalSpent)} remaining.`;
      return res.json({
        result: {
          text: summaryText,
          table_type: "entries",
          table_title: "Budget health by project",
          rows,
          inventory_rows: [],
          total_amount: totalSpent,
        },
      });
    }
    if (intent.isPending) {
      const pendingTx = await Transaction.find({ ...scope, paymentStatus: "Pending" })
        .populate("project", "projectName")
        .sort({ date: -1 })
        .lean();
      if (pendingTx.length === 0) {
        return res.json({
          result: {
            text: "No pending payments found.",
            table_type: "none", table_title: null,
            rows: [], inventory_rows: [], total_amount: null,
          },
        });
      }
      const total = pendingTx.reduce((s, t) => s + Number(t.amount || 0), 0);
      const rows  = pendingTx.map((t) => ({
        date: fmtDate(t.date),
        item: t.title || t.category || "-",
        quantity: t.quantity ? String(t.quantity) : "-",
        unit: t.unit || "-",
        amount: Number(t.amount || 0),
      }));
      return res.json({
        result: {
          text: `${pendingTx.length} pending payment${pendingTx.length > 1 ? "s" : ""} totalling ${fmtINR(total)}.`,
          table_type: "entries",
          table_title: "Pending payments",
          rows, inventory_rows: [], total_amount: total,
        },
      });
    }
    let typeFilter = null;
    if (intent.isLabour)         typeFilter = "Wages";
    else if (intent.isEquipment) typeFilter = "Equipment";
    else if (intent.isExpense)   typeFilter = "Expense";
    else if (intent.isMaterial)  typeFilter = "Materials";
    const dateWindow = resolveDateWindow(intent);
    if (dateWindow) {
      const txQuery = {
        ...scope,
        date: { $gte: dateWindow.start, $lte: dateWindow.end },
      };
      if (typeFilter) txQuery.type = typeFilter;
      const txs   = await Transaction.find(txQuery)
        .populate("project", "projectName")
        .sort({ date: -1 })
        .lean();
      const paid    = txs.filter((t) => t.paymentStatus === "Paid");
      const partial = txs.filter((t) => t.paymentStatus === "Partial");
      const pending = txs.filter((t) => t.paymentStatus === "Pending");
      const total   = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
      const paidAmt = paid.reduce((s, t) => s + Number(t.amount || 0), 0);
      const rows = txs.map((t) => ({
        date: fmtDate(t.date),
        item: t.title || t.category || "-",
        quantity: t.quantity ? String(t.quantity) : "-",
        unit: t.unit || "-",
        amount: Number(t.amount || 0),
      }));
      const typeLabel = typeFilter ? typeFilter.toLowerCase() : "entry";
      const summaryText = txs.length > 0
        ? `Found ${txs.length} ${typeLabel} record${txs.length > 1 ? "s" : ""} in ${dateWindow.label} — total ${fmtINR(total)} (${fmtINR(paidAmt)} paid, ${pending.length} pending).`
        : `No ${typeLabel} entries found for ${dateWindow.label}.`;
      return res.json({
        result: {
          text: summaryText,
          table_type: txs.length > 0 ? "entries" : "none",
          table_title: `${typeFilter || "All"} entries · ${dateWindow.label}`,
          rows, inventory_rows: [], total_amount: total,
        },
      });
    }
    if (intent.specificMaterial) {
      const mat = intent.specificMaterial;
      const txs = await Transaction.find({
        ...scope,
        type: "Materials",
        title: { $regex: mat, $options: "i" },
      }).sort({ date: -1 }).lean();
      const total = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
      if (txs.length === 0) {
        return res.json({
          result: {
            text: `No entries found for "${mat}".`,
            table_type: "none", table_title: null,
            rows: [], inventory_rows: [], total_amount: null,
          },
        });
      }
      const largest = txs.reduce((a, b) =>
        Number(a.amount) > Number(b.amount) ? a : b);
      const rows = txs.map((t) => ({
        date: fmtDate(t.date),
        item: t.title || mat,
        quantity: t.quantity ? String(t.quantity) : "-",
        unit: t.unit || "-",
        amount: Number(t.amount || 0),
      }));
      return res.json({
        result: {
          text: `${mat.charAt(0).toUpperCase() + mat.slice(1)} total ${fmtINR(total)} across ${txs.length} entr${txs.length > 1 ? "ies" : "y"}. Largest: ${fmtINR(largest.amount)} on ${fmtDate(largest.date)}.`,
          table_type: "entries",
          table_title: `${mat.charAt(0).toUpperCase() + mat.slice(1)} entries`,
          rows, inventory_rows: [], total_amount: total,
        },
      });
    }
    if (typeFilter) {
      const txs = await Transaction.find({ ...scope, type: typeFilter })
        .sort({ date: -1 })
        .limit(50)
        .lean();
      const total = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
      const rows  = txs.map((t) => ({
        date: fmtDate(t.date),
        item: t.title || t.category || "-",
        quantity: t.quantity ? String(t.quantity) : "-",
        unit: t.unit || "-",
        amount: Number(t.amount || 0),
      }));
      return res.json({
        result: {
          text: `Found ${txs.length} ${typeFilter.toLowerCase()} entr${txs.length > 1 ? "ies" : "y"} totalling ${fmtINR(total)}.`,
          table_type: txs.length > 0 ? "entries" : "none",
          table_title: `${typeFilter} entries`,
          rows, inventory_rows: [], total_amount: total,
        },
      });
    }
    if (intent.isTotal || intent.isEntries) {
      const txs       = await Transaction.find(scope).sort({ date: -1 }).limit(50).lean();
      const total     = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
      const material  = txs.filter((t) => t.type === "Materials").reduce((s, t) => s + Number(t.amount || 0), 0);
      const labour    = txs.filter((t) => t.type === "Wages").reduce((s, t) => s + Number(t.amount || 0), 0);
      const equipment = txs.filter((t) => t.type === "Equipment").reduce((s, t) => s + Number(t.amount || 0), 0);
      const rows = txs.map((t) => ({
        date: fmtDate(t.date),
        item: t.title || t.category || "-",
        quantity: t.quantity ? String(t.quantity) : "-",
        unit: t.unit || "-",
        amount: Number(t.amount || 0),
      }));
      return res.json({
        result: {
          text: `Latest ${txs.length} entries — total ${fmtINR(total)}. Materials: ${fmtINR(material)}, Labour: ${fmtINR(labour)}, Equipment: ${fmtINR(equipment)}.`,
          table_type: rows.length > 0 ? "entries" : "none",
          table_title: "Recent entries",
          rows, inventory_rows: [], total_amount: total,
        },
      });
    }
    return res.json({
      result: {
        text: "Try asking:\n• 'Entries in June'\n• 'Cement spend'\n• 'Labour entries this week'\n• 'Inventory status'\n• 'Budget health'\n• 'Project progress'\n• 'Pending payments'",
        table_type: "none", table_title: null,
        rows: [], inventory_rows: [], total_amount: null,
      },
    });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ error: "Failed to process question" });
  }
});
module.exports = router;
