import React from 'react';

/**
 * BtSheet: The bone sheet container that pulls up over the noir hero.
 * Border radius: 28px on top, negative margin to overlap.
 */
export default function BtSheet({
  children,
  overlap = 26,
  padding = '24px 28px 48px',
  background = 'var(--ground)',
  className = '',
  style = {},
  ...props
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        zIndex: 10,
        marginTop: `-${overlap}px`,
        background,
        borderTopLeftRadius: 'var(--r-sheet)',
        borderTopRightRadius: 'var(--r-sheet)',
        padding,
        boxSizing: 'border-box',
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
