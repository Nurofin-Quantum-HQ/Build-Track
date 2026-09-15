import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, taskAPI } from '../api';
import { Toast } from '../components/Toast';
import { CheckCircle, Upload, Save, ChevronLeft } from 'lucide-react';
import { colors, radius, shadows, typography } from '../styles/designTokens';

export default function UpdateProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    projectAPI.getAll().then(res => {
      const list = res.data?.projects || res.data || [];
      setProjects(list);
      if (list.length > 0) setSelectedProjectId(list[0]._id || list[0].id);
    }).catch(() => {});
    
    taskAPI.getDaily().then(res => {
      const list = res.data?.tasks || res.data || [];
      setTasks(list.filter(t => t.status !== 'Completed'));
    }).catch(() => {});
  }, []);

  const [toast, setToast] = useState({ msg: '', type: 'info' });
  
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
      for (let taskId of completedTaskIds) {
        await taskAPI.updateStatus(taskId, 'Completed');
      }
      setToast({ msg: 'Progress updated successfully!', type: 'success' });
      setTimeout(() => navigate('/'), 1000);
    } catch (e) {
      setToast({ msg: 'Failed to update progress', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: colors.textPrimary }}>Project</h3>
        <select 
          value={selectedProjectId} 
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15 }}
        >
          <option value="">Select Project</option>
          {projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.projectName}</option>)}
        </select>
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
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: colors.textPrimary }}>Daily Remarks / Notes</h3>
        <textarea 
          placeholder="Enter progress details..." 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ width: '100%', padding: '16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15, minHeight: 120, resize: 'vertical' }}
        />
      </div>

      <button 
        onClick={handleSubmit} 
        disabled={isSubmitting}
        style={{ width: '100%', padding: '16px', borderRadius: 12, background: colors.primary, color: '#fff', fontSize: 16, fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Save size={20} />
        {isSubmitting ? 'Saving...' : 'Submit Progress Update'}
      </button>
    </div>
  );
}
