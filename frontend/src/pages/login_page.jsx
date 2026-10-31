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
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import LightPremiumInput from "../components/ui/LightPremiumInput";
import nurofinLogo from "../assets/nurofin-black.svg";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
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
    if (!password) {
      setPassErr("Please enter your password.");
      valid = false;
    }

    if (!valid) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err.friendlyMessage ||
        err.response?.data?.message ||
        "Invalid email or password. Please try again.";
      setServerErr(msg);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!validateEmail(forgotEmail)) {
      setForgotErr("Please enter a valid email address.");
      return;
    }
    setForgotLoading(true);
    setForgotErr("");
    setForgotMsg("");
    try {
      const { data } = await authAPI.forgotPassword({ email: forgotEmail.trim() });
      setForgotMsg(data.message || "Password reset instructions sent to your email.");
    } catch (err) {
      setForgotErr(err.response?.data?.message || "Failed to send reset link. Try again.");
    } finally {
      setForgotLoading(false);
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
        padding: "32px 16px",
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
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Left Column: Brand Hero (Desktop) */}
        {isDesktop && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
              Every bag, worker <br />
              and rupee —{" "}
              <span style={{ color: "var(--accent, #E0A93B)" }}>on track.</span>
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
              From real-time budget forecasting to on-site workforce logs — everything your construction team needs to deliver projects on time and under budget.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { title: "Real-time Budgets", desc: "Track cash flows and site expenses live across all project sites." },
                { title: "Site Inventory Logs", desc: "Monitor raw materials, labour hours, and heavy equipment allocation." },
                { title: "Automated Reports", desc: "Instantly export visual cost reports, invoices, and audit summaries." },
              ].map((item, idx) => (
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

        {/* Right Column: Sign In Card */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 440,
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
            {/* Mobile Brand Header */}
            {!isDesktop && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img
                    src="/buildtrack-logo.png"
                    alt="BuildTrack"
                    style={{ width: 44, height: 44, borderRadius: 12, objectFit: "contain" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-serif, 'Bricolage Grotesque', sans-serif)",
                      fontSize: 26,
                      fontWeight: 800,
                      color: "var(--ink, #111317)",
                    }}
                  >
                    BuildTrack
                  </span>
                </div>
              </div>
            )}

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
                Welcome back
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-secondary, #525864)" }}>
                Sign in to your BuildTrack workspace.
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

            <form onSubmit={handleLogin}>
              <LightPremiumInput
                type="email"
                label="Email Address"
                icon={Mail}
                value={email}
                onChange={(e) => {
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
                onChange={(e) => {
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
                      color: "var(--ink-secondary, #64748B)",
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

              <div style={{ textAlign: "right", margin: "-6px 0 20px" }}>
                <span
                  onClick={() => {
                    setShowForgot(!showForgot);
                    setForgotMsg("");
                    setForgotErr("");
                  }}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--ink, #111317)",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {showForgot ? "← Back to login" : "Forgot password?"}
                </span>
              </div>

              {/* Collapsible Forgot Password Drawer */}
              {showForgot && (
                <div
                  style={{
                    background: "var(--surface-sunken, #F8FAFC)",
                    border: "1px solid var(--border, #E2E8F0)",
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <h4 style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: "var(--ink, #111317)" }}>
                    Reset Password
                  </h4>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ink-secondary, #64748B)" }}>
                    Enter your email to receive a password reset link.
                  </p>

                  <LightPremiumInput
                    type="email"
                    label="Email Address"
                    icon={Mail}
                    value={forgotEmail}
                    onChange={(e) => {
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
                      padding: "11px",
                      borderRadius: 10,
                      border: "none",
                      background: "var(--ink, #111317)",
                      color: "var(--bone, #F2F0EB)",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: forgotLoading ? "not-allowed" : "pointer",
                      opacity: forgotLoading ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {forgotLoading ? "Sending Link..." : "Send Reset Link"}
                  </button>

                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    {!showReset && (
                      <span
                        onClick={() => setShowReset(true)}
                        style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Already have a token?
                      </span>
                    )}
                  </div>

                  {showReset && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                      <LightPremiumInput
                        type="text"
                        label="Reset Token"
                        icon={Lock}
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                      />
                      <LightPremiumInput
                        type="password"
                        label="New Password"
                        icon={Lock}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={resetLoading}
                        onClick={async () => {
                          setResetLoading(true);
                          setForgotErr("");
                          try {
                            const { data } = await authAPI.resetPassword({ token: resetToken, password: newPassword });
                            setForgotMsg(data.message || "Password reset successful!");
                            setShowReset(false);
                            setShowForgot(false);
                          } catch (err) {
                            setForgotErr(err.response?.data?.message || "Reset failed");
                          } finally {
                            setResetLoading(false);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "11px",
                          borderRadius: 10,
                          background: "var(--ink, #111317)",
                          color: "var(--bone, #F2F0EB)",
                          fontWeight: 700,
                          border: "none",
                          cursor: resetLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        {resetLoading ? "Resetting..." : "Reset Password"}
                      </button>
                    </div>
                  )}

                  {forgotMsg && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, color: "var(--jade, #059669)", fontSize: 12, fontWeight: 700 }}>
                      <CheckCircle size={14} />
                      <span>{forgotMsg}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Ink Sign-in Button */}
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
                  transition: "transform 120ms ease, box-shadow 120ms ease",
                }}
              >
                {loading ? "Authenticating..." : "Sign in"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border, #E2E8F0)" }} />
              <span style={{ fontSize: 11, color: "var(--ink-secondary, #64748B)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
                OR CONNECT WITH
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border, #E2E8F0)" }} />
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={() => {
                window.location.href = `${API_ORIGIN}/api/auth/google`;
              }}
              style={{
                width: "100%",
                height: 44,
                padding: "0 16px",
                borderRadius: "var(--r-btn, 12px)",
                border: "1px solid var(--border, #E2E8F0)",
                background: "#FFFFFF",
                color: "var(--ink, #111317)",
                fontWeight: 600,
                fontSize: 13.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                transition: "background 140ms ease",
              }}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            {/* Sign Up Redirect */}
            <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--ink-secondary, #64748B)" }}>
              Don't have an account?{" "}
              <span
                onClick={() => navigate("/signup")}
                style={{
                  color: "var(--ink, #111317)",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Sign up
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
