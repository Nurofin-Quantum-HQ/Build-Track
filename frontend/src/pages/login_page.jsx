import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, API_ORIGIN } from "../api";
import { useAuth } from "../contexts/AuthContext";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Building,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import LightPremiumInput from "../components/ui/LightPremiumInput";
import nurofinLogo from "../assets/nurofin-black.svg";

const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const [emailErr, setEmailErr] = useState("");
  const [passErr, setPassErr] = useState("");
  const [serverErr, setServerErr] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotErr, setForgotErr] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  
  const [showReset, setShowReset] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [vw, setVw] = useState(window.innerWidth);

  useEffect(() => {
    if (localStorage.getItem("bt_token")) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktop = vw >= 1024;

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleLogin = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    let valid = true;
    setEmailErr("");
    setPassErr("");
    setServerErr("");

    if (!validateEmail(email)) {
      setEmailErr("Please enter a valid email address.");
      valid = false;
    }
    if (password.length < 6) {
      setPassErr("Password must be at least 6 characters.");
      valid = false;
    }
    if (!valid) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err.friendlyMessage ||
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      if (err.response?.status === 401) {
        setPassErr(msg);
        setServerErr(msg);
      } else {
        setServerErr(msg);
      }
      setShake(true);
      setTimeout(() => setShake(false), 420);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    setForgotMsg("");
    setForgotErr("");
    if (!forgotEmail.trim()) {
      setForgotErr("Email is required.");
      return;
    }
    setForgotLoading(true);
    try {
      const { data } = await authAPI.forgotPassword({ email: forgotEmail });
      setForgotMsg(data.message || "A reset link has been sent to your email.");
      setShowReset(true);
    } catch (err) {
      setForgotErr(err.response?.data?.message || "Failed to send reset email.");
    } finally {
      setForgotLoading(false);
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
                The Platform for<br />
                <span style={{ background: "linear-gradient(135deg, #EA580C 0%, #F97316 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Modern Construction.</span>
              </h1>

              <p className="animate-fade-up" style={{ fontSize: "16px", color: "#334155", lineHeight: 1.7, margin: "0 0 44px", animationDelay: "0.3s", fontWeight: "500" }}>
                From real-time budgets to field inventory tracking — everything your construction team needs to deliver projects on time and under budget.
              </p>

              <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "24px", animationDelay: "0.4s" }}>
                {[
                  { title: "Real-time Budgets", desc: "Track cash flows and expenses live across all project sites." },
                  { title: "Site Inventory Logs", desc: "Monitor raw materials, labour hours, and heavy equipment allocation." },
                  { title: "Automated Reports", desc: "Instantly export visual cost reports, invoices, and audit summaries." }
                ].map((item, idx) => (
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
              padding: "52px 44px",
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
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#111827", margin: "0 0 6px", letterSpacing: "-0.5px" }}>Welcome back</h2>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748B", fontWeight: "500" }}>Sign in to your BuildTrack account.</p>
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

            <form onSubmit={handleLogin}>

              <LightPremiumInput
                type="email"
                label="Email address"
                icon={Mail}
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setEmailErr("");
                  setServerErr("");
                }}
                error={emailErr}
                autoComplete="email"
              />

              <LightPremiumInput
                type={showPass ? "text" : "password"}
                label="Password"
                icon={Lock}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setPassErr("");
                  setServerErr("");
                }}
                error={passErr}
                autoComplete="current-password"
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

              <div style={{ textAlign: "right", margin: "-10px 0 26px" }}>
                <span
                  onClick={() => {
                    setShowForgot(!showForgot);
                    setForgotMsg("");
                    setForgotErr("");
                  }}
                  className="login-link-btn"
                        style={{ fontSize: "12.5px", fontWeight: "700", color: "#EA580C", cursor: "pointer" }}
                >
                  {showForgot ? "← Back to login" : "Forgot password?"}
                </span>
              </div>

              <style>{`.login-submit-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; } .login-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249, 115, 22, 0.3); } .login-submit-btn:active:not(:disabled) { transform: translateY(0); }`}</style>

              {showForgot && (
                <div
                  style={{
                    background: "#FFF5F0",
                    border: "1px solid #FDE8D8",
                    borderRadius: 14,
                    padding: "18px",
                    marginBottom: 24,
                    animation: "slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) both"
                  }}
                >
                  <h4 style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: "700", color: "#1F2937" }}>Reset Password</h4>
                  <p style={{ margin: "0 0 14px", fontSize: "11.5px", color: "#6F7C8F", lineHeight: 1.45 }}>Enter your email to receive a reset link.</p>

                  <LightPremiumInput
                    type="email"
                    label="Email Address"
                    icon={Mail}
                    value={forgotEmail}
                    onChange={e => {
                      setForgotEmail(e.target.value);
                      setForgotErr("");
                    }}
                    error={forgotErr}
                  />

                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={handleForgotSubmit}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 10,
                      border: "none",
                  background: "linear-gradient(90deg, #F97316 0%, #FB923C 100%)",
                      color: "#FFF",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: forgotLoading ? "not-allowed" : "pointer",
                      opacity: forgotLoading ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 12px rgba(249, 115, 22, 0.15)"
                    }}
                  >
                    {forgotLoading && <span className="spinner-spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFF", borderRadius: "50%" }} />}
                    {forgotLoading ? "Sending Link..." : "Send Reset Link"}
                  </button>

                  
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    {!showReset && (
                      <span
                        onClick={() => setShowReset(true)}
                  style={{ fontSize: "12.5px", fontWeight: "700", color: "#EA580C", cursor: "pointer" }}
                      >
                        Already have a token?
                      </span>
                    )}
                  </div>

                  {showReset && (

                    <div style={{ background: "#FFF5F0", border: "1px solid #FDE8D8", borderRadius: 14, padding: "18px", marginBottom: 24, marginTop: 16 }}>
                      <h4 style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: "700", color: "#1F2937" }}>Enter Reset Token</h4>
                      <LightPremiumInput type="text" label="Reset Token" icon={Lock} value={resetToken} onChange={e => setResetToken(e.target.value)} />
                      <LightPremiumInput type="password" label="New Password" icon={Lock} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      <button type="button" disabled={resetLoading} onClick={async () => {
                        setResetLoading(true);
                        setForgotErr("");
                        try {
                          const { data } = await authAPI.resetPassword({ token: resetToken, password: newPassword });
                          setForgotMsg(data.message || "Password reset successful!");
                          setShowReset(false);
                          setShowForgot(false);
                        } catch(err) { 
                          setForgotErr(err.response?.data?.message || "Reset failed"); 
                        } finally { 
                          setResetLoading(false); 
                        }
                      }} style={{ width: "100%", padding: "12px", borderRadius: 10, background: "linear-gradient(90deg, #F97316 0%, #FB923C 100%)", color: "#FFF", fontWeight: "700", border: "none", cursor: resetLoading ? "not-allowed" : "pointer", opacity: resetLoading ? 0.6 : 1 }}>
                        {resetLoading ? "Resetting..." : "Reset Password"}
                      </button>
                    </div>
                  )}

                  {forgotMsg && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, color: "#065F46", fontSize: "12px", fontWeight: "700" }}>
                      <CheckCircle size={14} />
                      <span>{forgotMsg}</span>
                    </div>
                  )}
                </div>
              )}

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
                {loading ? "AUTHENTICATING..." : "SIGN IN"}
                {!loading && <ArrowRight size={14} />}
              </button>

            </form>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
              <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>or connect</span>
              <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = `${API_ORIGIN}/api/auth/google`;
              }}
              className="login-google-btn"
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 12,
                border: "1.2px solid #E2E8F0",
                background: "#FFFFFF",
                color: "#1E293B",
                fontWeight: "700",
                fontSize: "13.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)"
              }}
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div style={{ textAlign: "center", marginTop: 28 }}>
              <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#64748B", fontWeight: "500" }}>
                New to BuildTrack?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
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
                  Create account free
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
