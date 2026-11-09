import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useProjectStore from '../stores/projectStore';
import {
  BtHero,
  BtSheet,
  BtCard,
  BtTypeTile,
  BtSectionHeader,
  BtPageHeader,
  BtIconButton,
} from '../components/ui';
import CsvImport from '../components/CsvImport';
import ModuleTour from '../components/ModuleTour';
import { Mic, Keyboard, ChevronRight, HelpCircle, Check } from 'lucide-react';

const TYPE_COLOR = {
  material: 'var(--type-material)',
  labour: 'var(--type-labour)',
  equipment: 'var(--type-equipment)',
};

export default function AddEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can, isAdmin } = useAuth();
  const { selectedProject } = useProjectStore();
  const project = location.state?.project || selectedProject || null;

  const [selectedType, setSelectedType] = useState('material');
  const [runTour, setRunTour] = useState(false);

  const tourSteps = [
    {
      target: '.tour-entry-selection',
      content: 'Select whether you are logging materials, labour, or equipment.',
      disableBeacon: true,
    },
    {
      target: '.tour-mode-selection',
      content: 'Choose how to add it: speak it with AI Foreman or type it manually.',
    },
    {
      target: '.tour-bulk-csv',
      content: 'You can also bulk import entries by uploading a CSV file.',
    },
  ];

  const entryTypes = useMemo(() => {
    const types = [];
    if (isAdmin || can('manage_expenses') || can('add_entries')) {
      types.push({
        id: 'material',
        title: 'Material',
        subtitle: 'Cement, steel, sand and other site procurement.',
      });
    }
    if (isAdmin || can('add_entries') || can('submit_daily_update')) {
      types.push({
        id: 'labour',
        title: 'Labour',
        subtitle: 'Crew hours, trades and site presence.',
      });
    }
    if (isAdmin || can('manage_equipment_master')) {
      types.push({
        id: 'equipment',
        title: 'Equipment',
        subtitle: 'Machinery runtime, fuel and maintenance.',
      });
    }
    return types;
  }, [can, isAdmin]);

  // If the chosen type is not allowed for this role, fall back to the first allowed one.
  const activeType = entryTypes.some((t) => t.id === selectedType) ? selectedType : entryTypes[0]?.id;

  const handleProceed = (mode, typeId = activeType) => {
    if (mode === 'voice') {
      navigate('/voice', { state: { project, type: typeId } });
    } else {
      navigate(`/manualentry?type=${typeId}`, { state: { project } });
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AddEntryPage" />

      <BtHero>
        <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
          <BtPageHeader
            back={{ label: 'Back', onClick: () => navigate(-1) }}
            eyebrow="Add entry · Step 1 of 2"
            title="What are you adding?"
            subtitle="Pick the entry type, then choose how you want to record it."
            size="md"
            actions={<BtIconButton icon={HelpCircle} label="Page tour" onDark onClick={() => setRunTour(true)} />}
          />
        </div>
      </BtHero>

      <BtSheet padding="28px 28px 64px">
        <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Entry type */}
          <section aria-labelledby="entry-type-heading">
            <BtSectionHeader title={<span id="entry-type-heading">Entry type</span>} />
            <div
              className="tour-entry-selection bt-grid-3"
              role="radiogroup"
              aria-label="Entry type"
              style={{ alignItems: 'stretch' }}
            >
              {entryTypes.map((type) => {
                const isSelected = activeType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedType(type.id)}
                    className="bt-hover-card"
                    style={{
                      font: 'inherit',
                      margin: 0,
                      width: '100%',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      minHeight: 168,
                      padding: 20,
                      borderRadius: 'var(--r-card)',
                      background: 'var(--card)',
                      border: `2px solid ${isSelected ? 'var(--ink)' : 'var(--line)'}`,
                      boxShadow: isSelected ? '0 0 0 4px var(--accent-soft), var(--shadow-card)' : 'var(--shadow-card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <BtTypeTile type={type.id} size={46} />
                      <span
                        aria-hidden="true"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 'var(--r-full)',
                          border: isSelected ? 'none' : '1.5px solid var(--input-border)',
                          background: isSelected ? 'var(--ink)' : 'transparent',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <Check size={15} strokeWidth={3} />}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: TYPE_COLOR[type.id],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                          {type.title}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.45 }}>
                        {type.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Mode */}
          <section className="tour-mode-selection" aria-labelledby="entry-mode-heading">
            <BtSectionHeader title={<span id="entry-mode-heading">How do you want to add it?</span>} />
            <div className="bt-grid-2" style={{ alignItems: 'stretch' }}>
              <button
                type="button"
                onClick={() => handleProceed('voice')}
                className="bt-hover-card"
                style={{
                  font: 'inherit',
                  margin: 0,
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  minHeight: 112,
                  textAlign: 'left',
                  padding: 24,
                  borderRadius: 'var(--r-card)',
                  background: 'var(--ink)',
                  border: '1px solid var(--ink)',
                  color: 'var(--on-noir)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <span
                  style={{
                    width: 54,
                    height: 54,
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
                onClick={() => handleProceed('manual')}
                className="bt-hover-card"
                style={{
                  font: 'inherit',
                  margin: 0,
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  minHeight: 112,
                  textAlign: 'left',
                  padding: 24,
                  borderRadius: 'var(--r-card)',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <span
                  style={{
                    width: 54,
                    height: 54,
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
                    Fill in the form yourself with full control over every field.
                  </span>
                </span>
                <ChevronRight size={20} color="var(--ink-3)" />
              </button>
            </div>
          </section>

          {/* Bulk import */}
          <section className="tour-bulk-csv" aria-labelledby="entry-bulk-heading">
            <BtSectionHeader title={<span id="entry-bulk-heading">Bulk import via spreadsheet</span>} />
            <BtCard padding="24px">
              <CsvImport />
            </BtCard>
          </section>
        </div>
      </BtSheet>
    </div>
  );
}
