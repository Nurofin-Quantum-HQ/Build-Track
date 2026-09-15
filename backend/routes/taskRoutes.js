const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
router.use(protect);
router.get("/users", async (req, res) => {
  try {
    const accountOwnerId = req.user.createdBy || req.user._id;
    let query;
    if (req.user.role === 'Admin') {
      query = {
        $or: [
          { _id: accountOwnerId },
          { createdBy: accountOwnerId }
        ]
      };
    } else {
      const overseesRoles = req.user.overseesRoles || [];
      query = {
        $or: [
          { _id: req.user._id },
          { createdBy: req.user._id },
          { createdBy: accountOwnerId, role: { $in: overseesRoles } }
        ]
      };
    }
    const users = await User.find(query).select("_id name role profilePhoto");
    res.json(users);
  } catch (err) {
    console.error("Fetch assignable users error:", err);
    res.status(500).json({ message: "Failed to fetch assignable users" });
  }
});
router.get("/project/:projectId", async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate("assignedTo", "name role profilePhoto")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error("Fetch project tasks error:", err);
    res.status(500).json({ message: "Failed to fetch project tasks" });
  }
});
router.get("/daily", async (req, res) => {
  try {
    const accountOwnerId = req.user.createdBy || req.user._id;
    let queryConditions = [
      { assignedTo: req.user._id },
      { createdBy: req.user._id }
    ];
    if (req.user.role === 'Admin') {
      const allAccountUsers = await User.find({
        $or: [{ _id: accountOwnerId }, { createdBy: accountOwnerId }]
      }).select("_id");
      queryConditions.push({ assignedTo: { $in: allAccountUsers.map(u => u._id) } });
      queryConditions.push({ createdBy: accountOwnerId });
    } else if (req.user.overseesRoles && req.user.overseesRoles.length > 0) {
      const overseenUsers = await User.find({
        createdBy: accountOwnerId,
        role: { $in: req.user.overseesRoles }
      }).select("_id");
      queryConditions.push({ assignedTo: { $in: overseenUsers.map(u => u._id) } });
    }
    let tasks = await Task.find({
      $or: queryConditions
    }).populate("assignedTo", "name role profilePhoto");
    if (tasks.length === 0) {
      const projects = await Project.find({ createdBy: req.user._id });
      if (projects.length > 0) {
        const projectId = projects[0]._id;
        const defaultTasks = [
          {
            createdBy: req.user._id,
            project: projectId,
            title: "Foundation Reinforcement checking",
            assignee: "Mohan Singh",
            assignedTo: req.user._id,
            floorName: "Ground Floor",
            status: "In Progress",
            time: "09:00 AM",
            description: "Check the reinforcement bars before pouring concrete."
          },
          {
            createdBy: req.user._id,
            project: projectId,
            title: "Brickwork plastering inspections",
            assignee: "Ravi Teja",
            floorName: "1st Floor",
            status: "Not Started",
            time: "11:30 AM",
          }
        ];
        tasks = await Task.insertMany(defaultTasks);
      }
    }
    res.json(tasks);
  } catch (err) {
    console.error("Fetch daily tasks error:", err);
    res.status(500).json({ message: "Failed to fetch daily tasks" });
  }
});
router.post("/", async (req, res) => {
  try {
    const {
      project, title, description, assignedTo, status, time,
      floorId, floorName, phaseId, phaseName, activityId, activityName
    } = req.body;
    if (!project || !title) {
      return res.status(400).json({ message: "Project and Title are required" });
    }
    let assigneeName = "Unknown Mason";
    if (assignedTo) {
      const assigneeUser = await User.findById(assignedTo);
      if (assigneeUser) assigneeName = assigneeUser.name;
    }
    const newTask = await Task.create({
      createdBy: req.user._id,
      project,
      title,
      description,
      assignedTo: assignedTo || null,
      assignee: assigneeName,
      floorId: floorId || null,
      floorName: floorName || null,
      phaseId: phaseId || null,
      phaseName: phaseName || null,
      activityId: activityId || null,
      activityName: activityName || null,
      status: status || "Not Started",
      time: time || "Today",
    });
    const populatedTask = await Task.findById(newTask._id).populate("assignedTo", "name role profilePhoto");

    if (newTask.assignedTo) {
      const NotificationService = require("../services/NotificationService");
      await NotificationService.send(newTask.assignedTo, {
        title: "New Task Assigned",
        message: `You have been assigned the task "${newTask.title}".`,
        type: "task",
        priority: "medium",
        relatedId: newTask._id,
        relatedModel: "Task",
        data: { project: newTask.project, status: newTask.status }
      });
    }

    res.status(201).json({ message: "Task created successfully", task: populatedTask });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ message: "Failed to create task" });
  }
});
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Not Started", "In Progress", "Completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const isAdmin = req.user.role === 'Admin';
    const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();
    if (!isAdmin && !isCreator && !isAssignee) {
      return res.status(403).json({ message: "Access denied to update this task" });
    }
    task.status = status;
    await task.save();

    const NotificationService = require("../services/NotificationService");
    const isStatusChanger = req.user._id;
    if (status === "Completed" && task.createdBy && task.createdBy.toString() !== isStatusChanger.toString()) {
      await NotificationService.send(task.createdBy, {
        title: "Task Completed",
        message: `Task "${task.title}" has been marked as completed.`,
        type: "task",
        priority: "low",
        relatedId: task._id,
        relatedModel: "Task",
        data: { project: task.project, status }
      });
    }

    res.json({ message: "Task status updated", task });
  } catch (err) {
    console.error("Update task status error:", err);
    res.status(500).json({ message: "Failed to update task status" });
  }
});
router.put("/:id", async (req, res) => {
  try {
    const {
      title, description, assignedTo, status, time,
      floorId, floorName, phaseId, phaseName, activityId, activityName
    } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const isAdmin = req.user.role === 'Admin';
    const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();
    if (!isAdmin && !isCreator && !isAssignee) {
      return res.status(403).json({ message: "Access denied to update this task" });
    }
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (status) {
      if (!["Not Started", "In Progress", "Completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      task.status = status;
    }
    if (time) task.time = time;
    if (floorId !== undefined) task.floorId = floorId;
    if (floorName !== undefined) task.floorName = floorName;
    if (phaseId !== undefined) task.phaseId = phaseId;
    if (phaseName !== undefined) task.phaseName = phaseName;
    if (activityId !== undefined) task.activityId = activityId;
    if (activityName !== undefined) task.activityName = activityName;
    if (assignedTo !== undefined) {
      task.assignedTo = assignedTo || null;
      let assigneeName = "Unknown Mason";
      if (assignedTo) {
        const assigneeUser = await User.findById(assignedTo);
        if (assigneeUser) assigneeName = assigneeUser.name;
      }
      task.assignee = assigneeName;
    }
    await task.save();
    const populatedTask = await Task.findById(task._id).populate("assignedTo", "name role profilePhoto");

    const NotificationService = require("../services/NotificationService");
    if (task.assignedTo && req.body.assignedTo !== undefined && task.assignedTo.toString() !== req.user._id.toString()) {
      await NotificationService.send(task.assignedTo, {
        title: "New Task Assigned",
        message: `You have been assigned the task "${task.title}".`,
        type: "task",
        priority: "medium",
        relatedId: task._id,
        relatedModel: "Task",
        data: { project: task.project, status: task.status }
      });
    }

    res.json({ message: "Task updated successfully", task: populatedTask });
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ message: "Failed to update task" });
  }
});
module.exports = router;
