import React from 'react';

const TONES = {
  success: {
    bg: 'var(--status-success-soft)',
    text: 'var(--status-success)',
    dot: 'var(--status-success-bright)',
  },
  paid: {
    bg: 'var(--status-success-soft)',
    text: 'var(--status-success)',
    dot: 'var(--status-success-bright)',
  },
  approved: {
    bg: 'var(--status-success-soft)',
    text: 'var(--status-success)',
    dot: 'var(--status-success-bright)',
  },
  completed: {
    bg: 'var(--status-success-soft)',
    text: 'var(--status-success)',
    dot: 'var(--status-success-bright)',
  },

  warning: {
    bg: 'var(--status-warning-soft)',
    text: 'var(--status-warning)',
    dot: 'var(--status-warning-bright)',
  },
  pending: {
    bg: 'var(--status-warning-soft)',
    text: 'var(--status-warning)',
    dot: 'var(--status-warning-bright)',
  },
  partial: {
    bg: 'var(--status-warning-soft)',
    text: 'var(--status-warning)',
    dot: 'var(--status-warning-bright)',
  },
  onhold: {
    bg: 'var(--status-warning-soft)',
    text: 'var(--status-warning)',
    dot: 'var(--status-warning-bright)',
  },

  danger: {
    bg: 'var(--status-danger-soft)',
    text: 'var(--status-danger)',
    dot: 'var(--status-danger-bright)',
  },
  rejected: {
    bg: 'var(--status-danger-soft)',
    text: 'var(--status-danger)',
    dot: 'var(--status-danger-bright)',
  },
  overbudget: {
    bg: 'var(--status-danger-soft)',
    text: 'var(--status-danger)',
    dot: 'var(--status-danger-bright)',
  },
  cancelled: {
    bg: 'var(--status-danger-soft)',
    text: 'var(--status-danger)',
    dot: 'var(--status-danger-bright)',
  },

  brand: {
    bg: 'var(--accent-soft)',
    text: 'var(--accent-ink)',
    dot: 'var(--accent)',
  },
  inprogress: {
    bg: 'var(--accent-soft)',
    text: 'var(--accent-ink)',
    dot: 'var(--accent)',
  },

  neutral: {
    bg: 'var(--fill)',
    text: 'var(--ink-2)',
    dot: 'var(--slate)',
  },
  planning: {
    bg: 'var(--fill)',
    text: 'var(--ink-2)',
    dot: 'var(--slate)',
  },
};

export default function BtBadge({
  label,
  tone = 'neutral', // 'success' | 'warning' | 'danger' | 'brand' | 'neutral'
  showDot = true,
  className = '',
  style = {},
  ...props
}) {
  const normalizedTone = String(tone).toLowerCase().replace(/[\s_-]/g, '');
  const config = TONES[normalizedTone] || TONES.neutral;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '24px',
        padding: '0 10px',
        borderRadius: 'var(--r-full)',
        background: config.bg,
        color: config.text,
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: config.dot,
            flexShrink: 0,
          }}
        />
      )}
      <span>{label}</span>
    </span>
  );
}
