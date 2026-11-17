import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AppTour from "../components/AppTour";
import HelpAssistantModal from "../components/help/HelpAssistantModal";
import useHelpStore from "../components/help/helpStore";
import {
  Bell,
  Settings,
  HelpCircle,
  Menu,
  LayoutDashboard,
  Building2,
  Plus,
  ClipboardList,
} from "lucide-react";
import nurofinLogo from "../assets/nurofin-black.svg";
import useNotificationStore from "../stores/notificationStore";
import ErrorBoundary from "../components/ErrorBoundary";
import BtIconButton from "../components/ui/BtIconButton";
import SupportAgentIcon from "../components/ui/SupportAgentIcon";
import { navItems, adminNavItems } from "../navItems";
import { preloadRoute } from "../App";

export default function DashboardLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const openHelp = useHelpStore((s) => s.openHelp);
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
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        background: "var(--noir)",
      }}
    >
      <AppTour />
      <HelpAssistantModal />

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
            height: "100dvh",
            maxHeight: "100dvh",
            width: "min(300px, 86vw)",
            zIndex: 50,
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 240ms cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: sidebarOpen ? "0 0 50px rgba(0,0,0,0.75)" : "none",
            display: "flex",
            flexDirection: "column",
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

          <div className="header-right-group" style={{ display: "flex", alignItems: "center", gap: "clamp(6px, 1.5vw, 10px)", minWidth: 0 }}>
            {/* ── Brand Badge ── */}
            <button
              type="button"
              aria-label="BuildTrack home"
              onClick={() => navigate("/")}
              className="bt-header-brand-btn header-brand-card"
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
              <div className="header-brand-primary" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <img
                  src="/buildtrack-logo.png"
                  alt="BuildTrack"
                  className="header-brand-logo"
                  style={{ width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0 }}
                />
                <span
                  className="bt-header-brand-text header-brand-name"
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

              <div className="bt-header-brand-divider header-brand-divider" style={{ width: "1px", height: "14px", background: "rgba(255, 255, 255, 0.16)", flexShrink: 0 }} />

              <div className="bt-header-brand-by header-powered-by" style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                <span className="header-powered-text" style={{ fontSize: "11px", color: "var(--on-noir-3, rgba(246, 244, 239, 0.5))", fontFamily: "var(--font-ui)", whiteSpace: "nowrap" }}>
                  by
                </span>
                <img
                  src={nurofinLogo}
                  alt="Nurofin"
                  className="header-nurofin-svg"
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
              icon={SupportAgentIcon}
              label="Help Assistant Chatbot"
              onDark
              size={38}
              style={{
                borderRadius: "50%",
                color: "var(--accent, #e0a93b)",
                background: "color-mix(in srgb, var(--accent, #e0a93b) 16%, transparent)",
                border: "1px solid color-mix(in srgb, var(--accent, #e0a93b) 32%, transparent)",
                transition: "all 140ms ease",
              }}
              onClick={() => openHelp()}
            />

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
            paddingBottom: isMobile ? "calc(64px + env(safe-area-inset-bottom, 0px))" : 0,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <ErrorBoundary inline fallbackMessage="An unexpected issue occurred while rendering this section. You can refresh or switch tabs.">
            <div key={location.pathname} className="bt-route" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>

        {/* ── Mobile Bottom Navigation Bar ── */}
        {isMobile && (
          <nav
            aria-label="Mobile Navigation"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              height: "calc(58px + env(safe-area-inset-bottom, 0px))",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              background: "rgba(12, 14, 18, 0.94)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              zIndex: 40,
              boxSizing: "border-box",
            }}
          >
            {/* 1. Home */}
            <button
              type="button"
              className="tour-bottom-home"
              onClick={() => {
                preloadRoute("/");
                navigate("/");
              }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                height: "100%",
                color: location.pathname === "/" ? "var(--accent)" : "var(--on-noir-3)",
                transition: "color 120ms ease",
                cursor: "pointer",
              }}
            >
              <LayoutDashboard size={20} strokeWidth={location.pathname === "/" ? 2.3 : 1.8} />
              <span style={{ fontSize: "10.5px", fontWeight: location.pathname === "/" ? 700 : 500, fontFamily: "var(--font-ui)" }}>
                Home
              </span>
            </button>

            {/* 2. Projects */}
            <button
              type="button"
              className="tour-bottom-projects"
              onClick={() => {
                preloadRoute("/projects");
                navigate("/projects");
              }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                height: "100%",
                color:
                  location.pathname.startsWith("/projects") ||
                  location.pathname.startsWith("/managesite") ||
                  location.pathname.startsWith("/newproject")
                    ? "var(--accent)"
                    : "var(--on-noir-3)",
                transition: "color 120ms ease",
                cursor: "pointer",
              }}
            >
              <Building2
                size={20}
                strokeWidth={
                  location.pathname.startsWith("/projects") ||
                  location.pathname.startsWith("/managesite") ||
                  location.pathname.startsWith("/newproject")
                    ? 2.3
                    : 1.8
                }
              />
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight:
                    location.pathname.startsWith("/projects") ||
                    location.pathname.startsWith("/managesite") ||
                    location.pathname.startsWith("/newproject")
                      ? 700
                      : 500,
                  fontFamily: "var(--font-ui)",
                }}
              >
                Projects
              </span>
            </button>

            {/* 3. Center Action Button: Quick Add Entry */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <button
                type="button"
                aria-label="New Entry"
                className="tour-bottom-add"
                onClick={() => {
                  preloadRoute("/add-entry");
                  navigate("/add-entry");
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "14px",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -14,
                  boxShadow: "0 4px 18px rgba(0, 0, 0, 0.45)",
                  cursor: "pointer",
                  transition: "transform 90ms ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <Plus size={22} strokeWidth={2.6} />
              </button>
            </div>

            {/* 4. Ledger */}
            <button
              type="button"
              className="tour-bottom-ledger"
              onClick={() => {
                preloadRoute("/transaction");
                navigate("/transaction");
              }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                height: "100%",
                color:
                  location.pathname.startsWith("/transaction") ||
                  location.pathname.startsWith("/entry-detail")
                    ? "var(--accent)"
                    : "var(--on-noir-3)",
                transition: "color 120ms ease",
                cursor: "pointer",
              }}
            >
              <ClipboardList
                size={20}
                strokeWidth={
                  location.pathname.startsWith("/transaction") ||
                  location.pathname.startsWith("/entry-detail")
                    ? 2.3
                    : 1.8
                }
              />
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight:
                    location.pathname.startsWith("/transaction") ||
                    location.pathname.startsWith("/entry-detail")
                      ? 700
                      : 500,
                  fontFamily: "var(--font-ui)",
                }}
              >
                Ledger
              </span>
            </button>

            {/* 5. More / Menu */}
            <button
              type="button"
              aria-label="Open full menu"
              className="tour-bottom-menu"
              onClick={() => setSidebarOpen(true)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                height: "100%",
                color: sidebarOpen ? "var(--accent)" : "var(--on-noir-3)",
                transition: "color 120ms ease",
                cursor: "pointer",
              }}
            >
              <Menu size={20} strokeWidth={sidebarOpen ? 2.3 : 1.8} />
              <span style={{ fontSize: "10.5px", fontWeight: sidebarOpen ? 700 : 500, fontFamily: "var(--font-ui)" }}>
                Menu
              </span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
