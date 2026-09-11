const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");
const Project = require("../models/Project");
const { protect, requirePermission, getAdminId, canAccessProjectFilter } = require("../middleware/auth");
router.use(protect);
router.use(requirePermission(["manage_material_master", "manage_expenses"]));
router.get("/", async (req, res) => {
  try {
    const { project } = req.query;
    const query = {};
    if (project) {
      const pDoc = await Project.findOne(canAccessProjectFilter(req, project));
      if (!pDoc) {
        return res.status(403).json({ message: "Access denied to this project" });
      }
      query.project = project;
    } else {
      const projectFilter = canAccessProjectFilter(req);
      const projects = await Project.find(projectFilter).select("_id");
      const projectIds = projects.map(p => p._id);
      query.project = { $in: projectIds };
    }
    const inventory = await Inventory.find(query).sort({ materialName: 1 }).populate("project", "projectName");
    res.json({ inventory });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});
router.post("/add", async (req, res) => {
  try {
    const { materialName, purchased, unit, project, category, threshold } = req.body;
    if (!materialName) return res.status(400).json({ message: "materialName is required" });
    if (!project)      return res.status(400).json({ message: "project is required" });
    const qty = parseFloat(purchased) || 0;
    if (qty <= 0) return res.status(400).json({ message: "Valid quantity is required" });
    const pDoc = await Project.findOne(canAccessProjectFilter(req, project));
    if (!pDoc) {
      return res.status(403).json({ message: "Access denied to this project" });
    }
    const adminId = await getAdminId(req.user);
    let item = await Inventory.findOne({ project, materialName, createdBy: adminId });
    if (item) {
      item.purchased   += qty;
      item.closingStock = item.purchased - item.used;
    } else {
      item = new Inventory({
        materialName,
        purchased:    qty,
        used:         0,
        closingStock: qty,
        unit:         unit      || 'units',
        category:     category  || 'material',
        threshold:    parseFloat(threshold) || 10,
        project,
        createdBy: adminId,
      });
    }
    await item.save();
    res.json({ message: "Inventory item added", item });
  } catch (err) {
    res.status(500).json({ message: "Failed to add inventory item" });
  }
});
router.post("/use", async (req, res) => {
  try {
    const { materialName, usedQty, project } = req.body;
    const qty = parseFloat(usedQty) || 0;
    if (!materialName) return res.status(400).json({ message: "Material name is required" });
    if (!project) return res.status(400).json({ message: "Project is required" });
    if (qty <= 0) return res.status(400).json({ message: "Valid used quantity is required" });
    const pDoc = await Project.findOne(canAccessProjectFilter(req, project));
    if (!pDoc) {
      return res.status(403).json({ message: "Access denied to this project" });
    }
    const adminId = await getAdminId(req.user);
    let item = await Inventory.findOne({ project: project, materialName, createdBy: adminId });
    if (!item) {
      return res.status(404).json({ message: "Material not found in inventory for this project. Purchase it first." });
    }
    const newUsedQty = item.used + qty;
    if (newUsedQty > item.purchased) {
      return res.status(400).json({
        message: `Cannot use ${qty} ${item.unit || "units"} — only ${item.closingStock} ${item.unit || "units"} in stock.`,
      });
    }
    item.used = newUsedQty;
    item.closingStock = item.purchased - item.used;
    await item.save();
    
    if (item.closingStock <= item.threshold) {
      const NotificationService = require("../services/NotificationService");
      await NotificationService.send(adminId, {
        title: "Low Stock Alert",
        message: `${item.materialName} is running low. Current stock: ${item.closingStock} ${item.unit}`,
        type: "inventory",
        priority: "high",
        relatedId: item._id,
        relatedModel: "Inventory",
        data: { stock: item.closingStock, unit: item.unit }
      });
    }

    res.json({ message: "Inventory updated", item });
  } catch (err) {
    res.status(500).json({ message: "Failed to update inventory" });
  }
});
router.patch("/:id/threshold", async (req, res) => {
  try {
    const { threshold } = req.body;
    const { project, materialName, category, unit } = req.query;
    const val = parseFloat(threshold) ?? 10;
    let item;
    if (/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      item = await Inventory.findById(req.params.id);
    }
    if (!item && project && materialName) {
      const adminId = await getAdminId(req.user);
      item = await Inventory.findOne({ project, materialName, createdBy: adminId });
      if (!item) {
        item = new Inventory({
          project,
          materialName,
          createdBy: adminId,
          category: category || "material",
          unit: unit || "units",
          purchased: 0,
          used: 0,
          closingStock: 0,
          threshold: val,
        });
      }
    }
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    item.threshold = val;
    await item.save();
    res.json({ message: "Threshold updated", item });
  } catch (err) {
    res.status(500).json({ message: "Failed to update threshold" });
  }
});
module.exports = router;
