import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import BtIconButton from './BtIconButton';

export default function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
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
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-card)',
          boxShadow: 'var(--shadow-raised)',
          width: '100%',
          maxWidth: width,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeUp 260ms var(--ease)',
        }}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 20px 0 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              {title}
            </div>
            <BtIconButton icon={X} label="Close" size={34} onClick={onClose} />
          </div>
        )}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
