import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function Input({
  label,
  error,
  icon,
  type = 'text',
  style,
  containerStyle,
  required,
  ...props
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        ...containerStyle,
      }}
    >
      {label && (
        <label
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: error ? 'var(--status-danger)' : 'var(--ink-2)',
            fontFamily: 'var(--font-ui)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: 'var(--status-danger)' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: '16px',
              color: 'var(--ink-3)',
              display: 'flex',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            {icon}
          </span>
        )}

        <input
          type={type}
          {...props}
          style={{
            width: '100%',
            height: '52px',
            padding: icon ? '0 16px 0 46px' : '0 16px',
            fontSize: '15px',
            fontWeight: 400,
            fontFamily: 'var(--font-ui)',
            color: 'var(--ink)',
            background: '#FFFFFF',
            border: `1px solid ${error ? 'var(--status-danger)' : 'var(--input-border)'}`,
            borderRadius: 'var(--r-input)',
            outline: 'none',
            boxShadow: error ? '0 0 0 3px var(--status-danger-soft)' : 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
            boxSizing: 'border-box',
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--status-danger)' : 'var(--accent)';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px var(--status-danger-soft)'
              : '0 0 0 3px var(--accent-soft)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--status-danger)' : 'var(--input-border)';
            e.currentTarget.style.boxShadow = error ? '0 0 0 3px var(--status-danger-soft)' : 'none';
          }}
        />
      </div>

      {error && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--status-danger)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--font-ui)',
            marginTop: '2px',
          }}
        >
          <AlertCircle size={13} />
          {error}
        </span>
      )}
    </div>
  );
}
