import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

export function BtToastComponent({
  message,
  undoLabel = 'Undo',
  onUndo,
  onClose,
  duration = 3500,
  error = false,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 240);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
        opacity: visible ? 1 : 0,
        transition: 'all 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 99999,
        background: error ? 'var(--status-danger)' : 'var(--noir)',
        color: 'var(--on-noir)',
        borderRadius: '16px',
        padding: '12px 20px',
        boxShadow: 'var(--shadow-raised)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minWidth: '280px',
        maxWidth: '90vw',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '14px',
          fontWeight: 500,
          flex: 1,
        }}
      >
        {message}
      </span>

      {onUndo && (
        <button
          onClick={() => {
            onUndo();
            setVisible(false);
            setTimeout(onClose, 240);
          }}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--accent)',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            padding: 0,
          }}
        >
          {undoLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Imperative helper matching btToast(context, '...') in Flutter
 */
export function btToast(message, { onUndo, undoLabel, error = false, duration = 3500 } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    root.unmount();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  root.render(
    <BtToastComponent
      message={message}
      onUndo={onUndo}
      undoLabel={undoLabel}
      error={error}
      duration={duration}
      onClose={cleanup}
    />
  );
}

export default btToast;
