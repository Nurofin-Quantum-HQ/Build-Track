import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI, projectAPI, subscriptionAPI } from '../api';
import {
  Info,
  HelpCircle,
  Plus,
  Trash2,
  Pencil,
  Check,
  Users,
  UserPlus,
  Mail,
  KeyRound,
  User,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ModuleTour from '../components/ModuleTour';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import BtHero from '../components/ui/BtHero';
import BtPageHeader from '../components/ui/BtPageHeader';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtBadge from '../components/ui/BtBadge';
import BtButton from '../components/ui/BtButton';
import BtIconButton from '../components/ui/BtIconButton';
import BtChip from '../components/ui/BtChip';
import BtEmpty, { BtErrorCard } from '../components/ui/BtEmpty';
import BtSkeleton from '../components/ui/BtSkeleton';
import BtField from '../components/ui/BtField';
import btToast from '../components/ui/BtToast';

// Permission groups: one switch per permission key, each with a one-line description.
const PERMISSION_GROUPS = [
  {
    title: 'Project',
    items: [
      { key: 'view_assigned_project', label: 'View assigned projects', desc: 'See progress, budget and details of the projects they can access.' },
      { key: 'edit_project', label: 'Edit project details', desc: 'Change a project’s information and budget.' },
      { key: 'delete_entry', label: 'Delete entries', desc: 'Remove material, labour or equipment entries.' },
    ],
  },
  {
    title: 'Daily work',
    items: [
      { key: 'manage_expenses', label: 'Add and edit entries', desc: 'Add material, labour and equipment entries.' },
      { key: 'manage_equipment_master', label: 'Manage equipment', desc: 'Add and manage equipment entries.' },
      { key: 'submit_daily_update', label: 'Submit daily progress update', desc: 'File a daily update with photos and a checklist.' },
    ],
  },
  {
    title: 'Approvals & payments',
    items: [
      { key: 'approve_payments', label: 'Approve payments', desc: 'Mark entries as paid and record payment details.' },
      { key: 'approve_updates', label: 'Approve updates', desc: 'Approve or reject daily progress submissions.' },
    ],
  },
  {
    title: 'Visibility',
    items: [
      { key: 'view_reports', label: 'Reports and analytics', desc: 'See charts, cost summaries and analytics.' },
      { key: 'view_payment_reports', label: 'Transaction logs', desc: 'See the full list of expense entries.' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { key: 'assign_roles', label: 'Assign roles', desc: 'Create accounts and assign roles to team members.' },
    ],
  },
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

function roleTone(roleName = '') {
  const r = roleName.toLowerCase();
  if (r === 'admin') return 'brand';
  if (r === 'supervisor') return 'material';
  if (r === 'mason') return 'labour';
  return 'neutral';
}

function BtSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 'var(--r-full)',
        background: checked ? 'var(--ink)' : 'var(--input-border)',
        border: 'none',
        padding: 3,
        cursor: 'pointer',
        transition: 'background 200ms ease',
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(12, 14, 18, 0.25)',
          transform: checked ? 'translateX(20px)' : 'translateX(0px)',
          transition: 'transform 200ms var(--ease)',
          display: 'block',
        }}
      />
    </button>
  );
}

function CardTitle({ index, title, description }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {index && (
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--ink)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {index}
          </span>
        )}
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{title}</h2>
      </div>
      {description && (
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{description}</p>
      )}
    </div>
  );
}

function Avatar({ name }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'var(--fill)',
        border: '1px solid var(--line)',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: 17,
        fontWeight: 700,
        color: 'var(--ink)',
        flexShrink: 0,
      }}
    >
      {name ? name.charAt(0).toUpperCase() : 'U'}
    </div>
  );
}

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
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [deactivating, setDeactivating] = useState(null);

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
  const [formErrors, setFormErrors] = useState({});
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
    setFormErrors((e) => ({ ...e, role: undefined }));
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
    setFormErrors({});
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
    setFormErrors({});
    setShowForm(true);
  };

  const handleProvision = async () => {
    const finalRole = isCustomRole ? customRoleName.trim() : selectedRole;
    const errs = {};
    if (!newName.trim()) errs.name = 'Enter the member’s full name.';
    if (!newEmail.trim()) errs.email = 'Enter an email address.';
    if (!finalRole) errs.role = 'Enter a title for the custom role.';
    if (!isEditMode && !newPassword) errs.password = 'Enter a temporary password.';
    setFormErrors(errs);
    if (Object.keys(errs).length) {
      btToast('Please fix the highlighted fields.', { error: true });
      return;
    }

    if (!isEditMode && limitMaxUsers !== -1) {
      if (users.length >= limitMaxUsers) {
        setConfirmDlg({
          message: `Your ${subscription?.plan || 'Free'} plan allows up to ${limitMaxUsers} users. Upgrade to add more team members.`,
          confirmLabel: 'Upgrade plan',
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
        btToast('User updated successfully');
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
        btToast('User created successfully');
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      btToast(
        err.friendlyMessage ||
          (isEditMode ? 'Failed to update user' : 'Failed to create user'),
        { error: true }
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (member) => {
    setConfirmDlg({
      message: `Deactivate ${member.name || 'this member'}? They will no longer be able to sign in.`,
      danger: true,
      confirmLabel: 'Deactivate',
      onConfirm: () => {
        setConfirmDlg(null);
        const id = member._id || member.id;
        setDeactivating(id);
        authAPI
          .deleteUser(id)
          .then(() => {
            btToast('User deactivated successfully');
            fetchAll();
          })
          .catch((err) => btToast(err.friendlyMessage || 'Failed to delete user', { error: true }))
          .finally(() => setDeactivating(null));
      },
    });
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

  const totalPerms = Object.keys(DEFAULT_PERMS).length;
  const onPerms = Object.values(permissions).filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AssignRolesPage" />
      <ConfirmDialog
        open={!!confirmDlg}
        message={confirmDlg?.message || ''}
        onConfirm={confirmDlg?.onConfirm}
        onCancel={() => setConfirmDlg(null)}
        danger={confirmDlg?.danger}
        confirmLabel={confirmDlg?.confirmLabel}
      />

      {/* ── HERO ── */}
      <BtHero>
        <div className="tour-header">
          <BtPageHeader
            size={showForm ? 'md' : 'lg'}
            back={showForm ? { label: 'Team', onClick: () => setShowForm(false) } : undefined}
            eyebrow="Access control"
            title={showForm ? (isEditMode ? 'Edit team member' : 'New team member') : 'Assign Roles'}
            subtitle={
              showForm
                ? 'Set their role, what they can do, and which projects they can see.'
                : 'Add team members and choose exactly what each person can access.'
            }
            actions={
              <>
                <BtIconButton onDark icon={HelpCircle} label="Page tour" onClick={() => setRunTour(true)} />
                {!showForm && (
                  <BtButton variant="accent" size="small" icon={Plus} className="tour-add-btn" onClick={handleCreateClick}>
                    Add member
                  </BtButton>
                )}
              </>
            }
          />
        </div>
      </BtHero>

      {/* ── SHEET ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        {showForm ? (
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. Credentials */}
            <BtCard padding="24px" className="tour-user-details">
              <CardTitle index={1} title="Member details" description="Who they are and how they sign in." />
              <div className="bt-grid-3">
                <BtField
                  label="Full name"
                  required
                  icon={User}
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setFormErrors((x) => ({ ...x, name: undefined })); }}
                  placeholder="e.g. Ramesh Kumar"
                  error={formErrors.name}
                  autoComplete="off"
                />
                <BtField
                  label="Email address"
                  required
                  type="email"
                  icon={Mail}
                  value={newEmail}
                  onChange={(e) => { setNewEmail(e.target.value); setFormErrors((x) => ({ ...x, email: undefined })); }}
                  placeholder="ramesh@example.com"
                  disabled={isEditMode}
                  error={formErrors.email}
                  helperText={isEditMode ? 'Email cannot be changed.' : undefined}
                  autoComplete="off"
                />
                <BtField
                  label={isEditMode ? 'Reset password (optional)' : 'Temporary password'}
                  required={!isEditMode}
                  type="password"
                  icon={KeyRound}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setFormErrors((x) => ({ ...x, password: undefined })); }}
                  placeholder={isEditMode ? 'Leave blank to keep current' : 'Set a temporary password'}
                  error={formErrors.password}
                  helperText={!isEditMode ? 'They can change it after signing in.' : undefined}
                  autoComplete="new-password"
                />
              </div>
            </BtCard>

            {/* 2. Role */}
            <BtCard padding="24px" className="tour-role-select">
              <CardTitle index={2} title="Role" description="Picking a role pre-sets the permissions below. You can fine-tune them after." />
              <div role="radiogroup" aria-label="Role" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {roleOptions.map((roleKey) => {
                  const label = roleKey === '__custom_role__' ? 'Custom role' : roleKey;
                  return (
                    <BtChip
                      key={roleKey}
                      label={label}
                      selected={selectedRole === roleKey}
                      role="radio"
                      aria-checked={selectedRole === roleKey}
                      onClick={() => handleRoleChange(roleKey)}
                      style={{ height: 40, padding: '0 18px', fontSize: 14 }}
                    />
                  );
                })}
              </div>

              {isCustomRole && (
                <div style={{ marginTop: 16, maxWidth: 420 }}>
                  <BtField
                    label="Custom role title"
                    required
                    value={customRoleName}
                    onChange={(e) => { setCustomRoleName(e.target.value); setFormErrors((x) => ({ ...x, role: undefined })); }}
                    placeholder="e.g. Site Engineer, Billing Specialist"
                    error={formErrors.role}
                  />
                </div>
              )}
            </BtCard>

            {/* 3. Overseeing roles (Supervisor) */}
            {selectedRole === 'Supervisor' && (
              <BtCard padding="24px">
                <CardTitle
                  index={3}
                  title="Roles to oversee"
                  description="Which roles this supervisor can review, give tasks to, or approve entries for."
                />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {availableRolesToOversee.map((r) => {
                    const isSelected = selectedOverseesRoles.includes(r);
                    return (
                      <BtChip
                        key={r}
                        label={r}
                        icon={isSelected ? Check : Plus}
                        selected={isSelected}
                        variant="accent"
                        aria-pressed={isSelected}
                        onClick={() => toggleOverseesRole(r)}
                        style={{ height: 40, padding: '0 16px', fontSize: 14 }}
                      />
                    );
                  })}
                </div>
              </BtCard>
            )}

            {/* 4. Permissions */}
            <BtCard padding={0} className="tour-permissions">
              <div style={{ padding: '24px 24px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <CardTitle
                    index={selectedRole === 'Supervisor' ? 4 : 3}
                    title="Permissions"
                    description="Switch on only what this person needs."
                  />
                  <BtBadge tone={onPerms > 0 ? 'brand' : 'neutral'} label={`${onPerms} of ${totalPerms} on`} showDot={false} />
                </div>
              </div>

              {PERMISSION_GROUPS.map((group) => {
                const groupOn = group.items.filter((it) => permissions[it.key]).length;
                return (
                  <section key={group.title} aria-label={group.title}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 24px',
                        background: 'var(--bone)',
                        borderTop: '1px solid var(--line)',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      <span className="bt-eyebrow" style={{ color: 'var(--ink-2)' }}>{group.title}</span>
                      <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{groupOn} of {group.items.length} on</span>
                    </div>
                    {group.items.map((item, i) => (
                      <div
                        key={item.key}
                        className="bt-hover-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          padding: '14px 24px',
                          borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{item.label}</div>
                          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.45 }}>{item.desc}</div>
                        </div>
                        <BtSwitch
                          label={item.label}
                          checked={permissions[item.key] || false}
                          onChange={(val) => setPermissions((prev) => ({ ...prev, [item.key]: val }))}
                        />
                      </div>
                    ))}
                  </section>
                );
              })}
            </BtCard>

            {/* 5. Project scoping */}
            <BtCard padding="24px" className="tour-project-access">
              <CardTitle
                index={selectedRole === 'Supervisor' ? 5 : 4}
                title="Project access"
                description="Choose which projects they can see and work on. If none are selected, they can access all projects."
              />
              {projects.length === 0 ? (
                <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>No projects yet. They will see projects as soon as you create them.</div>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {projects.map((p) => {
                    const pid = p._id || p.id;
                    const isSelected = selectedProjects.includes(pid);
                    return (
                      <BtChip
                        key={pid}
                        label={p.projectName || p.name}
                        icon={isSelected ? Check : undefined}
                        selected={isSelected}
                        aria-pressed={isSelected}
                        onClick={() => toggleProject(pid)}
                        style={{ height: 40, padding: '0 16px', fontSize: 14, opacity: isAdmin ? 1 : 0.6, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
                      />
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-3)' }}>
                {selectedProjects.length === 0 ? 'Access: all projects' : `Access: ${selectedProjects.length} selected`}
              </div>
            </BtCard>

            {/* Sticky actions */}
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 5,
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end',
                padding: '14px 0 4px',
                background: 'linear-gradient(to top, var(--ground) 70%, transparent)',
              }}
            >
              <BtButton variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </BtButton>
              <BtButton variant="primary" onClick={handleProvision} loading={saving} icon={isEditMode ? undefined : UserPlus} style={{ minWidth: 190 }}>
                {isEditMode ? 'Save changes' : 'Add member'}
              </BtButton>
            </div>
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="tour-user-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {limitMaxUsers !== -1 && !loading && !error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '14px 18px',
                  borderRadius: 'var(--r-card)',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Info size={18} color="var(--accent-ink)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                    Your <b style={{ color: 'var(--ink)', textTransform: 'capitalize' }}>{subscription?.plan || 'Free'}</b> plan allows up to <b style={{ color: 'var(--ink)' }}>{limitMaxUsers} users</b>. You have <b style={{ color: 'var(--ink)' }}>{users.length}</b>.
                  </span>
                </div>
                {users.length >= limitMaxUsers && (
                  <BtButton variant="secondary" size="small" onClick={() => navigate('/subscription')}>
                    Upgrade plan
                  </BtButton>
                )}
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <BtSkeleton key={i} height="84px" borderRadius="var(--r-card)" />
                ))}
              </div>
            ) : error ? (
              <BtErrorCard title="Couldn't load your team" message={error} onRetry={fetchAll} />
            ) : users.length === 0 ? (
              <BtCard padding={0}>
                <BtEmpty
                  icon={Users}
                  title="No team members yet"
                  message="Add your first team member and choose what they can access."
                  actionLabel="Add member"
                  onAction={handleCreateClick}
                />
              </BtCard>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {users.map((member) => {
                  const roleName = member.role || 'Member';
                  const id = member._id || member.id;
                  const permCount = (member.permissions || []).length;

                  return (
                    <BtCard
                      key={id}
                      padding="16px 20px"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 260px' }}>
                        <Avatar name={member.name} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                              {member.name || 'Unnamed User'}
                            </span>
                            <BtBadge tone={roleTone(roleName)} label={roleName} showDot={false} />
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3, overflowWrap: 'anywhere' }}>
                            {member.email} · {roleName.toLowerCase() === 'admin' ? 'Full access' : `${permCount} ${permCount === 1 ? 'permission' : 'permissions'} on`}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BtButton variant="secondary" size="small" icon={Pencil} onClick={() => handleEditClick(member)}>
                          Edit
                        </BtButton>
                        {member.role?.toLowerCase() !== 'admin' && (
                          <BtButton
                            variant="destructive"
                            size="small"
                            icon={Trash2}
                            loading={deactivating === id}
                            onClick={() => handleDeactivate(member)}
                          >
                            Deactivate
                          </BtButton>
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
