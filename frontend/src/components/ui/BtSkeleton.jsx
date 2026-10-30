import React from 'react';

/**
 * BtSkeleton: --fill blocks with a slow shimmer, same size as content (no layout shift).
 */
export default function BtSkeleton({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--r-tile)',
  className = '',
  style = {},
  ...props
}) {
  return (
    <div
      className={`bt-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      {...props}
    />
  );
}

export function BtSkeletonCard({ height = '120px', style = {} }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--r-card)',
        padding: '20px',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height,
        ...style,
      }}
    >
      <BtSkeleton width="40%" height="16px" borderRadius="6px" />
      <BtSkeleton width="75%" height="24px" borderRadius="8px" />
      <BtSkeleton width="50%" height="14px" borderRadius="6px" />
    </div>
  );
}
