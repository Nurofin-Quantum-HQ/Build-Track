import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AppTour from "../components/AppTour";
import { Bell, Settings } from "lucide-react";
import { colors, typography } from "../styles/designTokens";
import nurofinLogo from "../assets/nurofin-black.svg";

export default function DashboardLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: colors.bg }}>
      <AppTour />
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(17, 24, 39, 0.4)", zIndex: 40,
            backdropFilter: "blur(4px)",
            animation: "fadeIn 150ms ease",
          }}
        />
      )}

      {isMobile ? (
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <Sidebar />
        </div>
      ) : (
        <Sidebar />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <header
          style={{
            height: 46,
            marginTop: 16,
            marginRight: 24,
            marginLeft: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            zIndex: 20,
            background: "transparent",
            border: "none",
          }}
        >
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="premium-topbar-btn"
              aria-label="Open Sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }} className="header-right-group">
            <div
              onClick={() => navigate("/")}
              className="header-brand-card"
              title="BuildTrack - Powered by Nurofin"
            >
              <div className="header-brand-primary">
                <img
                  src="/buildtrack-logo.png"
                  alt="BuildTrack"
                  className="header-brand-logo"
                />
                <span className="header-brand-name">
                  BuildTrack
                </span>
              </div>

              <div className="header-brand-divider" />

              <div className="header-powered-by">
                <span className="header-powered-text">
                  Powered by
                </span>
                <img
                  src={nurofinLogo}
                  alt="Nurofin"
                  className="header-nurofin-svg"
                />
              </div>
            </div>

            <button
              onClick={() => navigate("/notifications")}
              className="premium-topbar-btn"
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="premium-topbar-btn"
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
