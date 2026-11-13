import { create } from "zustand";
import { persist } from "zustand/middleware";
import { projectAPI } from "../api";

const useProjectStore = create(
  persist(
    (set, get) => ({
      projects: [],
      contextProjects: [],
      contextLoadedAt: 0,
      selectedProject: null,
      loading: false,
      error: null,
      stats: {},
      userId: null,

      syncUser(user) {
        const uid = user?._id || user?.id || null;
        const state = get();
        if (uid && state.userId && state.userId !== uid) {
          // Different user logged in — immediately wipe previous user's projects and selection
          set({
            projects: [],
            contextProjects: [],
            contextLoadedAt: 0,
            selectedProject: null,
            stats: {},
            userId: uid,
          });
        } else if (uid && !state.userId) {
          set({ userId: uid });
        }
      },

      reset() {
        set({
          projects: [],
          contextProjects: [],
          contextLoadedAt: 0,
          selectedProject: null,
          stats: {},
          userId: null,
          loading: false,
          error: null,
        });
        try {
          localStorage.removeItem("bt_projects");
        } catch {}
      },

      async fetchContext(force = false) {
        const CONTEXT_TTL = 5 * 60 * 1000;
        const state = get();
        if (!force && state.contextProjects.length > 0 && Date.now() - state.contextLoadedAt < CONTEXT_TTL) {
          return state.contextProjects;
        }
        try {
          const { data } = await projectAPI.getContext();
          const list = data.projects || [];
          const curSel = get().selectedProject;
          const selId = curSel?._id || curSel?.id;
          const isValidSel = selId && list.some((p) => (p._id || p.id) === selId);
          set({
            contextProjects: list,
            contextLoadedAt: Date.now(),
            ...(curSel && !isValidSel ? { selectedProject: null } : {}),
          });
          return list;
        } catch {
          return state.contextProjects || [];
        }
      },

      async fetchProjects(params = {}, force = false) {
        const state = get();
        if (state.projects.length > 0 && !force) {
          projectAPI.getAll(params).then(({ data }) => {
            const list = Array.isArray(data) ? data : data.projects || [];
            const curSel = get().selectedProject;
            const selId = curSel?._id || curSel?.id;
            const isValidSel = selId && list.some((p) => (p._id || p.id) === selId);
            set({
              projects: list,
              ...(curSel && !isValidSel ? { selectedProject: null } : {}),
            });
          }).catch(() => {});
          return state.projects;
        }

        set({ loading: state.projects.length === 0, error: null });
        try {
          const { data } = await projectAPI.getAll(params);
          const list = Array.isArray(data) ? data : data.projects || [];
          const curSel = get().selectedProject;
          const selId = curSel?._id || curSel?.id;
          const isValidSel = selId && list.some((p) => (p._id || p.id) === selId);
          set({
            projects: list,
            loading: false,
            ...(curSel && !isValidSel ? { selectedProject: null } : {}),
          });
          return list;
        } catch (err) {
          set({ error: err.message || "Failed to load projects", loading: false });
          return state.projects || [];
        }
      },

      async fetchProjectById(id) {
        try {
          const { data } = await projectAPI.getById(id);
          const project = data.project || data;
          set((state) => ({
            selectedProject: project,
            projects: state.projects.map((p) =>
              (p._id || p.id) === id ? project : p
            ),
          }));
          return project;
        } catch (err) {
          set({ error: err.message || "Failed to load project" });
          return null;
        }
      },

      async fetchProjectStats(id) {
        try {
          const { data } = await projectAPI.getStats(id);
          set((state) => ({
            stats: { ...state.stats, [id]: data.stats || data },
          }));
          return data.stats || data;
        } catch {
          return null;
        }
      },

      async createProject(projectData) {
        try {
          const { data } = await projectAPI.create(projectData);
          const newProject = data.project || data;
          set((state) => ({ projects: [newProject, ...state.projects], contextProjects: [], contextLoadedAt: 0 }));
          return newProject;
        } catch (err) {
          set({ error: err.message || "Failed to create project" });
          throw err;
        }
      },

      async updateProject(id, updates) {
        try {
          const { data } = await projectAPI.update(id, updates);
          const updated = data.project || data;
          set((state) => ({
            projects: state.projects.map((p) =>
              (p._id || p.id) === id ? updated : p
            ),
            contextProjects: [],
            contextLoadedAt: 0,
            selectedProject: (state.selectedProject?._id || state.selectedProject?.id) === id
              ? updated
              : state.selectedProject,
          }));
          return updated;
        } catch (err) {
          set({ error: err.message || "Failed to update project" });
          throw err;
        }
      },

      async deleteProject(id) {
        try {
          await projectAPI.delete(id);
          set((state) => ({
            projects: state.projects.filter((p) => (p._id || p.id) !== id),
            contextProjects: state.contextProjects.filter((p) => (p._id || p.id) !== id),
            contextLoadedAt: 0,
            selectedProject: (state.selectedProject?._id || state.selectedProject?.id) === id
              ? null
              : state.selectedProject,
          }));
          return true;
        } catch (err) {
          set({ error: err.message || "Failed to delete project" });
          throw err;
        }
      },

      setSelectedProject(project) {
        if (!project) {
          set({ selectedProject: null });
          return;
        }
        const pid = project._id || project.id;
        const currentProjects = get().projects;
        if (currentProjects.length > 0 && pid && !currentProjects.some((p) => (p._id || p.id) === pid)) {
          // Do not select a project not in the user's project list
          return;
        }
        set({ selectedProject: project });
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: "bt_projects",
      partialize: (state) => ({
        projects: state.projects,
        selectedProject: state.selectedProject,
        userId: state.userId,
      }),
    }
  )
);

export default useProjectStore;
