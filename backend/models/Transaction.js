const mongoose = require("mongoose");
const toObjectIdOrNull = function (value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "object" && value?._id) {
    value = value._id;
  }
  return mongoose.Types.ObjectId.isValid(value)
    ? value
    : null;
};
const transactionSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    brand: {
      type: String,
      trim: true,
    },
    supplier: {
      type: String,
      trim: true,
    },
    gst: {
      type: Number,
      default: 0,
    },
    isWithGst: {
      type: Boolean,
      default: false,
    },
    subType: {
      type: String,
      enum: [
        "Purchase",
        "Consumption",
        "cement",
        "brick",
        "stone",
        "sand",
        "steel",
        "paint",
        "electrical",
        "plumbing",
        "",
      ],
      default: "",
    },
    materialType: {
      type: String,
      enum: [
        "purchase",
        "usage",
        "",
      ],
      default: "",
    },
    unit: {
      type: String,
      enum: [
        "kg",
        "bag",
        "sqft",
        "sqm",
        "day",
        "hour",
        "unit",
        "ton",
        "MT",
        "truck",
        "ltr",
        "rft",
        "",
      ],
      default: "unit",
    },
    quantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    rate: {
      type: Number,
      min: 0,
      default: 0,
    },
    overtime: {
      type: Number,
      min: 0,
      default: 0,
    },
    sqftArea: {
      type: Number,
      default: 0,
      min: 0,
      max: 999999999,
    },
    floor: {
      type: String,
      trim: true,
    },
    floorId: {
      type: String,
      trim: true,
    },
    phase: {
      type: String,
      trim: true,
    },
    phaseId: {
      type: String,
      trim: true,
    },
    activity: {
      type: String,
      trim: true,
    },
    activityId: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
      max: [999999999, "Amount exceeds maximum allowed value"],
    },
    type: {
      type: String,
      enum: [
        "Wages",
        "Expense",
        "Income",
        "Materials",
        "Equipment",
      ],
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      default: null,
      set: toObjectIdOrNull,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      set: toObjectIdOrNull,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentStatus: {
      type: String,
      enum: [
        "Paid",
        "Partial",
        "Pending",
        "",
      ],
      default: "Pending",
    },
    paymentMode: {
      type: String,
      enum: [
        "Cash",
        "Bank",
        "Bank Transfer",
        "UPI",
        "Cheque",
        "Card",
        "",
      ],
      default: "Cash",
    },
    paymentDate: Date,
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
      max: 999999999,
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
      max: 999999999,
    },
    approvalStatus: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Rejected",
      ],
      default: "Pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    receipts: [
      {
        fileUrl: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    attachments: {
      type: [String],
      default: [],
    },
    screenshotUrl: {
      type: String,
      default: null,
    },
    paymentReceipt: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    paymentHistory: {
      type: [
        {
          date: { type: Date, default: Date.now },
          method: String,
          amount: { type: Number, min: 0, max: 999999999 },
          note: String,
          receipt: String,
        }
      ],
      default: [],
    },
    clientEmail: {
      type: String,
      trim: true,
      default: null,
    },
    eSignStatus: {
      type: String,
      enum: ["Not Requested", "Requested", "Signed"],
      default: "Not Requested",
    },
    eSignToken: {
      type: String,
      default: null,
    },
    eSignExpires: {
      type: Date,
      default: null,
    },
    eSignature: {
      type: String,
      default: null,
    },
    eSignDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, optimisticConcurrency: true }
);
transactionSchema.pre("save", function () {
  if (
    ["Materials", "Equipment"].includes(this.type) &&
    this.quantity &&
    this.rate
  ) {
    this.amount = this.quantity * this.rate;
  }
  // Allow a small epsilon for floating point inaccuracies
  if (Math.abs(this.paidAmount || 0) - Math.abs(this.amount || 0) > 0.01) {
    throw Object.assign(
      new Error("Paid amount cannot exceed total amount"),
      { status: 400 }
    );
  }
  if (this.paymentStatus === "Paid") {
    this.paidAmount = this.amount;
    this.remainingAmount = 0;
  } else if (this.paymentStatus === "Pending") {
    this.paidAmount = 0;
    this.remainingAmount = this.amount;
  } else if (this.paymentStatus === "Partial") {
    this.remainingAmount = this.amount - (this.paidAmount || 0);
  }
  if (Math.abs(this.paidAmount || 0) > 0 && (!this.paymentHistory || this.paymentHistory.length === 0)) {
    this.paymentHistory = [{
      date: this.paymentDate || this.date || new Date(),
      method: this.paymentMode || "Cash",
      amount: this.paidAmount,
      note: this.notes || "Initial payment on creation",
    }];
  }
});
transactionSchema.index({ createdBy: 1 });
transactionSchema.index({ approvalStatus: 1, createdBy: 1 });
transactionSchema.index({ project: 1, createdBy: 1 });
transactionSchema.index({ project: 1, date: -1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ project: 1, type: 1 });
transactionSchema.index({ project: 1, activityId: 1, approvalStatus: 1, type: 1 });
module.exports = mongoose.model("Transaction", transactionSchema);
