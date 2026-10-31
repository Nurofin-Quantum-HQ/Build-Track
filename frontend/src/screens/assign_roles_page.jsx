import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI, projectAPI, subscriptionAPI } from '../api';
import {
  Users,
  User,
  Info,
  HelpCircle,
  Plus,
  ShieldCheck,
  Building2,
  Trash2,
  Edit2,
  ArrowLeft,
  X,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ModuleTour from '../components/ModuleTour';
import { Toast } from '../components/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import BtHero from '../components/ui/BtHero';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtBadge from '../components/ui/BtBadge';
import BtButton from '../components/ui/BtButton';
import BtPressable from '../components/ui/BtPressable';
import BtEmpty from '../components/ui/BtEmpty';

const _featureRows = [
  { section: 'Project' },
  { type: 'table', label: 'Project Status', desc: 'View progress, budget, and project details', view: 'view_assigned_project', edit: 'edit_project' },
  { type: 'table', label: 'Activities & Entries', desc: 'View, edit or delete material/labour/equipment entries', view: 'view_assigned_project', edit: 'manage_expenses', delete: 'delete_entry' },
  { section: 'Daily Work' },
  { type: 'toggle', label: 'Add Entries', desc: 'Can add material, labour, and equipment entries', key: 'manage_expenses' },
  { type: 'toggle', label: 'Add Equipment Entries', desc: 'Can specifically add and manage equipment entries', key: 'manage_equipment_master' },
  { type: 'toggle', label: 'Submit Daily Progress Update', desc: 'Can file a daily update with photos and checklist', key: 'submit_daily_update' },
  { section: 'Approvals & Payments' },
  { type: 'toggle', label: 'Approve Payments', desc: 'Can mark entries as paid and record payment details', key: 'approve_payments' },
  { type: 'toggle', label: 'Approve Updates', desc: 'Can approve or reject daily progress submissions', key: 'approve_updates' },
  { section: 'Visibility' },
  { type: 'table', label: 'Reports & Analytics', desc: 'Access to charts, cost summaries and analytics', view: 'view_reports' },
  { type: 'table', label: 'Transaction Logs', desc: 'Access to the full list of expense entries', view: 'view_payment_reports' },
  { section: 'Administration' },
  { type: 'table', label: 'Assign Roles', desc: 'Can create accounts and assign roles to team members', edit: 'assign_roles' },
];

const availableRolesToOversee = ['Mason', 'Contractor', 'Labourer'];
const roleOptions = ['Supervisor', 'Mason', '__custom_role__'];

const DEFAULT_PERMS = {
  view_assigned_project: false,
  edit_project: false,
  delete_entry: false,
  manage_expenses: false,
  manage_equipment_master: false,
  submit_daily_update: false,
  approve_payments: false,
  approve_updates: false,
  view_reports: false,
  view_payment_reports: false,
  assign_roles: false,
};

export default function AssignRolesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info', key: 0 });
  const [confirmDlg, setConfirmDlg] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Supervisor');
  const [customRoleName, setCustomRoleName] = useState('');
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMS });
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedOverseesRoles, setSelectedOverseesRoles] = useState([]);
  const [customOverseesInput, setCustomOverseesInput] = useState('');
  const [runTour, setRunTour] = useState(false);

  const tourSteps = showForm
    ? [
        { target: '.tour-user-details', content: 'Enter the full name, email, and a temporary password for the new team member.', disableBeacon: true },
        { target: '.tour-role-select', content: 'Select their role: Supervisors can oversee projects and approve entries. Labour/Masons can submit daily progress and expenses.' },
        { target: '.tour-permissions', content: 'Fine-tune the exact features and actions they can access.' },
        { target: '.tour-project-access', content: 'Restrict their access to specific projects, or leave blank for all.' },
      ]
    : [
        { target: '.tour-header', content: 'Manage team access, permissions, and roles.', disableBeacon: true },
        { target: '.tour-add-btn', content: 'Click here to add a new team member and assign their role.' },
        { target: '.tour-user-list', content: 'Click on any user to edit their permissions and project access.' },
      ];

  const currentPlan = subscription?.plan?.toLowerCase() || 'free';
  const limitMaxUsers =
    subscription?.maxUsers !== undefined
      ? subscription.maxUsers
      : currentPlan.includes('free')
        ? 2
        : currentPlan.includes('starter')
          ? 5
          : currentPlan.includes('growth')
            ? 8
            : -1;

  const isCustomRole = selectedRole === '__custom_role__';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, projRes, subRes] = await Promise.all([
        authAPI.getUsers(),
        projectAPI.getMine ? projectAPI.getMine() : projectAPI.getAll(),
        subscriptionAPI.getStatus(),
      ]);
      setUsers(userRes.data?.users || userRes.data || []);
      setProjects(projRes.data?.projects || projRes.data || []);
      setSubscription(subRes.data);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (location.state?.user && !showForm) {
      handleEditClick(location.state.user);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, showForm, navigate, location.pathname]);

  const applyDefaultPermissions = (role) => {
    const newPerms = { ...DEFAULT_PERMS };
    if (role === 'Supervisor') {
      [
        'view_assigned_project',
        'manage_expenses',
        'manage_equipment_master',
        'submit_daily_update',
        'approve_payments',
        'approve_updates',
        'view_reports',
        'view_payment_reports',
      ].forEach((k) => (newPerms[k] = true));
    } else if (role === 'Mason') {
      ['view_assigned_project', 'manage_expenses', 'submit_daily_update'].forEach(
        (k) => (newPerms[k] = true)
      );
    }
    setPermissions(newPerms);
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    if (role !== '__custom_role__') setCustomRoleName('');
    if (isAdmin) applyDefaultPermissions(role);
  };

  const handleCreateClick = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setSelectedRole('Supervisor');
    setCustomRoleName('');
    setPermissions({ ...DEFAULT_PERMS });
    applyDefaultPermissions('Supervisor');
    setSelectedProjects([]);
    setSelectedOverseesRoles([]);
    setShowForm(true);
  };

  const handleEditClick = (userToEdit) => {
    setIsEditMode(true);
    setEditingUserId(userToEdit._id || userToEdit.id);
    setNewName(userToEdit.name || '');
    setNewEmail(userToEdit.email || '');
    setNewPassword('');

    const role = userToEdit.role || '';
    if (roleOptions.includes(role)) {
      setSelectedRole(role);
    } else {
      setSelectedRole('__custom_role__');
      setCustomRoleName(role);
    }

    const perms = userToEdit.permissions || [];
    const newPerms = { ...DEFAULT_PERMS };
    perms.forEach((p) => {
      if (newPerms[p] !== undefined) newPerms[p] = true;
    });
    setPermissions(newPerms);

    setSelectedProjects(userToEdit.projectIds || userToEdit.projects || []);
    setSelectedOverseesRoles(userToEdit.overseesRoles || []);
    setShowForm(true);
  };

  const handleProvision = async () => {
    const finalRole = isCustomRole ? customRoleName.trim() : selectedRole;
    if (!newName.trim() || !newEmail.trim() || !finalRole) {
      setToast({ message: 'Please fill in all required fields.', type: 'error', key: Date.now() });
      return;
    }
    if (!isEditMode && !newPassword) {
      setToast({ message: 'Please enter a temporary password.', type: 'error', key: Date.now() });
      return;
    }

    if (!isEditMode && limitMaxUsers !== -1) {
      if (users.length >= limitMaxUsers) {
        setConfirmDlg({
          message: `Your ${subscription?.plan || 'Free'} plan allows up to ${limitMaxUsers} users. Upgrade to add more team members.`,
          confirmLabel: 'Upgrade Plan',
          onConfirm: () => {
            setConfirmDlg(null);
            navigate('/subscription');
          },
        });
        return;
      }
    }

    setSaving(true);
    const selectedPerms = Object.keys(permissions).filter((k) => permissions[k]);

    try {
      if (isEditMode) {
        const payload = {
          name: newName.trim(),
          email: newEmail.trim(),
          role: finalRole,
          permissions: selectedPerms,
          projectIds: selectedProjects,
          overseesRoles: selectedOverseesRoles,
        };
        if (newPassword) payload.password = newPassword;
        await authAPI.updateUser(editingUserId, payload);
        setToast({ message: 'User updated successfully', type: 'success', key: Date.now() });
      } else {
        const payload = {
          name: newName.trim(),
          email: newEmail.trim(),
          temporaryPassword: newPassword,
          role: finalRole,
          permissions: selectedPerms,
          projectIds: selectedProjects,
          overseesRoles: selectedOverseesRoles,
        };
        await authAPI.provision(payload);
        setToast({ message: 'User created successfully', type: 'success', key: Date.now() });
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      setToast({
        message:
          err.friendlyMessage ||
          (isEditMode ? 'Failed to update user' : 'Failed to create user'),
        type: 'error',
        key: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleProject = (projectId) => {
    if (!isAdmin) return;
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleOverseesRole = (role) => {
    setSelectedOverseesRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AssignRolesPage" />
      <Toast
        key={toast.key}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, message: '' }))}
      />
      <ConfirmDialog
        open={!!confirmDlg}
        message={confirmDlg?.message || ''}
        onConfirm={confirmDlg?.onConfirm}
        onCancel={() => setConfirmDlg(null)}
        danger={confirmDlg?.danger}
        confirmLabel={confirmDlg?.confirmLabel}
      />

      {/* ── TOP HERO (Deep Noir with blueprint grid & glow) ── */}
      <BtHero padding="24px 32px 48px">
        <div
          className="tour-header"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                color: 'var(--on-noir-2)',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Access Control &amp; Roles
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--bone)',
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Assign Roles
            </h1>
            <p style={{ fontSize: 13, color: 'var(--on-noir-2)', margin: '4px 0 0' }}>
              Configure member credentials, granular permissions, and project access scopes
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              }}
            >
              <HelpCircle size={17} />
            </button>

            {!showForm && (
              <button
                className="tour-add-btn"
                onClick={handleCreateClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  height: 38,
                  padding: '0 16px',
                  borderRadius: 'var(--r-btn, 12px)',
                  background: '#FFFFFF',
                  border: 'none',
                  color: 'var(--ink)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                <Plus size={16} />
                <span>Add Member</span>
              </button>
            )}
          </div>
        </div>
      </BtHero>

      {/* ── MAIN CONTENT (Overlapping BtSheet) ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        {showForm ? (
          /* ── FORM VIEW: ADD / EDIT MEMBER ── */
          <div style={{ maxWidth: 840, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={16} />
                <span>Back to Team</span>
              </button>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>/</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                {isEditMode ? 'Edit Team Member' : 'New Member Provisioning'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Card 1: User Account Details */}
              <BtCard padding="24px" className="tour-user-details">
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  1. Member Credentials
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--r-btn, 12px)',
                        border: '1px solid var(--line)',
                        background: 'var(--fill)',
                        fontSize: 13,
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                      disabled={isEditMode}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--r-btn, 12px)',
                        border: '1px solid var(--line)',
                        background: isEditMode ? 'var(--fill)' : '#FFFFFF',
                        fontSize: 13,
                        color: isEditMode ? 'var(--ink-soft)' : 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>
                      {isEditMode ? 'Reset Password (optional)' : 'Temporary Password *'}
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--r-btn, 12px)',
                        border: '1px solid var(--line)',
                        background: '#FFFFFF',
                        fontSize: 13,
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </BtCard>

              {/* Card 2: Role Selection */}
              <BtCard padding="24px" className="tour-role-select">
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  2. Role Assignment
                </h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                  {['Supervisor', 'Mason', '__custom_role__'].map((roleKey) => {
                    const label = roleKey === '__custom_role__' ? 'Custom Role' : roleKey;
                    const isSelected = selectedRole === roleKey;
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => handleRoleChange(roleKey)}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 'var(--r-btn, 12px)',
                          border: isSelected ? '1px solid var(--ink)' : '1px solid var(--line)',
                          background: isSelected ? 'var(--ink)' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : 'var(--ink)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {isCustomRole && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>
                      Custom Role Title *
                    </label>
                    <input
                      type="text"
                      value={customRoleName}
                      onChange={(e) => setCustomRoleName(e.target.value)}
                      placeholder="e.g. Site Engineer, Billing Specialist"
                      style={{
                        width: '100%',
                        maxWidth: 360,
                        padding: '10px 14px',
                        borderRadius: 'var(--r-btn, 12px)',
                        border: '1px solid var(--line)',
                        fontSize: 13,
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </BtCard>

              {/* Card 3: Overseeing Roles (if Supervisor) */}
              {selectedRole === 'Supervisor' && (
                <BtCard padding="24px">
                  <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    3. Roles to Oversee
                  </h3>
                  <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-soft)' }}>
                    Select which roles this supervisor can review, dispatch tasks to, or approve entries for.
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {availableRolesToOversee.map((r) => {
                      const isSelected = selectedOverseesRoles.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggleOverseesRole(r)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--r-chip)',
                            border: isSelected ? '1px solid var(--accent)' : '1px solid var(--line)',
                            background: isSelected ? 'var(--accent-soft)' : '#FFFFFF',
                            color: isSelected ? 'var(--accent-ink)' : 'var(--ink)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? `✓ ${r}` : `+ ${r}`}
                        </button>
                      );
                    })}
                  </div>
                </BtCard>
              )}

              {/* Card 4: Fine-Grained Permissions Matrix */}
              <BtCard padding="24px" className="tour-permissions">
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  4. Fine-Grained Permission Matrix
                </h3>
                <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-card)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', background: 'var(--fill)', padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ flex: 5, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Feature</div>
                    <div style={{ width: 56, textAlign: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>View</div>
                    <div style={{ width: 56, textAlign: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Edit</div>
                    <div style={{ width: 56, textAlign: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Delete</div>
                  </div>

                  {_featureRows.map((row, idx) => {
                    if (row.section) {
                      return (
                        <div key={idx} style={{ background: 'var(--fill)', padding: '8px 16px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                          {row.section}
                        </div>
                      );
                    }

                    const renderCheckbox = (key) => {
                      if (!key) return <div style={{ width: 56, textAlign: 'center', color: 'var(--ink-soft)' }}>—</div>;
                      return (
                        <div style={{ width: 56, display: 'flex', justifyContent: 'center' }}>
                          <input
                            type="checkbox"
                            checked={permissions[key] || false}
                            onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                            style={{ width: 16, height: 16, accentColor: 'var(--ink)', cursor: 'pointer' }}
                          />
                        </div>
                      );
                    };

                    if (row.type === 'table') {
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--fill)' }}>
                          <div style={{ flex: 5 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{row.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{row.desc}</div>
                          </div>
                          {renderCheckbox(row.view)}
                          {renderCheckbox(row.edit)}
                          {renderCheckbox(row.delete)}
                        </div>
                      );
                    }

                    if (row.type === 'toggle') {
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--fill)' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{row.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{row.desc}</div>
                          </div>
                          <div style={{ marginLeft: 8 }}>
                            <input
                              type="checkbox"
                              checked={permissions[row.key] || false}
                              onChange={(e) => setPermissions({ ...permissions, [row.key]: e.target.checked })}
                              style={{ width: 18, height: 18, accentColor: 'var(--ink)', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </BtCard>

              {/* Card 5: Project Access */}
              <BtCard padding="24px" className="tour-project-access">
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  5. Project Scoping
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-soft)' }}>
                  Select which projects this user can see and work on. If none are selected, they have access to all projects.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {projects.map((p) => {
                    const pid = p._id || p.id;
                    const isSelected = selectedProjects.includes(pid);
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => toggleProject(pid)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 'var(--r-chip)',
                          border: isSelected ? '1px solid var(--ink)' : '1px solid var(--line)',
                          background: isSelected ? 'var(--ink)' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : 'var(--ink)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {isSelected ? `✓ ${p.projectName || p.name}` : p.projectName || p.name}
                      </button>
                    );
                  })}
                </div>
              </BtCard>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    height: 42,
                    padding: '0 20px',
                    borderRadius: 'var(--r-btn, 12px)',
                    border: '1px solid var(--line)',
                    background: '#FFFFFF',
                    color: 'var(--ink)',
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProvision}
                  disabled={saving}
                  style={{
                    height: 42,
                    padding: '0 24px',
                    borderRadius: 'var(--r-btn, 12px)',
                    border: 'none',
                    background: 'var(--ink)',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  {saving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Provision User'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── LIST VIEW: TEAM MEMBERS ── */
          <div className="tour-user-list">
            {/* Plan limit alert banner */}
            {limitMaxUsers !== -1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderRadius: 'var(--r-card)',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  marginBottom: 20,
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Info size={18} color="var(--accent-ink)" />
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                    Your <b>{subscription?.plan || 'Free'}</b> plan allows up to <b>{limitMaxUsers} users</b>. You currently have <b>{users.length} members</b>.
                  </span>
                </div>
                {users.length >= limitMaxUsers && (
                  <button
                    onClick={() => navigate('/subscription')}
                    style={{
                      border: 'none',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-ink)',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Upgrade
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 84,
                      borderRadius: 'var(--r-card)',
                      background: 'var(--fill)',
                    }}
                  />
                ))}
              </div>
            ) : users.length === 0 ? (
              <BtEmpty
                title="No members provisioned yet"
                message="Start building your workforce team by adding members and configuring their permissions."
                actionLabel="Add Member"
                onAction={handleCreateClick}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {users.map((member) => {
                  const roleName = member.role || 'Member';
                  const roleTone =
                    roleName.toLowerCase() === 'admin'
                      ? 'accent'
                      : roleName.toLowerCase() === 'supervisor'
                        ? 'info'
                        : roleName.toLowerCase() === 'mason'
                          ? 'warn'
                          : 'muted';

                  return (
                    <BtCard
                      key={member._id || member.id}
                      padding="18px 24px"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'var(--fill)',
                            border: '1px solid var(--line)',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--ink)',
                          }}
                        >
                          {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                              {member.name || 'Unnamed User'}
                            </span>
                            <BtBadge tone={roleTone}>{roleName}</BtBadge>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                            {member.email} · {(member.permissions || []).length} permissions active
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => handleEditClick(member)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: 'var(--r-btn, 12px)',
                            background: '#FFFFFF',
                            border: '1px solid var(--line)',
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: 'var(--ink)',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        {member.role?.toLowerCase() !== 'admin' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to deactivate ${member.name}?`)) {
                                authAPI
                                  .deleteUser(member._id || member.id)
                                  .then(() => {
                                    setToast({ message: 'User deactivated successfully', type: 'info', key: Date.now() });
                                    fetchAll();
                                  })
                                  .catch((err) =>
                                    setToast({ message: err.friendlyMessage || 'Failed to delete user', type: 'error', key: Date.now() })
                                  );
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 'var(--r-btn, 12px)',
                              background: '#FFFFFF',
                              border: '1px solid var(--line)',
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: 'var(--danger)',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </BtCard>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </BtSheet>
    </div>
  );
}
