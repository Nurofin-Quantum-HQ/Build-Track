import React from 'react';

export default function BtSegmented({
  options = [], // [{ label: 'Labour', value: 'labour', icon? }]
  value,
  onChange,
  className = '',
  style = {},
  ...props
}) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--fill)',
        borderRadius: 'var(--r-tile)',
        padding: '3px',
        position: 'relative',
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const Icon = opt.icon;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange && onChange(opt.value)}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 16px',
              height: '36px',
              borderRadius: '11px',
              background: isSelected ? '#FFFFFF' : 'transparent',
              color: isSelected ? 'var(--ink)' : 'var(--ink-2)',
              boxShadow: isSelected ? '0 1px 3px rgba(12, 14, 18, 0.08)' : 'none',
              fontSize: '13px',
              fontWeight: isSelected ? 600 : 500,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              transition: 'all 160ms cubic-bezier(0.16, 1, 0.3, 1)',
              whiteSpace: 'nowrap',
            }}
          >
            {Icon && (
              <Icon
                size={15}
                strokeWidth={isSelected ? 2 : 1.7}
                style={{ flexShrink: 0 }}
              />
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
