import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Upload,
  Smartphone,
  Banknote,
  Building2,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { transactionAPI, esignAPI } from "../api";
import { BtButton, BtIconButton, BtChip, BtField, BtSelect, BtTextarea } from "./ui";

const PAYMENT_METHODS = [
  { value: "UPI", icon: Smartphone },
  { value: "Cash", icon: Banknote },
  { value: "Bank Transfer", icon: Building2 },
  { value: "Card", icon: CreditCard },
  { value: "Cheque", icon: FileText },
];

export default function AddRevenueModal({ open, projects, onClose, onSaved }) {
  const [title, setTitle] = useState("Revenue Inflow");
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("Bank Transfer");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [amountError, setAmountError] = useState("");
  const [emailError, setEmailError] = useState("");
  const fileInputRef = useRef(null);

  const [requestEsign, setRequestEsign] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [esignPolling, setEsignPolling] = useState(false);
  const [esignCompleted, setEsignCompleted] = useState(false);
  const [esignStatusText, setEsignStatusText] = useState("");
  const [esignReqId, setEsignReqId] = useState(null);

  const esignPollingRef = useRef(false);
  useEffect(() => { esignPollingRef.current = esignPolling; }, [esignPolling]);
  useEffect(() => { return () => { esignPollingRef.current = false; setEsignPolling(false); } }, []);

  useEffect(() => {
    if (open) {
      setTitle("Revenue Inflow");
      setAmount("");
      setSelectedMethod("Bank Transfer");
      setProjectId(projects?.[0]?._id || "");
      setNotes("");
      setReceiptFile(null);
      setErrorMsg(null);
      setAmountError("");
      setEmailError("");
      setSaving(false);
      setRequestEsign(false);
      setClientEmail("");
      setEsignPolling(false);
      setEsignCompleted(false);
      setEsignStatusText("");
      setEsignReqId(null);
    }
  }, [open, projects]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const startEsignFlow = async () => {
    if (!clientEmail.trim() || !clientEmail.includes("@")) {
      setEmailError("Enter a valid email for the e-signature request.");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setAmountError("Enter the amount before requesting an e-signature.");
      return;
    }
    setEmailError("");
    setAmountError("");

    setEsignPolling(true);
    setEsignStatusText("Sending request...");
    setErrorMsg(null);

    try {
      const proj = projects.find(p => p._id === projectId);
      const meta = {
        amount: amt,
        projectName: proj ? proj.name || proj.projectName : "Project",
        item: title,
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
          if (statusRes.data?.status === "signed") {
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
      setErrorMsg(err.response?.data?.message || err.message || "Failed to send request");
    }
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setAmountError("Enter an amount greater than zero.");
      return;
    }
    setAmountError("");

    setSaving(true);
    setErrorMsg(null);
    
    try {
      let apiPaymentMode = selectedMethod;

      const payload = {
        title: title,
        amount: amt,
        type: "Income",
        project: projectId,
        date: new Date().toISOString(),
        notes: notes,
        paymentMode: apiPaymentMode,
        paymentStatus: "Paid",
        paidAmount: amt
      };

      if (receiptFile) {
        const reader = new FileReader();
        const dataUri = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(receiptFile);
        });
        payload.paymentReceipt = dataUri;
        payload.attachments = [dataUri];
      }

      await transactionAPI.create(payload);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to add revenue");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--scrim)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        animation: "fadeIn 160ms ease",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-revenue-title"
        style={{
          background: "var(--card)",
          width: "100%",
          maxWidth: 520,
          borderRadius: "var(--r-sheet)",
          maxHeight: "calc(100dvh - 32px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-raised)",
          border: "1px solid var(--line)",
          overflow: "hidden",
          animation: "fadeUp 240ms var(--ease)",
        }}
      >
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div>
            <div className="bt-eyebrow" style={{ color: "var(--ink-3)", marginBottom: 4 }}>
              Client money
            </div>
            <h2
              id="record-revenue-title"
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
              }}
            >
              Record revenue
            </h2>
          </div>
          <BtIconButton icon={X} label="Close" onClick={onClose} />
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          <BtField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Client payment"
          />

          <BtField
            label="Amount"
            required
            isCurrency
            type="number"
            inputMode="decimal"
            min="0"
            autoFocus
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountError("");
            }}
            placeholder="0.00"
            error={amountError}
          />

          <BtSelect label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.projectName || p.name}
              </option>
            ))}
          </BtSelect>

          <div>
            <div
              id="payment-mode-label"
              style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}
            >
              Payment mode
            </div>
            <div role="radiogroup" aria-labelledby="payment-mode-label" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PAYMENT_METHODS.map((method) => (
                <BtChip
                  key={method.value}
                  label={method.value}
                  icon={method.icon}
                  selected={selectedMethod === method.value}
                  onClick={() => setSelectedMethod(method.value)}
                  role="radio"
                  aria-checked={selectedMethod === method.value}
                  style={{ height: 40 }}
                />
              ))}
            </div>
          </div>

          {selectedMethod === "Cash" && (
            <div
              style={{
                padding: 16,
                borderRadius: "var(--r-tile)",
                border: "1px solid var(--line)",
                background: "var(--ground)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <label
                  htmlFor="esign-checkbox"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 40,
                    fontFamily: "var(--font-ui)",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--ink)",
                    cursor: esignPolling || esignCompleted ? "not-allowed" : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    id="esign-checkbox"
                    checked={requestEsign}
                    onChange={(e) => setRequestEsign(e.target.checked)}
                    disabled={esignPolling || esignCompleted}
                    style={{ width: 18, height: 18, accentColor: "var(--ink)" }}
                  />
                  Ask the client to e-sign by email
                </label>
                {esignCompleted && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontFamily: "var(--font-ui)",
                      fontSize: 13,
                      color: "var(--status-success)",
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={15} /> Signed
                  </span>
                )}
              </div>

              {requestEsign && !esignCompleted && (
                <>
                  <BtField
                    label="Client email"
                    type="email"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value);
                      setEmailError("");
                    }}
                    disabled={esignPolling}
                    error={emailError}
                  />
                  {esignPolling ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "var(--ink)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "2px solid var(--line)",
                          borderTopColor: "var(--ink)",
                          animation: "spin 0.8s linear infinite",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1 }}>{esignStatusText}</span>
                      <BtButton variant="destructive" size="compact" onClick={() => setEsignPolling(false)}>
                        Cancel
                      </BtButton>
                    </div>
                  ) : (
                    <BtButton
                      variant="secondary"
                      size="small"
                      fullWidth
                      onClick={startEsignFlow}
                      disabled={!clientEmail || !amount}
                    >
                      Send e-signature request
                    </BtButton>
                  )}
                </>
              )}
            </div>
          )}

          <BtTextarea
            label="Notes (optional)"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any remarks"
          />

          <div>
            <div
              style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}
            >
              Proof of payment (optional)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
              aria-label="Upload proof of payment"
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <BtButton variant="secondary" size="small" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                {receiptFile ? "Replace file" : "Choose file"}
              </BtButton>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  color: receiptFile ? "var(--ink)" : "var(--ink-3)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {receiptFile ? receiptFile.name : "Image or PDF"}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "16px 24px 20px",
            borderTop: "1px solid var(--line)",
            flexShrink: 0,
            background: "var(--card)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {errorMsg && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "10px 12px",
                background: "var(--status-danger-soft)",
                color: "var(--status-danger)",
                borderRadius: "var(--r-chip)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{errorMsg}</span>
            </div>
          )}
          <BtButton fullWidth loading={saving} disabled={esignPolling} onClick={handleSave}>
            Record revenue
          </BtButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
