import { AlertTriangle, HelpCircle } from 'lucide-react';
import { colors, radius, typography } from '../../styles/designTokens';
import Button from './Button';

export default function ConfirmDialog({ open, message, danger, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        background: 'rgba(17, 24, 39, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'fadeIn 200ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.65)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: 400,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          animation: 'fadeUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            width: 44, height: 44, borderRadius: radius.lg,
            background: danger ? colors.dangerLight : colors.primaryLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: danger ? colors.danger : colors.primary,
          }}
        >
          {danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
        </div>
        <div style={{ fontSize: 15, color: colors.textPrimary, fontWeight: 700, lineHeight: 1.5, fontFamily: typography.fontFamily }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <Button variant="ghost" size="md" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="md" onClick={onConfirm}>
            {confirmLabel || 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}
