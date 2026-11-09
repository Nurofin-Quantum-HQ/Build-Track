import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api";
import BtBrickLoader from "../components/ui/BtBrickLoader";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const error = params.get("error");

        if (error) {
          setStatus("OAuth authentication failed. Redirecting to login…");
          setTimeout(() => navigate("/login?error=" + error), 1500);
          return;
        }

        if (!token) {
          setStatus("No access token received. Redirecting to login…");
          setTimeout(() => navigate("/login"), 1500);
          return;
        }

        localStorage.setItem("bt_token", token);

        try {
          const { data } = await authAPI.me();
          const userData = data?.user || data;
          localStorage.setItem("bt_user", JSON.stringify(userData));
          window.dispatchEvent(new Event("userUpdated"));
        } catch {}

        setStatus("Success! Taking you to your dashboard…");

        setTimeout(() => {
          window.location.assign("/");
        }, 600);
      } catch (err) {
        setStatus("Something went wrong. Redirecting…");
        setTimeout(() => navigate("/login"), 1500);
      }
    };

    run();
  }, [navigate]);

  const failed = /failed|No access token|wrong/i.test(status);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--noir)",
        backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        fontFamily: "var(--font-ui)",
        gap: 20,
        padding: 16,
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <BtBrickLoader size={48} />

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--on-noir)",
          marginTop: 8,
        }}
      >
        Build<span style={{ color: "var(--accent)" }}>Track</span>
      </div>

      <p
        role="status"
        aria-live="polite"
        style={{
          color: failed ? "var(--status-danger-bright)" : "var(--on-noir-2)",
          fontSize: 15,
          margin: 0,
          maxWidth: 360,
          lineHeight: 1.5,
        }}
      >
        {status}
      </p>
    </div>
  );
}
