const mongoose = require("mongoose");

const csvBackupSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  timestamp: { type: Date, default: Date.now },
  updatedTransactions: { type: Array, required: true },
  createdIds: { type: Array, default: [] },
});

module.exports = mongoose.model("CsvBackup", csvBackupSchema);
