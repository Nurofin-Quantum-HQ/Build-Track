import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layout/DashboardLayout";
import AppProviders from "./contexts/AppProviders";
import { useAuth } from "./contexts/AuthContext";
import RequireRole from "./components/RequireRole";

import LoginPage       from "./pages/login_page";
import SignUpPage      from "./pages/signup_page";
import OAuthCallback   from "./pages/oauth_callback";

const Dashboard        = lazy(() => import("./screens/dashboard_page"));
const VoiceAssistant   = lazy(() => import("./screens/voice_assistant"));
const TransactionLog   = lazy(() => import("./screens/transaction_log"));
const Projects         = lazy(() => import("./screens/project_management"));
const Reports          = lazy(() => import("./screens/financial_report"));
const Settings         = lazy(() => import("./screens/settings_page"));
const NewProject       = lazy(() => import("./screens/add_new_project"));
const AddEntry         = lazy(() => import("./screens/add_entry_page"));
const EntryDetail      = lazy(() => import("./screens/entry_detail_page"));
const Approvals        = lazy(() => import("./screens/approvals_page"));
const AdminOverview    = lazy(() => import("./screens/admin_overview_page"));
const AiChatReport     = lazy(() => import("./screens/ai_chat_report_page"));
const AssignRoles      = lazy(() => import("./screens/assign_roles_page"));
const AssignTask       = lazy(() => import("./screens/assign_task_page"));
const Notifications    = lazy(() => import("./screens/notifications_page"));
const ManageSite       = lazy(() => import("./screens/managesite_dashboard"));
const ManualEntryPage  = lazy(() => import("./screens/manual_entry"));
const InventoryPage    = lazy(() => import("./screens/inventory_page"));
const SubscriptionPage = lazy(() => import("./screens/subscription_page"));
const AuditLogsPage     = lazy(() => import("./screens/audit_logs_page"));

export const routePreloaders = {
  "/": () => import("./screens/dashboard_page"),
  "/add-entry": () => import("./screens/add_entry_page"),
  "/manualentry": () => import("./screens/manual_entry"),
  "/entry-detail": () => import("./screens/entry_detail_page"),
  "/voice": () => import("./screens/voice_assistant"),
  "/transaction": () => import("./screens/transaction_log"),
  "/projects": () => import("./screens/project_management"),
  "/newproject": () => import("./screens/add_new_project"),
  "/inventory": () => import("./screens/inventory_page"),
  "/reports": () => import("./screens/financial_report"),
  "/settings": () => import("./screens/settings_page"),
  "/managesite": () => import("./screens/managesite_dashboard"),
  "/approvals": () => import("./screens/approvals_page"),
  "/admin": () => import("./screens/admin_overview_page"),
  "/ai-chat": () => import("./screens/ai_chat_report_page"),
  "/assign-role": () => import("./screens/assign_roles_page"),
  "/assign-task": () => import("./screens/assign_task_page"),
  "/notifications": () => import("./screens/notifications_page"),
  "/subscription": () => import("./screens/subscription_page"),
  "/audit-logs": () => import("./screens/audit_logs_page"),
};

export function preloadRoute(path) {
  if (routePreloaders[path]) {
    routePreloaders[path]();
  }
}

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '300px', height: '100%',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: '#6B7280', fontSize: 13, fontWeight: 500,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 16, height: 16, border: '2px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        <span>Loading...</span>
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        color: '#6B7280', fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/signup"         element={<SignUpPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/add-entry" element={
            <RequireRole permission="add_entries" route="/add-entry">
              <AddEntry />
            </RequireRole>
          } />
          <Route path="/manualentry" element={
            <RequireRole permission="add_entries" route="/manualentry">
              <ManualEntryPage />
            </RequireRole>
          } />
          <Route path="/entry-detail" element={<EntryDetail />} />
          <Route path="/voice" element={
            <RequireRole permission="add_entries" route="/voice">
              <VoiceAssistant />
            </RequireRole>
          } />
          <Route path="/transaction" element={<TransactionLog />} />
          <Route path="/projects"    element={<Projects />} />
          <Route path="/newproject"  element={
            <RequireRole permission="create_project">
              <NewProject />
            </RequireRole>
          } />
          <Route path="/inventory"   element={<InventoryPage />} />

          <Route path="/reports"     element={
            <RequireRole permission="view_reports" route="/reports">
              <Reports />
            </RequireRole>
          } />

          <Route path="/settings"    element={<Settings />} />
          <Route path="/managesite"  element={<ManageSite />} />

          <Route path="/approvals"  element={
            <RequireRole permission="approve_payments" route="/approvals">
              <Approvals />
            </RequireRole>
          } />

          <Route path="/admin"      element={
            <RequireRole route="/admin">
              <AdminOverview />
            </RequireRole>
          } />

          <Route path="/ai-chat"    element={<AiChatReport />} />

          <Route path="/assign-role" element={
            <RequireRole permission="assign_roles">
              <AssignRoles />
            </RequireRole>
          } />

          <Route path="/assign-task" element={
            <RequireRole>
              <AssignTask />
            </RequireRole>
          } />

          <Route path="/notifications" element={<Notifications />} />

          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/audit-logs"   element={
            <RequireRole route="/audit-logs">
              <AuditLogsPage />
            </RequireRole>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
