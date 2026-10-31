import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api";
import {
  User,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  Building,
  CheckCircle,
  AlertTriangle,
  Upload,
  X,
  Type,
  Image as ImageIcon,
  Phone
} from "lucide-react";
import LightPremiumInput from "../components/ui/LightPremiumInput";
import nurofinLogo from "../assets/nurofin-black.svg";

export const COMPANY_FONT_OPTIONS = [
  { id: "Inter", name: "Inter (Modern)", font: "'Inter', sans-serif" },
  { id: "Outfit", name: "Outfit (Bold)", font: "'Outfit', sans-serif" },
  { id: "Poppins", name: "Poppins (Clean)", font: "'Poppins', sans-serif" },
  { id: "Montserrat", name: "Montserrat (Architectural)", font: "'Montserrat', sans-serif" },
  { id: "Roboto", name: "Roboto (Technical)", font: "'Roboto', sans-serif" },
  { id: "Playfair Display", name: "Playfair Display (Serif)", font: "'Playfair Display', serif" },
  { id: "Cinzel", name: "Cinzel (Classic)", font: "'Cinzel', serif" },
  { id: "Caveat", name: "Caveat (Script)", font: "'Caveat', cursive" },
];

const features = [
  { title: "Real-time dashboards",  desc: "Track every project metric and rupee live."  },
  { title: "Worker management",     desc: "Manage teams and daily wages across all sites." },
  { title: "Financial reporting",   desc: "Budgets, material costs & cash flow clarity." },
  { title: "Site tracking",         desc: "Monitor construction progress on every floor." },
];

export default function SignUpPage() {
  const navigate = useNavigate();
  const [vw, setVw] = useState(window.innerWidth);
  const logoInputRef = useRef(null);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyFontStyle, setCompanyFontStyle] = useState("Inter");
  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState("");

  useEffect(() => {
    const handleResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktop = vw >= 1024;

  const handleSendOtp = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors(p => ({...p, email: "Enter a valid company email."}));
      setShake(true); setTimeout(() => setShake(false), 420);
      return;
    }
    setOtpLoading(true);
    setServerErr("");
    try {
      await authAPI.sendRegistrationOtp({ email: email.trim() });
      setOtpSent(true);
    } catch (err) {
      const msg = err.friendlyMessage || err.response?.data?.message || "Failed to send OTP.";
      setServerErr(msg);
      setShake(true); setTimeout(() => setShake(false), 420);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      setErrors(p => ({...p, otp: "Enter the code sent to your email."}));
      return;
    }
    setVerifyLoading(true);
    setServerErr("");
    try {
      await authAPI.verifyRegistrationOtp({ email: email.trim(), otp: otp.trim() });
      setIsEmailVerified(true);
      setErrors(p => ({...p, email: "", otp: ""}));
    } catch (err) {
      const msg = err.friendlyMessage || err.response?.data?.message || "Incorrect verification code.";
      setServerErr(msg);
      setShake(true); setTimeout(() => setShake(false), 420);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(p => ({ ...p, logo: "File size exceeds 5MB limit" }));
        return;
      }
      setCompanyLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setErrors(p => ({ ...p, logo: "" }));
    }
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.name = "Full name is required.";
    if (!phone.trim()) e.phone = "Phone number is required.";
    if (!isEmailVerified) e.email = "Please verify your email address.";
    if (isEmailVerified && !companyName.trim()) e.companyName = "Company name is required.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "At least 6 characters.";
    if (password !== confirm) e.confirm = "Passwords do not match.";
    if (!agreed) e.agreed = "You must agree to the Terms of Service.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }

    setLoading(true);
    setServerErr("");
    try {
      const fd = new FormData();
      fd.append("name", fullName.trim());
      fd.append("email", email.trim());
      fd.append("password", password);
      fd.append("phone", phone.trim());
      fd.append("companyName", companyName.trim());
      fd.append("companyFontStyle", companyFontStyle);
      if (companyLogo) {
        fd.append("companyLogo", companyLogo);
      }

      await authAPI.register(fd);
      navigate("/login", { state: { registered: true, email: email.trim() } });
    } catch (err) {
      const msg = err.friendlyMessage || err.response?.data?.message || "Registration failed. Try again.";
      setServerErr(msg);
      setShake(true);
      setTimeout(() => setShake(false), 420);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-ground, #F2F0EB)",
        backgroundImage: "radial-gradient(rgba(17, 19, 23, 0.08) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        fontFamily: "var(--font-ui, 'Instrument Sans', sans-serif)",
        position: "relative",
        padding: "36px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isDesktop ? "1.1fr 0.9fr" : "1fr",
          gap: isDesktop ? "64px" : "32px",
          alignItems: "flex-start",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Left Column (Desktop) */}
        {isDesktop && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <img
                src="/buildtrack-logo.png"
                alt="BuildTrack"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  objectFit: "contain",
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-serif, 'Bricolage Grotesque', sans-serif)",
                  fontSize: 36,
                  fontWeight: 800,
                  color: "var(--ink, #111317)",
                  letterSpacing: "-0.02em",
                }}
              >
                BuildTrack
              </span>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 32,
                padding: "4px 12px",
                background: "rgba(255, 255, 255, 0.8)",
                border: "1px solid var(--border, #E6E3DC)",
                borderRadius: 20,
                width: "fit-content",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--ink-secondary, #525864)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                POWERED BY
              </span>
              <img
                src={nurofinLogo}
                alt="Nurofin"
                style={{ height: 16, width: "auto", objectFit: "contain", display: "block" }}
              />
            </div>

            <h1
              style={{
                fontFamily: "var(--font-serif, 'Bricolage Grotesque', sans-serif)",
                fontSize: 48,
                fontWeight: 800,
                color: "var(--ink, #111317)",
                lineHeight: 1.12,
                margin: "0 0 20px",
                letterSpacing: "-0.03em",
              }}
            >
              Build smarter. <br />
              <span style={{ color: "var(--accent, #E0A93B)" }}>Track everything.</span>
            </h1>

            <p
              style={{
                fontSize: 16,
                color: "var(--ink-secondary, #525864)",
                lineHeight: 1.6,
                margin: "0 0 36px",
                maxWidth: 480,
                fontWeight: 500,
              }}
            >
              From site operations to financial reporting — everything your construction team needs, unified in one platform.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {features.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--ink, #111317)",
                      color: "var(--bone, #F2F0EB)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <CheckCircle size={14} />
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "var(--ink, #111317)" }}>
                      {item.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--ink-secondary, #525864)", lineHeight: 1.4 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right Column: Sign Up Form Card */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#FFFFFF",
              border: "1px solid var(--border, #E6E3DC)",
              borderRadius: 24,
              padding: isDesktop ? "44px 38px" : "32px 24px",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.05)",
              boxSizing: "border-box",
              position: "relative",
              transform: shake ? "translateX(-6px)" : "none",
              transition: "transform 100ms ease",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 24, textAlign: isDesktop ? "left" : "center" }}>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  fontFamily: "var(--font-serif, 'Bricolage Grotesque', sans-serif)",
                  color: "var(--ink, #111317)",
                  margin: "0 0 6px",
                  letterSpacing: "-0.01em",
                }}
              >
                Create your account
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-secondary, #525864)" }}>
                Start your 14-day free trial. No credit card required.
              </p>
            </div>

            {serverErr && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} color="var(--rose-ember, #DC2626)" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--rose-ember, #DC2626)", fontWeight: 600, lineHeight: 1.4 }}>
                  {serverErr}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <LightPremiumInput
                type="text"
                label="Full Name"
                icon={User}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrors((p) => ({ ...p, name: "" }));
                  setServerErr("");
                }}
                error={errors.name}
                autoComplete="name"
              />

              <LightPremiumInput
                type="tel"
                label="Phone Number"
                icon={Phone}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors((p) => ({ ...p, phone: "" }));
                  setServerErr("");
                }}
                error={errors.phone}
                autoComplete="tel"
              />

              {/* Email with Verification */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <LightPremiumInput
                    type="email"
                    label="Company Email"
                    icon={Mail}
                    value={email}
                    onChange={(e) => {
                      if (isEmailVerified) return;
                      setEmail(e.target.value);
                      setErrors((p) => ({ ...p, email: "" }));
                      setServerErr("");
                      setOtpSent(false);
                    }}
                    error={errors.email}
                    autoComplete="email"
                  />
                </div>
                {!isEmailVerified && !otpSent && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading || !email.trim()}
                    style={{
                      background: "var(--ink, #111317)",
                      color: "var(--bone, #F2F0EB)",
                      border: "none",
                      borderRadius: 10,
                      padding: "0 16px",
                      height: 48,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: otpLoading || !email.trim() ? "not-allowed" : "pointer",
                      opacity: otpLoading || !email.trim() ? 0.6 : 1,
                    }}
                  >
                    {otpLoading ? "SENDING..." : "VERIFY"}
                  </button>
                )}
                {isEmailVerified && (
                  <div
                    style={{
                      height: 48,
                      color: "var(--jade, #059669)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <CheckCircle size={16} /> VERIFIED
                  </div>
                )}
              </div>

              {!isEmailVerified && otpSent && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <LightPremiumInput
                        type="text"
                        label="Verification Code (OTP)"
                        icon={Shield}
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value);
                          setErrors((p) => ({ ...p, otp: "" }));
                          setServerErr("");
                        }}
                        error={errors.otp}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyLoading || otp.length < 4}
                      style={{
                        background: "var(--jade, #059669)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "0 16px",
                        height: 48,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: verifyLoading || otp.length < 4 ? "not-allowed" : "pointer",
                        opacity: verifyLoading || otp.length < 4 ? 0.6 : 1,
                      }}
                    >
                      {verifyLoading ? "CHECKING..." : "CONFIRM"}
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-start", marginTop: -8 }}>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--ink, #111317)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: 0,
                        textDecoration: "underline",
                      }}
                    >
                      Resend Code
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Company Setup & Password */}
              {isEmailVerified && (
                <>
                  <LightPremiumInput
                    type="text"
                    label="Company Name *"
                    icon={Building}
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setErrors((p) => ({ ...p, companyName: "" }));
                      setServerErr("");
                    }}
                    error={errors.companyName}
                    placeholder="e.g. Apex Construction & Infra"
                    autoComplete="organization"
                  />

                  {/* Brand Typography */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                        <Type size={14} color="var(--ink)" />
                        <span>Company Font Style</span>
                      </label>
                      <span style={{ fontSize: 11, color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>Live Preview</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: "150px", overflowY: "auto", padding: "2px" }}>
                      {COMPANY_FONT_OPTIONS.map((f) => {
                        const isSelected = companyFontStyle === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setCompanyFontStyle(f.id)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: isSelected ? "2px solid var(--ink)" : "1px solid var(--border)",
                              background: isSelected ? "var(--surface-sunken)" : "#FFFFFF",
                              cursor: "pointer",
                              textAlign: "left",
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                              transition: "all 0.12s ease",
                            }}
                          >
                            <span style={{ fontSize: 10.5, color: isSelected ? "var(--ink)" : "var(--ink-secondary)", fontWeight: 700 }}>
                              {f.name}
                            </span>
                            <span
                              style={{
                                fontFamily: f.font,
                                fontSize: 13.5,
                                fontWeight: 800,
                                color: "var(--ink)",
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

                  {/* Company Logo Upload */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                      <ImageIcon size={14} color="var(--ink)" />
                      <span>Company Logo <span style={{ fontWeight: 400, color: "var(--ink-secondary)" }}>(Optional)</span></span>
                    </label>

                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleLogoChange}
                    />

                    {logoPreview ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: "var(--surface-sunken)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <img
                            src={logoPreview}
                            alt="Logo Preview"
                            style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8, background: "#FFF", border: "1px solid var(--border)" }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>Logo Attached</div>
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              style={{ background: "none", border: "none", color: "var(--ink)", fontSize: 11, fontWeight: 700, padding: 0, cursor: "pointer", textDecoration: "underline" }}
                            >
                              Replace logo
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--rose-ember)", display: "flex" }}
                          title="Remove logo"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        style={{
                          border: "1.5px dashed var(--border-strong, #CBD5E1)",
                          borderRadius: 12,
                          padding: "14px 16px",
                          background: "var(--surface-sunken)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          transition: "all 0.14s ease",
                        }}
                      >
                        <Upload size={16} color="var(--ink)" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                          Upload Logo (Optional)
                        </span>
                      </div>
                    )}
                  </div>

                  <LightPremiumInput
                    type={showPass ? "text" : "password"}
                    label="Password"
                    icon={Lock}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((p) => ({ ...p, password: "" }));
                      setServerErr("");
                    }}
                    error={errors.password}
                    autoComplete="new-password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--ink-secondary)",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  <LightPremiumInput
                    type={showConfirm ? "text" : "password"}
                    label="Confirm Password"
                    icon={Shield}
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setErrors((p) => ({ ...p, confirm: "" }));
                      setServerErr("");
                    }}
                    error={errors.confirm}
                    autoComplete="new-password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--ink-secondary)",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  <div style={{ marginBottom: 20, marginTop: 10 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                      <div
                        onClick={() => { setAgreed((v) => !v); setErrors((p) => ({ ...p, agreed: "" })); }}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          flexShrink: 0,
                          marginTop: 2,
                          border: `2px solid ${errors.agreed ? "var(--rose-ember)" : agreed ? "var(--ink)" : "var(--border)"}`,
                          background: agreed ? "var(--ink)" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.12s",
                        }}
                      >
                        {agreed && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: 13, color: "var(--ink-secondary)", lineHeight: 1.5 }}>
                        By creating an account, you agree to our{" "}
                        <span style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "underline" }}>Terms</span>
                        {" "}and{" "}
                        <span style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "underline" }}>Privacy Policy</span>.
                      </span>
                    </label>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      height: 48,
                      borderRadius: "var(--r-btn, 12px)",
                      border: "none",
                      background: "var(--ink, #111317)",
                      color: "var(--bone, #F2F0EB)",
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: "0.02em",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.75 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                    }}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </>
              )}
            </form>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--ink-secondary)" }}>
              Already have an account?{" "}
              <span
                onClick={() => navigate("/login")}
                style={{
                  color: "var(--ink, #111317)",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Sign in
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
