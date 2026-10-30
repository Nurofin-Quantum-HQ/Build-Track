import React from 'react';

/**
 * BtHero: Deep noir header with blueprint grid and top-right accent glow.
 * Direction: clean, premium, calm.
 */
export default function BtHero({
  children,
  padding = '24px 28px 48px',
  minHeight = 'auto',
  className = '',
  style = {},
  ...props
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: 'var(--noir)',
        color: 'var(--on-noir)',
        minHeight,
        padding,
        flexShrink: 0,
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {/* Background clipping container for grid & glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* 22px blueprint grid */}
        <div className="blueprint-grid-canvas" />

        {/* Top-right accent glow */}
        <div className="hero-glow-circle" />
      </div>

      {/* Hero content - higher zIndex so dropdowns render above BtSheet */}
      <div style={{ position: 'relative', zIndex: 20 }}>{children}</div>
    </div>
  );
}

/**
 * BtGlassTile: Metric card that sits on the noir hero.
 */
export function BtGlassTile({
  label,
  value,
  valueColor,
  icon: Icon,
  onClick,
  style = {},
  ...props
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: 'var(--r-input)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        cursor: onClick ? 'pointer' : 'default',
        backdropFilter: 'blur(8px)',
        transition: 'background 150ms ease',
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--on-noir-3)',
          }}
        >
          {label}
        </span>
        {Icon && <Icon size={14} color="var(--on-noir-3)" />}
      </div>
      <div
        className="tnum"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '18px',
          fontWeight: 700,
          color: valueColor || 'var(--on-noir)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  );
}
