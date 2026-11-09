import React from 'react';

/**
 * BtIconButton: square icon-only button. `label` is required — it becomes the
 * aria-label and tooltip, since there is no visible text.
 */
export default function BtIconButton({
  icon: Icon,
  label,
  onClick,
  onDark = false,
  size = 40,
  disabled = false,
  active = false,
  style = {},
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`bt-icon-btn ${onDark ? 'on-dark' : 'on-light'}`}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Math.round(size * 0.3),
        border: onDark ? '1px solid var(--noir-line)' : '1px solid var(--line)',
        background: active
          ? onDark ? 'rgba(255, 255, 255, 0.14)' : 'var(--fill)'
          : onDark ? 'rgba(255, 255, 255, 0.05)' : 'var(--card)',
        color: onDark ? 'var(--on-noir-2)' : 'var(--ink-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={Math.round(size * 0.45)} strokeWidth={1.9} />}
    </button>
  );
}
