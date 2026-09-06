import { useState, useEffect } from "react";
import { X, UserPlus, Shield, UserCheck, Trash2 } from "lucide-react";
import { userAPI, workerAPI } from "../api";

export default function ProjectMemberModal({ isOpen, onClose, project, onUpdateMembers }) {
  const [team, setTeam] = useState(project?.members || []);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("Site Engineer");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTeam(project?.members || []);
    setLoading(true);
    userAPI.getAll()
      .then(({ data }) => setUsers(data.users || data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (!selectedUserId) {
      setErrMsg("Please select a team member.");
      return;
    }
    const foundUser = users.find(u => u._id === selectedUserId || u.id === selectedUserId);
    if (!foundUser) return;

    if (team.some(m => m.userId === foundUser._id || m.userId === foundUser.id)) {
      setErrMsg("User is already assigned to this project.");
      return;
    }

    const newMember = {
      userId: foundUser._id || foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: selectedRole,
    };

    setTeam(prev => [...prev, newMember]);
    setSelectedUserId("");
    setErrMsg("");
  };

  const handleRemoveMember = (userId) => {
    setTeam(prev => prev.filter(m => m.userId !== userId));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrMsg("");
      if (onUpdateMembers) {
        await onUpdateMembers(team);
      }
      onClose();
    } catch (err) {
      setErrMsg(err.response?.data?.message || "Failed to update project members.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, maxWidth: 520, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", animation: "fadeUp 200ms ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF5F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={18} color="#F97316" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>Manage Project Members</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>Assign roles and access permissions for this site</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8" }}><X size={20} /></button>
        </div>

        <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>ADD TEAM MEMBER</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}>
              <option value="">Select User...</option>
              {users.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>{u.name} ({u.role || "Member"})</option>
              ))}
            </select>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}>
              <option value="Site Engineer">Site Engineer</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Contractor">Contractor</option>
              <option value="Worker">Worker</option>
            </select>
            <button onClick={handleAddMember} style={{ padding: "8px 14px", background: "#F97316", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Add
            </button>
          </div>
          {errMsg && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{errMsg}</div>}
        </div>

        <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>ASSIGNED MEMBERS ({team.length})</div>
          {team.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 20 }}>No team members assigned yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {team.map(m => (
                <div key={m.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                      {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{m.email}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ background: "#FFF5F0", color: "#F97316", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                      {m.role}
                    </span>
                    <button onClick={() => handleRemoveMember(m.userId)} style={{ border: "none", background: "none", cursor: "pointer", color: "#DC2626" }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", background: "#F97316", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving..." : "Save Members"}
          </button>
        </div>
      </div>
    </div>
  );
}
