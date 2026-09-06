import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Upload,
  Smartphone,
  Banknote,
  Building2,
  CreditCard,
  FileText,
  Calendar,
  X,
} from "lucide-react";
import { transactionAPI, esignAPI } from "../api";

const primaryBlue = "#F97316";

const PAYMENT_METHODS = [
  { value: "UPI", icon: Smartphone },
  { value: "Cash", icon: Banknote },
  { value: "Bank Transfer", icon: Building2 },
  { value: "Card", icon: CreditCard },
  { value: "Cheque", icon: FileText },
];

const STATUS_OPTIONS = [
  { key: "paid", label: "Fully Paid", color: "#15803D", bg: "#DCFCE7" },
  { key: "partial", label: "Partial", color: "#B45309", bg: "#FEF3C7" },
  { key: "pending", label: "Not Paid", color: "#DC2626", bg: "#FEE2E2" },
];

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
  const [esignReqId, setEsignReqId] = useState(null);
  const fileInputRef = useRef(null);
  const amountRef = useRef(null);

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
    if (!rawTx?.project) return "Unknown Project";
    if (typeof rawTx.project === "object")
      return rawTx.project.projectName || rawTx.project.name || "Unknown Project";
    const match = projects?.find((p) => String(p._id) === String(rawTx.project));
    return match ? match.projectName || match.name : "Unknown Project";
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

      const poll = async () => {
        if (!esignPollingRef.current) return;
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
      if (apiPaymentMode === "Bank Transfer" || apiPaymentMode === "Card") {
        apiPaymentMode = "Bank";
      }

      const payload = {
        paymentStatus: statusStr,
        paidAmount: totalPaid,
        paymentMode: apiPaymentMode,
        notes: notes.trim(),
        paymentDate: new Date(paymentDate).toISOString(),
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

  if (!open || !entry) return null;

  const displayError = amountError;
  const helperText = displayError || computeHelperText();
  const isError = !!displayError;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose?.();
      }}
    >
      <div
        style={{
          background: "#F4F5FF",
          borderRadius: "22px 22px 0 0",
          width: "100%",
          maxWidth: 480,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 38, height: 4, borderRadius: 16, background: "#BDBEE8" }} />
        </div>

        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={saving ? undefined : onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "#FFF",
              border: "1px solid #E2E4F6",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} color={primaryBlue} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#1E1E2E", flex: 1 }}>
            Fulfillment &amp; Payment
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
          <div
            style={{
              width: "100%",
              padding: 18,
              borderRadius: 18,
              background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: "rgba(255,255,255,0.54)",
                    letterSpacing: 1.3,
                    marginBottom: 6,
                  }}
                >
                  INVENTORY ITEM DETAILS
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: "#FFF",
                    lineHeight: 1.2,
                    letterSpacing: -0.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    marginBottom: 6,
                  }}
                >
                  {entry.description || entry.brand || rawTx?.title || "Entry"}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                  {itemType} · {projectName || "Project"}
                </div>
                {quantity > 0 && ratePerUnit > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.6)",
                      marginTop: 4,
                    }}
                  >
                    Qty: {Number.isInteger(quantity) ? quantity : quantity} @{" "}
                    {"\u20B9"}
                    {Number.isInteger(ratePerUnit) ? ratePerUnit : ratePerUnit}
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: "rgba(255,255,255,0.54)",
                    letterSpacing: 1.2,
                  }}
                >
                  OUTSTANDING
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#FFF",
                    letterSpacing: -0.5,
                    marginTop: 6,
                  }}
                >
                  {formatINR(outstanding)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                  {formatINR(alreadyPaid)} paid
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: "#6B7280", letterSpacing: 1.1, marginBottom: 8 }}>
            PAYMENT STATUS
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {STATUS_OPTIONS.map((opt) => {
              const sel = selectedStatus === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleStatusSelect(opt.key)}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    border: `1.5px solid ${sel ? opt.color : "#E2E4F6"}`,
                    background: sel ? opt.bg : "#FFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    cursor: "pointer",
                    transition: "all 0.16s ease",
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: opt.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: sel ? opt.color : "#374151",
                    }}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: "#6B7280", letterSpacing: 1.1, marginBottom: 8 }}>
            PAYMENT METHOD
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {PAYMENT_METHODS.map((m, idx) => {
              const Icon = m.icon;
              const sel = selectedMethod === m.value;

              const isFullWidth = idx === 4;
              return (
                <button
                  key={m.value}
                  onClick={() => setSelectedMethod(m.value)}
                  style={{
                    flex: isFullWidth ? "1 1 100%" : "1 1 calc(50% - 4px)",
                    height: 46,
                    borderRadius: 12,
                    border: `1.5px solid ${sel ? primaryBlue : "#E2E4F6"}`,

                    background: sel ? primaryBlue : "#FFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: "pointer",
                    transition: "all 0.16s ease",

                    boxShadow: sel ? "0 2px 6px rgba(249,115,22,0.18)" : "none",
                  }}
                >
                  <Icon
                    size={16}

                    color={sel ? "#FFF" : "#6B7280"}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,

                      color: sel ? "#FFF" : "#374151",
                    }}
                  >
                    {m.value}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedMethod === "Cash" && (
            <div style={{ marginBottom: 20, padding: 14, borderRadius: 12, border: "1px solid #E2E4F6", background: "#F8F9FF" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: requestEsign ? 12 : 0 }}>
                <input
                  type="checkbox"
                  checked={requestEsign}
                  onChange={(e) => setRequestEsign(e.target.checked)}
                  disabled={esignPolling || esignCompleted}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1E1E2E" }}>Request E-Signature for Cash Receipt</span>
              </label>

              {requestEsign && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    type="email"
                    placeholder="Client Email Address"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    disabled={esignPolling || esignCompleted}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #CCCFE8", outline: "none", fontSize: 13, fontFamily: "inherit" }}
                  />
                  {!esignCompleted && (
                    <button
                      onClick={esignPolling ? () => setEsignPolling(false) : startEsignFlow}
                      style={{
                        padding: "10px", borderRadius: 8, border: "none",
                        background: esignPolling ? "#FEE2E2" : "#F97316",
                        color: esignPolling ? "#DC2626" : "#FFF",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                        fontFamily: "inherit"
                      }}
                    >
                      {esignPolling ? "Cancel Request" : "Send Request"}
                    </button>
                  )}
                  {(esignStatusText || esignCompleted) && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: esignCompleted ? "#15803D" : "#B45309", display: "flex", alignItems: "center", gap: 6 }}>
                       {esignCompleted ? <CheckCircle size={14} /> : (esignPolling && <div className="spinner-spin" style={{ width: 10, height: 10, border: "2px solid #B45309", borderTopColor: "transparent", borderRadius: "50%" }}/>)}
                       {esignStatusText}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div style={{ fontSize: 10, fontWeight: 800, color: "#6B7280", letterSpacing: 1.1, marginBottom: 8 }}>
            ACTUAL AMOUNT PAID ({"\u20B9"})
          </div>
          <div
            style={{
              height: 60,
              opacity: selectedStatus === "pending" ? 0.4 : 1.0,
              transition: "opacity 0.18s ease",
            }}
          >
            <div
              style={{
                height: 60,
                borderRadius: 12,
                background: "#FFF",
                display: "flex",
                alignItems: "center",
                border: `1px solid ${isError ? "#DC2626" : "#E2E4F6"}`,
              }}
            >
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={selectedStatus === "pending"}
                placeholder="0.00"
                style={{
                  flex: 1,
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#1E1E2E",
                  outline: "none",
                  paddingLeft: 16,
                  paddingRight: 16,
                }}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: 5,
              paddingLeft: 2,
              fontSize: 11,
              fontWeight: 500,
              fontStyle: isError ? "italic" : "normal",
              color: isError ? "#DC2626" : "#6B7280",
            }}
          >
            {helperText}
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: "#6B7280", letterSpacing: 1.1, marginTop: 20, marginBottom: 8 }}>
            PAYMENT RECEIPT
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <div
            onClick={() => !receiptFile && fileInputRef.current?.click()}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 12,
              border: `1.5px solid ${receiptFile ? "#15803D" : "#CCCFE8"}`,
              background: receiptFile ? "#F0FDF4" : "#FFF",
              cursor: receiptFile ? "default" : "pointer",
              marginBottom: 12,
              transition: "all 0.18s ease",
            }}
          >
            {receiptFile ? (

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={18} color="#15803D" />
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#15803D",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {receiptFile.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setReceiptFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#6B7280",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "#EEEFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Upload size={17} color={primaryBlue} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1E1E2E" }}>
                    Upload Payment Receipt
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 500, color: "#6B7280", marginTop: 1 }}>
                    PNG, JPG, PDF — UPI / Bank / Cheque proof
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: "#6B7280", letterSpacing: 1.1, marginBottom: 8 }}>
            PAYMENT DATE
          </div>
          <div
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 12,
              border: "1.5px solid #CCCFE8",
              background: "#FFF",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Calendar size={19} color={primaryBlue} />
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 14,
                fontWeight: 700,
                color: "#1E1E2E",
                outline: "none",
                flex: 1,
                cursor: "pointer",
              }}
            />
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Transaction ID, cheque number, or remarks…"
            rows={3}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1.5px solid #CCCFE8",
              background: "#FFF",
              fontSize: 13,
              color: "#1E1E2E",
              outline: "none",
              resize: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div style={{ height: 6 }} />
        </div>

        <div
          style={{
            padding: "12px 16px 16px",
            background: "#FFF",
            borderTop: "1px solid #E8EAFF",
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={saving ? undefined : onClose}
            style={{
              flex: 2,
              height: 46,
              borderRadius: 11,
              border: "1.5px solid #EBEBEB",
              background: "#FFF",
              fontSize: 13,
              fontWeight: 700,
              color: "#6B7280",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            style={{
              flex: 5,
              height: 46,
              borderRadius: 11,
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              border: "none",
              fontSize: 12,
              fontWeight: 800,
              color: "#FFF",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 3px 8px rgba(249,115,22,0.25)",
            }}
          >
            {saving ? (
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#FFF",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
            ) : (
              <>
                <CheckCircle size={16} />
                <span style={{ whiteSpace: "nowrap" }}>Confirm Payment &amp; Update Inventory</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
