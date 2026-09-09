const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const Transaction = require("../models/Transaction");
const Worker = require("../models/Worker");
const Project = require("../models/Project");
const Inventory = require("../models/Inventory");
const User = require("../models/User");
const { protect, requirePermission, getAdminId, canAccessProjectFilter } = require("../middleware/auth");
const upload = require("../config/multer");
const {
  getFileUrl,
  deleteFile,
} = require("../config/fileHelpers");
const cloudinary = require("../config/cloudinary");
router.get("/esign/:token", async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      eSignToken: req.params.token,
      eSignExpires: { $gt: new Date() }
    }).populate("project", "projectName clientName location mapAddress");
    if (!transaction) {
      return res.status(404).json({ message: "Invalid or expired signature link" });
    }
    res.json({ transaction });
  } catch (error) {
    console.error("GET /esign/:token error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/esign/:token", async (req, res) => {
  try {
    const { eSignature } = req.body;
    if (!eSignature) {
      return res.status(400).json({ message: "Signature data is required" });
    }
    const transaction = await Transaction.findOne({
      eSignToken: req.params.token,
      eSignExpires: { $gt: new Date() }
    });
    if (!transaction) {
      return res.status(404).json({ message: "Invalid or expired signature link" });
    }
    if (transaction.eSignStatus === "Signed") {
      return res.status(400).json({ message: "Receipt already signed" });
    }
    transaction.eSignature = eSignature;
    transaction.eSignStatus = "Signed";
    transaction.eSignDate = new Date();
    transaction.eSignToken = null;
    transaction.eSignExpires = null;
    await transaction.save();
    res.json({ message: "Receipt signed successfully", transaction });
  } catch (error) {
    console.error("POST /esign/:token error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.use(protect);
const parseId = (id) =>
  mongoose.Types.ObjectId.isValid(id) ? id : null;
const normalizeMaterialType = (materialType, subType) => {
  if (materialType === "purchase" || materialType === "usage") {
    return materialType;
  }
  if (subType === "Consumption") return "usage";
  return "purchase";
};
const parseAmount = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  const cleaned = String(value).replace(/[₹,\s]/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};
const MAX_AMOUNT   = 999_999_999;
const MAX_QUANTITY = 1_000_000;
const MAX_RATE     = 999_999_999;
const MAX_GST      = 100;
const validateTransactionAmounts = ({
  amount,
  quantity,
  rate,
  paidAmount,
  gst,
  overtime,
}) => {
  const checks = [
    { field: "amount",     value: amount,     min: 0, max: MAX_AMOUNT,   required: true },
    { field: "quantity",   value: quantity,   min: 0, max: MAX_QUANTITY,  required: false },
    { field: "rate",       value: rate,       min: 0, max: MAX_RATE,      required: false },
    { field: "paidAmount", value: paidAmount, min: 0, max: MAX_AMOUNT,    required: false },
    { field: "gst",        value: gst,        min: 0, max: MAX_GST,       required: false },
    { field: "overtime",   value: overtime,   min: 0, max: MAX_AMOUNT,    required: false },
  ];
  for (const { field, value, min, max, required } of checks) {
    if (value === undefined || value === null || value === "") {
      if (required) return `${field} is required`;
      continue;
    }
    const num = Number(value);
    if (!isFinite(num) || isNaN(num)) {
      return `${field} must be a valid finite number (received: ${value})`;
    }
    if (num < min) {
      return `${field} cannot be negative (received: ${num})`;
    }
    if (num > max) {
      return `${field} exceeds the maximum allowed value of ${max.toLocaleString()} (received: ${num})`;
    }
  }
  return null;
};
const calculateAmount = ({ type, quantity, rate, overtime, rawAmount }) => {
  const qty = Number(quantity) || 0;
  const rt = Number(rate) || 0;
  const ot = Number(overtime) || 0;
  const directAmount = Number(rawAmount) || 0;
  if (type === "Materials") {
    if (qty === 0 && rt === 0 && directAmount !== 0) return directAmount;
    return qty * rt;
  }
  if (type === "Wages") {
    if (qty === 0 && rt === 0 && directAmount !== 0) return directAmount + ot;
    return (qty * rt) + ot;
  }
  if (directAmount !== 0) return directAmount;
  return qty * rt;
};
const UNIT_MAP = {
  bags: "bag", bag: "bag",
  kg: "kg", kgs: "kg",
  tons: "ton", ton: "ton", mt: "MT",
  sqft: "sqft", "sq ft": "sqft", "square feet": "sqft",
  sqm: "sqm", "sq m": "sqm", "square meter": "sqm",
  rft: "rft", "running feet": "rft",
  days: "day", day: "day", "per day": "day",
  hours: "hour", hour: "hour",
  nos: "unit", unit: "unit", units: "unit", pcs: "unit", pieces: "unit",
  ltrs: "ltr", ltr: "ltr", litre: "ltr", litres: "ltr", liter: "ltr", liters: "ltr",
  truck: "truck", trucks: "truck", trips: "truck", load: "truck",
  cft: "sqft", cum: "sqm",
};
const VALID_UNITS = ["kg", "bag", "sqft", "sqm", "day", "hour", "unit", "ton", "MT", "truck", "ltr", "rft", ""];
const normalizeUnit = (raw) => {
  if (!raw) return "unit";
  const key = String(raw).toLowerCase().trim();
  if (UNIT_MAP[key]) return UNIT_MAP[key];
  if (VALID_UNITS.includes(raw)) return raw;
  return "unit";
};
const PAYMENT_MODE_MAP = {
  cash: "Cash",
  bank: "Bank",
  "bank transfer": "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque", check: "Cheque",
  neft: "Bank Transfer", rtgs: "Bank Transfer",
  online: "UPI",
};
const VALID_PAYMENT_MODES = ["Cash", "Bank", "Bank Transfer", "UPI", "Cheque", ""];
const normalizePaymentMode = (raw) => {
  if (!raw) return "Cash";
  const key = String(raw).toLowerCase().trim();
  if (PAYMENT_MODE_MAP[key]) return PAYMENT_MODE_MAP[key];
  if (VALID_PAYMENT_MODES.includes(raw)) return raw;
  return "Cash";
};
const runTransactionCreateUpload = (req, res) =>
  new Promise((resolve, reject) => {
    upload.fields([
      { name: "attachments", maxCount: 5 },
      { name: "paymentScreenshot", maxCount: 1 },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) return reject(Object.assign(err, { status: 400 }));
      if (err) return reject(Object.assign(err, { status: 400 }));
      resolve();
    });
  });
const runTransactionUpdateUpload = (req, res) =>
  new Promise((resolve, reject) => {
    upload.array("attachments")(req, res, (err) => {
      if (err instanceof multer.MulterError) return reject(Object.assign(err, { status: 400 }));
      if (err) return reject(Object.assign(err, { status: 400 }));
      resolve();
    });
  });
async function resolveIds(userId, { worker, project }) {
  let workerId = parseId(worker);
  let projectId = parseId(project);
  if (workerId) {
    const wDoc = await Worker.findOne({ _id: workerId, createdBy: userId }).lean();
    if (!wDoc) workerId = null;
  } else if (worker) {
    const wDoc = await Worker.findOne({ createdBy: userId, name: String(worker).trim() }).lean();
    workerId = wDoc?._id || null;
  }
  if (projectId) {
    const pDoc = await Project.findOne({ _id: projectId, createdBy: userId }).lean();
    if (!pDoc) projectId = null;
  } else if (project) {
    const pDoc = await Project.findOne({ createdBy: userId, projectName: String(project).trim() }).lean();
    projectId = pDoc?._id || null;
  }
  return { workerId, projectId };
}
async function applyInventoryDelta(
  adminId,
  projectId,
  category,
  unit,
  delta,
  transactionType,
  session
) {
  if (!delta || !category || !projectId) return;
  const invCategory = transactionType === "Wages" ? "labour" : transactionType === "Expense" ? "equipment" : "material";
  if (delta > 0) {
    await Inventory.updateOne(
      {
        createdBy: adminId,
        project: projectId,
        materialName: category,
      },
      {
        $inc: {
          purchased: delta,
          closingStock: delta,
        },
        $setOnInsert: {
          unit: unit || "",
          category: invCategory,
        },
      },
      {
        upsert: true,
        session,
      }
    );
  }
  else if (delta < 0) {
    const absQty = Math.abs(delta);
    const inv = await Inventory.findOne(
      {
        createdBy: adminId,
        project: projectId,
        materialName: category,
      },
      null,
      { session }
    );
    if (!inv) {
      if (transactionType !== "Materials") {
        return;
      }
      throw Object.assign(
        new Error("No stock found for this material in this project"),
        { status: 400 }
      );
    }
    if (inv.closingStock < absQty) {
      if (transactionType !== "Materials") {
        await Inventory.updateOne(
          { _id: inv._id },
          {
            $inc: {
              purchased: -absQty,
              closingStock: -absQty,
            },
          },
          { session }
        );
        return;
      }
      throw Object.assign(
        new Error(`Insufficient stock — only ${inv.closingStock} ${inv.unit || "units"} available`),
        { status: 400 }
      );
    }
    await Inventory.updateOne(
      { _id: inv._id },
      {
        $inc: {
          used: absQty,
          closingStock: -absQty,
        },
      },
      { session }
    );
  }
}
router.get("/", async (req, res) => {
  try {
    const {
      type,
      search,
      category,
      project,
      startDate,
      endDate,
      createdBy: queryCreatedBy,
    } = req.query;
    const query = {};
    if (req.user.role !== "Admin") {
      const projectFilter = canAccessProjectFilter(req);
      const projects = await Project.find(projectFilter).select("_id");
      const projectIds = projects.map((p) => p._id);
      query.$or = [
        { project: { $in: projectIds } },
        { project: null, createdBy: req.user._id }
      ];
    } else {
      const adminProjects = await Project.find({ createdBy: req.user._id }).select("_id");
      const adminProjectIds = adminProjects.map((p) => p._id);
      query.$or = [
        { project: { $in: adminProjectIds } },
        { project: null, createdBy: req.user._id }
      ];
    }
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : 10000;
    const filterByViewAccess = req.query.filterByViewAccess;
    if (filterByViewAccess === 'true') {
      const hasFullAccess = req.user.role === "Admin" || 
                            (req.user.permissions && (req.user.permissions.includes("view_reports") || req.user.permissions.includes("manage_expenses") || req.user.permissions.includes("view_assigned_project")));
      
      if (!hasFullAccess) {
        const supervisorDoc = await User.findById(req.user._id).select("createdBy overseesRoles");
        const overseesRoles = supervisorDoc?.overseesRoles || [];
        let viewableUserIds = [req.user._id];
        if (overseesRoles.length > 0 && supervisorDoc?.createdBy) {
          const allOrgUsers = await User.find({ createdBy: supervisorDoc.createdBy }).select("_id role");
          const overseesRolesLower = overseesRoles.map(r => r.toLowerCase().trim());
          const usersToOversee = allOrgUsers.filter(u => overseesRolesLower.includes((u.role || "").toLowerCase().trim()));
          viewableUserIds.push(...usersToOversee.map(u => u._id));
        }
        query.createdBy = { $in: viewableUserIds };
      }
    } else if (queryCreatedBy && mongoose.Types.ObjectId.isValid(queryCreatedBy)) {
      query.createdBy = new mongoose.Types.ObjectId(queryCreatedBy);
    }
    if (type && type !== "All") query.type = type;
    if (category) query.category = category;
    if (project) {
      const pDoc = await Project.findOne(canAccessProjectFilter(req, project));
      if (!pDoc) {
        return res.status(403).json({ message: "Access denied to this project" });
      }
      query.project = project;
      if (query.$or) {
        delete query.$or;
      }
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    if (search) {
      const searchOr = [
        { title: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }
    let txQuery = Transaction.find(query)
      .select("-attachments")
      .populate("worker", "name trade")
      .populate("project", "projectName status progress")
      .sort({ date: -1, createdAt: -1 });
    if (limitParam > 0) txQuery = txQuery.limit(limitParam);
    const transactions = await txQuery;
    res.json({ transactions });
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});
router.get("/my", async (req, res) => {
  try {
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const transactions = await Transaction.find({ createdBy: req.user._id })
      .populate("project", "projectName")
      .sort({ date: -1, createdAt: -1 })
      .limit(limitParam);
    res.json({ transactions });
  } catch (err) {
    console.error("Get my transactions error:", err);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id)
      .populate("worker", "name trade")
      .populate("project", "projectName status progress createdBy");
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    if (req.user.role !== "Admin") {
      const assignedIds = Array.isArray(req.user.projectIds)
        ? req.user.projectIds.filter(Boolean).map((id) => id.toString())
        : [];
      const legacyId = req.user.projectId ? req.user.projectId.toString() : null;
      const allAssigned = legacyId && !assignedIds.includes(legacyId)
        ? [...assignedIds, legacyId]
        : assignedIds;
      if (!tx.project || !allAssigned.includes(tx.project._id.toString())) {
        return res.status(403).json({ message: "Access denied to this transaction" });
      }
    } else {
      if (tx.project && tx.project.createdBy.toString() !== req.user._id.toString()) {
        if (tx.createdBy.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: "Access denied to this transaction" });
        }
      }
    }
    res.json({ transaction: tx });
  } catch (err) {
    console.error("Get transaction error:", err);
    res.status(500).json({ message: "Failed to fetch transaction" });
  }
});
router.post("/", requirePermission(["manage_expenses", "add_entries"]), async (req, res) => {
  try {
    await runTransactionCreateUpload(
      req,
      res
    );
  } catch (uploadErr) {
    return res.status(400).json({ message: uploadErr.message || "File upload error" });
  }
  const { paymentStatus, paidAmount } = req.body;
  const userPermissions = req.user.permissions || [];
  const canMarkPaid =
    req.user.role === "Admin" ||
    userPermissions.includes("approve_payments") ||
    userPermissions.includes("mark_paid");
  if ((paymentStatus === "Paid" || Number(paidAmount) > 0) && !canMarkPaid) {
    return res.status(403).json({
      message: "Insufficient permissions to record payments or mark as Paid",
    });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      title, type, worker, project, date, notes,
      category, brand, subType, unit, quantity, rate,
      materialType,
      paymentStatus: _paymentStatus,
      paymentMode, paymentDate, paidAmount: _paidAmount,
      remarks,
      amount: rawAmount,
      floor,
      floorId,
      phase,
      phaseId,
      activity,
      activityId,
      supplier,
      gst,
      isWithGst,
      overtime,
    } = req.body;
    const txApprovalStatus = req.user.role === "Admin" ? "Approved" : "Pending";
console.log(`[Transaction] Creating transaction - user role: ${req.user.role}, approvalStatus: ${txApprovalStatus}, createdBy: ${req.user._id}`);
    const approvedBy = req.user.role === "Admin" ? req.user._id : null;
    const approvedAt = req.user.role === "Admin" ? new Date() : null;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!type) {
      return res.status(400).json({ message: "Transaction type is required" });
    }
    const resolvedCategory = category !== undefined ? category : "";
    const normalizedMaterialType =
      type === "Materials" ? normalizeMaterialType(materialType, subType) : "";
    const adminId = await getAdminId(req.user);
    let workerId = parseId(worker);
    let projectId = parseId(project);
    if (workerId) {
      const wDoc = await Worker.findOne({ _id: workerId, createdBy: adminId }).lean();
      if (!wDoc) workerId = null;
    } else if (worker) {
      const wDoc = await Worker.findOne({ createdBy: adminId, name: String(worker).trim() }).lean();
      workerId = wDoc?._id || null;
    }
    if (projectId) {
      const pDoc = await Project.findOne(canAccessProjectFilter(req, projectId));
      if (!pDoc) projectId = null;
    }
    const attachmentFiles = (req.files?.attachments || []).map(getFileUrl);
if (req.body.attachments) {
  let bodyAttachments = req.body.attachments;
  if (typeof bodyAttachments === "string") {
    try {
      bodyAttachments = JSON.parse(bodyAttachments);
    } catch {
      bodyAttachments = [bodyAttachments];
    }
  }
  if (Array.isArray(bodyAttachments)) {
    for (const att of bodyAttachments) {
      if (!att) continue;
      if (typeof att === "string" && att.startsWith("data:")) {
        try {
          const uploadResult = await cloudinary.uploader.upload(att, {
            folder: "buildtrack",
          });
          attachmentFiles.push(uploadResult.secure_url);
        } catch (uploadErr) {
          console.error("Cloudinary attachment upload error:", uploadErr);
        }
      } else {
        attachmentFiles.push(att);
      }
    }
  }
}
if (req.body.receiptImage) {
  try {
    const uploadResult = await cloudinary.uploader.upload(req.body.receiptImage, {
      folder: "buildtrack",
    });
    attachmentFiles.push(uploadResult.secure_url);
  } catch (uploadErr) {
    console.error("Cloudinary receiptImage upload error:", uploadErr);
  }
}
let paymentReceiptUrl = null;
if (req.body.paymentReceipt) {
  if (typeof req.body.paymentReceipt === "string" && req.body.paymentReceipt.startsWith("data:")) {
    try {
      const uploadResult = await cloudinary.uploader.upload(req.body.paymentReceipt, {
        folder: "buildtrack/payment-receipts",
      });
      paymentReceiptUrl = uploadResult.secure_url;
    } catch (uploadErr) {
      console.error("Cloudinary paymentReceipt upload error:", uploadErr);
    }
  } else {
    paymentReceiptUrl = req.body.paymentReceipt;
  }
}
    const screenshotFile = req.files?.paymentScreenshot?.[0];
    const screenshotUrl = screenshotFile ? getFileUrl(screenshotFile) : null;
    const qty      = Number(quantity)  || 0;
    const rt       = Number(rate)      || 0;
    const ot       = Number(overtime)  || 0;
    const paidAmt  = parseAmount(_paidAmount);
    const gstVal   = Number(gst)       || 0;
    if (qty < 0 || rt < 0) {
      return res.status(400).json({ message: "Quantity and rate must be positive" });
    }
    const finalAmount = calculateAmount({ type, quantity: qty, rate: rt, overtime: ot, rawAmount });
    const amountErr = validateTransactionAmounts({
      amount:     finalAmount,
      quantity:   qty,
      rate:       rt,
      paidAmount: paidAmt,
      gst:        gstVal,
      overtime:   ot,
    });
    if (amountErr) {
      return res.status(400).json({ message: `Invalid transaction data: ${amountErr}` });
    }
      const transaction =
        new Transaction({
          createdBy: req.user._id,
          title: title.trim(),
          type,
          worker:
            workerId || null,
          project:
            projectId || null,
          date:
            date || new Date(),
          notes,
          category:
            resolvedCategory,
          brand,
          supplier,
          gst,
          isWithGst,
          subType,
          materialType:
            normalizedMaterialType,
          unit:
            normalizeUnit(unit),
          quantity: qty,
          rate: rt,
          overtime: ot,
          amount: finalAmount,
          floor,
          floorId,
          phase,
          phaseId,
          activity,
          activityId,
          paymentStatus:
            paymentStatus ||
            "Pending",
          paymentMode:
            normalizePaymentMode(paymentMode),
          paymentDate,
          paidAmount: paidAmt,
          remarks,
          attachments:
            attachmentFiles,
          screenshotUrl,
          paymentReceipt: paymentReceiptUrl,
          paymentHistory: paidAmt > 0 ? [{
            date: paymentDate || date || new Date(),
            method: normalizePaymentMode(paymentMode),
            amount: paidAmt,
            note: notes || "Initial payment on creation",
            receipt: paymentReceiptUrl || undefined,
          }] : [],
          approvalStatus: txApprovalStatus,
          approvedBy: approvedBy,
          approvedAt: approvedAt,
        });
    if (req.body.requestEsign === true && req.body.clientEmail && normalizePaymentMode(paymentMode) === "Cash") {
      const token = crypto.randomBytes(32).toString("hex");
      transaction.clientEmail = req.body.clientEmail;
      transaction.eSignToken = token;
      transaction.eSignStatus = "Requested";
      transaction.eSignExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    await transaction.save({ session });
    if ((type === "Materials" || type === "Wages" || type === "Expense") && qty > 0 && projectId && txApprovalStatus === "Approved") {
      const inventoryDelta = (type === "Materials" && normalizedMaterialType === "usage") ? -qty : qty;
      await applyInventoryDelta(
        adminId,
        projectId,
        resolvedCategory || title,
        unit,
        inventoryDelta,
        type,
        session
      );
    }
    await session.commitTransaction();
    if (transaction.approvalStatus === "Pending") {
      const NotificationService = require("../services/NotificationService");
      await NotificationService.notifyAdminsAndSupervisors(req.user._id, {
        title: "New Entry Pending Approval",
        message: `A new ${type} entry for Rs. ${finalAmount} requires your approval.`,
        type: "approval",
        relatedId: transaction._id,
        relatedModel: "Transaction"
      });
    }
    if (transaction.eSignToken) {
      const signUrl = `${req.protocol}://${req.get('host')}/api/esign/sign/${transaction.eSignToken}`;
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
              <h2 style="color: #333;">Signature Required</h2>
              <p style="color: #555; line-height: 1.5;">
                Please review and sign the cash receipt for your transaction on BuildTrack.
              </p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="${signUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review & Sign Receipt</a>
              </div>
              <p style="color: #888; font-size: 13px;">
                This link expires in 7 days.
              </p>
            </div>
          `;
          const command = new SendEmailCommand({
            Destination: { ToAddresses: [transaction.clientEmail] },
            Message: {
              Body: { Html: { Data: htmlContent, Charset: "UTF-8" } },
              Subject: { Data: "Signature Required: BuildTrack Cash Receipt", Charset: "UTF-8" }
            },
            Source: process.env.SES_FROM_EMAIL
          });
          await sesClient.send(command);
          console.log('[Transaction] Signature email sent via SES');
        } catch (e) {
          console.error("Failed to send automatic e-sign email:", e);
        }
      }
    }
    
    // Update onboarding status
    await User.findByIdAndUpdate(req.user.id, { "onboarding.hasAddedEntry": true });

    res.status(201).json({
      message: "Transaction saved successfully",
      transaction,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Create transaction error:", err);
    let status = err.status || 500;
    if (err.name === "ValidationError") status = 400;
    else if (err.name === "VersionError") status = 409;
    res.status(status).json({
      message: err.message || "Failed to save transaction",
    });
  } finally {
    session.endSession();
  }
});
router.put("/:id", requirePermission(["manage_expenses", "add_entries"]), async (req, res) => {
  try {
    await runTransactionUpdateUpload(
      req,
      res
    );
  } catch (uploadErr) {
    return res.status(400).json({ message: uploadErr.message || "File upload error" });
  }
  if (process.env.NODE_ENV !== "production") {
    console.log('=== UPDATE TRANSACTION REQUEST ===');
    console.log('ID:', req.params.id);
  }
  const { paymentStatus, paidAmount } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findById(req.params.id).session(session);
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    if (req.user.role !== "Admin") {
      const assignedIds = Array.isArray(req.user.projectIds)
        ? req.user.projectIds.filter(Boolean).map((id) => id.toString())
        : [];
      const legacyId = req.user.projectId ? req.user.projectId.toString() : null;
      const allAssigned = legacyId && !assignedIds.includes(legacyId)
        ? [...assignedIds, legacyId]
        : assignedIds;
      if (!tx.project || !allAssigned.includes(tx.project.toString())) {
        return res.status(403).json({ message: "Access denied to this transaction" });
      }
    } else {
      if (tx.project) {
        const pDoc = await Project.findById(tx.project).session(session);
        if (pDoc && pDoc.createdBy.toString() !== req.user._id.toString()) {
          if (tx.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied to this transaction" });
          }
        }
      }
    }
    const userPermissions = req.user.permissions || [];
    const canMarkPaid =
      req.user.role === "Admin" ||
      userPermissions.includes("approve_payments") ||
      userPermissions.includes("mark_paid");
    if ((paymentStatus === "Paid" || paidAmount !== undefined) && !canMarkPaid) {
      if (paymentStatus === "Paid" || (paidAmount !== undefined && Number(paidAmount) !== tx.paidAmount)) {
        return res.status(403).json({
          message: "Insufficient permissions to record payments or mark as Paid",
        });
      }
    }
    const {
      title, type, worker, project, date, notes,
      category, brand, subType, unit, quantity, rate,
      materialType,
      paymentStatus: _paymentStatus, paymentMode, paymentDate,
      paidAmount: _paidAmount,
      paymentHistory,
      paymentReceipt,
      remarks,
      amount: rawAmount,
      floor,
      floorId,
      phase,
      phaseId,
      activity,
      activityId,
      supplier,
      gst,
      isWithGst,
      overtime,
      requestEsign,
      eSignStatus,
      clientEmail,
      eSignature,
    } = req.body;
    const adminId = await getAdminId(req.user);
    let workerId = parseId(worker ?? tx.worker);
    let projectId = parseId(project ?? tx.project);
    if (workerId) {
      const wDoc = await Worker.findOne({ _id: workerId, createdBy: adminId }).lean();
      if (!wDoc) workerId = null;
    }
    if (projectId) {
      const pDoc = await Project.findOne(canAccessProjectFilter(req, projectId));
      if (!pDoc) projectId = null;
    }
    const newQty      = quantity !== undefined ? Number(quantity) : tx.quantity;
    const newRt       = rate     !== undefined ? Number(rate)     : tx.rate;
    const newOt       = overtime !== undefined ? Number(overtime) : tx.overtime;
    const newPaidAmt  = _paidAmount !== undefined ? parseAmount(_paidAmount) : tx.paidAmount;
    const newGstVal   = gst      !== undefined ? Number(gst)      : tx.gst;
    const finalAmount = calculateAmount({
      type:      type || tx.type,
      quantity:  newQty,
      rate:      newRt,
      overtime:  newOt,
      rawAmount: rawAmount ?? tx.amount,
    });
    const amountErr = validateTransactionAmounts({
      amount:     finalAmount,
      quantity:   newQty,
      rate:       newRt,
      paidAmount: newPaidAmt,
      gst:        newGstVal,
      overtime:   newOt,
    });
    if (amountErr) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: `Invalid transaction data: ${amountErr}` });
    }
    const hasInventoryFieldsChanged =
      (project !== undefined && project !== tx.project?.toString()) ||
      (type !== undefined && type !== tx.type) ||
      (materialType !== undefined && materialType !== tx.materialType) ||
      (subType !== undefined && subType !== tx.subType) ||
      (category !== undefined && category !== tx.category) ||
      (title !== undefined && title !== tx.title) ||
      (unit !== undefined && unit !== tx.unit) ||
      (quantity !== undefined && Number(quantity) !== tx.quantity);
    const newType = type || tx.type;
    const newMaterialType = newType === "Materials"
      ? normalizeMaterialType(materialType || tx.materialType, subType || tx.subType)
      : "";
    if (hasInventoryFieldsChanged) {
      if ((tx.type === "Materials" || tx.type === "Wages" || tx.type === "Expense") && tx.quantity > 0 && tx.approvalStatus === "Approved") {
        const oldType = normalizeMaterialType(tx.materialType, tx.subType);
        const reverseDelta = (tx.type === "Materials" && oldType === "usage") ? tx.quantity : -tx.quantity;
        await applyInventoryDelta(
          adminId,
          tx.project,
          tx.category || tx.title,
          tx.unit,
          reverseDelta,
          tx.type,
          session
        );
      }
      if ((newType === "Materials" || newType === "Wages" || newType === "Expense") && newQty > 0 && projectId && tx.approvalStatus === "Approved") {
        const newDelta = (newType === "Materials" && newMaterialType === "usage") ? -newQty : newQty;
        await applyInventoryDelta(
          adminId,
          projectId,
          category || tx.category || title || tx.title,
          unit || tx.unit,
          newDelta,
          newType,
          session
        );
      }
    }
    let updatedAttachments = req.body.attachments !== undefined ? req.body.attachments : (tx.attachments || []);
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map((f) => getFileUrl(f));
      updatedAttachments = [...updatedAttachments, ...newFiles];
    }
    if (req.body.receiptImage) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.body.receiptImage, {
          folder: "buildtrack",
        });
        updatedAttachments = [uploadResult.secure_url];
      } catch (uploadErr) {
        console.error("Cloudinary receiptImage update error:", uploadErr);
      }
    }
    let newPaymentReceiptUrl = null;
    if (paymentReceipt) {
      if (typeof paymentReceipt === "string" && paymentReceipt.startsWith("data:")) {
        try {
          const uploadResult = await cloudinary.uploader.upload(paymentReceipt, {
            folder: "buildtrack/payment-receipts",
          });
          newPaymentReceiptUrl = uploadResult.secure_url;
        } catch (uploadErr) {
          console.error("Cloudinary paymentReceipt upload error:", uploadErr);
        }
      } else {
        newPaymentReceiptUrl = paymentReceipt;
      }
    }
    if (title !== undefined)
      tx.title = title.trim();
    if (type !== undefined)
      tx.type = type;
    if (worker !== undefined)
      tx.worker = workerId;
    if (project !== undefined)
      tx.project = projectId;
    if (date !== undefined)
      tx.date = date;
    if (notes !== undefined)
      tx.notes = notes;
    if (category !== undefined)
      tx.category = category;
    if (brand !== undefined)
      tx.brand = brand;
    if (supplier !== undefined)
      tx.supplier = supplier;
    if (gst !== undefined)
      tx.gst = gst;
    if (isWithGst !== undefined)
      tx.isWithGst = isWithGst;

    if (requestEsign === true) {
      if (!tx.eSignToken) {
        tx.eSignToken = require('crypto').randomBytes(20).toString("hex");
      }
      tx.eSignStatus = "Requested";
      if (clientEmail !== undefined) tx.clientEmail = clientEmail;
    } else if (requestEsign === false) {
      tx.eSignStatus = "Not Requested";
      tx.clientEmail = "";
    } else if (eSignStatus !== undefined) {
      tx.eSignStatus = eSignStatus;
    }

    if (subType !== undefined)
      tx.subType = subType;
    if (unit !== undefined)
      tx.unit = unit;
    if (quantity !== undefined)
      tx.quantity = newQty;
    if (rate !== undefined)
      tx.rate = newRt;
    if (overtime !== undefined)
      tx.overtime = newOt;
    if (eSignStatus !== undefined)
      tx.eSignStatus = eSignStatus;
    if (clientEmail !== undefined)
      tx.clientEmail = clientEmail;
    if (eSignature !== undefined)
      tx.eSignature = eSignature;
    if (
      materialType !==
      undefined ||
      subType !== undefined
    ) {
      tx.materialType =
        newMaterialType;
    }
    if (
      paymentStatus !==
      undefined
    ) {
      tx.paymentStatus =
        paymentStatus;
    }
    if (
      paymentMode !== undefined
    ) {
      tx.paymentMode =
        normalizePaymentMode(paymentMode);
    }
    if (
      paymentDate !== undefined
    ) {
      tx.paymentDate =
        paymentDate;
    }
    if (paymentHistory !== undefined && Array.isArray(paymentHistory)) {
      tx.paymentHistory = paymentHistory;
      let sumPaid = 0;
      let lastMethod = tx.paymentMode;
      let lastDate = tx.paymentDate;
      tx.paymentHistory.forEach((p, index) => {
        const amt = parseAmount(p.amount);
        sumPaid += amt;
        p.amount = amt;
        if (!p.date) p.date = new Date();
        if (p.method) p.method = normalizePaymentMode(p.method);
        if (index === tx.paymentHistory.length - 1) {
           lastMethod = p.method;
           lastDate = p.date;
        }
      });
      tx.paidAmount = sumPaid;
      if (sumPaid >= finalAmount && finalAmount > 0) {
        tx.paymentStatus = "Paid";
      } else if (sumPaid > 0) {
        tx.paymentStatus = "Partial";
      } else {
        tx.paymentStatus = "Pending";
      }
      if (tx.paymentHistory.length > 0) {
        tx.paymentMode = lastMethod;
        tx.paymentDate = lastDate;
      }
    } else if (_paidAmount !== undefined) {
      const newPaidAmount = parseAmount(_paidAmount);
      const delta = newPaidAmount - tx.paidAmount;
      if (delta > 0) {
        tx.paymentHistory.push({
          date: paymentDate || new Date(),
          method: normalizePaymentMode(paymentMode || tx.paymentMode),
          amount: delta,
          note: remarks || notes || "Additional payment",
          receipt: newPaymentReceiptUrl || undefined,
        });
      }
      tx.paidAmount = newPaidAmount;
      if (tx.paidAmount >= finalAmount && finalAmount > 0) {
        tx.paymentStatus = "Paid";
      } else if (tx.paidAmount > 0) {
        tx.paymentStatus = "Partial";
      } else {
        tx.paymentStatus = "Pending";
      }
    }
    if (newPaymentReceiptUrl) {
      tx.paymentReceipt = newPaymentReceiptUrl;
    }
    if (remarks !== undefined)  tx.remarks     = remarks;
    if (floor !== undefined)    tx.floor       = floor;
    if (floorId !== undefined)  tx.floorId     = floorId;
    if (phase !== undefined)    tx.phase       = phase;
    if (phaseId !== undefined)  tx.phaseId     = phaseId;
    if (activity !== undefined) tx.activity    = activity;
    if (activityId !== undefined) tx.activityId = activityId;
    tx.attachments = updatedAttachments;
    tx.amount = finalAmount;
    await tx.save({ session });
    await session.commitTransaction();
    res.json({ message: "Transaction updated successfully", transaction: tx });
  } catch (err) {
    await session.abortTransaction();
    console.error("Update transaction error:", err);
    let status = err.status || 500;
    if (err.name === "ValidationError") status = 400;
    else if (err.name === "VersionError") status = 409;
    res.status(status).json({ message: err.message || "Failed to update transaction" });
  } finally {
    session.endSession();
  }
});
router.delete("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findById(req.params.id).session(session);
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    if (req.user.role !== "Admin") {
      const assignedIds = Array.isArray(req.user.projectIds)
        ? req.user.projectIds.filter(Boolean).map((id) => id.toString())
        : [];
      const legacyId = req.user.projectId ? req.user.projectId.toString() : null;
      const allAssigned = legacyId && !assignedIds.includes(legacyId)
        ? [...assignedIds, legacyId]
        : assignedIds;
      if (!tx.project || !allAssigned.includes(tx.project.toString())) {
        return res.status(403).json({ message: "Access denied to this transaction" });
      }
    } else {
      if (tx.project) {
        const pDoc = await Project.findById(tx.project).session(session);
        if (pDoc && pDoc.createdBy.toString() !== req.user._id.toString()) {
          if (tx.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied to this transaction" });
          }
        }
      }
    }
    await Transaction.deleteOne({ _id: tx._id }).session(session);
    if ((tx.type === "Materials" || tx.type === "Wages" || tx.type === "Expense") && tx.quantity > 0 && tx.approvalStatus === "Approved") {
      const adminId = await getAdminId(req.user);
      const txMaterialType = normalizeMaterialType(tx.materialType, tx.subType);
      const reverseDelta = (tx.type === "Materials" && txMaterialType === "usage") ? tx.quantity : -tx.quantity;
      await applyInventoryDelta(
        adminId,
        tx.project,
        tx.category || tx.title,
        tx.unit,
        reverseDelta,
        tx.type,
        session
      );
    }
    await session.commitTransaction();
    if (Array.isArray(tx.attachments)) {
      for (const url of tx.attachments) {
        await deleteFile(url).catch(() => {});
      }
    }
    res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    await session.abortTransaction();
    console.error("Delete transaction error:", err);
    res.status(500).json({ message: "Failed to delete transaction" });
  } finally {
    session.endSession();
  }
});
router.put("/:id/approve", requirePermission(["approve_payments", "add_entries", "approve_updates"]), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findById(req.params.id).session(session);
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    if (tx.approvalStatus === "Approved") {
      return res.status(400).json({ message: "Transaction is already approved" });
    }
    tx.approvalStatus = "Approved";
    tx.approvedBy = req.user._id;
    tx.approvedAt = new Date();
    const adminId = await getAdminId(req.user);
    if ((tx.type === "Materials" || tx.type === "Wages" || tx.type === "Expense") && tx.quantity > 0 && tx.project) {
      const materialType = normalizeMaterialType(tx.materialType, tx.subType);
      const inventoryDelta = (tx.type === "Materials" && materialType === "usage") ? -tx.quantity : tx.quantity;
      await applyInventoryDelta(
        adminId,
        tx.project,
        tx.category || tx.title,
        tx.unit,
        inventoryDelta,
        tx.type,
        session
      );
    }
    await tx.save({ session });
    await session.commitTransaction();
    const NotificationService = require("../services/NotificationService");
    await NotificationService.send(tx.createdBy, {
      title: "Entry Approved",
      message: `Your ${tx.type} entry "${tx.title}" has been approved.`,
      type: "approval",
      relatedId: tx._id,
      relatedModel: "Transaction"
    });
    res.json({ message: "Transaction approved successfully", transaction: tx });
  } catch (err) {
    await session.abortTransaction();
    console.error("Approve transaction error:", err);
    res.status(500).json({ message: "Failed to approve transaction" });
  } finally {
    session.endSession();
  }
});
router.put("/:id/reject", requirePermission(["approve_payments", "add_entries", "approve_updates"]), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    if (tx.approvalStatus === "Approved") {
      return res.status(400).json({ message: "Cannot reject an already approved transaction" });
    }
    tx.approvalStatus = "Rejected";
    tx.approvedBy = req.user._id;
    tx.approvedAt = new Date();
    tx.rejectionReason = rejectionReason || "";
    await tx.save();
    const NotificationService = require("../services/NotificationService");
    await NotificationService.send(tx.createdBy, {
      title: "Entry Rejected",
      message: `Your ${tx.type} entry "${tx.title}" was rejected. Reason: ${rejectionReason || "None"}`,
      type: "approval",
      relatedId: tx._id,
      relatedModel: "Transaction"
    });
    res.json({ message: "Transaction rejected", transaction: tx });
  } catch (err) {
    console.error("Reject transaction error:", err);
    res.status(500).json({ message: "Failed to reject transaction" });
  }
});
async function updateProjectPhaseBudget(projectId, phaseId, activityId, type, amount, session) {
  if (!projectId || !phaseId || !activityId || !amount) return;
  const incPayload = {
    "selectedPhases.$[phase].activities.$[activity].totalAmount": amount
  };
  if (type === "Materials") {
    incPayload["selectedPhases.$[phase].activities.$[activity].materialAmount"] = amount;
  } else if (type === "Wages") {
    incPayload["selectedPhases.$[phase].activities.$[activity].labourAmount"] = amount;
  } else if (type === "Expense") {
    incPayload["selectedPhases.$[phase].activities.$[activity].equipmentAmount"] = amount;
  }
  await Project.updateOne(
    { _id: projectId },
    { $inc: incPayload },
    {
      arrayFilters: [
        { "phase.id": phaseId },
        { "activity.id": activityId }
      ],
      session
    }
  );
}
router.post("/bulk", requirePermission(["manage_expenses", "add_entries"]), async (req, res) => {
  const { transactions } = req.body;
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ message: "No transactions provided for bulk upload" });
  }
  const results = {
    total: transactions.length,
    successCount: 0,
    failedCount: 0,
    failures: []
  };
  const adminId = await getAdminId(req.user);
  const txApprovalStatus = req.user.role === "Admin" ? "Approved" : "Pending";
  const approvedBy = req.user.role === "Admin" ? req.user._id : null;
  const approvedAt = req.user.role === "Admin" ? new Date() : null;
  for (let i = 0; i < transactions.length; i++) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const payload = transactions[i];
      const {
        title, type, worker, project, date, notes,
        category, brand, subType, unit, quantity, rate,
        materialType, paymentStatus, paymentMode, paymentDate, paidAmount: _paidAmount,
        remarks, amount: rawAmount, floor, floorId, phase, phaseId, activity, activityId,
        supplier, gst, isWithGst, overtime, eSignStatus, clientEmail
      } = payload;
      if (!title || !title.trim()) throw new Error("Title is required");
      if (!type) throw new Error("Transaction type is required");
      const resolvedCategory = category !== undefined ? category : "";
      const normalizedMaterialType = type === "Materials" ? normalizeMaterialType(materialType, subType) : "";
      let workerId = parseId(worker);
      let projectId = parseId(project);
      if (workerId) {
        const wDoc = await Worker.findOne({ _id: workerId, createdBy: adminId }).lean();
        if (!wDoc) workerId = null;
      } else if (worker) {
        const wDoc = await Worker.findOne({ createdBy: adminId, name: String(worker).trim() }).lean();
        workerId = wDoc?._id || null;
      }
      if (projectId) {
        const pDoc = await Project.findOne(canAccessProjectFilter(req, projectId));
        if (!pDoc) throw new Error(`Access denied or Project not found for project: ${project}`);
      } else if (project) {
        const pDoc = await Project.findOne({ createdBy: adminId, projectName: String(project).trim() }).lean();
        if (pDoc) {
          projectId = pDoc._id;
        } else {
          throw new Error(`Project not found: ${project}`);
        }
      } else {
        throw new Error("Valid Project ID or name is required");
      }
      const qty      = Number(quantity)  || 0;
      const rt       = Number(rate)      || 0;
      const ot       = Number(overtime)  || 0;
      const paidAmt  = parseAmount(_paidAmount);
      const gstVal   = Number(gst)       || 0;
      if (qty < 0 || rt < 0) throw new Error("Quantity and rate must be positive");
      const finalAmount = calculateAmount({ type, quantity: qty, rate: rt, overtime: ot, rawAmount });
      const amountErr = validateTransactionAmounts({
        amount:     finalAmount,
        quantity:   qty,
        rate:       rt,
        paidAmount: paidAmt,
        gst:        gstVal,
        overtime:   ot,
      });
      if (amountErr) throw new Error(`Invalid transaction data: ${amountErr}`);
      const transaction = new Transaction({
        createdBy: req.user._id,
        title: title.trim(),
        type, worker: workerId || null, project: projectId,
        date: date || new Date(), notes, category: resolvedCategory, brand, supplier,
        gst, isWithGst, subType, materialType: normalizedMaterialType,
        unit: normalizeUnit(unit), quantity: qty, rate: rt, overtime: ot, amount: finalAmount,
        floor, floorId, phase, phaseId, activity, activityId,
        paymentStatus: paymentStatus || "Pending", paymentMode: normalizePaymentMode(paymentMode),
        paymentDate, paidAmount: paidAmt, remarks,
        paymentHistory: paidAmt > 0 ? [{
          date: paymentDate || date || new Date(),
          method: normalizePaymentMode(paymentMode), amount: paidAmt, note: notes || "Initial payment on bulk creation"
        }] : [],
        approvalStatus: txApprovalStatus, approvedBy, approvedAt
      });
      await transaction.save({ session });
      if ((type === "Materials" || type === "Wages" || type === "Expense") && qty > 0 && projectId && txApprovalStatus === "Approved") {
        const inventoryDelta = (type === "Materials" && normalizedMaterialType === "usage") ? -qty : qty;
        await applyInventoryDelta(adminId, projectId, resolvedCategory || title, unit, inventoryDelta, type, session);
      }
      if (projectId && phaseId && activityId && txApprovalStatus === "Approved") {
        await updateProjectPhaseBudget(projectId, phaseId, activityId, type, finalAmount, session);
      }
      await session.commitTransaction();
      results.successCount++;
    } catch (err) {
      await session.abortTransaction();
      results.failedCount++;
      results.failures.push({
        index: i,
        title: transactions[i].title || 'Unknown',
        reason: err.message || "Failed to save transaction"
      });
    } finally {
      session.endSession();
    }
  }

  // Update onboarding if they used bulk CSV successfully
  if (results.successes.length > 0) {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { "onboarding.hasUsedBulkCSV": true }
    });
  }

  res.status(207).json({
    message: "Bulk processing completed",
    results
  });
});
router.post("/:id/request-esign", async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { clientEmail } = req.body;
    if (!clientEmail) {
      return res.status(400).json({ message: "Client email is required" });
    }
    const transaction = await Transaction.findOne({ _id: transactionId });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    if (transaction.paymentMode !== "Cash") {
      return res.status(400).json({ message: "E-Signature is only available for Cash transactions." });
    }
    const token = crypto.randomBytes(32).toString("hex");
    transaction.clientEmail = clientEmail;
    transaction.eSignToken = token;
    transaction.eSignStatus = "Requested";
    transaction.eSignExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await transaction.save();
    const signUrl = `${req.protocol}://${req.get('host')}/api/esign/sign/${token}`;    if (process.env.AWS_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL) {
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
            <h2 style="color: #333;">Signature Required</h2>
            <p style="color: #555; line-height: 1.5;">
              Please review and sign the cash receipt for your transaction on BuildTrack.
            </p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${signUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review & Sign Receipt</a>
            </div>
            <p style="color: #888; font-size: 13px;">
              This link expires in 7 days.
            </p>
          </div>
        `;
        const command = new SendEmailCommand({
          Destination: { ToAddresses: [clientEmail] },
          Message: {
            Body: { Html: { Data: htmlContent, Charset: "UTF-8" } },
            Subject: { Data: "Signature Required: BuildTrack Cash Receipt", Charset: "UTF-8" }
          },
          Source: process.env.SES_FROM_EMAIL
        });
        await sesClient.send(command);
      } catch (err) {
        console.error("SES send error:", err);
        return res.status(500).json({ message: "Failed to send signature request email via SES" });
      }
    } else {
      return res.status(500).json({ message: "Server email configuration is missing" });
    }    console.log(`[DEV] E-SIGN LINK: ${signUrl}`);
    res.json({ message: "Signature request sent successfully", transaction });
  } catch (error) {
    console.error("POST /:id/request-esign error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
