import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import BtButton from './BtButton';

/**
 * ConfirmDialog — centred Blueprint Noir confirm.
 * Props: open, title?, message, danger?, confirmLabel?, cancelLabel?, loading?, onConfirm, onCancel
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  danger,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const Icon = danger ? AlertTriangle : HelpCircle;

  return createPortal(
    <div
      onClick={loading ? undefined : onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        background: 'var(--scrim)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 160ms ease',
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bt-confirm-title"
        aria-describedby="bt-confirm-message"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-card)',
          boxShadow: 'var(--shadow-raised)',
          width: '100%',
          maxWidth: 420,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'fadeUp 260ms var(--ease)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--r-tile)',
            background: danger ? 'var(--status-danger-soft)' : 'var(--accent-soft)',
            color: danger ? 'var(--status-danger)' : 'var(--accent-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} strokeWidth={2} />
        </div>

        <div>
          <div
            id="bt-confirm-title"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
              lineHeight: 1.3,
            }}
          >
            {title || message}
          </div>
          {title && message && (
            <div
              id="bt-confirm-message"
              style={{ marginTop: 6, fontFamily: 'var(--font-ui)', fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink-2)' }}
            >
              {message}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 4 }}>
          <BtButton variant="secondary" size="small" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </BtButton>
          <BtButton
            ref={confirmRef}
            variant={danger ? 'destructive' : 'primary'}
            size="small"
            onClick={onConfirm}
            loading={loading}
            style={danger ? { background: 'var(--status-danger)', color: '#FFFFFF' } : undefined}
          >
            {confirmLabel || 'Confirm'}
          </BtButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
