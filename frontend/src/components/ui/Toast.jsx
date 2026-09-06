import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { colors, radius, shadows, typography } from '../../styles/designTokens';

const iconMap = {
  success: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

const colorMap = {
  success: { bg: colors.successLight, icon: colors.success, border: '#BBF7D0' },
  error: { bg: colors.dangerLight, icon: colors.danger, border: '#FECACA' },
  warning: { bg: colors.warningLight, icon: colors.warning, border: '#FDE68A' },
  info: { bg: colors.primaryLight, icon: colors.primary, border: '#FDE8D8' },
};

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const c = colorMap[type] || colorMap.info;

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 18px',
        background: colors.card,
        border: `1px solid ${c.border}`,
        borderRadius: radius.lg,
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03)',
        animation: 'slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: 400,
      }}
    >
      <div
        style={{
          width: 28, height: 28, borderRadius: radius.full,
          background: c.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: c.icon, flexShrink: 0,
        }}
      >
        {iconMap[type] || <Info size={16} />}
      </div>
      <div style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 600, flex: 1, fontFamily: typography.fontFamily }}>{message}</div>
      <button
        onClick={onClose}
        style={{
          width: 24, height: 24, borderRadius: radius.md,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: colors.textSecondary, cursor: 'pointer', flexShrink: 0,
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.subtle;
          e.currentTarget.style.color = colors.textPrimary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = colors.textSecondary;
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
