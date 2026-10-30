import React, { useEffect, useState, useRef } from 'react';

/**
 * Format Indian Rupee currency
 */
export function formatInr(amount, { compact = false } = {}) {
  const val = Number(amount) || 0;
  if (compact) {
    if (Math.abs(val) >= 10000000) {
      return '₹' + (val / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
    }
    if (Math.abs(val) >= 100000) {
      return '₹' + (val / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
    }
    if (Math.abs(val) >= 1000) {
      return '₹' + (val / 1000).toFixed(1).replace(/\.0$/, '') + ' k';
    }
  }
  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/**
 * BtCountUp: Count-up animation easing up over 1100ms on first view.
 */
export default function BtCountUp({
  value = 0,
  duration = 1100,
  isCurrency = true,
  compact = false,
  format,
  className = '',
  style = {},
  ...props
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const animRef = useRef(null);
  const target = Number(value) || 0;

  useEffect(() => {
    // Check reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(target);
      return;
    }

    let startTime = null;
    const startVal = 0;

    const step = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      // expo-out easing: 1 - Math.pow(2, -10 * progress)
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startVal + (target - startVal) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration]);

  const rendered = format
    ? format(displayValue)
    : isCurrency
    ? formatInr(displayValue, { compact })
    : Math.round(displayValue).toLocaleString('en-IN');

  return (
    <span
      className={`tnum ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
      {...props}
    >
      {rendered}
    </span>
  );
}
