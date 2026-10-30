import React, { useState } from 'react';

export default function BtCard({
  children,
  onClick,
  padding = '18px 20px',
  bordered = true,
  hoverLift = true,
  className = '',
  style = {},
  ...props
}) {
  const [pressed, setPressed] = useState(false);
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      onPointerDown={() => isClickable && setPressed(true)}
      onPointerUp={() => isClickable && setPressed(false)}
      onPointerLeave={() => isClickable && setPressed(false)}
      className={className}
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--r-card)',
        border: bordered ? '1px solid var(--line)' : 'none',
        boxShadow: 'var(--shadow-card)',
        padding,
        cursor: isClickable ? 'pointer' : 'default',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: isClickable
          ? pressed
            ? 'transform 90ms var(--ease)'
            : 'transform 380ms var(--spring), box-shadow 200ms ease, border-color 200ms ease'
          : 'none',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
