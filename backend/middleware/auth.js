const jwt = require("jsonwebtoken");
const User = require("../models/User");
const mongoose = require("mongoose");
const SECRET = process.env.JWT_SECRET;
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorised — no token" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    const user = await User.findById(decoded.id).select("-password -resetPasswordToken -resetPasswordExpires");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Account deactivated" });
    }
    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      return res.status(401).json({ message: "Session expired — please log in again" });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      message: `Access denied — requires role: ${roles.join(" or ")}`,
    });
  }
  next();
};
const requirePermission = (permissions) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.user.role === "Admin") return next();
  const userPermissions = Array.isArray(req.user.permissions)
    ? req.user.permissions
    : [];
  const hasPermission = permissions.some((p) => userPermissions.includes(p));
  if (!hasPermission) {
    return res.status(403).json({
      message: `Access denied — requires permission: ${permissions.join(" or ")}`,
    });
  }
  next();
};
const getAdminId = async (user) => {
  if (!user) return null;
  if (user.role === "Admin") {
    return user._id;
  }
  if (user.createdBy) {
    return typeof user.createdBy === "object" && user.createdBy._id
      ? user.createdBy._id
      : user.createdBy;
  }
  const freshUser = await User.findById(user._id).select("createdBy role").lean();
  return freshUser?.createdBy || user._id;
};
const canAccessProjectFilter = (req, projectId = null) => {
  const user = req.user;
  if (user.role === "Admin") {
    if (projectId) return { _id: projectId, createdBy: user._id };
    return { createdBy: user._id };
  }
  const assignedIds = Array.isArray(user.projectIds)
    ? user.projectIds.filter(Boolean).map((id) => id.toString())
    : [];
  if (user.projectId) {
    const legacyId = user.projectId.toString();
    if (!assignedIds.includes(legacyId)) assignedIds.push(legacyId);
  }
  const objectIds = assignedIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const adminId = user.createdBy;

  if (projectId) {
    const pidStr = projectId.toString();
    const isAssigned = assignedIds.includes(pidStr);
    if (isAssigned) {
      return { _id: projectId };
    }
    if (adminId) {
      return { _id: projectId, createdBy: adminId };
    }
    return { _id: new mongoose.Types.ObjectId(), __never: true };
  }

  const conditions = [];
  if (objectIds.length > 0) {
    conditions.push({ _id: { $in: objectIds } });
  }
  if (adminId) {
    conditions.push({ createdBy: adminId });
  }
  if (conditions.length === 1) return conditions[0];
  if (conditions.length > 1) return { $or: conditions };

  return { _id: { $in: [] } };
};
const canManageProjectFilter = (req, projectId = null) => {
  const user = req.user;
  if (user.role === "Admin") {
    if (projectId) return { _id: projectId, createdBy: user._id };
    return { createdBy: user._id };
  }
  return canAccessProjectFilter(req, projectId);
};
module.exports = {
  protect,
  authorize,
  requirePermission,
  getAdminId,
  canAccessProjectFilter,
  canManageProjectFilter,
};
