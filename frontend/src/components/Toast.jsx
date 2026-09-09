import { useEffect } from "react";

const TOAST_STYLES = {
  success: {
    bg: "#dcfce7", border: "#86efac", color: "#166534", icon: "✅",
  },
  error: {
    bg: "#fee2e2", border: "#fca5a5", color: "#991b1b", icon: "⚠️",
  },
  info: {
    bg: "#FFF5F0", border: "#FDE8D8", color: "#EA580C", icon: "ℹ️",
  },
};

export function Toast({ message, type = "info", onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  const s = TOAST_STYLES[type] || TOAST_STYLES.info;

  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 10,
      padding: "14px 22px", borderRadius: 12,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      animation: "toastSlideIn 0.3s ease",
      fontFamily: "'Segoe UI', sans-serif",
      maxWidth: 420,
    }}>
      <span style={{ fontSize: 16 }}>{s.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <span
        onClick={() => onClose?.()}
        style={{ cursor: "pointer", fontSize: 16, opacity: 0.6, marginLeft: 8 }}
      >✕</span>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
  if (!message) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.4)",
      animation: "cdFadeIn 0.15s ease",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "32px 28px 24px",
        maxWidth: 420, width: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        animation: "cdSlideUp 0.25s ease",
        fontFamily: "'Segoe UI', sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: danger ? "#fee2e2" : "#FFF5F0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
          }}>
            {danger ? "⚠️" : "❓"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4 }}>
            {message}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 22px", background: "#fff", color: "#555",
              border: "1px solid #e5e5e5", borderRadius: 10,
              fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 22px",
              background: danger ? "#dc2626" : "#F97316",
              color: "#fff", border: "none", borderRadius: 10,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: danger
                ? "0 4px 14px rgba(220,38,38,0.3)"
                : "0 4px 14px rgba(249,115,22,0.3)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes cdFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cdSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
