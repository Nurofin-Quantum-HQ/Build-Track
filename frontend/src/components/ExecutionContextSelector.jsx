import { useState, useEffect } from "react";
import useProjectStore from "../stores/projectStore";

const selectStyle = {
  width: "100%", padding: "10px 14px", background: "#f9f9f9",
  border: "1px solid #e5e5e5", borderRadius: 10, fontSize: 14,
  color: "#1a1a1a", outline: "none", fontFamily: "'Segoe UI', sans-serif",
  boxSizing: "border-box", appearance: "none", cursor: "pointer",
};

const labelStyle = { fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em", marginBottom: 6, display: "block" };

export default function ExecutionContextSelector({ value, onChange, compact }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const projectId = value?.projectId || "";
  const floor = value?.floor || "";
  const phaseId = value?.phaseId || "";
  const activityId = value?.activityId || "";

  useEffect(() => {
    let cancel = false;
    useProjectStore.getState().fetchContext()
      .then((list) => { if (!cancel) setProjects(list || []); })
      .catch(() => { if (!cancel) setProjects([]); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  const selectedProject = projects.find(p => (p._id || p.id) === projectId);
  const floors = selectedProject?.floors || [];
  const phases = selectedProject?.selectedPhases || [];
  const selectedPhase = phases.find(p => p.id === phaseId);
  const activities = selectedPhase?.activities || [];

  const update = (patch) => onChange({ ...value, ...patch });

  const rowStyle = compact
    ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }
    : { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 };

  if (loading) {
    return <div style={{ padding: 12, fontSize: 13, color: "#aaa" }}>Loading projects…</div>;
  }

  return (
    <div style={{
      background: compact ? "transparent" : "#FFF7F0",
      border: compact ? "none" : "1px solid #FDE8D8",
      borderRadius: compact ? 0 : 12,
      padding: compact ? 0 : "16px 20px",
    }}>
      {!compact && <div style={{ fontSize: 13, fontWeight: 600, color: "#EA580C", marginBottom: 12 }}>📍 Execution Context</div>}
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>PROJECT</label>
          <div style={{ position: "relative" }}>
            <select
              value={projectId}
              onChange={e => update({ projectId: e.target.value, floor: "", phaseId: "", activityId: "" })}
              style={selectStyle}
            >
              <option value="">Select project</option>
              {projects.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.projectName}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none", fontSize: 12 }}>▾</span>
          </div>
        </div>
        <div>
          <label style={labelStyle}>FLOOR</label>
          <div style={{ position: "relative" }}>
            <select
              value={floor}
              onChange={e => update({ floor: e.target.value, phaseId: "", activityId: "" })}
              style={{ ...selectStyle, opacity: projectId ? 1 : 0.5 }}
              disabled={!projectId}
            >
              <option value="">Select floor</option>
              {floors.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none", fontSize: 12 }}>▾</span>
          </div>
        </div>
        <div>
          <label style={labelStyle}>PHASE</label>
          <div style={{ position: "relative" }}>
            <select
              value={phaseId}
              onChange={e => update({ phaseId: e.target.value, activityId: "" })}
              style={{ ...selectStyle, opacity: projectId ? 1 : 0.5 }}
              disabled={!projectId}
            >
              <option value="">Select phase</option>
              {phases.map(p => (
                <option key={p.id} value={p.id}>{p.phaseName}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none", fontSize: 12 }}>▾</span>
          </div>
        </div>
        <div>
          <label style={labelStyle}>ACTIVITY</label>
          <div style={{ position: "relative" }}>
            <select
              value={activityId}
              onChange={e => update({ activityId: e.target.value })}
              style={{ ...selectStyle, opacity: projectId ? 1 : 0.5 }}
              disabled={!projectId || !phaseId}
            >
              <option value="">Select activity</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none", fontSize: 12 }}>▾</span>
          </div>
        </div>
      </div>
    </div>
  );
}
