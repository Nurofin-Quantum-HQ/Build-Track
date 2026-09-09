import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI } from "../api";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      initialized: false,

      get isAdmin() {
        return get().user?.role?.toLowerCase() === "admin";
      },

      get isSupervisor() {
        return get().user?.role?.toLowerCase() === "supervisor";
      },

      get isMason() {
        const role = get().user?.role?.toLowerCase();
        return role === "mason" || role === "worker";
      },

      get roleLabel() {
        const raw = get().user?.role;
        if (!raw) return "Worker";
        const trimmed = raw.trim();
        switch (trimmed.toLowerCase()) {
          case "admin": return "Admin";
          case "supervisor": return "Supervisor";
          case "mason": return "Mason";
          case "worker": return "Worker";
          default: return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }
      },

      get projectIds() {
        const u = get().user;
        if (!u) return [];
        if (Array.isArray(u.projectIds) && u.projectIds.length > 0) return u.projectIds;
        return u.projectId ? [u.projectId] : [];
      },

      get permissions() {
        return get().user?.permissions || [];
      },

      hasPermission(key) {
        const s = get();
        if (s.isAdmin) return true;
        return s.permissions.includes(key);
      },

      hasProjectAccess(projectId) {
        const s = get();
        if (s.isAdmin) return true;
        return s.projectIds.some((id) => id === projectId);
      },

      fromLoginResponse(userData, token) {
        set({
          user: {
            id: userData.id || userData._id || "",
            name: userData.name || "",
            email: userData.email || "",
            role: userData.role || "mason",
            rawRoleName: userData.rawRoleName || "",
            projectIds: Array.isArray(userData.projectIds)
              ? userData.projectIds.filter(Boolean)
              : userData.projectId
                ? [userData.projectId]
                : [],
            permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
            profilePhoto: userData.profilePhoto || null,
            company: userData.company || "",
            phone: userData.phone || null,
          },
          token,
          initialized: true,
        });
      },

      async loadFromStorage() {
        const state = get();
        if (state.token && state.user) {
          set({ initialized: true });
          return;
        }
        set({ initialized: true });
      },

      async refreshUser() {
        try {
          const { data } = await authAPI.me();
          const u = data.user || data;
          set((state) => ({
            user: {
              ...state.user,
              id: u.id || u._id || state.user?.id,
              name: u.name || state.user?.name,
              email: u.email || state.user?.email,
              role: u.role || state.user?.role,
              rawRoleName: u.rawRoleName || state.user?.rawRoleName || "",
              projectIds: Array.isArray(u.projectIds)
                ? u.projectIds.filter(Boolean)
                : u.projectId
                  ? [u.projectId]
                  : state.user?.projectIds || [],
              permissions: Array.isArray(u.permissions) ? u.permissions : state.user?.permissions || [],
              profilePhoto: u.profilePhoto || state.user?.profilePhoto,
              company: u.company || state.user?.company,
              phone: u.phone || state.user?.phone || null,
            },
          }));
        } catch {

        }
      },

      logout() {
        localStorage.removeItem("bt_token");
        localStorage.removeItem("bt_user");
        set({ user: null, token: null, initialized: true });
      },
    }),
    {
      name: "bt_auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        useAuthStore.setState({ initialized: true });
      },
    }
  )
);

export default useAuthStore;
