import React, { useState } from 'react';

/**
 * BtPressable: Micro-interaction wrapper that scales to .97 on press (90ms)
 * and springs back on release (380ms), matching Flutter's BtPressable.
 */
export default function BtPressable({
  children,
  onClick,
  onMouseDown,
  onMouseUp,
  disabled = false,
  scale = 0.97,
  className = '',
  style = {},
  ...props
}) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = (e) => {
    if (disabled) return;
    setIsPressed(true);
    if (onMouseDown) onMouseDown(e);
  };

  const handlePointerUp = (e) => {
    if (disabled) return;
    setIsPressed(false);
    if (onMouseUp) onMouseUp(e);
  };

  const handlePointerLeave = () => {
    if (disabled) return;
    setIsPressed(false);
  };

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={className}
      style={{
        display: 'inline-block',
        cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
        transform: isPressed ? `scale(${scale})` : 'scale(1)',
        transition: isPressed
          ? 'transform 90ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
