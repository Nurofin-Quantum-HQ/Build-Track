// "Recent steps" for problem reports: a small in-memory ring buffer of what happened just before.
// Only route paths (never query strings), failed API calls (method + path + status) and error messages
// are recorded. Typed values, amounts, tokens and request/response bodies never go in here.
import { navItems, adminNavItems } from "../navItems";

const MAX = 30;
const buffer = [];
let lastServerFailureAt = 0;
let started = false;

const clip = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const pathOnly = (p) => String(p ?? "").split(/[?#]/)[0];

export function recordBreadcrumb(kind, label, detail = "") {
  const text = clip(label, 120);
  if (!text) return;
  buffer.push({ at: new Date().toISOString(), kind, label: text, detail: clip(detail, 200) });
  if (buffer.length > MAX) buffer.shift();
}

export const getBreadcrumbs = () => buffer.map((c) => ({ ...c }));

export function recordRoute(pathname) {
  const path = pathOnly(pathname) || "/";
  const last = buffer[buffer.length - 1];
  if (last && last.kind === "screen" && last.label === path) return;
  recordBreadcrumb("screen", path);
}

/** Failed request from the central axios client. A server/network failure is remembered for the error toast. */
export function recordApiFailure(method, url, status) {
  const path = pathOnly(url);
  if (!path || path.includes("/bug-reports")) return;
  recordBreadcrumb("api_error", `${String(method || "get").toUpperCase()} ${path}`, status ? `status ${status}` : "no response");
  if (!status || status >= 500) lastServerFailureAt = Date.now();
}

export const hadRecentServerFailure = (withinMs = 5000) => Date.now() - lastServerFailureAt < withinMs;

/** Friendly page name for a path, e.g. "/reports/abc" -> "Reports". */
export function screenNameFor(pathname) {
  const path = pathOnly(pathname) || "/";
  if (path === "/") return "Dashboard";
  const hit = [...navItems, ...adminNavItems]
    .filter((i) => i.path !== "/" && (path === i.path || path.startsWith(`${i.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (hit) return hit.label;
  const first = path.split("/").filter(Boolean)[0] || "";
  const words = first.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Dashboard";
}

/** Install window error / unhandled rejection listeners once. */
export function startTrail() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("error", (e) => {
    const where = e.filename ? `${pathOnly(e.filename).split("/").pop()}:${e.lineno || 0}` : "";
    recordBreadcrumb("error", e.message || "Script error", where);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    recordBreadcrumb("error", (r && r.message) || (typeof r === "string" ? r : "Unhandled promise rejection"));
  });
}
