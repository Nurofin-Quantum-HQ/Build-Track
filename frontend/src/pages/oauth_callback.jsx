import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token  = params.get("token");
        const error  = params.get("error");

        if (error) {
          setStatus("OAuth failed. Redirecting to login…");
          setTimeout(() => navigate("/login?error=" + error), 1500);
          return;
        }

        if (!token) {
          setStatus("No token received. Redirecting to login…");
          setTimeout(() => navigate("/login"), 1500);
          return;
        }

        localStorage.setItem("bt_token", token);

        try {
          const { data } = await authAPI.me();
          const userData = data?.user || data;
          localStorage.setItem("bt_user", JSON.stringify(userData));
          window.dispatchEvent(new Event('userUpdated'));
        } catch {

        }

        setStatus("Success! Taking you to your dashboard…");

        setTimeout(() => {
          window.location.assign("/");
        }, 800);

      } catch (err) {
        setStatus("Something went wrong. Redirecting…");
        setTimeout(() => navigate("/login"), 1500);
      }
    };

    run();
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      gap: 24,
    }}>
      <div style={{
        width: 52,
        height: 52,
        border: "4px solid rgba(249,115,22,0.2)",
        borderTopColor: "#F97316",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />

      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px" }}>
        <span style={{ color: "#fff" }}>Build</span>
        <span style={{ color: "#FB923C" }}>Track</span>
      </div>

      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, margin: 0 }}>
        {status}
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
