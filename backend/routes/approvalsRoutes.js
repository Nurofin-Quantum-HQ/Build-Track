const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const ProjectUpdate = require("../models/ProjectUpdate");
const User = require("../models/User");
const mongoose = require("mongoose");
const { protect } = require("../middleware/auth");
const isDev = process.env.NODE_ENV !== "production";
router.get("/pending", protect, async (req, res) => {
  try {
    const user = req.user;
    if (isDev) {
      console.log(`[Approvals] Request from: ${user.name} | role: ${user.role} | id: ${user._id}`);
      console.log(`[Approvals] overseesRoles: ${JSON.stringify(user.overseesRoles)}`);
      console.log(`[Approvals] createdBy: ${user.createdBy}`);
    }
    let txQuery = { approvalStatus: "Pending" };
    let puQuery = { approvalStatus: "Pending" };
    if (user.role === "Admin") {
      const provisionedUsers = await User.find({
        createdBy: user._id,
      }).select("_id");
      if (isDev) console.log(`[Approvals] Admin - provisioned users found: ${provisionedUsers.length}`);
      if (provisionedUsers.length === 0) {
        return res.json({ transactions: [], projectUpdates: [] });
      }
      const provisionedIds = provisionedUsers.map((u) => u._id);
      txQuery.createdBy = { $in: provisionedIds };
      puQuery.createdBy = { $in: provisionedIds };
    } else {
      const supervisorDoc = await User.findById(user._id).select("createdBy overseesRoles");
      const overseesRoles = supervisorDoc?.overseesRoles || [];
      if (isDev) console.log(`[Approvals] Supervisor overseesRoles from DB: ${JSON.stringify(overseesRoles)}`);
      if (overseesRoles.length === 0) {
        console.log(`[Approvals] No overseesRoles set — returning empty`);
        return res.json({ transactions: [], projectUpdates: [] });
      }
      const adminId = supervisorDoc?.createdBy;
      if (isDev) console.log(`[Approvals] Supervisor's admin: ${adminId}`);
      if (!adminId) {
        if (isDev) console.log(`[Approvals] No createdBy on supervisor — returning empty`);
        return res.json({ transactions: [], projectUpdates: [] });
      }
      const allOrgUsers = await User.find({
        createdBy: adminId,
      }).select("_id name role");
      if (isDev) console.log(`[Approvals] All org users: ${JSON.stringify(allOrgUsers.map(u => ({ id: u._id, name: u.name, role: u.role })))}`);
      const overseesRolesLower = overseesRoles.map((r) => r.toLowerCase().trim());
      const usersToOversee = allOrgUsers.filter((u) =>
        overseesRolesLower.includes((u.role || "").toLowerCase().trim())
      );
      if (isDev) console.log(`[Approvals] Users to oversee: ${JSON.stringify(usersToOversee.map(u => ({ id: u._id, name: u.name, role: u.role })))}`);
      if (usersToOversee.length === 0) {
        return res.json({ transactions: [], projectUpdates: [] });
      }
      const overseeIds = usersToOversee.map((u) => u._id);
      txQuery.createdBy = { $in: overseeIds };
      puQuery.createdBy = { $in: overseeIds };
    }
    if (isDev) console.log(`[Approvals] Final txQuery: ${JSON.stringify(txQuery)}`);
    const [pendingTransactions, pendingProjectUpdates] = await Promise.all([
      Transaction.find(txQuery)
        .select("-attachments -paymentHistory -screenshotUrl -paymentReceipt -remarks")
        .populate("worker", "name trade")
        .populate("project", "projectName")
        .populate("createdBy", "name role")
        .sort({ createdAt: -1 }),
      ProjectUpdate.find(puQuery)
        .populate("project", "projectName")
        .populate("createdBy", "name role")
        .sort({ createdAt: -1 })
        .catch((err) => {
          console.log("[Approvals] ProjectUpdate error:", err.message);
          return [];
        }),
    ]);
    if (isDev) console.log(`[Approvals] Found ${pendingTransactions.length} pending transactions`);
    res.json({
      transactions: pendingTransactions,
      projectUpdates: pendingProjectUpdates,
    });
  } catch (err) {
    console.error("[Approvals] Error:", err);
    res.status(500).json({ message: "Server error fetching approvals" });
  }
});
router.get("/history", protect, async (req, res) => {
  try {
    const Transaction = require("../models/Transaction");
    const user = req.user;
    let userIds = [];
    if (user.role === "Admin") {
      const provisionedUsers = await User.find({
        createdBy: user._id,
      }).select("_id");
      userIds = provisionedUsers.map((u) => u._id);
      if (userIds.length === 0) {
        return res.json({ transactions: [] });
      }
    } else {
      const supervisorDoc = await User.findById(user._id)
        .select("createdBy overseesRoles");
      const overseesRoles = supervisorDoc?.overseesRoles || [];
      const adminId = supervisorDoc?.createdBy;
      if (isDev) console.log(`[History] Supervisor: ${user._id}, overseesRoles: ${JSON.stringify(overseesRoles)}, adminId: ${adminId}`);
      if (!adminId || overseesRoles.length === 0) {
        return res.json({ transactions: [] });
      }
      const allOrgUsers = await User.find({
        createdBy: adminId,
      }).select("_id role");
      const overseesRolesLower = overseesRoles.map(r =>
        r.toLowerCase().trim()
      );
      const usersToOversee = allOrgUsers.filter(u =>
        overseesRolesLower.includes((u.role || "").toLowerCase().trim())
      );
      if (isDev) console.log(`[History] Users to oversee: ${usersToOversee.length}`);
      userIds = usersToOversee.map((u) => u._id);
      if (userIds.length === 0) {
        return res.json({ transactions: [] });
      }
    }
    // [F3] Optional ?project= filter, applied in the query (before the limit).
    // ?limit= may raise the default of 20 (max 1000).
    const historyQuery = {
      createdBy: { $in: userIds },
      approvalStatus: { $in: ["Approved", "Rejected"] },
    };
    if (req.query.project && req.query.project !== "all") {
      if (!mongoose.Types.ObjectId.isValid(req.query.project)) {
        return res.status(400).json({ message: "Invalid project id" });
      }
      historyQuery.project = new mongoose.Types.ObjectId(req.query.project);
    }
    const requestedLimit = parseInt(req.query.limit, 10);
    const historyLimit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 20;
    const history = await Transaction.find(historyQuery)
      .select("-attachments -paymentHistory -screenshotUrl -paymentReceipt -remarks")
      .populate("createdBy", "name role")
      .populate("project", "projectName")
      .populate("approvedBy", "name")
      .sort({ approvedAt: -1, updatedAt: -1 })
      .limit(historyLimit);
    if (isDev) console.log(`[History] Found ${history.length} historical transactions`);
    res.json({ transactions: history });
  } catch (err) {
    console.error("[Approvals History] Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
