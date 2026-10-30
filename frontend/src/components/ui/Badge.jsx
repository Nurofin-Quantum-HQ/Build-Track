import React from 'react';

const variantMap = {
  default: { bg: 'var(--fill)', color: 'var(--ink-2)', dot: 'var(--slate)' },
  success: { bg: 'var(--status-success-soft)', color: 'var(--status-success)', dot: 'var(--status-success-bright)' },
  paid: { bg: 'var(--status-success-soft)', color: 'var(--status-success)', dot: 'var(--status-success-bright)' },
  approved: { bg: 'var(--status-success-soft)', color: 'var(--status-success)', dot: 'var(--status-success-bright)' },
  danger: { bg: 'var(--status-danger-soft)', color: 'var(--status-danger)', dot: 'var(--status-danger-bright)' },
  rejected: { bg: 'var(--status-danger-soft)', color: 'var(--status-danger)', dot: 'var(--status-danger-bright)' },
  warning: { bg: 'var(--status-warning-soft)', color: 'var(--status-warning)', dot: 'var(--status-warning-bright)' },
  pending: { bg: 'var(--status-warning-soft)', color: 'var(--status-warning)', dot: 'var(--status-warning-bright)' },
  info: { bg: 'var(--accent-soft)', color: 'var(--accent-ink)', dot: 'var(--accent)' },
  brand: { bg: 'var(--accent-soft)', color: 'var(--accent-ink)', dot: 'var(--accent)' },
};

export default function Badge({
  children,
  variant = 'default',
  style,
  size = 'md',
  showDot = true,
  className = '',
  ...props
}) {
  const norm = String(variant).toLowerCase().replace(/[\s_-]/g, '');
  const v = variantMap[norm] || variantMap.default;
  const s = size === 'sm' ? { height: '22px', padding: '0 8px', fontSize: '11px' } : { height: '24px', padding: '0 10px', fontSize: '12px' };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...s,
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        borderRadius: 'var(--r-full)',
        background: v.bg,
        color: v.color,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: v.dot,
            flexShrink: 0,
          }}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
