import { AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowUpRight, Eye, Clock, Check } from "lucide-react";
import { formatInr } from "../../components/ui/BtCountUp";

// ── Format ───────────────────────────────────────────────────────────────────
// Compact rupees (₹45 L, ₹1.81 Cr) per the design contract; <₹1,000 is shown whole.
export function inr(v, { sign = false } = {}) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  const a = Math.abs(n);
  const body = a >= 1000 ? formatInr(a, { compact: true }) : `₹${Math.round(a)}`;
  return `${n < 0 ? "−" : sign && n > 0 ? "+" : ""}${body}`;
}
export const pct = (v, dp = 0) => (v == null ? "—" : `${Number(v).toFixed(dp)}%`);
export const dShort = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
export const monYY = (d) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

// ── Chart palette (all token-driven) ─────────────────────────────────────────
// Series: material / labour / equipment come from the entry-type tokens.
// Money spent = steel, work done = success, plan = ink-3, forecast = danger, budget = accent.
export const PAL = {
  money: "var(--steel)",
  work: "var(--status-success)",
  plan: "var(--ink-3)",
  forecast: "var(--status-danger)",
  budget: "var(--accent)",
  budgetInk: "var(--accent-ink)",
  grid: "var(--line)",
  tick: "var(--ink-3)",
  bad: "var(--status-danger)",
  good: "var(--status-success)",
  warn: "var(--status-warning)",
};

export const AXIS_TICK = { fontSize: 13, fill: "var(--ink-3)", fontFamily: "var(--font-ui)" };

export const CATS = [
  { key: "material", label: "Material", color: "var(--type-material)" },
  { key: "labour", label: "Labour", color: "var(--type-labour)" },
  { key: "equipment", label: "Equipment", color: "var(--type-equipment)" },
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

// Tone → text colour token (for icons / numbers on white)
export const TONE_INK = {
  good: "var(--status-success)",
  warn: "var(--status-warning)",
  bad: "var(--status-danger)",
  info: "var(--type-material)",
  muted: "var(--ink-3)",
};
export const TONE_SOFT = {
  good: "var(--status-success-soft)",
  warn: "var(--status-warning-soft)",
  bad: "var(--status-danger-soft)",
  info: "var(--type-material-soft)",
  muted: "var(--fill)",
};

// Heat-map fill for the phase matrix: red = heading over, blue = heading under.
export function varianceFill(p) {
  if (p == null) return "var(--fill)";
  if (p > 15) return "color-mix(in srgb, var(--status-danger) 30%, var(--card))";
  if (p > 5) return "color-mix(in srgb, var(--status-danger) 14%, var(--card))";
  if (p < -15) return "color-mix(in srgb, var(--steel) 34%, var(--card))";
  if (p < -5) return "color-mix(in srgb, var(--steel) 18%, var(--card))";
  return "var(--fill)";
}
