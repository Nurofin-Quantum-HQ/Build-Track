import React from "react";
import { Package, Users, Wrench, TrendingUp } from "lucide-react";

const TYPES = [
  { key: "Materials", label: "Materials", Icon: Package, desc: "Cement, steel, sand, bricks & more", color: "#2A78D6", bg: "rgba(42, 120, 214, 0.08)" },
  { key: "Wages",     label: "Labour",     Icon: Users,   desc: "Worker wages & daily payments",   color: "#EB6834", bg: "rgba(235, 104, 52, 0.08)" },
  { key: "Expense",   label: "Equipment",  Icon: Wrench,  desc: "Machinery, rentals & transport",  color: "#199E70", bg: "rgba(25, 158, 112, 0.08)" },
  { key: "Income",    label: "Income",     Icon: TrendingUp, desc: "Client payments & advances",   color: "#10B981", bg: "rgba(16, 185, 129, 0.08)" },
];

export default function EntryTypeSelector({ value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink, #111317)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>
        SELECT ENTRY TYPE
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {TYPES.map(t => {
          const isActive = value === t.key;
          const Icon = t.Icon;
          return (
            <div
              key={t.key}
              onClick={() => onChange(t.key)}
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                cursor: "pointer",
                border: `1.5px solid ${isActive ? t.color : "var(--border, #E2E8F0)"}`,
                background: isActive ? t.bg : "var(--card-bg, #FFFFFF)",
                transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: isActive ? `0 4px 16px ${t.color}25` : "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isActive ? t.color : "rgba(0,0,0,0.04)",
                    color: isActive ? "#FFF" : t.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={17} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? t.color : "var(--ink, #111317)" }}>
                  {t.label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>
                {t.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
