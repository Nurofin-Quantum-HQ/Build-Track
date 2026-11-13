import React, { useState, useEffect, useRef, useId, useMemo, useCallback, Children, isValidElement } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ChevronDown, Check } from 'lucide-react';

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
  options: optionsProp,
  placeholder = 'Select…',
  error,
  helperText,
  icon: Icon,
  disabled = false,
  required = false,
  size = 'normal',
  className = '',
  style = {},
  id: idProp,
  name,
  ...props
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  // Parse options from options prop or <option> children
  const parsedOptions = useMemo(() => {
    if (Array.isArray(optionsProp)) {
      return optionsProp.map((opt) =>
        typeof opt === 'object' && opt !== null
          ? {
              value: String(opt.value ?? ''),
              label: opt.label ?? opt.name ?? String(opt.value ?? ''),
              disabled: !!opt.disabled,
            }
          : { value: String(opt), label: String(opt), disabled: false }
      );
    }
    const list = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child)) {
        if (child.type === 'option') {
          const rawVal = child.props.value !== undefined ? child.props.value : child.props.children;
          const label = child.props.children != null && typeof child.props.children === 'string'
            ? child.props.children
            : String(rawVal ?? '');
          list.push({
            value: String(rawVal ?? ''),
            label: label,
            disabled: !!child.props.disabled,
          });
        } else if (child.props?.children) {
          Children.forEach(child.props.children, (subChild) => {
            if (isValidElement(subChild) && subChild.type === 'option') {
              const rawVal = subChild.props.value !== undefined ? subChild.props.value : subChild.props.children;
              const label = subChild.props.children != null && typeof subChild.props.children === 'string'
                ? subChild.props.children
                : String(rawVal ?? '');
              list.push({
                value: String(rawVal ?? ''),
                label: label,
                disabled: !!subChild.props.disabled,
              });
            }
          });
        }
      }
    });
    return list;
  }, [children, optionsProp]);

  // Find currently selected option
  const selectedOption = parsedOptions.find((opt) => String(opt.value) === String(value ?? ''));
  const isMongoId = typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
  const isPlaceholder = !selectedOption || selectedOption.value === '';
  const displayText = selectedOption
    ? selectedOption.label
    : (value && !isMongoId)
      ? String(value)
      : placeholder;

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUpward: false });

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const menuMaxHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuMaxHeight && rect.top > menuMaxHeight;

    setCoords({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUpward,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        (!menuRef.current || !menuRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handleSelect = (optVal) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      onChange({
        target: {
          value: optVal,
          name: name || id,
        },
      });
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <FieldFrame id={id} label={label} required={required} error={error} helperText={helperText} className={className} style={style}>
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          className="bt-field-shell"
          style={{
            ...shellStyle({ error, disabled, height: HEIGHT[size] || HEIGHT.normal }),
            width: '100%',
            textAlign: 'left',
            cursor: disabled ? 'not-allowed' : 'pointer',
            borderColor: isOpen ? 'var(--accent)' : error ? 'var(--status-danger)' : 'var(--input-border)',
            boxShadow: isOpen ? '0 0 0 3px var(--accent-soft, rgba(42, 120, 214, 0.15))' : error ? '0 0 0 3px var(--status-danger-soft)' : 'none',
            transition: 'border-color 140ms ease, box-shadow 140ms ease',
          }}
          {...props}
        >
          {Icon && <Icon size={17} color="var(--ink-3)" style={{ marginRight: 10, flexShrink: 0 }} />}
          <span
            style={{
              ...controlStyle,
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: isPlaceholder ? 'var(--placeholder)' : 'var(--ink)',
              fontWeight: isPlaceholder ? 400 : 500,
              paddingRight: 24,
            }}
          >
            {displayText}
          </span>
          <ChevronDown
            size={16}
            color="var(--ink-3)"
            style={{
              position: 'absolute',
              right: 14,
              pointerEvents: 'none',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 180ms ease',
            }}
          />
        </button>

        {isOpen && !disabled && typeof document !== 'undefined' && createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: 'fixed',
              ...(coords.openUpward
                ? { bottom: window.innerHeight - coords.top, top: 'auto' }
                : { top: coords.top, bottom: 'auto' }),
              left: coords.left,
              width: coords.width,
              background: 'var(--card)',
              borderRadius: 'var(--r-card)',
              border: '1px solid var(--line)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.24), 0 2px 6px rgba(0, 0, 0, 0.08)',
              zIndex: 999999,
              padding: 6,
              maxHeight: 260,
              overflowY: 'auto',
              animation: 'fadeIn 120ms ease',
              boxSizing: 'border-box',
            }}
          >
            {parsedOptions.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>
                No options available
              </div>
            ) : (
              parsedOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value ?? '');
                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      border: 'none',
                      textAlign: 'left',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 14,
                      fontWeight: isSelected ? 600 : 400,
                      background: isSelected ? 'var(--accent-soft, rgba(42, 120, 214, 0.1))' : 'transparent',
                      color: isSelected ? 'var(--accent)' : 'var(--ink)',
                      transition: 'background 100ms ease, color 100ms ease',
                      opacity: opt.disabled ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !opt.disabled) e.currentTarget.style.background = 'var(--fill)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !opt.disabled) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {isSelected && <Check size={15} color="var(--accent)" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
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
