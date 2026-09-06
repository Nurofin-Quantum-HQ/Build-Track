import { useState, useEffect } from "react";
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
  AlertTriangle
} from "lucide-react";
import LightPremiumInput from "../components/ui/LightPremiumInput";
import nurofinLogo from "../assets/nurofin-black.svg";

const features = [
  { title: "Real-time dashboards",  desc: "Track every project metric live."  },
  { title: "Worker management",     desc: "Manage teams across all sites."    },
  { title: "Financial reporting",   desc: "Budgets, wages & profit margins."  },
  { title: "Site tracking",         desc: "Monitor progress on every site."   },
];

export default function SignUpPage() {
  const navigate = useNavigate();
  const [vw, setVw] = useState(window.innerWidth);

  const [fullName, setFullName] = useState("");
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
  const isMobile = vw < 640;

  const handleSendOtp = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors(p => ({...p, email: "Enter a valid company email."}));
      setShake(true); setTimeout(() => setShake(false), 420);
      return;
    }
    setOtpLoading(true);
    setServerErr("");
    try {
      const { data } = await authAPI.sendRegistrationOtp({ email: email.trim() });
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
    if (otp.length < 5) {
      setErrors(p => ({...p, otp: "Enter a valid OTP."}));
      setShake(true); setTimeout(() => setShake(false), 420);
      return;
    }
    setVerifyLoading(true);
    setServerErr("");
    try {
      const { data } = await authAPI.verifyRegistrationOtp({ email: email.trim(), otp: otp.trim() });
      setIsEmailVerified(true);
      setErrors(p => ({...p, otp: ""}));
    } catch (err) {
      const msg = err.friendlyMessage || err.response?.data?.message || "Invalid OTP.";
      setServerErr(msg);
      setShake(true); setTimeout(() => setShake(false), 420);
    } finally {
      setVerifyLoading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!fullName.trim())                           e.name = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid company email.";
    if (password.length < 6)                        e.password = "Min 6 characters required.";
    if (confirm !== password)                       e.confirm = "Passwords do not match.";
    if (!agreed)                                    e.agreed = "Please accept the terms.";
    return e;
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const eErrors = validate();
    if (Object.keys(eErrors).length) {
      setErrors(eErrors);
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }

    setErrors({});
    setServerErr("");
    setLoading(true);

    try {
      const { data } = await authAPI.register({
        name: fullName.trim(),
        email: email.trim(),
        password,
      });
      localStorage.setItem("bt_token", data.token);
      localStorage.setItem("bt_user", JSON.stringify(data.user));
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err.friendlyMessage ||
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setServerErr(msg);
      setShake(true);
      setTimeout(() => setShake(false), 420);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="animated-orange-bg"
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxSizing: "border-box"
      }}
    >
      <div className="light-blueprint-grid" />
      <div className="light-glow-1" />
      <div className="light-glow-2" />
      <div className="light-glow-center" />

      <div
        style={{
          width: "100%",
          maxWidth: "1280px",
          margin: "0 auto",
          padding: isDesktop ? "0 80px" : "0 24px",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: isDesktop ? "1.15fr 0.85fr" : "1fr",
          gap: isDesktop ? "96px" : "32px",
          alignItems: "center",
          zIndex: 10,
          position: "relative"
        }}
      >

        {isDesktop && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>

            <div className="animate-fade-up" style={{ display: "flex", alignItems: "center", gap: 20, animationDelay: "0.1s" }}>
              <img
                src="/buildtrack-logo.png"
                alt="BuildTrack"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  objectFit: "contain",
                  boxShadow: "0 12px 32px rgba(249, 115, 22, 0.25)"
                }}
              />
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 42, fontWeight: "800", color: "#0F172A", letterSpacing: "-1px", lineHeight: 1 }}>
                BuildTrack
              </span>
            </div>

            <div
              className="animate-fade-up"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 14,
                padding: "6px 14px",
                background: "rgba(255, 255, 255, 0.88)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.9)",
                borderRadius: "20px",
                boxShadow: "0 4px 16px rgba(234, 88, 12, 0.12)",
                width: "fit-content",
                animationDelay: "0.15s"
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
                Powered by
              </span>
              <img
                src={nurofinLogo}
                alt="Nurofin"
                style={{ height: 18, width: "auto", objectFit: "contain", display: "block" }}
              />
            </div>

            <div style={{ marginTop: 28 }}>
              <h1 className="animate-fade-up" style={{ fontFamily: "'Outfit', sans-serif", fontSize: "44px", fontWeight: "900", color: "#0F172A", lineHeight: 1.15, margin: "0 0 16px", letterSpacing: "-1.5px", animationDelay: "0.2s" }}>
                Build smarter.<br />
                <span style={{ background: "linear-gradient(135deg, #EA580C 0%, #F97316 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Track everything.</span>
              </h1>

              <p className="animate-fade-up" style={{ fontSize: "16px", color: "#334155", lineHeight: 1.7, margin: "0 0 44px", animationDelay: "0.3s", fontWeight: "500" }}>
                From site management to financial reporting — everything your construction team needs, in one place.
              </p>

              <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "24px", animationDelay: "0.4s" }}>
                {features.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#FFFFFF", border: "1.5px solid rgba(249, 115, 22, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EA580C", flexShrink: 0, marginTop: "1px", boxShadow: "0 2px 8px rgba(234, 88, 12, 0.12)" }}>
                      <CheckCircle size={14} />
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>{item.title}</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: 1.45, fontWeight: "500" }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <div
            className={`login-glass-card animate-fade-up ${shake ? "shake-trigger" : ""}`}
            style={{
              width: "100%",
              maxWidth: 440,
              padding: "44px 40px",
              borderRadius: 24,
              animationDelay: "0.15s",
              boxSizing: "border-box",
              position: "relative",
              zIndex: 20
            }}
          >

            {!isDesktop && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
                  <img
                    src="/buildtrack-logo.png"
                    alt="BuildTrack"
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      objectFit: "contain",
                      boxShadow: "0 10px 26px rgba(249, 115, 22, 0.22)"
                    }}
                  />
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: "800", color: "#111827", letterSpacing: "-0.8px", lineHeight: 1 }}>
                    BuildTrack
                  </span>
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    marginTop: 10,
                    padding: "5px 12px",
                    background: "rgba(255, 255, 255, 0.75)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.8)",
                    borderRadius: "20px",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)"
                  }}
                >
                  <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
                    Powered by
                  </span>
                  <img
                    src={nurofinLogo}
                    alt="Nurofin"
                    style={{ height: 16, width: "auto", objectFit: "contain", display: "block" }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 32, textAlign: isDesktop ? "left" : "center" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#111827", margin: "0 0 6px", letterSpacing: "-0.5px" }}>Create your account</h2>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748B", fontWeight: "500" }}>Start your 14-day free trial. No credit card required.</p>
            </div>

            {serverErr && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1.2px solid #FCA5A5",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 22,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  animation: "slideDown 0.2s ease"
                }}
              >
                <AlertTriangle size={16} color="#EF4444" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: "12.5px", color: "#B91C1C", fontWeight: "600", lineHeight: 1.45 }}>{serverErr}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <LightPremiumInput
                type="text"
                label="Full Name"
                icon={User}
                value={fullName}
                onChange={e => {
                  setFullName(e.target.value);
                  setErrors(p => ({...p, name: ""}));
                  setServerErr("");
                }}
                error={errors.name}
                autoComplete="name"
              />

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <LightPremiumInput
                    type="email"
                    label="Company Email"
                    icon={Mail}
                    value={email}
                    onChange={e => {
                      if (isEmailVerified) return;
                      setEmail(e.target.value);
                      setErrors(p => ({...p, email: ""}));
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
                      background: "linear-gradient(90deg, #F97316 0%, #FB923C 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "0 16px",
                      height: 48,
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: (otpLoading || !email.trim()) ? "not-allowed" : "pointer",
                      opacity: (otpLoading || !email.trim()) ? 0.6 : 1,
                      boxShadow: "0 4px 14px rgba(249, 115, 22, 0.18)"
                    }}
                  >
                    {otpLoading ? "SENDING..." : "VERIFY"}
                  </button>
                )}
                {isEmailVerified && (
                  <div style={{
                    height: 48,
                    color: "#10B981",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "12px",
                    fontWeight: "800",
                  }}>
                    <CheckCircle size={16} /> VERIFIED
                  </div>
                )}
              </div>

              {!isEmailVerified && otpSent && (
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <LightPremiumInput
                        type="text"
                        label="Verification Code (OTP)"
                        icon={Shield}
                        value={otp}
                        onChange={e => {
                          setOtp(e.target.value);
                          setErrors(p => ({...p, otp: ""}));
                          setServerErr("");
                        }}
                        error={errors.otp}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyLoading || otp.length < 5}
                      style={{
                        background: "#10B981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "0 16px",
                        height: 48,
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: (verifyLoading || otp.length < 5) ? "not-allowed" : "pointer",
                        opacity: (verifyLoading || otp.length < 5) ? 0.6 : 1,
                        boxShadow: "0 4px 14px rgba(16, 185, 129, 0.18)"
                      }}
                    >
                      {verifyLoading ? "VERIFYING..." : "CONFIRM"}
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: -14, marginBottom: 14 }}>
                    <button type="button" onClick={handleSendOtp} style={{ background: 'none', border: 'none', color: '#F97316', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>Resend Code</button>
                  </div>
                </div>
              )}

              {isEmailVerified && (
                <>
                  <LightPremiumInput
                    type={showPass ? "text" : "password"}
                    label="Password"
                    icon={Lock}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setErrors(p => ({...p, password: ""}));
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
                          color: "#94A3B8",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
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
                    onChange={e => {
                      setConfirm(e.target.value);
                      setErrors(p => ({...p, confirm: ""}));
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
                          color: "#94A3B8",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  <div style={{ marginBottom: 24, marginTop: 10 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                      <div
                        onClick={() => { setAgreed(v => !v); setErrors(p => ({...p, agreed: ""})); }}
                        style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                          border: `2px solid ${errors.agreed ? "#dc2626" : agreed ? "#F97316" : "#d0d0d0"}`,
                          background: agreed ? "#F97316" : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s", cursor: "pointer",
                        }}>
                        {agreed && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: "13px", color: "#71717A", lineHeight: 1.6, fontWeight: "500" }}>
                        By creating an account, you agree to our{" "}
                        <span style={{ color: "#F97316", fontWeight: "700", cursor: "pointer" }}>Terms</span>
                        {" "}and{" "}
                        <span style={{ color: "#F97316", fontWeight: "700", cursor: "pointer" }}>Privacy Policy</span>.
                      </span>
                    </label>
                    {errors.agreed && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, color: "#dc2626", fontSize: "11px", fontWeight: "700" }}>
                        <AlertTriangle size={11} />
                        <span>{errors.agreed}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit-btn"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: 12,
                      border: "none",
                      background: "linear-gradient(90deg, #F97316 0%, #FB923C 100%)",
                      color: "#FFF",
                      fontWeight: "800",
                      fontSize: "13.5px",
                      letterSpacing: "0.05em",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.75 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(249, 115, 22, 0.18)",
                    }}
                  >
                    {loading && <span className="spinner-spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFF", borderRadius: "50%" }} />}
                    {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                    {!loading && <ArrowRight size={14} />}
                  </button>
                </>
              )}

            </form>

            <div style={{ textAlign: "center", marginTop: 28 }}>
              <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#64748B", fontWeight: "500" }}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="login-link-btn"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "#EA580C",
                    fontWeight: "700",
                    fontSize: "13.5px"
                  }}
                >
                  Log in
                </button>
              </p>

              <div className="login-footer-links" style={{ display: "flex", justifyItems: "center", justifyContent: "center", gap: 12, fontSize: "11px", color: "#94A3B8", fontWeight: "600" }}>
                <span className="login-footer-link">Privacy Policy</span>
                <span>·</span>
                <span className="login-footer-link">Terms</span>
                <span>·</span>
                <span className="login-footer-link">Support</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
