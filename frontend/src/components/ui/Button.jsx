import React, { useState } from 'react';
import { colors, radius, typography } from '../../styles/designTokens';

const sizeMap = {
  sm: { height: 34, fontSize: 13, padding: '0 14px', radius: '10px' },
  md: { height: 44, fontSize: 14, padding: '0 18px', radius: '14px' },
  lg: { height: 52, fontSize: 16, padding: '0 24px', radius: '18px' },
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  trailingIcon: TrailingIcon,
  style,
  disabled,
  onClick,
  loading,
  fullWidth,
  type = 'button',
  className = '',
  ...props
}) {
  const [pressed, setPressed] = useState(false);
  const s = sizeMap[size] || sizeMap.md;

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--ink)',
          color: '#FFFFFF',
          border: '1px solid transparent',
        };
      case 'secondary':
        return {
          background: '#FFFFFF',
          color: 'var(--ink)',
          border: '1px solid var(--input-border)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--ink)',
          border: '1.5px solid var(--input-border)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--accent-ink)',
          border: 'none',
        };
      case 'accent':
        return {
          background: 'var(--accent)',
          color: 'var(--on-accent)',
          border: 'none',
        };
      case 'danger':
        return {
          background: 'var(--status-danger-soft)',
          color: 'var(--status-danger)',
          border: 'none',
        };
      default:
        return {
          background: 'var(--ink)',
          color: '#FFFFFF',
          border: 'none',
        };
    }
  };

  const vStyles = getVariantStyles();
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
        gap: 8,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        borderRadius: s.radius,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: pressed
          ? 'transform 90ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1), background 150ms ease, opacity 150ms ease',
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...vStyles,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span
          style={{
            display: 'inline-block',
            width: s.height > 40 ? 18 : 14,
            height: s.height > 40 ? 18 : 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : (
        <>
          {Icon && (typeof Icon === 'function' ? <Icon size={s.height > 40 ? 18 : 15} /> : Icon)}
          <span>{children}</span>
          {TrailingIcon && (typeof TrailingIcon === 'function' ? <TrailingIcon size={s.height > 40 ? 18 : 15} /> : TrailingIcon)}
        </>
      )}
    </button>
  );
}
