import React, { useState } from 'react';

export default function BtButton({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'accent' | 'destructive'
  size = 'normal', // 'normal' (52px) | 'small' (38px) | 'compact' (32px)
  icon: Icon,
  trailingIcon: TrailingIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = '',
  style = {},
  type = 'button',
  ...props
}) {
  const [pressed, setPressed] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          background: '#FFFFFF',
          color: 'var(--ink)',
          border: '1px solid var(--input-border)',
        };
      case 'ghost':
      case 'tertiary':
        return {
          background: 'transparent',
          color: 'var(--accent-ink)',
          border: '1px solid transparent',
        };
      case 'accent':
        return {
          background: 'var(--accent)',
          color: 'var(--on-accent)',
          border: '1px solid transparent',
        };
      case 'destructive':
        return {
          background: 'var(--status-danger-soft)',
          color: 'var(--status-danger)',
          border: '1px solid transparent',
        };
      case 'primary':
      default:
        // Rule: primary buttons are ink (#111317), not accent!
        return {
          background: 'var(--ink)',
          color: '#FFFFFF',
          border: '1px solid transparent',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'compact':
        return {
          height: '32px',
          padding: '0 12px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          gap: '6px',
        };
      case 'small':
        return {
          height: '38px',
          padding: '0 16px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 600,
          gap: '8px',
        };
      case 'normal':
      default:
        return {
          height: '52px',
          minHeight: '48px',
          padding: '0 24px',
          borderRadius: 'var(--r-button)',
          fontSize: '16px',
          fontWeight: 600,
          gap: '10px',
        };
    }
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={!isDisabled ? onClick : undefined}
      onPointerDown={() => !isDisabled && setPressed(true)}
      onPointerUp={() => !isDisabled && setPressed(false)}
      onPointerLeave={() => !isDisabled && setPressed(false)}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--font-ui)',
        letterSpacing: '-0.15px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: pressed
          ? 'transform 90ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1), background 150ms ease, opacity 150ms ease',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span
          style={{
            display: 'inline-block',
            width: size === 'normal' ? 20 : 16,
            height: size === 'normal' ? 20 : 16,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : (
        <>
          {Icon && (
            <Icon
              size={size === 'normal' ? 20 : 16}
              strokeWidth={2}
              style={{ flexShrink: 0 }}
            />
          )}
          <span>{children}</span>
          {TrailingIcon && (
            <TrailingIcon
              size={size === 'normal' ? 20 : 16}
              strokeWidth={2}
              style={{ flexShrink: 0 }}
            />
          )}
        </>
      )}
    </button>
  );
}
