import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, typography } from '../styles/designTokens';
import Card from '../components/ui/Card';
import CsvImport from '../components/CsvImport';
import ModuleTour from '../components/ModuleTour';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AddEntryPage() {
  const navigate = useNavigate();
  const { can, isAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState(null);

  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-entry-selection', content: 'Select whether you are logging materials, labour, or equipment.', disableBeacon: true },
    { target: '.tour-bulk-csv', content: 'You can also bulk import entries by uploading a CSV file.' }
  ];

  const entryTypes = useMemo(() => {
    const types = [];
    if (isAdmin || can('manage_expenses') || can('add_entries')) {
      types.push({
        id: 'material',
        title: 'Material',
        subtitle: 'Log concrete, steel, lumber, or site-specific procurement items.',
        iconPath: 'M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8z',
        color: colors.primaryBlue,
      });
    }
    if (isAdmin || can('add_entries') || can('submit_daily_update')) {
      types.push({
        id: 'labour',
        title: 'Labour',
        subtitle: 'Track crew hours, specialized trade performance, and site presence.',
        iconPath: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
        color: colors.primaryBlue,
      });
    }
    if (isAdmin || can('manage_equipment_master')) {
      types.push({
        id: 'equipment',
        title: 'Equipment',
        subtitle: 'Record heavy machinery runtime, fuel logs, and maintenance events.',
        iconPath: 'M22 9V7h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2v-2h-2V9h2zm-4 10H4V5h14v14zM6 13h5v4H6v-4zm6-6h4v3h-4V7zM6 7h5v5H6V7zm6 4h4v6h-4v-6z',
        color: colors.primaryBlue,
      });
    }
    return types;
  }, [can, isAdmin]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setTimeout(() => {
      navigate(`/manualentry?type=${id}`);
    }, 200);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', minHeight: '100vh',
      fontFamily: typography.fontFamily, background: 'transparent',
    }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AddEntryPage" />
      <div style={{
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate(-1)}
          className="premium-topbar-btn"
          style={{
            width: 36, height: 36, borderRadius: 10, fontSize: 18,
          }}
          aria-label="Go Back"
        >
          &larr;
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.textPrimary }}>Add Entry</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.textLight }}>Record materials, labour, or equipment</p>
        </div>
        <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', marginLeft: 'auto' }}>
          <HelpCircle size={16} color={colors.textLight} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 100px', maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: 30, fontWeight: 900, color: colors.textPrimary,
            letterSpacing: '-0.6px', lineHeight: 1.15, marginBottom: 8,
          }}>
            What are you<br />adding?
          </h1>
          <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.5 }}>
            Select the entry type to log for the current shift.
          </p>
        </div>

        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.3px',
          color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase',
        }}>
          Entry Type
        </div>

        <div className="tour-entry-selection" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {entryTypes.map((type) => {
            const isSelected = selectedId === type.id;
            return (
              <Card
                key={type.id}
                hoverable
                onClick={() => handleSelect(type.id)}
                padding="16px"
                style={{
                  border: `1.5px solid ${isSelected ? type.color : '#E0E5FF'}`,
                  backgroundColor: isSelected ? '#F0F2FF' : '#F8F9FF',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    backgroundColor: `${type.color}10`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill={type.color}>
                      <path d={type.iconPath} />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: colors.textPrimary, marginBottom: 3 }}>
                      {type.title}
                    </h3>
                    <p style={{ fontSize: 13, lineHeight: 1.4, color: colors.textLight }}>
                      {type.subtitle}
                    </p>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" style={{ opacity: 0.5, flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="tour-bulk-csv">
          <CsvImport onComplete={() => window.location.reload()} />
        </div>
      </div>
    </div>
  );
}