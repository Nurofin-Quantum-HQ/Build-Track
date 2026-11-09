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
  CheckCircle2,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { BtField, BtButton, BtHero } from "../components/ui";
import nurofinLogo from "../assets/nurofin-black.svg";

const FEATURES = [
  { title: "Real-time budgets", desc: "Track cash flow and site expenses live across every project." },
  { title: "Site inventory logs", desc: "Monitor materials, labour hours and equipment on each site." },
  { title: "Automated reports", desc: "Export cost reports, invoices and audit summaries in one tap." },
];

const textLinkStyle = {
  background: "none",
  border: "none",
  padding: "8px 0",
  minHeight: 40,
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--ink)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
  cursor: "pointer",
};

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

  const handleReset = async () => {
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
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "grid",
        gridTemplateColumns: isDesktop ? "minmax(0, 1.05fr) minmax(0, 0.95fr)" : "minmax(0, 1fr)",
        background: "var(--ground)",
        fontFamily: "var(--font-ui)",
        color: "var(--ink)",
      }}
    >
      {/* Brand panel (desktop) */}
      {isDesktop && (
        <BtHero padding="56px 64px" minHeight="100vh" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ maxWidth: 520 }}>
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
              Every bag, worker and rupee, <span style={{ color: "var(--accent)" }}>on track.</span>
            </h1>

            <p style={{ fontSize: 16, color: "var(--on-noir-2)", lineHeight: 1.6, margin: "0 0 40px", maxWidth: 460 }}>
              From live budget forecasting to on-site workforce logs, everything your construction team needs to deliver on time and under budget.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {FEATURES.map((item) => (
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
      )}

      {/* Sign-in card */}
      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isDesktop ? "48px 40px" : "32px 16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
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
              Welcome back
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: "var(--ink-2)" }}>Sign in to your BuildTrack workspace.</p>
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

          <form onSubmit={handleLogin} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <BtField
              type="email"
              label="Email address"
              icon={Mail}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailErr("");
                setServerErr("");
              }}
              error={emailErr}
              autoComplete="email"
            />

            <BtField
              type={showPass ? "text" : "password"}
              label="Password"
              icon={Lock}
              placeholder="Your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPassErr("");
                setServerErr("");
              }}
              error={passErr}
              autoComplete="current-password"
              suffix={eyeToggle(showPass, () => setShowPass(!showPass), "password")}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -8 }}>
              <button
                type="button"
                aria-expanded={showForgot}
                onClick={() => {
                  setShowForgot(!showForgot);
                  setForgotMsg("");
                  setForgotErr("");
                }}
                style={textLinkStyle}
              >
                {showForgot ? "Hide password reset" : "Forgot password?"}
              </button>
            </div>

            {showForgot && (
              <div
                style={{
                  background: "var(--ground)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-tile)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
                    Reset password
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--ink-2)" }}>
                    Enter your email and we will send you a reset link.
                  </p>
                </div>

                <BtField
                  type="email"
                  label="Email address"
                  icon={Mail}
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setForgotErr("");
                  }}
                  error={showReset ? undefined : forgotErr}
                />

                <BtButton variant="primary" size="small" fullWidth loading={forgotLoading} onClick={handleForgotSubmit}>
                  Send reset link
                </BtButton>

                {!showReset && (
                  <div style={{ textAlign: "center" }}>
                    <button type="button" onClick={() => setShowReset(true)} style={textLinkStyle}>
                      Already have a reset token?
                    </button>
                  </div>
                )}

                {showReset && (
                  <div
                    style={{
                      borderTop: "1px solid var(--line)",
                      paddingTop: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <BtField
                      type="text"
                      label="Reset token"
                      icon={KeyRound}
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                    />
                    <BtField
                      type="password"
                      label="New password"
                      icon={Lock}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      error={forgotErr}
                      autoComplete="new-password"
                    />
                    <BtButton variant="primary" size="small" fullWidth loading={resetLoading} onClick={handleReset}>
                      Reset password
                    </BtButton>
                  </div>
                )}
              </div>
            )}

            {forgotMsg && (
              <div
                role="status"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  color: "var(--status-success)",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{forgotMsg}</span>
              </div>
            )}

            <BtButton type="submit" variant="primary" fullWidth loading={loading} trailingIcon={ArrowRight}>
              Sign in
            </BtButton>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span className="bt-eyebrow" style={{ color: "var(--ink-3)" }}>
              Or continue with
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          <BtButton
            variant="secondary"
            fullWidth
            onClick={() => {
              window.location.href = `${API_ORIGIN}/api/auth/google`;
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <GoogleIcon />
              Continue with Google
            </span>
          </BtButton>

          <div style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: "var(--ink-2)" }}>
            New to BuildTrack?{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              style={{ ...textLinkStyle, padding: "8px 2px", fontSize: 14 }}
            >
              Create an account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
