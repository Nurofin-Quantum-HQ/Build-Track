import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AppTour from "../components/AppTour";
import { Bell, Settings, Menu } from "lucide-react";
import nurofinLogo from "../assets/nurofin-black.svg";
import useNotificationStore from "../stores/notificationStore";
import ErrorBoundary from "../components/ErrorBoundary";

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
        background: "var(--ground)",
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

      {/* ── Sidebar (Fixed Desktop or Drawer Mobile) ── */}
      {isMobile ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 50,
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <Sidebar />
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
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ── Top Header Bar (Blueprint Noir Surface) ── */}
        <header
          style={{
            height: "56px",
            minHeight: "56px",
            background: "var(--noir, #0C0E12)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "0 16px" : "0 28px",
            zIndex: 30,
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          {isMobile ? (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Sidebar"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--bone, #F6F4EF)",
              }}
            >
              <Menu size={20} />
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }} />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* ── Brand Badge ── */}
            <div
              onClick={() => navigate("/")}
              style={{
                height: "38px",
                padding: "0 14px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                userSelect: "none",
                transition: "background 140ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <img
                  src="/buildtrack-logo.png"
                  alt="BuildTrack"
                  style={{ width: "20px", height: "20px", borderRadius: "5px" }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--bone, #F6F4EF)",
                    letterSpacing: "-0.3px",
                  }}
                >
                  BuildTrack
                </span>
              </div>

              <div style={{ width: "1px", height: "14px", background: "rgba(255, 255, 255, 0.16)" }} />

              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "11px", color: "var(--on-noir-3, rgba(246, 244, 239, 0.5))", fontFamily: "var(--font-ui)" }}>
                  by
                </span>
                <img
                  src={nurofinLogo}
                  alt="Nurofin"
                  style={{ height: "13px", filter: "brightness(0) invert(1)" }}
                />
              </div>
            </div>

            {/* ── Notifications Bell ── */}
            <button
              onClick={() => navigate("/notifications")}
              aria-label="Notifications"
              style={{
                position: "relative",
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--bone, #F6F4EF)",
                cursor: "pointer",
                transition: "background 140ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
            >
              <Bell size={18} strokeWidth={1.8} />
              {totalAlertCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-3px",
                    right: "-3px",
                    minWidth: "16px",
                    height: "16px",
                    borderRadius: "8px",
                    background: "var(--status-danger-bright, #EF4444)",
                    color: "#FFFFFF",
                    fontSize: "10px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                    border: "2px solid var(--noir, #0C0E12)",
                    pointerEvents: "none",
                  }}
                >
                  {totalAlertCount > 99 ? "99+" : totalAlertCount}
                </span>
              )}
            </button>

            {/* ── Settings Shortcut ── */}
            <button
              onClick={() => navigate("/settings")}
              aria-label="Settings"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--bone, #F6F4EF)",
                cursor: "pointer",
                transition: "background 140ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
            >
              <Settings size={18} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        {/* ── Content Viewport ── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ErrorBoundary inline fallbackMessage="An unexpected issue occurred while rendering this section. You can refresh or switch tabs.">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
