import React from 'react';
import { Package, Users, Truck, IndianRupee, ArrowDownLeft } from 'lucide-react';

/**
 * BtTile: 42px square rounded tile with centered icon.
 */
export function BtTile({
  icon: Icon,
  bg = 'var(--fill)',
  fg = 'var(--ink)',
  size = 42,
  style = {},
  className = '',
}) {
  const iconSize = Math.round(size * 0.52);

  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.round(size * 0.33)}px`,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {React.isValidElement(Icon) ? (
        Icon
      ) : Icon ? (
        <Icon size={iconSize} strokeWidth={1.8} />
      ) : null}
    </div>
  );
}

/**
 * BtTypeTile: Preset icon tile for entry types (Material, Labour, Equipment, Revenue).
 */
export function BtTypeTile({ type, size = 42, style = {} }) {
  const t = (type || '').toLowerCase();

  let Icon = Package;
  let bg = 'var(--fill)';
  let fg = 'var(--ink)';

  if (t.includes('labour') || t.includes('labor') || t.includes('wage')) {
    Icon = Users;
    bg = 'var(--type-labour-soft)';
    fg = 'var(--type-labour)';
  } else if (t.includes('equip') || t.includes('machin') || t.includes('expense')) {
    Icon = Truck;
    bg = 'var(--type-equipment-soft)';
    fg = 'var(--type-equipment)';
  } else if (t.includes('income') || t.includes('revenue')) {
    Icon = IndianRupee;
    bg = 'var(--type-income-soft)';
    fg = 'var(--status-success)';
  } else {
    // material
    Icon = Package;
    bg = 'var(--type-material-soft)';
    fg = 'var(--type-material)';
  }

  return <BtTile icon={Icon} bg={bg} fg={fg} size={size} style={style} />;
}

export default BtTile;
