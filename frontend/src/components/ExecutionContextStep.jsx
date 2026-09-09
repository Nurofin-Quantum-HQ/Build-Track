import { useState } from 'react';
import { Building, ChevronDown, ChevronRight, MapPin, Layers, Hammer } from 'lucide-react';
import { ACTIVITY_OPTIONS, PHASE_OPTIONS } from '../utils/voiceConstants';

const FLOOR_OPTIONS = [
  'Basement', 'Ground', '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th',
];

export default function ExecutionContextStep({ projects, onComplete, onCancel }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [floor, setFloor] = useState('');
  const [phase, setPhase] = useState('');
  const [activity, setActivity] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const [showPhaseDropdown, setShowPhaseDropdown] = useState(false);
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);

  const handleComplete = () => {
    onComplete({
      project: selectedProject,
      floor: floor || null,
      phase: phase || null,
      activity: activity || null,
    });
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: 600,
      margin: '0 auto',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #FFF5F0 0%, #FFF7F0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Building size={28} color="#F97316" />
        </div>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#1F2937',
          margin: '0 0 8px',
        }}>
          Set Entry Context
        </h2>
        <p style={{
          fontSize: 13,
          color: '#6B7280',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Select project and location details. These will pre-fill your voice entries.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          <Building size={14} color="#6B7280" /> Project *
        </label>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowProjectDropdown(!showProjectDropdown); setShowFloorDropdown(false); setShowPhaseDropdown(false); setShowActivityDropdown(false); }}
            style={dropdownBtnStyle}
          >
            <span style={{ color: selectedProject ? '#1F2937' : '#9CA3AF' }}>
              {selectedProject?.projectName || selectedProject?.name || 'Select project...'}
            </span>
            <ChevronDown size={16} color="#6B7280" />
          </button>
          {showProjectDropdown && (
            <div style={dropdownListStyle}>
              {(projects || []).map((p, i) => (
                <div
                  key={p._id || i}
                  onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }}
                  style={{
                    ...dropdownItemStyle,
                    background: selectedProject?._id === p._id ? '#FFF5F0' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1F2937' }}>
                    {p.projectName || p.name}
                  </div>
                  {p.location && (
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{p.location}</div>
                  )}
                </div>
              ))}
              {(!projects || projects.length === 0) && (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                  No projects available
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          <MapPin size={14} color="#6B7280" /> Floor / Level
        </label>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowFloorDropdown(!showFloorDropdown); setShowProjectDropdown(false); setShowPhaseDropdown(false); setShowActivityDropdown(false); }}
            style={dropdownBtnStyle}
          >
            <span style={{ color: floor ? '#1F2937' : '#9CA3AF' }}>
              {floor || 'Select floor...'}
            </span>
            <ChevronDown size={16} color="#6B7280" />
          </button>
          {showFloorDropdown && (
            <div style={dropdownListStyle}>
              <div
                onClick={() => { setFloor(''); setShowFloorDropdown(false); }}
                style={{ ...dropdownItemStyle, color: '#9CA3AF', fontStyle: 'italic' }}
              >
                None
              </div>
              {FLOOR_OPTIONS.map(f => (
                <div
                  key={f}
                  onClick={() => { setFloor(f); setShowFloorDropdown(false); }}
                  style={{
                    ...dropdownItemStyle,
                    background: floor === f ? '#FFF5F0' : 'transparent',
                  }}
                >
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          <Layers size={14} color="#6B7280" /> Phase
        </label>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowPhaseDropdown(!showPhaseDropdown); setShowProjectDropdown(false); setShowFloorDropdown(false); setShowActivityDropdown(false); }}
            style={dropdownBtnStyle}
          >
            <span style={{ color: phase ? '#1F2937' : '#9CA3AF' }}>
              {phase || 'Select phase...'}
            </span>
            <ChevronDown size={16} color="#6B7280" />
          </button>
          {showPhaseDropdown && (
            <div style={dropdownListStyle}>
              <div
                onClick={() => { setPhase(''); setShowPhaseDropdown(false); }}
                style={{ ...dropdownItemStyle, color: '#9CA3AF', fontStyle: 'italic' }}
              >
                None
              </div>
              {PHASE_OPTIONS.map(p => (
                <div
                  key={p}
                  onClick={() => { setPhase(p); setShowPhaseDropdown(false); }}
                  style={{
                    ...dropdownItemStyle,
                    background: phase === p ? '#FFF5F0' : 'transparent',
                  }}
                >
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>
          <Hammer size={14} color="#6B7280" /> Activity
        </label>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowActivityDropdown(!showActivityDropdown); setShowProjectDropdown(false); setShowFloorDropdown(false); setShowPhaseDropdown(false); }}
            style={dropdownBtnStyle}
          >
            <span style={{ color: activity ? '#1F2937' : '#9CA3AF' }}>
              {activity || 'Select activity...'}
            </span>
            <ChevronDown size={16} color="#6B7280" />
          </button>
          {showActivityDropdown && (
            <div style={{ ...dropdownListStyle, maxHeight: 240, overflowY: 'auto' }}>
              <div
                onClick={() => { setActivity(''); setShowActivityDropdown(false); }}
                style={{ ...dropdownItemStyle, color: '#9CA3AF', fontStyle: 'italic' }}
              >
                None
              </div>
              {ACTIVITY_OPTIONS.map(a => (
                <div
                  key={a}
                  onClick={() => { setActivity(a); setShowActivityDropdown(false); }}
                  style={{
                    ...dropdownItemStyle,
                    background: activity === a ? '#FFF5F0' : 'transparent',
                  }}
                >
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              border: '1.5px solid #E5E7EB',
              background: '#FFFFFF',
              color: '#6B7280',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleComplete}
          disabled={!selectedProject}
          style={{
            flex: 2,
            height: 44,
            borderRadius: 12,
            border: 'none',
            background: selectedProject
              ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
              : '#E5E7EB',
            color: selectedProject ? '#FFFFFF' : '#9CA3AF',
            fontSize: 14,
            fontWeight: 600,
            cursor: selectedProject ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Continue
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.3px',
  marginBottom: 6,
  textTransform: 'uppercase',
};

const dropdownBtnStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255, 255, 255, 0.45)',
  background: 'rgba(255, 255, 255, 0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 4px 10px rgba(15, 23, 42, 0.02)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
  outline: 'none',
  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
};

const dropdownListStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 4,
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.55)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-md)',
  zIndex: 50,
  maxHeight: 200,
  overflowY: 'auto',
};

const dropdownItemStyle = {
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 500,
  color: '#1F2937',
  cursor: 'pointer',
  borderBottom: '1px solid #F3F4F6',
  transition: 'background 0.15s',
};
