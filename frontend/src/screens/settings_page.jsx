import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { userAPI, authAPI, subscriptionAPI } from "../api";
import { Toast, ConfirmDialog } from "../components/Toast";
import { Badge, Button, Card } from "../components/ui";
import { resolveImageUrl } from "../utils/imageUrl";
import { useAuth } from "../contexts/AuthContext";
import {
  User, Mail, Shield, Bell, Globe, ChevronDown, Camera, Pencil, Lock,
  LogOut, Trash2, Users, FileText, KeyRound, Eye, EyeOff, ArrowLeft,
  CreditCard, Palette, Moon, Monitor, Smartphone, Download, AlertTriangle, HelpCircle,
  Save, Check
} from "lucide-react";
import ModuleTour from "../components/ModuleTour";

import perfLogger from "../utils/performanceLogger";

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle}
      style={{ width: 46, height: 24, borderRadius: 12, cursor: "pointer", background: on ? "#F97316" : "#CBD5E1", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: on ? 24 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left 0.2s" }} />
    </div>
  );
}

function SectionCard({ title, children, style, gradient, className }) {
  return (
    <Card className={className} style={{ background: gradient, padding: "24px 28px", marginBottom: 16, border: gradient ? "none" : undefined, ...style }}>
      {title && <h3 style={{ fontSize: 16, fontWeight: 700, color: gradient ? "#fff" : "#111827", margin: "0 0 20px", letterSpacing: "-0.02em" }}>{title}</h3>}
      {children}
    </Card>
  );
}

function SettingsRow({ icon, title, subtitle, action, border }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: border !== false ? "1px solid #F1F5F9" : "none", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", flexShrink: 0 }}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function SettingsPage() {
  const profileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "Admin";

  useEffect(() => {
    perfLogger.endRoute('/settings');
    perfLogger.logMount('SettingsPage');
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Site Supervisor");
  const [language, setLanguage] = useState("English");
  const currency = "Indian Rupee (INR)";
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [secMsg, setSecMsg] = useState("");
  const [secErr, setSecErr] = useState("");
  const [showPwForm, setShowPwForm] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [runTour, setRunTour] = useState(false);
  const clearToast = useCallback(() => setToast({ msg: "", type: "info" }), []);

  const isDirty = Boolean(
    user && (
      fullName !== (user.name || "") ||
      email !== (user.email || "") ||
      role !== (user.role || "Site Supervisor")
    )
  );

  const tourSteps = [
    { target: '.tour-profile', content: 'Update your personal information and profile picture here.', disableBeacon: true },
    { target: '.tour-notifications', content: 'Toggle email and push notifications on or off.' },
    { target: '.tour-security', content: 'Change your password and manage account security.' },
    { target: '.tour-logout', content: 'Log out securely when you are done.' }
  ];


  useEffect(() => {
    subscriptionAPI.getStatus()
      .then(({ data }) => setSubscription(data?.hasSubscription ? data : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      setEmail(user.email || "");
      setRole(user.role || "Site Supervisor");
      if (user.twoFactorEnabled !== undefined) setTwoFA(user.twoFactorEnabled);
      if (user.profilePhoto) setProfileImage(resolveImageUrl(user.profilePhoto));
      else setProfileImage(null);
    }
  }, [user]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfileImage(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const { data } = await userAPI.updatePhoto(fd);
      const updatedUser = data.user || { ...user, profilePhoto: data.profilePhoto };
      updateUser(updatedUser);
      if (data.profilePhoto || updatedUser.profilePhoto) {
        setProfileImage(resolveImageUrl(data.profilePhoto || updatedUser.profilePhoto));
      }
      setToast({ msg: "Profile photo updated successfully!", type: "success" });
      window.dispatchEvent(new Event("userUpdated"));
    } catch (err) {
      setToast({ msg: err.response?.data?.message || "Failed to upload photo.", type: "error" });
    }
  };

  const handleSaveProfile = async () => {
    if (saving) return;
    if (!fullName.trim() || !email.trim()) {
      setToast({ msg: "Name and email cannot be empty.", type: "error" });
      return;
    }
    try {
      setSaving(true);
      const { data } = await userAPI.updateProfile({
        name: fullName.trim(),
        email: email.trim(),
        role
      });
      const updatedUser = data.user || {
        ...user,
        name: fullName.trim(),
        email: email.trim(),
        role
      };
      updateUser(updatedUser);
      setFullName(updatedUser.name || "");
      setEmail(updatedUser.email || "");
      setRole(updatedUser.role || "Site Supervisor");
      if (updatedUser.profilePhoto) {
        setProfileImage(resolveImageUrl(updatedUser.profilePhoto));
      }
      window.dispatchEvent(new Event("userUpdated"));
      setToast({ msg: "Profile details saved successfully!", type: "success" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setToast({ msg: err.response?.data?.message || "Failed to save profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setSecErr(""); setSecMsg("");
    if (!curPw || !newPw) { setSecErr("Both fields are required."); return; }
    if (newPw.length < 6) { setSecErr("New password must be at least 6 characters."); return; }
    try {
      setPwSaving(true);
      const { data } = await authAPI.changePassword({ currentPassword: curPw, newPassword: newPw });
      setSecMsg(data.message || "Password changed successfully!");
      setCurPw(""); setNewPw(""); setShowPwForm(false);
      setTimeout(() => setSecMsg(""), 4000);
    } catch (err) {
      setSecErr(err.response?.data?.message || "Failed to change password.");
    } finally { setPwSaving(false); }
  };

  const handleToggle2FA = async () => {
    try {
      const { data } = await authAPI.toggle2FA();
      setTwoFA(data.twoFactorEnabled);
      setSecMsg(data.message);
      updateUser({ twoFactorEnabled: data.twoFactorEnabled });
      setTimeout(() => setSecMsg(""), 4000);
    } catch (err) {
      setSecErr(err.response?.data?.message || "Failed to toggle 2FA.");
    }
  };

  const handleSignOutAll = () => {
    setConfirmDlg({
      message: "Sign out from all devices? You will need to log in again.",
      onConfirm: async () => {
        setConfirmDlg(null);
        try { await authAPI.signOutAll(); logout(); navigate("/login"); }
        catch (err) { setSecErr(err.response?.data?.message || "Failed to sign out all sessions."); }
      },
    });
  };

  const handleDeleteAccount = () => {
    setConfirmDlg({
      message: "Are you sure you want to permanently delete your account? This action cannot be undone.",
      danger: true, confirmLabel: "Delete My Account",
      onConfirm: async () => {
        setConfirmDlg(null);
        try { await authAPI.deleteAccount(); logout(); navigate("/login"); }
        catch (err) { setSecErr(err.response?.data?.message || "Failed to delete account."); }
      },
    });
  };
  const baseInput = { width: "100%", padding: "10px 12px", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", fontFamily: "Inter, 'Segoe UI', sans-serif", background: "transparent" }}>
      <div style={{ padding: "24px 28px", maxWidth: 900, margin: "0 auto", paddingBottom: 100 }}>
        <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="Settings" />
        <Toast message={toast.msg} type={toast.type} onClose={clearToast} />
        {confirmDlg && <ConfirmDialog message={confirmDlg.message} danger={confirmDlg.danger} confirmLabel={confirmDlg.confirmLabel} onConfirm={confirmDlg.onConfirm} onCancel={() => setConfirmDlg(null)} />}
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, cursor: "pointer", color: "#64748B", flexShrink: 0 }}>
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Settings</h1>
          </div>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
            <HelpCircle size={16} color={'#94A3B8'} />
          </button>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <SectionCard title="Profile Settings" style={{}} className="tour-profile">
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: isMobile ? "wrap" : "nowrap" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <input ref={profileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#F1F5F9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #E5E7EB" }}>
                  {profileImage ? <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={32} color="#94A3B8" />}
                </div>
                <div onClick={() => profileInputRef.current.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid #fff" }}>
                  <Camera size={12} color="#fff" />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>FULL NAME</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} style={baseInput} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>EMAIL ADDRESS</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} style={baseInput} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>ROLE</label>
                  <input value={role} onChange={e => setRole(e.target.value)} style={{ ...baseInput, maxWidth: isMobile ? "100%" : "50%" }} />
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveProfile}
                  disabled={saving || (!isDirty && !saved)}
                  style={saved ? { background: "#10B981", color: "#fff", boxShadow: "0 4px 10px rgba(16, 185, 129, 0.25)" } : undefined}
                >
                  {saving ? (
                    <>
                      <Save size={16} /> Saving…
                    </>
                  ) : saved ? (
                    <>
                      <Check size={16} /> ✓ Saved!
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Notifications" className="tour-notifications">
            <SettingsRow icon={<Bell size={14} />} title="Notifications" subtitle="Receive project updates and alerts" border={false}
              action={<Toggle on={emailNotif} onToggle={() => setEmailNotif(v => !v)} />} />
          </SectionCard>

          <SectionCard title="Security" className="tour-security">
            <SettingsRow icon={<Lock size={14} />} title="Account Password" subtitle="Manage your account password"
              action={<Button variant="secondary" size="sm" onClick={() => setShowPwForm(v => !v)}>{showPwForm ? "Cancel" : "Change Password"}</Button>} />

            {showPwForm && (
              <div style={{ padding: "14px 0", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Current Password</label>
                    <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="Enter current password" style={baseInput} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>New Password</label>
                    <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" style={baseInput} />
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={handleChangePassword} disabled={pwSaving}>
                  {pwSaving ? "Saving\u2026" : "Update Password"}
                </Button>
              </div>
            )}

            {secMsg && <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, color: "#166534", fontSize: 13, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Shield size={14} /> {secMsg}</div>}
            {secErr && <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: 13, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> {secErr}</div>}
          </SectionCard>

          {subscription && (
            <SectionCard gradient="linear-gradient(135deg, #F97316, #EA580C)" title="Subscription">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, letterSpacing: "0.05em", marginBottom: 4, color: "#fff", textTransform: "uppercase" }}>CURRENT PLAN</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4, textTransform: "capitalize" }}>{subscription.plan || subscription.name || "Free"}</div>
                  <div style={{ fontSize: 13, opacity: 0.8, color: "#fff" }}>
                    {subscription.status === "active" ? "\u2713 Active" : subscription.status || "Active"}
                    {subscription.maxUsers && ` \u00B7 ${subscription.maxUsers} users`}
                    {subscription.maxProjects && ` \u00B7 ${subscription.maxProjects} projects`}
                  </div>
                </div>
                {isAdmin && (
                  <Button variant="secondary" size="sm" onClick={() => navigate("/subscription")}
                    style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>
                    Upgrade Plan
                  </Button>
                )}
              </div>
            </SectionCard>
          )}

          {isAdmin && (
            <SectionCard title="Team & Access">
              <SettingsRow icon={<Users size={14} />} title="Assign Roles" subtitle="Manage team member permissions and roles" border={false}
                action={<Button variant="primary" size="sm" onClick={() => navigate("/assign-role")}>Manage</Button>} />
            </SectionCard>
          )}

          <SectionCard className="tour-logout">
            <Button variant="danger" size="md" fullWidth onClick={() => setConfirmDlg({
              message: "Are you sure you want to log out?",
              onConfirm: () => { setConfirmDlg(null); logout(); navigate("/login"); },
            })}>
              <LogOut size={16} /> Log Out
            </Button>
          </SectionCard>

          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>BuildTrack Version 2.4.0 (2024)</span>
          </div>

        </div>
      </div>
    </div>
  );
}
