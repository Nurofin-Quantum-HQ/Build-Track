const multer = require("multer");
const path   = require("path");
const cloudinary = require("./cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const ext = path.extname(file.originalname || "").toLowerCase().replace(".", "");
    const isImage = /^(jpe?g|png|webp|gif)$/i.test(ext);
    if (!isImage) {
      // PDF documents, blueprints, spreadsheets, docx
      const rawBaseName = path.parse(file.originalname || "document").name.replace(/[^a-zA-Z0-9_-]/g, "_");
      return {
        folder: "buildtrack/documents",
        resource_type: "raw",
        public_id: `${Date.now()}-${rawBaseName}.${ext || "bin"}`,
      };
    }
    return {
      folder: "buildtrack",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    };
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedExt = /\.(jpe?g|png|webp|gif|pdf|docx?|xlsx?|csv|txt|rtf|dwg|dxf)$/i;
  const extOk = allowedExt.test(path.extname(file.originalname || ""));
  if (extOk) return cb(null, true);
  cb(new Error("Allowed formats: images (JPG, PNG, WEBP, GIF), documents/blueprints (PDF, DOC, DOCX, DWG, DXF, TXT), or spreadsheets (XLS, XLSX, CSV)"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
});

module.exports = upload;
