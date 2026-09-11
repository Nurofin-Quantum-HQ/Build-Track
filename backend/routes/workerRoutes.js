const express     = require("express");
const router      = express.Router();
const Worker      = require("../models/Worker");
const { protect, requirePermission, getAdminId } = require("../middleware/auth");
const upload      = require("../config/multer");
const { getFileUrl, deleteFile } = require("../config/fileHelpers");
router.use(protect);
router.use((req, res, next) => {
  if (req.user && (req.user.role === "Admin" || req.user.role === "Supervisor")) {
    return next();
  }
  return requirePermission([
    "manage_labour_master",
    "manage_team",
    "view_team",
    "add_entries",
    "view_projects"
  ])(req, res, next);
});
router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query;
    const adminId = await getAdminId(req.user);
    const query = { createdBy: adminId };
    if (status && status !== "All") query.status = status;
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: "i" } },
        { trade: { $regex: search, $options: "i" } },
      ];
    }
    const workers = await Worker.find(query).sort({ createdAt: -1 });
    res.json({ workers });
  } catch (err) {
    console.error("Get workers error:", err);
    res.status(500).json({ message: "Failed to fetch workers" });
  }
});
router.get("/stats/summary", async (req, res) => {
  try {
    const adminId = await getAdminId(req.user);
    const [total, active, inactive] = await Promise.all([
      Worker.countDocuments({ createdBy: adminId }),
      Worker.countDocuments({ createdBy: adminId, status: "Active" }),
      Worker.countDocuments({ createdBy: adminId, status: "Inactive" }),
    ]);
    res.json({ total, active, inactive });
  } catch {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});
router.get("/supervisors", async (req, res) => {
  try {
    const adminId = await getAdminId(req.user);
    const supervisors = await Worker.find({
      createdBy: adminId,
      trade:     "Supervisor",
    })
      .select("name trade status")
      .sort({ name: 1 });
    res.json({ supervisors });
  } catch (err) {
    console.error("Get supervisors error:", err);
    res.status(500).json({ message: "Failed to fetch supervisors" });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const adminId = await getAdminId(req.user);
    const worker = await Worker.findOne({ _id: req.params.id, createdBy: adminId });
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    res.json({ worker });
  } catch {
    res.status(500).json({ message: "Failed to fetch worker" });
  }
});
const createHandler = async (req, res) => {
  try {
    const { name, trade, mobile, joiningDate, status, dailyWage, paymentCycle } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ message: "Worker name is required" });
    if (!dailyWage && dailyWage !== "0")
      return res.status(400).json({ message: "Daily wage is required" });
    const photoFile = req.files?.find(f => f.fieldname === "photo") || null;
    const photo = getFileUrl(photoFile);
    const documents = (req.files || []).filter(f => f.fieldname === "documents").map(f => getFileUrl(f));
    const adminId = await getAdminId(req.user);
    const worker = await Worker.create({
      createdBy:   adminId,
      name:        name.trim(),
      trade:       trade || "General Labor",
      mobile:      mobile || "",
      joiningDate: joiningDate || null,
      status:      status || "Active",
      dailyWage:   Number(dailyWage) || 0,
      paymentCycle: paymentCycle || "Weekly",
      photo: photo,
      documents,
    });
    res.status(201).json({ message: "Worker added successfully", worker });
  } catch (err) {
    console.error("Create worker error:", err);
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: "Failed to create worker" });
  }
};
router.post("/", upload.any(), createHandler);
router.post("/add", upload.any(), createHandler);
router.put(
  "/:id",
  upload.any(),
  async (req, res) => {
    try {
      const { name, trade, mobile, joiningDate, status, dailyWage, paymentCycle } = req.body;
      const updateData = {
        name:        name?.trim(),
        trade,
        mobile,
        joiningDate,
        status,
        dailyWage:   Number(dailyWage),
        paymentCycle,
      };
      const photoFile = req.files?.find(f => f.fieldname === "photo") || null;
      const newDocuments = (req.files || []).filter(f => f.fieldname === "documents").map(f => getFileUrl(f));
      const adminId = await getAdminId(req.user);
      if (photoFile) {
        const existing = await Worker.findOne({ _id: req.params.id, createdBy: adminId });
        if (existing?.photo) await deleteFile(existing.photo);
        updateData.photo = getFileUrl(photoFile);
      }
      if (newDocuments.length > 0) {
        updateData.documents = newDocuments;
      }
      const worker = await Worker.findOneAndUpdate(
        { _id: req.params.id, createdBy: adminId },
        updateData,
        { new: true, runValidators: true }
      );
      if (!worker) return res.status(404).json({ message: "Worker not found" });
      res.json({ message: "Worker updated", worker });
    } catch (err) {
      console.error("Update worker error:", err);
      if (err.name === "ValidationError") {
        const msg = Object.values(err.errors).map((e) => e.message).join(", ");
        return res.status(400).json({ message: msg });
      }
      res.status(500).json({ message: "Failed to update worker" });
    }
  }
);
router.delete("/:id", async (req, res) => {
  try {
    const adminId = await getAdminId(req.user);
    const worker = await Worker.findOneAndDelete({ _id: req.params.id, createdBy: adminId });
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    if (worker.photo) await deleteFile(worker.photo);
    if (Array.isArray(worker.documents) && worker.documents.length > 0) {
      for (const doc of worker.documents) {
        await deleteFile(doc);
      }
    }
    res.json({ message: "Worker deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete worker" });
  }
});
module.exports = router;
