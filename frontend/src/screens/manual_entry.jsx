import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { transactionAPI } from "../api";
import useProjectStore from "../stores/projectStore";
import { Toast } from "../components/Toast";
import { colors, radius, shadows, gradients, typography } from "../styles/designTokens";
import { Building, ChevronDown, HelpCircle, CheckCircle, X } from "lucide-react";
import ModuleTour from "../components/ModuleTour";
import PayNowSheet from "../components/PayNowSheet";
import { useAuth } from "../contexts/AuthContext";

const ENTRY_TYPES = [
  { key: "material", label: "Material", color: colors.primaryBlue },
  { key: "labour", label: "Labour", color: colors.primaryPurple },
  { key: "equipment", label: "Equipment", color: colors.primaryLightBlue },
];

const UNIT_OPTIONS = {
  material: ["Bags", "Kg", "Tonnes", "Sq.Ft", "Cubic Ft", "Pieces", "Liters", "Unit"],
  labour: ["Day", "Hour", "Sq.Ft", "Unit"],
  equipment: ["Day", "Hour", "Week", "Month", "Trip"],
};

const GST_PERCENTAGES = [0, 5, 12, 18, 28];

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque", "Credit"];

const FIELDS = {
  material: [
    { key: "itemName", label: "Material / Item", required: true, type: "text", placeholder: "e.g. Cement, Sand, Steel" },
    { key: "quantity", label: "Quantity", required: true, type: "number", min: 0.01 },
    { key: "rate", label: "Rate (₹)", required: true, type: "number", prefix: "₹", min: 0.01 },
    { key: "brand", label: "Brand", required: false, type: "text", placeholder: "e.g. ACC, UltraTech" },
    { key: "supplier", label: "Supplier / Vendor", required: false, type: "text", placeholder: "e.g. BuildMart" },
  ],
  labour: [
    { key: "workerName", label: "Worker / Team Name", required: true, type: "text", placeholder: "e.g. Ramesh, Team A" },
    { key: "quantity", label: "Number of Workers", required: true, type: "number", min: 1 },
    { key: "rate", label: "Rate per Worker (₹)", required: true, type: "number", prefix: "₹", min: 0.01 },
    { key: "workType", label: "Trade / Work Type", required: false, type: "text", placeholder: "e.g. Mason, Carpenter" },
    { key: "contractor", label: "Contractor / Team", required: false, type: "text", placeholder: "e.g. Kumar Contractors" },
    { key: "overtime", label: "Overtime Hours", required: false, type: "number", min: 0, placeholder: "0" },
  ],
  equipment: [
    { key: "equipmentName", label: "Equipment Name", required: true, type: "text", placeholder: "e.g. JCB, Crane, Mixer" },
    { key: "quantity", label: "Quantity (Hours/Days)", required: true, type: "number", min: 0.01 },
    { key: "rate", label: "Rate (₹)", required: true, type: "number", prefix: "₹", min: 0.01 },
    { key: "model", label: "Model / Sub-Class", required: false, type: "text", placeholder: "e.g. CAT 320" },
    { key: "operator", label: "Operator / Vendor", required: false, type: "text", placeholder: "e.g. Raj Equipment" },
  ],
};

const AUTOCOMPLETE_FIELDS = {
  material: { itemName: ["Cement", "Sand", "Gravel", "Steel", "Bricks", "Blocks", "Tiles", "Pipes", "Wires", "Paint"], brand: ["ACC", "UltraTech", "Ambuja", "Shree Cement", "JK Cement"], supplier: ["BuildMart", "MaterialHub", "SupplyCo"] },
  labour: { workerName: ["Ramesh", "Suresh", "Mahesh", "Team A", "Team B", "Team C"], workType: ["Mason", "Carpenter", "Electrician", "Plumber", "Painter", "Welder"], contractor: ["Kumar Contractors", "Reddy Builders", "Sharma Construction"] },
  equipment: { equipmentName: ["JCB", "Crane", "Mixer", "Excavator", "Bulldozer", "Compactor", "Generator"], model: ["CAT 320", "Komatsu PC200", "Hitachi ZX200"], operator: ["Raj Equipment", "ABC Rentals", "HeavyMach"] },
};

export default function ManualEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can, isAdmin } = useAuth();
  
  const allowedTypes = useMemo(() => {
    const types = [];
    if (isAdmin || can('manage_expenses')) types.push("material");
    if (isAdmin || can('add_entries') || can('submit_daily_update')) types.push("labour");
    if (isAdmin || can('manage_equipment_master')) types.push("equipment");
    return types;
  }, [can, isAdmin]);

  const [entryType, setEntryType] = useState(() => allowedTypes.length > 0 ? allowedTypes[0] : "material");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [values, setValues] = useState({});
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const clearToast = useCallback(() => setToast({ msg: "", type: "info" }), []);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [sourceTransactionId, setSourceTransactionId] = useState(null);

  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-header', content: 'Here you can manually log materials, labour, or equipment.', disableBeacon: true },
    { target: '.tour-entry-types', content: 'Choose the type of entry you want to record.' },
    { target: '.tour-project-context', content: 'Select the project, phase, and activity for this entry.' },
    { target: '.tour-field-item', content: 'Fill in the details for the specific item, rate, and quantity.' },
    { target: '.tour-amount-calc', content: 'The total amount is calculated automatically.' },
    { target: '.tour-payment', content: 'Mark if the entry is already paid and specify the payment method.' },
    { target: '.tour-attachments', content: 'Upload bills, receipts, or site photos for this entry.' },
    { target: '.tour-save-btn', content: 'Click here to save the manual entry.' }
  ];

  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [selectedActivityName, setSelectedActivityName] = useState("");

  const [loadedPhaseValue, setLoadedPhaseValue] = useState("");
  const [loadedPhaseIdValue, setLoadedPhaseIdValue] = useState("");
  const [loadedActivityValue, setLoadedActivityValue] = useState("");
  const [loadedActivityIdValue, setLoadedActivityIdValue] = useState("");

  const selectedProjectData = useMemo(() => {
    return projects.find(p => p._id === selectedProject) || null;
  }, [projects, selectedProject]);

  const floors = useMemo(() => {
    return selectedProjectData?.floors || [];
  }, [selectedProjectData]);

  const phases = useMemo(() => {
    return selectedProjectData?.selectedPhases || [];
  }, [selectedProjectData]);

  const uniqueActivityNames = useMemo(() => {
    if (!selectedProjectData) return [];
    const activities = [];
    if (selectedPhaseId) {
      const match = phases.find(ph => String(ph.id) === selectedPhaseId);
      activities.push(...(match?.activities || []));
    } else {
      activities.push(...(selectedProjectData.selectedPhases?.flatMap(p => p.activities || []) || []));
    }
    return [...new Set(activities.map(a => a.name))];
  }, [selectedProjectData, phases, selectedPhaseId]);

  const [isWithGst, setIsWithGst] = useState(false);
  const [gstPercentage, setGstPercentage] = useState(18);

  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPayNow, setShowPayNow] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const [attachments, setAttachments] = useState([]);
  const attachmentInputRef = useRef(null);
  const appendedPaymentRef = useRef(null);

  const [recentEntries, setRecentEntries] = useState([]);

  const [autocompleteState, setAutocompleteState] = useState({ field: null, suggestions: [] });
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  useEffect(() => {
    useProjectStore.getState().fetchContext()
      .then(list => setProjects(list || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (allowedTypes.length === 0) {
      navigate("/");
    } else if (!isEditing && !allowedTypes.includes(entryType)) {
      setEntryType(allowedTypes[0]);
    }
  }, [allowedTypes, entryType, isEditing, navigate]);

  useEffect(() => {
    if (location.state && location.state.transaction) {
      const tx = location.state.transaction;
      setIsEditing(true);
      setEditingId(tx._id || tx.id);

      const typeMapRev = { "Materials": "material", "Wages": "labour", "Expense": "equipment" };
      const eType = typeMapRev[tx.type] || "material";
      setEntryType(eType);
      setSelectedProject(tx.project?._id || tx.project || "");
      if (tx.date || tx.createdAt) {
        setDate(new Date(tx.date || tx.createdAt).toISOString().split("T")[0]);
      }
      setNotes(tx.notes || "");
      setUnit(tx.unit || "");
      setSelectedFloor(tx.floor || "");
      setSelectedPhaseId(tx.phaseId || tx.phase || "");
      setSelectedActivityName(tx.activity || "");
      setLoadedPhaseValue(tx.phase || "");
      setLoadedPhaseIdValue(tx.phaseId || "");
      setLoadedActivityValue(tx.activity || "");
      setLoadedActivityIdValue(tx.activityId || "");
      setIsWithGst(tx.isWithGst || false);
      setGstPercentage(tx.gstPercentage || 18);
      setPaymentMethod(tx.paymentMethod || "Cash");
      setPaymentHistory(tx.paymentHistory || []);

      const nameVal = tx.title || tx.materialName || tx.workerName || tx.equipmentName || "";
      if (eType === "material") {
        setValues({
          itemName: nameVal,
          quantity: tx.quantity || "",
          rate: tx.rate || "",
          brand: tx.brand || "",
          supplier: tx.supplier || "",
        });
      } else if (eType === "labour") {
        setValues({
          workerName: nameVal,
          quantity: tx.quantity || "",
          rate: tx.rate || "",
          workType: tx.workType || "",
          contractor: tx.contractor || "",
          overtime: tx.overtime || "",
        });
      } else if (eType === "equipment") {
        setValues({
          equipmentName: nameVal,
          quantity: tx.quantity || "",
          rate: tx.rate || "",
          model: tx.model || "",
          operator: tx.operator || "",
        });
      }
    } else {
      const params = new URLSearchParams(location.search);
      const qType = params.get("type");
      const qProject = params.get("project");
      const qName = params.get("name");
      const qUnit = params.get("unit");
      const qBrand = params.get("brand");
      const qIsDuplicate = params.get("isDuplicate") === "true";
      const qSourceTxId = params.get("sourceTransactionId");

      setIsEditing(false);
      setIsDuplicate(qIsDuplicate);
      setSourceTransactionId(qIsDuplicate ? qSourceTxId : null);

      if (qType && ["material", "labour", "equipment"].includes(qType)) {
        setEntryType(qType);
      }
      if (qProject) {
        setSelectedProject(qProject);
      }
      if (qUnit) {
        setUnit(qUnit);
      }
      if (qName) {
        const nameKey = qType === "material" ? "itemName" : qType === "labour" ? "workerName" : "equipmentName";
        setValues(prev => ({
          ...prev,
          [nameKey]: qName,
          brand: qBrand || "",
        }));
      }

      if (qIsDuplicate && qSourceTxId) {
        transactionAPI.getById(qSourceTxId)
          .then(({ data }) => {
            const tx = data.transaction || data;
            const typeMapRev = { "Materials": "material", "Wages": "labour", "Expense": "equipment" };
            const eType = typeMapRev[tx.type] || qType || "material";
            setEntryType(eType);
            setSelectedProject(tx.project?._id || tx.project || qProject || "");
            if (tx.date || tx.createdAt) {
              setDate(new Date(tx.date || tx.createdAt).toISOString().split("T")[0]);
            }
            setNotes(tx.notes || "");
            setUnit(tx.unit || qUnit || "");
            setSelectedFloor(tx.floor || "");
            setSelectedPhaseId(tx.phaseId || tx.phase || "");
            setSelectedActivityName(tx.activity || "");
            setLoadedPhaseValue(tx.phase || "");
            setLoadedPhaseIdValue(tx.phaseId || "");
            setLoadedActivityValue(tx.activity || "");
            setLoadedActivityIdValue(tx.activityId || "");
            setIsWithGst(tx.isWithGst || false);
            setGstPercentage(tx.gstPercentage || 18);
            setPaymentMethod(tx.paymentMethod || "Cash");
            setPaymentHistory(tx.paymentHistory || []);

            const nameVal = tx.title || tx.materialName || tx.workerName || tx.equipmentName || "";
            if (eType === "material") {
              setValues({
                itemName: nameVal || qName || "",
                quantity: tx.quantity || "",
                rate: tx.rate || "",
                brand: tx.brand || "",
                supplier: tx.supplier || "",
              });
            } else if (eType === "labour") {
              setValues({
                workerName: nameVal || qName || "",
                quantity: tx.quantity || "",
                rate: tx.rate || "",
                workType: tx.workType || "",
                contractor: tx.contractor || "",
                overtime: tx.overtime || "",
              });
            } else if (eType === "equipment") {
              setValues({
                equipmentName: nameVal || qName || "",
                quantity: tx.quantity || "",
                rate: tx.rate || "",
                model: tx.model || "",
                operator: tx.operator || "",
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [location]);

  useEffect(() => {
    if (isDuplicate && sourceTransactionId) {
      setIsEditing(false);
      setEditingId(null);
    }
  }, [isDuplicate, sourceTransactionId]);

  useEffect(() => {
    if (!isEditing || !editingId) return;
    let cancelled = false;
    transactionAPI.getById(editingId)
      .then(({ data }) => {
        if (cancelled) return;
        const tx = data.transaction || data;
        const typeMapRev = { "Materials": "material", "Wages": "labour", "Expense": "equipment" };
        const eType = typeMapRev[tx.type] || "material";
        setEntryType(eType);
        setSelectedProject(tx.project?._id || tx.project || "");
        if (tx.date || tx.createdAt) {
          setDate(new Date(tx.date || tx.createdAt).toISOString().split("T")[0]);
        }
        setNotes(tx.notes || "");
        setUnit(tx.unit || "");
        setSelectedFloor(tx.floor || "");
        setSelectedPhaseId(tx.phaseId || tx.phase || "");
        setSelectedActivityName(tx.activity || "");
        setLoadedPhaseValue(tx.phase || "");
        setLoadedPhaseIdValue(tx.phaseId || "");
        setLoadedActivityValue(tx.activity || "");
        setLoadedActivityIdValue(tx.activityId || "");
        setIsWithGst(tx.isWithGst || false);
        setGstPercentage(tx.gstPercentage || 18);
        setPaymentMethod(tx.paymentMethod || "Cash");
        const nameVal = tx.title || tx.materialName || tx.workerName || tx.equipmentName || "";
        if (eType === "material") {
          setValues({ itemName: nameVal, quantity: tx.quantity || "", rate: tx.rate || "", brand: tx.brand || "", supplier: tx.supplier || "" });
        } else if (eType === "labour") {
          setValues({ workerName: nameVal, quantity: tx.quantity || "", rate: tx.rate || "", workType: tx.workType || "", contractor: tx.contractor || "", overtime: tx.overtime || "" });
        } else if (eType === "equipment") {
          setValues({ equipmentName: nameVal, quantity: tx.quantity || "", rate: tx.rate || "", model: tx.model || "", operator: tx.operator || "" });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isEditing, editingId]);

  useEffect(() => {
    if (!selectedProject || projects.length === 0) return;
    const matchedProj = projects.find(p => String(p._id || p.id) === String(selectedProject));
    if (!matchedProj) return;

    let resolvedPhaseId = loadedPhaseIdValue || "";
    if (!resolvedPhaseId && loadedPhaseValue) {
      const matchPh = matchedProj.selectedPhases?.find(
        ph => ph.phaseName?.toLowerCase() === loadedPhaseValue.toLowerCase() || ph.id === loadedPhaseValue
      );
      if (matchPh) resolvedPhaseId = matchPh.id;
    }
    if (resolvedPhaseId) {
      setSelectedPhaseId(resolvedPhaseId);
    }

    let resolvedActivityName = loadedActivityValue || "";
    if (resolvedPhaseId) {
      const matchPh = matchedProj.selectedPhases?.find(ph => ph.id === resolvedPhaseId);
      if (matchPh) {
        const matchAct = matchPh.activities?.find(
          a => a.name?.toLowerCase() === loadedActivityValue.toLowerCase() || a.id === loadedActivityValue || (loadedActivityIdValue && a.id === loadedActivityIdValue)
        );
        if (matchAct) resolvedActivityName = matchAct.name;
      }
    }
    if (resolvedActivityName) {
      setSelectedActivityName(resolvedActivityName);
    }
  }, [projects, selectedProject, loadedPhaseValue, loadedPhaseIdValue, loadedActivityValue, loadedActivityIdValue]);

  useEffect(() => {
    if (!isEditing && !isDuplicate) {
      setValues({});
      setUnit(UNIT_OPTIONS[entryType]?.[0] || "");
      setPaymentResult(null);
      appendedPaymentRef.current = null;
      setPaymentHistory([]);
    }
  }, [entryType, isEditing, isDuplicate]);

  useEffect(() => {
    if (selectedProject) {
      transactionAPI.getAll({ project: selectedProject, limit: 5 })
        .then(({ data }) => setRecentEntries(data.transactions || []))
        .catch(() => setRecentEntries([]));
    }
  }, [selectedProject]);

  const qty = parseFloat(values.quantity) || 0;
  const rate = parseFloat(values.rate) || 0;
  const overtime = parseFloat(values.overtime) || 0;
  const computedAmount = qty * rate;
  const overtimeAmount = overtime * rate;
  const totalAmount = computedAmount + overtimeAmount;
  const gstAmount = isWithGst ? totalAmount * (gstPercentage / 100) : 0;
  const grandTotal = totalAmount + gstAmount;

  const handleValue = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const handleAutocompleteSelect = (field, value) => {
    handleValue(field, value);
    setShowAutocomplete(false);
    setAutocompleteState({ field: null, suggestions: [] });
  };

  const handleAutocompleteInput = (field, val) => {
    handleValue(field, val);
    const suggestions = AUTOCOMPLETE_FIELDS[entryType]?.[field] || [];
    const filtered = suggestions.filter(s => s.toLowerCase().includes(val.toLowerCase()));
    if (val.length > 0 && filtered.length > 0) {
      setAutocompleteState({ field, suggestions: filtered });
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files].slice(0, 5));
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const fields = FIELDS[entryType];
    const required = fields.filter(f => f.required);
    const missing = required.filter(f => !values[f.key] || String(values[f.key]).trim() === "");
    if (missing.length > 0) {
      setErrMsg(`${missing[0].label} is required.`);
      return false;
    }
    if (!selectedProject) {
      setErrMsg("Please select a project.");
      return false;
    }
    if (computedAmount <= 0) {
      setErrMsg("Amount must be greater than 0.");
      return false;
    }
    if (paymentResult && paymentResult.requestEsign && !paymentResult.clientEmail) {
      setErrMsg("Please enter the client email for E-Signature.");
      return false;
    }
    setErrMsg("");
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const typeMap = { material: "Materials", labour: "Wages", equipment: "Expense" };
      const nameKey = entryType === "material" ? "itemName" : entryType === "labour" ? "workerName" : "equipmentName";

      const activePhase = phases.find(p => p.id === selectedPhaseId);
      const phaseName = activePhase?.phaseName || "";
      const activeAct = activePhase?.activities?.find(a => a.name === selectedActivityName);
      const activityId = activeAct?.id || activeAct?._id || "";

      let payload = {
        title: values[nameKey] || `${entryType} entry`,
        amount: grandTotal,
        type: typeMap[entryType],
        project: selectedProject,
        date: new Date(date).toISOString(),
        notes: notes || "",
        quantity: qty,
        rate: rate,
        unit: unit,
      };

      if (entryType === 'material') {
        payload.subType = "Purchase";
        payload.category = ""; // Web UI doesn't have material category
        payload.brand = values.brand || "";
        payload.supplier = values.supplier || "";
      } else if (entryType === 'labour') {
        payload.category = values.contractor || "";
        payload.remarks = values.workType || "";
      } else if (entryType === 'equipment') {
        payload.category = values.equipmentName || "";
        payload.supplier = values.operator || "";
      }

      Object.assign(payload, {
        floor: selectedFloor,
        floorId: "",
        phase: phaseName,
        phaseId: selectedPhaseId,
        activity: selectedActivityName,
        activityId: activityId,
        isWithGst: isWithGst,
        gstPercentage: gstPercentage,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        overtime: overtime,
        overtimeAmount: overtimeAmount,
        isPaid: !!paymentResult,
        paymentMethod: paymentResult?.method || paymentMethod,
        paymentDate: paymentResult?.paymentDate ? paymentResult.paymentDate.split("T")[0] : new Date().toISOString().split("T")[0],
        paymentHistory: paymentHistory,
        ...(isDuplicate && sourceTransactionId ? { sourceTransactionId: sourceTransactionId } : {}),
        ...(paymentResult ? {
          paidAmount: paymentResult.amount,
          paymentMode: paymentResult.apiMode,
          paymentStatus: paymentResult.status,
          notes: notes || paymentResult.note || "",
          ...(paymentResult.note ? { paymentNote: paymentResult.note } : {}),
        } : {}),
        ...(paymentResult?.requestEsign ? {
          requestEsign: true,
          clientEmail: paymentResult.clientEmail,
        } : {}),
      });

      const hasFiles = attachments.length > 0 || paymentResult?.receiptFile != null;

      if (paymentResult?.receiptFile) {
        const reader = new FileReader();
        payload.paymentReceipt = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(paymentResult.receiptFile);
        });
      }

      let finalData = payload;

      if (hasFiles) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          if (key === 'paymentHistory') {
             formData.append(key, JSON.stringify(payload[key]));
          } else {
             formData.append(key, payload[key]);
          }
        });

        attachments.forEach((file, idx) => {
          formData.append(`attachment_${idx}`, file);
        });
        finalData = formData;
      }

      if (isEditing) {
        await transactionAPI.update(editingId, finalData);
        setSuccessMsg("Entry updated successfully!");
        setTimeout(() => navigate(-1), 1500);
      } else {
        await transactionAPI.create(finalData);
        setSuccessMsg(`${entryType.charAt(0).toUpperCase() + entryType.slice(1)} entry saved successfully!`);
        setValues({});
        setSelectedProject("");
        setNotes("");
        setUnit(UNIT_OPTIONS[entryType]?.[0] || "");
        setSelectedFloor("");
        setSelectedPhaseId("");
          setSelectedActivityName("");
          setIsWithGst(false);
          setPaymentHistory([]);
          setPaymentResult(null);
        setAttachments([]);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setErrMsg(err.response?.data?.message || `Failed to ${isEditing ? "update" : "save"} entry.`);
    } finally {
      setSaving(false);
    }
  };

  const currentFields = FIELDS[entryType];
  const units = UNIT_OPTIONS[entryType] || [];
  const nameKey = entryType === "material" ? "itemName" : entryType === "labour" ? "workerName" : "equipmentName";

  const removePaymentResult = () => {
    if (isEditing && appendedPaymentRef.current) {
      setPaymentHistory(prev => prev.filter(p => p !== appendedPaymentRef.current));
      appendedPaymentRef.current = null;
    }
    setPaymentResult(null);
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: radius.sm,
    border: `1px solid ${colors.cardBorder}`, fontSize: 14, color: colors.textPrimary,
    background: colors.cardBg, outline: "none", fontFamily: typography.fontFamily,
  };

  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: colors.textLight, marginBottom: 6, letterSpacing: "0.05em",
  };

  const cardStyle = {
    background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`,
    boxShadow: shadows.card, padding: "24px", marginBottom: 16,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", background: colors.bgBase4, fontFamily: typography.fontFamily }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="ManualEntry" />
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />

      <div className="tour-header" style={{ background: colors.cardBg, borderBottom: `1px solid ${colors.cardBorder}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: colors.bgBase4, border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: colors.textPrimary }}>
          &larr;
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.textPrimary }}>{isEditing ? "Edit Entry" : isDuplicate ? "Repeat Entry" : "New Entry"}</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.textLight }}>{isEditing ? "Modify this transaction" : isDuplicate ? "Add another entry with similar details" : "Record a material, labour, or equipment entry"}</p>
        </div>
        <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
          <HelpCircle size={16} color={colors.textLight} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 100px", maxWidth: 720, margin: "0 auto", width: "100%" }}>
        <div className="tour-entry-types" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {ENTRY_TYPES.filter(t => allowedTypes.includes(t.key)).map(t => (
            <button key={t.key} onClick={() => !isEditing && !isDuplicate && setEntryType(t.key)}
              style={{
                flex: 1, padding: "12px 0", borderRadius: radius.sm, border: "none",
                fontWeight: 700, fontSize: 14, cursor: (isEditing || isDuplicate) ? "not-allowed" : "pointer",
                background: entryType === t.key ? gradients.primaryButton : colors.cardBg,
                color: entryType === t.key ? "#FFF" : colors.textSecondary,
                boxShadow: entryType === t.key ? "none" : shadows.card,
                transition: "all 0.15s",
                opacity: (isEditing || isDuplicate) && entryType !== t.key ? 0.5 : 1,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="tour-project-context" style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: 20, marginBottom: 24, boxShadow: shadows.card }}>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, background: "rgba(249, 115, 22, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: colors.primaryBlue, flexShrink: 0 }}>
              <Building size={16} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: "800", color: colors.textPrimary }}>Project Context</div>
              <div style={{ fontSize: 11.5, color: colors.textLight, marginTop: 1 }}>Configure scoping properties</div>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: `1px solid ${colors.divider || '#E7E8F5'}`, margin: "0 0 16px" }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: colors.textSecondary || '#6B7280', marginBottom: 6 }}>Project <span style={{ color: colors.error }}>*</span></label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedProject}
                  onChange={e => {
                    setSelectedProject(e.target.value);
                    setSelectedFloor("");
                    setSelectedPhaseId("");
                    setSelectedActivityName("");
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: "#FFF", fontSize: 13, fontWeight: "600", color: colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.projectName || p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: !selectedProject || floors.length === 0 ? "#C5CAE9" : colors.textSecondary || '#6B7280', marginBottom: 6 }}>Floor</label>
              <div style={{ position: "relative" }}>
                <select
                  disabled={!selectedProject || floors.length === 0}
                  value={selectedFloor || "Select Floor"}
                  onChange={e => {
                    setSelectedFloor(e.target.value === "Select Floor" ? "" : e.target.value);
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: !selectedProject || floors.length === 0 ? "#F9FAFB" : "#FFF", fontSize: 13, fontWeight: "600", color: !selectedProject || floors.length === 0 ? "#9CA3AF" : colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="Select Floor">Select Floor (All)</option>
                  {floors.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: !selectedProject || phases.length === 0 ? "#C5CAE9" : colors.textSecondary || '#6B7280', marginBottom: 6 }}>Phase</label>
              <div style={{ position: "relative" }}>
                <select
                  disabled={!selectedProject || phases.length === 0}
                  value={selectedPhaseId || "Select Phase"}
                  onChange={e => {
                    setSelectedPhaseId(e.target.value === "Select Phase" ? "" : e.target.value);
                    setSelectedActivityName("");
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: !selectedProject || phases.length === 0 ? "#F9FAFB" : "#FFF", fontSize: 13, fontWeight: "600", color: !selectedProject || phases.length === 0 ? "#9CA3AF" : colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="Select Phase">Select Phase (All)</option>
                  {phases.map(ph => (
                    <option key={ph.id} value={ph.id}>{ph.phaseName}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: !selectedProject || uniqueActivityNames.length === 0 ? "#C5CAE9" : colors.textSecondary || '#6B7280', marginBottom: 6 }}>Activity</label>
              <div style={{ position: "relative" }}>
                <select
                  disabled={!selectedProject || uniqueActivityNames.length === 0}
                  value={selectedActivityName || "Select Activity"}
                  onChange={e => {
                    setSelectedActivityName(e.target.value === "Select Activity" ? "" : e.target.value);
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: !selectedProject || uniqueActivityNames.length === 0 ? "#F9FAFB" : "#FFF", fontSize: 13, fontWeight: "600", color: !selectedProject || uniqueActivityNames.length === 0 ? "#9CA3AF" : colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="Select Activity">Select Activity (All)</option>
                  {uniqueActivityNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primaryBlue} strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>
              {entryType === "material" ? "Material Purchase Entry" : entryType === "labour" ? "Labour Entry" : "Equipment Entry"}
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>DATE <span style={{ color: colors.error }}>*</span></div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>

          {currentFields.map((f, idx) => {
            const fieldNode = (
              <div key={f.key} className={idx === 0 ? "tour-field-item" : ""} style={{ marginBottom: 16, position: "relative", zIndex: showAutocomplete && autocompleteState.field === f.key ? 50 : 1 }}>
                <div style={labelStyle}>
                  {f.label.toUpperCase()} {f.required && <span style={{ color: colors.error }}>*</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: colors.bgBase4, borderRadius: radius.sm, border: `1px solid ${colors.cardBorder}`, padding: "0 14px" }}>
                  {f.prefix && <span style={{ fontSize: 14, fontWeight: 600, color: colors.textLight }}>{f.prefix}</span>}
                  <input
                    type={f.type}
                    value={values[f.key] || ""}
                    onChange={e => handleAutocompleteInput(f.key, e.target.value)}
                    onFocus={() => {
                      const suggestions = AUTOCOMPLETE_FIELDS[entryType]?.[f.key] || [];
                      if (values[f.key] && suggestions.length > 0) {
                        const filtered = suggestions.filter(s => s.toLowerCase().includes(values[f.key].toLowerCase()));
                        if (filtered.length > 0) {
                          setAutocompleteState({ field: f.key, suggestions: filtered });
                          setShowAutocomplete(true);
                        }
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                    placeholder={f.placeholder}
                    min={f.min}
                    style={{ flex: 1, padding: "12px 0", border: "none", background: "transparent", outline: "none", fontSize: 14, color: colors.textPrimary }}
                  />
                </div>
                {showAutocomplete && autocompleteState.field === f.key && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                    background: "#FFFFFF", border: `1px solid ${colors.cardBorder}`,
                    borderRadius: radius.sm, boxShadow: shadows.card, maxHeight: 150, overflowY: "auto",
                  }}>
                    {autocompleteState.suggestions.map(s => (
                      <div key={s} onClick={() => handleAutocompleteSelect(f.key, s)}
                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: colors.textPrimary }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
            
            if (f.key === 'quantity') {
              return [
                fieldNode,
                <div key="unit-field" style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>UNIT <span style={{ color: colors.error }}>*</span></div>
                  <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              ];
            }
            return fieldNode;
          })}

          <div className="tour-amount-calc" style={{ background: "#F0F2FF", borderRadius: radius.sm, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.primaryBlue, letterSpacing: "0.08em", marginBottom: 4 }}>AMOUNT (₹)</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: colors.primaryBlue }}>
              ₹{computedAmount.toLocaleString("en-IN")}
            </div>
            {entryType === "labour" && overtime > 0 && (
              <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                + ₹{overtimeAmount.toLocaleString("en-IN")} overtime
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>NOTES (OPTIONAL)</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." rows={3}
              style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primaryPurple} strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>GST</span>
            </div>
            <button
              onClick={() => setIsWithGst(!isWithGst)}
              style={{
                width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                background: isWithGst ? colors.primaryBlue : "#E5E7EB",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: "50%", background: "#FFF",
                position: "absolute", top: 2, left: isWithGst ? 24 : 2,
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {isWithGst && (
            <div>
              <div style={labelStyle}>GST PERCENTAGE</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {GST_PERCENTAGES.map(pct => (
                  <button key={pct} onClick={() => setGstPercentage(pct)}
                    style={{
                      padding: "8px 16px", borderRadius: radius.sm, border: `1px solid ${gstPercentage === pct ? colors.primaryBlue : colors.cardBorder}`,
                      background: gstPercentage === pct ? `${colors.primaryBlue}10` : colors.cardBg,
                      color: gstPercentage === pct ? colors.primaryBlue : colors.textSecondary,
                      fontWeight: 600, fontSize: 13, cursor: "pointer",
                    }}>
                    {pct}%
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 12, background: "#FEF3C7", borderRadius: radius.sm, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.textPrimary }}>
                  <span>Subtotal</span>
                  <span>₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.textPrimary, marginTop: 4 }}>
                  <span>GST ({gstPercentage}%)</span>
                  <span>₹{gstAmount.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: colors.textPrimary, marginTop: 8, borderTop: "1px solid #E5E7EB", paddingTop: 8 }}>
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primaryLightBlue} strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>Payment</span>
            </div>
            <button
              onClick={() => {
                if (paymentResult) {
                  removePaymentResult();
                } else {
                  setShowPayNow(true);
                }
              }}
              style={{
                width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                background: paymentResult ? "#10B981" : "#E5E7EB",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: "50%", background: "#FFF",
                position: "absolute", top: 2, left: paymentResult ? 24 : 2,
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {paymentResult && (
            <div style={{ marginTop: 12 }}>
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: radius.sm, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <CheckCircle size={16} color="#16A34A" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#15803D" }}>Payment Recorded</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 2 }}>AMOUNT</div>
                    <div style={{ fontWeight: 800, color: "#15803D" }}>
                      ₹{Number(paymentResult.amount || 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 2 }}>METHOD</div>
                    <div style={{ fontWeight: 700, color: colors.textPrimary }}>{paymentResult.method}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 2 }}>STATUS</div>
                    <div style={{ fontWeight: 700, color: colors.textPrimary }}>{paymentResult.status}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 2 }}>DATE</div>
                    <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                      {paymentResult.paymentDate ? new Date(paymentResult.paymentDate).toLocaleDateString("en-IN") : ""}
                    </div>
                  </div>
                </div>
                {paymentResult.receiptFile && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, color: "#15803D", fontWeight: 600 }}>
                    <CheckCircle size={14} color="#16A34A" /> {paymentResult.receiptFile.name}
                  </div>
                )}
                <button
                  onClick={() => removePaymentResult()}
                  style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #86EFAC", borderRadius: radius.sm, padding: "6px 12px", color: "#166534", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                >
                  <X size={14} /> Remove payment
                </button>
              </div>
            </div>
          )}

          {isEditing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {paymentHistory.map((p, index) => (
                <div key={index} style={{ background: "#DCFCE7", border: "1px solid #16A34A", borderRadius: radius.sm, padding: "16px 12px", position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{fontSize: 11, color: "#166534", fontWeight: 600, marginBottom: 4}}>AMOUNT</div>
                    <input type="number" value={p.amount} onChange={e => { const newH = [...paymentHistory]; newH[index].amount = e.target.value; setPaymentHistory(newH); }} style={{...inputStyle, borderColor: "#16A34A", background: "#F0FDF4"}} />
                  </div>
                  <div>
                    <div style={{fontSize: 11, color: "#166534", fontWeight: 600, marginBottom: 4}}>METHOD</div>
                    <select value={p.method} onChange={e => { const newH = [...paymentHistory]; newH[index].method = e.target.value; setPaymentHistory(newH); }} style={{...inputStyle, borderColor: "#16A34A", background: "#F0FDF4"}}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{gridColumn: "span 2"}}>
                    <div style={{fontSize: 11, color: "#166534", fontWeight: 600, marginBottom: 4}}>DATE</div>
                    <input type="date" value={p.date ? new Date(p.date).toISOString().split("T")[0] : ""} onChange={e => { const newH = [...paymentHistory]; newH[index].date = e.target.value; setPaymentHistory(newH); }} style={{...inputStyle, borderColor: "#16A34A", background: "#F0FDF4"}} />
                  </div>
                  <button onClick={(e) => { e.preventDefault(); setPaymentHistory(paymentHistory.filter((_, i) => i !== index)); }} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#DC2626", cursor: "pointer" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tour-attachments" style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>Attachments</span>
          </div>

          <input ref={attachmentInputRef} type="file" accept="image/*,.pdf" multiple style={{ display: "none" }}
            onChange={handleAttachmentChange} />
          <button onClick={() => attachmentInputRef.current?.click()}
            disabled={attachments.length >= 5}
            style={{
              width: "100%", padding: "12px", borderRadius: radius.sm,
              border: `1px dashed ${colors.cardBorder}`, background: colors.bgBase4,
              cursor: attachments.length >= 5 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 13, color: colors.textSecondary, opacity: attachments.length >= 5 ? 0.5 : 1,
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {attachments.length >= 5 ? "Max 5 files" : "Add Attachments"}
          </button>

          {attachments.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {attachments.map((file, idx) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: colors.bgBase4, borderRadius: radius.sm,
                  border: `1px solid ${colors.cardBorder}`,
                }}>
                  <span style={{ fontSize: 12, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </span>
                  <button onClick={() => removeAttachment(idx)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: colors.error, fontSize: 14 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {recentEntries.length > 0 && !isEditing && !isDuplicate && (
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>Recent Entries</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentEntries.slice(0, 5).map((entry, idx) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", background: colors.bgBase4, borderRadius: radius.sm,
                  border: `1px solid ${colors.cardBorder}`,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{entry.title}</div>
                    <div style={{ fontSize: 11, color: colors.textLight }}>
                      {new Date(entry.date || entry.createdAt).toLocaleDateString("en-IN")} • {entry.type}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.primaryBlue }}>
                    ₹{(entry.amount || 0).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {errMsg && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: radius.sm, padding: "10px 14px", color: "#DC2626", fontSize: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {errMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: radius.sm, padding: "10px 14px", color: "#15803D", fontSize: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            {successMsg}
          </div>
        )}
        <button className="tour-save-btn" onClick={handleSave} disabled={saving}
          style={{
            width: "100%", padding: "16px 0", borderRadius: radius.md, border: "none",
            background: gradients.primaryButton, color: "#FFF", fontWeight: 700, fontSize: 16,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          {saving ? (
            <><div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFF", animation: "spin 0.7s linear infinite" }} /> Saving...</>
          ) : isEditing ? "Update Entry" : `Save ${entryType.charAt(0).toUpperCase() + entryType.slice(1)} Entry`}
        </button>
      </div>

      <PayNowSheet
        open={showPayNow}
        entryTitle={values[nameKey] || `${entryType} entry`}
        typeLabel={entryType === "material" ? "Material" : entryType === "labour" ? "Labour" : "Equipment"}
        vendorName={values.supplier || values.operator || ""}
        totalAmount={grandTotal}
        alreadyPaid={paymentHistory.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)}
        onClose={() => setShowPayNow(false)}
        onConfirm={(result) => {
          setPaymentResult(result);
          if (isEditing) {
            const histEntry = {
              amount: result.amount,
              method: result.method,
              date: result.paymentDate,
              note: result.note || "",
            };
            appendedPaymentRef.current = histEntry;
            setPaymentHistory(prev => [...prev, histEntry]);
          }
          setShowPayNow(false);
          setToast({ msg: "Payment added — confirm to save entry", type: "success" });
          setTimeout(clearToast, 2500);
        }}
      />
    </div>
  );
}