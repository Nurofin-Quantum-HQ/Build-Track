import React from 'react';
import { AlertCircle } from 'lucide-react';
import BtButton from './BtButton';

/**
 * BtEmpty: Empty state matching Flutter's BtEmpty.
 * Icon in soft circle, one line title, one line help, one primary action.
 */
export default function BtEmpty({
  icon: Icon = AlertCircle,
  title = 'No items found',
  message,
  actionLabel,
  onAction,
  className = '',
  style = {},
  ...props
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--fill)',
          color: 'var(--ink-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <Icon size={28} strokeWidth={1.75} />
      </div>

      <h4
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '17px',
          fontWeight: 600,
          color: 'var(--ink)',
          margin: '0 0 6px 0',
        }}
      >
        {title}
      </h4>

      {message && (
        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            color: 'var(--ink-3)',
            maxWidth: '360px',
            lineHeight: 1.45,
            margin: '0 0 20px 0',
          }}
        >
          {message}
        </p>
      )}

      {actionLabel && onAction && (
        <BtButton variant="primary" size="small" onClick={onAction}>
          {actionLabel}
        </BtButton>
      )}
    </div>
  );
}

/**
 * BtErrorCard: "Errors are never shown as empty. A failed load says it failed and offers Retry"
 */
export function BtErrorCard({
  title = "Couldn't load data",
  message = 'Please check your connection and try again.',
  onRetry,
  style = {},
}) {
  return (
    <div
      style={{
        background: 'var(--status-danger-soft)',
        borderRadius: 'var(--r-card)',
        padding: '24px',
        border: '1px solid rgba(190, 42, 48, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#FFFFFF',
            color: 'var(--status-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertCircle size={22} strokeWidth={2} />
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--status-danger)',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: 'var(--ink-2)',
              marginTop: '2px',
            }}
          >
            {message}
          </div>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            height: '38px',
            padding: '0 16px',
            borderRadius: '12px',
            background: '#FFFFFF',
            border: '1px solid rgba(190, 42, 48, 0.25)',
            color: 'var(--status-danger)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            fontFamily: 'var(--font-ui)',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
