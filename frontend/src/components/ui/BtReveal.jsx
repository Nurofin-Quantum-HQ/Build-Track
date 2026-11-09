import React from 'react';

/**
 * BtReveal: rises + fades in on mount, staggered by `index` (55ms apart, capped at 10).
 * Follows the motion level automatically (styles/motion.css).
 *
 *   {items.map((it, i) => <BtReveal key={it.id} index={i}><Row … /></BtReveal>)}
 *
 * `as` lets it be a table row etc. without breaking layout: <BtReveal as="tr" …>.
 */
export default function BtReveal({ index = 0, as: Tag = 'div', className = '', style = {}, children, ...props }) {
  return (
    <Tag className={`bt-reveal ${className}`.trim()} style={{ '--i': index, ...style }} {...props}>
      {children}
    </Tag>
  );
}
