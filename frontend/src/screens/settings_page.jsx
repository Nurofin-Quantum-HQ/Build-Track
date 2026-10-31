import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  Bell,
  Camera,
  Lock,
  LogOut,
  Users,
  Palette,
  Check,
  CheckCircle2,
  HelpCircle,
  Save,
  Building2,
  Upload,
  X,
  Type,
  Image as ImageIcon,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CreditCard,
  KeyRound,
  Phone,
} from 'lucide-react';
import { userAPI, authAPI, subscriptionAPI, notificationAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../utils/imageUrl';
import { COMPANY_FONT_OPTIONS } from '../pages/signup_page';
import { applyAccent, ACCENT_PRESETS } from '../styles/designTokens';
import ModuleTour from '../components/ModuleTour';
import { Toast } from '../components/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import BtHero from '../components/ui/BtHero';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtButton from '../components/ui/BtButton';
import BtBadge from '../components/ui/BtBadge';
import BtPressable from '../components/ui/BtPressable';
import BtBricks from '../components/ui/BtBricks';
import perfLogger from '../utils/performanceLogger';

const THEME_PRESETS = [
  { id: 'brass', name: 'Brass', caption: 'Default · Golden warm', hex: ACCENT_PRESETS.brass },
  { id: 'ember', name: 'Ember', caption: 'Orange · High energy', hex: ACCENT_PRESETS.ember },
  { id: 'cobalt', name: 'Cobalt', caption: 'Electric Blue · Crisp', hex: ACCENT_PRESETS.cobalt },
  { id: 'jade', name: 'Jade', caption: 'Emerald Green · Calm', hex: ACCENT_PRESETS.jade },
];

function BtSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? 'var(--ink)' : 'var(--line)',
        border: 'none',
        padding: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'background 200ms ease',
        display: 'inline-flex',
        alignItems: 'center',
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transform: checked ? 'translateX(20px)' : 'translateX(0px)',
          transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'block',
        }}
      />
    </button>
  );
}

function AccentLivePreview({ accentHex }) {
  return (
    <div
      style={{
        background: 'var(--noir, #0C0E12)',
        borderRadius: 18,
        padding: '20px 22px',
        color: 'var(--bone, #F2F0EB)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentHex} 0%, transparent 70%)`,
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.55)',
            fontWeight: 700,
          }}
        >
          LIVE THEME PREVIEW
        </span>
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--bone)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {accentHex.toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 2 }}>
            Total project spend
          </div>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--bone)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ₹1,84,20,500
          </div>
        </div>

        <button
          type="button"
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 10,
            background: accentHex,
            border: 'none',
            color: '#0C0E12',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'default',
            boxShadow: `0 2px 10px ${accentHex}40`,
          }}
        >
          + Log entry
        </button>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 6 }}>
          <span>Construction Progress</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bone)' }}>68%</span>
        </div>
        <BtBricks value={0.68} onDark={true} color={accentHex} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const profileInputRef = useRef(null);
  const companyLogoInputRef = useRef(null);
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    perfLogger.endRoute('/settings');
    perfLogger.logMount('SettingsPage');
  }, []);

  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Site Supervisor');

  const [companyName, setCompanyName] = useState('');
  const [companyFontStyle, setCompanyFontStyle] = useState('Inter');
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [twoFA, setTwoFA] = useState(false);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [secMsg, setSecMsg] = useState('');
  const [secErr, setSecErr] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const [toast, setToast] = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [runTour, setRunTour] = useState(false);

  // Theme Accent State
  const [currentAccentHex, setCurrentAccentHex] = useState(ACCENT_PRESETS.brass);

  useEffect(() => {
    const pref = user?.themePreference || localStorage.getItem('bt_theme_color') || 'brass';
    const hex = ACCENT_PRESETS[pref.toLowerCase()] || (pref.startsWith('#') ? pref : `#${pref}`);
    setCurrentAccentHex(hex);
    applyAccent(hex);
  }, [user?.themePreference]);

  const handleSelectAccent = (colorHex) => {
    setCurrentAccentHex(colorHex);
    applyAccent(colorHex);
    localStorage.setItem('bt_theme_color', colorHex);

    if (user) {
      authAPI
        .updateUser(user.id || user._id, { themePreference: colorHex })
        .then(() => {
          if (updateUser) updateUser({ ...user, themePreference: colorHex });
        })
        .catch(() => {
          userAPI
            .updateProfile({ themePreference: colorHex })
            .then(() => {
              if (updateUser) updateUser({ ...user, themePreference: colorHex });
            })
            .catch((e) => console.error('Failed to sync theme preference:', e));
        });
    }
  };

  const isProfileDirty = Boolean(
    user && (
      fullName !== (user.name || '') ||
      email !== (user.email || '') ||
      phone !== (user.phone || '') ||
      role !== (user.role || 'Site Supervisor')
    )
  );

  const isCompanyDirty = Boolean(
    user && (
      companyName !== (user.companyName || '') ||
      companyFontStyle !== (user.companyFontStyle || 'Inter') ||
      companyLogo !== (user.companyLogo || null)
    )
  );

  const tourSteps = [
    { target: '.tour-profile', content: 'Update your personal profile, role and picture here.' },
    { target: '.tour-branding', content: 'Customize your company name, typography style and logo.' },
    { target: '.tour-theme', content: 'Choose your portal accent color and view the live preview.' },
    { target: '.tour-notifications', content: 'Toggle email and push notifications on or off.' },
    { target: '.tour-security', content: 'Change password and manage account security settings.' },
    { target: '.tour-logout', content: 'Securely log out of your session when finished.' }
  ];

  useEffect(() => {
    subscriptionAPI
      .getStatus()
      .then(({ data }) => setSubscription(data?.hasSubscription ? data : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    notificationAPI
      .getPreferences()
      .then(({ data }) => {
        const p = data?.preferences || {};
        if (typeof p.email === 'boolean') setEmailNotif(p.email);
        if (typeof p.push === 'boolean') setPushNotif(p.push);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRole(user.role || 'Site Supervisor');
      setCompanyName(user.companyName || '');
      setCompanyFontStyle(user.companyFontStyle || 'Inter');
      setCompanyLogo(user.companyLogo || null);
      if (user.twoFactorEnabled !== undefined) setTwoFA(user.twoFactorEnabled);
      if (user.profilePhoto) setProfileImage(resolveImageUrl(user.profilePhoto));
      else setProfileImage(null);
    }
  }, [user]);

  const handleCompanyLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Logo must be smaller than 5MB.', type: 'error', key: Date.now() });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCompanyLogo(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCompanyLogo = () => {
    setCompanyLogo(null);
    if (companyLogoInputRef.current) companyLogoInputRef.current.value = '';
  };

  const handleSaveCompany = async () => {
    if (companySaving) return;
    if (!companyName.trim()) {
      setToast({ message: 'Company name cannot be empty.', type: 'error', key: Date.now() });
      return;
    }
    setCompanySaving(true);
    try {
      const { data } = await userAPI.updateProfile({
        companyName: companyName.trim(),
        companyFontStyle: companyFontStyle || 'Inter',
        companyLogo: companyLogo || '',
      });
      const updatedUser = data.user || {
        ...user,
        companyName: companyName.trim(),
        companyFontStyle: companyFontStyle || 'Inter',
        companyLogo: companyLogo || null,
      };
      updateUser(updatedUser);
      setCompanyName(updatedUser.companyName || '');
      setCompanyFontStyle(updatedUser.companyFontStyle || 'Inter');
      setCompanyLogo(updatedUser.companyLogo || null);
      window.dispatchEvent(new Event('userUpdated'));
      setToast({ message: 'Company branding updated successfully!', type: 'success', key: Date.now() });
      setCompanySaved(true);
      setTimeout(() => setCompanySaved(false), 2500);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to update company branding.', type: 'error', key: Date.now() });
    } finally {
      setCompanySaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfileImage(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await userAPI.updatePhoto(fd);
      const updatedUser = data.user || { ...user, profilePhoto: data.profilePhoto };
      updateUser(updatedUser);
      if (data.profilePhoto || updatedUser.profilePhoto) {
        setProfileImage(resolveImageUrl(data.profilePhoto || updatedUser.profilePhoto));
      }
      setToast({ message: 'Profile photo updated successfully!', type: 'success', key: Date.now() });
      window.dispatchEvent(new Event('userUpdated'));
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to upload photo.', type: 'error', key: Date.now() });
    }
  };

  const handleSaveProfile = async () => {
    if (saving) return;
    if (!fullName.trim() || !email.trim()) {
      setToast({ message: 'Name and email cannot be empty.', type: 'error', key: Date.now() });
      return;
    }
    const cleanPhone = phone.trim() ? phone.trim().replace(/\D/g, '') : '';
    if (cleanPhone && (cleanPhone.length < 8 || cleanPhone.length > 15)) {
      setToast({ message: 'Phone number must be between 8 and 15 digits.', type: 'error', key: Date.now() });
      return;
    }
    try {
      setSaving(true);
      const { data } = await userAPI.updateProfile({
        name: fullName.trim(),
        email: email.trim(),
        role,
        phone: cleanPhone || null,
      });
      const updatedUser = data.user || {
        ...user,
        name: fullName.trim(),
        email: email.trim(),
        role,
        phone: cleanPhone || null,
      };
      updateUser(updatedUser);
      setFullName(updatedUser.name || '');
      setEmail(updatedUser.email || '');
      setPhone(updatedUser.phone || '');
      setRole(updatedUser.role || 'Site Supervisor');
      if (updatedUser.profilePhoto) {
        setProfileImage(resolveImageUrl(updatedUser.profilePhoto));
      }
      window.dispatchEvent(new Event('userUpdated'));
      setToast({ message: 'Profile details saved successfully!', type: 'success', key: Date.now() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to save profile.', type: 'error', key: Date.now() });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setSecErr('');
    setSecMsg('');
    if (!curPw || !newPw) {
      setSecErr('Both current and new passwords are required.');
      return;
    }
    if (newPw.length < 6) {
      setSecErr('New password must be at least 6 characters.');
      return;
    }
    try {
      setPwSaving(true);
      const { data } = await authAPI.changePassword({ currentPassword: curPw, newPassword: newPw });
      setSecMsg(data.message || 'Password changed successfully!');
      setCurPw('');
      setNewPw('');
      setShowPwForm(false);
      setTimeout(() => setSecMsg(''), 4000);
    } catch (err) {
      setSecErr(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      const { data } = await authAPI.toggle2FA();
      setTwoFA(data.twoFactorEnabled);
      setSecMsg(data.message);
      updateUser({ twoFactorEnabled: data.twoFactorEnabled });
      setTimeout(() => setSecMsg(''), 4000);
    } catch (err) {
      setSecErr(err.response?.data?.message || 'Failed to toggle 2FA.');
    }
  };

  const handleSignOutAll = () => {
    setConfirmDlg({
      message: 'Sign out from all devices? You will need to log in again on all browsers and mobile apps.',
      confirmLabel: 'Sign Out All',
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          await authAPI.signOutAll();
          logout();
          navigate('/login');
        } catch (err) {
          setSecErr(err.response?.data?.message || 'Failed to sign out all sessions.');
        }
      },
    });
  };

  const handleDeleteAccount = () => {
    setConfirmDlg({
      message:
        'This will permanently delete your admin account and ALL data associated with it — projects, team members, transactions, and reports. This action CANNOT be undone.',
      danger: true,
      confirmLabel: 'Delete My Account',
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          await authAPI.deleteAccount();
          logout();
          navigate('/login');
        } catch (err) {
          setSecErr(err.response?.data?.message || 'Failed to delete account.');
        }
      },
    });
  };

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
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
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
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="Settings" />
      {confirmDlg && (
        <ConfirmDialog
          message={confirmDlg.message}
          danger={confirmDlg.danger}
          confirmLabel={confirmDlg.confirmLabel}
          onConfirm={confirmDlg.onConfirm}
          onCancel={() => setConfirmDlg(null)}
        />
      )}

      {/* ── HERO BANNER (Blueprint Noir) ── */}
      <BtHero>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
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
                ACCOUNT & PREFERENCES
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
              Settings & Profile
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
              Manage your personal identity, company branding, theme accents, and security credentials.
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

        {/* ── PROFILE IDENTITY CARD (In Hero, matching Flutter) ── */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 20,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* Avatar with Camera Button */}
            <div style={{ position: 'relative' }}>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <div
                onClick={() => profileInputRef.current?.click()}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '3px solid rgba(255, 255, 255, 0.2)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                }}
                title="Change profile picture"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={36} color="var(--bone)" />
                )}
              </div>
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '2px solid var(--noir)',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
                title="Upload Photo"
              >
                <Camera size={13} strokeWidth={2.5} />
              </button>
            </div>

            {/* Identity Text */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--bone)',
                    fontFamily: 'var(--font-serif)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {fullName || user?.name || 'User'}
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 9px',
                    borderRadius: 12,
                    background: 'var(--accent, #E0A93B)',
                    color: '#0C0E12',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {role || user?.role || 'Member'}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(255, 255, 255, 0.65)',
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span>{email || user?.email || 'user@buildtrack.app'}</span>
                {(phone || user?.phone) && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent, #E0A93B)' }}>
                    <Phone size={12} />
                    <span>+91 {phone || user?.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Active Workspace Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {companyLogo ? (
                <img
                  src={resolveImageUrl(companyLogo)}
                  alt="Company Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <Building2 size={16} color="var(--ink)" />
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--bone)',
                  fontFamily: COMPANY_FONT_OPTIONS.find((f) => f.id === companyFontStyle)?.font || 'inherit',
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {companyName || user?.companyName || 'My Workspace'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>Active Organization</div>
            </div>
          </div>
        </div>
      </BtHero>

      {/* ── MAIN CONTENT (Overlapping BtSheet) ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* 1. Subscription Banner (if available) */}
          {subscription && (
            <BtCard
              padding={20}
              style={{
                background: 'linear-gradient(135deg, var(--noir) 0%, var(--noir-2) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--bone)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--gold-brass)',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    CURRENT SUBSCRIPTION
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--bone)' }}>
                    {subscription.plan || subscription.name || 'Pro Plan'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 }}>
                    {subscription.status === 'active' ? '✓ Active Plan' : subscription.status || 'Active'}
                    {subscription.maxUsers && ` · Up to ${subscription.maxUsers} team members`}
                    {subscription.maxProjects && ` · ${subscription.maxProjects} concurrent projects`}
                  </div>
                </div>

                {isAdmin && (
                  <BtButton
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/subscription')}
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      color: 'var(--bone)',
                      background: 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    Upgrade Plan
                  </BtButton>
                )}
              </div>
            </BtCard>
          )}

          {/* 2. Personal Profile Card */}
          <BtCard padding={24} className="tour-profile" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <User size={18} color="var(--ink)" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Personal Profile
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div>
                  <label style={labelStyle}>
                    Full Name <span style={{ color: 'var(--rose-ember)' }}>*</span>
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={inputStyle}
                    placeholder="Your legal name"
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Email Address <span style={{ color: 'var(--rose-ember)' }}>*</span>
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="name@company.com"
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Phone Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 38 }}
                      placeholder="e.g. 9876543210"
                    />
                    <Phone
                      size={15}
                      color="var(--ink-3, #8C92A0)"
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ink-secondary)', marginTop: 4, display: 'block' }}>
                    Used for OTP, payment receipts, and site communication.
                  </span>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Role</label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 360, background: 'var(--surface-sunken)' }}
                  readOnly={!isAdmin}
                  title={!isAdmin ? 'Roles can only be changed by workspace administrators.' : ''}
                />
                {!isAdmin && (
                  <span style={{ fontSize: 11, color: 'var(--ink-secondary)', marginTop: 4, display: 'block' }}>
                    Role permissions are managed by your workspace administrator.
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                <BtButton
                  variant="primary"
                  size="md"
                  onClick={handleSaveProfile}
                  loading={saving}
                  disabled={saving || (!isProfileDirty && !saved)}
                  style={{ minWidth: 140 }}
                >
                  {saved ? (
                    <>
                      <Check size={16} /> Saved!
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </BtButton>
              </div>
            </div>
          </BtCard>

          {/* 3. Company Branding Card */}
          <BtCard padding={24} className="tour-branding" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <Building2 size={18} color="var(--ink)" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Company Branding & Typography
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Company Name */}
              <div>
                <label style={labelStyle}>
                  Company Name <span style={{ color: 'var(--rose-ember)' }}>*</span>
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Construction & Infra Ltd."
                  style={inputStyle}
                />
              </div>

              {/* Font Style Selection */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={labelStyle}>
                    <Type size={14} color="var(--ink)" />
                    Header & Brand Font Style
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
                    Typeface Preview
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  {COMPANY_FONT_OPTIONS.map((f) => {
                    const isSelected = companyFontStyle === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCompanyFontStyle(f.id)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--r-btn, 12px)',
                          border: isSelected ? '2px solid var(--ink)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--surface-sunken)' : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          transition: 'all 140ms ease',
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? 'var(--ink)' : 'var(--ink-secondary)' }}>
                          {f.name}
                        </span>
                        <span
                          style={{
                            fontFamily: f.font,
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--ink)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {companyName.trim() || 'BuildTrack'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Company Logo Upload */}
              <div>
                <label style={labelStyle}>
                  <ImageIcon size={14} color="var(--ink)" />
                  Company Logo <span style={{ fontWeight: 400, color: 'var(--ink-secondary)' }}>(Recommended PNG/SVG)</span>
                </label>

                <input
                  ref={companyLogoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleCompanyLogoUpload}
                />

                {companyLogo ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: 'var(--surface-sunken)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <img
                        src={resolveImageUrl(companyLogo)}
                        alt="Company Logo"
                        style={{
                          width: 44,
                          height: 44,
                          objectFit: 'contain',
                          borderRadius: 8,
                          background: '#FFFFFF',
                          border: '1px solid var(--border)',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Company Logo Attached</div>
                        <button
                          type="button"
                          onClick={() => companyLogoInputRef.current?.click()}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ink)',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: 0,
                            cursor: 'pointer',
                            marginTop: 2,
                            textDecoration: 'underline',
                          }}
                        >
                          Replace logo
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCompanyLogo}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        borderRadius: 8,
                        padding: 8,
                        cursor: 'pointer',
                        color: 'var(--rose-ember, #DC2626)',
                        display: 'flex',
                      }}
                      title="Remove logo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => companyLogoInputRef.current?.click()}
                    style={{
                      border: '1.5px dashed var(--border-strong, #CBD5E1)',
                      borderRadius: 12,
                      padding: '20px 24px',
                      background: 'var(--surface-sunken)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      transition: 'all 140ms ease',
                    }}
                  >
                    <Upload size={18} color="var(--ink)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      Upload Company Logo (PNG, JPG, SVG up to 5MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Sidebar Preview Box */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 14,
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--ink-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 10,
                  }}
                >
                  Sidebar Header Preview
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 18px',
                    borderRadius: 12,
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    maxWidth: 320,
                  }}
                >
                  {companyLogo ? (
                    <img
                      src={resolveImageUrl(companyLogo)}
                      alt="Logo"
                      style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'var(--ink)',
                        color: 'var(--bone)',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {(companyName.trim() || 'BT').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: 'var(--ink)',
                      fontFamily:
                        COMPANY_FONT_OPTIONS.find((f) => f.id === companyFontStyle)?.font || 'inherit',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {companyName.trim() || 'BuildTrack'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                <BtButton
                  variant="primary"
                  size="md"
                  onClick={handleSaveCompany}
                  loading={companySaving}
                  disabled={companySaving || (!isCompanyDirty && !companySaved)}
                  style={{ minWidth: 150 }}
                >
                  {companySaved ? (
                    <>
                      <Check size={16} /> Saved!
                    </>
                  ) : (
                    'Save Branding'
                  )}
                </BtButton>
              </div>
            </div>
          </BtCard>

          {/* 4. Appearance & Theme Color Card */}
          <BtCard padding={24} className="tour-theme" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <Palette size={18} color="var(--ink)" />
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  Workspace Accent Theme
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-secondary)' }}>
                  Applies your brand color across chips, status rings, and progress indicators. Primary buttons remain ink.
                </p>
              </div>
            </div>

            {/* Live Accent Preview Box (Signature from Flutter app) */}
            <div style={{ marginBottom: 20 }}>
              <AccentLivePreview accentHex={currentAccentHex} />
            </div>

            {/* Theme Swatches */}
            <div>
              <label style={labelStyle}>Select Accent Preset</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                {THEME_PRESETS.map((p) => {
                  const isSelected = currentAccentHex.toLowerCase() === p.hex.toLowerCase();
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectAccent(p.hex)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--r-btn, 12px)',
                        border: isSelected ? '2px solid var(--ink)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--surface-sunken)' : '#FFFFFF',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        transition: 'transform 120ms ease',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: p.hex,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          border: '2px solid #FFFFFF',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        }}
                      >
                        {isSelected && <Check size={14} color="#0C0E12" strokeWidth={3} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-secondary)' }}>{p.caption}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Custom Brand Color</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-secondary)' }}>
                    Choose any custom hex code; lightness will be automatically adjusted for optimal contrast.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
                    {currentAccentHex.toUpperCase()}
                  </span>
                  <label
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: currentAccentHex,
                      cursor: 'pointer',
                      border: '2px solid #FFFFFF',
                      boxShadow: '0 0 0 1px var(--border)',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'block',
                    }}
                  >
                    <input
                      type="color"
                      value={currentAccentHex}
                      onChange={(e) => handleSelectAccent(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: -10,
                        left: -10,
                        width: 50,
                        height: 50,
                        opacity: 0,
                        cursor: 'pointer',
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </BtCard>

          {/* 5. Notifications Card */}
          <BtCard padding={24} className="tour-notifications" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <Bell size={18} color="var(--ink)" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Notifications & Alerts
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Email Notifications</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                    Receive project updates, pending approval alerts, and weekly summaries.
                  </div>
                </div>
                <BtSwitch
                  checked={emailNotif}
                  onChange={(val) => {
                    setEmailNotif(val);
                    notificationAPI.updatePreferences({ email: val }).catch(() => setEmailNotif(!val));
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Mobile Push Notifications</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                    Instant alerts on your mobile device for critical site approvals and wage payments.
                  </div>
                </div>
                <BtSwitch
                  checked={pushNotif}
                  onChange={(val) => {
                    setPushNotif(val);
                    notificationAPI.updatePreferences({ push: val }).catch(() => setPushNotif(!val));
                  }}
                />
              </div>
            </div>
          </BtCard>

          {/* 6. Security Card */}
          <BtCard padding={24} className="tour-security" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <Shield size={18} color="var(--ink)" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Security & Authentication
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Password Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Account Password</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                    Ensure your account is protected with a strong, distinct password.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPwForm((v) => !v)}
                  style={{
                    height: 36,
                    padding: '0 14px',
                    borderRadius: 'var(--r-btn, 12px)',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showPwForm ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {/* Password Change Form */}
              {showPwForm && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>Current Password</label>
                      <input
                        type="password"
                        value={curPw}
                        onChange={(e) => setCurPw(e.target.value)}
                        placeholder="Enter current password"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>New Password</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Minimum 6 characters"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <BtButton
                      variant="primary"
                      size="sm"
                      onClick={handleChangePassword}
                      loading={pwSaving}
                      disabled={pwSaving}
                    >
                      Update Password
                    </BtButton>
                  </div>
                </div>
              )}

              {/* Two-Factor Authentication */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Two-Factor Authentication (2FA)</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                    Add an extra layer of security requiring verification upon login.
                  </div>
                </div>
                <BtSwitch checked={twoFA} onChange={handleToggle2FA} />
              </div>

              {/* Sign Out All Sessions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Active Sessions</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                    Sign out across all devices and browsers immediately.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOutAll}
                  style={{
                    height: 36,
                    padding: '0 14px',
                    borderRadius: 'var(--r-btn, 12px)',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Sign Out All
                </button>
              </div>

              {secMsg && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(22, 185, 129, 0.1)',
                    border: '1px solid rgba(22, 185, 129, 0.3)',
                    borderRadius: 10,
                    color: '#065F46',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Shield size={16} /> {secMsg}
                </div>
              )}

              {secErr && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 10,
                    color: '#991B1B',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={16} /> {secErr}
                </div>
              )}
            </div>
          </BtCard>

          {/* 7. Workspace & Team Management (Admin Only) */}
          {isAdmin && (
            <BtCard padding={24} style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                <Users size={18} color="var(--ink)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  Workspace Administration
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  onClick={() => navigate('/admin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--surface-sunken)',
                    cursor: 'pointer',
                    transition: 'background 120ms ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Team Overview & Activity</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                      Inspect team roster, active roles, and recent site submissions.
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--ink-secondary)" />
                </div>

                <div
                  onClick={() => navigate('/assign-role')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--surface-sunken)',
                    cursor: 'pointer',
                    transition: 'background 120ms ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Assign Roles & Permissions</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                      Provision team members, set granular permissions, and scope project access.
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--ink-secondary)" />
                </div>
              </div>
            </BtCard>
          )}

          {/* 8. Logout Button */}
          <div className="tour-logout">
            <button
              type="button"
              onClick={() =>
                setConfirmDlg({
                  message: 'Are you sure you want to log out of your session?',
                  confirmLabel: 'Log Out',
                  onConfirm: () => {
                    setConfirmDlg(null);
                    logout();
                    navigate('/login');
                  },
                })
              }
              style={{
                width: '100%',
                height: 48,
                borderRadius: 'var(--r-btn, 12px)',
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                color: 'var(--rose-ember, #DC2626)',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                transition: 'background 140ms ease',
              }}
            >
              <LogOut size={17} />
              <span>Log Out</span>
            </button>
          </div>

          {/* 9. Danger Zone (Admin Only) */}
          {isAdmin && (
            <BtCard
              padding={20}
              style={{
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--rose-ember, #DC2626)' }}>
                    Delete Workspace Account
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                    Permanently delete your admin account, organization data, and all projects.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    borderRadius: 'var(--r-btn, 12px)',
                    background: 'var(--rose-ember, #DC2626)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Delete Account
                </button>
              </div>
            </BtCard>
          )}

          {/* Footer Info */}
          <div style={{ textAlign: 'center', paddingTop: 12 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                color: 'var(--ink-secondary)',
                textTransform: 'uppercase',
              }}
            >
              BUILDTRACK VERSION 2.4.0 (2024) · BLUEPRINT NOIR V2
            </span>
          </div>

        </div>
      </BtSheet>
    </div>
  );
}
