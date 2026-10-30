import React from 'react';

/**
 * BtGroup: Grouped list container card (Miller's law: grouping related rows).
 * Radius 22, inset dividers between children.
 */
export default function BtGroup({
  children,
  className = '',
  style = {},
  insetDividers = true,
  ...props
}) {
  const validChildren = React.Children.toArray(children).filter(Boolean);

  return (
    <div
      className={className}
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--r-card)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      {validChildren.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {index < validChildren.length - 1 && (
            <div
              style={{
                height: '1px',
                background: 'var(--line)',
                marginLeft: insetDividers ? '68px' : '0',
                marginRight: '0',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
