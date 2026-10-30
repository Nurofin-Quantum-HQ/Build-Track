import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BtHero,
  BtSheet,
  BtButton,
  BtCard,
  BtBadge,
  BtTile,
  BtSectionHeader,
} from '../components/ui';
import {
  Mic,
  Keyboard,
  ArrowLeft,
  CheckCircle2,
  Check,
  Building2,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function ChooseEntryMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const project = state.project || null;
  const entryType = state.type || 'material';

  const typeLabels = {
    material: 'Material',
    labour: 'Labour',
    equipment: 'Equipment',
  };

  const typeLabel = typeLabels[entryType] || 'Material';

  const handleSelectMode = (mode) => {
    if (mode === 'voice') {
      navigate('/voice', { state: { project, type: entryType } });
    } else {
      navigate(`/manualentry?type=${entryType}`, { state: { project } });
    }
  };

  const contextItems = [
    { label: 'Project', value: project?.projectName || project?.name || 'Selected Project' },
    { label: 'Floor', value: state.floor || project?.floors?.[0] || 'Ground Floor' },
    { label: 'Phase', value: state.phase || 'Active Phase' },
    { label: 'Activity', value: state.activity || 'General Works' },
  ];

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ══════════════════════════════════════════════════════════
          HERO (Noir Header)
         ══════════════════════════════════════════════════════════ */}
      <BtHero padding="28px 32px 56px">
        <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: 'var(--bone)',
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--on-noir-3)',
              marginBottom: '6px',
            }}
          >
            ENTRY MODE • STEP 2 OF 2
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--bone)',
              lineHeight: 1.15,
            }}
          >
            How do you want
            <br />
            to add it?
          </h1>

          <p
            style={{
              margin: '8px 0 0',
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              color: 'var(--on-noir-2)',
            }}
          >
            Adding <strong>{typeLabel}</strong> entry to active build.
          </p>
        </div>
      </BtHero>

      {/* ══════════════════════════════════════════════════════════
          SHEET (Bone Surface)
         ══════════════════════════════════════════════════════════ */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div
          style={{
            maxWidth: 860,
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
          }}
        >
          {/* Dual Choice Tiles: Speak it vs Type it */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Option 1: Speak it (Noir Ink Card) */}
            <div
              onClick={() => handleSelectMode('voice')}
              style={{
                background: 'var(--ink)',
                borderRadius: 'var(--r-card)',
                padding: '28px 24px',
                color: 'var(--bone)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                boxShadow: '0 10px 28px rgba(17, 19, 23, 0.16)',
                transition: 'transform 180ms ease, box-shadow 180ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 14px 34px rgba(17, 19, 23, 0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(17, 19, 23, 0.16)';
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'var(--on-accent, #111317)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px var(--accent-glow)',
                  flexShrink: 0,
                }}
              >
                <Mic size={26} strokeWidth={2.2} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--bone)',
                  }}
                >
                  Speak it
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    color: 'var(--on-noir-2)',
                    marginTop: '4px',
                  }}
                >
                  Speak naturally — AI extracts amounts, materials, and categories.
                </div>
              </div>

              <ChevronRight size={20} color="var(--on-noir-3)" />
            </div>

            {/* Option 2: Type it (White Card) */}
            <BtCard
              onClick={() => handleSelectMode('manual')}
              padding="28px 24px"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: 'var(--r-tile)',
                  background: 'var(--fill)',
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Keyboard size={26} strokeWidth={1.8} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--ink)',
                  }}
                >
                  Type it
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    color: 'var(--ink-3)',
                    marginTop: '4px',
                  }}
                >
                  Fill out transaction fields manually with itemized control.
                </div>
              </div>

              <ChevronRight size={20} color="var(--ink-3)" />
            </BtCard>
          </div>

          {/* Execution Context Selected Card */}
          {project && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--tone-green)',
                  marginBottom: '10px',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Execution Context Selected</span>
              </div>

              <BtCard padding="0" style={{ overflow: 'hidden' }}>
                {contextItems.map((item, idx) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      borderBottom: idx < contextItems.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--tone-green)',
                        width: '24px',
                      }}
                    >
                      0{idx + 1}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-3)',
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-ui)',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--ink)',
                          marginTop: '2px',
                        }}
                      >
                        {item.value}
                      </div>
                    </div>

                    <Check size={16} color="var(--tone-green)" />
                  </div>
                ))}
              </BtCard>
            </div>
          )}
        </div>
      </BtSheet>
    </div>
  );
}
