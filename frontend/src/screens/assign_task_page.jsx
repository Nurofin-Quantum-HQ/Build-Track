import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../components/ui';
import { projectAPI, authAPI, workerAPI, taskAPI } from '../api';
import { ArrowLeft, CheckCircle, HelpCircle } from 'lucide-react';
import { colors, gradients } from '../styles/designTokens';
import ModuleTour from '../components/ModuleTour';

export default function AssignTaskPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-project', content: 'Select the project this task belongs to.' },
    { target: '.tour-phase-activity', content: 'Optionally specify the phase and activity.' },
    { target: '.tour-title', content: 'Enter a clear title for the task.' },
    { target: '.tour-desc', content: 'Provide any additional details or instructions.' },
    { target: '.tour-assignee', content: 'Select the team member who will complete this task.' },
    { target: '.tour-submit', content: 'Click here to assign the task.' },
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
    Promise.all([
      projectAPI.getAll().catch(() => ({ data: { projects: [] } })),
      authAPI.getUsers().catch(() => ({ data: [] }))
    ]).then(([projRes, userRes]) => {
      setProjects(projRes.data?.projects || projRes.data || []);
      setUsers(userRes.data?.users || userRes.data || []);
    });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    const selectedProject = projects.find(p => p._id === formData.project || p.id === formData.project);
    const phase = selectedProject?.selectedPhases?.find(p => p._id === pId || p.id === pId);
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
    const selectedProject = projects.find(p => p._id === formData.project || p.id === formData.project);
    const phase = selectedProject?.selectedPhases?.find(p => p._id === formData.phaseId || p.id === formData.phaseId);
    const activity = phase?.activities?.find(a => a._id === aId || a.id === aId);
    setFormData({
      ...formData,
      activityId: aId,
      activityName: activity?.name || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project || !formData.floorId || !formData.phaseId || !formData.activityId || !formData.title || !formData.assignedTo) {
      alert('Please fill all required fields (Project, Floor, Phase, Activity, Title, Assignee)');
      return;
    }

    setLoading(true);
    try {
      await taskAPI.createTask(formData);
      navigate(-1);
    } catch (error) {
      console.error(error);
      alert('Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p._id === formData.project || p.id === formData.project);
  const floors = selectedProject?.floors || [];
  const phases = selectedProject?.selectedPhases || [];
  const selectedPhaseObj = phases.find(p => p._id === formData.phaseId || p.id === formData.phaseId);
  const activities = selectedPhaseObj?.activities || [];

  return (
    <div style={{ padding: '40px 24px', maxWidth: 800, margin: '0 auto', animation: 'fadeUp 300ms ease' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AssignTaskPage" />
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', marginBottom: 24, fontSize: 15, fontWeight: 600 }}
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: colors.textPrimary, margin: '0 0 8px' }}>Assign Task</h1>
          <p style={{ color: colors.textSecondary, margin: 0, fontSize: 15 }}>Create a new daily task and assign it to a team member.</p>
        </div>
        <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
          <HelpCircle size={16} color={colors.textLight || '#94A3B8'} />
        </button>
      </div>

      <Card padding={32}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div className="tour-project">
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Project *</label>
            <select
              name="project"
              value={formData.project}
              onChange={handleProjectChange}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 15 }}
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.projectName || p.name}</option>
              ))}
            </select>
          </div>

          <div className="tour-floor">
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Floor *</label>
            <select
              name="floorId"
              value={formData.floorId}
              onChange={handleFloorChange}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 15 }}
              disabled={!formData.project}
            >
              <option value="">Select Floor</option>
              {floors.map((f, i) => (
                <option key={i} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="tour-phase-activity" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Phase *</label>
              <select
                name="phaseId" value={formData.phaseId} onChange={handlePhaseChange}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 15 }}
                disabled={!formData.project}
              >
                <option value="">Select Phase</option>
                {phases.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>{p.phaseName || p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Activity *</label>
              <select
                name="activityId" value={formData.activityId} onChange={handleActivityChange}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 15 }}
                disabled={!formData.phaseId}
              >
                <option value="">Select Activity</option>
                {activities.map(a => (
                  <option key={a._id || a.id} value={a._id || a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="tour-title">
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Task Title *</label>
            <input
              name="title" value={formData.title} onChange={handleChange} placeholder="What needs to be done?"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 15 }}
            />
          </div>

          <div className="tour-desc">
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Description</label>
            <textarea
              name="description" value={formData.description} onChange={handleChange} placeholder="Any additional details..." rows={3}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 15, fontFamily: 'inherit' }}
            />
          </div>

          <div className="tour-assignee">
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Assign To *</label>
            <select
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 15 }}
            >
              <option value="">Select Worker</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role || 'Worker'})</option>
              ))}
            </select>
          </div>

          <div className="tour-submit" style={{ paddingTop: 16 }}>
            <Button variant="primary" size="lg" style={{ width: '100%' }} type="submit" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Task'}
            </Button>
          </div>

        </form>
      </Card>
    </div>
  );
}