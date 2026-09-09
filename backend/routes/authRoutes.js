const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const passport = require("passport");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const { updateProfile, safeUser: controllerSafeUser } = require("../controllers/userController");
const upload = require("../config/multer");
const { getFileUrl } = require("../config/fileHelpers");
const Subscription = require("../models/Subscription");
const Project = require("../models/Project");
const ProjectConfig = require("../models/ProjectConfig");
const Transaction = require("../models/Transaction");
const ExpenseEntry = require("../models/ExpenseEntry");
const Task = require("../models/Task");
const Inventory = require("../models/Inventory");
const ProjectUpdate = require("../models/ProjectUpdate");
const Worker = require("../models/Worker");
const EsignRequest = require("../models/EsignRequest");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const loginFailures = new Map();
const registrationOTPs = new Map();
const verifiedEmails = new Map();

const MAX_ATTEMPTS    = 5;
const LOCK_WINDOW_MS  = 15 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [email, rec] of loginFailures) {
    if (!rec.lockedUntil || rec.lockedUntil < now) {
      loginFailures.delete(email);
    }
  }
  for (const [email, rec] of registrationOTPs) {
    if (rec.expiresAt < now) {
      registrationOTPs.delete(email);
    }
  }
  for (const [email, timestamp] of verifiedEmails) {
    if (timestamp < now - 60 * 60 * 1000) {
      verifiedEmails.delete(email);
    }
  }
}, 5 * 60 * 1000).unref();
const DUMMY_HASH = "$2a$12$invalidhashusedfortimingprotectiononly.........";
const SECRET = process.env.JWT_SECRET;
const FRONTEND =
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:5173";
const makeToken = (user) =>
  jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      tokenVersion: user.tokenVersion || 0,
    },
    SECRET,
    { expiresIn: "7d" }
  );
const safeUser = (user) => {
  const projectIds = Array.isArray(user.projectIds)
    ? user.projectIds
        .filter(Boolean)
        .map((id) => id.toString())
    : [];
  const legacyProjectId =
    user.projectId?.toString() || projectIds[0] || null;
  return {
    id: user._id || user.id,
    name: user.name,
    email: user.email,
    role: user.role || "Mason",
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    projectIds,
    projectId: legacyProjectId,
    profilePhoto: user.profilePhoto || null,
    provider: user.provider || "local",
    isActive: user.isActive !== undefined ? user.isActive : true,
    twoFactorEnabled: !!user.twoFactorEnabled,
    overseesRoles: Array.isArray(user.overseesRoles) ? user.overseesRoles : [],
    onboarding: user.onboarding || { hasSkippedTour: false, hasCreatedProject: false, hasAddedEntry: false },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.map((p) => String(p).trim()).filter(Boolean))];
};
const toObjectIdArray = (value) => {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .filter((v) => v && mongoose.Types.ObjectId.isValid(v))
    .map((v) => new mongoose.Types.ObjectId(v));
};
const toObjectIdOrNull = (value) => {
  if (!value) return null;
  return mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : null;
};
const normalizeRole = (role, fallback = "Mason") => {
  const clean = String(role || "").trim();
  return clean.length > 0 ? clean : fallback;
};
const getUserId = (req) => req.user?._id || req.user?.id;

async function adminDeleteAccount(adminId) {
  const childUsers = await User.find({ createdBy: adminId }).select("_id");
  const userIds = [adminId, ...childUsers.map((u) => u._id)];

  const projects = await Project.find({ createdBy: adminId }).select("_id");
  const projectIds = projects.map((p) => p._id);

  const txs = await Transaction.find({ createdBy: adminId }, "_id eSignToken");
  const txIds = txs.map((t) => t._id);
  const signTokens = txs.map((t) => t.eSignToken).filter(Boolean);

  await EsignRequest.deleteMany({
    $or: [
      { token: { $in: signTokens } },
      { "meta.transactionId": { $in: txIds } },
    ],
  });
  await Notification.deleteMany({ user: { $in: userIds } });
  await Subscription.deleteMany({ userId: { $in: userIds } });
  await Transaction.deleteMany({
    $or: [{ createdBy: { $in: userIds } }, { project: { $in: projectIds } }],
  });
  await ExpenseEntry.deleteMany({
    $or: [{ createdBy: { $in: userIds } }, { project: { $in: projectIds } }],
  });
  await Task.deleteMany({
    $or: [{ createdBy: { $in: userIds } }, { project: { $in: projectIds } }],
  });
  await Inventory.deleteMany({
    $or: [{ createdBy: { $in: userIds } }, { project: { $in: projectIds } }],
  });
  await ProjectUpdate.deleteMany({
    $or: [{ createdBy: { $in: userIds } }, { project: { $in: projectIds } }],
  });
  await Worker.deleteMany({ createdBy: { $in: userIds } });
  await ProjectConfig.deleteMany({ project: { $in: projectIds } });
  await Project.deleteMany({ createdBy: adminId });
  await User.deleteMany({ _id: { $in: userIds } });
}
const ADMIN_PERMISSIONS = [
  "create_project",
  "edit_project",
  "delete_project",
  "view_all_projects",
  "view_assigned_project",
  "manage_building_type",
  "manage_floors",
  "manage_phases",
  "manage_activities",
  "manage_checklists",
  "manage_contractors",
  "manage_users",
  "assign_roles",
  "assign_project",
  "submit_daily_update",
  "upload_photos",
  "upload_videos",
  "submit_checklist",
  "report_issue",
  "report_delay",
  "approve_updates",
  "reject_updates",
  "add_supervisor_remarks",
  "view_progress_dashboard",
  "view_issue_tracker",
  "view_delay_tracker",
  "view_media_gallery",
  "view_reports",
  "manage_expenses",
  "approve_payments",
  "view_payment_reports",
  "upload_documents",
  "view_documents",
  "manage_material_master",
  "manage_labour_master",
  "manage_equipment_master",
  "view_contractor_performance",
  "view_projects",
  "add_entries",
  "mark_paid",
  "view_reports",
  "manage_team",
];
router.post("/send-registration-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    
    const cleanEmail = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: cleanEmail });
    if (exists) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    registrationOTPs.set(cleanEmail, { otp, expiresAt: Date.now() + 2 * 60 * 1000 });

    if (process.env.AWS_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL) {
      const sesClient = new SESClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p style="color: #555; line-height: 1.5;">
            Please use the verification code below to complete your BuildTrack registration.
            This code will expire in <strong>2 minutes</strong>.
          </p>
          <div style="background: #f0eeff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #4F46E5; letter-spacing: 2px;">
              ${otp}
            </p>
          </div>
        </div>
      `;
      const command = new SendEmailCommand({
        Destination: { ToAddresses: [cleanEmail] },
        Message: {
          Body: { Html: { Data: htmlContent, Charset: "UTF-8" } },
          Subject: { Data: "BuildTrack — Email Verification Code", Charset: "UTF-8" }
        },
        Source: process.env.SES_FROM_EMAIL
      });
      await sesClient.send(command);
    } else {
      console.log(`[DEV] REGISTRATION OTP for ${cleanEmail}: ${otp}`);
    }

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("[Auth] Send OTP error:", err);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

router.post("/verify-registration-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });

  const cleanEmail = String(email).toLowerCase().trim();
  const record = registrationOTPs.get(cleanEmail);

  if (!record || record.expiresAt < Date.now()) {
    return res.status(400).json({ success: false, message: "OTP expired or invalid" });
  }

  if (record.otp !== String(otp).trim()) {
    return res.status(400).json({ success: false, message: "Incorrect OTP" });
  }

  registrationOTPs.delete(cleanEmail);
  verifiedEmails.set(cleanEmail, Date.now());

  return res.status(200).json({ success: true, message: "Email verified successfully" });
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, projectId } = req.body;
    console.log(`[Auth] Register request received for email: ${email}`);
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }
    const cleanEmail = String(email).toLowerCase().trim();
    if (!verifiedEmails.has(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Email not verified. Please verify your email first." });
    }
    const cleanName = String(name).trim();
    const exists = await User.findOne({ email: cleanEmail });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    const projectIds = toObjectIdArray(projectId);
    const legacyProjectId = toObjectIdOrNull(projectId);
    const serverAssignedRole = "Admin";
    const serverAssignedPermissions = ADMIN_PERMISSIONS;
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role: serverAssignedRole,
      permissions: serverAssignedPermissions,
      projectIds,
      projectId: legacyProjectId,
    });
    console.log(
      `[Auth] Account owner registered: ${user._id} | server-assigned role=${serverAssignedRole}`
    );
    
    verifiedEmails.delete(cleanEmail);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token: makeToken(user),
      user: safeUser(user),
    });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error during registration" });
  }
});
router.post("/provision", protect, authorize("Admin"), async (req, res) => {
  try {
    const {
      name,
      email,
      temporaryPassword,
      password,
      role,
      permissions,
      projectIds,
      projectId,
    } = req.body;
    const finalPassword = temporaryPassword || password;
    const activeSub = await Subscription.findOne({
      userId: req.user._id,
      status: 'active',
      endDate: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    let limit = 2;
    if (activeSub) {
      const plan = activeSub.plan || 'free';
      if (plan === 'starter') limit = 5;
      else if (plan === 'growth') limit = 8;
      else if (plan === 'pro') limit = 15;
      else if (plan === 'business') limit = 25;
      else if (plan === 'enterprise') limit = -1;
    }
    if (limit !== -1) {
      const count = await User.countDocuments({ $or: [{ _id: req.user._id }, { createdBy: req.user._id }] });
      if (count >= limit) {
        return res.status(403).json({ message: `User limit reached for your current plan (${limit} users). Please upgrade your subscription.` });
      }
    }
    if (!name || !email || !finalPassword || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (String(finalPassword).length < 6) {
      return res
        .status(400)
        .json({ message: "Temporary password must be at least 6 characters" });
    }
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = String(name).trim();
    const cleanRole = normalizeRole(role, "Mason");
    if (cleanRole.toLowerCase() === "admin") {
      return res
        .status(400)
        .json({ message: "Cannot provision another Admin account" });
    }
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }
    const finalProjectIds = projectIds
      ? toObjectIdArray(projectIds)
      : toObjectIdArray(projectId);
    const legacyProjectId =
      finalProjectIds.length > 0 ? finalProjectIds[0] : toObjectIdOrNull(projectId);
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: finalPassword,
      role: cleanRole,
      permissions: normalizePermissions(permissions),
      projectIds: finalProjectIds,
      projectId: legacyProjectId,
      createdBy: req.user._id,
    });
    return res.status(201).json({
      message: "Account provisioned successfully",
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Provisioning error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }
    return res
      .status(500)
      .json({ message: "Server error during account provisioning" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    const cleanEmail = String(email).toLowerCase().trim();
    const failRec = loginFailures.get(cleanEmail);
    if (failRec?.lockedUntil && failRec.lockedUntil > Date.now()) {
      const waitSec = Math.ceil((failRec.lockedUntil - Date.now()) / 1000);
      const waitMin = Math.ceil(waitSec / 60);
      console.warn(`[Auth] Brute-force lockout active for ${cleanEmail} — ${waitSec}s remaining`);
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${waitMin} minute${waitMin !== 1 ? "s" : ""}.`,
      });
    }
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account deactivated. Contact support." });
    }
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google or GitHub login. Please use those methods.",
      });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const rec = loginFailures.get(cleanEmail) || { count: 0, lockedUntil: null };
      rec.count += 1;
      if (rec.count >= MAX_ATTEMPTS) {
        rec.lockedUntil = Date.now() + LOCK_DURATION_MS;
        loginFailures.set(cleanEmail, rec);
        console.warn(`[Auth] Account locked after ${MAX_ATTEMPTS} failed attempts: ${cleanEmail}`);
        return res.status(429).json({
          success: false,
          message: "Too many failed attempts. Account locked for 15 minutes.",
        });
      }
      loginFailures.set(cleanEmail, rec);
      const remaining = MAX_ATTEMPTS - rec.count;
      console.warn(`[Auth] Failed login attempt ${rec.count}/${MAX_ATTEMPTS} for ${cleanEmail}`);
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before lockout.`,
      });
    }
    loginFailures.delete(cleanEmail);
    const needsHeal = user.role === "Admin" && user.permissions.length === 0;
    if (needsHeal) {
      console.warn(`[Auth] Healing broken admin permissions for ${cleanEmail}`);
      user.permissions = ADMIN_PERMISSIONS;
      await user.save();
    }
    const token = makeToken(user);
    console.log(`[Auth] Login successful for user: ${user._id}`);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error("[Auth] Login error:", err.message);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
});
router.get("/me", protect, (req, res) => {
  return res.json({ user: safeUser(req.user) });
});
router.put("/profile", protect, updateProfile);
router.put("/photo", protect, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No photo uploaded" });
    const user = await User.findById(getUserId(req));
    if (!user) return res.status(404).json({ message: "User not found" });
    user.profilePhoto = getFileUrl(req.file);
    await user.save();
    return res.json({
      message: "Photo updated",
      profilePhoto: user.profilePhoto,
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Photo upload error:", err);
    return res.status(500).json({ message: "Failed to upload photo" });
  }
});
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ message: "Google login is not configured." });
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});
router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${FRONTEND}/login?error=google_failed`,
    })(req, res, next);
  },
  (req, res) => {
    const token = makeToken(req.user);
    return res.redirect(`${FRONTEND}/oauth/callback?token=${token}`);
  }
);
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.password) {
      return res.json({ message: "If that email is registered, a reset link has been sent." });
    }
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const resetUrl = `${FRONTEND}/login?resetToken=${token}`;
    let emailSent = false;
    if (process.env.AWS_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL) {
      try {
        const sesClient = new SESClient({
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        });
        const htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p style="color: #555; line-height: 1.5;">
                  We received a request to reset your BuildTrack password.
                  Click the link below or use the token in the app to set a new password.
                  This token expires in <strong>30 minutes</strong>.
                </p>
                <div style="margin: 24px 0; text-align: center;">
                  <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <div style="background: #f0eeff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0 0 8px 0; color: #888; font-size: 13px;">Your reset token</p>
                  <p style="margin: 0; font-size: 18px; font-weight: bold; color: #4F46E5; word-break: break-all; letter-spacing: 0.5px;">
                    ${token}
                  </p>
                </div>
                <p style="color: #888; font-size: 13px;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            `;
        const command = new SendEmailCommand({
          Destination: { ToAddresses: [user.email] },
          Message: {
            Body: { Html: { Data: htmlContent, Charset: "UTF-8" } },
            Subject: { Data: "BuildTrack — Password Reset", Charset: "UTF-8" }
          },
          Source: process.env.SES_FROM_EMAIL
        });
        await sesClient.send(command);
        emailSent = true;
        console.log('[Auth] Password reset email sent via SES to:', user.email);
      } catch (err) {
        console.error("[Auth] SES send error:", err.message);
      }
    }
    if (!emailSent && process.env.NODE_ENV !== "production") {
      console.log(`[DEV] PASSWORD RESET TOKEN: ${token}`);
      console.log(`PASSWORD RESET LINK: ${resetUrl}`);
    }
    return res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    return res.json({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    const user = await User.findById(getUserId(req));
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.password) {
      return res.status(400).json({ message: "This account uses OAuth login." });
    }
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    user.password = newPassword;
    await user.save();
    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ message: "Failed to change password" });
  }
});
router.put("/toggle-2fa", protect, (_req, res) => {
  return res.status(501).json({
    message: "Two-factor authentication is not yet available. This feature is coming soon.",
  });
});
router.post("/sign-out-all", protect, async (req, res) => {
  try {
    const user = await User.findById(getUserId(req));
    if (!user) return res.status(404).json({ message: "User not found" });
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    return res.json({ message: "All sessions signed out." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to sign out all sessions" });
  }
});
router.delete("/account", protect, async (req, res) => {
  try {
    const user = await User.findById(getUserId(req));
    if (!user) return res.status(404).json({ message: "User not found" });
    if ((user.role || "").toLowerCase() === "admin") {
      await adminDeleteAccount(user._id);
      console.log(
        `[DeleteAccount] Admin ${user.email} (${user._id}) permanently deleted with all associated data`
      );
      return res.json({
        message:
          "Account and all associated data have been permanently deleted.",
      });
    }
    user.isActive = false;
    await user.save();
    return res.json({ message: "Account has been deactivated permanently." });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ message: "Failed to delete account" });
  }
});
router.get("/users", protect, authorize("Admin"), async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { _id: req.user._id },
        { createdBy: req.user._id },
      ],
    }).select("-password -resetPasswordToken -resetPasswordExpires");
    return res.json({ users });
  } catch (err) {
    console.error("GET /auth/users error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});
router.put("/users/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const { name, email, role, permissions, projectIds, overseesRoles, password } = req.body;
    const user = await User.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!user) return res.status(404).json({ message: "User not found or access denied" });
    if (name)  user.name  = String(name).trim();
    if (email) user.email = String(email).toLowerCase().trim();
    if (role && String(role).toLowerCase() !== 'admin') {
      user.role = String(role).trim();
    }
    if (Array.isArray(permissions)) {
      user.permissions = [...new Set(permissions.map(p => String(p).trim()).filter(Boolean))];
    }
    if (Array.isArray(projectIds)) {
      user.projectIds = toObjectIdArray(projectIds);
      user.projectId  = user.projectIds[0] || null;
    }
    if (Array.isArray(overseesRoles)) {
      user.overseesRoles = overseesRoles;
    }
    if (password && String(password).length >= 6) {
      user.password = password;
    }
    await user.save();
    return res.status(200).json({ message: "User updated", user: safeUser(user) });
  } catch (err) {
    console.error("Update user error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already in use" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
