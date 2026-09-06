import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { navItems, adminNavItems } from "../navItems";
import { resolveImageUrl } from "../utils/imageUrl";
import { LogOut, HelpCircle } from "lucide-react";
import { colors, gradients, radius, typography } from "../styles/designTokens";
import { useAuth } from "../contexts/AuthContext";
import { preloadRoute } from "../App";
import perfLogger from "../utils/performanceLogger";

const linkStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderRadius: "12px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 500,
  marginBottom: 4,
};

export default function Sidebar() {
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState(authUser);

  useEffect(() => {
    setUser(authUser);
  }, [authUser]);

  useEffect(() => {
    const syncUser = () => {
      try {
        const stored = localStorage.getItem("bt_user");
        if (stored) setUser(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener("userUpdated", syncUser);
    return () => window.removeEventListener("userUpdated", syncUser);
  }, []);

  const photoUrl = user?.profilePhoto ? resolveImageUrl(user.profilePhoto) : null;
  const isAdminOrSupervisor = user?.role === "admin" || user?.role === "supervisor";

  const handleLogout = () => {
    if (logout) logout();
    else {
      localStorage.removeItem("bt_token");
      localStorage.removeItem("bt_user");
      window.location.assign("/login");
    }
  };

  return (
    <aside
      style={{
        width: 250,
        minWidth: 250,
        background: "rgba(255, 255, 255, 0.45)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.45)",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 32px)",
        position: "sticky",
        top: 16,
        margin: "16px 0 16px 16px",
        zIndex: 30,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 20px 20px" }}>
        <img
          src="/buildtrack-logo.png"
          alt="BuildTrack"
          style={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 19, fontWeight: 800, color: colors.textPrimary, letterSpacing: "-0.03em", fontFamily: typography.fontFamily }}>
          BuildTrack
        </span>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, letterSpacing: "0.08em", padding: "12px 8px 6px", textTransform: "uppercase" }}>
          Main
        </div>
        {navItems.map((item) => {
          const tourClassMap = {
            'Dashboard': 'tour-dashboard',
            'Projects': 'tour-create-project',
            'Add Entry': 'tour-add-entry',
            'Voice': 'tour-voice',
            'Log': 'tour-log',
            'Inventory': 'tour-inventory',
            'Reports': 'tour-reports',
            'Subscription': 'tour-subscription',
            'Settings': 'tour-settings'
          };
          return (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.path === "/"}
            className={`sidebar-link ${tourClassMap[item.label] || ''}`}
            onMouseEnter={() => preloadRoute(item.path)}
            onPointerDown={() => preloadRoute(item.path)}
            onClick={() => perfLogger.startRoute(item.path)}
            style={({ isActive }) => ({
              ...linkStyle,
              color: isActive ? "#FFFFFF" : colors.textSecondary,
              background: isActive ? gradients.primaryGradient : "transparent",
              boxShadow: isActive ? "0 8px 16px -4px rgba(249, 115, 22, 0.4)" : "none",
              fontWeight: isActive ? 600 : 500,
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} color={isActive ? "#FFFFFF" : colors.textSecondary} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        )})}

        {isAdminOrSupervisor && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, letterSpacing: "0.08em", padding: "20px 8px 6px", textTransform: "uppercase" }}>
              Admin
            </div>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={`sidebar-link ${item.label === 'Subscription & Billing' ? 'tour-subscription' : ''}`}
                onMouseEnter={() => preloadRoute(item.path)}
                onPointerDown={() => preloadRoute(item.path)}
                onClick={() => perfLogger.startRoute(item.path)}
                style={({ isActive }) => ({
                  ...linkStyle,
                  color: isActive ? "#FFFFFF" : colors.textSecondary,
                  background: isActive ? gradients.primaryGradient : "transparent",
                  boxShadow: isActive ? "0 8px 16px -4px rgba(249, 115, 22, 0.4)" : "none",
                  fontWeight: isActive ? 600 : 500,
                })}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} color={isActive ? "#FFFFFF" : colors.textSecondary} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div style={{ borderTop: `1px solid ${colors.border}`, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#F1F5F9",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: colors.textSecondary,
              flexShrink: 0,
              border: `2px solid ${colors.border}`,
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "U"
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name || "User"}
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary, textTransform: "capitalize" }}>
              {user?.role || "Admin"}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-signout-btn"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "10px",
            fontSize: 13,
            fontWeight: 600,
            color: colors.textSecondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            border: `1px solid ${colors.border}`,
            background: "transparent",
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event('replay-app-tour'))}
          className="sidebar-help-btn"
          style={{
            width: "100%",
            padding: "10px 12px",
            marginTop: 8,
            borderRadius: "10px",
            fontSize: 13,
            fontWeight: 600,
            color: colors.textSecondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            border: `1px solid ${colors.border}`,
            background: "transparent",
          }}
        >
          <HelpCircle size={14} />
          App Tour
        </button>
      </div>
    </aside>
  );
}
