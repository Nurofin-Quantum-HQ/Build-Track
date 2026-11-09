import React, { useId } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

/**
 * Blueprint Noir form controls. All three share one look:
 * visible label above, white shell with a solid border, ink border + brass
 * ring on focus, error text under the field.
 *
 *   <BtField label="Quantity" required value={q} onChange={e => setQ(e.target.value)} />
 *   <BtSelect label="Project" value={id} onChange={…}>
 *     <option value="">Select project</option>…
 *   </BtSelect>
 *   <BtTextarea label="Notes" rows={4} value={n} onChange={…} />
 *
 * size: 'normal' (48px) | 'compact' (40px, for filter bars and dense tables).
 */

const HEIGHT = { normal: 48, compact: 40 };

function FieldFrame({ id, label, required, error, helperText, className, style, children }) {
  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', minWidth: 0, ...style }}
    >
      {label && (
        <label
          htmlFor={id}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            fontWeight: 600,
            color: error ? 'var(--status-danger)' : 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>{label}</span>
          {required && <span aria-hidden="true" style={{ color: 'var(--status-danger)' }}>*</span>}
        </label>
      )}

      {children}

      {error ? (
        <div
          id={`${id}-msg`}
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            color: 'var(--status-danger)',
          }}
        >
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <span id={`${id}-msg`} style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--ink-3)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

const shellStyle = ({ error, disabled, height, multiline }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: multiline ? 'stretch' : 'center',
  height: multiline ? 'auto' : height,
  background: disabled ? 'var(--fill)' : 'var(--card)',
  borderRadius: 'var(--r-input)',
  border: `1px solid ${error ? 'var(--status-danger)' : 'var(--input-border)'}`,
  boxShadow: error ? '0 0 0 3px var(--status-danger-soft)' : 'none',
  padding: multiline ? '12px 14px' : '0 14px',
  boxSizing: 'border-box',
});

const controlStyle = {
  flex: 1,
  minWidth: 0,
  height: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--ink)',
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  padding: 0,
};

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
  size = 'normal',
  className = '',
  style = {},
  inputStyle = {},
  helperText,
  id: idProp,
  ...props
}) {
  const autoId = useId();
  const id = idProp || autoId;

  return (
    <FieldFrame id={id} label={label} required={required} error={error} helperText={helperText} className={className} style={style}>
      <div className="bt-field-shell" style={shellStyle({ error, disabled, height: HEIGHT[size] || HEIGHT.normal })}>
        {isCurrency && (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--ink-3)', marginRight: 6, userSelect: 'none' }}>
            ₹
          </span>
        )}
        {prefix && (
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-3)', marginRight: 8, userSelect: 'none' }}>
            {prefix}
          </span>
        )}
        {Icon && <Icon size={17} color="var(--ink-3)" style={{ marginRight: 10, flexShrink: 0 }} />}

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? `${id}-msg` : undefined}
          style={{
            ...controlStyle,
            fontSize: isCurrency ? 17 : 15,
            fontFamily: isCurrency ? 'var(--font-display)' : 'var(--font-ui)',
            fontWeight: isCurrency ? 700 : 400,
            fontVariantNumeric: 'tabular-nums',
            ...inputStyle,
          }}
          {...props}
        />

        {suffix && (
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-3)', marginLeft: 8, userSelect: 'none' }}>
            {suffix}
          </span>
        )}
      </div>
    </FieldFrame>
  );
}

export function BtSelect({
  label,
  value,
  onChange,
  children,
  error,
  helperText,
  icon: Icon,
  disabled = false,
  required = false,
  size = 'normal',
  className = '',
  style = {},
  id: idProp,
  ...props
}) {
  const autoId = useId();
  const id = idProp || autoId;

  return (
    <FieldFrame id={id} label={label} required={required} error={error} helperText={helperText} className={className} style={style}>
      <div className="bt-field-shell" style={shellStyle({ error, disabled, height: HEIGHT[size] || HEIGHT.normal })}>
        {Icon && <Icon size={17} color="var(--ink-3)" style={{ marginRight: 10, flexShrink: 0 }} />}
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          style={{
            ...controlStyle,
            appearance: 'none',
            WebkitAppearance: 'none',
            paddingRight: 26,
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: value === '' || value == null ? 'var(--placeholder)' : 'var(--ink)',
          }}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={16} color="var(--ink-3)" style={{ position: 'absolute', right: 14, pointerEvents: 'none' }} />
      </div>
    </FieldFrame>
  );
}

export function BtTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  style = {},
  id: idProp,
  ...props
}) {
  const autoId = useId();
  const id = idProp || autoId;

  return (
    <FieldFrame id={id} label={label} required={required} error={error} helperText={helperText} className={className} style={style}>
      <div className="bt-field-shell" style={shellStyle({ error, disabled, multiline: true })}>
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          style={{ ...controlStyle, resize: 'vertical', lineHeight: 1.5, minHeight: rows * 22 }}
          {...props}
        />
      </div>
    </FieldFrame>
  );
}
