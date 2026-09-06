import { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Smartphone,
  Banknote,
  Building2,
  CreditCard,
  FileText,
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

export default function AddRevenueModal({ open, projects, onClose, onSaved }) {
  const [title, setTitle] = useState("Revenue Inflow");
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("Bank Transfer");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

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
      setSaving(false);
      setRequestEsign(false);
      setClientEmail("");
      setEsignPolling(false);
      setEsignCompleted(false);
      setEsignStatusText("");
      setEsignReqId(null);
    }
  }, [open, projects]);

  if (!open) return null;

  const startEsignFlow = async () => {
    if (!clientEmail.trim() || !clientEmail.includes("@")) {
      setErrorMsg("Please enter a valid email for E-Signature.");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a valid amount before requesting E-Signature.");
      return;
    }

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
      setErrorMsg("Enter a valid amount");
      return;
    }
    
    setSaving(true);
    setErrorMsg(null);
    
    try {
      let apiPaymentMode = selectedMethod;
      if (apiPaymentMode === "Card") {
        apiPaymentMode = "Bank Transfer";
      }

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

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "flex-end", justifyContent: "center"
    }}>
      <div style={{
        background: "#FFF", width: "100%", maxWidth: 500,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: "90vh", display: "flex", flexDirection: "column"
      }}>
        <div style={{ padding: 24, paddingBottom: 16, borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Record Revenue</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", display: "flex" }}>
            <X size={24} color="#6B7280" />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {errorMsg && (
            <div style={{ padding: 12, background: "#FEE2E2", color: "#DC2626", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Title</label>
            <input 
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Client Payment"
              style={{ width: "100%", padding: "12px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 15, color: "#111827", backgroundColor: "#FFF", outline: "none" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Amount (₹)</label>
            <input 
              type="number"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              style={{ width: "100%", padding: "12px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 15, color: "#111827", backgroundColor: "#FFF", outline: "none" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Project</label>
            <select 
              value={projectId} onChange={e => setProjectId(e.target.value)}
              style={{ width: "100%", padding: "12px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 15, color: "#111827", backgroundColor: "#FFF", outline: "none" }}
            >
              {projects?.map(p => (
                <option key={p._id} value={p._id}>{p.projectName || p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Payment Mode</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedMethod === method.value;
                return (
                  <div
                    key={method.value}
                    onClick={() => setSelectedMethod(method.value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1.5px solid ${isSelected ? primaryBlue : "#E5E7EB"}`,
                      background: isSelected ? "#FFF5F0" : "#FFF",
                      display: "flex", alignItems: "center", gap: 6,
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <method.icon size={16} color={isSelected ? primaryBlue : "#6B7280"} />
                    <span style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isSelected ? primaryBlue : "#4B5563" }}>
                      {method.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedMethod === "Cash" && (
            <div style={{ marginBottom: 24, padding: "16px", borderRadius: 12, border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: requestEsign ? 16 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    id="esign-checkbox"
                    checked={requestEsign}
                    onChange={(e) => setRequestEsign(e.target.checked)}
                    disabled={esignPolling || esignCompleted}
                    style={{ width: 16, height: 16 }}
                  />
                  <label htmlFor="esign-checkbox" style={{ fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                    Request E-Signature via Email
                  </label>
                </div>
                {esignCompleted && <span style={{ fontSize: 12, color: "#16A34A", fontWeight: "bold" }}>Signed!</span>}
              </div>

              {requestEsign && !esignCompleted && (
                <div>
                  <input
                    type="email"
                    placeholder="Client Email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    disabled={esignPolling}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, marginBottom: 12, color: "#111827", outline: "none" }}
                  />
                  {esignPolling ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: primaryBlue, fontSize: 13, fontWeight: 600 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(249,115,22,0.3)", borderTopColor: primaryBlue, animation: "spin 0.8s linear infinite" }} />
                      {esignStatusText}
                      <button onClick={() => setEsignPolling(false)} style={{ marginLeft: "auto", border: "none", background: "none", color: "#EF4444", fontSize: 12, cursor: "pointer", fontWeight: "bold" }}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={startEsignFlow}
                      disabled={!clientEmail || !amount}
                      style={{
                        width: "100%", padding: "10px", background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: 8,
                        color: "#374151", fontWeight: 600, fontSize: 14, cursor: "pointer"
                      }}
                    >
                      Send E-Signature Request
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Notes (Optional)</label>
            <textarea 
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any remarks..."
              style={{ width: "100%", padding: "12px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 15, minHeight: 80, resize: "vertical", color: "#111827", backgroundColor: "#FFF", outline: "none" }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Upload Proof (Optional)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={e => setReceiptFile(e.target.files?.[0])}
              style={{ width: "100%", padding: "10px", border: "1px dashed #D1D5DB", borderRadius: 8, fontSize: 14, color: "#374151" }}
            />
          </div>
        </div>

        <div style={{ padding: 24, borderTop: "1px solid #E5E7EB", flexShrink: 0, backgroundColor: "#FFF" }}>
          <button 
            onClick={handleSave} 
            disabled={saving || esignPolling}
            style={{ width: "100%", padding: 16, background: primaryBlue, color: "#FFF", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            {saving ? (
              <><div style={{ width: 18, height: 18, marginRight: 8, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFF", animation: "spin 0.7s linear infinite" }} /> Saving...</>
            ) : "Record Revenue"}
          </button>
        </div>
      </div>
    </div>
  );
}
