import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import BtIconButton from './BtIconButton';

export default function Modal({ open, onClose, title, children, width = 480 }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
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
          borderRadius: isMobile ? '24px 24px 0 0' : 'var(--r-card)',
          boxShadow: 'var(--shadow-raised)',
          width: '100%',
          maxWidth: isMobile ? '100%' : width,
          maxHeight: isMobile ? '90dvh' : '85vh',
          display: 'flex',
          flexDirection: 'column',
          animation: isMobile ? 'slideUp 260ms var(--ease)' : 'fadeUp 260ms var(--ease)',
          boxSizing: 'border-box',
        }}
      >
        {isMobile && (
          <div
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              background: 'var(--input-border)',
              margin: '10px auto 4px',
              flexShrink: 0,
            }}
          />
        )}
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: isMobile ? '14px 18px 0 20px' : '20px 20px 0 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 18 : 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              {title}
            </div>
            <BtIconButton icon={X} label="Close" size={34} onClick={onClose} />
          </div>
        )}
        <div style={{ padding: isMobile ? '16px 18px calc(24px + env(safe-area-inset-bottom, 0px)) 18px' : 24, overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
