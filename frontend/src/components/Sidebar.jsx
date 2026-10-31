import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { navItems, adminNavItems } from "../navItems";
import { resolveImageUrl } from "../utils/imageUrl";
import { LogOut, HelpCircle, Plus, Download } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { preloadRoute } from "../App";
import perfLogger from "../utils/performanceLogger";
import useNotificationStore from "../stores/notificationStore";
import { approvalAPI } from "../api";

const FONT_FAMILY_MAP = {
  "Inter": "'Inter', sans-serif",
  "Outfit": "'Outfit', sans-serif",
  "Poppins": "'Poppins', sans-serif",
  "Montserrat": "'Montserrat', sans-serif",
  "Roboto": "'Roboto', sans-serif",
  "Playfair Display": "'Playfair Display', serif",
  "Cinzel": "'Cinzel', serif",
  "Caveat": "'Caveat', cursive",
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState(authUser);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const totalAlertCount = useNotificationStore((state) =>
    state.systemNotifications ? state.systemNotifications.filter((n) => !n.read).length : 0
  );

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

  // Fetch pending approvals count for supervisors/admins
  const r = (user?.role || "").toLowerCase();
  const isAdminOrSupervisor = r === "admin" || r === "supervisor";

  useEffect(() => {
    if (!isAdminOrSupervisor) return;

    let mounted = true;
    const fetchPending = async () => {
      try {
        const res = await approvalAPI.getPending();
        let list = [];
        if (Array.isArray(res?.data)) list = res.data;
        else if (Array.isArray(res?.data?.data)) list = res.data.data;
        else if (Array.isArray(res?.data?.transactions)) list = res.data.transactions;
        if (mounted) setPendingApprovalsCount(list.length);
      } catch {
        // Silently catch error
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAdminOrSupervisor, location.pathname]);

  const photoUrl = user?.profilePhoto ? resolveImageUrl(user.profilePhoto) : null;

  const handleLogout = () => {
    if (logout) logout();
    else {
      localStorage.removeItem("bt_token");
      localStorage.removeItem("bt_user");
      window.location.assign("/login");
    }
  };

  const isRouteActive = (itemPath) => {
    if (itemPath === "/") return location.pathname === "/";
    if (itemPath === "/projects") {
      return (
        location.pathname.startsWith("/projects") ||
        location.pathname === "/managesite" ||
        location.pathname === "/newproject" ||
        location.pathname.startsWith("/project-detail") ||
        location.pathname.startsWith("/project-report") ||
        location.pathname.startsWith("/project-insights")
      );
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-card)",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 32px)",
        position: "sticky",
        top: 16,
        margin: "16px 0 16px 16px",
        zIndex: 30,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* ── Brand Header ── */}
      <div
        onClick={() => navigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "20px 18px 14px",
          minWidth: 0,
          cursor: "pointer",
        }}
      >
        {user?.companyLogo ? (
          <img
            src={resolveImageUrl(user.companyLogo)}
            alt={user?.companyName || "Logo"}
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              objectFit: "contain",
              flexShrink: 0,
              background: "var(--fill)",
              border: "1px solid var(--line)",
            }}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              background: "var(--ink)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            B
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.5px",
              fontFamily: FONT_FAMILY_MAP[user?.companyFontStyle] || "var(--font-display)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={user?.companyName || "BuildTrack"}
          >
            {user?.companyName || "BuildTrack"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              fontFamily: "var(--font-ui)",
              lineHeight: 1.1,
            }}
          >
            Powered by Nurofin
          </div>
        </div>
      </div>

      {/* ── Prominent '+ New entry' Ink Button (Section 5) ── */}
      <div style={{ padding: "0 14px 14px" }}>
        <button
          type="button"
          onClick={() => {
            preloadRoute("/add-entry");
            navigate("/add-entry");
          }}
          className="tour-add-entry"
          style={{
            width: "100%",
            height: "46px",
            borderRadius: "14px",
            background: "var(--ink)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-ui)",
            cursor: "pointer",
            border: "none",
            boxShadow: "0 2px 6px rgba(12, 14, 18, 0.15)",
            transition: "transform 90ms ease, opacity 150ms ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>New entry</span>
        </button>
      </div>

      {/* ── Navigation Items ── */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            color: "var(--ink-3)",
            letterSpacing: "0.09em",
            padding: "8px 10px 4px",
            textTransform: "uppercase",
          }}
        >
          Main
        </div>

        {navItems
          .filter((item) => {
            if (item.label === "Dashboard") return true;
            if (item.label === "Projects")
              return (
                isAdminOrSupervisor ||
                user?.permissions?.includes("create_project") ||
                user?.permissions?.includes("view_assigned_project") ||
                user?.permissions?.includes("view_projects")
              );
            if (item.label === "Voice")
              return isAdminOrSupervisor || user?.permissions?.includes("add_entries");
            if (item.label === "Log") return true;
            if (item.label === "Assign Task")
              return isAdminOrSupervisor || user?.permissions?.includes("assign_tasks");
            if (item.label === "Notifications") return true;
            if (item.label === "Reports")
              return isAdminOrSupervisor || user?.permissions?.includes("view_reports");
            return true;
          })
          .map((item) => {
            const active = isRouteActive(item.path);
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === "/"}
                onPointerDown={() => preloadRoute(item.path)}
                onClick={() => perfLogger.startRoute(item.path)}
                onMouseEnter={(e) => {
                  preloadRoute(item.path);
                  if (!active) e.currentTarget.style.background = "var(--fill)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  fontFamily: "var(--font-ui)",
                  color: active ? "#FFFFFF" : "var(--ink-2)",
                  background: active ? "var(--ink)" : "transparent",
                  transition: "background 140ms ease, color 140ms ease",
                  userSelect: "none",
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.75} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label}
                </span>

                {item.label === "Notifications" && totalAlertCount > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: active ? "rgba(255, 255, 255, 0.25)" : "var(--status-danger)",
                      color: "#FFFFFF",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "10px",
                      minWidth: "16px",
                      textAlign: "center",
                    }}
                  >
                    {totalAlertCount > 99 ? "99+" : totalAlertCount}
                  </span>
                )}
              </NavLink>
            );
          })}

        {isAdminOrSupervisor && (
          <>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color: "var(--ink-3)",
                letterSpacing: "0.09em",
                padding: "18px 10px 4px",
                textTransform: "uppercase",
              }}
            >
              Admin & Team
            </div>

            {adminNavItems.map((item) => {
              const active = isRouteActive(item.path);
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onPointerDown={() => preloadRoute(item.path)}
                  onClick={() => perfLogger.startRoute(item.path)}
                  onMouseEnter={(e) => {
                    preloadRoute(item.path);
                    if (!active) e.currentTarget.style.background = "var(--fill)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 12px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: active ? 600 : 400,
                    fontFamily: "var(--font-ui)",
                    color: active ? "#FFFFFF" : "var(--ink-2)",
                    background: active ? "var(--ink)" : "transparent",
                    transition: "background 140ms ease, color 140ms ease",
                    userSelect: "none",
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.75} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.label}
                  </span>

                  {item.label === "Approvals" && pendingApprovalsCount > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        background: active ? "rgba(255, 255, 255, 0.25)" : "var(--status-warning-bright)",
                        color: active ? "#FFFFFF" : "var(--noir)",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: "10px",
                        textAlign: "center",
                      }}
                    >
                      {pendingApprovalsCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* ── User & Utilities Footer ── */}
      <div
        style={{
          borderTop: "1px solid var(--line)",
          padding: "14px 14px 12px",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--fill)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ink-2)",
              flexShrink: 0,
              border: "1px solid var(--line)",
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "U"
            )}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-ui)",
              }}
            >
              {user?.name || "User"}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--ink-3)",
                textTransform: "capitalize",
                fontFamily: "var(--font-ui)",
              }}
            >
              {user?.role || "Member"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <button
            onClick={() => window.dispatchEvent(new Event("replay-app-tour"))}
            style={{
              height: "32px",
              padding: "0 8px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--ink-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              cursor: "pointer",
              border: "1px solid var(--line)",
              background: "var(--fill)",
              fontFamily: "var(--font-ui)",
            }}
          >
            <HelpCircle size={13} />
            Tour
          </button>

          <button
            onClick={handleLogout}
            style={{
              height: "32px",
              padding: "0 8px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--status-danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              cursor: "pointer",
              border: "1px solid rgba(190, 42, 48, 0.15)",
              background: "var(--status-danger-soft)",
              fontFamily: "var(--font-ui)",
            }}
          >
            <LogOut size={13} />
            Exit
          </button>
        </div>

        <button
          onClick={() =>
            window.open(
              "https://github.com/Nurofin-Quantum-HQ/Build-Track-App/releases/latest/download/app-release.apk",
              "_blank"
            )
          }
          style={{
            height: "32px",
            padding: "0 8px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--ink-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
            border: "1px solid var(--line)",
            background: "transparent",
            fontFamily: "var(--font-ui)",
          }}
        >
          <Download size={13} />
          Get Mobile App
        </button>
      </div>
    </aside>
  );
}
