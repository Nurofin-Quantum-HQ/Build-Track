const Notification = require("../models/Notification");
const User = require("../models/User");
const NotificationService = require("../services/NotificationService");

const DEFAULT_PREFS = {
  email: true,
  push: true,
  browser: true,
  types: {
    approval: true,
    payment: true,
    inventory: true,
    project: true,
    worker: true,
    task: true,
    system: true
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      NotificationService.getUnreadCount(req.user._id)
    ]);
    res.json({
      items,
      total,
      unreadCount,
      page,
      pages: Math.max(Math.ceil(total / limit), 1)
    });
  } catch (err) {
    console.error("[NotificationController] getNotifications Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await NotificationService.getUnreadCount(req.user._id);
    res.json({ unreadCount });
  } catch (err) {
    console.error("[NotificationController] getUnreadCount Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const prefs = req.user.notificationPreferences || {};
    res.json({ preferences: { ...DEFAULT_PREFS, ...prefs } });
  } catch (err) {
    console.error("[NotificationController] getPreferences Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const current = (req.user.notificationPreferences || {}).toObject ? req.user.notificationPreferences.toObject() : req.user.notificationPreferences || {};
    const currentTypes = current.types || {};
    const incoming = req.body.preferences || req.body || {};
    const incomingTypes = incoming.types || {};

    const updated = {
      email: typeof incoming.email === "boolean" ? incoming.email : (current.email !== undefined ? current.email : true),
      push: typeof incoming.push === "boolean" ? incoming.push : (current.push !== undefined ? current.push : true),
      browser: typeof incoming.browser === "boolean" ? incoming.browser : (current.browser !== undefined ? current.browser : true),
      types: { ...currentTypes, ...incomingTypes }
    };

    await User.findByIdAndUpdate(req.user._id, { $set: { notificationPreferences: updated } });
    res.json({ preferences: updated });
  } catch (err) {
    console.error("[NotificationController] updatePreferences Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(notification);
  } catch (err) {
    console.error("[NotificationController] markAsRead Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("[NotificationController] markAllAsRead Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    console.error("[NotificationController] deleteAll Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.broadcast = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }
    const adminId = req.user.role === "Admin" ? req.user._id : (req.user.createdBy || req.user._id);
    await NotificationService.broadcastToAccount(adminId, { title, message });
    res.json({ success: true });
  } catch (err) {
    console.error("[NotificationController] broadcast Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.registerDeviceToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }
    
    // Add token if it doesn't exist
    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { fcmTokens: token } }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error("[NotificationController] registerDeviceToken Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};