import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ImageOff, LifeBuoy, Trash2, X } from "lucide-react";
import BtButton from "../ui/BtButton";
import BtBadge from "../ui/BtBadge";
import BtIconButton from "../ui/BtIconButton";
import { BtTextarea } from "../ui/BtField";
import { bugReportAPI } from "../../api";
import { getBreadcrumbs } from "../../utils/bugReportTrail";
import { APP_VERSION } from "../../utils/appVersion";

const MAX_DESC = 2000;
const MAX_TRYING = 500;

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

const errorText = (err) =>
  err?.response?.data?.message ||
  err?.friendlyMessage ||
  "Something got in the way of sending. Please try again in a moment.";

/**
 * Calm "Report a problem" dialog. `context` is captured when the person clicked (before this opened):
 * { screenshot: {ok, mime, dataUrl, base64} | {ok:false}, route, screenName, project, occurredAt, hint }
 */
export default function ReportProblemModal({ context, onClose }) {
  const { screenshot, route, screenName, project, occurredAt, hint } = context;
  const [clientReportId] = useState(newId); // same id on every retry, so a double send never makes two reports
  const [description, setDescription] = useState("");
  const [tryingTo, setTryingTo] = useState("");
  const [includeShot, setIncludeShot] = useState(!!screenshot.ok);
  const [shotRemoved, setShotRemoved] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [needText, setNeedText] = useState(false);
  const [doneCode, setDoneCode] = useState(null);
  const textRef = useRef(null);

  const dirty = description.trim() !== "" || tryingTo.trim() !== "";
  const stepsCount = useMemo(() => getBreadcrumbs().length, []);
  const device = useMemo(
    () => ({
      platform: "web",
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      locale: navigator.language || "",
      appVersion: APP_VERSION,
      osVersion: "",
      model: "",
      buildNumber: "",
    }),
    []
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    textRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // Escape closes only when nothing would be lost
      if (e.key === "Escape" && (!dirty || doneCode) && !sending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, doneCode, sending, onClose]);

  const sendShot = screenshot.ok && includeShot && !shotRemoved;

  const send = async () => {
    if (sending) return;
    if (!description.trim()) {
      setNeedText(true);
      textRef.current?.focus();
      return;
    }
    setSending(true);
    setError("");
    try {
      const { data } = await bugReportAPI.submit({
        clientReportId,
        source: "web",
        description: description.trim(),
        tryingTo: tryingTo.trim(),
        screen: { route, name: screenName },
        breadcrumbs: getBreadcrumbs(),
        screenshot: sendShot ? { mime: screenshot.mime, base64: screenshot.base64 } : null,
        device,
        project,
        occurredAt: occurredAt.toISOString(),
      });
      setDoneCode(data?.data?.code || "");
    } catch (err) {
      setError(errorText(err)); // text stays in the boxes
    } finally {
      setSending(false);
    }
  };

  const label = { fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-2)" };

  return (
    <div
      data-bt-nocapture=""
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && (!dirty || doneCode) && !sending) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "var(--scrim)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 160ms ease",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bt-report-title"
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-card)",
          boxShadow: "var(--shadow-raised)",
          width: "100%",
          maxWidth: 520,
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          animation: "fadeUp 260ms var(--ease)",
        }}
      >
        {doneCode !== null ? (
          <div style={{ padding: "36px 28px 28px", textAlign: "center" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--status-success-soft)",
                color: "var(--status-success)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckCircle2 size={26} />
            </div>
            <h2 id="bt-report-title" style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
              Thanks — we've got it.
            </h2>
            <p style={{ ...label, margin: "0 0 14px", lineHeight: 1.5 }}>
              Our team will take a look. We'll let you know here when it's fixed.
            </p>
            {doneCode && (
              <p style={{ margin: "0 0 22px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...label }}>
                <span>Reference</span>
                <BtBadge tone="neutral" showDot={false} style={{ fontFamily: "var(--font-mono)" }}>{doneCode}</BtBadge>
              </p>
            )}
            <BtButton size="small" onClick={onClose}>Done</BtButton>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 20px 0 24px" }}>
              <div>
                <h2 id="bt-report-title" style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                  <LifeBuoy size={18} strokeWidth={1.9} style={{ color: "var(--ink-3)" }} />
                  Report a problem
                </h2>
                <p style={{ ...label, margin: "6px 0 0", lineHeight: 1.45 }}>
                  {hint || "Something not working? Tell us and we'll look into it."}
                </p>
              </div>
              <BtIconButton icon={X} label="Close" size={34} onClick={onClose} disabled={sending} />
            </div>

            <div style={{ padding: "18px 24px 8px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Screenshot */}
              {screenshot.ok && !shotRemoved ? (
                <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-input)", overflow: "hidden", background: "var(--fill)" }}>
                  <img
                    src={screenshot.dataUrl}
                    alt="Screenshot of the screen you were on"
                    style={{ display: "block", width: "100%", maxHeight: 150, objectFit: "cover", objectPosition: "top", opacity: includeShot ? 1 : 0.35 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 12px", background: "var(--card)", borderTop: "1px solid var(--line)" }}>
                    <label style={{ ...label, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1, color: "var(--ink)" }}>
                      <input type="checkbox" checked={includeShot} onChange={(e) => setIncludeShot(e.target.checked)} style={{ accentColor: "var(--ink)", width: 16, height: 16 }} />
                      Include screenshot
                    </label>
                    <BtIconButton icon={Trash2} label="Remove screenshot" size={30} onClick={() => setShotRemoved(true)} />
                  </div>
                </div>
              ) : (
                <div style={{ ...label, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--fill)", borderRadius: "var(--r-input)" }}>
                  <ImageOff size={16} style={{ flexShrink: 0, color: "var(--ink-3)" }} />
                  <span>
                    {shotRemoved
                      ? "No screenshot will be sent."
                      : "We couldn't capture a screenshot of this page, so we'll send your report without one."}
                  </span>
                </div>
              )}

              <div>
                <BtTextarea
                  id="bt-report-desc"
                  label="What went wrong?"
                  required
                  rows={4}
                  maxLength={MAX_DESC}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (needText) setNeedText(false);
                  }}
                  placeholder="Tell us in your own words"
                  error={needText ? "Please tell us what went wrong." : undefined}
                  disabled={sending}
                  ref={textRef}
                />
                <div style={{ ...label, fontSize: 12, color: "var(--ink-3)", textAlign: "right", marginTop: 4 }}>
                  {description.length}/{MAX_DESC}
                </div>
              </div>

              <BtTextarea
                id="bt-report-trying"
                label="What were you trying to do? (optional)"
                rows={2}
                maxLength={MAX_TRYING}
                value={tryingTo}
                onChange={(e) => setTryingTo(e.target.value)}
                disabled={sending}
              />

              {/* What we'll send */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  aria-expanded={showDetails}
                  style={{ ...label, display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 600 }}
                >
                  <ChevronDown size={15} style={{ transform: showDetails ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }} />
                  What we'll send
                </button>
                {showDetails && (
                  <ul style={{ ...label, fontSize: 12.5, lineHeight: 1.6, margin: "8px 0 0", paddingLeft: 18, color: "var(--ink-2)" }}>
                    <li>Your words above, and your name and email</li>
                    <li>The page you're on: {screenName} ({route})</li>
                    <li>The time: {occurredAt.toLocaleString()}</li>
                    <li>Your browser: {navigator.userAgent}</li>
                    <li>The last {stepsCount} {stepsCount === 1 ? "step" : "steps"} in the app (pages visited and anything that failed, never what you typed)</li>
                    <li>{sendShot ? "A screenshot of this page" : "No screenshot"}</li>
                  </ul>
                )}
              </div>

              {error && (
                <div role="alert" style={{ ...label, color: "var(--status-danger)", background: "var(--status-danger-soft)", borderRadius: "var(--r-input)", padding: "10px 12px", lineHeight: 1.45 }}>
                  {error} <span style={{ color: "var(--ink-2)" }}>Your text is still here.</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 24px 20px" }}>
              <BtButton variant="secondary" size="small" onClick={onClose} disabled={sending}>Cancel</BtButton>
              <BtButton size="small" onClick={send} loading={sending}>{error ? "Try again" : "Send"}</BtButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
