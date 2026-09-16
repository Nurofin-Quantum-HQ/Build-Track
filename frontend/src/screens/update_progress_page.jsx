import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, taskAPI } from '../api';
import { Toast } from '../components/Toast';
import { CheckCircle, Upload, Save, ChevronLeft } from 'lucide-react';
import { colors, radius, shadows, typography } from '../styles/designTokens';

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
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: typography.fontFamily }}>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'info' })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: colors.textPrimary }}>Update Progress</h1>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: 14 }}>Log daily progress and mark tasks as complete.</p>
        </div>
      </div>

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
                    style={{ flex: 1, accentColor: colors.primary }}
                  />
                  <span style={{ fontWeight: 600, color: colors.primary, width: 40 }}>{Number(manualProgress).toFixed(0)}%</span>
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
                  border: `1px solid ${completedTaskIds.has(t._id) ? colors.primary : '#e5e7eb'}`, 
                  borderRadius: 12, cursor: 'pointer',
                  background: completedTaskIds.has(t._id) ? `${colors.primary}10` : '#fff'
                }}
              >
                <div style={{ color: completedTaskIds.has(t._id) ? colors.primary : '#cbd5e1' }}>
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

      <button 
        onClick={handleSubmit} 
        disabled={isSubmitting}
        style={{ width: '100%', padding: '16px', borderRadius: 12, background: colors.primary, color: '#fff', fontSize: 16, fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Save size={20} />
        {isSubmitting ? 'Saving...' : (selectedActivityId ? 'Mark as Done & Submit' : 'Submit Progress Update')}
      </button>
    </div>
  );
}
