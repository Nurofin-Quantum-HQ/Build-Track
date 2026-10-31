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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--noir, #0C0E12)",
        backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        fontFamily: "var(--font-ui, 'Instrument Sans', sans-serif)",
        gap: 20,
      }}
    >
      <BtBrickLoader size={48} />

      <div
        style={{
          fontFamily: "var(--font-serif, 'Bricolage Grotesque', sans-serif)",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "var(--bone, #F2F0EB)",
          marginTop: 8,
        }}
      >
        Build<span style={{ color: "var(--accent, #E0A93B)" }}>Track</span>
      </div>

      <p style={{ color: "rgba(255, 255, 255, 0.65)", fontSize: 14, margin: 0 }}>
        {status}
      </p>
    </div>
  );
}
