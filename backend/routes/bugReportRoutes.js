const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const service = require("../services/bugReportService");

// Submit a "Report a problem" (web + mobile). Saves, answers, then delivers in the background.
router.post("/", protect, async (req, res) => {
  try {
    const out = await service.createReport(req.user, req.body, { userAgent: req.get("user-agent") || "" });
    return res.status(out.status).json(out.body);
  } catch (err) {
    console.error("[BugReport] create failed:", err);
    return res.status(500).json({ success: false, message: "We couldn't save your report. Please try again." });
  }
});

// The signed-in user's own reports, newest first.
router.get("/mine", protect, async (req, res) => {
  try {
    return res.json({ success: true, data: await service.listMine(req.user._id) });
  } catch (err) {
    console.error("[BugReport] list failed:", err);
    return res.status(500).json({ success: false, message: "Could not load your reports." });
  }
});

// Status callback from Chief of Staff. No user auth: authenticated by an HMAC over the raw request body.
router.post("/cos-callback", async (req, res) => {
  try {
    const check = service.verifySignature({
      secret: process.env.COS_INTEGRATION_SECRET,
      timestamp: req.get("x-bt-timestamp"),
      signature: req.get("x-bt-signature"),
      rawBody: req.rawBody,
    });
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });
    const out = await service.applyCosCallback(req.body);
    return res.status(out.status).json(out.body);
  } catch (err) {
    console.error("[BugReport] callback failed:", err);
    return res.status(500).json({ success: false, message: "Callback failed" });
  }
});

module.exports = router;
