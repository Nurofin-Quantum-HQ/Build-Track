// Pure helpers that turn a bug report into the support email (multipart MIME for SES SendRawEmail).
// Nothing here touches the network, the database or process.env, so it is straightforward to test.
const crypto = require("crypto");

const escapeHtml = (v) =>
  String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Drop CR/LF and other control characters so user text can never start a new header line.
const oneLine = (v) =>
  String(v == null ? "" : v)
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

const isAscii = (s) => /^[\x20-\x7e]*$/.test(s);

/**
 * RFC 2047 encoded-word header value. Pure ASCII is returned untouched; anything else becomes one or more
 * `=?UTF-8?B?...?=` words (each <= 75 chars, split on code-point boundaries) joined by CRLF + space folding.
 */
function encodeHeaderValue(raw) {
  const text = oneLine(raw);
  if (isAscii(text)) return text;
  const words = [];
  let chunk = "";
  let chunkBytes = 0;
  for (const ch of text) {
    const b = Buffer.byteLength(ch, "utf8");
    if (chunkBytes + b > 42) {
      words.push(chunk);
      chunk = "";
      chunkBytes = 0;
    }
    chunk += ch;
    chunkBytes += b;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${Buffer.from(w, "utf8").toString("base64")}?=`).join("\r\n ");
}

const SUBJECT_MAX = 200;

function buildSubject({ code, reporter = {}, screen = {} }) {
  const name = oneLine(reporter.name) || "A user";
  const company = oneLine(reporter.companyName);
  const who = company ? `${name} (${company})` : name;
  const where = oneLine(screen.name) || oneLine(screen.route) || "the app";
  return `[Build-Track] ${oneLine(code)} · ${who} reported a problem on ${where}`.slice(0, SUBJECT_MAX);
}

const IST = "Asia/Kolkata";
function formatIst(value) {
  if (!value) return "unknown";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "unknown";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.day} ${p.month} ${p.year}, ${hour}:${p.minute}:${p.second} IST`;
}

const wrap76 = (b64) => b64.replace(/(.{76})/g, "$1\r\n").replace(/\r\n$/, "");

const cosLine = (cos) => {
  if (!cos || !cos.status) return null;
  if (cos.status === "sent") return `Sent to Chief of Staff${cos.issueId ? ` as issue #${cos.issueId}` : ""}`;
  if (cos.status === "disabled") return "Chief of Staff forwarding is not configured";
  if (cos.status === "failed") return "Chief of Staff forwarding failed, will retry";
  return "Chief of Staff forwarding pending";
};

function deviceLine(report) {
  const d = report.device || {};
  const bits = [];
  if (d.platform) bits.push(d.platform);
  if (d.osVersion) bits.push(`OS ${d.osVersion}`);
  if (d.model) bits.push(d.model);
  if (d.appVersion) bits.push(`app ${d.appVersion}${d.buildNumber ? ` (${d.buildNumber})` : ""}`);
  if (d.locale) bits.push(d.locale);
  if (d.viewport) bits.push(`viewport ${d.viewport}`);
  return bits.join(" · ");
}

/** The readable content of the email as ordered rows, used by both the text and the HTML bodies. */
function describeReport(report, opts = {}) {
  const r = report.reporter || {};
  const reporterBits = [r.name, r.email, r.phone, r.role, r.companyName].map(oneLine).filter(Boolean);
  const rows = [
    ["Reporter", reporterBits.join(" · ") || "unknown"],
    ["Screen", [report.screen && report.screen.name, report.screen && report.screen.route].map(oneLine).filter(Boolean).join(" · ") || "-"],
    ["Happened (device time)", formatIst(report.occurredAt)],
    ["Received (server time)", formatIst(report.receivedAt)],
    ["Project", (report.project && (oneLine(report.project.name) || oneLine(report.project.id))) || "-"],
    ["Device / app", deviceLine(report) || "-"],
  ];
  const ua = report.device && report.device.userAgent;
  if (ua) rows.push(["Browser", oneLine(ua)]);
  const cos = cosLine(report.cos);
  if (cos) rows.push(["Chief of Staff", cos]);
  if (opts.hasScreenshot) rows.push(["Screenshot", "attached"]);
  return rows;
}

function buildText(report, opts) {
  const r = report.reporter || {};
  const lines = [];
  lines.push(`This was raised by ${oneLine(r.name) || "a user"} in Build-Track. Please rectify.`);
  lines.push("");
  lines.push(`Reference: ${oneLine(report.code)}`);
  lines.push("");
  lines.push("What went wrong:");
  lines.push(String(report.description || ""));
  if (report.tryingTo) {
    lines.push("");
    lines.push("What they were trying to do:");
    lines.push(String(report.tryingTo));
  }
  lines.push("");
  for (const [k, v] of describeReport(report, opts)) lines.push(`${k}: ${v}`);
  const crumbs = report.breadcrumbs || [];
  if (crumbs.length) {
    lines.push("");
    lines.push("Recent steps (oldest first):");
    for (const c of crumbs) {
      lines.push(`- ${formatIst(c.at).replace(/^\d+ \w+ \d+, /, "")}  [${c.kind}] ${oneLine(c.label)}${c.detail ? ` — ${oneLine(c.detail)}` : ""}`);
    }
  }
  return lines.join("\r\n");
}

function buildHtml(report, opts) {
  const r = report.reporter || {};
  const e = escapeHtml;
  const rows = describeReport(report, opts)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top;white-space:nowrap">${e(k)}</td><td style="padding:4px 0">${e(v)}</td></tr>`)
    .join("");
  const crumbs = report.breadcrumbs || [];
  const crumbRows = crumbs
    .map(
      (c) =>
        `<tr><td style="padding:3px 10px 3px 0;color:#666;white-space:nowrap">${e(formatIst(c.at).replace(/^\d+ \w+ \d+, /, ""))}</td>` +
        `<td style="padding:3px 10px 3px 0">${e(c.kind)}</td>` +
        `<td style="padding:3px 0">${e(oneLine(c.label))}${c.detail ? ` <span style="color:#666">— ${e(oneLine(c.detail))}</span>` : ""}</td></tr>`
    )
    .join("");
  return (
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:680px;margin:0 auto;color:#111;font-size:14px;line-height:1.5">` +
    `<p>This was raised by <strong>${e(oneLine(r.name) || "a user")}</strong> in Build-Track. Please rectify.</p>` +
    `<p style="color:#666;margin:0 0 16px">Reference <strong style="color:#111">${e(oneLine(report.code))}</strong></p>` +
    `<h3 style="margin:16px 0 4px;font-size:14px">What went wrong</h3>` +
    `<div style="white-space:pre-wrap;background:#f6f6f6;border-radius:6px;padding:10px 12px">${e(report.description)}</div>` +
    (report.tryingTo
      ? `<h3 style="margin:16px 0 4px;font-size:14px">What they were trying to do</h3><div style="white-space:pre-wrap;background:#f6f6f6;border-radius:6px;padding:10px 12px">${e(report.tryingTo)}</div>`
      : "") +
    `<table style="margin-top:16px;border-collapse:collapse;font-size:13px">${rows}</table>` +
    (crumbs.length
      ? `<h3 style="margin:16px 0 4px;font-size:14px">Recent steps</h3><table style="border-collapse:collapse;font-size:12px">${crumbRows}</table>`
      : "") +
    `</div>`
  );
}

const cleanAddress = (a) => oneLine(a).replace(/[<>,;"]/g, "");
const addressList = (v) =>
  String(v || "")
    .split(",")
    .map(cleanAddress)
    .filter((a) => /^[^\s@]+@[^\s@]+$/.test(a));

/**
 * Build the whole raw RFC 5322 message.
 * @param report plain object (BugReport fields: code, description, tryingTo, screen, reporter, device, project, breadcrumbs, occurredAt, receivedAt, cos)
 * @param opts   { from, to, screenshot?: {mime, data: Buffer}, boundary?, date? }
 * @returns {{ raw: Buffer, subject: string, to: string[] }}
 */
function buildBugReportEmail(report, opts) {
  const to = addressList(opts.to);
  const from = addressList(opts.from)[0];
  if (!from || !to.length) throw new Error("Bug report email needs valid from and to addresses");
  const shot = opts.screenshot && opts.screenshot.data && opts.screenshot.data.length ? opts.screenshot : null;
  const rand = () => crypto.randomBytes(12).toString("hex");
  const altBoundary = `alt_${opts.boundary || rand()}`;
  const mixBoundary = `mix_${opts.boundary || rand()}`;
  const subject = buildSubject(report);
  const ext = shot && shot.mime === "image/jpeg" ? "jpg" : "png";
  const date = opts.date instanceof Date ? opts.date : new Date();

  const textPart = Buffer.from(buildText(report, { hasScreenshot: !!shot }), "utf8").toString("base64");
  const htmlPart = Buffer.from(buildHtml(report, { hasScreenshot: !!shot }), "utf8").toString("base64");
  const alternative =
    `--${altBoundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(textPart)}\r\n` +
    `--${altBoundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(htmlPart)}\r\n` +
    `--${altBoundary}--\r\n`;

  const headers = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    `Subject: ${encodeHeaderValue(subject)}`,
    `Date: ${date.toUTCString().replace("GMT", "+0000")}`,
    "MIME-Version: 1.0",
    "X-Mailer: Build-Track bug reports",
  ];

  let body;
  if (shot) {
    const fileName = `${oneLine(report.code).replace(/[^A-Za-z0-9_-]/g, "")}-screenshot.${ext}`;
    body =
      `Content-Type: multipart/mixed; boundary="${mixBoundary}"\r\n\r\n` +
      `--${mixBoundary}\r\nContent-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n${alternative}\r\n` +
      `--${mixBoundary}\r\nContent-Type: ${shot.mime}; name="${fileName}"\r\nContent-Transfer-Encoding: base64\r\n` +
      `Content-Disposition: attachment; filename="${fileName}"\r\n\r\n${wrap76(Buffer.from(shot.data).toString("base64"))}\r\n` +
      `--${mixBoundary}--\r\n`;
  } else {
    body = `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n${alternative}`;
  }
  return { raw: Buffer.from(headers.join("\r\n") + "\r\n" + body, "utf8"), subject, to };
}

module.exports = { buildBugReportEmail, buildSubject, encodeHeaderValue, escapeHtml, formatIst, oneLine, buildHtml, buildText };
