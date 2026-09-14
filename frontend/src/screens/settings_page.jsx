import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { userAPI, authAPI, subscriptionAPI, notificationAPI } from "../api";
import { Toast, ConfirmDialog } from "../components/Toast";
import { Badge, Button, Card } from "../components/ui";
import { resolveImageUrl } from "../utils/imageUrl";
import { useAuth } from "../contexts/AuthContext";
import {
  User, Mail, Shield, Bell, Globe, ChevronDown, Camera, Pencil, Lock,
  LogOut, Trash2, Users, FileText, KeyRound, Eye, EyeOff, ArrowLeft,
  CreditCard, Palette, Moon, Monitor, Smartphone, Download, AlertTriangle, HelpCircle,
  Save, Check, Building, Upload, X, Type, Image as ImageIcon
} from "lucide-react";
import ModuleTour from "../components/ModuleTour";
import { COMPANY_FONT_OPTIONS } from "../pages/signup_page";
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
  const companyLogoInputRef = useRef(null);
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

  const [companyName, setCompanyName] = useState("");
  const [companyFontStyle, setCompanyFontStyle] = useState("Inter");
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

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

  const isCompanyDirty = Boolean(
    user && (
      companyName !== (user.companyName || "") ||
      companyFontStyle !== (user.companyFontStyle || "Inter") ||
      companyLogo !== (user.companyLogo || null)
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
    notificationAPI.getPreferences()
      .then(({ data }) => {
        const p = data?.preferences || {};
        if (typeof p.email === "boolean") setEmailNotif(p.email);
        if (typeof p.push === "boolean") setPushNotif(p.push);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      setEmail(user.email || "");
      setRole(user.role || "Site Supervisor");
      setCompanyName(user.companyName || "");
      setCompanyFontStyle(user.companyFontStyle || "Inter");
      setCompanyLogo(user.companyLogo || null);
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

  const handleCompanyLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg: "Logo must be smaller than 5MB.", type: "error" });
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
    if (companyLogoInputRef.current) companyLogoInputRef.current.value = "";
  };

  const handleSaveCompany = async () => {
    if (companySaving) return;
    if (!companyName.trim()) {
      setToast({ msg: "Company name cannot be empty.", type: "error" });
      return;
    }
    setCompanySaving(true);
    try {
      const { data } = await userAPI.updateProfile({
        companyName: companyName.trim(),
        companyFontStyle: companyFontStyle || "Inter",
        companyLogo: companyLogo || "",
      });
      const updatedUser = data.user || {
        ...user,
        companyName: companyName.trim(),
        companyFontStyle: companyFontStyle || "Inter",
        companyLogo: companyLogo || null,
      };
      updateUser(updatedUser);
      setCompanyName(updatedUser.companyName || "");
      setCompanyFontStyle(updatedUser.companyFontStyle || "Inter");
      setCompanyLogo(updatedUser.companyLogo || null);
      window.dispatchEvent(new Event("userUpdated"));
      setToast({ msg: "Company branding updated successfully!", type: "success" });
      setCompanySaved(true);
      setTimeout(() => setCompanySaved(false), 2500);
    } catch (err) {
      setToast({ msg: err.response?.data?.message || "Failed to update company branding.", type: "error" });
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
      message: "This will permanently delete your admin account and ALL data associated with it — projects, team members, transactions, and more. This cannot be undone.",
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

          <SectionCard title="Company Branding & Sidebar">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                  COMPANY NAME *
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  style={baseInput}
                />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
                    <Type size={14} color="#F97316" />
                    COMPANY NAME FONT STYLE
                  </label>
                  <span style={{ fontSize: "11px", color: "#F97316", fontWeight: "600" }}>Live Typeface Preview</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                  {COMPANY_FONT_OPTIONS.map((f) => {
                    const isSelected = companyFontStyle === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCompanyFontStyle(f.id)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: isSelected ? "2px solid #F97316" : "1.5px solid #E2E8F0",
                          background: isSelected ? "#FFF7ED" : "#FFFFFF",
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 2px 8px rgba(249, 115, 22, 0.15)" : "none",
                        }}
                      >
                        <span style={{ fontSize: "11px", color: isSelected ? "#EA580C" : "#64748B", fontWeight: 700 }}>
                          {f.name}
                        </span>
                        <span
                          style={{
                            fontFamily: f.font,
                            fontSize: "15px",
                            fontWeight: 800,
                            color: isSelected ? "#0F172A" : "#334155",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {companyName.trim() || "Preview"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <ImageIcon size={14} color="#F97316" />
                  COMPANY LOGO <span style={{ fontWeight: 400, color: "#94A3B8" }}>(Optional — if omitted, only company name appears)</span>
                </label>

                <input
                  ref={companyLogoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleCompanyLogoUpload}
                />

                {companyLogo ? (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "#F8FAFC",
                    border: "1.5px solid #E2E8F0"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <img
                        src={resolveImageUrl(companyLogo)}
                        alt="Company Logo"
                        style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 8, background: "#FFF", border: "1px solid #E2E8F0" }}
                      />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A" }}>Company Logo Uploaded</div>
                        <button
                          type="button"
                          onClick={() => companyLogoInputRef.current?.click()}
                          style={{ background: "none", border: "none", color: "#F97316", fontSize: "12px", fontWeight: "700", padding: 0, cursor: "pointer", marginTop: 2 }}
                        >
                          Replace logo
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCompanyLogo}
                      style={{ background: "#FEE2E2", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "#EF4444", display: "flex" }}
                      title="Remove logo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => companyLogoInputRef.current?.click()}
                    style={{
                      border: "1.5px dashed #CBD5E1",
                      borderRadius: 12,
                      padding: "16px 20px",
                      background: "#F8FAFC",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F97316"; e.currentTarget.style.background = "#FFF7ED"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.background = "#F8FAFC"; }}
                  >
                    <Upload size={18} color="#F97316" />
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                      Upload Company Logo (PNG, JPG, SVG)
                    </span>
                  </div>
                )}
              </div>

              {/* Sidebar Preview Box */}
              <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(249, 115, 22, 0.05)", border: "1px solid rgba(249, 115, 22, 0.15)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#EA580C", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  Sidebar Top Preview
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                }}>
                  {companyLogo && (
                    <img
                      src={resolveImageUrl(companyLogo)}
                      alt="Logo"
                      style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain", flexShrink: 0 }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#111827",
                      fontFamily: COMPANY_FONT_OPTIONS.find(f => f.id === companyFontStyle)?.font || "'Inter', sans-serif",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {companyName.trim() || "Your Company"}
                  </span>
                </div>
              </div>

              <div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveCompany}
                  disabled={companySaving || (!isCompanyDirty && !companySaved)}
                  style={companySaved ? { background: "#10B981", color: "#fff", boxShadow: "0 4px 10px rgba(16, 185, 129, 0.25)" } : undefined}
                >
                  {companySaving ? (
                    <>
                      <Save size={16} /> Saving…
                    </>
                  ) : companySaved ? (
                    <>
                      <Check size={16} /> ✓ Branding Saved!
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Branding
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Notifications" className="tour-notifications">
            <SettingsRow icon={<Bell size={14} />} title="Email Notifications" subtitle="Receive project updates and alerts by email" border={false}
              action={<Toggle on={emailNotif} onToggle={() => {
                const next = !emailNotif;
                setEmailNotif(next);
                notificationAPI.updatePreferences({ email: next }).catch(() => setEmailNotif(!next));
              }} />} />

            <SettingsRow icon={<Bell size={14} />} title="Push Notifications" subtitle="Get instant alerts on the mobile app" border={false}
              action={<Toggle on={pushNotif} onToggle={() => {
                const next = !pushNotif;
                setPushNotif(next);
                notificationAPI.updatePreferences({ push: next }).catch(() => setPushNotif(!next));
              }} />} />
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

          {isAdmin && (
            <SectionCard title="Danger Zone" style={{ border: "1px solid #FECACA" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Delete My Account</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    Permanently delete your admin account and all related data.
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </div>
            </SectionCard>
          )}

          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>BuildTrack Version 2.4.0 (2024)</span>
          </div>

        </div>
      </div>
    </div>
  );
}
