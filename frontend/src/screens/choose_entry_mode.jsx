import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mic, FileText } from "lucide-react";

export default function ChooseEntryMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const project = location.state?.project || null;
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      if (selected === "voice") navigate("/voice", { state: { project } });
      else navigate("/manualentry", { state: { project } });
    }, 400);
    return () => clearTimeout(timer);
  }, [selected, navigate, project]);

  const modes = [
    {
      key: "voice",
      icon: <Mic size={28} />,
      title: "Voice Entry",
      desc: "Use speech-to-text for quick hands-free data entry",
      color: "#EA580C",
      bgColor: "#FFF7F0",
      features: ["Natural speech input", "AI extracts quantities & costs", "Smart categorization"],
    },
    {
      key: "manual",
      icon: <FileText size={28} />,
      title: "Manual Entry",
      desc: "Fill in transaction details manually with precision",
      color: "#F97316",
      bgColor: "#FFF5F0",
      features: ["Structured form input", "Per-item transaction fields", "Full control over data"],
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "Inter, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.03em" }}>Choose Entry Mode</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 6 }}>Select how you'd like to add a new entry</p>
      </div>

      <div style={{ display: "flex", gap: 20, flexDirection: isMobile ? "column" : "row", width: "100%", maxWidth: 640 }}>
        {modes.map((mode) => {
          const isHovered = hovered === mode.key;
          const isSelected = selected === mode.key;
          return (
            <div key={mode.key} onClick={() => setSelected(mode.key)}
              onMouseEnter={() => setHovered(mode.key)} onMouseLeave={() => setHovered(null)}
              style={{
                flex: 1, background: isSelected ? mode.bgColor : "#fff",
                borderRadius: 12, border: `1.5px solid ${isSelected ? mode.color : isHovered ? mode.color : "#E5E7EB"}`,
                padding: "28px 24px", cursor: "pointer",
                transition: "all 0.25s ease", position: "relative",
                boxShadow: isSelected ? `0 4px 20px ${mode.color}25` : "none",
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14,
              }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: mode.bgColor, display: "flex", alignItems: "center", justifyContent: "center", color: mode.color }}>
                {mode.icon}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{mode.title}</div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>{mode.desc}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                {mode.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={mode.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    {f}
                  </div>
                ))}
              </div>
              {isSelected && (
                <div style={{
                  marginTop: 8, padding: "8px 20px", borderRadius: 6, background: mode.color, color: "#fff",
                  fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Selected
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => navigate(-1)} style={{ marginTop: 32, padding: "8px 18px", background: "transparent", border: "1px solid #E5E7EB", borderRadius: 8, color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        Cancel
      </button>
    </div>
  );
}
