import { AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowUpRight, Eye, Clock, Check } from "lucide-react";

// ── Format ───────────────────────────────────────────────────────────────────
export function inr(v, { sign = false } = {}) {
  if (v == null || Number.isNaN(v)) return "—";
  const neg = v < 0;
  const a = Math.abs(v);
  const trim = (x, dp) => x.toFixed(dp).replace(/\.?0+$/, "");
  let s;
  if (a >= 1e7) s = `${trim(a / 1e7, 2)}\u00A0Cr`;
  else if (a >= 1e5) s = `${trim(a / 1e5, 1)}\u00A0L`;
  else if (a >= 1e3) s = `${trim(a / 1e3, 1)}\u00A0K`;
  else s = a.toFixed(0);
  return `${neg ? "−" : sign && v > 0 ? "+" : ""}₹${s}`;
}
export const pct = (v, dp = 0) => (v == null ? "—" : `${Number(v).toFixed(dp)}%`);
export const dShort = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
export const monYY = (d) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

export const CATS = [
  { key: "material", label: "Material", color: "var(--material)", hex: "#2a78d6" },
  { key: "labour", label: "Labour", color: "var(--labour)", hex: "#eb6834" },
  { key: "equipment", label: "Equipment", color: "var(--equipment)", hex: "#199e70" },
];

export const HEALTH = {
  on_track: { tone: "good", label: "On track", Icon: CheckCircle2 },
  at_risk: { tone: "warn", label: "At risk", Icon: AlertTriangle },
  critical: { tone: "bad", label: "Critical", Icon: AlertCircle },
};
export const PHASE = {
  over: { tone: "bad", label: "Over budget", Icon: ArrowUpRight },
  watch: { tone: "warn", label: "Watch", Icon: Eye },
  not_started: { tone: "muted", label: "Not started", Icon: Clock },
  ok: { tone: "good", label: "On plan", Icon: Check },
};
export const SEV = {
  critical: { tone: "bad", Icon: AlertCircle },
  warning: { tone: "warn", Icon: AlertTriangle },
  info: { tone: "info", Icon: Info },
};

export function varianceFill(p) {
  if (p == null) return "var(--muted)";
  if (p > 15) return "#fca5a5";
  if (p > 5) return "#fecaca";
  if (p < -15) return "#bfdbfe";
  if (p < -5) return "#dbeafe";
  return "#f1f5f9";
}

