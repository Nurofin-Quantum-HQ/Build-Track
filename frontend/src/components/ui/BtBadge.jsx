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

  // Entry types (same colours as the type icons and charts)
  material: {
    bg: 'var(--type-material-soft)',
    text: 'var(--type-material)',
    dot: 'var(--type-material)',
  },
  labour: {
    bg: 'var(--type-labour-soft)',
    text: 'var(--type-labour)',
    dot: 'var(--type-labour)',
  },
  equipment: {
    bg: 'var(--type-equipment-soft)',
    text: 'var(--type-equipment)',
    dot: 'var(--type-equipment)',
  },
  income: {
    bg: 'var(--type-income-soft)',
    text: 'var(--status-success)',
    dot: 'var(--type-income)',
  },
};

// Short names used across screens → canonical tones
const ALIASES = {
  good: 'success',
  green: 'success',
  warn: 'warning',
  amber: 'warning',
  bad: 'danger',
  red: 'danger',
  accent: 'brand',
  info: 'material',
  blue: 'material',
  muted: 'neutral',
  materials: 'material',
  wages: 'labour',
};

export default function BtBadge({
  label,
  children,
  tone = 'neutral', // 'success' | 'warning' | 'danger' | 'brand' | 'neutral'
  showDot = true,
  className = '',
  style = {},
  ...props
}) {
  const normalizedTone = String(tone).toLowerCase().replace(/[\s_-]/g, '');
  const config = TONES[ALIASES[normalizedTone] || normalizedTone] || TONES.neutral;

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
      <span>{label ?? children}</span>
    </span>
  );
}
