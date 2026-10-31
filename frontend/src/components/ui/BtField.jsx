import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function BtField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  isCurrency = false,
  prefix,
  suffix,
  icon: Icon,
  disabled = false,
  required = false,
  className = '',
  style = {},
  inputStyle = {},
  helperText,
  ...props
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        ...style,
      }}
    >
      {label && (
        <label
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            fontWeight: 600,
            color: error ? 'var(--status-danger)' : 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: 'var(--status-danger)' }}>*</span>}
        </label>
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: '52px',
          background: disabled ? 'var(--fill)' : '#FFFFFF',
          borderRadius: 'var(--r-input)',
          border: error ? '1.5px solid var(--status-danger)' : '1px solid var(--input-border)',
          boxShadow: error ? '0 0 0 3px var(--status-danger-soft)' : 'none',
          padding: '0 14px',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
        }}
      >
        {isCurrency && (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--ink-2)',
              marginRight: '6px',
              userSelect: 'none',
            }}
          >
            ₹
          </span>
        )}

        {prefix && (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              color: 'var(--ink-3)',
              marginRight: '8px',
              userSelect: 'none',
            }}
          >
            {prefix}
          </span>
        )}

        {Icon && (
          <Icon
            size={18}
            color="var(--ink-3)"
            style={{ marginRight: '8px', flexShrink: 0 }}
          />
        )}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            height: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--ink)',
            fontSize: isCurrency ? '18px' : '15px',
            fontFamily: isCurrency ? 'var(--font-display)' : 'var(--font-ui)',
            fontWeight: isCurrency ? 700 : 400,
            textAlign: isCurrency ? 'right' : 'left',
            fontVariantNumeric: 'tabular-nums',
            padding: 0,
            ...inputStyle,
          }}
          {...props}
        />

        {suffix && (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: 'var(--ink-3)',
              marginLeft: '8px',
              userSelect: 'none',
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontFamily: 'var(--font-ui)',
            fontSize: '12px',
            color: 'var(--status-danger)',
            marginTop: '2px',
          }}
        >
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '12px',
            color: 'var(--ink-3)',
            marginTop: '2px',
          }}
        >
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
