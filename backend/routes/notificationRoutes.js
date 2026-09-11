const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getNotifications,
  getUnreadCount,
  getPreferences,
  updatePreferences,
  markAsRead,
  markAllAsRead,
  deleteAll,
  broadcast,
  registerDeviceToken
} = require("../controllers/notificationController");

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.get("/preferences", protect, getPreferences);
router.put("/preferences", protect, updatePreferences);
router.post("/device-token", protect, registerDeviceToken);
router.put("/read-all", protect, markAllAsRead);
router.delete("/all", protect, deleteAll);
router.post("/broadcast", protect, authorize("Admin"), broadcast);
router.put("/:id/read", protect, markAsRead);

module.exports = router;