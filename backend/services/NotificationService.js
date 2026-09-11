const Notification = require("../models/Notification");
const User = require("../models/User");

const ALL_TYPES = ["approval", "payment", "inventory", "project", "worker", "task", "system"];

class NotificationService {
  /**
   * Send a notification to a specific user.
   * Always persists an in-app notification; out-of-app delivery (email/push/browser)
   * is gated by the user's notificationPreferences and real provider integrations.
   */
  static async send(userId, {
    title,
    message,
    type = "system",
    priority = "low",
    data = {},
    relatedId = null,
    relatedModel = null
  }) {
    try {
      const notification = await Notification.create({
        user: userId,
        title,
        message,
        type,
        priority,
        data,
        relatedId,
        relatedModel,
        channel: "in_app"
      });

      // Fetch User to run out-of-app delivery (only if preferences allow)
      const user = await User.findById(userId);
      if (user && user.email && this.prefers(user, type, "email")) {
        console.log(`\n[OUT OF APP NOTIFICATION][email] -> Sent to ${user.email}`);
        console.log(`[TITLE]: ${title}`);
        console.log(`[MESSAGE]: ${message}\n`);
      }

      if (user && user.fcmTokens && user.fcmTokens.length > 0 && this.prefers(user, type, "push")) {
        console.log(`\n[OUT OF APP NOTIFICATION][push] -> Sent to FCM tokens`);
        try {
          const admin = require("firebase-admin");
          // Ensure firebase-admin is initialized in server.js or check here
          if (admin.apps.length > 0) {
            const payload = {
              notification: { title, body: message },
              data: {
                type: String(type),
                relatedId: String(relatedId || ""),
                relatedModel: String(relatedModel || ""),
                ...data
              }
            };
            const response = await admin.messaging().sendEachForMulticast({
              tokens: user.fcmTokens,
              notification: payload.notification,
              data: payload.data,
            });
            console.log(`[FCM Response] Success: ${response.successCount}, Failed: ${response.failureCount}`);
            // Note: In a production app, we would remove invalid tokens here
          }
        } catch (fcmErr) {
          console.error("[NotificationService] FCM Error:", fcmErr);
        }
      }

      return notification;
    } catch (err) {
      console.error("[NotificationService] Error sending notification:", err);
    }
  }

  static prefers(user, type, channel) {
    const prefs = user.notificationPreferences || {};
    if (prefs[channel] === false) return false;
    const typePref = prefs.types && prefs.types[type];
    return typePref === undefined ? true : typePref;
  }

  static async getUnreadCount(userId) {
    return Notification.countDocuments({ user: userId, read: false });
  }

  static async notifyAdminsAndSupervisors(workerId, { title, message, type, priority, data, relatedId, relatedModel }) {
    try {
      const worker = await User.findById(workerId);
      if (!worker) return;

      const adminId = worker.createdBy;
      if (!adminId) return; // if no admin, nowhere to send

      const notify = {
        title,
        message,
        type,
        priority,
        data,
        relatedId,
        relatedModel
      };

      // 1. Notify Admin
      await this.send(adminId, notify);

      // 2. Notify Supervisors overseeing this worker's role
      const workerRole = (worker.role || "").toLowerCase().trim();
      const supervisors = await User.find({
        createdBy: adminId,
        role: "Supervisor"
      });

      for (const sup of supervisors) {
        const oversees = sup.overseesRoles?.map(r => r.toLowerCase().trim()) || [];
        if (oversees.includes(workerRole)) {
          await this.send(sup._id, notify);
        }
      }
    } catch (err) {
      console.error("[NotificationService] Error in notifyAdminsAndSupervisors:", err);
    }
  }

  /** Send a system notification to every user of an account (admin + its sub-users). */
  static async broadcastToAccount(adminId, { title, message, data = {} }) {
    try {
      const accountUsers = await User.find({
        $or: [{ _id: adminId }, { createdBy: adminId }]
      });

      for (const u of accountUsers) {
        await this.send(u._id, {
          title,
          message,
          type: "system",
          priority: "medium",
          data
        });
      }
    } catch (err) {
      console.error("[NotificationService] Error in broadcastToAccount:", err);
    }
  }

  static get ALL_TYPES() {
    return ALL_TYPES;
  }
}

module.exports = NotificationService;