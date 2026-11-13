import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { navItems, adminNavItems } from "../navItems";
import BtIconButton from "./ui/BtIconButton";
import { canAccessRoute, canAddEntries, canApprove } from "../utils/access";
import { resolveImageUrl } from "../utils/imageUrl";
import { LogOut, HelpCircle, Plus, Download, LifeBuoy } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { preloadRoute } from "../App";
import perfLogger from "../utils/performanceLogger";
import useNotificationStore from "../stores/notificationStore";
import { approvalAPI } from "../api";
import { openReportProblem } from "./ReportProblem/openReportProblem";

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
  const showApprovals = canApprove(user);
  const visibleAdminItems = adminNavItems.filter((item) => canAccessRoute(user, item.path));

  useEffect(() => {
    if (!showApprovals) return;

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
  }, [showApprovals, location.pathname]);

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
      className="bt-float-nav"
      style={{
        width: 252,
        minWidth: 252,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 24px)",
        position: "sticky",
        top: 12,
        margin: 12,
        borderRadius: "var(--r-sheet)",
        zIndex: 30,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* ── Brand Header ── */}
      <div
        role="link"
        tabIndex={0}
        aria-label="Go to dashboard"
        onClick={() => navigate("/")}
        onKeyDown={(e) => e.key === "Enter" && navigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "18px 18px 12px",
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
              background: "var(--noir-3)",
              border: "1px solid var(--noir-line)",
            }}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              background: "var(--bone)",
              color: "var(--ink)",
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
              color: "var(--on-noir)",
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
              color: "var(--on-noir-3)",
              fontFamily: "var(--font-ui)",
              lineHeight: 1.1,
            }}
          >
            Powered by Nurofin
          </div>
        </div>
      </div>

      {/* ── Prominent '+ New entry' Ink Button (Section 5) ── */}
      {canAddEntries(user) && (
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
            background: "var(--accent)",
            color: "var(--on-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-ui)",
            cursor: "pointer",
            border: "none",
            boxShadow: "none",
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
      )}

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
            color: "var(--on-noir-3)",
            letterSpacing: "0.09em",
            padding: "8px 10px 4px",
            textTransform: "uppercase",
          }}
        >
          Main
        </div>

        {navItems
          .filter((item) => canAccessRoute(user, item.path))
          .map((item) => {
            const active = isRouteActive(item.path);
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === "/"}
                className={`bt-nav-item${item.tour ? ` ${item.tour}` : ""}`}
                onPointerDown={() => preloadRoute(item.path)}
                onClick={() => perfLogger.startRoute(item.path)}
                onMouseEnter={(e) => {
                  preloadRoute(item.path);
                  if (!active) e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  fontFamily: "var(--font-ui)",
                  color: active ? "var(--ink)" : "var(--on-noir-2)",
                  background: active ? "var(--bone)" : "transparent",
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
                      background: active ? "var(--status-danger)" : "var(--status-danger)",
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

        {visibleAdminItems.length > 0 && (
          <>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color: "var(--on-noir-3)",
                letterSpacing: "0.09em",
                padding: "18px 10px 4px",
                textTransform: "uppercase",
              }}
            >
              Admin & Team
            </div>

            {visibleAdminItems.map((item) => {
              const active = isRouteActive(item.path);
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={`bt-nav-item${item.tour ? ` ${item.tour}` : ""}`}
                onPointerDown={() => preloadRoute(item.path)}
                  onClick={() => perfLogger.startRoute(item.path)}
                  onMouseEnter={(e) => {
                    preloadRoute(item.path);
                    if (!active) e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: active ? 600 : 400,
                    fontFamily: "var(--font-ui)",
                    color: active ? "var(--ink)" : "var(--on-noir-2)",
                    background: active ? "var(--bone)" : "transparent",
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
                        background: "var(--status-warning-bright)",
                        color: "var(--noir)",
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
          borderTop: "1px solid var(--noir-line)",
          padding: "12px 12px 12px 14px",
          background: "transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 34,
              height: 34,
              marginRight: 4,
              borderRadius: "50%",
              background: "var(--noir-3)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--on-noir-2)",
              flexShrink: 0,
              border: "1px solid var(--noir-line)",
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
              title={user?.name || "User"}
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--on-noir)",
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
                color: "var(--on-noir-3)",
                textTransform: "capitalize",
                fontFamily: "var(--font-ui)",
              }}
            >
              {user?.role || "Member"}
            </div>
          </div>

          <span className="tour-replay" style={{ display: "inline-flex" }}>
            <BtIconButton
              icon={HelpCircle}
              label="Replay app tour"
              size={30}
              onDark
              onClick={() => window.dispatchEvent(new Event("replay-app-tour"))}
            />
          </span>
          <BtIconButton
            icon={Download}
            label="Get the mobile app"
            size={30}
            onDark
            onClick={() =>
              window.open(
                "https://github.com/Nurofin-Quantum-HQ/Build-Track-App/releases/latest/download/app-release.apk",
                "_blank",
                "noopener"
              )
            }
          />
          <BtIconButton
            icon={LogOut}
            label="Sign out"
            size={30}
            onDark
            onClick={handleLogout}
            style={{ color: "var(--status-danger-bright)" }}
          />
        </div>

        {/* Quiet help link: not a call to go looking for faults */}
        <button
          type="button"
          className="bt-report-link"
          onClick={() => {
            const drawer = window.innerWidth < 1024;
            if (drawer) window.dispatchEvent(new Event("bt-close-drawer"));
            openReportProblem({ settleMs: drawer ? 300 : 0 });
          }}
        >
          <LifeBuoy size={14} strokeWidth={1.8} />
          <span>Report a problem</span>
        </button>
      </div>
    </aside>
  );
}
