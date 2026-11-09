// Who may open which page. Follows the Assign Role switches exactly, the same
// way the backend does: Admins pass everything, everyone else needs the switch.
// Role names (Supervisor, Mason…) never grant access on their own.

export const isAdminUser = (user) => (user?.role || "").toLowerCase() === "admin";

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  const wanted = Array.isArray(permission) ? permission : [permission];
  return wanted.some((p) => perms.includes(p));
};

const ADMIN_ONLY = "admin-only";

// Mirrors the permission each page's API calls need on the backend.
export const ROUTE_ACCESS = {
  "/projects": ["view_projects", "view_assigned_project", "view_all_projects", "create_project"],
  "/newproject": ["create_project", "manage_team"],
  "/reports": ["view_reports"],
  "/insights": ["view_reports"],
  "/project-insights": ["view_reports"],
  "/ai-chat": ["view_reports"],
  "/voice": ["add_entries", "manage_expenses"],
  "/add-entry": ["add_entries", "manage_expenses"],
  "/choose-entry-mode": ["add_entries", "manage_expenses"],
  "/manualentry": ["add_entries", "manage_expenses"],
  "/update-progress": ["add_entries", "submit_daily_update", "edit_project", "approve_updates"],
  "/assign-task": ["assign_tasks"],
  "/approvals": ["approve_payments", "approve_updates"],
  // These pages read the team list (GET /auth/users), which is Admin-only.
  "/admin": ADMIN_ONLY,
  "/assign-role": ADMIN_ONLY,
  "/audit-logs": ADMIN_ONLY,
  // The workspace owner pays for the plan.
  "/subscription": ADMIN_ONLY,
};

export const canAccessRoute = (user, path) => {
  if (!user) return false;
  const rule = ROUTE_ACCESS[path];
  if (!rule) return true;
  if (rule === ADMIN_ONLY) return isAdminUser(user);
  return hasPermission(user, rule);
};

export const canAddEntries = (user) => canAccessRoute(user, "/add-entry");
export const canApprove = (user) => canAccessRoute(user, "/approvals");
