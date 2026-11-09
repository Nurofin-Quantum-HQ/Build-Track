import { Navigate, useNavigate } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";
import BtButton from "./ui/BtButton";
import { useAuth } from "../contexts/AuthContext";
import BtBrickLoader from "./ui/BtBrickLoader";
import { canAccessRoute } from "../utils/access";

export default function RequireRole({ permission, route, children }) {
  const { user, loading, isAuthenticated, can } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <BtBrickLoader label="Checking access…" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const AccessDenied = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, minHeight: 420, padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--r-card)",
            background: "var(--noir)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          <Lock size={26} strokeWidth={2} />
        </div>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          You don't have access to this page
        </h2>
        <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 15, lineHeight: 1.5, color: "var(--ink-2)" }}>
          Ask your workspace admin to turn on the right permission for you in Assign Roles.
        </p>
        <BtButton variant="primary" size="small" icon={ArrowLeft} onClick={() => navigate("/")} style={{ marginTop: 6 }}>
          Back to dashboard
        </BtButton>
      </div>
    </div>
  );

  if (permission && !can(permission)) {
    return <AccessDenied />;
  }

  if (route && !canAccessRoute(user, route)) {
    return <AccessDenied />;
  }

  return children;
}
