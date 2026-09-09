const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    providerId: { type: String, default: null },
    profilePhoto: { type: String, default: null },
    role: {
      type: String,
      default: "Mason",
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    overseesRoles: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    projectIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
      default: [],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    password: { type: String, minlength: 6, default: null },
    googleId: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    phone: { type: String, default: null, trim: true },
    twoFactorEnabled: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "starter", "growth", "pro", "business", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "expired", "unknown"],
        default: "active",
      },
      renewalDate: { type: Date, default: null },
      purchaseToken: { type: String, default: null },
    },
    onboarding: {
      hasSkippedTour: { type: Boolean, default: false },
      hasCreatedProject: { type: Boolean, default: false },
      hasAddedEntry: { type: Boolean, default: false },
      hasUsedBulkCSV: { type: Boolean, default: false },
      hasViewedReports: { type: Boolean, default: false },
      visitedModules: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);
userSchema.pre("validate", function () {
  if (this.googleId) {
    this.provider = "google";
    this.providerId = this.googleId;
    return;
  }
  if (this.password) {
    this.provider = "local";
    this.providerId = null;
  }
});
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.__v;
  return obj;
};
userSchema.index({ createdBy: 1 });
userSchema.index({ role: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });
module.exports = mongoose.model("User", userSchema);
