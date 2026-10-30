import React from 'react';

/**
 * BtProgress: 8px progress bar with --fill track and accent fill
 * (switches to red when over budget / > 100%).
 */
export default function BtProgress({
  value = 0, // 0 to 1 (or 0 to 100 with isPercent)
  isPercent = false,
  overBudget = false,
  height = 8,
  color,
  className = '',
  style = {},
  ...props
}) {
  const normalized = isPercent ? value / 100 : value;
  const pct = Math.max(0, Math.min(100, normalized * 100));
  const isOver = overBudget || normalized > 1;

  const fillColor = color || (isOver ? 'var(--status-danger-bright)' : 'var(--accent)');

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: `${height}px`,
        background: 'var(--fill)',
        borderRadius: 'var(--r-full)',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: fillColor,
          borderRadius: 'var(--r-full)',
          transition: 'width 1100ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  );
}
