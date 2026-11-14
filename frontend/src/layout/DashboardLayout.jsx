import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AppTour from "../components/AppTour";
import { Bell, Settings, Menu } from "lucide-react";
import nurofinLogo from "../assets/nurofin-black.svg";
import useNotificationStore from "../stores/notificationStore";
import ErrorBoundary from "../components/ErrorBoundary";
import BtIconButton from "../components/ui/BtIconButton";
import { navItems, adminNavItems } from "../navItems";

export default function DashboardLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const fetchAll = useNotificationStore((s) => s.fetchAll);
  const totalAlertCount = useNotificationStore((s) =>
    s.systemNotifications ? s.systemNotifications.filter((n) => !n.read).length : 0
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll, location.pathname]);

  // Close the mobile drawer after navigating, and on Escape
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = () => setSidebarOpen(false);
    window.addEventListener("bt-close-drawer", close);
    return () => window.removeEventListener("bt-close-drawer", close);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // Sub-pages that belong to a menu section
  const SECTION_ALIASES = {
    "/managesite": "/projects",
    "/newproject": "/projects",
    "/project-report": "/projects",
    "/project-insights": "/projects",
    "/insights": "/projects",
    "/update-progress": "/projects",
    "/add-entry": "/transaction",
    "/choose-entry-mode": "/transaction",
    "/manualentry": "/transaction",
    "/entry-detail": "/transaction",
    "/profile": "/settings",
  };
  const aliasKey = Object.keys(SECTION_ALIASES).find((p) => location.pathname.startsWith(p));
  const sectionPath = aliasKey ? SECTION_ALIASES[aliasKey] : location.pathname;
  const section = [...navItems, ...adminNavItems].find((item) =>
    item.path === "/" ? sectionPath === "/" : sectionPath.startsWith(item.path)
  );

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--noir)",
      }}
    >
      <AppTour />

      {/* ── Mobile Sidebar Backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--scrim)",
            zIndex: 40,
            backdropFilter: "blur(4px)",
            animation: "fadeIn 150ms ease",
          }}
        />
      )}

      {/* ── Mobile Sidebar (Drawer) ── */}
      {isMobile ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: "min(280px, 85vw)",
            zIndex: 50,
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: sidebarOpen ? "var(--shadow-raised)" : "none",
          }}
        >
          <Sidebar isMobileDrawer onClose={() => setSidebarOpen(false)} />
        </div>
      ) : (
        <Sidebar />
      )}

      {/* ── Main Viewport ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          width: "100%",
          maxWidth: "100vw",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ── Top Header Bar (Blueprint Noir Surface) ── */}
        <header
          style={{
            height: "56px",
            minHeight: "56px",
            background: "var(--noir)",
            borderBottom: "1px solid var(--noir-line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "0 clamp(10px, 3vw, 16px)" : "0 28px",
            zIndex: 30,
            flexShrink: 0,
            boxSizing: "border-box",
            width: "100%",
            gap: "8px",
          }}
        >
          {isMobile ? (
            <span className="tour-menu" style={{ display: "inline-flex", flexShrink: 0 }}>
              <BtIconButton
                icon={Menu}
                label="Open menu"
                onDark
                size={38}
                onClick={() => setSidebarOpen(true)}
                aria-expanded={sidebarOpen}
              />
            </span>
          ) : (
            <span className="bt-eyebrow" style={{ color: "var(--on-noir-3)", whiteSpace: "nowrap" }}>
              {section ? section.label : "BuildTrack"}
            </span>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "clamp(6px, 1.5vw, 10px)", minWidth: 0 }}>
            {/* ── Brand Badge ── */}
            <button
              type="button"
              aria-label="BuildTrack home"
              onClick={() => navigate("/")}
              className="bt-header-brand-btn"
              style={{
                height: "38px",
                padding: "0 clamp(8px, 2vw, 14px)",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                display: "flex",
                alignItems: "center",
                gap: "clamp(4px, 1.5vw, 10px)",
                cursor: "pointer",
                userSelect: "none",
                transition: "background 140ms ease",
                flexShrink: 1,
                minWidth: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <img
                  src="/buildtrack-logo.png"
                  alt="BuildTrack"
                  style={{ width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0 }}
                />
                <span
                  className="bt-header-brand-text"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--bone)",
                    letterSpacing: "-0.3px",
                    whiteSpace: "nowrap",
                  }}
                >
                  BuildTrack
                </span>
              </div>

              <div className="bt-header-brand-divider" style={{ width: "1px", height: "14px", background: "rgba(255, 255, 255, 0.16)", flexShrink: 0 }} />

              <div className="bt-header-brand-by" style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                <span style={{ fontSize: "11px", color: "var(--on-noir-3, rgba(246, 244, 239, 0.5))", fontFamily: "var(--font-ui)", whiteSpace: "nowrap" }}>
                  by
                </span>
                <img
                  src={nurofinLogo}
                  alt="Nurofin"
                  style={{ height: "13px", filter: "brightness(0) invert(1)", flexShrink: 0 }}
                />
              </div>
            </button>

            {/* ── Notifications Bell ── */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <BtIconButton
                icon={Bell}
                label={totalAlertCount > 0 ? `Notifications, ${totalAlertCount} unread` : "Notifications"}
                onDark
                size={38}
                active={location.pathname.startsWith("/notifications")}
                onClick={() => navigate("/notifications")}
              />
              {totalAlertCount > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    minWidth: "18px",
                    height: "18px",
                    borderRadius: "9px",
                    background: "var(--status-danger-bright)",
                    color: "#FFFFFF",
                    fontSize: "10px",
                    fontWeight: 700,
                    fontFamily: "var(--font-ui)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    border: "2px solid var(--noir)",
                    pointerEvents: "none",
                  }}
                >
                  {totalAlertCount > 99 ? "99+" : totalAlertCount}
                </span>
              )}
            </div>

            <BtIconButton
              icon={Settings}
              label="Settings"
              onDark
              size={38}
              active={location.pathname.startsWith("/settings")}
              onClick={() => navigate("/settings")}
            />
          </div>
        </header>

        {/* ── Content Viewport ── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            background: "var(--ground)",
          }}
        >
          <ErrorBoundary inline fallbackMessage="An unexpected issue occurred while rendering this section. You can refresh or switch tabs.">
            <div key={location.pathname} className="bt-route" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
