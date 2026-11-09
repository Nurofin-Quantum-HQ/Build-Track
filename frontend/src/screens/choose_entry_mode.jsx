import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BtHero,
  BtSheet,
  BtCard,
  BtBadge,
  BtPageHeader,
  BtSectionHeader,
} from '../components/ui';
import { Mic, Keyboard, ChevronRight, Building2, Layers, ClipboardList, Hammer, Check } from 'lucide-react';

const TYPE_LABELS = {
  material: 'Material',
  labour: 'Labour',
  equipment: 'Equipment',
};

export default function ChooseEntryMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const project = state.project || null;
  const entryType = TYPE_LABELS[state.type] ? state.type : 'material';
  const typeLabel = TYPE_LABELS[entryType];
  const projectName = project?.projectName || project?.name || '';

  const handleSelectMode = (mode) => {
    if (mode === 'voice') {
      navigate('/voice', { state: { project, type: entryType } });
    } else {
      navigate(`/manualentry?type=${entryType}`, { state: { project } });
    }
  };

  // Only show what was actually chosen; never invent a floor, phase or activity.
  const contextItems = [
    projectName && { label: 'Project', value: projectName, icon: Building2 },
    state.floor && { label: 'Floor', value: state.floor, icon: Layers },
    state.phase && { label: 'Phase', value: state.phase, icon: ClipboardList },
    state.activity && { label: 'Activity', value: state.activity, icon: Hammer },
  ].filter(Boolean);

  const cardBase = {
    font: 'inherit',
    margin: 0,
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    minHeight: 124,
    padding: '26px 24px',
    borderRadius: 'var(--r-card)',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: 'var(--shadow-card)',
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <BtHero>
        <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
          <BtPageHeader
            back={{ label: 'Back', onClick: () => navigate(-1) }}
            eyebrow="Entry mode · Step 2 of 2"
            title="How do you want to add it?"
            size="md"
            subtitle={
              projectName
                ? `Adding a ${typeLabel.toLowerCase()} entry to ${projectName}.`
                : `Adding a ${typeLabel.toLowerCase()} entry.`
            }
            meta={<BtBadge tone={entryType} label={typeLabel} />}
          />
        </div>
      </BtHero>

      <BtSheet padding="28px 28px 64px">
        <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div className="bt-grid-2" style={{ alignItems: 'stretch' }}>
            <button
              type="button"
              onClick={() => handleSelectMode('voice')}
              className="bt-hover-card"
              style={{ ...cardBase, background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--on-noir)' }}
            >
              <span
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 24px var(--accent-glow)',
                  flexShrink: 0,
                }}
              >
                <Mic size={26} strokeWidth={2} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Speak it
                </span>
                <span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--on-noir-2)', marginTop: 4, lineHeight: 1.45 }}>
                  Say it naturally. AI picks out the item, amounts and category.
                </span>
              </span>
              <ChevronRight size={20} color="var(--on-noir-3)" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectMode('manual')}
              className="bt-hover-card"
              style={{ ...cardBase, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              <span
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--r-tile)',
                  background: 'var(--fill)',
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Keyboard size={26} strokeWidth={1.75} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Type it
                </span>
                <span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.45 }}>
                  Fill in the form yourself with itemised control over every field.
                </span>
              </span>
              <ChevronRight size={20} color="var(--ink-3)" />
            </button>
          </div>

          {contextItems.length > 0 && (
            <section aria-labelledby="entry-context-heading">
              <BtSectionHeader title={<span id="entry-context-heading">Where this entry goes</span>} />
              <BtCard padding="0">
                {contextItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      style={{
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        borderBottom: idx < contextItems.length - 1 ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--r-chip)',
                          background: 'var(--fill)',
                          color: 'var(--ink)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={17} strokeWidth={1.85} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="bt-eyebrow" style={{ color: 'var(--ink-3)' }}>{item.label}</div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginTop: 2, overflowWrap: 'anywhere' }}>
                          {item.value}
                        </div>
                      </div>
                      <Check size={16} color="var(--status-success)" strokeWidth={2.4} aria-hidden="true" />
                    </div>
                  );
                })}
              </BtCard>
            </section>
          )}
        </div>
      </BtSheet>
    </div>
  );
}
