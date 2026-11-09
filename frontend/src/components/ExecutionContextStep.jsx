import { useState } from 'react';
import { Building2, ChevronRight, MapPin, Layers, Hammer } from 'lucide-react';
import { ACTIVITY_OPTIONS, PHASE_OPTIONS } from '../utils/voiceConstants';
import { BtCard, BtButton, BtSelect } from './ui';

export default function ExecutionContextStep({ projects, onComplete, onCancel }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [floor, setFloor] = useState('');
  const [phase, setPhase] = useState('');
  const [activity, setActivity] = useState('');
  const [showError, setShowError] = useState(false);

  const projectFloors = selectedProject?.floors || [];
  const hasFloors = projectFloors.length > 0;

  const handleComplete = () => {
    if (!selectedProject) {
      setShowError(true);
      return;
    }
    onComplete({
      project: selectedProject,
      floor: floor || null,
      phase: phase || null,
      activity: activity || null,
    });
  };

  return (
    <BtCard padding="28px" style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--r-tile)',
            background: 'var(--fill)',
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Building2 size={22} strokeWidth={1.75} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Set entry context
          </h2>
          <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Choose the project and where on site the work happened. These pre-fill your voice entry.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <BtSelect
          label="Project"
          required
          icon={Building2}
          value={selectedProject?._id || ''}
          error={showError && !selectedProject ? 'Select a project to continue' : undefined}
          onChange={(e) => {
            const p = (projects || []).find((x) => x._id === e.target.value) || null;
            setSelectedProject(p);
            setFloor('');
            setShowError(false);
          }}
        >
          <option value="">Select project</option>
          {(projects || []).map((p, i) => (
            <option key={p._id || i} value={p._id}>
              {p.projectName || p.name}
              {p.location ? ` · ${p.location}` : ''}
            </option>
          ))}
        </BtSelect>
        {(!projects || projects.length === 0) && (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-3)', marginTop: -8 }}>No projects available</div>
        )}

        <div className="bt-grid-2">
          <BtSelect
            label="Floor / level"
            icon={MapPin}
            disabled={!selectedProject || !hasFloors}
            value={floor}
            helperText={selectedProject && !hasFloors ? 'This project has no floors set up' : undefined}
            onChange={(e) => setFloor(e.target.value)}
          >
            <option value="">{selectedProject ? 'No floor' : 'Pick a project first'}</option>
            {projectFloors.map((f) => {
              const fName = typeof f === 'string' ? f : f.name;
              return (
                <option key={fName} value={fName}>
                  {fName}
                </option>
              );
            })}
          </BtSelect>

          <BtSelect label="Phase" icon={Layers} value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="">No phase</option>
            {PHASE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </BtSelect>
        </div>

        <BtSelect label="Activity" icon={Hammer} value={activity} onChange={(e) => setActivity(e.target.value)}>
          <option value="">No activity</option>
          {ACTIVITY_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </BtSelect>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
        {onCancel && (
          <BtButton variant="secondary" onClick={onCancel} style={{ flex: '1 1 120px' }}>
            Cancel
          </BtButton>
        )}
        <BtButton variant="primary" trailingIcon={ChevronRight} onClick={handleComplete} style={{ flex: '2 1 200px' }}>
          Continue
        </BtButton>
      </div>
    </BtCard>
  );
}
