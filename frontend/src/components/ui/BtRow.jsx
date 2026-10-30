import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function BtRow({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  amount,
  amountColor,
  tag,
  onClick,
  showChevron = true,
  rightContent,
  className = '',
  style = {},
  ...props
}) {
  const [pressed, setPressed] = useState(false);
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      onPointerDown={() => isClickable && setPressed(true)}
      onPointerUp={() => isClickable && setPressed(false)}
      onPointerLeave={() => isClickable && setPressed(false)}
      className={className}
      style={{
        minHeight: '60px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        cursor: isClickable ? 'pointer' : 'default',
        background: pressed ? 'var(--fill)' : 'transparent',
        transition: 'background 120ms ease',
        ...style,
      }}
      {...props}
    >
      {Icon && (
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--r-tile)',
            background: iconBg || 'var(--fill)',
            color: iconColor || 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {typeof Icon === 'function' ? <Icon size={20} strokeWidth={1.8} /> : Icon}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
          {tag && <div>{tag}</div>}
        </div>

        {subtitle && (
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: 'var(--ink-3)',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {(amount !== undefined && amount !== null) && (
        <div
          className="tnum"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 700,
            color: amountColor || 'var(--ink)',
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          {typeof amount === 'number'
            ? '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })
            : amount}
        </div>
      )}

      {rightContent && <div style={{ flexShrink: 0 }}>{rightContent}</div>}

      {isClickable && showChevron && (
        <ChevronRight size={18} color="var(--ink-3)" style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}
