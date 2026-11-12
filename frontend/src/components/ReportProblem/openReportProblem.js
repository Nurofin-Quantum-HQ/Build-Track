// Imperative entry point for "Report a problem", used by the sidebar link, the error screens and the
// error toast. It takes the screenshot FIRST (so the dialog itself is not in the picture), then opens
// the dialog in its own React root. Works even when the main tree has crashed.
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import ReportProblemModal from "./ReportProblemModal";
import { captureScreenshot } from "../../utils/captureScreenshot";
import { recordBreadcrumb, screenNameFor } from "../../utils/bugReportTrail";
import useProjectStore from "../../stores/projectStore";

let opening = false;
let host = null;

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function currentProject() {
  try {
    const p = useProjectStore.getState().selectedProject;
    if (!p) return null;
    const id = p._id || p.id;
    return id ? { id: String(id), name: String(p.projectName || p.name || "") } : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ error?: Error|string, hint?: string, settleMs?: number }} [opts]
 *   error: what the error screen showed (added to the recent steps), hint: line under the title,
 *   settleMs: wait before the screenshot, e.g. for a closing drawer
 */
export async function openReportProblem(opts = {}) {
  if (opening || host) return;
  opening = true;
  try {
    if (opts.error) recordBreadcrumb("error", (opts.error && opts.error.message) || String(opts.error));
    const route = window.location.pathname || "/"; // path only, never the query
    const occurredAt = new Date();
    await nextFrame();
    await nextFrame();
    if (opts.settleMs) await wait(opts.settleMs);
    const screenshot = await captureScreenshot();

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    host = { el, root };
    const close = () => {
      root.unmount();
      el.remove();
      host = null;
    };
    root.render(
      createElement(ReportProblemModal, {
        context: { screenshot, route, screenName: screenNameFor(route), project: currentProject(), occurredAt, hint: opts.hint },
        onClose: close,
      })
    );
  } finally {
    opening = false;
  }
}

export default openReportProblem;
