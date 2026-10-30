import { create } from "zustand";
import { notificationAPI, taskAPI } from "../api";

const useNotificationStore = create((set, get) => ({
  systemNotifications: [],
  tasks: [],
  loading: false,
  error: null,
  lastFetched: 0,
  unreadCount: 0,

  get totalAlertCount() {
    return this.systemNotifications ? this.systemNotifications.filter(n => !n.read).length : 0;
  },

  async fetchAll(force = false) {
    const state = get();
    const TTL = 30 * 1000; // 30 seconds
    if (!force && state.lastFetched && Date.now() - state.lastFetched < TTL) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const [notifResult, taskResult] = await Promise.allSettled([
        notificationAPI.getAll({ limit: 50 }),
        taskAPI.getDaily(),
      ]);

      let systemNotifications = state.systemNotifications;
      let unreadCount = 0;
      if (notifResult.status === "fulfilled" && notifResult.value?.data) {
        const data = notifResult.value.data;
        systemNotifications = Array.isArray(data)
          ? data
          : data.items || data.notifications || [];
        unreadCount = typeof data.unreadCount === "number"
          ? data.unreadCount
          : systemNotifications.filter(n => !n.read).length;
      }

      let tasks = state.tasks;
      if (taskResult.status === "fulfilled" && taskResult.value?.data) {
        const data = taskResult.value.data;
        tasks = Array.isArray(data) ? data : data.tasks || [];
      }

      set({
        systemNotifications,
        tasks,
        unreadCount,
        loading: false,
        lastFetched: Date.now(),
      });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  async markAsRead(id) {
    try {
      await notificationAPI.markAsRead(id);
      set((state) => {
        const updated = state.systemNotifications.map((n) =>
          (n._id || n.id) === id ? { ...n, read: true } : n
        );
        return {
          systemNotifications: updated,
          unreadCount: updated.filter(n => !n.read).length,
        };
      });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  },

  async markAllAsRead() {
    try {
      await notificationAPI.markAllAsRead();
      set((state) => ({
        systemNotifications: state.systemNotifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  },

  async clearAll() {
    try {
      await notificationAPI.clearAll();
      set({ systemNotifications: [], unreadCount: 0 });
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  },
}));

export default useNotificationStore;
