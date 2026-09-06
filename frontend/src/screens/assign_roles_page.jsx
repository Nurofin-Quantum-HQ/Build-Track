import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors, radius, typography } from '../styles/designTokens';
import { Card, Badge, Button, Input, Spinner, EmptyState, Toast } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { authAPI, projectAPI, subscriptionAPI } from '../api';
import { Users, User, Info, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ModuleTour from '../components/ModuleTour';

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

  const tourSteps = showForm ? [
    { target: '.tour-user-details', content: 'Enter the full name, email, and a temporary password for the new team member.', disableBeacon: true },
    { target: '.tour-role-select', content: 'Select their role: Supervisors can oversee projects and approve entries. Labour/Masons can submit daily progress and expenses. Custom Role lets you build from scratch.' },
    { target: '.tour-oversees-roles', content: 'Specify which roles this user is allowed to oversee or approve.' },
    { target: '.tour-permissions', content: 'Fine-tune the exact features and actions they can access.' },
    { target: '.tour-project-access', content: 'Restrict their access to specific projects, or leave blank for all.' }
  ] : [
    { target: '.tour-header', content: 'Manage team access and roles.', disableBeacon: true },
    { target: '.tour-add-btn', content: 'Click here to add a new team member and assign their role.' },
    { target: '.tour-admin-alert', content: 'See your current plan limits and info.' },
    { target: '.tour-user-list', content: 'Click on any user to edit their permissions and project access.' }
  ];

  const currentPlan = subscription?.plan?.toLowerCase() || 'free';
  const limitMaxUsers = subscription?.maxUsers !== undefined ? subscription.maxUsers : (currentPlan.includes('free') ? 2 : currentPlan.includes('starter') ? 5 : currentPlan.includes('growth') ? 8 : -1);

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
      ['view_assigned_project', 'manage_expenses', 'manage_equipment_master', 'submit_daily_update', 'approve_payments', 'approve_updates', 'view_reports', 'view_payment_reports'].forEach(k => newPerms[k] = true);
    } else if (role === 'Mason') {
      ['view_assigned_project', 'manage_expenses', 'submit_daily_update'].forEach(k => newPerms[k] = true);
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
    perms.forEach(p => { if (newPerms[p] !== undefined) newPerms[p] = true; });
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
          onConfirm: () => { setConfirmDlg(null); navigate('/subscription'); }
        });
        return;
      }
    }

    setSaving(true);
    const selectedPerms = Object.keys(permissions).filter(k => permissions[k]);

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
      setToast({ message: err.friendlyMessage || (isEditMode ? 'Failed to update user' : 'Failed to create user'), type: 'error', key: Date.now() });
    } finally {
      setSaving(false);
    }
  };

  const toggleProject = (projectId) => {
    if (!isAdmin) return;
    setSelectedProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const addCustomOverseesRole = () => {
    const val = customOverseesInput.trim();
    if (!val) return;
    if (!selectedOverseesRoles.some(r => r.toLowerCase() === val.toLowerCase())) {
      setSelectedOverseesRoles([...selectedOverseesRoles, val]);
    }
    setCustomOverseesInput('');
  };

  const toggleOverseesRole = (role) => {
    setSelectedOverseesRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const renderPermissionsTable = () => (
    <div style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: radius.md, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ display: 'flex', background: '#F8F9FF', padding: '10px 14px', borderBottom: `1px solid ${colors.cardBorder}` }}>
        <div style={{ flex: 5, fontSize: 11, fontWeight: 800, color: colors.textLight, letterSpacing: 0.6, textTransform: 'uppercase' }}>Feature</div>
        <div style={{ width: 52, textAlign: 'center', fontSize: 10, fontWeight: 800, color: colors.textLight, letterSpacing: 0.5, textTransform: 'uppercase' }}>View</div>
        <div style={{ width: 52, textAlign: 'center', fontSize: 10, fontWeight: 800, color: colors.textLight, letterSpacing: 0.5, textTransform: 'uppercase' }}>Edit</div>
        <div style={{ width: 52, textAlign: 'center', fontSize: 10, fontWeight: 800, color: colors.textLight, letterSpacing: 0.5, textTransform: 'uppercase' }}>Delete</div>
      </div>
      {_featureRows.map((row, idx) => {
        if (row.section) {
          return (
            <div key={idx} style={{ background: '#F8F9FF', padding: '10px 14px 4px', fontSize: 10, fontWeight: 800, color: colors.textLight, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {row.section}
            </div>
          );
        }

        const renderCheckbox = (key) => {
          if (!key) return <div style={{ width: 52, textAlign: 'center', color: colors.textLight, fontSize: 14, fontWeight: 600 }}>—</div>;
          return (
            <div style={{ width: 52, display: 'flex', justifyContent: 'center' }}>
              <input type="checkbox" checked={permissions[key] || false} onChange={e => isAdmin && setPermissions({...permissions, [key]: e.target.checked})} disabled={!isAdmin} style={{ width: 16, height: 16, cursor: isAdmin ? 'pointer' : 'default' }} />
            </div>
          );
        };

        if (row.type === 'table') {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: idx < _featureRows.length - 1 ? `1px solid #F0EEF8` : 'none' }}>
              <div style={{ flex: 5 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.textDark }}>{row.label}</div>
                <div style={{ fontSize: 11.5, color: colors.textLight, marginTop: 2 }}>{row.desc}</div>
              </div>
              {renderCheckbox(row.view)}
              {renderCheckbox(row.edit)}
              {renderCheckbox(row.delete)}
            </div>
          );
        }

        if (row.type === 'toggle') {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: idx < _featureRows.length - 1 ? `1px solid #F0EEF8` : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.textDark }}>{row.label}</div>
                <div style={{ fontSize: 11.5, color: colors.textLight, marginTop: 2 }}>{row.desc}</div>
              </div>
              <div style={{ marginLeft: 8 }}>
                <input type="checkbox" checked={permissions[row.key] || false} onChange={e => isAdmin && setPermissions({...permissions, [row.key]: e.target.checked})} disabled={!isAdmin} style={{ width: 18, height: 18, cursor: isAdmin ? 'pointer' : 'default' }} />
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );

  return (
    <div style={{ padding: '24px 28px', maxWidth: 800, margin: '0 auto' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AssignRole" />
      <Toast key={toast.key} message={toast.message} type={toast.type} onClose={() => setToast((prev) => ({ ...prev, message: '' }))} />
      {confirmDlg && (
        <ConfirmDialog message={confirmDlg.message} onConfirm={confirmDlg.onConfirm} onCancel={() => setConfirmDlg(null)} danger={confirmDlg.danger} confirmLabel={confirmDlg.confirmLabel} />
      )}

      <div className="tour-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => showForm ? setShowForm(false) : navigate(-1)} style={{ border: 'none', background: colors.iconBg, cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: colors.textPrimary }}>
            ←
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, margin: 0 }}>
            {showForm ? (isEditMode ? 'Edit User' : 'Assign Role') : 'Team Access'}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
            <HelpCircle size={16} color={colors.textLight} />
          </button>
          {!showForm && isAdmin && <span className="tour-add-btn"><Button onClick={handleCreateClick}>+ Add User</Button></span>}
        </div>
      </div>

      {!showForm && isAdmin && (
        <div className="tour-admin-alert" style={{ padding: '12px', background: colors.primary + '15', borderRadius: radius.md, border: `1px solid ${colors.primary}40`, display: 'flex', gap: 8, marginBottom: 20 }}>
          <Info size={20} color={colors.primary} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: colors.textDark }}>
            <strong>Admin Access Only:</strong> Only Admins can assign roles and manage team access.
            {limitMaxUsers !== -1 && (
               <div style={{ marginTop: 4 }}>
                 You have created <strong>{users.length}</strong> out of <strong>{limitMaxUsers}</strong> users.
                 {users.length >= limitMaxUsers && (
                   <span style={{ marginLeft: 8, color: '#DC2626', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/subscription')}>
                     Upgrade Plan
                   </span>
                 )}
               </div>
            )}
          </div>
        </div>
      )}

      {showForm ? (
        <Card style={{ marginBottom: 24, padding: 20 }}>
          <div className="tour-user-details">
            <Input label="Full Name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Enter full name" />
            <Input label="Email Address" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Enter email address" />
            <Input label={isEditMode ? "New Password (optional)" : "Temporary Password"} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter password" />
          </div>

          <div className="tour-role-select" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Role</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {roleOptions.map((r) => (
                <button key={r} onClick={() => handleRoleChange(r)}
                  style={{ flex: 1, padding: '10px', borderRadius: radius.sm, border: selectedRole === r ? `2px solid ${colors.primaryBlue}` : `1px solid ${colors.cardBorder}`, background: selectedRole === r ? '#FFF5F0' : colors.cardBg, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{r === '__custom_role__' ? 'Custom Role' : r}</div>
                </button>
              ))}
            </div>
          </div>

          {isCustomRole && (
            <div className="tour-custom-role" style={{ marginBottom: 16 }}>
              <Input label="Custom Role Name" value={customRoleName} onChange={e => setCustomRoleName(e.target.value)} placeholder="Type new role name" />
            </div>
          )}

          {(selectedRole === 'Supervisor' || isCustomRole) && (
            <div className="tour-oversees-roles" style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Roles to Oversee</label>
              <div style={{ fontSize: 11, color: colors.textLight, marginBottom: 10 }}>Select the roles this user can approve entries for.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {[...new Set([...availableRolesToOversee, ...selectedOverseesRoles])].map(role => {
                  const isSelected = selectedOverseesRoles.includes(role);
                  return (
                    <div key={role} onClick={() => isAdmin && toggleOverseesRole(role)}
                      style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${isSelected ? colors.primary : colors.cardBorder}`, background: isSelected ? colors.primary + '15' : 'transparent', color: isSelected ? colors.primary : colors.textDark, fontSize: 13, cursor: isAdmin ? 'pointer' : 'default', fontWeight: isSelected ? 600 : 400 }}>
                      {role}
                    </div>
                  );
                })}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={customOverseesInput} onChange={e => setCustomOverseesInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomOverseesRole()} placeholder="Add custom role to oversee" style={{ flex: 1, padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${colors.cardBorder}`, fontSize: 13 }} />
                  <Button variant="secondary" onClick={addCustomOverseesRole}>Add</Button>
                </div>
              )}
            </div>
          )}

          <div className="tour-permissions" style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: colors.textDark, display: 'block' }}>Permissions</label>
            <div style={{ fontSize: 12, color: colors.textLight, marginBottom: 12 }}>Configure what this user can see and do.</div>
            {renderPermissionsTable()}
          </div>

          <div className="tour-project-access" style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: colors.textDark, display: 'block' }}>Project Access <span style={{fontSize: 12, fontWeight: 400, color: colors.textLight}}>(Optional)</span></label>
            <div style={{ fontSize: 12, color: colors.textLight, marginBottom: 10 }}>Select one or more projects. Leave all unchecked for org-wide access.</div>
            {projects.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.textLight }}>No projects found.</div>
            ) : (
              <div style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: radius.md, overflow: 'hidden' }}>
                {projects.map((p, idx) => {
                  const pid = p._id || p.id;
                  const isChecked = selectedProjects.includes(pid);
                  return (
                    <div key={pid} onClick={() => toggleProject(pid)} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: idx < projects.length - 1 ? `1px solid ${colors.cardBorder}` : 'none', cursor: isAdmin ? 'pointer' : 'default' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ width: 16, height: 16, marginRight: 12, pointerEvents: 'none' }} />
                      <div style={{ fontSize: 14, fontWeight: isChecked ? 700 : 500, color: isChecked ? colors.primary : colors.textDark }}>{p.projectName || p.name}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Button>
            {isAdmin && <Button onClick={handleProvision} loading={saving} style={{ flex: 2 }}>{isEditMode ? 'Update User' : 'Assign Role'}</Button>}
          </div>
        </Card>
      ) : loading ? (
        <Spinner style={{ padding: 60 }} />
      ) : error ? (
        <div style={{ color: colors.error, padding: 20, textAlign: 'center' }}>
          <p>{error}</p>
          <Button variant="ghost" onClick={fetchAll}>Retry</Button>
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="No Users" description="Create your first team member to get started." />
      ) : (
        <div className="tour-user-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map((user) => {
            const uid = user._id || user.id;
            const currentRole = user.role || 'user';
            return (
              <Card key={uid} padding="16px 20px" hoverable onClick={() => handleEditClick(user)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: colors.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {user.profilePhoto ? <img src={user.profilePhoto} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <User size={18} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>{user.name || 'Unknown'}</div>
                    <div style={{ fontSize: 13, color: colors.textSecondary }}>{user.email}</div>
                  </div>
                  <Badge variant={currentRole === 'admin' ? 'info' : currentRole === 'supervisor' ? 'success' : 'neutral'}>
                    {currentRole}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
