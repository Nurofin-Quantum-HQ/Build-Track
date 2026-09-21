import os

path = r"c:\Users\Muneesha\Desktop\build-track\Build-Track\backend\routes\transactionRoutes.js"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

import re

# Find the block where paymentHistory is set in /bulk route
# It looks like: paymentHistory: paidAmt > 0 ? [{ ... }] : [],

new_code = """          paymentHistory: payload.paymentHistory && payload.paymentHistory.length > 0 ? payload.paymentHistory : (paidAmt > 0 ? [{
            date: paymentDate || date || new Date(),
            method: normalizePaymentMode(paymentMode), amount: paidAmt, note: notes || "Initial payment on bulk creation"
          }] : []),"""

text = re.sub(r'paymentHistory:\s*paidAmt\s*>\s*0\s*\?\s*\[\{[^\}]+\}\]\s*:\s*\[\],', new_code, text)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
print("Done")
