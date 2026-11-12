// Screenshot of the app for a problem report. Never throws: resolves to { ok:false, reason } when the
// capture is not possible (cross-origin images, very large pages, slow device), so the report can go without it.
const MAX_BYTES = 1.5 * 1024 * 1024; // above this PNG is swapped for JPEG
const HARD_MAX_BYTES = 1.9 * 1024 * 1024; // server limit is 2 MB
const TIMEOUT_MS = 10000;

const dataUrlBytes = (u) => Math.floor(((u.length - u.indexOf(",") - 1) * 3) / 4);
const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("capture timed out")), ms))]);

// Anything marked data-bt-nocapture (toasts, the report dialog itself) stays out of the picture.
const filter = (node) => !(node && node.dataset && node.dataset.btNocapture !== undefined);

export async function captureScreenshot() {
  try {
    const root = document.getElementById("root") || document.body;
    const { toPng, toJpeg } = await import("html-to-image");
    const bg = getComputedStyle(document.body).backgroundColor || "#F2F0EB";
    const base = { backgroundColor: bg, filter, cacheBust: false };
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const build = async (opts) => {
      let png = await toPng(root, { ...base, pixelRatio: ratio, ...opts });
      if (dataUrlBytes(png) <= MAX_BYTES) return { mime: "image/png", dataUrl: png };
      const jpg = await toJpeg(root, { ...base, pixelRatio: ratio, quality: 0.8, ...opts });
      return { mime: "image/jpeg", dataUrl: jpg };
    };
    let shot;
    try {
      shot = await withTimeout(build({}), TIMEOUT_MS);
    } catch {
      // web-font CSS from another origin can break the first attempt: retry without embedding fonts
      shot = await withTimeout(build({ skipFonts: true }), TIMEOUT_MS);
    }
    if (dataUrlBytes(shot.dataUrl) > HARD_MAX_BYTES) {
      const smaller = await withTimeout(toJpeg(root, { ...base, pixelRatio: 1, quality: 0.7, skipFonts: true }), TIMEOUT_MS);
      if (dataUrlBytes(smaller) > HARD_MAX_BYTES) return { ok: false, reason: "too large" };
      shot = { mime: "image/jpeg", dataUrl: smaller };
    }
    return { ok: true, mime: shot.mime, dataUrl: shot.dataUrl, base64: shot.dataUrl.slice(shot.dataUrl.indexOf(",") + 1) };
  } catch (err) {
    return { ok: false, reason: (err && err.message) || "capture failed" };
  }
}
