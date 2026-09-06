import axios from "axios";
import useAuthStore from "../stores/authStore";

function normalizeOrigin(url) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:5001";
const BASE = API_ORIGIN.endsWith("/api") ? API_ORIGIN : `${API_ORIGIN}/api`;

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bt_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 && !window.location.pathname.startsWith("/login")) {
      localStorage.removeItem("bt_token");
      localStorage.removeItem("bt_user");
      window.location.assign("/login");
    }
    if (status === 429) {
      err.friendlyMessage =
        "Too many requests to the server. Please wait a few seconds and try again.";
    } else if (!err.response) {
      err.friendlyMessage =
        "Cannot reach the server. Check your internet connection or try again later.";
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:          (data) => api.post("/auth/login",    data),
  register:       (data) => api.post("/auth/register", data),
  sendRegistrationOtp: (data) => api.post("/auth/send-registration-otp", data),
  verifyRegistrationOtp: (data) => api.post("/auth/verify-registration-otp", data),
  me:             ()     => api.get("/auth/me"),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword:  (data) => api.post("/auth/reset-password",  data),
  changePassword: (data) => api.put("/auth/change-password",  data),
  toggle2FA:      ()     => api.put("/auth/toggle-2fa"),
  signOutAll:     ()     => api.post("/auth/sign-out-all"),
  deleteAccount:  ()     => api.delete("/auth/account"),
  provision:      (data) => api.post("/auth/provision", data),
  provisionUser:  (data) => api.post("/auth/provision", data),
  getUsers:       ()     => api.get("/auth/users"),
  listUsers:      ()     => api.get("/auth/users"),
  updateUser:     (id, d)=> api.put(`/auth/users/${id}`, d),
};

export const workerAPI = {
  getAll:         (p = {}) => api.get("/workers", { params: p }),
  getSupervisors: ()       => api.get("/workers/supervisors"),
  getById:        (id)     => api.get(`/workers/${id}`),
  create:         (data)   => api.post("/workers", data),
  createAlt:      (data)   => api.post("/workers/add", data),
  update:         (id, d)  => api.put(`/workers/${id}`, d),
  delete:         (id)     => api.delete(`/workers/${id}`),
  getStats:       ()       => api.get("/workers/stats/summary"),
};

export const projectAPI = {
  getAll:       (p = {}) => api.get("/projects", { params: p }),
  getContext:   (p = {}) => api.get("/projects/context", { params: p }),
  getMine:      (p = {}) => api.get("/projects/mine", { params: p }),
  getById:      (id)     => api.get(`/projects/${id}`),
  getStats:     (id)     => api.get(`/projects/${id}/stats`),
  getBudget:    (id)     => api.get(`/projects/${id}/budget`),
  create:       (data)   => api.post("/projects", data),
  update:       (id, d)  => api.put(`/projects/${id}`, d),
  delete:       (id)     => api.delete(`/projects/${id}`),
  importPhases: (fd)     => api.post("/projects/import-phases", fd),
};

export const transactionAPI = {
  getAll:     (p = {}) => api.get("/transactions", { params: p }),
  getMine:    (p = {}) => api.get("/transactions/my", { params: p }),
  getById:    (id)     => api.get(`/transactions/${id}`),
  create:     (data)   => api.post("/transactions", data),
  createBulk: (data) => api.post("/transactions/bulk", data),
  update:     (id, d)  => api.put(`/transactions/${id}`, d),
  delete:     (id)     => api.delete(`/transactions/${id}`),
  approve:    (id)     => api.put(`/transactions/${id}/approve`, {}),
  reject:     (id, d)  => api.put(`/transactions/${id}/reject`, d),
};

export const projectUpdateAPI = {
  getByProject: (projectId)                => api.get(`/project-updates/${projectId}`),
  create:       (data)                     => api.post("/project-updates", data),
  approve:      (id)                       => api.put(`/project-updates/${id}/approve`, {}),
  reject:       (id, d)                    => api.put(`/project-updates/${id}/reject`, d),
};

export const approvalAPI = {
  getPending: (p = {}) => api.get("/approvals/pending", { params: p }),
  getHistory: (p = {}) => api.get("/approvals/history", { params: p }),
  approve: (txId) => api.put(`/transactions/${txId}/approve`),
  reject: (txId, reason) => api.put(`/transactions/${txId}/reject`, { rejectionReason: reason }),
};

export const dashboardAPI = {
  getSummary: () => api.get("/dashboard/summary"),
};

export const notificationAPI = {
  getAll: () => api.get("/notifications"),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put("/notifications/read-all"),
  clearAll: () => api.delete("/notifications/all"),
};

export const reportAPI = {
  getFinancial: (params) => api.get("/reports/financial", { params }),
  exportCSV:    (params) => api.get("/reports/financial/export-csv", { params, responseType: "blob" }),
  exportPDF:    (params) => api.get("/reports/financial/export-pdf", { params, responseType: "blob" }),
};

export const aiChatAPI = {
  ask: (data) => api.post("/reports/ai-chat", data),
};

export const aiDashboardAPI = {
  query: (data) => api.post("/reports/dashboard/query", data),
};

export const taskAPI = {
  getDaily: () => api.get("/tasks/daily"),
  createTask: (data) => api.post("/tasks", data),
};

export const subscriptionAPI = {
  getStatus:  ()      => api.get("/subscriptions/status"),
  initiate:   (data)  => api.post("/subscriptions/initiate", data),
  getUserSub: ()      => api.get("/users/subscription"),
  updateUserSub: (d)  => api.put("/users/subscription", d),
};

export const userAPI = {
  updateProfile:         (data) => api.put("/auth/profile", data),
  updatePhoto:           (fd)   => api.put("/auth/photo",   fd),
  getProfile:            ()     => api.get("/users/profile"),
  updateProfileAlt:      (data) => api.put("/users/profile", data),
  updatePhotoAlt:        (fd)   => api.put("/users/profile/photo", fd),
  assignSupervisorOversight: (id, data) => api.put(`/users/${id}/oversight`, data),
  visitModule:           (data) => api.post("/users/onboarding/visit-module", data),
  skipOnboarding:        ()     => api.put("/users/onboarding/skip"),
};

export const voiceAPI = {
  parse: (data) => api.post("/voice/parse", data),
};

export const inventoryAPI = {
  getAll:          ()         => api.get("/inventory"),
  getSummary:      (p = {})  => api.get("/inventory", { params: { ...p, summary: true } }),
  add:             (data)    => api.post("/inventory/add", data),
  addItem:         (data)    => api.post("/inventory/add", data),
  use:             (data)    => api.post("/inventory/use", data),
  updateThreshold: (id, threshold, params = {}) => api.patch(`/inventory/${id}/threshold`, { threshold }, { params }),
  deleteItem:      (id)      => api.delete(`/inventory/${id}`),
};

export const paymentAPI = {
  record:          (data)    => api.post("/transaction/payment", data),
  addFulfillment:  (data)    => api.post("/transaction/payment", data),
};

export const analyticsAPI = {
  getProject: (projectId) => api.get(`/analytics/${projectId}`),
};

export { API_ORIGIN };
export default api;

export const esignAPI = {
  requestSignature: (data) => api.post("/esign/request", data),
  checkStatus: (reqId) => api.get(`/esign/status/${reqId}`)
};
