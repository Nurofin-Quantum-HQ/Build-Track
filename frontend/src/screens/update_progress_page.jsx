import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projectAPI, taskAPI } from '../api';
import { Toast } from '../components/Toast';
import { CheckCircle2, Upload, Save, ListChecks } from 'lucide-react';
import {
  BtHero,
  BtSheet,
  BtPageHeader,
  BtCard,
  BtButton,
  BtSelect,
  BtTextarea,
  BtSectionHeader,
  BtEmpty,
} from '../components/ui';

export default function UpdateProgressPage() {
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
  const progressPct = Math.round(Number(manualProgress) || 0);

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'info' })} />

      <BtHero>
        <BtPageHeader
          back={{ label: 'Back', onClick: () => navigate(-1) }}
          eyebrow="Field operations"
          size="md"
          title="Update Progress"
          subtitle="Log daily site progress, floor activities, completed tasks and site photos."
        />
      </BtHero>

      <BtSheet>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <BtCard padding="20px">
            <BtSectionHeader title="Where is the work?" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <BtSelect label="Project" required value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                <option value="">Select project</option>
                {projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.projectName}</option>)}
              </BtSelect>

              {projectData && (
                <>
                  <div className="bt-grid-2">
                    <BtSelect label="Floor / zone (optional)" value={selectedFloor} onChange={(e) => setSelectedFloor(e.target.value)}>
                      <option value="">Select floor or zone</option>
                      {floors.map(f => <option key={f} value={f}>{f}</option>)}
                    </BtSelect>
                    <BtSelect
                      label="Phase"
                      value={selectedPhaseId}
                      onChange={(e) => { setSelectedPhaseId(e.target.value); setSelectedActivityId(''); }}
                    >
                      <option value="">Select phase</option>
                      {phases.map(p => <option key={p.id} value={p.id}>{p.phaseName || p.name}</option>)}
                    </BtSelect>
                  </div>

                  <BtSelect
                    label="Activity"
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    disabled={!selectedPhaseId}
                    helperText={!selectedPhaseId ? 'Choose a phase first.' : 'Submitting will mark this activity as done.'}
                  >
                    <option value="">Select activity</option>
                    {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </BtSelect>

                  {!selectedActivityId && (
                    <div>
                      <label
                        htmlFor="overall-progress"
                        style={{ display: 'block', marginBottom: 8, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}
                      >
                        Overall project progress
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <input
                          id="overall-progress"
                          type="range"
                          min="0"
                          max="100"
                          value={manualProgress}
                          onChange={(e) => setManualProgress(e.target.value)}
                          style={{ flex: 1, accentColor: 'var(--accent)', height: 32 }}
                        />
                        <span className="tnum" style={{ minWidth: 56, textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
                          {progressPct}%
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </BtCard>

          <BtCard padding="20px">
            <BtSectionHeader title="Daily tasks" />
            {tasks.length === 0 ? (
              <BtEmpty icon={ListChecks} title="No pending tasks" message="Tasks assigned for today will show up here to tick off." style={{ padding: '24px 16px' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tasks.map(t => {
                  const done = completedTaskIds.has(t._id);
                  return (
                    <button
                      key={t._id}
                      type="button"
                      role="checkbox"
                      aria-checked={done}
                      onClick={() => handleToggleTask(t._id)}
                      className="bt-hover-row"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, minHeight: 60, padding: '12px 16px', textAlign: 'left',
                        border: `1px solid ${done ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 'var(--r-tile)', cursor: 'pointer',
                        background: done ? 'var(--accent-soft)' : 'var(--card)', fontFamily: 'var(--font-ui)', width: '100%',
                      }}
                    >
                      <CheckCircle2 size={24} strokeWidth={1.9} color={done ? 'var(--ink)' : 'var(--input-border)'} style={{ flexShrink: 0 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{t.title}</span>
                        {t.description && <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{t.description}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </BtCard>

          <BtCard padding="20px">
            <BtSectionHeader title="Daily remarks & attachments" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <BtTextarea label="Remarks" placeholder="Enter progress details…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <label
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 16px', background: 'var(--fill)',
                    border: '1px dashed var(--input-border)', borderRadius: 'var(--r-tile)', cursor: 'pointer', color: 'var(--ink)',
                    fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14,
                  }}
                >
                  <Upload size={18} />
                  <span>{photo ? 'Replace site photo' : 'Attach site photo'}</span>
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
                {photo && (
                  <img src={photo} alt="Attached site" style={{ width: 56, height: 56, borderRadius: 'var(--r-tile)', objectFit: 'cover', border: '1px solid var(--line)' }} />
                )}
              </div>
            </div>
          </BtCard>

          <BtButton variant="primary" fullWidth loading={isSubmitting} onClick={handleSubmit} icon={Save}>
            {selectedActivityId ? 'Mark as Done & Submit' : 'Submit Progress Update'}
          </BtButton>
        </div>
      </BtSheet>
    </div>
  );
}
