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
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Upload,
  X,
  Phone,
} from "lucide-react";
import { BtField, BtButton, BtIconButton, BtBadge, BtHero } from "../components/ui";
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

  const textLinkStyle = {
    background: "none",
    border: "none",
    padding: "8px 2px",
    minHeight: 40,
    fontFamily: "var(--font-ui)",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--ink)",
    textDecoration: "underline",
    textUnderlineOffset: 3,
    cursor: "pointer",
  };

  const eyeToggle = (shown, toggle, label) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={shown ? `Hide ${label}` : `Show ${label}`}
      style={{
        background: "none",
        border: "none",
        color: "var(--ink-2)",
        cursor: "pointer",
        width: 32,
        height: 32,
        marginRight: -8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
      }}
    >
      {shown ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );

  const fieldLabelStyle = {
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--ink-2)",
    marginBottom: 8,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "grid",
        gridTemplateColumns: isDesktop ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
        background: "var(--ground)",
        fontFamily: "var(--font-ui)",
        color: "var(--ink)",
      }}
    >
      {isDesktop && (
        <div style={{ position: "relative" }}>
          <BtHero
            padding="56px 64px"
            minHeight="100vh"
            style={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}
          >
            <div style={{ maxWidth: 500 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <img
                  src="/buildtrack-logo.png"
                  alt="BuildTrack"
                  style={{ width: 52, height: 52, borderRadius: "var(--r-tile)", objectFit: "contain" }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 32,
                    fontWeight: 700,
                    color: "var(--on-noir)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  BuildTrack
                </span>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 40,
                  padding: "6px 12px",
                  background: "var(--bone)",
                  borderRadius: "var(--r-full)",
                }}
              >
                <span className="bt-eyebrow" style={{ color: "var(--ink-2)" }}>
                  Powered by
                </span>
                <img src={nurofinLogo} alt="Nurofin" style={{ height: 16, width: "auto", display: "block" }} />
              </div>

              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(38px, 3.6vw, 52px)",
                  fontWeight: 700,
                  color: "var(--on-noir)",
                  lineHeight: 1.08,
                  margin: "0 0 20px",
                  letterSpacing: "-0.03em",
                }}
              >
                Build smarter. <span style={{ color: "var(--accent)" }}>Track everything.</span>
              </h1>

              <p style={{ fontSize: 16, color: "var(--on-noir-2)", lineHeight: 1.6, margin: "0 0 40px", maxWidth: 460 }}>
                From site operations to financial reporting, everything your construction team needs in one platform.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {features.map((item) => (
                  <div key={item.title} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={16} strokeWidth={2} />
                    </span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--on-noir)" }}>{item.title}</div>
                      <div style={{ fontSize: 14, color: "var(--on-noir-2)", lineHeight: 1.45, marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </BtHero>
        </div>
      )}

      <main
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: isDesktop ? "48px 40px" : "32px 16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sheet)",
            padding: isDesktop ? "40px 36px" : "28px 22px",
            boxShadow: "var(--shadow-card)",
            boxSizing: "border-box",
            transform: shake ? "translateX(-6px)" : "none",
            transition: "transform 100ms ease",
          }}
        >
          {!isDesktop && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <img
                src="/buildtrack-logo.png"
                alt="BuildTrack"
                style={{ width: 40, height: 40, borderRadius: "var(--r-chip)", objectFit: "contain" }}
              />
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
                BuildTrack
              </span>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
                margin: "0 0 6px",
              }}
            >
              Create your account
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: "var(--ink-2)" }}>
              Start your 14-day free trial. No credit card required.
            </p>
          </div>

          {serverErr && (
            <div
              role="alert"
              style={{
                background: "var(--status-danger-soft)",
                borderRadius: "var(--r-chip)",
                padding: "12px 14px",
                marginBottom: 18,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <AlertTriangle size={17} color="var(--status-danger)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "var(--status-danger)", fontWeight: 500, lineHeight: 1.45 }}>{serverErr}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <BtField
              type="text"
              label="Full name"
              required
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

            <BtField
              type="tel"
              label="Phone number"
              required
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

            <BtField
              type="email"
              label="Company email"
              required
              icon={Mail}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                if (isEmailVerified) return;
                setEmail(e.target.value);
                setErrors((p) => ({ ...p, email: "" }));
                setServerErr("");
                setOtpSent(false);
              }}
              error={errors.email}
              helperText={!isEmailVerified && !otpSent ? "We will email you a code to confirm it." : undefined}
              autoComplete="email"
              readOnly={isEmailVerified}
              suffix={
                isEmailVerified ? (
                  <BtBadge label="Verified" tone="success" />
                ) : !otpSent ? (
                  <BtButton
                    variant="primary"
                    size="compact"
                    loading={otpLoading}
                    disabled={!email.trim()}
                    onClick={handleSendOtp}
                    style={{ marginRight: -6 }}
                  >
                    Verify
                  </BtButton>
                ) : null
              }
            />

            {!isEmailVerified && otpSent && (
              <div>
                <BtField
                  type="text"
                  label="Verification code"
                  required
                  icon={Shield}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    setErrors((p) => ({ ...p, otp: "" }));
                    setServerErr("");
                  }}
                  error={errors.otp}
                  helperText={`Sent to ${email.trim()}`}
                  suffix={
                    <BtButton
                      variant="primary"
                      size="compact"
                      loading={verifyLoading}
                      disabled={otp.length < 4}
                      onClick={handleVerifyOtp}
                      style={{ marginRight: -6 }}
                    >
                      Confirm
                    </BtButton>
                  }
                />
                <button type="button" onClick={handleSendOtp} disabled={otpLoading} style={textLinkStyle}>
                  {otpLoading ? "Sending…" : "Resend code"}
                </button>
              </div>
            )}

            {isEmailVerified && (
              <>
                <BtField
                  type="text"
                  label="Company name"
                  required
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

                {/* Brand typography */}
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", ...fieldLabelStyle }}>
                    <span id="font-style-label">Company font style</span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink-3)" }}>Live preview</span>
                  </div>
                  <div
                    role="radiogroup"
                    aria-labelledby="font-style-label"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 2 }}
                  >
                    {COMPANY_FONT_OPTIONS.map((f) => {
                      const isSelected = companyFontStyle === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setCompanyFontStyle(f.id)}
                          style={{
                            padding: "10px 12px",
                            minHeight: 56,
                            borderRadius: "var(--r-chip)",
                            border: isSelected ? "2px solid var(--ink)" : "1px solid var(--input-border)",
                            background: isSelected ? "var(--fill)" : "var(--card)",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            minWidth: 0,
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}>
                            {f.name}
                          </span>
                          <span
                            style={{
                              fontFamily: f.font,
                              fontSize: 15,
                              fontWeight: 700,
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

                {/* Company logo */}
                <div>
                  <div style={fieldLabelStyle}>
                    Company logo <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>(optional)</span>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleLogoChange}
                    aria-label="Upload company logo"
                  />
                  {logoPreview ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: "var(--r-tile)",
                        background: "var(--ground)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          style={{
                            width: 44,
                            height: 44,
                            objectFit: "contain",
                            borderRadius: 10,
                            background: "var(--card)",
                            border: "1px solid var(--line)",
                          }}
                        />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Logo attached</div>
                          <button type="button" onClick={() => logoInputRef.current?.click()} style={{ ...textLinkStyle, minHeight: 32, padding: "2px 0", fontSize: 13 }}>
                            Replace logo
                          </button>
                        </div>
                      </div>
                      <BtIconButton icon={X} label="Remove logo" onClick={handleRemoveLogo} />
                    </div>
                  ) : (
                    <BtButton variant="secondary" size="small" icon={Upload} onClick={() => logoInputRef.current?.click()}>
                      Upload logo
                    </BtButton>
                  )}
                  {errors.logo && (
                    <div role="alert" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 12.5, color: "var(--status-danger)" }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{errors.logo}</span>
                    </div>
                  )}
                </div>

                <BtField
                  type={showPass ? "text" : "password"}
                  label="Password"
                  required
                  icon={Lock}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({ ...p, password: "" }));
                    setServerErr("");
                  }}
                  error={errors.password}
                  helperText="At least 6 characters."
                  autoComplete="new-password"
                  suffix={eyeToggle(showPass, () => setShowPass(!showPass), "password")}
                />

                <BtField
                  type={showConfirm ? "text" : "password"}
                  label="Confirm password"
                  required
                  icon={Shield}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setErrors((p) => ({ ...p, confirm: "" }));
                    setServerErr("");
                  }}
                  error={errors.confirm}
                  autoComplete="new-password"
                  suffix={eyeToggle(showConfirm, () => setShowConfirm(!showConfirm), "confirm password")}
                />

                <div>
                  <label
                    htmlFor="agree-terms"
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", minHeight: 40 }}
                  >
                    <input
                      id="agree-terms"
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => {
                        setAgreed(e.target.checked);
                        setErrors((p) => ({ ...p, agreed: "" }));
                      }}
                      aria-invalid={errors.agreed ? true : undefined}
                      style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--ink)", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5 }}>
                      By creating an account, you agree to our{" "}
                      <strong style={{ color: "var(--ink)" }}>Terms</strong> and{" "}
                      <strong style={{ color: "var(--ink)" }}>Privacy Policy</strong>.
                    </span>
                  </label>
                  {errors.agreed && (
                    <div role="alert" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 12.5, color: "var(--status-danger)" }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{errors.agreed}</span>
                    </div>
                  )}
                </div>

                <BtButton type="submit" variant="primary" fullWidth loading={loading} trailingIcon={ArrowRight}>
                  Create account
                </BtButton>
              </>
            )}
          </form>

          <div style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: "var(--ink-2)" }}>
            Already have an account?{" "}
            <button type="button" onClick={() => navigate("/login")} style={textLinkStyle}>
              Sign in
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
