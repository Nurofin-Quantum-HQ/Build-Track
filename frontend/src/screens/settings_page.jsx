import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Bell,
  Camera,
  LogOut,
  Users,
  Palette,
  Check,
  HelpCircle,
  Building2,
  Upload,
  X,
  Type,
  ChevronRight,
  AlertCircle,
  CreditCard,
  Phone,
  KeyRound,
  Trash2,
  Mail,
} from 'lucide-react';
import { userAPI, authAPI, subscriptionAPI, notificationAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../utils/imageUrl';
import { COMPANY_FONT_OPTIONS } from '../pages/signup_page';
import { applyAccent, ACCENT_PRESETS } from '../styles/designTokens';
import ModuleTour from '../components/ModuleTour';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import BtHero from '../components/ui/BtHero';
import BtPageHeader from '../components/ui/BtPageHeader';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtButton from '../components/ui/BtButton';
import BtBadge from '../components/ui/BtBadge';
import BtSegmented from '../components/ui/BtSegmented';
import BtBricks from '../components/ui/BtBricks';
import BtIconButton from '../components/ui/BtIconButton';
import BtField from '../components/ui/BtField';
import btToast from '../components/ui/BtToast';
import perfLogger from '../utils/performanceLogger';
import { getChosenMotionLevel, setMotionLevel } from '../utils/motion';

const DEFAULT_FONT_ID = COMPANY_FONT_OPTIONS[0].id;

const THEME_PRESETS = [
  { id: 'brass', name: 'Brass', caption: 'Default, golden warm', hex: ACCENT_PRESETS.brass },
  { id: 'ember', name: 'Ember', caption: 'Orange, high energy', hex: ACCENT_PRESETS.ember },
  { id: 'cobalt', name: 'Cobalt', caption: 'Electric blue, crisp', hex: ACCENT_PRESETS.cobalt },
  { id: 'jade', name: 'Jade', caption: 'Emerald green, calm', hex: ACCENT_PRESETS.jade },
];

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function BtSwitch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 'var(--r-full)',
        background: checked ? 'var(--ink)' : 'var(--input-border)',
        border: 'none',
        padding: 3,
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

/** One settings section: icon tile + title + one-line description, then content. */
function SectionCard({ id, icon: Icon, title, description, className, tone, children }) {
  return (
    <BtCard
      id={id}
      className={className}
      padding="24px"
      style={{
        scrollMarginTop: 24,
        ...(tone === 'danger' ? { border: '1px solid var(--status-danger)', background: 'var(--card)' } : {}),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--r-tile)',
            background: tone === 'danger' ? 'var(--status-danger-soft)' : 'var(--fill)',
            color: tone === 'danger' ? 'var(--status-danger)' : 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={19} strokeWidth={1.85} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{title}</h2>
          {description && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45 }}>{description}</p>}
        </div>
      </div>
      {children}
    </BtCard>
  );
}

/** A labelled row: text on the left, control on the right. */
function SettingRow({ title, description, children, first }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        padding: '14px 0',
        borderTop: first ? 'none' : '1px solid var(--line)',
      }}
    >
      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
        {description && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.45 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function AccentLivePreview({ accentHex }) {
  return (
    <div
      style={{
        background: 'var(--noir)',
        borderRadius: 'var(--r-card)',
        padding: '20px 22px',
        color: 'var(--on-noir)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--noir-line)',
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
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <span className="bt-eyebrow" style={{ color: 'var(--on-noir-3)' }}>Live theme preview</span>
        <span
          style={{
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--on-noir)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {accentHex.toUpperCase()}
        </span>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--on-noir-2)', marginBottom: 2 }}>Total project spend</div>
          <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--on-noir)' }}>
            ₹1,84,20,500
          </div>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 34,
            padding: '0 14px',
            borderRadius: 'var(--r-chip)',
            background: accentHex,
            color: 'var(--noir)',
            fontSize: 13,
            fontWeight: 700,
            boxShadow: `0 2px 10px ${accentHex}40`,
          }}
        >
          + Log entry
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--on-noir-2)', marginBottom: 6 }}>
          <span>Construction progress</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--on-noir)' }}>68%</span>
        </div>
        <BtBricks value={0.68} onDark={true} color={accentHex} />
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'branding', label: 'Company branding', icon: Building2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'plan', label: 'Plan', icon: CreditCard },
  { id: 'workspace', label: 'Workspace', icon: Users, adminOnly: true },
  { id: 'account', label: 'Account', icon: LogOut },
];

export default function SettingsPage() {
  const profileInputRef = useRef(null);
  const companyLogoInputRef = useRef(null);
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [motionChoice, setMotionChoice] = useState(getChosenMotionLevel);
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const showNav = useMediaQuery('(min-width: 1100px)');

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
  const [companyFontStyle, setCompanyFontStyle] = useState(DEFAULT_FONT_ID);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [twoFABusy, setTwoFABusy] = useState(false);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [companyError, setCompanyError] = useState('');
  const [pwError, setPwError] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [confirmDlg, setConfirmDlg] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subLoaded, setSubLoaded] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

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
      companyFontStyle !== (user.companyFontStyle || DEFAULT_FONT_ID) ||
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
      .catch(() => {})
      .finally(() => setSubLoaded(true));
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
      setCompanyFontStyle(user.companyFontStyle || DEFAULT_FONT_ID);
      setCompanyLogo(user.companyLogo || null);
      if (user.twoFactorEnabled !== undefined) setTwoFA(user.twoFactorEnabled);
      if (user.profilePhoto) setProfileImage(resolveImageUrl(user.profilePhoto));
      else setProfileImage(null);
    }
  }, [user]);

  // The session user (/auth/me) has no phone; the profile endpoint does.
  useEffect(() => {
    if (user?.phone) return;
    userAPI
      .getProfile()
      .then(({ data }) => {
        const savedPhone = data?.user?.phone;
        if (savedPhone) {
          setPhone(savedPhone);
          updateUser({ phone: savedPhone });
        }
      })
      .catch(() => {});
  }, [user?.id]);

  // Highlight the in-page nav item for the section currently in view
  useEffect(() => {
    if (!showNav) return undefined;
    const ids = NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin).map((n) => n.id);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-10% 0px -70% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [showNav, isAdmin, subLoaded]);

  const goToSection = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCompanyLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      btToast('Logo must be smaller than 5MB.', { error: true });
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
      setCompanyError('Company name cannot be empty.');
      return;
    }
    setCompanyError('');
    setCompanySaving(true);
    try {
      const { data } = await userAPI.updateProfile({
        companyName: companyName.trim(),
        companyFontStyle: companyFontStyle || DEFAULT_FONT_ID,
        companyLogo: companyLogo || '',
      });
      const updatedUser = data.user || {
        ...user,
        companyName: companyName.trim(),
        companyFontStyle: companyFontStyle || DEFAULT_FONT_ID,
        companyLogo: companyLogo || null,
      };
      updateUser(updatedUser);
      setCompanyName(updatedUser.companyName || '');
      setCompanyFontStyle(updatedUser.companyFontStyle || DEFAULT_FONT_ID);
      setCompanyLogo(updatedUser.companyLogo || null);
      window.dispatchEvent(new Event('userUpdated'));
      btToast('Company branding updated successfully!');
      setCompanySaved(true);
      setTimeout(() => setCompanySaved(false), 2500);
    } catch (err) {
      btToast(err.response?.data?.message || 'Failed to update company branding.', { error: true });
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
      btToast('Profile photo updated successfully!');
      window.dispatchEvent(new Event('userUpdated'));
    } catch (err) {
      btToast(err.response?.data?.message || 'Failed to upload photo.', { error: true });
    }
  };

  const handleSaveProfile = async () => {
    if (saving) return;
    const errs = {};
    if (!fullName.trim()) errs.name = 'Name cannot be empty.';
    if (!email.trim()) errs.email = 'Email cannot be empty.';
    const cleanPhone = phone.trim() ? phone.trim().replace(/\D/g, '') : '';
    if (cleanPhone && (cleanPhone.length < 8 || cleanPhone.length > 15)) {
      errs.phone = 'Phone number must be between 8 and 15 digits.';
    }
    setProfileErrors(errs);
    if (Object.keys(errs).length) return;
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
      btToast('Profile details saved successfully!');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      btToast(err.response?.data?.message || 'Failed to save profile.', { error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (!curPw || !newPw) {
      setPwError('Both current and new passwords are required.');
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    try {
      setPwSaving(true);
      const { data } = await authAPI.changePassword({ currentPassword: curPw, newPassword: newPw });
      btToast(data.message || 'Password changed successfully!');
      setCurPw('');
      setNewPw('');
      setShowPwForm(false);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    if (twoFABusy) return;
    setTwoFABusy(true);
    try {
      const { data } = await authAPI.toggle2FA();
      setTwoFA(data.twoFactorEnabled);
      btToast(data.message || (data.twoFactorEnabled ? 'Two-factor authentication turned on.' : 'Two-factor authentication turned off.'));
      updateUser({ twoFactorEnabled: data.twoFactorEnabled });
    } catch (err) {
      btToast(err.response?.data?.message || 'Failed to toggle 2FA.', { error: true });
    } finally {
      setTwoFABusy(false);
    }
  };

  const handleSignOutAll = () => {
    setConfirmDlg({
      message: 'Sign out from all devices? You will need to log in again on all browsers and mobile apps.',
      confirmLabel: 'Sign out all',
      onConfirm: async () => {
        setConfirmDlg(null);
        setSignOutBusy(true);
        try {
          await authAPI.signOutAll();
          logout();
          navigate('/login');
        } catch (err) {
          btToast(err.response?.data?.message || 'Failed to sign out all sessions.', { error: true });
          setSignOutBusy(false);
        }
      },
    });
  };

  const handleDeleteAccount = () => {
    setConfirmDlg({
      message:
        'This will permanently delete your admin account and ALL data associated with it: projects, team members, transactions, and reports. This action CANNOT be undone.',
      danger: true,
      confirmLabel: 'Delete my account',
      onConfirm: async () => {
        setConfirmDlg(null);
        setDeleteBusy(true);
        try {
          await authAPI.deleteAccount();
          logout();
          navigate('/login');
        } catch (err) {
          btToast(err.response?.data?.message || 'Failed to delete account.', { error: true });
          setDeleteBusy(false);
        }
      },
    });
  };

  const updateNotif = (key, val, setter) => {
    setter(val);
    notificationAPI
      .updatePreferences({ [key]: val })
      .catch(() => {
        setter(!val);
        btToast('Could not save notification preference.', { error: true });
      });
  };

  const fontFamilyFor = (id) => COMPANY_FONT_OPTIONS.find((f) => f.id === id)?.font || 'inherit';
  const planName = subscription ? (subscription.plan || subscription.name || 'Pro') : 'Free';
  const planTitle = planName.charAt(0).toUpperCase() + planName.slice(1);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
      {/* Profile */}
      <SectionCard
        id="profile"
        className="tour-profile"
        icon={User}
        title="Personal profile"
        description="How you appear to your team."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="bt-grid-2">
            <BtField
              label="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your legal name"
              error={profileErrors.name}
              autoComplete="name"
            />
            <BtField
              label="Email address"
              required
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              error={profileErrors.email}
              autoComplete="email"
            />
            <BtField
              label="Phone number"
              type="tel"
              inputMode="tel"
              icon={Phone}
              prefix="+91"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              error={profileErrors.phone}
              helperText="Used for OTP, payment receipts and site communication."
              autoComplete="tel"
            />
            <BtField
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!isAdmin}
              helperText={!isAdmin ? 'Role permissions are managed by your workspace administrator.' : undefined}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <BtButton
              variant="primary"
              onClick={handleSaveProfile}
              loading={saving}
              disabled={saving || (!isProfileDirty && !saved)}
              icon={saved ? Check : undefined}
              style={{ minWidth: 170 }}
            >
              {saved ? 'Saved' : 'Save profile'}
            </BtButton>
          </div>
        </div>
      </SectionCard>

      {/* Branding */}
      <SectionCard
        id="branding"
        className="tour-branding"
        icon={Building2}
        title="Company branding"
        description="Name, typeface and logo shown in the sidebar and on reports."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <BtField
            label="Company name"
            required
            value={companyName}
            onChange={(e) => { setCompanyName(e.target.value); setCompanyError(''); }}
            placeholder="e.g. Apex Construction & Infra Ltd."
            error={companyError}
          />

          <div role="radiogroup" aria-label="Header and brand font style">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 600, fontSize: 13, color: 'var(--ink-2)' }}>
              <Type size={14} /> Header and brand font
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {COMPANY_FONT_OPTIONS.map((f) => {
                const isSelected = companyFontStyle === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setCompanyFontStyle(f.id)}
                    className="bt-hover-row"
                    style={{
                      padding: '12px 14px',
                      minHeight: 64,
                      borderRadius: 'var(--r-input)',
                      border: isSelected ? '2px solid var(--ink)' : '2px solid var(--line)',
                      background: isSelected ? 'var(--bone)' : 'var(--card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--ink)' : 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>
                      {f.name}
                    </span>
                    <span
                      style={{
                        fontFamily: f.font,
                        fontSize: 17,
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

          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
              Company logo <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(PNG, JPG or SVG, up to 5MB)</span>
            </div>
            <input
              ref={companyLogoInputRef}
              type="file"
              accept="image/*"
              aria-label="Upload company logo"
              style={{ display: 'none' }}
              onChange={handleCompanyLogoUpload}
            />
            {companyLogo ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 'var(--r-input)',
                  background: 'var(--bone)',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <img
                    src={resolveImageUrl(companyLogo)}
                    alt="Company logo"
                    style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 'var(--r-chip)', background: 'var(--card)', border: '1px solid var(--line)', flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Logo attached</div>
                    <button
                      type="button"
                      onClick={() => companyLogoInputRef.current?.click()}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-ink)', fontSize: 13, fontWeight: 600, padding: '4px 0', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Replace logo
                    </button>
                  </div>
                </div>
                <BtIconButton icon={X} label="Remove logo" onClick={handleRemoveCompanyLogo} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => companyLogoInputRef.current?.click()}
                className="bt-hover-row"
                style={{
                  width: '100%',
                  border: '1.5px dashed var(--input-border)',
                  borderRadius: 'var(--r-input)',
                  padding: '22px 24px',
                  background: 'var(--bone)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: 'var(--ink)',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <Upload size={18} /> Upload company logo
              </button>
            )}
          </div>

          <div style={{ padding: '16px 20px', borderRadius: 'var(--r-tile)', background: 'var(--bone)', border: '1px solid var(--line)' }}>
            <div className="bt-eyebrow" style={{ color: 'var(--ink-3)', marginBottom: 10 }}>Sidebar header preview</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 18px',
                borderRadius: 'var(--r-input)',
                background: 'var(--card)',
                border: '1px solid var(--line)',
                maxWidth: 320,
              }}
            >
              {companyLogo ? (
                <img src={resolveImageUrl(companyLogo)} alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--ink)',
                    color: 'var(--on-noir)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {(companyName.trim() || 'BT').slice(0, 2).toUpperCase()}
                </div>
              )}
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  fontFamily: fontFamilyFor(companyFontStyle),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {companyName.trim() || 'BuildTrack'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <BtButton
              variant="primary"
              onClick={handleSaveCompany}
              loading={companySaving}
              disabled={companySaving || (!isCompanyDirty && !companySaved)}
              icon={companySaved ? Check : undefined}
              style={{ minWidth: 170 }}
            >
              {companySaved ? 'Saved' : 'Save branding'}
            </BtButton>
          </div>
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard
        id="appearance"
        className="tour-theme"
        icon={Palette}
        title="Accent colour"
        description="Used on chips, status rings and progress bars. Primary buttons stay ink."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AccentLivePreview accentHex={currentAccentHex} />

          <div role="radiogroup" aria-label="Accent preset" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
            {THEME_PRESETS.map((p) => {
              const isSelected = currentAccentHex.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectAccent(p.hex)}
                  className="bt-hover-row"
                  style={{
                    padding: '12px 14px',
                    minHeight: 56,
                    borderRadius: 'var(--r-input)',
                    border: isSelected ? '2px solid var(--ink)' : '2px solid var(--line)',
                    background: isSelected ? 'var(--bone)' : 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: p.hex,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      boxShadow: '0 0 0 2px var(--card), 0 0 0 3px var(--line)',
                    }}
                  >
                    {isSelected && <Check size={15} color="var(--noir)" strokeWidth={3} />}
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)' }}>{p.caption}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <SettingRow first title="Custom brand colour" description="Pick any colour. Lightness is adjusted automatically for readable contrast.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                {currentAccentHex.toUpperCase()}
              </span>
              <input
                type="color"
                aria-label="Custom brand colour"
                value={currentAccentHex}
                onChange={(e) => handleSelectAccent(e.target.value)}
                style={{
                  width: 48,
                  height: 40,
                  padding: 3,
                  borderRadius: 'var(--r-chip)',
                  border: '1px solid var(--input-border)',
                  background: 'var(--card)',
                  cursor: 'pointer',
                }}
              />
            </div>
          </SettingRow>
        </div>
      <div style={{ marginTop: 24 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
            Motion
          </div>
          <BtSegmented
            options={[
              { label: 'Full', value: 'full' },
              { label: 'Reduced', value: 'reduced' },
              { label: 'Off', value: 'off' },
            ]}
            value={motionChoice}
            onChange={(level) => {
              setMotionChoice(level);
              setMotionLevel(level);
            }}
          />
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-3)', marginTop: 8 }}>
            {motionChoice === 'full' && 'Pages and numbers animate. This is the default.'}
            {motionChoice === 'reduced' && 'Soft fades only, with no movement.'}
            {motionChoice === 'off' && 'Nothing moves. Changes appear instantly.'}
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        id="notifications"
        className="tour-notifications"
        icon={Bell}
        title="Notifications"
        description="Choose how BuildTrack reaches you."
      >
        <div>
          <SettingRow first title="Email notifications" description="Project updates, pending approval alerts and weekly summaries.">
            <BtSwitch label="Email notifications" checked={emailNotif} onChange={(val) => updateNotif('email', val, setEmailNotif)} />
          </SettingRow>
          <SettingRow title="Mobile push notifications" description="Instant alerts on your phone for site approvals and wage payments.">
            <BtSwitch label="Mobile push notifications" checked={pushNotif} onChange={(val) => updateNotif('push', val, setPushNotif)} />
          </SettingRow>
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard
        id="security"
        className="tour-security"
        icon={Shield}
        title="Security"
        description="Password, two-factor sign-in and active sessions."
      >
        <div>
          <SettingRow first title="Account password" description="Use a strong password you do not use anywhere else.">
            <BtButton
              variant="secondary"
              size="small"
              icon={KeyRound}
              onClick={() => { setShowPwForm((v) => !v); setPwError(''); }}
            >
              {showPwForm ? 'Cancel' : 'Change password'}
            </BtButton>
          </SettingRow>

          {showPwForm && (
            <div style={{ padding: 18, marginBottom: 6, borderRadius: 'var(--r-input)', background: 'var(--bone)', border: '1px solid var(--line)' }}>
              <div className="bt-grid-2" style={{ marginBottom: 14 }}>
                <BtField
                  label="Current password"
                  type="password"
                  value={curPw}
                  onChange={(e) => { setCurPw(e.target.value); setPwError(''); }}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
                <BtField
                  label="New password"
                  type="password"
                  value={newPw}
                  onChange={(e) => { setNewPw(e.target.value); setPwError(''); }}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  error={pwError}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <BtButton variant="primary" size="small" onClick={handleChangePassword} loading={pwSaving}>
                  Update password
                </BtButton>
              </div>
            </div>
          )}

          <SettingRow title="Two-factor authentication" description="Require a verification code when you sign in.">
            <BtSwitch label="Two-factor authentication" checked={twoFA} disabled={twoFABusy} onChange={handleToggle2FA} />
          </SettingRow>

          <SettingRow title="Active sessions" description="Sign out of every browser and mobile device at once.">
            <BtButton variant="secondary" size="small" loading={signOutBusy} onClick={handleSignOutAll}>
              Sign out all
            </BtButton>
          </SettingRow>
        </div>
      </SectionCard>

      {/* Plan */}
      <SectionCard
        id="plan"
        icon={CreditCard}
        title="Your plan"
        description="What your workspace is subscribed to."
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                {planTitle}
              </span>
              {subscription?.status && (
                <BtBadge tone={subscription.status === 'active' ? 'success' : 'warning'} label={subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)} />
              )}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4 }}>
              {subscription
                ? [
                    subscription.maxUsers && `Up to ${subscription.maxUsers} team members`,
                    subscription.maxProjects && `${subscription.maxProjects} concurrent projects`,
                    subscription.endDate && `Renews ${new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
                  ].filter(Boolean).join(' · ') || 'Subscription active'
                : subLoaded ? 'No paid plan active' : ' '}
            </div>
          </div>
          {isAdmin && (
            <BtButton variant="secondary" size="small" trailingIcon={ChevronRight} onClick={() => navigate('/subscription')}>
              {subscription ? 'Manage plan' : 'Upgrade plan'}
            </BtButton>
          )}
        </div>
      </SectionCard>

      {/* Workspace admin */}
      {isAdmin && (
        <SectionCard
          id="workspace"
          icon={Users}
          title="Workspace administration"
          description="Manage your team and what they can access."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { to: '/admin', title: 'Team overview and activity', desc: 'Inspect team roster, active roles and recent site submissions.' },
              { to: '/assign-role', title: 'Assign roles and permissions', desc: 'Add team members, set permissions and scope project access.' },
            ].map((row) => (
              <button
                key={row.to}
                type="button"
                onClick={() => navigate(row.to)}
                className="bt-hover-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 16px',
                  minHeight: 60,
                  borderRadius: 'var(--r-input)',
                  background: 'var(--bone)',
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{row.title}</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{row.desc}</span>
                </span>
                <ChevronRight size={18} color="var(--ink-3)" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Account: log out + danger zone */}
      <SectionCard
        id="account"
        icon={LogOut}
        title="Session"
        description="Sign out of BuildTrack on this device."
      >
        <div className="tour-logout">
          <BtButton
            variant="secondary"
            icon={LogOut}
            fullWidth
            onClick={() =>
              setConfirmDlg({
                message: 'Are you sure you want to log out of your session?',
                confirmLabel: 'Log out',
                onConfirm: () => {
                  setConfirmDlg(null);
                  logout();
                  navigate('/login');
                },
              })
            }
          >
            Log out
          </BtButton>
        </div>
      </SectionCard>

      {isAdmin && (
        <SectionCard
          id="danger"
          tone="danger"
          icon={Trash2}
          title="Delete workspace account"
          description="Permanently deletes your admin account, organisation data and all projects. This cannot be undone."
        >
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <BtButton variant="destructive" size="small" loading={deleteBusy} icon={Trash2} onClick={handleDeleteAccount}>
              Delete account
            </BtButton>
          </div>
        </SectionCard>
      )}

      <div style={{ textAlign: 'center', paddingTop: 4 }}>
        <span className="bt-eyebrow" style={{ color: 'var(--ink-3)' }}>
          BuildTrack version 2.4.0 (2024) · Blueprint Noir v2
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="Settings" />
      <ConfirmDialog
        open={!!confirmDlg}
        message={confirmDlg?.message || ''}
        danger={confirmDlg?.danger}
        confirmLabel={confirmDlg?.confirmLabel}
        onConfirm={confirmDlg?.onConfirm}
        onCancel={() => setConfirmDlg(null)}
      />

      {/* ── HERO ── */}
      <BtHero>
        <BtPageHeader
          eyebrow="Account and preferences"
          title="Settings & Profile"
          subtitle="Your identity, company branding, theme and security, all in one place."
          actions={<BtIconButton onDark icon={HelpCircle} label="Page tour" onClick={() => setRunTour(true)} />}
        >
          {/* Profile identity card */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--noir-line)',
              borderRadius: 'var(--r-card)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Upload profile photo"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => profileInputRef.current?.click()}
                  aria-label="Change profile photo"
                  title="Change profile photo"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={34} color="var(--on-noir)" strokeWidth={1.6} />
                  )}
                </button>
                <span
                  aria-hidden="true"
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
                    color: 'var(--ink)',
                    pointerEvents: 'none',
                  }}
                >
                  <Camera size={13} strokeWidth={2.4} />
                </span>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 700,
                      color: 'var(--on-noir)',
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '-0.01em',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {fullName || user?.name || 'User'}
                  </h2>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 24,
                      padding: '0 10px',
                      borderRadius: 'var(--r-full)',
                      background: 'var(--accent)',
                      color: 'var(--on-accent)',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {role || user?.role || 'Member'}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--on-noir-2)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ overflowWrap: 'anywhere' }}>{email || user?.email || ''}</span>
                  {(phone || user?.phone) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Phone size={13} />
                      <span>+91 {phone || user?.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Active workspace pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderRadius: 'var(--r-tile)',
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid var(--noir-line)',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {companyLogo ? (
                  <img src={resolveImageUrl(companyLogo)} alt="Company logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Building2 size={17} color="var(--ink)" />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--on-noir)',
                    fontFamily: fontFamilyFor(companyFontStyle),
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {companyName || user?.companyName || 'My Workspace'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--on-noir-3)' }}>Active organisation</div>
              </div>
            </div>
          </div>
        </BtPageHeader>
      </BtHero>

      {/* ── SHEET ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div
          style={{
            maxWidth: showNav ? 1120 : 820,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: showNav ? '210px minmax(0, 1fr)' : 'minmax(0, 1fr)',
            gap: 36,
            alignItems: 'start',
          }}
        >
          {showNav && (
            <nav aria-label="Settings sections" style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin).map((n) => {
                const active = activeSection === n.id;
                const Icon = n.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => goToSection(n.id)}
                    aria-current={active ? 'true' : undefined}
                    className="bt-hover-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      height: 42,
                      padding: '0 12px',
                      borderRadius: 'var(--r-chip)',
                      border: 'none',
                      background: active ? 'var(--card)' : 'transparent',
                      boxShadow: active ? 'var(--shadow-card)' : 'none',
                      color: active ? 'var(--ink)' : 'var(--ink-2)',
                      fontSize: 14,
                      fontWeight: active ? 600 : 500,
                      fontFamily: 'var(--font-ui)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={16} strokeWidth={active ? 2.1 : 1.8} />
                    {n.label}
                  </button>
                );
              })}
            </nav>
          )}
          {content}
        </div>
      </BtSheet>
    </div>
  );
}
