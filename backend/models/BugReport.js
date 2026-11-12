const mongoose = require("mongoose");

// "Report a problem" submissions from the web app and the mobile app.
// The screenshot lives in its own collection (BugReportScreenshot) so list/detail queries stay small.
const STATUSES = ["received", "in_progress", "resolved", "closed"];
const DELIVERY_STATUSES = ["pending", "sent", "failed", "disabled"];

const breadcrumbSchema = new mongoose.Schema(
  {
    at: { type: Date, default: null },
    kind: { type: String, enum: ["screen", "tap", "api_error", "error"], required: true },
    label: { type: String, default: "" },
    detail: { type: String, default: "" },
  },
  { _id: false }
);

const bugReportSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // BR-1042
    number: { type: Number, required: true },
    clientReportId: { type: String, required: true },
    source: { type: String, enum: ["mobile", "web"], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    description: { type: String, required: true },
    tryingTo: { type: String, default: "" },
    screen: {
      route: { type: String, default: "" },
      name: { type: String, default: "" },
    },
    breadcrumbs: { type: [breadcrumbSchema], default: [] },
    device: {
      platform: { type: String, default: "" },
      osVersion: { type: String, default: "" },
      model: { type: String, default: "" },
      appVersion: { type: String, default: "" },
      buildNumber: { type: String, default: "" },
      locale: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      viewport: { type: String, default: "" },
    },
    project: {
      id: { type: String, default: "" },
      name: { type: String, default: "" },
    },
    reporter: {
      id: { type: String, default: "" },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      role: { type: String, default: "" },
      companyName: { type: String, default: "" },
    },
    requestUserAgent: { type: String, default: "" }, // User-Agent header of the submit request
    occurredAt: { type: Date, default: null }, // device clock
    receivedAt: { type: Date, required: true }, // server clock
    hasScreenshot: { type: Boolean, default: false },

    status: { type: String, enum: STATUSES, default: "received" },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: "" },
    resolvedNotifiedAt: { type: Date, default: null },

    cos: {
      status: { type: String, enum: DELIVERY_STATUSES, default: "pending" },
      issueId: { type: Number, default: null },
      attempts: { type: Number, default: 0 },
      lastError: { type: String, default: "" },
      sentAt: { type: Date, default: null },
      lastCallbackAt: { type: Date, default: null }, // CoS "updated_at" of the newest callback applied
    },
    email: {
      status: { type: String, enum: DELIVERY_STATUSES, default: "pending" },
      messageId: { type: String, default: "" },
      attempts: { type: Number, default: 0 },
      lastError: { type: String, default: "" },
      sentAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Idempotency: the same client report id from the same user is the same report.
bugReportSchema.index({ user: 1, clientReportId: 1 }, { unique: true });
bugReportSchema.index({ user: 1, createdAt: -1 });
// Sweeper lookups
bugReportSchema.index({ "cos.status": 1, "email.status": 1 });

const BugReport = mongoose.models.BugReport || mongoose.model("BugReport", bugReportSchema);
BugReport.STATUSES = STATUSES;
module.exports = BugReport;
