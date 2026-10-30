import React from 'react';

export default function Spinner({ size = 20, color = 'var(--ink)', style }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2px solid var(--line)',
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
        ...style,
      }}
    />
  );
}
