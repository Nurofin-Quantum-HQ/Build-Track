const cloudinary = require("./cloudinary");

function getFileUrl(file) {
  if (!file) return null;
  return file.path || null;
}

async function deleteFile(storedValue) {
  if (!storedValue || typeof storedValue !== "string" || !storedValue.startsWith("http")) return;
  try {
    const parts = storedValue.split("/upload/");
    if (parts[1]) {
      const isRaw = storedValue.includes("/raw/upload/");
      if (isRaw) {
        // Raw resource publicId includes file extension
        const rawPublicId = parts[1].replace(/^v\d+\//, "");
        await cloudinary.uploader.destroy(rawPublicId, { resource_type: "raw" });
      } else {
        const publicId = parts[1]
          .replace(/^v\d+\//, "")
          .replace(/\.[^.]+$/, "");
        await cloudinary.uploader.destroy(publicId);
      }
    }
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
  }
}

module.exports = { getFileUrl, deleteFile };
