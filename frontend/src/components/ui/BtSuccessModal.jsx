import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, Wallet, PackageCheck } from 'lucide-react';

/**
 * BtSuccessModal: Full-screen celebration modal matching Flutter's showBtSuccess.
 */
export function BtSuccessModal({
  kind = 'check', // 'bags' | 'money' | 'check'
  title,
  message,
  label,
  doneLabel = 'Done',
  autoCloseMs = 2600,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      handleClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 240);
  };

  const renderIcon = () => {
    if (kind === 'bags') {
      return (
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'var(--type-material-soft)',
            color: 'var(--type-material)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: mounted ? 'scale(1)' : 'scale(0.7)',
            transition: 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <PackageCheck size={44} strokeWidth={1.8} />
        </div>
      );
    }

    if (kind === 'money') {
      return (
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'var(--status-success-soft)',
            color: 'var(--status-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: mounted ? 'scale(1)' : 'scale(0.7)',
            transition: 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Wallet size={44} strokeWidth={1.8} />
        </div>
      );
    }

    // Default 'check'
    return (
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'var(--on-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: mounted ? 'scale(1) rotate(0deg)' : 'scale(0.6) rotate(-20deg)',
          transition: 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <Check size={44} strokeWidth={3} />
      </div>
    );
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--scrim)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 220ms ease',
        cursor: 'pointer',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--noir)',
          color: 'var(--on-noir)',
          borderRadius: 'var(--r-sheet)',
          padding: '36px 32px',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
          boxShadow: 'var(--shadow-raised)',
          border: '1px solid var(--noir-line)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
          transition: 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {label && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--on-noir-3)',
              marginBottom: '16px',
            }}
          >
            {label}
          </span>
        )}

        <div style={{ marginBottom: '20px' }}>{renderIcon()}</div>

        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: 'var(--on-noir)',
            margin: '0 0 8px 0',
          }}
        >
          {title}
        </h3>

        {message && (
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '15px',
              lineHeight: 1.4,
              color: 'var(--on-noir-2)',
              margin: '0 0 24px 0',
            }}
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={handleClose}
          style={{
            width: '100%',
            height: '48px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.12)',
            color: 'var(--on-noir)',
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            border: 'none',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
        >
          {doneLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Programmatic imperative invocation:
 * await showBtSuccess({ kind: 'bags', title: 'Saved!', message: '...' })
 */
export function showBtSuccess({
  kind = 'check',
  title,
  message,
  label,
  doneLabel = 'Done',
  autoCloseMs = 2600,
}) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = createRoot(container);

    const handleCleanup = () => {
      root.unmount();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      resolve();
    };

    root.render(
      <BtSuccessModal
        kind={kind}
        title={title}
        message={message}
        label={label}
        doneLabel={doneLabel}
        autoCloseMs={autoCloseMs}
        onClose={handleCleanup}
      />
    );
  });
}

export default showBtSuccess;
