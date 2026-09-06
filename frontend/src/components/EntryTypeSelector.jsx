const TYPES = [
  { key: "Materials", label: "Materials", icon: "🧱", desc: "Cement, steel, sand, bricks & more", color: "#F97316", bg: "#FFF5F0" },
  { key: "Wages",     label: "Labour",     icon: "👷", desc: "Worker wages & daily payments",   color: "#166534", bg: "#f0fdf4" },
  { key: "Expense",   label: "Equipment",  icon: "🚜", desc: "Machinery, rentals & transport",  color: "#EA580C", bg: "#FFF7F0" },
  { key: "Income",    label: "Income",     icon: "💰", desc: "Client payments & advances",      color: "#047857", bg: "#ecfdf5" },
];

export default function EntryTypeSelector({ value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 12 }}>Select Entry Type</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {TYPES.map(t => {
          const isActive = value === t.key;
          return (
            <div
              key={t.key}
              onClick={() => onChange(t.key)}
              style={{
                padding: "18px 16px", borderRadius: 14, cursor: "pointer",
                border: `2px solid ${isActive ? t.color : "#e5e5e5"}`,
                background: isActive ? t.bg : "#fff",
                transition: "all 0.15s",
                boxShadow: isActive ? `0 2px 8px ${t.color}20` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 24 }}>{t.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: isActive ? t.color : "#1a1a1a" }}>{t.label}</span>
              </div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>{t.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
