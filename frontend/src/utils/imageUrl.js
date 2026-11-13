const API_ORIGIN = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export function resolveImageUrl(photo) {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://") || photo.startsWith("data:")) return photo;
  return `${API_ORIGIN}/uploads/${photo}`;
}
