// How much the app moves — same three levels as the mobile app (Profile → Motion).
//   full    – everything animates (default)
//   reduced – fades only: no rises, count-ups, bar fills or press scale
//   off     – nothing moves; changes are instant
// Saved per user on this device (`motionLevel_<userId>`). The OS "reduce motion"
// setting can only lower the level, never raise it.
import { useEffect, useState } from "react";

export const MOTION_LEVELS = ["full", "reduced", "off"];
const KEY_PREFIX = "motionLevel_";
const EVENT = "bt-motion-change";

let currentUserId = "";

const osPrefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const readSaved = (userId) => {
  if (!userId) return "full";
  try {
    const v = localStorage.getItem(KEY_PREFIX + userId);
    return MOTION_LEVELS.includes(v) ? v : "full";
  } catch {
    return "full";
  }
};

/** What the user picked (before the OS cap). */
export const getChosenMotionLevel = () => readSaved(currentUserId);

/** The level the UI should use right now. */
export const getMotionLevel = () => {
  const chosen = readSaved(currentUserId);
  if (chosen === "full" && osPrefersReduced()) return "reduced";
  return chosen;
};

export const isFullMotion = () => getMotionLevel() === "full";

const apply = () => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.motion = getMotionLevel();
  window.dispatchEvent(new Event(EVENT));
};

/** Call when the signed-in user is known (or "" on logout). */
export const loadMotionFor = (userId) => {
  currentUserId = userId ? String(userId) : "";
  apply();
};

export const setMotionLevel = (level) => {
  if (!MOTION_LEVELS.includes(level)) return;
  if (currentUserId) {
    try {
      localStorage.setItem(KEY_PREFIX + currentUserId, level);
    } catch {
      // storage unavailable — keep it for this session only
    }
  }
  apply();
};

/** React hook: the effective level; re-renders when it changes. */
export function useMotionLevel() {
  const [level, setLevel] = useState(getMotionLevel);
  useEffect(() => {
    const update = () => setLevel(getMotionLevel());
    window.addEventListener(EVENT, update);
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    mq?.addEventListener?.("change", apply);
    return () => {
      window.removeEventListener(EVENT, update);
      mq?.removeEventListener?.("change", apply);
    };
  }, []);
  return level;
}
