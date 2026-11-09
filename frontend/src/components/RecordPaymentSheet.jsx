import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle,
  Upload,
  Smartphone,
  Banknote,
  Building2,
  CreditCard,
  FileText,
  Calendar,
  Mail,
  X,
} from "lucide-react";
import { transactionAPI, esignAPI } from "../api";
import useTransactionStore from "../stores/transactionStore";
import BtButton from "./ui/BtButton";
import BtIconButton from "./ui/BtIconButton";
import BtBadge from "./ui/BtBadge";
import BtField, { BtTextarea } from "./ui/BtField";

const PAYMENT_METHODS = [
  { value: "UPI", icon: Smartphone },
  { value: "Cash", icon: Banknote },
  { value: "Bank Transfer", icon: Building2 },
  { value: "Card", icon: CreditCard },
  { value: "Cheque", icon: FileText },
];

const STATUS_OPTIONS = [
  { key: "paid", label: "Fully paid", tone: "success" },
  { key: "partial", label: "Partial", tone: "warning" },
  { key: "pending", label: "Not paid", tone: "danger" },
];

const TYPE_TONES = { material: "material", labour: "labour", equipment: "equipment" };

const eyebrowStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
  marginBottom: 8,
};

/** true on phone-width screens, where the sheet docks to the bottom edge */
function useIsPhone() {
  const query = "(max-width: 640px)";
  const [phone, setPhone] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = (e) => setPhone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return phone;
}

function formatINR(n) {
  return `\u20B9${Number(n || 0).toLocaleString("en-IN")}`;
}

function parseAmount(val) {
  if (!val || val.trim() === "") return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

export default function RecordPaymentSheet({ open, entry, projects, onClose, onSaved }) {
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [selectedMethod, setSelectedMethod] = useState("UPI");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [amountError, setAmountError] = useState(null);
  const [requestEsign, setRequestEsign] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [esignPolling, setEsignPolling] = useState(false);
  const [esignCompleted, setEsignCompleted] = useState(false);
  const [esignStatusText, setEsignStatusText] = useState("");
  const [, setEsignReqId] = useState(null);
  const fileInputRef = useRef(null);
  const isPhone = useIsPhone();

  const rawTx = entry?.rawTx;
  const entryId = rawTx?._id || entry?.id;

  const totalAmount = (() => {
    if (rawTx?.amount != null) return rawTx.amount;
    if (entry?.amount != null) return entry.amount;
    const qty = rawTx?.quantity || 0;
    const rate = rawTx?.rate || 0;
    const ot = rawTx?.overtime || 0;
    if (rawTx?.type === "Wages") return qty * rate + ot;
    return qty * rate;
  })();

  const alreadyPaid = rawTx?.paidAmount || 0;
  const outstanding = Math.max(0, totalAmount - alreadyPaid);

  const quantity = rawTx?.quantity || 0;
  const ratePerUnit = rawTx?.rate || 0;

  const projectName = (() => {
    if (!rawTx?.project) return "No project";
    if (typeof rawTx.project === "object")
      return rawTx.project.projectName || rawTx.project.name || "No project";
    const match = projects?.find((p) => String(p._id) === String(rawTx.project));
    return match ? match.projectName || match.name : "No project";
  })();

  const itemType = (rawTx?.type || entry?.type || "material").toUpperCase();

  useEffect(() => {
    if (!open) return;

    const initStatus = outstanding > 0 ? (alreadyPaid > 0 ? "partial" : "pending") : "paid";
    setSelectedStatus(initStatus);

    let method = rawTx?.paymentMode || "UPI";
    if (method === "Bank") method = "Bank Transfer";
    if (!PAYMENT_METHODS.some((m) => m.value === method)) method = "UPI";
    setSelectedMethod(method);

    if (initStatus === "paid") {
      setAmount(outstanding > 0 ? outstanding.toString() : totalAmount.toString());
    } else if (initStatus === "pending") {
      setAmount("0");
    } else {
      setAmount("");
    }

    setNotes(rawTx?.notes || rawTx?.remarks || "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setReceiptFile(null);
    setAmountError(null);
  }, [open, entryId]);

  const esignPollingRef = useRef(false);
  useEffect(() => { esignPollingRef.current = esignPolling; }, [esignPolling]);
  useEffect(() => { return () => { esignPollingRef.current = false; setEsignPolling(false); } }, []);

  const startEsignFlow = async () => {
    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      setAmountError("Please enter a valid email for E-Signature.");
      return;
    }
    const enteredAmt = parseAmount(amount);
    const amt = enteredAmt !== null ? enteredAmt : (outstanding > 0 ? outstanding : totalAmount);
    if (amt <= 0) {
      setAmountError("Please enter a valid amount before requesting E-Signature.");
      return;
    }

    setEsignPolling(true);
    setEsignStatusText("Sending request...");
    setAmountError(null);

    try {
      const meta = {
        amount: amt,
        projectName: projectName,
        item: entry?.description || entry?.brand || rawTx?.title || "Entry",
        paymentMode: selectedMethod
      };
      
      const res = await esignAPI.requestSignature({ clientEmail: clientEmail.trim(), meta });
      const rId = res.data?.requestId;
      if (!rId) throw new Error("No request ID returned");
      setEsignReqId(rId);
      setEsignStatusText("Waiting for client to sign...");

      let pollCount = 0;
      const MAX_POLLS = 60; // 3 minutes timeout (60 * 3s)
      const poll = async () => {
        if (!esignPollingRef.current) return;
        pollCount++;
        if (pollCount > MAX_POLLS) {
          setEsignPolling(false);
          setEsignStatusText("Signing timed out. You can retry or complete payment manually.");
          return;
        }
        try {
          const statusRes = await esignAPI.checkStatus(rId);
          if (statusRes.data?.status === 'signed') {
            setEsignPolling(false);
            setEsignCompleted(true);
            setEsignStatusText("Signature captured!");
            
            const b64 = statusRes.data.signatureData;
            if (b64) {
               try {
                 const resFetch = await fetch(b64);
                 const blob = await resFetch.blob();
                 const file = new File([blob], "E-Signature.png", { type: "image/png" });
                 setReceiptFile(file);
               } catch (e) { console.error(e); }
            }
            return;
          }
        } catch (e) {
          console.error("Polling error", e);
        }
        if (esignPollingRef.current) {
           setTimeout(poll, 3000);
        }
      };
      setTimeout(poll, 3000);

    } catch (err) {
      console.error(err);
      setEsignPolling(false);
      setEsignStatusText("Failed to send request");
      setAmountError(err.response?.data?.message || err.message || "Failed to send request");
    }
  };

  const computeHelperText = useCallback(() => {
    if (selectedStatus === "paid") {
      return `Full settlement — ${formatINR(outstanding > 0 ? outstanding : totalAmount)}`;
    }
    if (selectedStatus === "pending") return "No payment recorded";
    const entered = parseAmount(amount) ?? 0;
    const rem = Math.max(0, outstanding - entered);
    return rem > 0 ? `Remaining: ${formatINR(rem)}` : "Full settlement via partial recording";
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

      const currentAmt = outstanding > 0 ? outstanding.toString() : totalAmount.toString();
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

  const handleConfirm = async () => {

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
        ? outstanding > 0 ? outstanding : totalAmount
        : selectedStatus === "pending"
        ? 0.0
        : parseAmount(amount.trim()) ?? 0.0;

    setSaving(true);
    setAmountError(null);

    try {
      const totalPaid = alreadyPaid + amt;

      const statusStr =
        selectedStatus === "paid"
          ? "Paid"
          : selectedStatus === "partial"
          ? "Partial"
          : "Pending";

      let apiPaymentMode = selectedMethod;
      if (apiPaymentMode === "Bank Transfer") {
        apiPaymentMode = "Bank Transfer";
      }

      const payload = {
        paymentStatus: statusStr,
        paidAmount: totalPaid,
        paymentMode: apiPaymentMode,
        notes: notes.trim(),
        paymentDate: (() => {
          if (!paymentDate) return new Date().toISOString();
          const [y, m, d] = paymentDate.split('-');
          const now = new Date();
          return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
        })(),
      };

      if (requestEsign) {
        payload.eSignStatus = esignCompleted ? "Signed" : "Requested";
      }

      if (receiptFile) {
        const reader = new FileReader();
        const dataUri = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(receiptFile);
        });
        payload.paymentReceipt = dataUri;
      }

      await transactionAPI.update(entryId, payload);
      try {
        useTransactionStore.getState().fetchTransactions({}, true);
      } catch (e) {
        console.error("Failed to auto-refresh transactions store:", e);
      }

      const toastMsg =
        amt > 0
          ? `${formatINR(amt)} recorded via ${selectedMethod}`
          : "Payment details updated successfully";

      onSaved?.(toastMsg);
      onClose?.();
    } catch (err) {

      const msg =
        err?.response?.data?.message ||
        err?.friendlyMessage ||
        `Error: ${err.message || "Failed to update payment on server"}`;
      setAmountError(msg);
    } finally {
      setSaving(false);
    }
  };


  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  if (!open || !entry) return null;

  const displayError = amountError;
  const helperText = computeHelperText();
  const entryTitle = entry.description || entry.brand || rawTx?.title || "Entry";
  const typeKey = String(rawTx?.type || entry?.type || "material").toLowerCase();
  const canonicalType = TYPE_TONES[typeKey] ? typeKey : { materials: "material", wages: "labour", expense: "equipment" }[typeKey];
  const typeTone = TYPE_TONES[canonicalType] || "neutral";
  const typeLabel = { material: "Material", labour: "Labour", equipment: "Equipment" }[canonicalType] || itemType.charAt(0) + itemType.slice(1).toLowerCase();

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--scrim)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 1100,
        display: "flex",
        alignItems: isPhone ? "flex-end" : "center",
        justifyContent: "center",
        padding: isPhone ? 0 : 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Record payment"
        style={{
          background: "var(--ground)",
          borderRadius: isPhone ? "var(--r-sheet) var(--r-sheet) 0 0" : "var(--r-sheet)",
          width: "100%",
          maxWidth: 520,
          maxHeight: isPhone ? "94vh" : "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-raised)",
          overflow: "hidden",
          fontFamily: "var(--font-ui)",
          color: "var(--ink)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isPhone && (
          <div style={{ padding: "10px 0 0", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 38, height: 4, borderRadius: "var(--r-full)", background: "var(--input-border)" }} />
          </div>
        )}

        <div style={{ padding: "18px 20px 8px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
              }}
            >
              Record payment
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--ink-2)" }}>
              Log what was paid against this entry.
            </p>
          </div>
          <BtIconButton icon={X} label="Close" onClick={saving ? undefined : onClose} disabled={saving} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 8px" }}>
          {/* Entry summary on noir */}
          <div
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "18px 20px",
              borderRadius: "var(--r-card)",
              background: "var(--noir)",
              color: "var(--on-noir)",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bt-eyebrow" style={{ color: "var(--on-noir-3)", marginBottom: 6 }}>
                  Entry
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 19,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    color: "var(--on-noir)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    marginBottom: 8,
                  }}
                >
                  {entryTitle}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <BtBadge tone={typeTone} label={typeLabel} />
                  <span style={{ fontSize: 13, color: "var(--on-noir-2)" }}>{projectName}</span>
                </div>
                {quantity > 0 && ratePerUnit > 0 && (
                  <div className="tnum" style={{ fontSize: 13, color: "var(--on-noir-3)", marginTop: 8 }}>
                    Qty {quantity} @ {formatINR(ratePerUnit)}
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="bt-eyebrow" style={{ color: "var(--on-noir-3)" }}>
                  Outstanding
                </div>
                <div
                  className="tnum"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--accent)",
                    marginTop: 6,
                  }}
                >
                  {formatINR(outstanding)}
                </div>
                <div className="tnum" style={{ fontSize: 13, color: "var(--on-noir-2)", marginTop: 4 }}>
                  {formatINR(alreadyPaid)} paid
                </div>
              </div>
            </div>
          </div>

          <div style={eyebrowStyle}>Payment status</div>
          <div role="radiogroup" aria-label="Payment status" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {STATUS_OPTIONS.map((opt) => {
              const sel = selectedStatus === opt.key;
              const tone = {
                success: { c: "var(--status-success)", bg: "var(--status-success-soft)", dot: "var(--status-success-bright)" },
                warning: { c: "var(--status-warning)", bg: "var(--status-warning-soft)", dot: "var(--status-warning-bright)" },
                danger: { c: "var(--status-danger)", bg: "var(--status-danger-soft)", dot: "var(--status-danger-bright)" },
              }[opt.tone];
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => handleStatusSelect(opt.key)}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: "var(--r-input)",
                    border: `1.5px solid ${sel ? tone.c : "var(--input-border)"}`,
                    background: sel ? tone.bg : "var(--card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    cursor: "pointer",
                    transition: "all 160ms ease",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: tone.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: sel ? tone.c : "var(--ink)" }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div style={eyebrowStyle}>Payment method</div>
          <div role="radiogroup" aria-label="Payment method" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 20 }}>
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
                    gridColumn: idx === PAYMENT_METHODS.length - 1 && PAYMENT_METHODS.length % 2 === 1 ? "1 / -1" : "auto",
                    minHeight: 44,
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
                  <Icon size={16} strokeWidth={1.9} />
                  <span>{m.value}</span>
                </button>
              );
            })}
          </div>

          {selectedMethod === "Cash" && (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: "var(--r-input)",
                border: "1px solid var(--line)",
                background: "var(--card)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  marginBottom: requestEsign ? 14 : 0,
                  minHeight: 24,
                }}
              >
                <input
                  type="checkbox"
                  checked={requestEsign}
                  onChange={(e) => setRequestEsign(e.target.checked)}
                  disabled={esignPolling || esignCompleted}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--ink)" }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                  Request e-signature for cash receipt
                </span>
              </label>

              {requestEsign && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <BtField
                    label="Client email"
                    type="email"
                    icon={Mail}
                    size="compact"
                    placeholder="name@company.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    disabled={esignPolling || esignCompleted}
                  />
                  {!esignCompleted && (
                    <BtButton
                      variant={esignPolling ? "destructive" : "secondary"}
                      size="small"
                      onClick={esignPolling ? () => setEsignPolling(false) : startEsignFlow}
                    >
                      {esignPolling ? "Cancel request" : "Send request"}
                    </BtButton>
                  )}
                  {(esignStatusText || esignCompleted) && (
                    <div
                      role="status"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: esignCompleted ? "var(--status-success)" : "var(--status-warning)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {esignCompleted ? (
                        <CheckCircle size={15} />
                      ) : (
                        esignPolling && (
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              border: "2px solid currentColor",
                              borderTopColor: "transparent",
                              borderRadius: "50%",
                              animation: "spin 0.7s linear infinite",
                            }}
                          />
                        )
                      )}
                      {esignStatusText}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ opacity: selectedStatus === "pending" ? 0.5 : 1, transition: "opacity 180ms ease" }}>
            <BtField
              label="Amount paid now"
              isCurrency
              required={selectedStatus !== "pending"}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              error={displayError || undefined}
              helperText={displayError ? undefined : helperText}
            />
          </div>

          <div style={{ ...eyebrowStyle, marginTop: 20 }}>Payment receipt</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {receiptFile ? (
            <div
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: "var(--r-input)",
                border: "1px solid var(--status-success)",
                background: "var(--status-success-soft)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <CheckCircle size={18} color="var(--status-success)" />
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--status-success)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {receiptFile.name}
              </span>
              <BtIconButton
                icon={X}
                label="Remove receipt"
                size={36}
                onClick={() => {
                  setReceiptFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bt-hover-row"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: "var(--r-input)",
                border: "1.5px dashed var(--input-border)",
                background: "var(--card)",
                cursor: "pointer",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                fontFamily: "var(--font-ui)",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--r-chip)",
                  background: "var(--fill)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  color: "var(--ink-2)",
                }}
              >
                <Upload size={17} />
              </span>
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                  Upload payment receipt
                </span>
                <span style={{ display: "block", fontSize: 13, color: "var(--ink-3)", marginTop: 1 }}>
                  PNG, JPG or PDF. UPI, bank or cheque proof.
                </span>
              </span>
            </button>
          )}

          <div style={{ marginBottom: 16 }}>
            <BtField
              label="Payment date"
              type="date"
              icon={Calendar}
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <BtTextarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Transaction ID, cheque number, or remarks"
            rows={3}
          />
          <div style={{ height: 8 }} />
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
          <BtButton variant="secondary" size="normal" onClick={onClose} disabled={saving} style={{ flex: 2 }}>
            Cancel
          </BtButton>
          <BtButton
            variant="primary"
            size="normal"
            icon={CheckCircle}
            loading={saving}
            onClick={handleConfirm}
            style={{ flex: 4 }}
          >
            Confirm payment
          </BtButton>
        </div>
      </div>
    </div>
  , document.body);
}
