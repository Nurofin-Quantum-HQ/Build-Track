import { useState, useCallback, useEffect } from "react";
import {
  CheckCircle,
  Upload,
  Smartphone,
  Banknote,
  Building2,
  CreditCard,
  FileText,
  X,
} from "lucide-react";
import { BtButton, BtField, BtTextarea, BtIconButton } from "./ui";

const PAYMENT_METHODS = [
  { value: "UPI", icon: Smartphone },
  { value: "Cash", icon: Banknote },
  { value: "Bank Transfer", icon: Building2 },
  { value: "Card", icon: CreditCard },
  { value: "Cheque", icon: FileText },
];

const STATUS_OPTIONS = [
  { key: "paid", label: "Fully paid", fg: "var(--status-success)", bg: "var(--status-success-soft)" },
  { key: "partial", label: "Partial", fg: "var(--status-warning)", bg: "var(--status-warning-soft)" },
  { key: "pending", label: "Not paid", fg: "var(--status-danger)", bg: "var(--status-danger-soft)" },
];

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function parseAmount(val) {
  if (!val || val.trim() === "") return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function Label({ children }) {
  return (
    <div className="bt-eyebrow" style={{ color: "var(--ink-3)", marginBottom: 8 }}>
      {children}
    </div>
  );
}

export default function PayNowSheet({
  open,
  entryTitle = "",
  typeLabel = "",
  vendorName = "",
  totalAmount = 0,
  alreadyPaid = 0,
  onClose,
  onConfirm,
  submitting = false,
}) {
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [selectedMethod, setSelectedMethod] = useState("UPI");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [receiptFile, setReceiptFile] = useState(null);
  const [amountError, setAmountError] = useState(null);
  const [requestEsign, setRequestEsign] = useState(false);
  const [clientEmail, setClientEmail] = useState("");

  const outstanding = Math.max(0, totalAmount - alreadyPaid);

  // Capture-only sheet: on open, initialize from the entry amounts (Flutter parity)
  useEffect(() => {
    if (!open) return;
    const initStatus =
      outstanding > 0 ? (alreadyPaid > 0 ? "partial" : "pending") : "paid";
    setSelectedStatus(initStatus);
    setSelectedMethod("UPI");
    if (initStatus === "paid") {
      setAmount(outstanding > 0 ? outstanding.toString() : totalAmount.toString());
    } else if (initStatus === "pending") {
      setAmount("0");
    } else {
      setAmount("");
    }
    setNotes("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setReceiptFile(null);
    setAmountError(null);
    setRequestEsign(false);
    setClientEmail("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const computeHelperText = useCallback(() => {
    if (selectedStatus === "paid") {
      return `Full settlement — ${formatINR(outstanding > 0 ? outstanding : totalAmount)}`;
    }
    if (selectedStatus === "pending") return "No payment recorded";
    const entered = parseAmount(amount) ?? 0;
    const rem = Math.max(0, outstanding - entered);
    return rem > 0
      ? `Remaining: ${formatINR(rem)}`
      : "Full settlement via partial recording";
  }, [selectedStatus, amount, outstanding, totalAmount]);

  const handleAmountChange = (val) => {
    if (val.length > 1 && val.startsWith("0") && !val.startsWith("0.")) {
      const stripped = val.replace(/^0+/, "");
      if (stripped && stripped !== ".") val = stripped;
    }
    setAmount(val);
    setAmountError(null);

    const amt = parseAmount(val);
    if (amt == null || amt === 0) {
      setSelectedStatus("pending");
    } else if (outstanding > 0 && amt >= outstanding) {
      setSelectedStatus("paid");
    } else if (outstanding === 0 && amt >= totalAmount) {
      setSelectedStatus("paid");
    } else {
      setSelectedStatus("partial");
    }
  };

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
    setAmountError(null);
    if (status === "paid") {
      setAmount(outstanding > 0 ? outstanding.toString() : totalAmount.toString());
    } else if (status === "pending") {
      setAmount("0");
    } else if (status === "partial") {
      const currentAmt =
        outstanding > 0 ? outstanding.toString() : totalAmount.toString();
      if (amount === "0" || amount === currentAmt) {
        setAmount("");
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
  };

  const handleConfirm = () => {
    if (selectedStatus !== "pending") {
      const raw = amount.trim();
      const amt = parseAmount(raw);
      if (raw === "" || amt === null || amt <= 0) {
        setAmountError("Enter a valid amount paid");
        return;
      }
      if (outstanding > 0 && amt > outstanding) {
        setAmountError("Payment amount cannot exceed the outstanding amount.");
        return;
      }
      if (outstanding <= 0) {
        setAmountError("No outstanding amount to pay");
        return;
      }
    }

    const amt =
      selectedStatus === "paid"
        ? outstanding > 0
          ? outstanding
          : totalAmount
        : selectedStatus === "pending"
        ? 0.0
        : parseAmount(amount.trim()) ?? 0.0;

    let apiPaymentMode = selectedMethod;
    if (apiPaymentMode === "Bank Transfer") {
      apiPaymentMode = "Bank Transfer";
    }

    const statusStr =
      selectedStatus === "paid"
        ? "Paid"
        : selectedStatus === "partial"
        ? "Partial"
        : "Pending";

    onConfirm?.({
      amount: amt,
      method: selectedMethod,
      apiMode: apiPaymentMode,
      note: notes.trim(),
      requestEsign,
      clientEmail: clientEmail.trim(),
      paymentDate: paymentDate && !isNaN(new Date(paymentDate).getTime()) ? new Date(paymentDate).toISOString() : new Date().toISOString(),
      status: statusStr,
      receiptFile: receiptFile || null,
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const displayError = amountError;
  const helperText = displayError || computeHelperText();
  const isError = !!displayError;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--scrim)",
        zIndex: 1100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Fulfillment and payment"
        style={{
          background: "var(--ground)",
          borderRadius: "var(--r-sheet) var(--r-sheet) 0 0",
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-raised)",
          overflow: "hidden",
          animation: "slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 0 2px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 44, height: 5, borderRadius: 99, background: "var(--input-border)" }} />
        </div>

        <div style={{ padding: "8px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0, flex: 1, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Fulfillment &amp; payment
          </h2>
          <BtIconButton icon={X} label="Close payment sheet" onClick={onClose} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 16px" }}>
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "var(--r-card)",
              background: "var(--noir)",
              color: "var(--on-noir)",
              marginBottom: 22,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bt-eyebrow" style={{ color: "var(--on-noir-3)", marginBottom: 6 }}>Entry</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflowWrap: "anywhere",
                }}
              >
                {entryTitle || "Entry"}
              </div>
              {(typeLabel || vendorName) && (
                <div style={{ fontSize: 13, color: "var(--on-noir-2)", marginTop: 6 }}>
                  {[typeLabel, vendorName].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="bt-eyebrow" style={{ color: "var(--on-noir-3)", marginBottom: 6 }}>Outstanding</div>
              <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
                {formatINR(outstanding > 0 ? outstanding : totalAmount)}
              </div>
              {alreadyPaid > 0 && (
                <div className="tnum" style={{ fontSize: 13, color: "var(--on-noir-2)", marginTop: 4 }}>
                  {formatINR(alreadyPaid)} paid
                </div>
              )}
            </div>
          </div>

          <Label>Payment status</Label>
          <div role="radiogroup" aria-label="Payment status" style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            {STATUS_OPTIONS.map((opt) => {
              const sel = selectedStatus === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => handleStatusSelect(opt.key)}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: "var(--r-input)",
                    border: `1.5px solid ${sel ? opt.fg : "var(--input-border)"}`,
                    background: sel ? opt.bg : "var(--card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    cursor: "pointer",
                    transition: "all 160ms ease",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.fg, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: sel ? opt.fg : "var(--ink)" }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <Label>Payment method</Label>
          <div role="radiogroup" aria-label="Payment method" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
            {PAYMENT_METHODS.map((m, idx) => {
              const Icon = m.icon;
              const sel = selectedMethod === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setSelectedMethod(m.value)}
                  style={{
                    flex: idx === 4 ? "1 1 100%" : "1 1 calc(50% - 4px)",
                    height: 48,
                    borderRadius: "var(--r-input)",
                    border: `1.5px solid ${sel ? "var(--ink)" : "var(--input-border)"}`,
                    background: sel ? "var(--ink)" : "var(--card)",
                    color: sel ? "#FFFFFF" : "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    cursor: "pointer",
                    transition: "all 160ms ease",
                    fontFamily: "var(--font-ui)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <Icon size={17} />
                  {m.value}
                </button>
              );
            })}
          </div>

          {selectedMethod === "Cash" && (
            <div style={{ marginBottom: 22, padding: 16, borderRadius: "var(--r-input)", border: "1px solid var(--line)", background: "var(--card)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minHeight: 28, marginBottom: requestEsign ? 14 : 0 }}>
                <input
                  type="checkbox"
                  checked={requestEsign}
                  onChange={(e) => setRequestEsign(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--ink)" }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Request e-signature for the cash receipt</span>
              </label>
              {requestEsign && (
                <BtField
                  label="Client email"
                  type="email"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              )}
            </div>
          )}

          <div style={{ opacity: selectedStatus === "pending" ? 0.5 : 1, transition: "opacity 180ms ease", marginBottom: 22 }}>
            <BtField
              label="Actual amount paid"
              isCurrency
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              disabled={selectedStatus === "pending"}
              placeholder="0.00"
              error={isError ? displayError : undefined}
              helperText={!isError ? helperText : undefined}
              inputStyle={{ fontSize: 20 }}
            />
          </div>

          <Label>Payment receipt</Label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="pay-now-receipt-input"
          />
          {receiptFile ? (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: "var(--r-input)",
                border: "1.5px solid var(--status-success)", background: "var(--status-success-soft)", marginBottom: 22,
              }}
            >
              <CheckCircle size={18} color="var(--status-success)" />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--status-success)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {receiptFile.name}
              </span>
              <BtIconButton
                icon={X}
                label="Remove receipt"
                size={36}
                onClick={() => {
                  setReceiptFile(null);
                  const el = document.getElementById("pay-now-receipt-input");
                  if (el) el.value = "";
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => document.getElementById("pay-now-receipt-input")?.click()}
              className="bt-hover-row"
              style={{
                width: "100%", font: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12,
                padding: "13px 16px", borderRadius: "var(--r-input)", border: "1.5px dashed var(--input-border)",
                background: "var(--card)", cursor: "pointer", marginBottom: 22, boxSizing: "border-box",
              }}
            >
              <span style={{ width: 38, height: 38, borderRadius: "var(--r-chip)", background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Upload size={18} color="var(--ink)" />
              </span>
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Upload payment receipt</span>
                <span style={{ display: "block", fontSize: 13, color: "var(--ink-3)", marginTop: 1 }}>PNG, JPG or PDF. UPI, bank or cheque proof.</span>
              </span>
            </button>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <BtField label="Payment date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            <BtTextarea
              label="Note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Transaction ID, cheque number, or remarks"
              rows={3}
            />
          </div>
        </div>

        <div
          style={{
            padding: "14px 20px 18px",
            background: "var(--card)",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <BtButton variant="secondary" onClick={onClose} style={{ flex: 2 }}>
            Cancel
          </BtButton>
          <BtButton variant="primary" icon={CheckCircle} loading={submitting} onClick={handleConfirm} style={{ flex: 4 }}>
            Confirm payment
          </BtButton>
        </div>
      </div>
    </div>
  );
}
