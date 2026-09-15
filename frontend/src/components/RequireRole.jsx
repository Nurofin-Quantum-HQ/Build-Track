import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RequireRole({ permission, route, children }) {
  const { user, loading, isAuthenticated, can } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#888" }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const AccessDenied = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, padding: 24, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 32, background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Access Restricted</h2>
      <p style={{ margin: 0, color: '#6B7280', maxWidth: 400, fontSize: 15 }}>
        You do not have permission to view this page. If you believe this is a mistake, please contact your administrator.
      </p>
    </div>
  );

  if (permission && !can(permission)) {
    return <AccessDenied />;
  }

  if (!permission && route) {
    const r = user?.role?.toLowerCase();
    const isAdminOrSupervisor = r === "admin" || r === "supervisor";
    if (!isAdminOrSupervisor) {
      return <AccessDenied />;
    }
  }

  return children;
}
