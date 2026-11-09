import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Building2,
  Layers,
  ListTodo,
  UserCheck,
  ChevronRight,
  FileText,
  HardHat,
  Check,
} from 'lucide-react';
import { projectAPI, authAPI, taskAPI } from '../api';
import ModuleTour from '../components/ModuleTour';
import BtHero from '../components/ui/BtHero';
import BtPageHeader from '../components/ui/BtPageHeader';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtButton from '../components/ui/BtButton';
import BtIconButton from '../components/ui/BtIconButton';
import BtField, { BtSelect, BtTextarea } from '../components/ui/BtField';
import btToast from '../components/ui/BtToast';

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div
        style={{
          width: 38, height: 38, borderRadius: 'var(--r-tile)', background: 'var(--fill)', color: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <Icon size={19} strokeWidth={1.85} />
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{title}</h2>
        {description && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45 }}>{description}</p>}
      </div>
    </div>
  );
}

export default function AssignTaskPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [runTour, setRunTour] = useState(false);
  const [errors, setErrors] = useState({});

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

  const clearError = (field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    clearError(e.target.name);
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
    clearError('project');
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
    clearError('floorId');
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
    clearError('phaseId');
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
    clearError('activityId');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!formData.project) errs.project = 'Choose a project.';
    if (!formData.floorId) errs.floorId = 'Choose a floor.';
    if (!formData.phaseId) errs.phaseId = 'Choose a phase.';
    if (!formData.activityId) errs.activityId = 'Choose an activity.';
    if (!formData.title.trim()) errs.title = 'Give the task a short title.';
    if (!formData.assignedTo) errs.assignedTo = 'Choose who is responsible.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      btToast('Please fill all required fields: Project, Floor, Phase, Activity, Title, and Assignee.', { error: true });
      return;
    }

    setLoading(true);
    try {
      await taskAPI.createTask(formData);
      btToast('Task successfully assigned to worker!');
      setTimeout(() => {
        navigate(-1);
      }, 700);
    } catch (error) {
      console.error(error);
      btToast(error?.response?.data?.message || 'Failed to assign task. Please try again.', { error: true });
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find((p) => (p._id || p.id) === formData.project);
  const floors = selectedProject?.floors || [];
  const phases = selectedProject?.selectedPhases || [];
  const selectedPhaseObj = phases.find((p) => (p._id || p.id) === formData.phaseId);
  const activities = selectedPhaseObj?.activities || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AssignTaskPage" />

      {/* ── HERO ── */}
      <BtHero>
        <BtPageHeader
          size="md"
          back={{ label: 'Back', onClick: () => navigate(-1) }}
          eyebrow="Workforce tasking"
          title="Assign Task"
          subtitle="Give a team member a task on a specific floor, phase and activity."
          actions={<BtIconButton onDark icon={HelpCircle} label="Page tour" onClick={() => setRunTour(true)} />}
        />
      </BtHero>

      {/* ── SHEET ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Scope */}
            <BtCard padding="24px">
              <SectionTitle icon={Building2} title="Where is the work?" description="Pick each step in order. The next one unlocks when you do." />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="tour-project">
                  <BtSelect
                    label="Project"
                    required
                    icon={Building2}
                    name="project"
                    value={formData.project}
                    onChange={handleProjectChange}
                    disabled={fetching}
                    error={errors.project}
                    helperText={fetching ? 'Loading projects…' : projects.length === 0 ? 'No projects yet. Create one first.' : undefined}
                  >
                    <option value="">Select project</option>
                    {projects.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.projectName || p.name}
                      </option>
                    ))}
                  </BtSelect>
                </div>

                <div className="tour-floor">
                  <BtSelect
                    label="Floor / Level"
                    required
                    icon={Layers}
                    name="floorId"
                    value={formData.floorId}
                    onChange={handleFloorChange}
                    disabled={!formData.project}
                    error={errors.floorId}
                    helperText={
                      !formData.project
                        ? 'Choose a project first.'
                        : floors.length === 0
                          ? 'This project has no floors set up.'
                          : undefined
                    }
                  >
                    <option value="">{formData.project ? 'Select floor' : 'Choose a project first'}</option>
                    {floors.map((f, i) => (
                      <option key={i} value={f}>{f}</option>
                    ))}
                  </BtSelect>
                </div>

                <div className="tour-phase-activity bt-grid-2" style={{ gap: 18 }}>
                  <BtSelect
                    label="Phase"
                    required
                    name="phaseId"
                    value={formData.phaseId}
                    onChange={handlePhaseChange}
                    disabled={!formData.floorId}
                    error={errors.phaseId}
                    helperText={
                      !formData.floorId
                        ? 'Choose a floor first.'
                        : phases.length === 0
                          ? 'This project has no phases set up.'
                          : undefined
                    }
                  >
                    <option value="">{formData.floorId ? 'Select phase' : 'Choose a floor first'}</option>
                    {phases.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.phaseName || p.name}
                      </option>
                    ))}
                  </BtSelect>

                  <BtSelect
                    label="Activity"
                    required
                    name="activityId"
                    value={formData.activityId}
                    onChange={handleActivityChange}
                    disabled={!formData.phaseId}
                    error={errors.activityId}
                    helperText={
                      !formData.phaseId
                        ? 'Choose a phase first.'
                        : activities.length === 0
                          ? 'This phase has no activities.'
                          : undefined
                    }
                  >
                    <option value="">{formData.phaseId ? 'Select activity' : 'Choose a phase first'}</option>
                    {activities.map((a) => (
                      <option key={a._id || a.id} value={a._id || a.id}>
                        {a.name}
                      </option>
                    ))}
                  </BtSelect>
                </div>

                {/* Scope breadcrumb summary */}
                {formData.project && formData.floorId && formData.phaseName && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '10px 14px',
                      borderRadius: 'var(--r-tile)', background: 'var(--bone)', border: '1px dashed var(--input-border)',
                      fontSize: 13, color: 'var(--ink-2)',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Selected path:</span>
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

            {/* Task details */}
            <BtCard padding="24px">
              <SectionTitle icon={ListTodo} title="What needs doing?" description="A short title and any instructions for the person doing it." />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="tour-title">
                  <BtField
                    label="Task title"
                    required
                    icon={FileText}
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Lay 400 AAC blocks on north perimeter wall"
                    error={errors.title}
                  />
                </div>

                <div className="tour-desc">
                  <BtTextarea
                    label="Description / instructions"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Add notes, safety checks, mortar ratio or milestone targets"
                    rows={4}
                    helperText="Optional"
                  />
                </div>
              </div>
            </BtCard>

            {/* Assignee */}
            <BtCard padding="24px">
              <SectionTitle icon={UserCheck} title="Who is responsible?" />

              <div className="tour-assignee">
                <BtSelect
                  label="Assign to"
                  required
                  icon={HardHat}
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  disabled={fetching}
                  error={errors.assignedTo}
                >
                  <option value="">Select responsible worker or supervisor</option>
                  {users.map((u) => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {u.name} — {u.role || 'Worker'} {u.email ? `(${u.email})` : ''}
                    </option>
                  ))}
                </BtSelect>
              </div>
            </BtCard>

            {/* Actions */}
            <div className="tour-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <BtButton variant="secondary" onClick={() => navigate(-1)} disabled={loading}>
                Cancel
              </BtButton>
              <BtButton variant="primary" type="submit" loading={loading} icon={Check} style={{ minWidth: 180 }}>
                Assign task
              </BtButton>
            </div>
          </form>
        </div>
      </BtSheet>
    </div>
  );
}
