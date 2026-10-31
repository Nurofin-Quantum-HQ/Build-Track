import React from 'react';

export default function BtChip({
  label,
  selected = false,
  onClick,
  icon: Icon,
  variant = 'ink', // 'ink' | 'accent'
  onDark = false,
  className = '',
  style = {},
  ...props
}) {
  const getSelectedStyles = () => {
    if (!selected) {
      return {
        background: onDark ? 'rgba(255, 255, 255, 0.08)' : 'var(--fill)',
        color: onDark ? 'var(--on-noir)' : 'var(--ink)',
        border: '1px solid transparent',
      };
    }

    if (variant === 'accent') {
      return {
        background: 'var(--accent-soft)',
        color: 'var(--accent-ink)',
        border: '1px solid var(--accent)',
      };
    }

    return {
      background: onDark ? 'var(--bone)' : 'var(--ink)',
      color: onDark ? 'var(--noir)' : '#FFFFFF',
      border: '1px solid transparent',
    };
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '36px',
        padding: '0 14px',
        borderRadius: 'var(--r-chip)',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 140ms ease',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...getSelectedStyles(),
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={15} strokeWidth={2} style={{ flexShrink: 0 }} />}
      <span>{label}</span>
    </button>
  );
}
