import { useState, useRef, useEffect } from "react";
import { projectAPI, transactionAPI } from "../api";
import { colors, radius, gradients } from "../styles/designTokens";

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
    "Type": "type",
    "type": "type",
    "Name": "title",
    "Title": "title",
    "name": "title",
    "title": "title",
    "Unit": "unit",
    "unit": "unit",
    "Quantity": "quantity",
    "Qty": "quantity",
    "quantity": "quantity",
    "qty": "quantity",
    "Rate": "rate",
    "Rate (₹)": "rate",
    "rate": "rate",
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
    "paymentstatus": "paymentStatus",
    "Date": "date",
    "date": "date",
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

  for (const [csvCol, dbField] of Object.entries(columnMapping)) {
    const val = row[csvCol] || "";
    if (!val) continue;

    switch (dbField) {
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

function CustomizeTemplateSheet({ initialColumns, initialVisibility, onSave, onClose }) {
  const [columns, setColumns] = useState([...initialColumns]);
  const [visibility, setVisibility] = useState({ ...initialVisibility });
  const [newColumn, setNewColumn] = useState('');

  const toggleVisibility = (col) => {
    setVisibility(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const addColumn = () => {
    const trimmed = newColumn.trim();
    if (!trimmed || columns.includes(trimmed)) return;
    setColumns(prev => [...prev, trimmed]);
    setVisibility(prev => ({ ...prev, [trimmed]: true }));
    setNewColumn('');
  };

  const removeColumn = (col) => {
    setColumns(prev => prev.filter(c => c !== col));
    setVisibility(prev => { const n = { ...prev }; delete n[col]; return n; });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#FFF', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520,
        padding: '24px 24px 40px', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.textPrimary }}>Customize Template Columns</h3>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: colors.bgBase4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: colors.textLight,
          }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={newColumn} onChange={e => setNewColumn(e.target.value)}
            placeholder="Add custom column..."
            onKeyDown={e => e.key === 'Enter' && addColumn()}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: radius.sm,
              border: `1px solid ${colors.cardBorder}`, fontSize: 13, outline: 'none',
            }} />
          <button onClick={addColumn} style={{
            padding: '10px 16px', borderRadius: radius.sm, border: 'none',
            background: colors.primaryBlue, color: '#FFF', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>Add</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {columns.map((col) => (
            <div key={col} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: visibility[col] ? '#F8F9FF' : '#F5F5F5',
              borderRadius: radius.sm, border: `1px solid ${visibility[col] ? '#E0E5FF' : '#E5E5E5'}`,
              opacity: visibility[col] ? 1 : 0.6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" style={{ cursor: 'grab', flexShrink: 0 }}>
                <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="18" x2="16" y2="18" />
              </svg>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{col}</span>
              <button onClick={() => toggleVisibility(col)} style={{
                width: 24, height: 24, borderRadius: 6, border: 'none',
                background: visibility[col] ? `${colors.primaryBlue}15` : '#E5E5E5',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: visibility[col] ? colors.primaryBlue : colors.textLight,
              }}>
                {visibility[col] ? '✓' : '✕'}
              </button>
              {!['Date', 'Project', 'Name', 'Type'].includes(col) && (
                <button onClick={() => removeColumn(col)} style={{
                  width: 24, height: 24, borderRadius: 6, border: 'none',
                  background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#EF4444',
                }}>✕</button>
              )}
            </div>
          ))}
        </div>

        <button onClick={() => onSave({ columns, visibility })}
          style={{
            width: '100%', padding: '14px', borderRadius: radius.md, border: 'none',
            background: gradients.primaryButton, color: '#FFF',
            fontWeight: 800, fontSize: 15, cursor: 'pointer',
          }}>
          Apply Customization
        </button>
      </div>
    </div>
  );
}

export default function CsvImport({ onComplete }) {
  const fileRef = useRef(null);
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
  const [columnVisibility, setColumnVisibility] = useState(
    () => Object.fromEntries(CSV_COLUMNS.map(c => [c, true]))
  );

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const currentUser = localStorage.getItem("bt_user");
        console.log("[CSV Import] Currently logged-in user in localStorage:", currentUser);
        const res = await projectAPI.getContext();
        const data = res.data?.projects || res.data || [];
        const projectList = Array.isArray(data) ? data : [];
        console.log("[CSV Import] Fetched projects for matching:", projectList);
        setProjects(projectList);
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
    if (!preview || !projects.length) {
      setResolvedRows([]);
      return;
    }
    const columnMapping = COLUMN_MAPPINGS[selectedTemplate] || COLUMN_MAPPINGS.all;
    const resolved = preview.rows.map(row => {
      const payload = mapRowToPayload(row, selectedTemplate, columnMapping, projects);
      return { raw: row, payload };
    });
    setResolvedRows(resolved);
  }, [preview, projects, selectedTemplate]);

  const handleFile = (file) => {
    if (!file || !file.name.endsWith(".csv")) {
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

  const doImport = async () => {
    if (!preview || !resolvedRows.length) return;

    const unresolved = resolvedRows.filter(r => !r.payload._resolvedProject);
    if (unresolved.length > 0) {
      const names = [...new Set(unresolved.map(r => r.raw["Project"] || "Unknown"))];
      setError(`Could not resolve project(s): ${names.join(", ")}. Make sure the project names match your existing projects.`);
      return;
    }

    setImporting(true);
    setError("");
    setImportErrors([]);
    setImportProgress({ current: 0, total: preview.total });

    const transactions = resolvedRows.map(({ payload }) => {
      const qty = payload.quantity || 0;
      const rt = payload.rate || 0;
      return {
        title: payload.title || "Untitled",
        type: payload.type || "Expense",
        project: payload.project,
        date: payload.date ? new Date(payload.date).toISOString() : new Date().toISOString(),
        quantity: qty,
        rate: rt,
        amount: qty * rt,
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
        paymentStatus: payload.paymentStatus || "Pending",
        notes: payload.notes || "",
        subType: payload.subtype || "",
        workType: payload.workType || "",
        contractor: payload.contractor || "",
        model: payload.model || "",
      };
    });

    try {
      const response = await transactionAPI.createBulk({ transactions });
      const data = response.data?.results || response.data;

      const success = data?.successCount || 0;
      const failed = data?.failedCount || 0;
      const failures = data?.failures || [];

      setResult({ success, failed, total: preview.total });
      setImportErrors(failures.map(f => ({ row: (f.index || 0) + 1, message: f.reason || "Import failed" })));
      setImportProgress({ current: preview.total, total: preview.total });

      if (onComplete) onComplete({ success, failed });
    } catch (err) {
      console.error("Bulk import error:", err);
      setError(err?.response?.data?.message || err.message || "Bulk import failed");
    } finally {
      setImporting(false);
    }
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
      const visibleCols = CSV_COLUMNS.filter(c => columnVisibility[c] ?? true);
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

  const getRowStatus = (resolved) => {
    if (!resolved?.payload?._resolvedProject) return "unresolved";
    return "ok";
  };

  const unresolvedCount = resolvedRows.filter(r => getRowStatus(r) === "unresolved").length;
  const allResolved = resolvedRows.length > 0 && unresolvedCount === 0;

  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e5e5", padding: 20, boxShadow: "0 2px 10px rgba(20,20,50,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `${colors.primaryBlue}10`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.primaryBlue} strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: colors.textLight, letterSpacing: '0.6em', textTransform: 'uppercase' }}>
            BULK ENTRY IMPORT
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: colors.textPrimary, marginTop: 2 }}>
            CSV Bulk Import
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: colors.textLight, lineHeight: 1.35, marginBottom: 18, marginTop: 6 }}>
        Import Materials, Labour, or Equipment entries. Download the template, fill it with your data including project names, and upload. Projects, floors, phases, and activities are automatically matched.
      </p>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          SELECT TEMPLATE
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All Types" },
            { key: "material", label: "Material" },
            { key: "labour", label: "Labour" },
            { key: "equipment", label: "Equipment" },
          ].map(t => (
            <button key={t.key} onClick={() => setSelectedTemplate(t.key)}
              style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${selectedTemplate === t.key ? "#F97316" : "#e5e5e5"}`,
                background: selectedTemplate === t.key ? "#FFF5F0" : "#fafafa",
                color: selectedTemplate === t.key ? "#F97316" : "#555",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
                transition: "all 0.2s",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => downloadTemplate(selectedTemplate)}
          style={{
            flex: 1, padding: "12px", borderRadius: 12, border: `1.5px solid ${colors.primaryBlue}`,
            background: "transparent", fontSize: 13, fontWeight: 700, color: colors.primaryBlue,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Template
        </button>
      </div>

      <button onClick={() => setShowCustomizeSheet(true)}
        style={{
          width: '100%', padding: '10px', borderRadius: 8, border: 'none',
          background: 'transparent', color: colors.primaryBlue,
          fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          marginBottom: 16,
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        Customize Template Columns
      </button>

      <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
        onChange={e => { handleFile(e.target.files[0]); e.target.value = ""; }} />

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${dragOver ? colors.primaryBlue : "#e5e5e5"}`,
          borderRadius: 12, padding: "28px 20px", textAlign: "center",
          background: dragOver ? "#F0F2FF" : "#fafafa", cursor: "pointer",
          transition: "all 0.2s", marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#444" }}>
          {parsing ? "Parsing…" : "Click to upload or drag and drop"}
        </div>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>CSV files only</div>
      </div>

      {loadingProjects && (
        <div style={{ fontSize: 12, color: colors.primaryBlue, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
          Loading projects for auto-matching...
        </div>
      )}

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#991b1b", fontSize: 13, marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {preview && !result && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, color: "#555" }}>
              <strong>{preview.total}</strong> rows found
              {preview.detectedType && (
                <span style={{ marginLeft: 8, padding: "2px 8px", background: "#FFF5F0", color: "#F97316", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                  Auto-detected: {preview.detectedType}
                </span>
              )}
            </div>
            <button onClick={doImport} disabled={importing || !allResolved}
              style={{
                padding: "8px 20px",
                background: importing ? "#FB923C" : !allResolved ? "#ccc" : gradients.primaryButton,
                color: "#fff",
                border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13,
                cursor: importing || !allResolved ? "not-allowed" : "pointer",
              }}>
              {importing ? `Importing ${importProgress.current}/${importProgress.total}…` : `Import ${preview.total} Entries`}
            </button>
          </div>

          {resolvedRows.length > 0 && (
            <div style={{
              marginBottom: 12, padding: "10px 14px", borderRadius: 10,
              background: allResolved ? "#dcfce7" : "#fef3c7",
              border: `1px solid ${allResolved ? "#86efac" : "#fde68a"}`,
              fontSize: 12,
            }}>
              {allResolved ? (
                <span style={{ color: "#166534" }}>
                  ✅ All {resolvedRows.length} rows matched to projects successfully. Ready to import!
                </span>
              ) : (
                <span style={{ color: "#92400e" }}>
                  ⚠️ {unresolvedCount} of {resolvedRows.length} rows could not be matched to a project. Fix the project names in your CSV.<br />
                  <span style={{ fontSize: 11.5, marginTop: 4, display: "inline-block", opacity: 0.85 }}>
                    <strong>Loaded projects in this account:</strong> {projects.length ? projects.map(p => `"${p.projectName}"`).join(", ") : "None (check your logged-in account)"}
                  </span>
                </span>
              )}
            </div>
          )}

          {importing && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: colors.primaryBlue, borderRadius: 3,
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                  transition: "width 0.3s",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 4, textAlign: "center" }}>
                Processing row {importProgress.current} of {importProgress.total}
              </div>
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600, color: "#555", borderBottom: "1px solid #eee", width: 30 }}>✓</th>
                  {preview.headers.slice(0, 8).map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #eee" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, i) => {
                  const resolved = resolvedRows[i];
                  const status = resolved ? getRowStatus(resolved) : "pending";
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "8px 6px", textAlign: "center" }}>
                        {status === "ok" ? (
                          <span style={{ color: "#22c55e", fontSize: 14 }}>✓</span>
                        ) : status === "unresolved" ? (
                          <span style={{ color: "#ef4444", fontSize: 14 }}>✗</span>
                        ) : (
                          <span style={{ color: "#aaa", fontSize: 14 }}>…</span>
                        )}
                      </td>
                      {preview.headers.slice(0, 8).map(h => {
                        const isProjectCol = h === "Project";
                        const isResolved = resolved && status === "ok";
                        return (
                          <td key={h} style={{
                            padding: "8px 10px",
                            color: isProjectCol && !isResolved ? "#dc2626" : "#333",
                            fontWeight: isProjectCol ? 600 : 400,
                          }}>
                            {row[h] || "—"}
                            {isProjectCol && isResolved && resolved.payload._resolvedProjectName && (
                              <span style={{ marginLeft: 4, fontSize: 10, color: "#22c55e" }}>✓</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {preview.total > 5 && (
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 8, textAlign: "center" }}>Showing 5 of {preview.total} rows</div>
          )}
        </div>
      )}

      {result && (
        <div>
          <div style={{
            background: result.failed ? "#fef9c3" : "#dcfce7",
            border: `1px solid ${result.failed ? "#fde047" : "#86efac"}`,
            borderRadius: 10, padding: "14px 16px", fontSize: 13, marginBottom: 12
          }}>
            {result.failed ? "⚠️" : "✅"} Imported <strong>{result.success}</strong> of {result.total} entries
            {result.failed > 0 && <span style={{ color: "#991b1b" }}> ({result.failed} failed)</span>}
          </div>

          {importErrors.length > 0 && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "14px 16px", fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>Import Errors:</div>
              <div style={{ maxHeight: 150, overflowY: "auto" }}>
                {importErrors.map((err, idx) => (
                  <div key={idx} style={{ padding: "4px 0", color: "#991b1b", borderBottom: "1px solid #FCA5A5" }}>
                    Row {err.row}: {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { setResult(null); setPreview(null); setImportErrors([]); setResolvedRows([]); }}
            style={{
              marginTop: 12, padding: "10px 20px", borderRadius: 8, border: "1px solid #e5e5e5",
              background: "#f3f4f6", fontSize: 13, fontWeight: 600, color: "#555", cursor: "pointer",
            }}>
            Import Another File
          </button>
        </div>
      )}

      {showCustomizeSheet && (
        <CustomizeTemplateSheet
          initialColumns={CSV_COLUMNS}
          initialVisibility={columnVisibility}
          onSave={(result) => {
            setColumnVisibility(result.visibility);
            setShowCustomizeSheet(false);
          }}
          onClose={() => setShowCustomizeSheet(false)}
        />
      )}
    </div>
  );
}
