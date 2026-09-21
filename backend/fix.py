import os

path = r"c:\Users\Muneesha\Desktop\build-track\Build-Track\backend\routes\transactionRoutes.js"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("if (results.successes.length > 0) {", "if (results.successCount > 0) {")

backup_routes = """
// --- Added backup routes ---
router.post("/backup-csv", requirePermission(["manage_expenses", "add_entries"]), async (req, res) => {
  try {
    const transactions = await Transaction.find({ createdBy: req.user._id }).lean();
    const fs = require('fs');
    const path = require('path');
    const backupPath = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath);
    }
    const userBackupFile = path.join(backupPath, `backup_${req.user._id}.json`);
    fs.writeFileSync(userBackupFile, JSON.stringify(transactions));
    res.json({ message: "Backup successful" });
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({ message: "Backup failed" });
  }
});

router.post("/revert-csv", requirePermission(["manage_expenses", "add_entries"]), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const userBackupFile = path.join(__dirname, '..', 'backups', `backup_${req.user._id}.json`);
    if (!fs.existsSync(userBackupFile)) {
      return res.status(404).json({ message: "No backup found to revert" });
    }
    const backupData = JSON.parse(fs.readFileSync(userBackupFile, 'utf8'));
    
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Transaction.deleteMany({ createdBy: req.user._id }).session(session);
      if (backupData.length > 0) {
        await Transaction.insertMany(backupData, { session });
      }
      await session.commitTransaction();
      res.json({ message: "Revert successful" });
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Revert error:", error);
    res.status(500).json({ message: "Revert failed" });
  }
});
// -----------------------------

module.exports = router;
"""

text = text.replace("module.exports = router;", backup_routes)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
print("Done")
