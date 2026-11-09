import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import BtConfirmDialog from "./ui/ConfirmDialog";

const TONES = {
  success: { icon: CheckCircle2, iconColor: "var(--status-success-bright)" },
  error: { icon: AlertCircle, iconColor: "var(--status-danger-bright)" },
  info: { icon: Info, iconColor: "var(--accent)" },
};

export function Toast({ message, type = "info", onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  const tone = TONES[type] || TONES.info;
  const Icon = tone.icon;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px 12px 16px",
        borderRadius: "var(--r-input)",
        background: "var(--noir)",
        color: "var(--on-noir)",
        border: "1px solid var(--noir-line)",
        boxShadow: "var(--shadow-raised)",
        fontFamily: "var(--font-ui)",
        fontSize: 14,
        fontWeight: 500,
        maxWidth: "min(460px, calc(100vw - 32px))",
        animation: "btToastIn 260ms var(--ease)",
      }}
    >
      <Icon size={18} color={tone.iconColor} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onClose?.()}
        className="bt-icon-btn on-dark"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--on-noir-3)",
          flexShrink: 0,
        }}
      >
        <X size={15} />
      </button>
      <style>{`
        @keyframes btToastIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}

export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
  return (
    <BtConfirmDialog
      open={!!message}
      message={message}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      danger={danger}
    />
  );
}
