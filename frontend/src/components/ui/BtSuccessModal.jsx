import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { isFullMotion } from '../../utils/motion';

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

  const renderIcon = () => <SuccessScene kind={kind} />;

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
  onDismiss,
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
      if (onDismiss) onDismiss();
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

/* ── Success scenes (parity with the mobile app's bt_success_scenes) ── */

function CheckBadge({ delay = 0, size = 34, x = 86, y = 6 }) {
  return (
    <g className="bt-scene-badge" style={{ animationDelay: `${delay}ms`, transformOrigin: `${x + size / 2}px ${y + size / 2}px` }}>
      <circle cx={x + size / 2} cy={y + size / 2} r={size / 2} fill="var(--status-success-bright)" />
      <path
        d={`M${x + size * 0.28} ${y + size * 0.52} l${size * 0.16} ${size * 0.16} l${size * 0.3} -${size * 0.34}`}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="bt-scene-tick"
        style={{ animationDelay: `${delay + 160}ms` }}
      />
    </g>
  );
}

function Bag({ x, y, delay }) {
  return (
    <g className="bt-scene-drop" style={{ animationDelay: `${delay}ms` }}>
      <rect x={x} y={y} width="44" height="26" rx="7" fill="var(--bone)" />
      <rect x={x} y={y + 9} width="44" height="7" fill="var(--accent)" />
      <rect x={x + 3} y={y + 2} width="38" height="3" rx="1.5" fill="var(--bone-soft)" />
    </g>
  );
}

export function SuccessScene({ kind = 'check' }) {
  const animated = isFullMotion();
  const cls = animated ? 'bt-scene' : 'bt-scene bt-scene-static';

  if (kind === 'bags') {
    return (
      <svg className={cls} width="128" height="104" viewBox="0 0 128 104" role="img" aria-label="Saved">
        <ellipse cx="60" cy="98" rx="46" ry="4" fill="var(--noir-3)" />
        <Bag x={14} y={70} delay={0} />
        <Bag x={60} y={70} delay={140} />
        <Bag x={37} y={42} delay={300} />
        <CheckBadge delay={620} x={88} y={10} />
      </svg>
    );
  }

  if (kind === 'money') {
    return (
      <svg className={cls} width="128" height="104" viewBox="0 0 128 104" role="img" aria-label="Payment recorded">
        <g className="bt-scene-note" style={{ animationDelay: '0ms' }}>
          <rect x="34" y="8" width="50" height="28" rx="4" fill="var(--status-success-bright)" />
          <circle cx="59" cy="22" r="7" fill="none" stroke="var(--noir)" strokeOpacity="0.35" strokeWidth="2" />
        </g>
        <g className="bt-scene-note" style={{ animationDelay: '160ms' }}>
          <rect x="40" y="2" width="50" height="28" rx="4" fill="var(--status-success)" />
          <circle cx="65" cy="16" r="7" fill="none" stroke="var(--bone)" strokeOpacity="0.4" strokeWidth="2" />
        </g>
        <rect x="16" y="46" width="88" height="52" rx="12" fill="var(--noir-3)" stroke="var(--noir-line)" />
        <rect x="16" y="46" width="88" height="14" rx="7" fill="var(--noir-2)" />
        <rect x="78" y="66" width="26" height="16" rx="6" fill="var(--accent)" />
        <circle cx="86" cy="74" r="3" fill="var(--noir)" />
        <CheckBadge delay={620} x={90} y={30} />
      </svg>
    );
  }

  return (
    <svg className={cls} width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="Done">
      <circle cx="52" cy="52" r="44" fill="var(--status-success-bright)" fillOpacity="0.14" />
      <circle
        cx="52" cy="52" r="34" fill="none" stroke="var(--status-success-bright)" strokeWidth="4"
        strokeLinecap="round" pathLength="1" className="bt-scene-ring"
      />
      <path
        d="M37 53 l10 10 l20 -22" fill="none" stroke="var(--status-success-bright)" strokeWidth="5"
        strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="bt-scene-tick" style={{ animationDelay: '320ms' }}
      />
    </svg>
  );
}
