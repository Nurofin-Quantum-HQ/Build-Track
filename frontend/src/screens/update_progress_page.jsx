import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, taskAPI } from '../api';
import { Toast } from '../components/Toast';
import { CheckCircle, Upload, Save, ChevronLeft } from 'lucide-react';
import { colors, radius, shadows, typography } from '../styles/designTokens';
import BtHero from '../components/ui/BtHero';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtButton from '../components/ui/BtButton';
import BtPressable from '../components/ui/BtPressable';

export default function UpdateProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefillProjectId = location.state?.projectId;
  const prefillTaskId = location.state?.taskId;

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(prefillProjectId || '');
  const [projectData, setProjectData] = useState(null);
  
  const [tasks, setTasks] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set(prefillTaskId ? [prefillTaskId] : []));
  
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [manualProgress, setManualProgress] = useState(0);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'info' });

  useEffect(() => {
    projectAPI.getAll().then(res => {
      const list = res.data?.projects || res.data || [];
      setProjects(list);
      if (list.length > 0 && !prefillProjectId) {
        setSelectedProjectId(list[0]._id || list[0].id);
      }
    }).catch(() => {});
    
    taskAPI.getDaily().then(res => {
      const list = res.data?.tasks || res.data || [];
      setTasks(list.filter(t => t.status !== 'Completed'));
    }).catch(() => {});
  }, [prefillProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      projectAPI.getById(selectedProjectId).then(res => {
        const data = res.data?.project || res.data;
        setProjectData(data);
        setManualProgress(data?.progress || 0);
        setSelectedPhaseId('');
        setSelectedActivityId('');
        setSelectedFloor('');
      }).catch(() => {});
    } else {
      setProjectData(null);
    }
  }, [selectedProjectId]);

  const handleToggleTask = (taskId) => {
    const newSet = new Set(completedTaskIds);
    if (newSet.has(taskId)) newSet.delete(taskId);
    else newSet.add(taskId);
    setCompletedTaskIds(newSet);
  };

  const handleSubmit = async () => {
    if (!selectedProjectId) return setToast({ msg: 'Select a project first', type: 'error' });
    setIsSubmitting(true);
    try {
      let updatedProject = { ...projectData };

      // Update selected activity if provided
      if (selectedActivityId && selectedPhaseId && updatedProject.selectedPhases) {
        updatedProject.selectedPhases = updatedProject.selectedPhases.map(p => {
          if (p.id !== selectedPhaseId) return p;
          return {
            ...p,
            activities: (p.activities || []).map(a => {
              if (a.id === selectedActivityId) {
                return {
                  ...a,
                  completed: true,
                  isCompleted: true,
                  status: 'Completed',
                  completedAt: new Date().toISOString(),
                  notes: notes || a.notes,
                  photo: photo || a.photo,
                };
              }
              return a;
            })
          };
        });
        
        let total = 0, completed = 0;
        updatedProject.selectedPhases.forEach(p => {
          (p.activities || []).forEach(a => {
            total++;
            if (a.completed || a.isCompleted || a.status === 'Completed') completed++;
          });
        });
        updatedProject.progress = total > 0 ? (completed / total) * 100 : 0;
      } else if (!selectedActivityId) {
        updatedProject.progress = Number(manualProgress) || 0;
      }

      for (let taskId of completedTaskIds) {
        await taskAPI.updateStatus(taskId, 'Completed');
      }

      await projectAPI.update(selectedProjectId, {
        selectedPhases: updatedProject.selectedPhases,
        progress: updatedProject.progress,
      });

      setToast({ msg: 'Progress updated successfully!', type: 'success' });
      setTimeout(() => navigate(-1), 1000);
    } catch (e) {
      setToast({ msg: 'Failed to update progress', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const phases = projectData?.selectedPhases || [];
  const selectedPhase = phases.find(p => p.id === selectedPhaseId);
  const activities = selectedPhase?.activities || [];
  const floors = projectData?.floors?.length ? projectData.floors : ['Basement', 'Ground Floor', '1st Floor', '2nd Floor', 'Terrace'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-ground, #F2F0EB)' }}>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'info' })} />

      {/* ── HERO BANNER (Blueprint Noir) ── */}
      <BtHero>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <BtPressable
                onClick={() => navigate(-1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'rgba(255, 255, 255, 0.72)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </BtPressable>
              <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>/</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--gold-brass)',
                  fontWeight: 700,
                }}
              >
                FIELD OPERATIONS · DAILY LOG
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 32,
                fontWeight: 700,
                color: 'var(--bone)',
                margin: '0 0 6px',
                letterSpacing: '-0.02em',
              }}
            >
              Update Progress
            </h1>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.65)',
                margin: 0,
                fontSize: 14,
                maxWidth: 580,
                lineHeight: 1.5,
              }}
            >
              Log daily site progress, floor activities, completed task checklists, and site photos.
            </p>
          </div>
        </div>
      </BtHero>

      {/* ── MAIN CONTENT (Overlapping BtSheet) ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

      <div style={{ background: '#fff', borderRadius: radius.lg, padding: 24, boxShadow: shadows.sm, marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Project</label>
          <select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15 }}
          >
            <option value="">Select Project</option>
            {projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.projectName}</option>)}
          </select>
        </div>

        {projectData && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Floor / Zone (Optional)</label>
              <select 
                value={selectedFloor} 
                onChange={(e) => setSelectedFloor(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15 }}
              >
                <option value="">Select Floor or Zone</option>
                {floors.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Phase</label>
              <select 
                value={selectedPhaseId} 
                onChange={(e) => { setSelectedPhaseId(e.target.value); setSelectedActivityId(''); }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15 }}
              >
                <option value="">Select Phase</option>
                {phases.map(p => <option key={p.id} value={p.id}>{p.phaseName || p.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Activity</label>
              <select 
                value={selectedActivityId} 
                onChange={(e) => setSelectedActivityId(e.target.value)}
                disabled={!selectedPhaseId}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15, background: !selectedPhaseId ? '#f8fafc' : '#fff' }}
              >
                <option value="">Select Activity</option>
                {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {!selectedActivityId && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Overall Project Progress (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={manualProgress} 
                    onChange={(e) => setManualProgress(e.target.value)}
                    style={{ flex: 1, accentColor: 'var(--ink, #111317)' }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--ink, #111317)', width: 40 }}>{Number(manualProgress).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: radius.lg, padding: 24, boxShadow: shadows.sm, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: colors.textPrimary }}>Daily Tasks</h3>
        {tasks.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>No pending tasks available.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map(t => (
              <div 
                key={t._id} 
                onClick={() => handleToggleTask(t._id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, padding: 16, 
                  border: `1px solid ${completedTaskIds.has(t._id) ? 'var(--ink, #111317)' : '#e5e7eb'}`, 
                  borderRadius: 12, cursor: 'pointer',
                  background: completedTaskIds.has(t._id) ? `${'var(--ink, #111317)'}10` : '#fff'
                }}
              >
                <div style={{ color: completedTaskIds.has(t._id) ? 'var(--ink, #111317)' : '#cbd5e1' }}>
                  <CheckCircle size={24} fill={completedTaskIds.has(t._id) ? "currentColor" : "none"} color={completedTaskIds.has(t._id) ? "#fff" : "currentColor"} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: colors.textPrimary }}>{t.title}</div>
                  {t.description && <div style={{ fontSize: 13, color: colors.textSecondary }}>{t.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: radius.lg, padding: 24, boxShadow: shadows.sm, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: colors.textPrimary }}>Daily Remarks & Attachments</h3>
        <textarea 
          placeholder="Enter progress details..." 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ width: '100%', padding: '16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15, minHeight: 100, resize: 'vertical', marginBottom: 16 }}
        />
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer', width: 'fit-content', color: colors.textSecondary, fontWeight: 500, fontSize: 14 }}>
            <Upload size={18} />
            <span>{photo ? 'Photo attached' : 'Attach Site Photo'}</span>
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setPhoto(reader.result);
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
          <BtButton
            variant="primary"
            size="lg"
            loading={isSubmitting}
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ width: '100%', height: 48 }}
          >
            <Save size={18} />
            <span>{isSubmitting ? 'Saving...' : (selectedActivityId ? 'Mark as Done & Submit' : 'Submit Progress Update')}</span>
          </BtButton>
        </div>
      </div>
    </BtSheet>
  </div>
  );
}
