const mongoose = require("mongoose");

// Screenshot bytes for a BugReport, kept out of the report document so normal queries never load them.
// purgeAt is set by the delivery sweeper once the report has been delivered; rows are deleted after it.
const schema = new mongoose.Schema(
  {
    report: { type: mongoose.Schema.Types.ObjectId, ref: "BugReport", required: true, unique: true },
    mime: { type: String, enum: ["image/png", "image/jpeg"], required: true },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true },
    purgeAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BugReportScreenshot || mongoose.model("BugReportScreenshot", schema);
