import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * BtSectionHeader: Standard section header with optional right-aligned action.
 */
export default function BtSectionHeader({
  title,
  action,
  onAction,
  caption = false,
  className = '',
  style = {},
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2px 10px',
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: caption ? 'var(--font-mono)' : 'var(--font-display)',
          fontSize: caption ? '11px' : '18px',
          fontWeight: caption ? 700 : 700,
          letterSpacing: caption ? '0.08em' : '-0.02em',
          textTransform: caption ? 'uppercase' : 'none',
          color: caption ? 'var(--ink-3)' : 'var(--ink)',
        }}
      >
        {caption ? title.toUpperCase() : title}
      </div>

      {action && (
        <button
          type="button"
          onClick={onAction}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 8px',
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--ink-2)',
            cursor: onAction ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            borderRadius: '6px',
            transition: 'color 150ms ease, background 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (onAction) {
              e.currentTarget.style.color = 'var(--ink)';
              e.currentTarget.style.background = 'var(--fill)';
            }
          }}
          onMouseLeave={(e) => {
            if (onAction) {
              e.currentTarget.style.color = 'var(--ink-2)';
              e.currentTarget.style.background = 'none';
            }
          }}
        >
          {action}
          {onAction && <ChevronRight size={14} />}
        </button>
      )}
    </div>
  );
}
