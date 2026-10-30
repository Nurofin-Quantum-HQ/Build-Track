import React from 'react';

/**
 * BtRing: Circular progress ring for project & phase completion.
 * SVG stroke animation with accent color and fill track.
 */
export default function BtRing({
  value = 0, // 0.0 to 1.0 (or 0 to 100 with isPercent)
  isPercent = false,
  size = 68,
  stroke = 7,
  color,
  trackColor = 'var(--fill)',
  children,
  className = '',
  style = {},
  ...props
}) {
  const normalized = isPercent ? value / 100 : value;
  const clamped = Math.max(0, Math.min(1, normalized));

  const center = size / 2;
  const radius = center - stroke;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - clamped * circumference;

  const ringColor = color || 'var(--accent)';

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          overflow: 'visible',
        }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {/* Animated Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1400ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>

      {children && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
