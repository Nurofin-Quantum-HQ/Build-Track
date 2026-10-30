import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useProjectStore from '../stores/projectStore';
import {
  BtHero,
  BtSheet,
  BtButton,
  BtCard,
  BtBadge,
  BtTile,
  BtTypeTile,
  BtSectionHeader,
  BtPressable,
} from '../components/ui';
import CsvImport from '../components/CsvImport';
import ModuleTour from '../components/ModuleTour';
import {
  Package,
  Users,
  Truck,
  ArrowLeft,
  Mic,
  Keyboard,
  ChevronRight,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function AddEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can, isAdmin } = useAuth();
  const { selectedProject } = useProjectStore();
  const project = location.state?.project || selectedProject || null;

  const [selectedType, setSelectedType] = useState('material');
  const [selectedMode, setSelectedMode] = useState(null);
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
        short: 'Cement, steel, sand, procurement',
        subtitle: 'Log concrete, steel, lumber, or site-specific procurement items.',
        icon: Package,
        tone: 'brand',
      });
    }
    if (isAdmin || can('add_entries') || can('submit_daily_update')) {
      types.push({
        id: 'labour',
        title: 'Labour',
        short: 'Masons, carpenters, crew hours',
        subtitle: 'Track crew hours, specialized trade performance, and site presence.',
        icon: Users,
        tone: 'green',
      });
    }
    if (isAdmin || can('manage_equipment_master')) {
      types.push({
        id: 'equipment',
        title: 'Equipment',
        short: 'Machinery, fuel, JCB, cranes',
        subtitle: 'Record heavy machinery runtime, fuel logs, and maintenance events.',
        icon: Truck,
        tone: 'amber',
      });
    }
    return types;
  }, [can, isAdmin]);

  const handleProceed = (mode, typeId = selectedType) => {
    if (mode === 'voice') {
      navigate('/voice', { state: { project, type: typeId } });
    } else {
      navigate(`/manualentry?type=${typeId}`, { state: { project } });
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AddEntryPage" />

      {/* ══════════════════════════════════════════════════════════
          HERO (Blueprint Noir Header)
         ══════════════════════════════════════════════════════════ */}
      <BtHero padding="28px 32px 56px">
        <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
          {/* Top navigation & help */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
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

            <button
              type="button"
              onClick={() => setRunTour(true)}
              title="Help Tour"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '18px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: 'var(--on-noir-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <HelpCircle size={16} />
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
            ADD ENTRY • STEP 1 OF 2
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
            What are you
            <br />
            adding?
          </h1>

          <p
            style={{
              margin: '8px 0 0',
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              color: 'var(--on-noir-2)',
            }}
          >
            Select the entry type to log for the current shift.
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
          {/* Entry Kind Tiles Row */}
          <div>
            <BtSectionHeader title="Select Entry Type" caption />
            <div
              className="tour-entry-selection"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px',
              }}
            >
              {entryTypes.map((type) => {
                const isSelected = selectedType === type.id;
                const Icon = type.icon;

                return (
                  <BtCard
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    padding="20px"
                    style={{
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--line)',
                      background: isSelected ? 'var(--card)' : 'var(--card)',
                      boxShadow: isSelected
                        ? '0 0 0 1px var(--accent), var(--shadow-card)'
                        : 'var(--shadow-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      transition: 'all 160ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <BtTypeTile type={type.id} size={46} />
                      {isSelected && (
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '12px',
                            background: 'var(--accent)',
                            color: 'var(--on-accent, #111317)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircle2 size={16} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '18px',
                          fontWeight: 800,
                          color: 'var(--ink)',
                        }}
                      >
                        {type.title}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-ui)',
                          fontSize: '12.5px',
                          color: 'var(--ink-3)',
                          marginTop: '4px',
                          lineHeight: 1.4,
                        }}
                      >
                        {type.subtitle}
                      </div>
                    </div>
                  </BtCard>
                );
              })}
            </div>
          </div>

          {/* Mode Selection Choice: Speak it vs Type it */}
          <div className="tour-mode-selection">
            <BtSectionHeader title="How do you want to add it?" caption />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Option 1: Speak it (Noir Ink Card with Pulsing Mic) */}
              <div
                onClick={() => handleProceed('voice')}
                style={{
                  background: 'var(--ink)',
                  borderRadius: 'var(--r-card)',
                  padding: '24px',
                  color: 'var(--bone)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
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
                    width: '52px',
                    height: '52px',
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
                      fontSize: '18px',
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
                      marginTop: '2px',
                    }}
                  >
                    Speak naturally — AI extracts amounts, item, and category.
                  </div>
                </div>

                <ChevronRight size={20} color="var(--on-noir-3)" />
              </div>

              {/* Option 2: Type it (Card with Keyboard) */}
              <BtCard
                onClick={() => handleProceed('manual')}
                padding="24px"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: 'var(--r-tile)',
                    background: 'var(--fill)',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Keyboard size={24} strokeWidth={1.8} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '18px',
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
                      marginTop: '2px',
                    }}
                  >
                    Fill in the form fields manually with full precision.
                  </div>
                </div>

                <ChevronRight size={20} color="var(--ink-3)" />
              </BtCard>
            </div>
          </div>

          {/* Bulk CSV Upload Card */}
          <div className="tour-bulk-csv">
            <BtSectionHeader title="Bulk Import via Spreadsheet" caption />
            <BtCard padding="20px">
              <CsvImport onComplete={() => window.location.reload()} />
            </BtCard>
          </div>
        </div>
      </BtSheet>
    </div>
  );
}
