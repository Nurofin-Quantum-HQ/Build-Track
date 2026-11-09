import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * BtPageHeader: the standard content of a BtHero.
 *
 *   <BtHero>
 *     <BtPageHeader
 *       back={{ label: 'Projects', onClick: () => navigate('/projects') }}
 *       eyebrow="Sites & phases"
 *       title="Projects"
 *       subtitle="2 active builds"
 *       actions={<BtButton …/>}
 *     >
 *       {optional tiles / tabs under the title}
 *     </BtPageHeader>
 *   </BtHero>
 *
 * Title sizes: 'lg' (default, list/overview pages) or 'md' (forms, detail sub-pages).
 */
export default function BtPageHeader({
  back,
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  size = 'lg',
  children,
  style = {},
}) {
  const titleSize = size === 'md' ? 'clamp(26px, 3vw, 32px)' : 'clamp(30px, 3.6vw, 40px)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          {(back || eyebrow) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              {back && (
                <button
                  type="button"
                  onClick={back.onClick}
                  className="bt-icon-btn on-dark"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 30,
                    padding: '0 12px 0 9px',
                    borderRadius: 'var(--r-full)',
                    border: '1px solid var(--noir-line)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--on-noir-2)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <ArrowLeft size={14} strokeWidth={2.2} />
                  {back.label || 'Back'}
                </button>
              )}
              {eyebrow && (
                <span className="bt-eyebrow" style={{ color: 'var(--on-noir-3)' }}>
                  {eyebrow}
                </span>
              )}
            </div>
          )}

          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: titleSize,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.08,
              color: 'var(--on-noir)',
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                lineHeight: 1.5,
                color: 'var(--on-noir-2)',
                maxWidth: 640,
              }}
            >
              {subtitle}
            </p>
          )}

          {meta && (
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                color: 'var(--on-noir-2)',
              }}
            >
              {meta}
            </div>
          )}
        </div>

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 1, maxWidth: '100%', minWidth: 0 }}>
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
