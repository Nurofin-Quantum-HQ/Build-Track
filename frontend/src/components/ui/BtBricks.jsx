import React, { useEffect, useState } from 'react';

/**
 * BtBricks: Progress bar rendered as a wall of 20 segmented bricks.
 * Bricks animate in with a staggered spring bounce.
 */
export default function BtBricks({
  value = 0, // 0.0 to 1.0 (clamped)
  count = 20,
  onDark = false,
  color,
  height = 10,
  className = '',
  style = {},
  ...props
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(timer);
  }, []);

  const clamped = isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
  const litCount = Math.round(clamped * count);
  const fillColor = color || 'var(--accent)';
  const offColor = onDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(17, 19, 23, 0.08)';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        width: '100%',
        height: `${height}px`,
        ...style,
      }}
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => {
        const isLit = i < litCount;
        const delay = i * 28; // staggered reveal

        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${height}px`,
              borderRadius: '3px',
              background: offColor,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isLit && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '3px',
                  background: fillColor,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(-12px)',
                  transition: `transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 250ms ease ${delay}ms`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
