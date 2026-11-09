import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Download, Upload, FileSpreadsheet, Settings2, Undo2, AlertCircle, CheckCircle2,
  Info, X, Plus, Trash2, Loader2,
} from "lucide-react";
import { projectAPI, transactionAPI } from "../api";
import { BtButton, BtChip, BtBadge, BtProgress, BtIconButton, BtField, btToast } from "./ui";
import ConfirmDialog from "./ui/ConfirmDialog";

const MATERIAL_TEMPLATE_HEADERS = [
  "Date", "Project", "Floor", "Phase", "Activity", "Material / Item", "Unit",
  "Quantity", "Rate", "Brand", "Category", "Supplier", "IsWithGst", "GstPercentage", "Notes"
];

const LABOUR_TEMPLATE_HEADERS = [
  "Date", "Project", "Floor", "Phase", "Activity", "Labour Type", "Unit",
  "Quantity", "Rate", "Trade / Work Type", "Contractor / Team", "Overtime Amount", "Notes"
];

const EQUIPMENT_TEMPLATE_HEADERS = [
  "Date", "Project", "Floor", "Phase", "Activity", "Equipment Name", "Unit",
  "Quantity", "Rate", "Machinery Sub-Class / Model", "Operator / Vendor",
  "IsWithGst", "GstPercentage", "Notes"
];

const ALL_TEMPLATE_HEADERS = [
  "Date", "Project", "Floor", "Phase", "Activity", "Type", "Name",
  "Category / Trade", "Subtype", "Brand", "Supplier / Operator",
  "Quantity", "Unit", "Rate", "Overtime", "IsWithGst", "GstPercentage",
  "Payment Status", "Notes"
];

const CSV_COLUMNS = [
  'Date', 'Project', 'Floor', 'Phase', 'Activity', 'Type', 'Name',
  'Category / Trade', 'Subtype', 'Brand', 'Supplier / Operator',
  'Quantity', 'Unit', 'Rate', 'Overtime', 'IsWithGst', 'GstPercentage',
  'Payment Status', 'Notes'
];

const COLUMN_MAPPINGS = {
  material: {
    "Material / Item": "title",
    "Material Name": "title",
    "Item Name": "title",
    "Name": "title",
    "Unit": "unit",
    "Quantity": "quantity",
    "Qty": "quantity",
    "Rate": "rate",
    "Rate (₹)": "rate",
    "Brand": "brand",
    "Category": "category",
    "Supplier": "supplier",
    "Date": "date",
    "Project": "project",
    "Floor": "floor",
    "Phase": "phase",
    "Activity": "activity",
    "IsWithGst": "isWithGst",
    "isWithGst": "isWithGst",
    "iswithgst": "isWithGst",
    "GstPercentage": "gstPercentage",
    "gstPercentage": "gstPercentage",
    "gstpercentage": "gstPercentage",
    "Notes": "notes",
    "notes": "notes",
  },
  labour: {
    "Labour Type": "title",
    "Worker Name": "title",
    "Name": "title",
    "Unit": "unit",
    "Quantity": "quantity",
    "Number of Workers": "quantity",
    "Rate": "rate",
    "Rate per Worker": "rate",
    "Trade / Work Type": "workType",
    "Contractor / Team": "contractor",
    "Contractor": "contractor",
    "Overtime Amount": "overtime",
    "Overtime": "overtime",
    "Date": "date",
    "Project": "project",
    "Floor": "floor",
    "Phase": "phase",
    "Activity": "activity",
    "Notes": "notes",
    "notes": "notes",
  },
  equipment: {
    "Equipment Name": "title",
    "Name": "title",
    "Unit": "unit",
    "Quantity": "quantity",
    "Hours/Days": "quantity",
    "Rate": "rate",
    "Rate (₹)": "rate",
    "Machinery Sub-Class / Model": "model",
    "Model": "model",
    "Operator / Vendor": "operator",
    "Operator": "operator",
    "Date": "date",
    "Project": "project",
    "Floor": "floor",
    "Phase": "phase",
    "Activity": "activity",
    "IsWithGst": "isWithGst",
    "isWithGst": "isWithGst",
    "iswithgst": "isWithGst",
    "GstPercentage": "gstPercentage",
    "gstPercentage": "gstPercentage",
    "gstpercentage": "gstPercentage",
    "Notes": "notes",
    "notes": "notes",
  },
  all: {
    "Amount": "amount",
    
    
    "amount": "amount",
    "Total Amount": "amount",
    "Paid Amount": "paidAmount",
    "Paid": "paidAmount",
    "paid": "paidAmount",
    "paidAmount": "paidAmount",
    "Payment Mode": "paymentMode",
    "paymentMode": "paymentMode",
    "Type": "type",
    "type": "type",
    "Name": "title",
    "Title": "title",
    "name": "title",
    "title": "title",
    "Material Name": "title",
    "Material": "title",
    "Material / Item": "title",
    "Item Name": "title",
    "Worker Name": "title",
    "Labour Type": "title",
    "Equipment Name": "title",
    "Description": "title",
    "Unit": "unit",
    "unit": "unit",
    "Quantity": "quantity",
    "Qty": "quantity",
    "quantity": "quantity",
    "qty": "quantity",
    "Rate": "rate",
    "Rate (₹)": "rate",
    "rate": "rate",
    
    "Rate/Day": "rate",
    "Rent Rate": "rate",
    "Days": "quantity",
    "Duration": "quantity",
    "Worker Type": "title",
    "Equipment": "title",
    "Category / Trade": "category",
    "Category": "category",
    "category": "category",
    "Subtype": "subtype",
    "subtype": "subtype",
    "Brand": "brand",
    "brand": "brand",
    "Supplier / Operator": "supplier",
    "Supplier": "supplier",
    "supplier": "supplier",
    "Operator": "operator",
    "operator": "operator",
    "Overtime": "overtime",
    "overtime": "overtime",
    "IsWithGst": "isWithGst",
    "isWithGst": "isWithGst",
    "iswithgst": "isWithGst",
    "GstPercentage": "gstPercentage",
    "gstPercentage": "gstPercentage",
    "gstpercentage": "gstPercentage",
    "Payment Status": "paymentStatus",
    "paymentStatus": "paymentStatus",
    "Status": "paymentStatus",
    "status": "paymentStatus",
    "paymentstatus": "paymentStatus",
    "Date": "date",
    "date": "date",
    "Purchased Date": "date",
    "Payment Date": "paymentDate",
    "Transaction ID": "transactionId",
    "transactionId": "transactionId",
    "transactionid": "transactionId",
    "Project": "project",
    "Floor": "floor",
    "floor": "floor",
    "Phase": "phase",
    "phase": "phase",
    "Activity": "activity",
    "activity": "activity",
    "Notes": "notes",
    "notes": "notes",
  },
};

function parseCsv(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [], error: "CSV must have a header row and at least one data row" };

  const parseLine = (line) => {
    const result = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        let val = line.substring(start, i).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).trim();
        }
        result.push(val);
        start = i + 1;
      }
    }
    let lastVal = line.substring(start).trim();
    if (lastVal.startsWith('"') && lastVal.endsWith('"')) {
      lastVal = lastVal.substring(1, lastVal.length - 1).trim();
    }
    result.push(lastVal);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/\s+/g, " "));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length >= headers.length - 1 && vals.some(v => v)) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
      rows.push(row);
    }
  }
  return { headers, rows, error: null };
}

function detectEntryType(headers) {
  const lowercaseHeaders = headers.map(h => h.trim().toLowerCase());
  if (lowercaseHeaders.includes("type")) return "all";

  const headerStr = headers.join(" ").toLowerCase();
  if (headerStr.includes("material") || headerStr.includes("brand") || headerStr.includes("supplier")) return "material";
  if (headerStr.includes("worker") || headerStr.includes("wage") || headerStr.includes("labour") || headerStr.includes("overtime")) return "labour";
  if (headerStr.includes("machine") || headerStr.includes("equipment") || headerStr.includes("rental") || headerStr.includes("operator")) return "equipment";
  return null;
}

function normalizeStr(str) {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveProject(projectName, projects) {
  if (!projectName || !projects.length) return null;
  const norm = normalizeStr(projectName);
  return projects.find(p => normalizeStr(p.projectName) === norm) ||
         projects.find(p => normalizeStr(p.projectName).includes(norm) || norm.includes(normalizeStr(p.projectName))) ||
         null;
}

function resolveFloor(floorName, project) {
  if (!floorName || !project?.floors?.length) return floorName || "";
  const norm = normalizeStr(floorName);
  return project.floors.find(f => normalizeStr(f) === norm) || floorName;
}

function resolvePhase(phaseName, project) {
  if (!phaseName || !project?.selectedPhases?.length) return { phaseName: phaseName || "", phaseId: "" };
  const norm = normalizeStr(phaseName);
  const phase = project.selectedPhases.find(p => normalizeStr(p.phaseName) === norm) ||
                project.selectedPhases.find(p => normalizeStr(p.phaseName).includes(norm) || norm.includes(normalizeStr(p.phaseName)));
  if (phase) return { phaseName: phase.phaseName, phaseId: phase.id };
  return { phaseName, phaseId: "" };
}

function resolveActivity(activityName, project, phaseId) {
  if (!activityName || !project?.selectedPhases?.length) return { activityName: activityName || "", activityId: "" };
  const norm = normalizeStr(activityName);

  if (phaseId) {
    const phase = project.selectedPhases.find(p => p.id === phaseId);
    if (phase?.activities?.length) {
      const act = phase.activities.find(a => normalizeStr(a.name) === norm) ||
                  phase.activities.find(a => normalizeStr(a.name).includes(norm) || norm.includes(normalizeStr(a.name)));
      if (act) return { activityName: act.name, activityId: act.id };
    }
  }

  for (const phase of project.selectedPhases) {
    if (!phase.activities?.length) continue;
    const act = phase.activities.find(a => normalizeStr(a.name) === norm) ||
                phase.activities.find(a => normalizeStr(a.name).includes(norm) || norm.includes(normalizeStr(a.name)));
    if (act) return { activityName: act.name, activityId: act.id };
  }

  return { activityName, activityId: "" };
}

function mapRowToPayload(row, detectedType, columnMapping, projects) {
  const payload = {};
  
  if (row["Transaction ID"]) {
    payload._id = row["Transaction ID"];
  }

  for (const [csvCol, dbField] of Object.entries(columnMapping)) {
    const val = row[csvCol] || "";
    if (!val) continue;

    switch (dbField) {
      case "amount":
      case "paidAmount":
      case "quantity":
      case "rate":
      case "overtime":
      case "gstPercentage":
        payload[dbField] = Number(val) || 0;
        break;
      case "isWithGst":
        payload[dbField] = val.toLowerCase() === "yes" || val.toLowerCase() === "true" || val === "1";
        break;
      case "paymentStatus":
        {
          const clean = val.trim().toLowerCase();
          if (clean === "fully paid" || clean === "paid") {
            payload[dbField] = "Paid";
          } else if (clean === "partial" || clean === "partially paid") {
            payload[dbField] = "Partial";
          } else if (clean === "not paid" || clean === "unpaid" || clean === "pending") {
            payload[dbField] = "Pending";
          } else {
            payload[dbField] = "Pending";
          }
        }
        break;
      default:
        payload[dbField] = val;
    }
  }

  // Parse dynamic payment columns
  const paymentHistory = [];
  let paymentIdx = 1;
  while (row[`Payment ${paymentIdx} Amount`] !== undefined) {
    const pAmtStr = row[`Payment ${paymentIdx} Amount`];
    const pDate = row[`Payment ${paymentIdx} Date`];
    const pMode = row[`Payment ${paymentIdx} Mode`];
    
    if (pAmtStr) {
      const pAmt = Number(pAmtStr);
      if (!isNaN(pAmt) && pAmt > 0) {
        paymentHistory.push({
          amount: pAmt,
          date: pDate || new Date(),
          method: pMode || "Cash",
          note: "Imported from CSV"
        });
      }
    }
    paymentIdx++;
  }
  
  if (paymentHistory.length > 0) {
    payload.paymentHistory = paymentHistory;
  }

  if (payload.type) {
    const normType = normalizeStr(payload.type);
    if (normType.includes("material")) {
      payload.type = "Materials";
    } else if (normType.includes("labour") || normType.includes("wage")) {
      payload.type = "Wages";
    } else if (normType.includes("equipment") || normType.includes("expense")) {
      payload.type = "Expense";
    } else {
      payload.type = payload.type.charAt(0).toUpperCase() + payload.type.slice(1);
    }
  } else {
    const typeMap = { material: "Materials", labour: "Wages", equipment: "Expense" };
    payload.type = typeMap[detectedType] || "Expense";
  }

  const projectName = payload.project;
  const project = resolveProject(projectName, projects);
  if (project) {
    payload.project = project._id;
    payload._resolvedProject = project;
    payload._resolvedProjectName = project.projectName;

    if (payload.floor) {
      payload.floor = resolveFloor(payload.floor, project);
    }

    if (payload.phase) {
      const { phaseName, phaseId } = resolvePhase(payload.phase, project);
      payload.phase = phaseName;
      payload.phaseId = phaseId;

      if (payload.activity) {
        const { activityName, activityId } = resolveActivity(payload.activity, project, phaseId);
        payload.activity = activityName;
        payload.activityId = activityId;
      }
    } else if (payload.activity) {

      const { activityName, activityId } = resolveActivity(payload.activity, project, null);
      payload.activity = activityName;
      payload.activityId = activityId;
    }
  }

  return payload;
}


const TEMPLATE_OPTIONS = [
  { key: "all", label: "All types" },
  { key: "material", label: "Material" },
  { key: "labour", label: "Labour" },
  { key: "equipment", label: "Equipment" },
];

const TEMPLATE_LABEL = { all: "All types", material: "Material", labour: "Labour", equipment: "Equipment" };

const PROTECTED_COLUMNS = ["Date", "Project", "Name", "Type"];

function CustomizeTemplateSheet({ initialColumns, initialVisibility, onSave, onClose }) {
  const [columns, setColumns] = useState([...initialColumns]);
  const [visibility, setVisibility] = useState({ ...initialVisibility });
  const [newColumn, setNewColumn] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleVisibility = (col) => {
    setVisibility((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  const addColumn = () => {
    const trimmed = newColumn.trim();
    if (!trimmed || columns.includes(trimmed)) return;
    setColumns((prev) => [...prev, trimmed]);
    setVisibility((prev) => ({ ...prev, [trimmed]: true }));
    setNewColumn("");
  };

  const removeColumn = (col) => {
    setColumns((prev) => prev.filter((c) => c !== col));
    setVisibility((prev) => { const n = { ...prev }; delete n[col]; return n; });
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1300, background: "var(--scrim)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Customize template columns"
        style={{
          background: "var(--card)", borderRadius: "var(--r-sheet)", width: "100%", maxWidth: 520,
          maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "var(--shadow-raised)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "22px 24px 8px" }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              Customize template columns
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.45 }}>
              Choose which columns appear in the "All types" template.
            </p>
          </div>
          <BtIconButton icon={X} label="Close" onClick={onClose} />
        </div>

        <div style={{ padding: "12px 24px", display: "flex", gap: 10, alignItems: "flex-end" }}>
          <BtField
            label="Add a custom column"
            value={newColumn}
            onChange={(e) => setNewColumn(e.target.value)}
            placeholder="e.g. Invoice number"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColumn(); } }}
          />
          <BtButton variant="secondary" size="normal" icon={Plus} onClick={addColumn} disabled={!newColumn.trim()} style={{ height: 48, minHeight: 48, flexShrink: 0 }}>
            Add
          </BtButton>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 24px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {columns.map((col) => {
            const on = visibility[col] ?? true;
            const locked = PROTECTED_COLUMNS.includes(col);
            return (
              <div
                key={col}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 14px",
                  borderRadius: "var(--r-chip)", border: "1px solid var(--line)",
                  background: on ? "var(--card)" : "var(--fill)",
                }}
              >
                <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minHeight: 36, fontSize: 14, fontWeight: 600, color: on ? "var(--ink)" : "var(--ink-3)" }}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleVisibility(col)}
                    style={{ width: 18, height: 18, accentColor: "var(--ink)", cursor: "pointer" }}
                  />
                  {col}
                </label>
                {!locked && (
                  <BtIconButton icon={Trash2} label={`Remove ${col}`} size={36} onClick={() => removeColumn(col)} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "14px 24px 22px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <BtButton variant="secondary" size="small" onClick={onClose}>Cancel</BtButton>
          <BtButton variant="primary" size="small" onClick={() => onSave({ columns, visibility })}>Apply columns</BtButton>
        </div>
      </div>
    </div>
  );
}

function Banner({ tone = "neutral", icon: Icon, children, style = {} }) {
  const tones = {
    success: { bg: "var(--status-success-soft)", fg: "var(--status-success)", ink: "var(--ink)" },
    danger: { bg: "var(--status-danger-soft)", fg: "var(--status-danger)", ink: "var(--ink)" },
    warning: { bg: "var(--status-warning-soft)", fg: "var(--status-warning)", ink: "var(--ink)" },
    neutral: { bg: "var(--fill)", fg: "var(--ink-2)", ink: "var(--ink)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      style={{
        display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px",
        borderRadius: "var(--r-input)", background: t.bg, color: t.ink,
        fontSize: 14, lineHeight: 1.5, fontFamily: "var(--font-ui)", ...style,
      }}
    >
      {Icon && <Icon size={18} color={t.fg} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />}
      <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
    </div>
  );
}

export default function CsvImport({ onComplete }) {
  const fileRef = useRef(null);
  const completeTimerRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("all");
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importErrors, setImportErrors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [resolvedRows, setResolvedRows] = useState([]);
  const [showCustomizeSheet, setShowCustomizeSheet] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(
    () => Object.fromEntries(CSV_COLUMNS.map((c) => [c, true]))
  );

  useEffect(() => () => { if (completeTimerRef.current) clearTimeout(completeTimerRef.current); }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await projectAPI.getContext();
        const data = res.data?.projects || res.data || [];
        setProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("[CSV Import] Failed to fetch projects:", err);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!preview || loadingProjects) {
      return;
    }
    const columnMapping = COLUMN_MAPPINGS[selectedTemplate] || COLUMN_MAPPINGS.all;
    const resolved = preview.rows.map((row) => {
      const rowStatus = row["Row Status"] || row["RowStatus"] || row["Action"] || row["action"] || "";
      const statusLower = rowStatus.trim().toLowerCase();
      if (statusLower === "unchanged") {
        return { skipped: true, raw: row };
      }
      const payload = mapRowToPayload(row, selectedTemplate, columnMapping, projects);
      return { raw: row, payload };
    });
    setResolvedRows(resolved);
  }, [preview, projects, selectedTemplate, loadingProjects]);

  const handleFile = (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }
    setError("");
    setResult(null);
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { headers, rows, error: parseError } = parseCsv(e.target.result);
        if (parseError) { setError(parseError); setParsing(false); return; }

        const detectedType = detectEntryType(headers);
        setSelectedTemplate(detectedType || "all");
        setPreview({ headers, rows, total: rows.length, detectedType });
      } catch {
        setError("Failed to parse CSV file");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const getRowError = useCallback((resolved, index) => {
    const rowNum = index + 1;
    if (!resolved?.payload) return `Invalid row data on row ${rowNum}`;
    const p = resolved.payload;
    const raw = resolved.raw || {};

    if (!p._resolvedProject) {
      return `Could not resolve project "${raw["Project"] || "Unknown"}" on row ${rowNum}`;
    }

    const type = p.type || "Materials";
    if (type === "Materials" || selectedTemplate === "material") {
      const matName = (p.title || raw["Material Name"] || raw["Material"] || raw["Item Name"] || raw["Material / Item"] || raw["Name"] || raw["Description"] || "").trim();
      if (!matName || matName.toLowerCase() === "untitled") {
        return `Missing material name on row ${rowNum}`;
      }
    } else if (type === "Wages" || selectedTemplate === "labour") {
      const worker = (p.title || raw["Worker Name"] || raw["Worker"] || raw["Labour Type"] || raw["Labour"] || raw["Name"] || raw["Description"] || "").trim();
      if (!worker || worker.toLowerCase() === "untitled") {
        return `Missing worker type on row ${rowNum}`;
      }
    } else if (type === "Expense" || selectedTemplate === "equipment") {
      const equip = (p.title || raw["Equipment Name"] || raw["Equipment"] || raw["Machine"] || raw["Name"] || raw["Description"] || "").trim();
      if (!equip || equip.toLowerCase() === "untitled") {
        return `Missing equipment name on row ${rowNum}`;
      }
    } else {
      const name = (p.title || raw["Name"] || raw["Title"] || raw["Description"] || "").trim();
      if (!name || name.toLowerCase() === "untitled") {
        return `Missing item description on row ${rowNum}`;
      }
    }

    return null;
  }, [selectedTemplate]);

  const rowValidationErrors = useMemo(() => {
    if (!resolvedRows.length) return [];
    const errors = [];
    resolvedRows.forEach((r, idx) => {
      if (!r || r.skipped) return;
      const err = getRowError(r, idx);
      if (err) errors.push({ row: idx + 1, message: err });
    });
    return errors;
  }, [resolvedRows, getRowError]);

  const getRowStatus = (resolved, index) => {
    if (!resolved || resolved.skipped) return "skipped";
    const err = getRowError(resolved, index);
    if (err) return "error";
    return "ok";
  };

  const hasUnskipped = resolvedRows.some((r) => r && !r.skipped);
  const canProceedWithImport = hasUnskipped && rowValidationErrors.length === 0;

  const scheduleComplete = (payload, delay) => {
    if (!onComplete) return;
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    completeTimerRef.current = setTimeout(() => onComplete(payload), delay);
  };

  const doImport = async () => {
    if (!preview || !resolvedRows.length) return;

    if (rowValidationErrors.length > 0) {
      setError(`Row ${rowValidationErrors[0].row}: ${rowValidationErrors[0].message}`);
      return;
    }

    setImporting(true);
    setError("");
    const rowsToImport = resolvedRows.filter((r) => !r.skipped);
    setImportProgress({ current: 0, total: rowsToImport.length });

    try {
      const transactions = rowsToImport.map(({ payload }) => {
        const qty = payload.quantity || 0;
        const rt = payload.rate || 0;

        const pad = (n) => n.toString().padStart(2, "0");
        const formatLocalYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        let safeDate = formatLocalYMD(new Date());
        if (payload.date) {
          const parts = String(payload.date).trim().split(/[\/-]/);
          if (parts.length === 3) {
            const [dStr, mStr, yStr] = parts;
            if (yStr.length === 4) {
              safeDate = `${yStr}-${mStr.padStart(2, "0")}-${dStr.padStart(2, "0")}`;
            } else if (dStr.length === 4) {
              safeDate = `${dStr}-${mStr.padStart(2, "0")}-${yStr.padStart(2, "0")}`;
            } else {
              const dObj = new Date(String(payload.date).trim());
              if (!isNaN(dObj.getTime())) safeDate = formatLocalYMD(dObj);
            }
          } else {
            const dObj = new Date(String(payload.date).trim());
            if (!isNaN(dObj.getTime())) safeDate = formatLocalYMD(dObj);
          }
        }

        return {
          _id: payload._id,
          transactionId: payload._id || payload.transactionId,
          title: payload.title || "Item",
          type: payload.type || "Expense",
          project: payload.project,
          date: safeDate,
          quantity: qty,
          rate: rt,
          amount: payload.amount !== undefined ? payload.amount : (qty * rt),
          unit: payload.unit || "",
          brand: payload.brand || "",
          category: payload.category || "",
          supplier: payload.supplier || payload.operator || "",
          floor: payload.floor || "",
          phase: payload.phase || "",
          phaseId: payload.phaseId || "",
          activity: payload.activity || "",
          activityId: payload.activityId || "",
          isWithGst: payload.isWithGst || false,
          gst: payload.gstPercentage || 0,
          gstPercentage: payload.gstPercentage || 0,
          overtime: payload.overtime || 0,
          paymentHistory: payload.paymentHistory || [],
          paymentStatus: payload.paymentStatus || "Pending",
          paidAmount: payload.paidAmount,
          paymentMode: payload.paymentMode,
          notes: payload.notes || "",
          subType: payload.subtype || "",
          workType: payload.workType || "",
          contractor: payload.contractor || "",
          model: payload.model || "",
        };
      });

      // Create backup before bulk import
      try {
        await transactionAPI.backupCsv();
      } catch (backupErr) {
        console.warn("Failed to create backup, continuing with import", backupErr);
      }

      const response = await transactionAPI.createBulk({ transactions });
      const data = response.data?.results || response.data;

      const success = data?.successCount || 0;
      const failed = data?.failedCount || 0;
      const failures = data?.failures || [];

      setResult({ success, failed, total: preview.total });
      setImportErrors(failures.map((f) => ({ row: (f.index || 0) + 1, message: f.reason || "Import failed" })));
      setImportProgress({ current: preview.total, total: preview.total });

      if (failed > 0) {
        btToast(`Imported ${success} of ${preview.total} entries. ${failed} failed.`, { error: true });
      } else {
        btToast(`Imported ${success} ${success === 1 ? "entry" : "entries"}.`);
        // Let the summary stay visible for a moment before the host refreshes.
        scheduleComplete({ success, failed }, 1600);
      }
    } catch (err) {
      console.error("Bulk import error:", err);
      setError(err?.response?.data?.message || err.message || "Bulk import failed");
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    const hadFailures = result?.failed > 0;
    const snapshot = result ? { success: result.success, failed: result.failed } : null;
    setResult(null);
    setPreview(null);
    setImportErrors([]);
    setResolvedRows([]);
    setError("");
    if (hadFailures && snapshot) scheduleComplete(snapshot, 0);
  };

  const downloadTemplate = (type) => {
    let headers, filename;
    if (type === "material") {
      headers = MATERIAL_TEMPLATE_HEADERS;
      filename = "material_entries_template.csv";
    } else if (type === "labour") {
      headers = LABOUR_TEMPLATE_HEADERS;
      filename = "labour_entries_template.csv";
    } else if (type === "equipment") {
      headers = EQUIPMENT_TEMPLATE_HEADERS;
      filename = "equipment_entries_template.csv";
    } else {
      const visibleCols = CSV_COLUMNS.filter((c) => columnVisibility[c] ?? true);
      headers = visibleCols.length ? visibleCols : ALL_TEMPLATE_HEADERS;
      filename = "all_entries_template.csv";
    }
    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doRevert = async () => {
    setReverting(true);
    try {
      await transactionAPI.revertCsv();
      setConfirmRevert(false);
      btToast("Last upload reverted.");
      scheduleComplete({ success: true, revert: true }, 1400);
    } catch (err) {
      setConfirmRevert(false);
      btToast(err.response?.data?.message || "Failed to revert.", { error: true });
    } finally {
      setReverting(false);
    }
  };

  const openPicker = () => fileRef.current?.click();
  const importCount = resolvedRows.filter((r) => !r.skipped).length;
  const tableHead = { padding: "10px 12px", textAlign: "left" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "var(--font-ui)", color: "var(--ink)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0, flex: "1 1 320px" }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: "var(--r-tile)", background: "var(--fill)", color: "var(--ink)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <FileSpreadsheet size={22} strokeWidth={1.75} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              Import entries from CSV
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--ink-2)", maxWidth: 560 }}>
              Download a template, fill it in, then upload it. Projects, floors, phases and activities are matched for you.
            </p>
          </div>
        </div>
        <BtButton variant="destructive" size="small" icon={Undo2} onClick={() => setConfirmRevert(true)}>
          Revert last upload
        </BtButton>
      </div>

      {/* Template picker */}
      <div>
        <div className="bt-eyebrow" style={{ color: "var(--ink-3)", marginBottom: 10 }}>Template</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {TEMPLATE_OPTIONS.map((t) => (
            <BtChip key={t.key} label={t.label} selected={selectedTemplate === t.key} onClick={() => setSelectedTemplate(t.key)} aria-pressed={selectedTemplate === t.key} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <BtButton variant="secondary" size="small" icon={Download} onClick={() => downloadTemplate(selectedTemplate)}>
            Download {TEMPLATE_LABEL[selectedTemplate].toLowerCase()} template
          </BtButton>
          <BtButton variant="ghost" size="small" icon={Settings2} onClick={() => setShowCustomizeSheet(true)}>
            Customize columns
          </BtButton>
        </div>
      </div>

      {/* Upload */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        aria-label="Choose a CSV file to import"
        style={{ display: "none" }}
        onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a CSV file"
        onClick={openPicker}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        className="bt-hover-row"
        style={{
          border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--input-border)"}`,
          borderRadius: "var(--r-card)", padding: "26px 20px", textAlign: "center",
          background: dragOver ? "var(--accent-soft)" : "var(--ground)", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          transition: "border-color 150ms ease, background 150ms ease",
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--card)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
          {parsing ? <Loader2 size={20} style={{ animation: "spin 0.8s linear infinite" }} /> : <Upload size={20} strokeWidth={1.85} />}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
          {parsing ? "Reading your file…" : "Drop a CSV here, or click to browse"}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>CSV files only</div>
      </div>

      {loadingProjects && (
        <div style={{ fontSize: 13, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 8 }}>
          <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
          Loading your projects for matching…
        </div>
      )}

      {error && (
        <Banner tone="danger" icon={AlertCircle}>{error}</Banner>
      )}

      {/* Preview */}
      {preview && !result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 15 }}>
              <span><strong className="tnum">{preview.total}</strong> {preview.total === 1 ? "row" : "rows"} found</span>
              {preview.detectedType && <BtBadge tone="brand" showDot={false} label={`Detected: ${TEMPLATE_LABEL[preview.detectedType] || preview.detectedType}`} />}
            </div>
            <BtButton
              variant="primary"
              size="small"
              loading={importing}
              disabled={!canProceedWithImport}
              onClick={doImport}
            >
              {`Import ${importCount} ${importCount === 1 ? "entry" : "entries"}`}
            </BtButton>
          </div>

          {!loadingProjects && (hasUnskipped ? (
            canProceedWithImport ? (
              <Banner tone="success" icon={CheckCircle2}>
                <strong>All rows check out.</strong> Every changed row matched a project and is ready to import.
              </Banner>
            ) : (
              <Banner tone="danger" icon={AlertCircle}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {rowValidationErrors.length} {rowValidationErrors.length === 1 ? "row needs" : "rows need"} fixing before you can import
                </div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {rowValidationErrors.slice(0, 5).map((e) => (
                    <li key={e.row} style={{ marginBottom: 2 }}>{e.message}</li>
                  ))}
                </ul>
                {rowValidationErrors.length > 5 && (
                  <div style={{ marginTop: 4, fontSize: 13, color: "var(--ink-2)" }}>
                    and {rowValidationErrors.length - 5} more. Fix these in your CSV and upload it again.
                  </div>
                )}
                <div style={{ fontSize: 13, marginTop: 8, color: "var(--ink-2)" }}>
                  Your projects: {projects.length ? projects.map((p) => `"${p.projectName}"`).join(", ") : "none found"}
                </div>
              </Banner>
            )
          ) : (
            preview.total > 0 && (
              <Banner tone="neutral" icon={Info}>
                <strong>No changed rows found.</strong> All {preview.total} rows have their Row Status set to "unchanged". Change the status for the rows you want to update.
              </Banner>
            )
          ))}

          {importing && (
            <div>
              <BtProgress value={importProgress.total ? importProgress.current / importProgress.total : 0} />
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
                Importing {importProgress.total} {importProgress.total === 1 ? "row" : "rows"}…
              </div>
            </div>
          )}

          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-input)", overflow: "hidden", background: "var(--card)" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="bt-table" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={{ ...tableHead, width: 56 }}>Status</th>
                    {preview.headers.slice(0, 8).map((h) => (
                      <th key={h} style={tableHead}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row, i) => {
                    const resolved = resolvedRows[i];
                    const rowErr = resolved ? getRowError(resolved, i) : null;
                    const status = resolved ? getRowStatus(resolved, i) : "pending";
                    return (
                      <tr key={i}>
                        <td style={{ padding: "10px 12px" }} title={status === "skipped" ? "Skipped (unchanged)" : rowErr || "Valid row"}>
                          {status === "ok" ? (
                            <BtBadge tone="success" label="OK" showDot={false} />
                          ) : status === "error" ? (
                            <BtBadge tone="danger" label="Fix" showDot={false} />
                          ) : status === "skipped" ? (
                            <BtBadge tone="neutral" label="Skip" showDot={false} />
                          ) : (
                            <span style={{ color: "var(--ink-3)" }}>…</span>
                          )}
                        </td>
                        {preview.headers.slice(0, 8).map((h) => {
                          const isProjectCol = h === "Project";
                          const isResolved = resolved && status === "ok";
                          return (
                            <td
                              key={h}
                              style={{
                                padding: "10px 12px", fontSize: 13.5, whiteSpace: "nowrap",
                                color: isProjectCol && !isResolved ? "var(--status-danger)" : "var(--ink)",
                                fontWeight: isProjectCol ? 600 : 400,
                              }}
                            >
                              {row[h] || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {preview.total > 5 && (
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Showing the first 5 of {preview.total} rows</div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Banner tone={result.failed ? "warning" : "success"} icon={result.failed ? AlertCircle : CheckCircle2}>
            <strong>
              Imported <span className="tnum">{result.success}</span> of <span className="tnum">{result.total}</span> entries
            </strong>
            {result.failed > 0 && <span> ({result.failed} failed)</span>}
          </Banner>

          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-input)", overflow: "hidden", background: "var(--card)" }}>
            <table className="bt-table">
              <thead>
                <tr>
                  <th>Result</th>
                  <th className="num">Rows</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Rows in file</td><td className="num tnum">{result.total}</td></tr>
                <tr><td>Imported</td><td className="num tnum" style={{ color: "var(--status-success)", fontWeight: 600 }}>{result.success}</td></tr>
                <tr><td>Failed</td><td className="num tnum" style={{ color: result.failed ? "var(--status-danger)" : "var(--ink)", fontWeight: result.failed ? 600 : 400 }}>{result.failed}</td></tr>
              </tbody>
            </table>
          </div>

          {importErrors.length > 0 && (
            <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-input)", overflow: "hidden", background: "var(--card)" }}>
              <div style={{ maxHeight: 200, overflow: "auto" }}>
                <table className="bt-table">
                  <thead>
                    <tr><th style={{ width: 80 }}>Row</th><th>Why it failed</th></tr>
                  </thead>
                  <tbody>
                    {importErrors.map((err, idx) => (
                      <tr key={idx}>
                        <td className="tnum">{err.row}</td>
                        <td style={{ color: "var(--status-danger)" }}>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <BtButton variant="secondary" size="small" onClick={resetImport}>Import another file</BtButton>
          </div>
        </div>
      )}

      {showCustomizeSheet && (
        <CustomizeTemplateSheet
          initialColumns={CSV_COLUMNS}
          initialVisibility={columnVisibility}
          onSave={(res) => {
            setColumnVisibility(res.visibility);
            setShowCustomizeSheet(false);
          }}
          onClose={() => setShowCustomizeSheet(false)}
        />
      )}

      <ConfirmDialog
        open={confirmRevert}
        danger
        message="Revert your last CSV upload? This undoes every change made by that upload."
        confirmLabel={reverting ? "Reverting…" : "Revert upload"}
        onConfirm={() => { if (!reverting) doRevert(); }}
        onCancel={() => { if (!reverting) setConfirmRevert(false); }}
      />
    </div>
  );
}
