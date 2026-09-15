const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const { Readable } = require("stream");
const mongoose = require("mongoose");
const Project = require("../models/Project");
const Transaction = require("../models/Transaction");
const {
  protect,
  requirePermission,
  canAccessProjectFilter,
  canManageProjectFilter,
  getAdminId,
} = require("../middleware/auth");
const upload = require("../config/multer");
const { getFileUrl, deleteFile } = require("../config/fileHelpers");
const Subscription = require("../models/Subscription");
router.use(protect);
const normalizeProjectBudget = (project) => {
  if (!project) return project;
  const p = project.toObject ? project.toObject() : { ...project };
  if (!p.budget) {
    p.budget = { total: 0, material: 0, labour: 0, equipment: 0, misc: 0 };
  } else {
    p.budget.material = Number(p.budget.material || 0);
    p.budget.labour = Number(p.budget.labour || 0);
    p.budget.equipment = Number(p.budget.equipment || 0);
    p.budget.misc = Number(p.budget.misc || 0);
    p.budget.total = Number(p.budget.total || 0);
    if (p.budget.total === 0) {
      p.budget.total =
        p.budget.material +
        p.budget.labour +
        p.budget.equipment +
        p.budget.misc;
    }
  }
  return p;
};
const getProjectSpentAmount = async (projectId) => {
  try {
    const result = await Transaction.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: null,
          totalSpent: {
            $sum: {
              $cond: [
                { $in: ["$type", ["Expense", "Wages", "Materials", "Equipment"]] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);
    return result[0]?.totalSpent || 0;
  } catch (e) {
    return 0;
  }
};
const getProjectIncomeAmount = async (projectId) => {
  try {
    const result = await Transaction.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId), type: "Income" } },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$amount" },
        },
      },
    ]);
    return result[0]?.totalIncome || 0;
  } catch (e) {
    return 0;
  }
};
const computeActivityBudgetSummaries = async (projectId, activities) => {
  if (!activities || activities.length === 0) return new Map();
  const TYPES = {
    MATERIALS: "Materials",
    WAGES: "Wages",
    EQUIPMENT: "Equipment",
    EXPENSE: "Expense"
  };
  const summaries = new Map();
  const nowStr = new Date().toISOString();
  const makeDefaultBudget = (act) => {
    const matAlloc = Number(act.budgetMaterial || 0);
    const labAlloc = Number(act.budgetLabour || 0);
    const equAlloc = Number(act.budgetEquipment || 0);
    const totAlloc = matAlloc + labAlloc + equAlloc;
    return {
      material: { allocated: matAlloc, spent: 0, remaining: matAlloc, utilization: 0, progress: 0 },
      labour: { allocated: labAlloc, spent: 0, remaining: labAlloc, utilization: 0, progress: 0 },
      equipment: { allocated: equAlloc, spent: 0, remaining: equAlloc, utilization: 0, progress: 0 },
      total: { allocated: totAlloc, spent: 0, remaining: totAlloc, utilization: 0, progress: 0 },
      budgetLastCalculatedAt: nowStr
    };
  };
  for (const act of activities) {
    const aid = act.id || act._id?.toString();
    summaries.set(aid, makeDefaultBudget(act));
  }
  try {
    const activityIds = activities.map(a => a.id).filter(Boolean);
    if (activityIds.length === 0) return summaries;
    const rows = await Transaction.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          approvalStatus: "Approved",
          activityId: { $in: activityIds },
        },
      },
      {
        $group: {
          _id: { activityId: "$activityId", type: "$type" },
          spent: { $sum: "$amount" },
        },
      },
    ]);
    const spendMap = new Map();
    for (const row of rows) {
      const aid = row._id.activityId;
      const type = row._id.type;
      if (!spendMap.has(aid)) spendMap.set(aid, {});
      spendMap.get(aid)[type] = row.spent;
    }
    for (const act of activities) {
      const aid = act.id || act._id?.toString();
      const typeSpend = spendMap.get(aid) || {};
      const matSpent = typeSpend[TYPES.MATERIALS] || 0;
      const labSpent = typeSpend[TYPES.WAGES] || 0;
      const equSpent = (typeSpend[TYPES.EQUIPMENT] || 0) + (typeSpend[TYPES.EXPENSE] || 0);
      const totSpent = matSpent + labSpent + equSpent;
      const matAlloc = Number(act.budgetMaterial || 0);
      const labAlloc = Number(act.budgetLabour || 0);
      const equAlloc = Number(act.budgetEquipment || 0);
      const totAlloc = matAlloc + labAlloc + equAlloc;
      const pct = (alloc, spent) =>
        alloc > 0 ? parseFloat(((spent / alloc) * 100).toFixed(2)) : 0;
      const prog = (alloc, spent) =>
        alloc > 0 ? parseFloat(Math.min(spent / alloc, 1.0).toFixed(4)) : 0.0;
      summaries.set(aid, {
        material: {
          allocated: matAlloc,
          spent: matSpent,
          remaining: matAlloc - matSpent,
          utilization: pct(matAlloc, matSpent),
          progress: prog(matAlloc, matSpent)
        },
        labour: {
          allocated: labAlloc,
          spent: labSpent,
          remaining: labAlloc - labSpent,
          utilization: pct(labAlloc, labSpent),
          progress: prog(labAlloc, labSpent)
        },
        equipment: {
          allocated: equAlloc,
          spent: equSpent,
          remaining: equAlloc - equSpent,
          utilization: pct(equAlloc, equSpent),
          progress: prog(equAlloc, equSpent)
        },
        total: {
          allocated: totAlloc,
          spent: totSpent,
          remaining: totAlloc - totSpent,
          utilization: pct(totAlloc, totSpent),
          progress: prog(totAlloc, totSpent)
        },
        budgetLastCalculatedAt: nowStr
      });
    }
  } catch (err) {
    console.error("[computeActivityBudgetSummaries] error:", err);
  }
  return summaries;
};
const runUpload = (req, res) =>
  new Promise((resolve, reject) => {
    upload.any()(req, res, (err) => {
      if (err instanceof multer.MulterError) reject(Object.assign(err, { status: 400 }));
      else if (err) reject(Object.assign(err, { status: 400 }));
      else resolve();
    });
  });
const safeParse = (value) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};
const mapUiStatusToBackend = (uiStatus) => {
  if (!uiStatus) return "Active";
  const s = uiStatus.toLowerCase().replace(/\s/g, "");
  if (s === "inprogress" || s === "active") return "Active";
  if (s === "onhold") return "On Hold";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "On Hold";
  if (s === "planning") return "Active";
  return "Active";
};
const ownedByCurrentUserFilter = (req, projectId = null) => {
  if (projectId) return { _id: projectId, createdBy: req.user.id };
  return { createdBy: req.user.id };
};
const VIEW_PROJECTS = ["view_projects", "view_assigned_project"];
router.get("/mine", requirePermission(VIEW_PROJECTS), async (req, res) => {
  try {
    const projects = await Project.find(ownedByCurrentUserFilter(req)).sort({ createdAt: -1 });
    const projectIds = projects.map(p => p._id);
    const [spentList, incomeList] = await Promise.all([
      Transaction.aggregate([
        { $match: { project: { $in: projectIds }, type: { $in: ["Expense", "Wages", "Materials", "Equipment"] } } },
        { $group: { _id: "$project", totalSpent: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { project: { $in: projectIds }, type: "Income" } },
        { $group: { _id: "$project", totalIncome: { $sum: "$amount" } } }
      ])
    ]);
    const spentMap = new Map(spentList.map(s => [s._id.toString(), s.totalSpent]));
    const incomeMap = new Map(incomeList.map(i => [i._id.toString(), i.totalIncome]));
    const normalizedProjects = projects.map(p => {
      const normalized = normalizeProjectBudget(p);
      const idStr = p._id.toString();
      normalized.spentAmount = spentMap.get(idStr) || 0;
      normalized.totalIncome = incomeMap.get(idStr) || 0;
      return normalized;
    });
    return res.status(200).json({ projects: normalizedProjects });
  } catch (err) {
    console.error("GET /mine error:", err);
    return res.status(500).json({ message: "Failed to fetch your projects" });
  }
});
router.get("/", protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = canAccessProjectFilter(req);
    const Task = require("../models/Task");
    const userTasks = await Task.find({ assignedTo: req.user._id }).select("project");
    const taskProjectIds = userTasks.map(t => t.project).filter(Boolean);
    if (taskProjectIds.length > 0) {
      if (query.__never) {
        delete query.__never;
        query._id = { $in: taskProjectIds };
      } else if (query._id && query._id.$in) {
        query._id.$in.push(...taskProjectIds);
      }
    } else if (query.__never) {
      return res.json({ projects: [] });
    }
    if (status && status !== "All") query.status = status;
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { projectName: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
          { manager: { $regex: search, $options: "i" } },
        ],
      });
    }
    const projects = await Project.find(query).sort({ createdAt: -1 });
    const projectIds = projects.map(p => p._id);
    const [spentList, incomeList] = await Promise.all([
      Transaction.aggregate([
        { $match: { project: { $in: projectIds }, type: { $in: ["Expense", "Wages", "Materials", "Equipment"] } } },
        { $group: { _id: "$project", totalSpent: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { project: { $in: projectIds }, type: "Income" } },
        { $group: { _id: "$project", totalIncome: { $sum: "$amount" } } }
      ])
    ]);
    const spentMap = new Map(spentList.map(s => [s._id.toString(), s.totalSpent]));
    const incomeMap = new Map(incomeList.map(i => [i._id.toString(), i.totalIncome]));
    const normalizedProjects = projects.map(p => {
      const normalized = normalizeProjectBudget(p);
      const idStr = p._id.toString();
      normalized.spentAmount = spentMap.get(idStr) || 0;
      normalized.totalIncome = incomeMap.get(idStr) || 0;
      return normalized;
    });
    res.json({ projects: normalizedProjects });
  } catch (err) {
    console.error("GET projects error:", err);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});
router.get("/context", requirePermission(VIEW_PROJECTS), async (req, res) => {
  try {
    let query = canAccessProjectFilter(req);
    const Task = require("../models/Task");
    const userTasks = await Task.find({ assignedTo: req.user._id }).select("project");
    const taskProjectIds = userTasks.map(t => t.project).filter(Boolean);
    if (taskProjectIds.length > 0) {
      if (query.__never) {
        delete query.__never;
        query._id = { $in: taskProjectIds };
      } else if (query._id && query._id.$in) {
        query._id.$in.push(...taskProjectIds);
      }
    } else if (query.__never) {
      return res.json({ projects: [] });
    }
    const projects = await Project.find(query)
      .select(
        "projectName location status floors selectedPhases.id selectedPhases.phaseName selectedPhases.isCustom selectedPhases.activities.id selectedPhases.activities.name selectedPhases.activities.isCustom"
      )
      .sort({ createdAt: -1 })
      .lean();
    res.json({ projects });
  } catch (err) {
    console.error("GET /projects/context error:", err);
    res.status(500).json({ message: "Failed to fetch project context" });
  }
});
router.get("/:id", requirePermission(VIEW_PROJECTS), async (req, res) => {
  try {
    const project = await Project.findOne(canAccessProjectFilter(req, req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    const normalized = normalizeProjectBudget(project);
    normalized.spentAmount = await getProjectSpentAmount(project._id);
    normalized.totalIncome = await getProjectIncomeAmount(project._id);
    if (normalized.selectedPhases && normalized.selectedPhases.length > 0) {
      const allActivities = normalized.selectedPhases.flatMap(p => p.activities || []);
      const summaries = await computeActivityBudgetSummaries(project._id, allActivities);
      for (const phase of normalized.selectedPhases) {
        if (!phase.activities) continue;
        for (const act of phase.activities) {
          const aid = act.id || act._id?.toString();
          act.budgetMaterial = Number(act.budgetMaterial || 0);
          act.budgetLabour = Number(act.budgetLabour || 0);
          act.budgetEquipment = Number(act.budgetEquipment || 0);
          act.budget = summaries.get(aid) || {
            material: { allocated: act.budgetMaterial, spent: 0, remaining: act.budgetMaterial, utilization: 0, progress: 0 },
            labour: { allocated: act.budgetLabour, spent: 0, remaining: act.budgetLabour, utilization: 0, progress: 0 },
            equipment: { allocated: act.budgetEquipment, spent: 0, remaining: act.budgetEquipment, utilization: 0, progress: 0 },
            total: { allocated: act.budgetMaterial + act.budgetLabour + act.budgetEquipment, spent: 0, remaining: act.budgetMaterial + act.budgetLabour + act.budgetEquipment, utilization: 0, progress: 0 },
            budgetLastCalculatedAt: new Date().toISOString()
          };
        }
      }
    }
    res.json({ project: normalized });
  } catch (err) {
    console.error("GET /projects/:id error:", err);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});
router.get("/:id/stats", requirePermission(VIEW_PROJECTS), async (req, res) => {
  try {
    const project = await Project.findOne(canAccessProjectFilter(req, req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    const projectObjectId = new mongoose.Types.ObjectId(req.params.id);
    const result = await Transaction.aggregate([
      { $match: { project: projectObjectId } },
      {
        $group: {
          _id: null,
          totalSpent: {
            $sum: {
              $cond: [
                { $in: ["$type", ["Expense", "Wages", "Materials", "Equipment"]] },
                "$amount",
                0,
              ],
            },
          },
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ["$type", "Income"] }, "$amount", 0],
            },
          },
        },
      },
    ]);
    const { totalSpent = 0, totalIncome = 0 } = result[0] || {};
    const normalized = normalizeProjectBudget(project);
    const totalBudget = normalized.budget.total;
    const remainingBudget = totalBudget - totalSpent;
    res.json({
      totalBudget,
      totalSpent,
      totalIncome,
      remainingBudget,
      projectName: project.projectName,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch project stats" });
  }
});
router.get("/:id/budget", requirePermission(VIEW_PROJECTS), async (req, res) => {
  try {
    const project = await Project.findOne(canAccessProjectFilter(req, req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    const projectObjectId = new mongoose.Types.ObjectId(req.params.id);
    const actuals = await Transaction.aggregate([
      { $match: { project: projectObjectId } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    const actualMap = {};
    actuals.forEach((a) => {
      actualMap[a._id] = a.total;
    });
    const report = {
      materials: {
        budget: project.budget?.material || 0,
        actual: actualMap["Materials"] || 0,
        remaining: (project.budget?.material || 0) - (actualMap["Materials"] || 0),
      },
      labour: {
        budget: project.budget?.labour || 0,
        actual: actualMap["Wages"] || 0,
        remaining: (project.budget?.labour || 0) - (actualMap["Wages"] || 0),
      },
      equipment: {
        budget: project.budget?.equipment || 0,
        actual: actualMap["Equipment"] || actualMap["Expense"] || 0,
        remaining:
          (project.budget?.equipment || 0) -
          ((actualMap["Equipment"] || 0) + 0),
      },
    };
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch project budget analysis" });
  }
});
router.post("/", requirePermission(["create_project", "manage_team"]), async (req, res) => {
  try {
    await runUpload(req, res);
  } catch (uploadErr) {
    return res.status(400).json({ message: uploadErr.message || "File upload error" });
  }
  try {
    const adminId = await getAdminId(req.user);
    const activeSub = await Subscription.findOne({
      userId: adminId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    let limit = 1;
    if (activeSub) {
      const plan = activeSub.plan || 'free';
      if (plan === 'starter') limit = 2;
      else if (plan === 'growth') limit = 4;
      else if (plan === 'pro') limit = 6;
      else if (plan === 'business') limit = 12;
      else if (plan === 'enterprise') limit = -1;
    }
    if (limit !== -1) {
      const count = await Project.countDocuments({ createdBy: adminId });
      if (count >= limit) {
        return res.status(403).json({ message: `Project limit reached for your current plan (${limit} projects). Please upgrade your subscription.` });
      }
    }
    const body = req.body; console.log('PUT BODY keys:', Object.keys(body), 'selectedPhases exists:', body.selectedPhases !== undefined);
    if (!body.projectName || !body.projectName.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }
    const resolvedMaterial = Number(body.budgetMaterials ?? body.budgetMaterial ?? body.budget?.material ?? 0);
    const resolvedLabour = Number(body.budgetLabour ?? body.budget?.labour ?? 0);
    const resolvedEquipment = Number(body.budgetEquipment ?? body.budget?.equipment ?? 0);
    const resolvedMisc = Number(body.budgetMisc ?? body.budget?.misc ?? body.budgetMiscellaneous ?? 0);
    let resolvedTotal = Number(body.totalBudget ?? body.budget?.total ?? 0);
    if (resolvedTotal === 0) {
      resolvedTotal = resolvedMaterial + resolvedLabour + resolvedEquipment + resolvedMisc;
    }
    let safeBuildingType = safeParse(body.buildingType) ?? {
      mainType: "Residential",
      subType: "General",
    };
    if (typeof safeBuildingType === "string") {
      safeBuildingType = { mainType: safeBuildingType, subType: "General" };
    }
    const rawStartDate = body.startDate ?? body.dates?.startDate;
    const rawExpectedEnd = body.expectedEndDate ?? body.dates?.expectedEndDate;
    const parsedStartDate = rawStartDate ? new Date(rawStartDate) : null;
    const parsedExpectedEnd = rawExpectedEnd ? new Date(rawExpectedEnd) : null;
    const uiProjectStatus = body.projectStatus ?? body.status ?? "Planning";
    const backendStatus = mapUiStatusToBackend(uiProjectStatus);
    const parsedFloors = safeParse(body.floors);
    const toIntOrNull = (v) => {
      const n = parseInt(v, 10);
      return isNaN(n) || n < 0 ? null : n;
    };
    const project = await Project.create({
      createdBy: req.user.id,
      projectName: body.projectName.trim(),
      projectCode: body.projectCode || `PRJ-${Date.now()}`,
      clientName: body.clientName || "Internal Client",
      contractorName: body.contractorName || "",
      siteEngineer: body.siteEngineer || body.siteEngineerName || "",
      siteEngineerName: body.siteEngineer || body.siteEngineerName || "",
      contactNumber: body.contactNumber || "",
      mapAddress: body.mapAddress || "",
      location: body.location || body.city || "",
      manager: body.manager || "",
      buildingType: safeBuildingType,
      floors: parsedFloors,
      landArea: body.landArea || null,
      landUnit: body.landUnit || "Sq ft",
      room1BHK: toIntOrNull(body.room1BHK),
      room2BHK: toIntOrNull(body.room2BHK),
      room3BHK: toIntOrNull(body.room3BHK),
      roomCustom: toIntOrNull(body.roomCustom),
      bathWestern: toIntOrNull(body.bathWestern),
      bathIndian: toIntOrNull(body.bathIndian),
      bathCommon: toIntOrNull(body.bathCommon),
      bathAttached: toIntOrNull(body.bathAttached),
      selectedFeatures: safeParse(body.selectedFeatures) || [],
      budget: {
        total: resolvedTotal,
        material: resolvedMaterial,
        labour: resolvedLabour,
        equipment: resolvedEquipment,
        misc: resolvedMisc,
      },
      budgetMaterial: resolvedMaterial,
      budgetLabour: resolvedLabour,
      budgetEquipment: resolvedEquipment,
      budgetMisc: resolvedMisc,
      totalBudget: resolvedTotal,
      startDate: parsedStartDate,
      expectedEndDate: parsedExpectedEnd,
      dates: {
        startDate: parsedStartDate,
        expectedEndDate: parsedExpectedEnd,
      },
      scope: body.scope || "",
      status: backendStatus,
      projectStatus: uiProjectStatus,
      progress: Number(body.progress || 0),
      photo: getFileUrl(req.files?.find((f) => f.fieldname === "photo")) || null,
      selectedPhaseNames: safeParse(body.selectedPhaseNames) || [],
      trackedActivityKeys: safeParse(body.trackedActivityKeys) || [],
      completedActivityKeys: safeParse(body.completedActivityKeys) || [],
      selectedPhases: safeParse(body.selectedPhases) || [],
    });
    const normalized = normalizeProjectBudget(project);
    normalized.spentAmount = await getProjectSpentAmount(project._id);

    const User = require("../models/User");
    await User.findByIdAndUpdate(req.user.id, { "onboarding.hasCreatedProject": true });

    res.status(201).json({ message: "Project created", project: normalized });
  } catch (err) {
    console.error("CREATE project error:", err);
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({
      message: "Failed to create project",
      err: err.message || err.toString(),
      error: err,
    });
  }
});
router.put("/:id", protect, async (req, res) => {
  try {
    await runUpload(req, res);
  } catch (uploadErr) {
    return res.status(400).json({ message: uploadErr.message || "File upload error" });
  }
  try {
    const body = req.body;
    console.log("PUT /projects/:id body.selectedPhases:", JSON.stringify(body.selectedPhases));
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Project not found" });
    const userPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const hasEdit = req.user.role === 'Admin' || 
                    userPerms.includes("edit_project") || 
                    userPerms.includes("manage_team") || 
                    userPerms.includes("add_entry") ||
                    userPerms.includes("submit_daily_update") ||
                    userPerms.includes("approve_updates");
    if (!hasEdit) {
      const Task = require("../models/Task");
      const hasTask = await Task.exists({ project: existing._id, assignedTo: req.user._id });
      if (!hasTask) {
        return res.status(403).json({ message: "Access denied" });
      }
    }
    const updateData = {};
    if (body.projectName !== undefined) updateData.projectName = body.projectName.trim();
    if (body.location !== undefined) updateData.location = body.location;
    if (body.city !== undefined && body.location === undefined) updateData.location = body.city;
    if (body.manager !== undefined) updateData.manager = body.manager;
    if (body.clientName !== undefined) updateData.clientName = body.clientName;
    if (body.contractorName !== undefined) updateData.contractorName = body.contractorName;
    if (body.siteEngineer !== undefined) {
      updateData.siteEngineer = body.siteEngineer;
      updateData.siteEngineerName = body.siteEngineer;
    }
    if (body.siteEngineerName !== undefined) {
      updateData.siteEngineerName = body.siteEngineerName;
      updateData.siteEngineer = body.siteEngineerName;
    }
    if (body.contactNumber !== undefined) updateData.contactNumber = body.contactNumber;
    if (body.mapAddress !== undefined) updateData.mapAddress = body.mapAddress;
    if (body.scope !== undefined) updateData.scope = body.scope;
    if (body.progress !== undefined) updateData.progress = Number(body.progress);
    if (body.buildingType !== undefined) updateData.buildingType = safeParse(body.buildingType);
    if (body.floors !== undefined) updateData.floors = safeParse(body.floors);
    if (body.landArea !== undefined) updateData.landArea = body.landArea;
    if (body.landUnit !== undefined) updateData.landUnit = body.landUnit;
    const toIntOrNull = (v) => {
      if (v === undefined) return undefined;
      const n = parseInt(v, 10);
      return isNaN(n) || n < 0 ? null : n;
    };
    const room1 = toIntOrNull(body.room1BHK);
    if (room1 !== undefined) updateData.room1BHK = room1;
    const room2 = toIntOrNull(body.room2BHK);
    if (room2 !== undefined) updateData.room2BHK = room2;
    const room3 = toIntOrNull(body.room3BHK);
    if (room3 !== undefined) updateData.room3BHK = room3;
    const roomC = toIntOrNull(body.roomCustom);
    if (roomC !== undefined) updateData.roomCustom = roomC;
    const bathW = toIntOrNull(body.bathWestern);
    if (bathW !== undefined) updateData.bathWestern = bathW;
    const bathI = toIntOrNull(body.bathIndian);
    if (bathI !== undefined) updateData.bathIndian = bathI;
    const bathCo = toIntOrNull(body.bathCommon);
    if (bathCo !== undefined) updateData.bathCommon = bathCo;
    const bathAt = toIntOrNull(body.bathAttached);
    if (bathAt !== undefined) updateData.bathAttached = bathAt;
    if (body.selectedFeatures !== undefined) {
      updateData.selectedFeatures = safeParse(body.selectedFeatures);
    }
    const inputMaterial =
      body.budgetMaterials !== undefined ? body.budgetMaterials : body.budgetMaterial;
    const inputLabour = body.budgetLabour;
    const inputEquipment = body.budgetEquipment;
    const inputMisc = body.budgetMisc !== undefined ? body.budgetMisc : body.budget?.misc;
    const inputTotal = body.totalBudget !== undefined ? body.totalBudget : body.budget?.total;
    if (
      inputMaterial !== undefined ||
      inputLabour !== undefined ||
      inputEquipment !== undefined ||
      inputMisc !== undefined ||
      inputTotal !== undefined
    ) {
      const eb = existing.budget || {};
      const material = inputMaterial !== undefined ? Number(inputMaterial || 0) : Number(eb.material || 0);
      const labour = inputLabour !== undefined ? Number(inputLabour || 0) : Number(eb.labour || 0);
      const equipment = inputEquipment !== undefined ? Number(inputEquipment || 0) : Number(eb.equipment || 0);
      const misc = inputMisc !== undefined ? Number(inputMisc || 0) : Number(eb.misc || 0);
      let total = inputTotal !== undefined ? Number(inputTotal || 0) : Number(eb.total || 0);
      if (total === 0) total = material + labour + equipment + misc;
      updateData.budget = { total, material, labour, equipment, misc };
      updateData.budgetMaterial = material;
      updateData.budgetLabour = labour;
      updateData.budgetEquipment = equipment;
      updateData.budgetMisc = misc;
      updateData.totalBudget = total;
    }
    const rawStartDate = body.startDate ?? body.dates?.startDate;
    const rawExpectedEnd = body.expectedEndDate ?? body.dates?.expectedEndDate;
    if (rawStartDate !== undefined) {
      const d = rawStartDate ? new Date(rawStartDate) : null;
      updateData.startDate = d;
      updateData["dates.startDate"] = d;
    }
    if (rawExpectedEnd !== undefined) {
      const d = rawExpectedEnd ? new Date(rawExpectedEnd) : null;
      updateData.expectedEndDate = d;
      updateData["dates.expectedEndDate"] = d;
    }
    if (body.projectStatus !== undefined || body.status !== undefined) {
      const uiStatus = body.projectStatus ?? body.status;
      updateData.projectStatus = uiStatus;
      updateData.status = mapUiStatusToBackend(uiStatus);
    }
    if (body.selectedPhaseNames !== undefined) {
      updateData.selectedPhaseNames = safeParse(body.selectedPhaseNames);
    }
    if (body.trackedActivityKeys !== undefined) {
      updateData.trackedActivityKeys = safeParse(body.trackedActivityKeys);
    }
    if (body.completedActivityKeys !== undefined) {
      updateData.completedActivityKeys = safeParse(body.completedActivityKeys);
    }
    if (body.selectedPhases !== undefined) {
      const parsedPhases = safeParse(body.selectedPhases);
      updateData.selectedPhases = parsedPhases;
      if (body.selectedPhaseNames === undefined && Array.isArray(parsedPhases)) {
        updateData.selectedPhaseNames = parsedPhases
          .map((p) => p?.phaseName)
          .filter((n) => n);
      }
    }
    const photoFile = req.files?.find((f) => f.fieldname === "photo");
    if (photoFile) {
      if (existing.photo) await deleteFile(existing.photo);
      updateData.photo = getFileUrl(photoFile);
    } else if (body.removePhoto === "true" || body.removePhoto === true) {
      if (existing?.photo) await deleteFile(existing.photo);
      updateData.photo = null;
    }
    const project = await Project.findOneAndUpdate(
      canManageProjectFilter(req, req.params.id),
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ message: "Project not found" });
    const normalized = normalizeProjectBudget(project);
    normalized.spentAmount = await getProjectSpentAmount(project._id);
    if (normalized.selectedPhases && normalized.selectedPhases.length > 0) {
      const allActivities = normalized.selectedPhases.flatMap(p => p.activities || []);
      const summaries = await computeActivityBudgetSummaries(project._id, allActivities);
      for (const phase of normalized.selectedPhases) {
        if (!phase.activities) continue;
        for (const act of phase.activities) {
          const aid = act.id || act._id?.toString();
          act.budgetMaterial = Number(act.budgetMaterial || 0);
          act.budgetLabour = Number(act.budgetLabour || 0);
          act.budgetEquipment = Number(act.budgetEquipment || 0);
          act.budget = summaries.get(aid) || {
            material: { allocated: act.budgetMaterial, spent: 0, remaining: act.budgetMaterial, utilization: 0, progress: 0 },
            labour: { allocated: act.budgetLabour, spent: 0, remaining: act.budgetLabour, utilization: 0, progress: 0 },
            equipment: { allocated: act.budgetEquipment, spent: 0, remaining: act.budgetEquipment, utilization: 0, progress: 0 },
            total: { allocated: act.budgetMaterial + act.budgetLabour + act.budgetEquipment, spent: 0, remaining: act.budgetMaterial + act.budgetLabour + act.budgetEquipment, utilization: 0, progress: 0 },
            budgetLastCalculatedAt: new Date().toISOString()
          };
        }
      }
    }
    res.json({ message: "Project updated", project: normalized });
  } catch (err) {
    console.error("UPDATE project error:", err);
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: "Failed to update project" });
  }
});
router.delete("/:id", requirePermission(["delete_project", "manage_team"]), async (req, res) => {
  try {
    const project = await Project.findOneAndDelete(canManageProjectFilter(req, req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.photo) await deleteFile(project.photo);
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete project" });
  }
});
const memoryUpload = multer({ storage: multer.memoryStorage() });
router.post("/import-phases", memoryUpload.single("csvFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const results = [];
  const phasesMap = new Map();
  const stream = Readable.from(req.file.buffer);
  stream
    .pipe(csv())
    .on("data", (row) => {
      const phaseName = row["Phase"];
      const activityName = row["Particular"];
      if (!phaseName || !activityName) return;
      if (!phasesMap.has(phaseName)) {
        phasesMap.set(phaseName, {
          id: new mongoose.Types.ObjectId().toString(),
          phaseName: phaseName,
          isCustom: true,
          activities: [],
        });
      }
      const phase = phasesMap.get(phaseName);
      phase.activities.push({
        id: new mongoose.Types.ObjectId().toString(),
        name: activityName,
        isCustom: true,
        completed: false,
        qty: parseFloat(row["Total_Qty"] ?? row["Qty"]) || 0,
        unit: row["Unit"] || "",
        materialRate: parseFloat(row["Material_Rate"]) || 0,
        materialAmount: parseFloat(row["Budget_Material_Amount"] ?? row["Material_Amount"]) || 0,
        labourRate: parseFloat(row["Labour_Rate"]) || 0,
        labourAmount: parseFloat(row["Budget_Labour_Amount"] ?? row["Labour_Amount"]) || 0,
        equipmentRate: parseFloat(row["Equipment_Rate"]) || 0,
        equipmentAmount: parseFloat(row["Budget_Equipment_Amount"] ?? row["Equipment_Amount"]) || 0,
        totalAmount: parseFloat(row["Total_Amount"]) || 0,
      });
    })
    .on("end", () => {
      const phasesArray = Array.from(phasesMap.values());
      res.status(200).json({
        message: "CSV parsed successfully",
        phases: phasesArray,
      });
    })
    .on("error", (error) => {
      console.error("Error parsing CSV:", error);
      res.status(500).json({ message: "Failed to parse CSV file" });
    });
});
module.exports = router;
