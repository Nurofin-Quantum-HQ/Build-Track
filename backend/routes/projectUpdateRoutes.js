const express = require("express");
const router = express.Router();
const ProjectUpdate = require("../models/ProjectUpdate");
const Project = require("../models/Project");
const { protect, canAccessProjectFilter, requirePermission } = require("../middleware/auth");
const upload = require("../config/multer");
const { getFileUrl } = require("../config/fileHelpers");
router.use(protect);
router.get("/:projectId", async (req, res) => {
  try {
    const pDoc = await Project.findOne(canAccessProjectFilter(req, req.params.projectId));
    if (!pDoc) {
      return res.status(403).json({ message: "Access denied to this project" });
    }
    const updates = await ProjectUpdate.find({
      project: req.params.projectId,
    }).sort({ createdAt: -1 }).populate("createdBy", "name role profilePhoto").populate("approvedBy", "name");
    res.json({ updates });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch project updates" });
  }
});
function calculateProgress(stage) {
  const stageMap = {
    "Foundation": 10,
    "Footing": 20,
    "Walls": 40,
    "Slab": 60,
    "First Floor": 70,
    "Second Floor": 80,
    "Finishing": 100
  };
  return stageMap[stage] || 0;
}
router.post("/", requirePermission(["submit_daily_update", "add_entries", "edit_project", "approve_updates"]), upload.array("media"), async (req, res) => {
  try {
    const { project, stage, workDone, startDate, endDate, remarks, completedTasks } = req.body;
    if (!project || !stage) {
      return res.status(400).json({ message: "Project and Stage are required" });
    }
    const existing = await Project.findOne(canAccessProjectFilter(req, project));
    if (!existing) {
      return res.status(403).json({ message: "Access denied to this project" });
    }
    const media = req.files ? req.files.map((f) => getFileUrl(f)) : [];
    let parsedCompletedTasks = [];
    if (completedTasks) {
      try {
        parsedCompletedTasks = typeof completedTasks === 'string' ? JSON.parse(completedTasks) : completedTasks;
      } catch (e) {
        console.error("Error parsing completedTasks", e);
      }
    }
    const update = await ProjectUpdate.create({
      createdBy: req.user._id,
      project,
      stage,
      workDone: Number(workDone) || 0,
      startDate,
      endDate,
      remarks,
      media,
      approvalStatus: "Pending",
      completedTasks: parsedCompletedTasks,
    });
    if (parsedCompletedTasks && parsedCompletedTasks.length > 0) {
      const Task = require("../models/Task");
      await Task.updateMany(
        { _id: { $in: parsedCompletedTasks } },
        { $set: { status: "Completed" } }
      );
    }
    res.status(201).json({ message: "Project update saved as Pending", update });
  } catch (err) {
    console.error("Create project update error:", err);
    res.status(500).json({ message: "Failed to save project update" });
  }
});
router.put("/:id/approve", requirePermission(["approve_updates"]), async (req, res) => {
  try {
    const update = await ProjectUpdate.findById(req.params.id);
    if (!update) return res.status(404).json({ message: "Project update not found" });
    if (update.createdBy.toString() === req.user._id.toString() && req.user.role !== "Admin") {
      return res.status(403).json({ message: "You cannot approve your own update" });
    }
    const existing = await Project.findOne(canAccessProjectFilter(req, update.project));
    if (!existing) return res.status(403).json({ message: "Access denied to this project" });
    update.approvalStatus = "Approved";
    update.approvedBy = req.user._id;
    update.approvedAt = new Date();
    await update.save();
    const progressVal = calculateProgress(update.stage);
    if (progressVal > 0) {
      if (progressVal > (existing.progress || 0)) {
        existing.progress = progressVal;
        await existing.save();
      }
    }
    res.json({ message: "Project update approved", update });
  } catch (err) {
    console.error("Approve project update error:", err);
    res.status(500).json({ message: "Failed to approve project update" });
  }
});
router.put("/:id/reject", requirePermission(["approve_updates", "reject_updates"]), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const update = await ProjectUpdate.findById(req.params.id);
    if (!update) return res.status(404).json({ message: "Project update not found" });
    const existing = await Project.findOne(canAccessProjectFilter(req, update.project));
    if (!existing) return res.status(403).json({ message: "Access denied to this project" });
    update.approvalStatus = "Rejected";
    update.approvedBy = req.user._id;
    update.approvedAt = new Date();
    update.rejectionReason = rejectionReason || "";
    await update.save();
    res.json({ message: "Project update rejected", update });
  } catch (err) {
    console.error("Reject project update error:", err);
    res.status(500).json({ message: "Failed to reject project update" });
  }
});
module.exports = router;
