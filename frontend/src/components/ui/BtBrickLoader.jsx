import React, { useEffect, useState, useRef } from 'react';

const BRICKS = [
  { left: 0, bottom: 0, width: 19 },
  { left: 21, bottom: 0, width: 19 },
  { left: 10.5, bottom: 10, width: 19 },
  { left: 0, bottom: 20, width: 9 },
  { left: 11, bottom: 20, width: 19 },
  { left: 32, bottom: 20, width: 8 },
];

/**
 * BtBrickLoader: Signature 2.2s brick-laying loop loader directly from the app.
 * Six bricks drop and stack in sequence, hold, fade, and repeat.
 */
export default function BtBrickLoader({
  label,
  scale = 1.2,
  onDark = false,
  color,
  className = '',
  style = {},
  ...props
}) {
  const [progress, setProgress] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(0.5);
      return;
    }

    const duration = 2200; // ms
    let startTime = null;

    const animate = (time) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const p = (elapsed % duration) / duration;
      setProgress(p);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const brickColor = color || 'var(--accent)';
  const width = 40 * scale;
  const height = 30 * scale;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {BRICKS.map((b, i) => {
          const local = Math.max(0, Math.min(1, progress - i * 0.055));
          let opacity = 0;
          let dy = 0;

          if (local < 0.18) {
            // Drop down easing
            const t = Math.sin((local / 0.18) * (Math.PI / 2));
            opacity = t;
            dy = -22 * (1 - t);
          } else if (local < 0.8) {
            opacity = 1;
            dy = 0;
          } else {
            // Fade out
            opacity = Math.max(0, 1 - (local - 0.8) / 0.2);
            dy = 0;
          }

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${b.left * scale}px`,
                bottom: `${b.bottom * scale + dy * scale}px`,
                width: `${b.width * scale}px`,
                height: `${8 * scale}px`,
                borderRadius: `${2.5 * scale}px`,
                background: brickColor,
                opacity,
                pointerEvents: 'none',
              }}
            />
          );
        })}
      </div>

      {label && (
        <span
          style={{
            marginTop: '12px',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            color: onDark ? 'var(--on-noir-2)' : 'var(--ink-2)',
            textAlign: 'center',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function BtPageLoader({ label = 'Loading…', onDark = false }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '280px',
        padding: '32px',
        width: '100%',
      }}
    >
      <BtBrickLoader label={label} scale={1.4} onDark={onDark} />
    </div>
  );
}
