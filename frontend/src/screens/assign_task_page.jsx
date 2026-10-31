import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Building2,
  Layers,
  ListTodo,
  UserCheck,
  ChevronRight,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import { projectAPI, authAPI, taskAPI } from '../api';
import ModuleTour from '../components/ModuleTour';
import BtHero from '../components/ui/BtHero';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtButton from '../components/ui/BtButton';
import BtPressable from '../components/ui/BtPressable';
import BtBadge from '../components/ui/BtBadge';
import { Toast } from '../components/Toast';

export default function AssignTaskPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [runTour, setRunTour] = useState(false);
  const [toast, setToast] = useState(null);

  const tourSteps = [
    { target: '.tour-project', content: 'Select the project this task belongs to.' },
    { target: '.tour-floor', content: 'Select the target floor for this activity.' },
    { target: '.tour-phase-activity', content: 'Choose the relevant construction phase and activity.' },
    { target: '.tour-title', content: 'Enter a clear, concise title for the task.' },
    { target: '.tour-desc', content: 'Provide additional instructions or specifications.' },
    { target: '.tour-assignee', content: 'Select the team member or worker responsible for this task.' },
    { target: '.tour-submit', content: 'Click here to dispatch and assign the task.' },
  ];

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    project: '',
    title: '',
    description: '',
    assignedTo: '',
    floorId: '',
    floorName: '',
    phaseId: '',
    phaseName: '',
    activityId: '',
    activityName: '',
  });

  useEffect(() => {
    setFetching(true);
    Promise.all([
      projectAPI.getAll().catch(() => ({ data: { projects: [] } })),
      authAPI.getUsers().catch(() => ({ data: [] }))
    ])
      .then(([projRes, userRes]) => {
        setProjects(projRes.data?.projects || projRes.data || []);
        setUsers(userRes.data?.users || userRes.data || []);
      })
      .finally(() => {
        setFetching(false);
      });
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProjectChange = (e) => {
    setFormData({
      ...formData,
      project: e.target.value,
      floorId: '',
      floorName: '',
      phaseId: '',
      phaseName: '',
      activityId: '',
      activityName: '',
    });
  };

  const handleFloorChange = (e) => {
    setFormData({
      ...formData,
      floorId: e.target.value,
      floorName: e.target.value,
      phaseId: '',
      phaseName: '',
      activityId: '',
      activityName: '',
    });
  };

  const handlePhaseChange = (e) => {
    const pId = e.target.value;
    const selectedProj = projects.find((p) => (p._id || p.id) === formData.project);
    const phase = selectedProj?.selectedPhases?.find((p) => (p._id || p.id) === pId);
    setFormData({
      ...formData,
      phaseId: pId,
      phaseName: phase?.phaseName || phase?.name || '',
      activityId: '',
      activityName: '',
    });
  };

  const handleActivityChange = (e) => {
    const aId = e.target.value;
    const selectedProj = projects.find((p) => (p._id || p.id) === formData.project);
    const phase = selectedProj?.selectedPhases?.find((p) => (p._id || p.id) === formData.phaseId);
    const activity = phase?.activities?.find((a) => (a._id || a.id) === aId);
    setFormData({
      ...formData,
      activityId: aId,
      activityName: activity?.name || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project || !formData.floorId || !formData.phaseId || !formData.activityId || !formData.title || !formData.assignedTo) {
      setToast({
        type: 'error',
        message: 'Please fill all required fields: Project, Floor, Phase, Activity, Title, and Assignee.',
        key: Date.now(),
      });
      return;
    }

    setLoading(true);
    try {
      await taskAPI.createTask(formData);
      setToast({
        type: 'success',
        message: 'Task successfully assigned to worker!',
        key: Date.now(),
      });
      setTimeout(() => {
        navigate(-1);
      }, 700);
    } catch (error) {
      console.error(error);
      setToast({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to assign task. Please try again.',
        key: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find((p) => (p._id || p.id) === formData.project);
  const floors = selectedProject?.floors || [];
  const phases = selectedProject?.selectedPhases || [];
  const selectedPhaseObj = phases.find((p) => (p._id || p.id) === formData.phaseId);
  const activities = selectedPhaseObj?.activities || [];

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 'var(--r-input, 12px)',
    border: '1px solid var(--border)',
    background: '#FFFFFF',
    color: 'var(--ink)',
    fontSize: 14,
    fontWeight: 500,
    outline: 'none',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--ink)',
    letterSpacing: '-0.01em',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-ground)' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} />}
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AssignTaskPage" />

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
                <ArrowLeft size={16} />
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
                WORKFORCE TASKING
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
              Assign Task
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
              Dispatch daily tasks, floor activities, and responsibilities to on-site workforce.
            </p>
          </div>

          <button
            onClick={() => setRunTour(true)}
            title="Help Tour"
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--r-btn, 12px)',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--bone)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <HelpCircle size={17} />
          </button>
        </div>
      </BtHero>

      {/* ── MAIN SHEET ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Scope / Location Card */}
            <BtCard padding={24} style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                <Building2 size={18} color="var(--ink)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  Location & Construction Scope
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Project Selector */}
                <div className="tour-project">
                  <label style={labelStyle}>
                    Project <span style={{ color: 'var(--rose-ember)' }}>*</span>
                  </label>
                  <select
                    name="project"
                    value={formData.project}
                    onChange={handleProjectChange}
                    style={inputStyle}
                    disabled={fetching}
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.projectName || p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Floor Selector */}
                <div className="tour-floor">
                  <label style={labelStyle}>
                    Floor / Level <span style={{ color: 'var(--rose-ember)' }}>*</span>
                  </label>
                  <select
                    name="floorId"
                    value={formData.floorId}
                    onChange={handleFloorChange}
                    style={{
                      ...inputStyle,
                      background: !formData.project ? 'var(--surface-sunken)' : '#FFFFFF',
                      cursor: !formData.project ? 'not-allowed' : 'default',
                    }}
                    disabled={!formData.project}
                  >
                    <option value="">{formData.project ? 'Select Floor' : 'Select a project first'}</option>
                    {floors.map((f, i) => (
                      <option key={i} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                {/* Phase & Activity Cascading Selectors */}
                <div className="tour-phase-activity" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>
                      Phase <span style={{ color: 'var(--rose-ember)' }}>*</span>
                    </label>
                    <select
                      name="phaseId"
                      value={formData.phaseId}
                      onChange={handlePhaseChange}
                      style={{
                        ...inputStyle,
                        background: !formData.project ? 'var(--surface-sunken)' : '#FFFFFF',
                        cursor: !formData.project ? 'not-allowed' : 'default',
                      }}
                      disabled={!formData.project}
                    >
                      <option value="">{formData.project ? 'Select Phase' : 'Select project first'}</option>
                      {phases.map((p) => (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {p.phaseName || p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Activity <span style={{ color: 'var(--rose-ember)' }}>*</span>
                    </label>
                    <select
                      name="activityId"
                      value={formData.activityId}
                      onChange={handleActivityChange}
                      style={{
                        ...inputStyle,
                        background: !formData.phaseId ? 'var(--surface-sunken)' : '#FFFFFF',
                        cursor: !formData.phaseId ? 'not-allowed' : 'default',
                      }}
                      disabled={!formData.phaseId}
                    >
                      <option value="">{formData.phaseId ? 'Select Activity' : 'Select phase first'}</option>
                      {activities.map((a) => (
                        <option key={a._id || a.id} value={a._id || a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Scope breadcrumb summary */}
                {formData.project && formData.floorId && formData.phaseName && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 6,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'var(--surface-sunken)',
                      border: '1px dashed var(--border)',
                      fontSize: 12,
                      color: 'var(--ink-secondary)',
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Selected Path:</span>
                    <span>{selectedProject?.projectName || selectedProject?.name}</span>
                    <ChevronRight size={13} />
                    <span>{formData.floorId}</span>
                    <ChevronRight size={13} />
                    <span>{formData.phaseName}</span>
                    {formData.activityName && (
                      <>
                        <ChevronRight size={13} />
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{formData.activityName}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </BtCard>

            {/* Task Specification Card */}
            <BtCard padding={24} style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                <ListTodo size={18} color="var(--ink)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  Task Details
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="tour-title">
                  <label style={labelStyle}>
                    Task Title <span style={{ color: 'var(--rose-ember)' }}>*</span>
                  </label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Lay 400 AAC blocks on north perimeter wall"
                    style={inputStyle}
                  />
                </div>

                <div className="tour-desc">
                  <label style={labelStyle}>
                    Description / Instructions
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Provide specific notes, safety checks, mortar ratio, or milestone targets..."
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            </BtCard>

            {/* Assignee Card */}
            <BtCard padding={24} style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                <UserCheck size={18} color="var(--ink)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  Workforce Assignment
                </h3>
              </div>

              <div className="tour-assignee">
                <label style={labelStyle}>
                  Assign To <span style={{ color: 'var(--rose-ember)' }}>*</span>
                </label>
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">Select Responsible Worker / Supervisor</option>
                  {users.map((u) => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {u.name} — {u.role || 'Worker'} {u.email ? `(${u.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </BtCard>

            {/* Action Bar */}
            <div
              className="tour-submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12,
                paddingTop: 8,
              }}
            >
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 'var(--r-btn, 12px)',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 140ms ease',
                }}
              >
                Cancel
              </button>

              <BtButton
                variant="primary"
                size="lg"
                type="submit"
                loading={loading}
                style={{ minWidth: 160 }}
              >
                {loading ? 'Assigning Task...' : 'Assign Task'}
              </BtButton>
            </div>

          </form>
        </div>
      </BtSheet>
    </div>
  );
}
