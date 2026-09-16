import { create } from "zustand";
import { notificationAPI, inventoryAPI, taskAPI } from "../api";

const useNotificationStore = create((set, get) => ({
  systemNotifications: [],
  inventoryAlerts: [],
  tasks: [],
  loading: false,
  error: null,
  lastFetched: 0,

  get totalAlertCount() {
    const state = get();
    const unreadSystem = state.systemNotifications.filter((n) => !n.read).length;
    return unreadSystem; // Do not include permanent inventory alerts in the unread badge
  },

  async fetchAll(force = false) {
    const state = get();
    const TTL = 30 * 1000; // 30 seconds
    if (!force && state.lastFetched && Date.now() - state.lastFetched < TTL) {
      return;
    }

    set({ loading: true, error: null });

    const [notifResult, invResult, taskResult] = await Promise.allSettled([
      notificationAPI.getAll(),
      inventoryAPI.getAll(),
      taskAPI.getDaily(),
    ]);

    let systemNotifications = state.systemNotifications;
    if (notifResult.status === "fulfilled" && notifResult.value?.data) {
      const data = notifResult.value.data;
      systemNotifications = Array.isArray(data) ? data : data.notifications || [];
    }

    let inventoryAlerts = state.inventoryAlerts;
    if (invResult.status === "fulfilled" && invResult.value?.data) {
      const data = invResult.value.data;
      const allItems = Array.isArray(data) ? data : data.inventory || data.items || [];
      inventoryAlerts = allItems.filter((item) => {
        const stock = Number(item.closingStock ?? 0);
        const threshold = Number(item.threshold ?? 10);
        return stock <= threshold;
      });
    }

    let tasks = state.tasks;
    if (taskResult.status === "fulfilled" && taskResult.value?.data) {
      const data = taskResult.value.data;
      tasks = Array.isArray(data) ? data : data.tasks || [];
    }

    set({
      systemNotifications,
      inventoryAlerts,
      tasks,
      loading: false,
      lastFetched: Date.now(),
    });
  },

  async markAsRead(id) {
    try {
      await notificationAPI.markAsRead(id);
      set((state) => ({
        systemNotifications: state.systemNotifications.map((n) =>
          (n._id || n.id) === id ? { ...n, read: true } : n
        ),
      }));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  },

  async markAllAsRead() {
    try {
      await notificationAPI.markAllAsRead();
      set((state) => ({
        systemNotifications: state.systemNotifications.map((n) => ({ ...n, read: true })),
      }));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  },

  async clearAll() {
    try {
      await notificationAPI.clearAll();
      set({ systemNotifications: [] });
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  },
}));

export default useNotificationStore;
