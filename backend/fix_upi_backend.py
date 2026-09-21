import os

path = r"c:\Users\Muneesha\Desktop\build-track\Build-Track\backend\routes\transactionRoutes.js"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Change normalizePaymentMode default from Cash to UPI
old_normalize = """const normalizePaymentMode = (raw) => {
  if (!raw) return "Cash";
  const key = String(raw).toLowerCase().trim();
  if (PAYMENT_MODE_MAP[key]) return PAYMENT_MODE_MAP[key];
  if (VALID_PAYMENT_MODES.includes(raw)) return raw;
  return "Cash";
};"""

new_normalize = """const normalizePaymentMode = (raw) => {
  if (!raw) return "UPI";
  const key = String(raw).toLowerCase().trim();
  if (PAYMENT_MODE_MAP[key]) return PAYMENT_MODE_MAP[key];
  if (VALID_PAYMENT_MODES.includes(raw)) return raw;
  return "UPI";
};"""

text = text.replace(old_normalize, new_normalize)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
print("Done")
