const mongoose = require("mongoose");
const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, trim: true },
    projectCode: {
      type: String,
      required: true,
      unique: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    contractorName: {
      type: String,
      trim: true,
    },
    siteEngineer: {
      type: String,
      trim: true,
    },
    siteEngineerName: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    mapAddress: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      required: true,
    },
    manager: {
      type: String,
      trim: true,
    },
    scope: {
      type: String,
      trim: true,
    },
    progress: {
      type: Number,
      default: 0,
    },
    photo: {
      type: String,
    },
    buildingType: {
      mainType: {
        type: String,
        enum: [
          "Residential",
          "Educational",
          "Institutional",
          "Commercial",
          "Industrial",
          "Business / Commercial",
        ],
        required: false,
      },
      subType: {
        type: String,
        required: false,
      },
    },
    floors: {
      type: [String],
      default: [],
    },
    landArea: {
      type: String,
      trim: true,
    },
    landUnit: {
      type: String,
      default: "Sq ft",
    },
    room1BHK: { type: Number, default: null },
    room2BHK: { type: Number, default: null },
    room3BHK: { type: Number, default: null },
    roomCustom: { type: Number, default: null },
    bathWestern: { type: Number, default: null },
    bathIndian: { type: Number, default: null },
    bathCommon: { type: Number, default: null },
    bathAttached: { type: Number, default: null },
    selectedFeatures: {
      type: [String],
      default: [],
    },
    startDate: {
      type: Date,
    },
    dates: {
      startDate: { type: Date },
      expectedEndDate: { type: Date },
      actualEndDate: { type: Date },
    },
    expectedEndDate: {
      type: Date,
    },
    budget: {
      total: { type: Number, default: 0 },
      material: { type: Number, default: 0 },
      labour: { type: Number, default: 0 },
      equipment: { type: Number, default: 0 },
      misc: { type: Number, default: 0 },
    },
    budgetMaterial: { type: Number, default: 0 },
    budgetLabour: { type: Number, default: 0 },
    budgetEquipment: { type: Number, default: 0 },
    budgetMisc: { type: Number, default: 0 },
    totalBudget: { type: Number, default: 0 },
    builtUpArea: { type: Number, default: 0 },
    builtUpAreaUnit: { type: String, enum: ["sqft", "sqm"], default: "sqft" },
    targetCostPerSqft: { type: Number, default: 1500 },
    currentCostPerSqft: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Active", "Completed", "On Hold", "Review Needed"],
      default: "Active",
    },
    projectStatus: {
      type: String,
      trim: true,
    },
    documents: [{ type: String }],
    selectedPhaseNames: [{ type: String }],
    trackedActivityKeys: [{ type: String }],
    completedActivityKeys: [{ type: String }],
    selectedPhases: [
      {
        id: { type: String, required: true },
        phaseName: { type: String, required: true },
        isCustom: { type: Boolean, default: false },
        activities: [
          {
            id: { type: String, required: true },
            name: { type: String, required: true },
            isCustom: { type: Boolean, default: false },
            completed: { type: Boolean, default: false },
            completedAt: { type: Date },
            notes: { type: String },
            photo: { type: String },
            photos: [{ type: String }],
            budgetMaterial: { type: Number, default: 0 },
            budgetLabour: { type: Number, default: 0 },
            budgetEquipment: { type: Number, default: 0 },
            qty: { type: Number, default: 0 },
            unit: { type: String },
            materialRate: { type: Number, default: 0 },
            materialAmount: { type: Number, default: 0 },
            labourRate: { type: Number, default: 0 },
            labourAmount: { type: Number, default: 0 },
            equipmentRate: { type: Number, default: 0 },
            equipmentAmount: { type: Number, default: 0 },
            totalAmount: { type: Number, default: 0 },
          },
        ],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);
projectSchema.index({ createdBy: 1 });
module.exports = mongoose.model("Project", projectSchema);
