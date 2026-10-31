import React, { useState } from 'react';

export default function Card({
  children,
  style,
  onClick,
  hoverable,
  padding = 20,
  className = '',
  bordered = true,
  ...props
}) {
  const [pressed, setPressed] = useState(false);
  const isInteractive = Boolean(hoverable || onClick);

  return (
    <div
      className={className}
      onClick={onClick}
      onPointerDown={() => isInteractive && setPressed(true)}
      onPointerUp={() => isInteractive && setPressed(false)}
      onPointerLeave={() => isInteractive && setPressed(false)}
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--r-card)',
        border: bordered ? '1px solid var(--line)' : 'none',
        boxShadow: 'var(--shadow-card)',
        padding,
        cursor: onClick ? 'pointer' : undefined,
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: isInteractive
          ? pressed
            ? 'transform 90ms var(--ease)'
            : 'transform 380ms var(--spring), box-shadow 200ms ease, border-color 200ms ease'
          : 'none',
        boxSizing: 'border-box',
        position: 'relative',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
