import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { projectAPI, workerAPI, subscriptionAPI } from "../api";
import { resolveImageUrl } from "../utils/imageUrl";
import useProjectStore from "../stores/projectStore";
import { buildDefaultPhases, addCustomPhase, addActivityToPhase, mergePhasesWithDefaults } from "../utils/constructionPhases";
import {
  BtHero,
  BtSheet,
  BtPageHeader,
  BtCard,
  BtButton,
  BtIconButton,
  BtChip,
  BtField,
  BtSelect,
  BtTextarea,
  BtTile,
  formatInr,
} from "../components/ui";
import ModuleTour from "../components/ModuleTour";
import {
  ChevronDown, ChevronUp, Plus, Minus, X, Check, Camera, MapPin, Calendar, User, Phone,
  Building2, Layers, Bed, Settings, Zap, Flame, ChefHat, Sun,
  CalendarDays, HardHat, FileText, Hash, Upload, Download, Info,
  ClipboardList, Pencil, AlertCircle, CheckCircle2, HelpCircle
} from "lucide-react";

const buildingTypes = {
  Residential: ["Select Sub Type", "1 BHK", "2 BHK", "3 BHK", "Villa", "Apartment", "Duplex", "Penthouse", "Other (Custom)"],
  Educational: ["Select Sub Type", "School", "College", "University", "Training Center", "Library", "Other (Custom)"],
  Institutional: ["Select Sub Type", "Hospital", "Clinic", "Community Center", "Government Office", "Other (Custom)"],
  "Business / Commercial": ["Select Sub Type", "Office", "Shopping Mall", "Restaurant", "Hotel", "Warehouse", "Showroom", "Other (Custom)"],
  Industrial: ["Select Sub Type", "Factory", "Manufacturing Plant", "Godown", "Processing Unit", "Other (Custom)"],
};

const floorOptions = ["Ground", "1st", "2nd", "3rd", "4th", "Terrace", "Head Room"];
const landUnits = ["Sq ft", "Sq m", "Acres", "Hectares"];

const additionalFeatures = [
  "Balcony", "Car Parking", "Lift", "Terrace Access", "Interior Work",
  "Compound Wall", "Parapet Wall", "Waterproofing", "Putty", "False Ceiling",
  "Modular Kitchen", "Wardrobes", "Sump", "Septic Tank", "Rainwater Harvesting",
  "Borewell", "Solar Panels", "Generator", "CCTV", "Intercom",
  "Landscaping", "Paving", "Water Tanks", "Stairs", "Security Room",
  "Cladding", "Elevation", "Gates", "Grills", "Aluminium Work", "Glass Work",
];

const utilityServices = [
  "Main Electricity", "Temporary Connection", "Generator Backup",
  "Water Connection", "Borewell Motor", "Sump Motor",
];

const gasConnections = ["Piped Gas", "Cylinder Bank", "Gas Pipeline Routing"];
const kitchenReqs = ["Granite Counter", "Quartz Counter", "Stainless Steel Sink", "Chimney Provision", "Exhaust Fan Provision"];
const electricalPlumbing = ["Concealed Wiring", "Open Wiring", "3-Phase Connection", "AC Points", "Geyser Points"];
const terraceInterior = ["Weathering Course", "Cool Roof Paint", "Overhead Tank", "Solar Panels"];

const statusChips = ["Planning", "In Progress", "On Hold", "Completed", "Cancelled"];

const eyebrowStyle = { color: "var(--ink-3)", marginBottom: 10 };

/** Collapsible section card: icon tile, title, count, chevron. */
function Section({ title, icon: Icon, defaultOpen, children, count, className }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  return (
    <BtCard padding="0" className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%", minHeight: 64, padding: "0 20px", display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", background: "transparent", border: "none", textAlign: "left", fontFamily: "var(--font-ui)",
        }}
      >
        <BtTile icon={Icon} bg="var(--accent-soft)" fg="var(--accent-ink)" size={36} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
          {title}
          {count !== undefined && count > 0 && (
            <span className="tnum" style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: "var(--accent-ink)" }}>
              {count} selected
            </span>
          )}
        </span>
        <ChevronDown size={18} color="var(--ink-3)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && <div style={{ padding: "4px 20px 22px", borderTop: "1px solid var(--line)" }}><div style={{ paddingTop: 18 }}>{children}</div></div>}
    </BtCard>
  );
}

function SubHeading({ icon: Icon, children }) {
  return (
    <div className="bt-eyebrow" style={{ ...eyebrowStyle, display: "flex", alignItems: "center", gap: 6 }}>
      {Icon && <Icon size={13} strokeWidth={2} />}
      {children}
    </div>
  );
}

function ChipSelect({ options, selected, onChange, multi }) {
  const handleToggle = (opt) => {
    if (multi) {
      onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
    } else {
      onChange(opt);
    }
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(opt => {
        const isOn = multi ? selected.includes(opt) : selected === opt;
        return <BtChip key={opt} label={opt} selected={isOn} aria-pressed={isOn} onClick={() => handleToggle(opt)} />;
      })}
    </div>
  );
}

function Stepper({ label, value, onChange, min = 0, max = 99 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 15, color: "var(--ink)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BtIconButton icon={Minus} label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} />
        <span className="tnum" style={{ minWidth: 28, textAlign: "center", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{value}</span>
        <BtIconButton icon={Plus} label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} />
      </div>
    </div>
  );
}

/** Square checkbox used in the phase / activity pickers. */
function CheckBox({ checked, partial, size = 22, label, onClick }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={partial ? "mixed" : checked}
      aria-label={label}
      onClick={onClick}
      style={{ width: 40, height: 40, margin: -8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}
    >
      <span
        style={{
          width: size, height: size, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
          border: `1.5px solid ${checked || partial ? "var(--ink)" : "var(--input-border)"}`,
          background: checked ? "var(--ink)" : "var(--card)", transition: "all 0.15s",
        }}
      >
        {checked && <Check size={size - 10} color="#FFFFFF" strokeWidth={3} />}
        {!checked && partial && <Minus size={size - 10} color="var(--ink)" strokeWidth={3} />}
      </span>
    </button>
  );
}

function CheckboxGroup({ items, selected, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
      {items.map(item => {
        const isOn = selected.includes(item);
        return (
          <button
            key={item}
            type="button"
            role="checkbox"
            aria-checked={isOn}
            onClick={() => onChange(isOn ? selected.filter(s => s !== item) : [...selected, item])}
            style={{
              display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "0 12px", borderRadius: "var(--r-tile)", cursor: "pointer",
              fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", textAlign: "left", transition: "all 0.15s",
              background: isOn ? "var(--accent-soft)" : "var(--card)",
              border: `1px solid ${isOn ? "var(--accent)" : "var(--input-border)"}`,
            }}
          >
            <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${isOn ? "var(--ink)" : "var(--input-border)"}`, background: isOn ? "var(--ink)" : "var(--card)" }}>
              {isOn && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
            </span>
            {item}
          </button>
        );
      })}
    </div>
  );
}

/** Inline message banner (error / success / info). */
function Banner({ tone = "info", icon: Icon, children, style }) {
  const map = {
    error: { bg: "var(--status-danger-soft)", fg: "var(--status-danger)" },
    success: { bg: "var(--status-success-soft)", fg: "var(--status-success)" },
    info: { bg: "var(--accent-soft)", fg: "var(--ink)" },
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: "var(--r-input)", background: map.bg, color: map.fg, fontFamily: "var(--font-ui)", fontSize: 14, lineHeight: 1.45, ...style }}
    >
      {Icon && <Icon size={18} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

/** In-page naming dialog for custom phases / activities (replaces window.prompt). */
function NameDialog({ title, label, initial = "", confirmLabel, onSubmit, onClose }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const err = onSubmit(value);
    if (err) setError(err);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--scrim)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)", padding: 16 }}
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        noValidate
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--card)", width: "100%", maxWidth: 440, borderRadius: "var(--r-card)", padding: 24, boxShadow: "var(--shadow-modal)", border: "1px solid var(--line)", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>{title}</h3>
          <BtIconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <BtField
          label={label}
          required
          autoFocus
          value={value}
          onChange={(e) => { setValue(e.target.value); if (error) setError(""); }}
          error={error}
          placeholder="e.g. Compound wall"
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <BtButton variant="secondary" onClick={onClose} style={{ flex: "1 1 120px" }}>Cancel</BtButton>
          <BtButton type="submit" variant="primary" style={{ flex: "2 1 180px" }}>{confirmLabel}</BtButton>
        </div>
      </form>
    </div>
  );
}

export default function NewProjectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-project-name', content: 'Enter the title of the project here.' },
    { target: '.tour-city', content: 'Specify the city or primary location of the site.' },
    { target: '.tour-client', content: 'Provide the client name and contact details.' },
    { target: '.tour-manager', content: 'Assign a manager or site engineer for this project.' },
    { target: '.tour-budget-config', content: 'Use these tools to download a budget template or upload a filled CSV to quickly populate project phases and estimated costs.' },
    { target: '.tour-budget-inputs', content: 'Or manually enter the estimated budget for materials, labour, equipment, and miscellaneous costs.' },
    { target: '.tour-building-type', content: 'Select the primary construction type and sub-category.' },
    { target: '.tour-floors', content: 'Select all the floors that will be built as part of this project.' },
    { target: '.tour-site-photos', content: 'Upload an initial site photo or project thumbnail.' },
    { target: '.tour-save-btn', content: 'Once all details and budgets are configured, click here to save the project.' }
  ];

  const editProject = location.state?.editProject || location.state?.project || null;
  const isEditMode = Boolean(editProject);

  const [projectName, setProjectName] = useState("");
  const [scope, setScope] = useState("");
  const [city, setCity] = useState("");
  const [mapAddress, setMapAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [siteEngineer, setSiteEngineer] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [manager, setManager] = useState("");
  const [supervisors, setSupervisors] = useState([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(true);
  const [mainType, setMainType] = useState("Residential");
  const [subType, setSubType] = useState("Select Sub Type");
  const [customSubType, setCustomSubType] = useState("");
  const [landArea, setLandArea] = useState("");
  const [landUnit, setLandUnit] = useState("Sq ft");
  const [selectedFloors, setSelectedFloors] = useState([]);
  const [rooms, setRooms] = useState({ room1BHK: 0, room2BHK: 0, room3BHK: 0, roomCustom: 0 });
  const [bathrooms, setBathrooms] = useState({ bathWestern: 0, bathIndian: 0, bathCommon: 0, bathAttached: 0 });
  const [features, setFeatures] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [gas, setGas] = useState([]);
  const [kitchen, setKitchen] = useState([]);
  const [electrical, setElectrical] = useState([]);
  const [terrace, setTerrace] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [budgetMaterial, setBudgetMaterial] = useState("");
  const [budgetLabour, setBudgetLabour] = useState("");
  const [budgetEquipment, setBudgetEquipment] = useState("");
  const [budgetMisc, setBudgetMisc] = useState("");
  const [status, setStatus] = useState("Planning");
  const [progress, setProgress] = useState(0);
  const [phases, setPhases] = useState(() => buildDefaultPhases());
  const [selectedActivityIds, setSelectedActivityIds] = useState(() => new Set());
  const [phasesExpanded, setPhasesExpanded] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [nameDialog, setNameDialog] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [projectCount, setProjectCount] = useState(0);

  const currentPlan = subscription?.plan?.toLowerCase() || 'free';
  const limitMaxProjects = subscription?.maxProjects !== undefined ? subscription.maxProjects : (currentPlan.includes('free') ? 1 : currentPlan.includes('starter') ? 2 : currentPlan.includes('growth') ? 4 : -1);

  const projectCode = isEditMode ? (editProject.projectCode || `CF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`) : `CF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  useEffect(() => {
    setSupervisorsLoading(true);
    workerAPI.getSupervisors()
      .then(({ data }) => setSupervisors(data.supervisors || []))
      .catch(() => setSupervisors([]))
      .finally(() => setSupervisorsLoading(false));

    projectAPI.getAll()
      .then(({ data }) => setProjectCount((data?.projects || data || []).length))
      .catch(() => {});

    subscriptionAPI.getStatus()
      .then(({ data }) => setSubscription(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEditMode && editProject) {
      setProjectName(editProject.projectName || editProject.name || editProject.title || "");
      setScope(editProject.scope || "");
      setCity(editProject.city || editProject.location || "");
      setMapAddress(editProject.mapAddress || "");
      setClientName(editProject.clientName || "");
      setContactNumber(editProject.contactNumber || "");
      setSiteEngineer(editProject.siteEngineer || editProject.siteEngineerName || "");
      setContractorName(editProject.contractorName || editProject.contractor || "");
      setManager(editProject.manager || "");
      setMainType(editProject.mainType || "Residential");
      setSubType(editProject.subType || "Select Sub Type");
      setCustomSubType(editProject.customSubType || "");
      setLandArea(editProject.landArea || "");
      setLandUnit(editProject.landUnit || "Sq ft");
      setSelectedFloors(editProject.floors || []);
      setRooms({
        room1BHK: editProject.room1BHK || 0, room2BHK: editProject.room2BHK || 0,
        room3BHK: editProject.room3BHK || 0, roomCustom: editProject.roomCustom || 0,
      });
      setBathrooms({
        bathWestern: editProject.bathWestern || 0, bathIndian: editProject.bathIndian || 0,
        bathCommon: editProject.bathCommon || 0, bathAttached: editProject.bathAttached || 0,
      });
      setFeatures(editProject.selectedFeatures || []);
      setUtilities(editProject.utilities || []);
      setGas(editProject.gas || []);
      setKitchen(editProject.kitchen || []);
      setElectrical(editProject.electrical || []);
      setTerrace(editProject.terrace || []);
      setBudgetMaterial(editProject.budgetMaterial ?? editProject.budget?.material ?? "");
      setBudgetLabour(editProject.budgetLabour ?? editProject.budget?.labour ?? "");
      setBudgetEquipment(editProject.budgetEquipment ?? editProject.budget?.equipment ?? "");
      setBudgetMisc(editProject.budgetMisc ?? editProject.budget?.misc ?? "");
      setStartDate(editProject.startDate ? new Date(editProject.startDate).toISOString().split("T")[0] : "");
      setExpectedEndDate(editProject.expectedEndDate ? new Date(editProject.expectedEndDate).toISOString().split("T")[0] : "");
      setStatus(editProject.status || editProject.projectStatus || "Planning");
      setProgress(editProject.progress || 0);
      if (editProject.selectedPhases && editProject.selectedPhases.length > 0) {
        const mergedPhases = mergePhasesWithDefaults(editProject.selectedPhases);
        setPhases(mergedPhases);
        const ids = new Set();
        editProject.selectedPhases.forEach(p => (p.activities || []).forEach(a => ids.add(a.id)));
        setSelectedActivityIds(ids);
      } else {
        setPhases(buildDefaultPhases());
        setSelectedActivityIds(new Set());
      }
      if (editProject.photo) {
        setPhotoPreview(resolveImageUrl(editProject.photo));
        setRemoveExistingPhoto(false);
      }
      if (editProject.documents) {
        setDocuments(editProject.documents);
      }
    } else {
      setPhases(buildDefaultPhases());
      setSelectedActivityIds(new Set());
    }
  }, [isEditMode, editProject]);

  const allActivityIds = useMemo(() => {
    const ids = new Set();
    phases.forEach(p => p.activities.forEach(a => ids.add(a.id)));
    return ids;
  }, [phases]);

  const toggleActivitySelection = (activityId) => {
    setSelectedActivityIds(prev => {
      const next = new Set(prev);
      if (next.has(activityId)) next.delete(activityId); else next.add(activityId);
      return next;
    });
  };

  const togglePhaseSelection = (phaseId) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;
    const actIds = phase.activities.map(a => a.id);
    const allSelected = actIds.every(id => selectedActivityIds.has(id));
    setSelectedActivityIds(prev => {
      const next = new Set(prev);
      actIds.forEach(id => { if (allSelected) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const selectAllPhases = () => setSelectedActivityIds(new Set(allActivityIds));
  const clearAllPhases = () => setSelectedActivityIds(new Set());
  const selectedCount = selectedActivityIds.size;
  const totalCount = allActivityIds.size;

  const movePhase = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= phases.length) return;
    const updated = [...phases];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setPhases(updated);
  };

  const handleAddCustomPhase = () => setNameDialog({ mode: "addPhase" });
  const handleRenamePhase = (phaseId) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) setNameDialog({ mode: "renamePhase", phaseId, initial: phase.phaseName });
  };
  const handleAddCustomActivity = (phaseId) => setNameDialog({ mode: "addActivity", phaseId });

  // Applies the name typed in the dialog. Returns an error message (dialog stays open) or null on success.
  const submitNameDialog = (rawName) => {
    const name = (rawName || "").trim();
    if (!name) return "Enter a name.";
    const { mode, phaseId } = nameDialog;
    const same = (x) => (x || "").trim().toLowerCase() === name.toLowerCase();

    if (mode === "addPhase") {
      if (phases.some(p => same(p.phaseName))) return "A phase with this name already exists.";
      const newPhaseId = `custom_phase_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const actId = `custom_act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newPhase = {
        id: newPhaseId,
        phaseName: name,
        isCustom: true,
        activities: [
          {
            id: actId,
            name,
            isCustom: true,
            completed: false,
            completedAt: null,
            budgetMaterial: 0,
            budgetLabour: 0,
            budgetEquipment: 0,
            photos: [],
            notes: "",
          }
        ],
      };
      setPhases(prev => [...prev, newPhase]);
      setSelectedActivityIds(prev => new Set(prev).add(actId));
      setPhasesExpanded(prev => ({ ...prev, [newPhaseId]: true }));
    } else if (mode === "renamePhase") {
      if (phases.some(p => p.id !== phaseId && same(p.phaseName))) return "A phase with this name already exists.";
      setPhases(prev => prev.map(p => p.id === phaseId ? { ...p, phaseName: name, isCustom: true } : p));
    } else if (mode === "addActivity") {
      const phase = phases.find(p => p.id === phaseId);
      if ((phase?.activities || []).some(a => same(a.name))) return "This phase already has an activity with this name.";
      const actId = `${phaseId}::custom_act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newAct = {
        id: actId,
        name,
        isCustom: true,
        completed: false,
        completedAt: null,
        budgetMaterial: 0,
        budgetLabour: 0,
        budgetEquipment: 0,
        photos: [],
        notes: "",
      };
      setPhases(prev => prev.map(p => {
        if (p.id !== phaseId) return p;
        return { ...p, activities: [...(p.activities || []), newAct] };
      }));
      setSelectedActivityIds(prev => new Set(prev).add(actId));
      setPhasesExpanded(prev => ({ ...prev, [phaseId]: true }));
    }
    setNameDialog(null);
    return null;
  };

  const handlePhotoFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemoveExistingPhoto(false);
  };

  const handleDocumentFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setDocumentFiles(prev => [...prev, ...files]);
    }
  };

  const removeDocumentFile = (index) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingDocument = (docPath) => {
    setDocuments(prev => prev.filter(d => d !== docPath));
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    setPhotoFile(null);
    setPhotoPreview(null);
    if (isEditMode && editProject.photo) setRemoveExistingPhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    setErrMsg("");
    setSuccessMsg("");
    setFieldErrors({});
    const focusFirstError = () => setTimeout(() => document.querySelector("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    if (!projectName.trim()) {
      setErrMsg("Project name is required.");
      setFieldErrors({ name: "Enter a project name." });
      focusFirstError();
      return;
    }

    if (startDate && expectedEndDate) {
      const s = new Date(startDate);
      const e = new Date(expectedEndDate);
      if (e < s) {
        setErrMsg("Expected End Date cannot be earlier than Start Date.");
        setFieldErrors({ endDate: "End date must be on or after the start date." });
        focusFirstError();
        return;
      }
    }

    if (!isEditMode && limitMaxProjects !== -1) {
      if (projectCount >= limitMaxProjects) {
        setErrMsg(`Your plan allows up to ${limitMaxProjects} projects. Please upgrade your plan to add more.`);
        return;
      }
    }

    const fd = new FormData();
    fd.append("projectName", projectName.trim());
    fd.append("projectCode", projectCode);
    fd.append("city", city);
    fd.append("location", city);
    fd.append("mapAddress", mapAddress);
    fd.append("clientName", clientName);
    fd.append("contactNumber", contactNumber);
    fd.append("siteEngineer", siteEngineer);
    fd.append("contractorName", contractorName);
    fd.append("manager", manager);
    fd.append("mainType", mainType);
    fd.append("subType", subType === "Other (Custom)" ? customSubType : subType);
    fd.append("landArea", landArea);
    fd.append("landUnit", landUnit);
    fd.append("floors", JSON.stringify(selectedFloors));
    fd.append("room1BHK", rooms.room1BHK);
    fd.append("room2BHK", rooms.room2BHK);
    fd.append("room3BHK", rooms.room3BHK);
    fd.append("roomCustom", rooms.roomCustom);
    fd.append("bathWestern", bathrooms.bathWestern);
    fd.append("bathIndian", bathrooms.bathIndian);
    fd.append("bathCommon", bathrooms.bathCommon);
    fd.append("bathAttached", bathrooms.bathAttached);
    fd.append("selectedFeatures", JSON.stringify(features));
    fd.append("utilities", JSON.stringify(utilities));
    fd.append("gas", JSON.stringify(gas));
    fd.append("kitchen", JSON.stringify(kitchen));
    fd.append("electrical", JSON.stringify(electrical));
    fd.append("terrace", JSON.stringify(terrace));
    fd.append("budgetMaterial", budgetMaterial || 0);
    fd.append("budgetLabour", budgetLabour || 0);
    fd.append("budgetEquipment", budgetEquipment || 0);
    fd.append("budgetMisc", budgetMisc || 0);
    fd.append("budget", Number(budgetMaterial || 0) + Number(budgetLabour || 0) + Number(budgetEquipment || 0) + Number(budgetMisc || 0));
    fd.append("startDate", startDate || "");
    fd.append("expectedEndDate", expectedEndDate || "");
    fd.append("status", status);
    fd.append("progress", progress);
    fd.append("scope", scope);
    fd.append("retainedDocuments", JSON.stringify(documents));
    if (photoFile) fd.append("photo", photoFile);

    documentFiles.forEach(file => {
      fd.append("documents", file);
    });

    const filteredPhases = phases
      .map(p => ({
        ...p,
        activities: (p.activities || []).filter(a => a.isCustom || selectedActivityIds.has(a.id))
      }))
      .filter(p => p.isCustom || (p.activities && p.activities.length > 0));
    fd.append("selectedPhases", JSON.stringify(filteredPhases));
    fd.append("selectedPhaseNames", JSON.stringify(filteredPhases.map(p => p.phaseName)));

    try {
      setSaving(true);
      if (isEditMode) {
        const projectId = editProject?._id || editProject?.id;
        if (!projectId) { setErrMsg("Project ID missing."); setSaving(false); return; }
        const res = await projectAPI.update(projectId, fd);
        const updatedProj = res.data?.project || res.data;
        if (updatedProj) {
          // Directly update store state without making another API call
          const store = useProjectStore.getState();
          store.setSelectedProject(updatedProj);
          useProjectStore.setState((state) => ({
            projects: state.projects.map((p) =>
              (p._id || p.id) === projectId ? updatedProj : p
            ),
          }));
        }
      } else {
        const res = await projectAPI.create(fd);
        const newProj = res.data?.project || res.data;
        if (newProj) {
          // Directly update store state without making another API call
          useProjectStore.setState((state) => ({
            projects: [newProj, ...state.projects],
          }));
        }
      }
      // Background refresh to sync with server
      useProjectStore.getState().fetchProjects({}, true).catch(() => {});
      setSuccessMsg(isEditMode ? "Project updated successfully!" : "Project created successfully!");
      setTimeout(() => navigate("/projects", { replace: true }), 600);
    } catch (err) {
      console.error("Save project error:", err);
      setErrMsg(err.response?.data?.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  const showSubTypeCustom = subType === "Other (Custom)";
  const subTypes = buildingTypes[mainType] || buildingTypes.Residential;
  const totalBudget = Number(budgetMaterial || 0) + Number(budgetLabour || 0) + Number(budgetEquipment || 0) + Number(budgetMisc || 0);


  const csvFileInputRef = useRef(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);

  const downloadPhaseTemplate = () => {
    const headers = ["phase", "particular", "qty", "unit", "material_rate", "budget_material_amount", "labour_rate", "budget_labour_amount", "equipment_rate", "budget_equipment_amount"];
    const sampleRow = ["Sub Structure", "Excavation Work", "100", "cu ft", "50", "5000", "30", "3000", "20", "2000"];
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "BuildTrack_Phase_Budget_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCurrentPhasesCsv = () => {
    const headers = ["phase", "particular", "qty", "unit", "material_rate", "budget_material_amount", "labour_rate", "budget_labour_amount", "equipment_rate", "budget_equipment_amount"];
    const rows = [];
    phases.forEach(p => {
      p.activities.forEach(a => {
        if (selectedActivityIds.has(a.id)) {
          rows.push([
            `"${p.phaseName}"`,
            `"${a.name}"`,
            a.qty || 0,
            `"${a.unit || ''}"`,
            a.materialRate || 0,
            a.budgetMaterial || a.materialAmount || 0,
            a.labourRate || 0,
            a.budgetLabour || a.labourAmount || 0,
            a.equipmentRate || 0,
            a.budgetEquipment || a.equipmentAmount || 0
          ].join(","));
        }
      });
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${projectName || "Project"}_Phases_Budget.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePhaseCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCsv(true);
    setErrMsg("");
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        throw new Error("CSV file is empty or missing headers");
      }

      const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
      const phaseIdx = headers.indexOf("phase");
      let particularIdx = headers.indexOf("particular");
      if (particularIdx === -1) particularIdx = headers.indexOf("activity");

      let qtyIdx = headers.indexOf("total_qty");
      if (qtyIdx === -1) qtyIdx = headers.indexOf("qty");

      const unitIdx = headers.indexOf("unit");
      const matRateIdx = headers.indexOf("material_rate");

      let matAmtIdx = headers.indexOf("budget_material_amount");
      if (matAmtIdx === -1) matAmtIdx = headers.indexOf("material_amount");

      const labRateIdx = headers.indexOf("labour_rate");

      let labAmtIdx = headers.indexOf("budget_labour_amount");
      if (labAmtIdx === -1) labAmtIdx = headers.indexOf("labour_amount");

      const eqRateIdx = headers.indexOf("equipment_rate");

      let eqAmtIdx = headers.indexOf("budget_equipment_amount");
      if (eqAmtIdx === -1) eqAmtIdx = headers.indexOf("equipment_amount");

      if (phaseIdx === -1 || particularIdx === -1) {
        throw new Error("CSV missing required 'phase' or 'particular' column headers");
      }

      const parseVal = (val) => {
        if (!val) return 0;
        const clean = val.replace(/[^0-9.]/g, "");
        return parseFloat(clean) || 0;
      };

      let updatedCount = 0;
      let matSum = 0;
      let labSum = 0;
      let eqSum = 0;

      const newPhases = [...phases];
      const newSelectedActivityIds = new Set(selectedActivityIds);

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
        if (row.length <= Math.max(phaseIdx, particularIdx)) continue;

        const phaseName = row[phaseIdx];
        const activityName = row[particularIdx];
        if (!phaseName || !activityName) continue;

        const qty = qtyIdx !== -1 && row[qtyIdx] ? parseVal(row[qtyIdx]) : undefined;
        const unit = unitIdx !== -1 && row[unitIdx] ? row[unitIdx] : "";

        const matRate = matRateIdx !== -1 && row[matRateIdx] ? parseVal(row[matRateIdx]) : undefined;
        const matAmt = matAmtIdx !== -1 && row[matAmtIdx] ? parseVal(row[matAmtIdx]) : undefined;

        const labRate = labRateIdx !== -1 && row[labRateIdx] ? parseVal(row[labRateIdx]) : undefined;
        const labAmt = labAmtIdx !== -1 && row[labAmtIdx] ? parseVal(row[labAmtIdx]) : undefined;

        const eqRate = eqRateIdx !== -1 && row[eqRateIdx] ? parseVal(row[eqRateIdx]) : undefined;
        const eqAmt = eqAmtIdx !== -1 && row[eqAmtIdx] ? parseVal(row[eqAmtIdx]) : undefined;

        let phaseObj = newPhases.find(p => p.phaseName.trim().toLowerCase() === phaseName.toLowerCase());
        if (!phaseObj) {
          phaseObj = {
            id: `custom_phase_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            phaseName: phaseName,
            isCustom: true,
            activities: [],
          };
          newPhases.push(phaseObj);
        }

        let actObj = phaseObj.activities.find(a => a.name.trim().toLowerCase() === activityName.toLowerCase());
        if (!actObj) {
          actObj = {
            id: `${phaseName.trim().toLowerCase()}::${activityName.trim().toLowerCase()}`,
            name: activityName,
            isCustom: true,
          };
          phaseObj.activities.push(actObj);
        }

        if (matAmt !== undefined) actObj.budgetMaterial = matAmt;
        if (labAmt !== undefined) actObj.budgetLabour = labAmt;
        if (eqAmt !== undefined) actObj.budgetEquipment = eqAmt;
        if (qty !== undefined) actObj.qty = qty;
        if (unit) actObj.unit = unit;

        newSelectedActivityIds.add(actObj.id);
        updatedCount++;

        if (matAmt) matSum += matAmt;
        if (labAmt) labSum += labAmt;
        if (eqAmt) eqSum += eqAmt;
      }

      setPhases(newPhases);
      setSelectedActivityIds(newSelectedActivityIds);

      if (matSum > 0) setBudgetMaterial(matSum.toString());
      if (labSum > 0) setBudgetLabour(labSum.toString());
      if (eqSum > 0) setBudgetEquipment(eqSum.toString());

      setSuccessMsg(`Successfully imported budget for ${updatedCount} phase activities!`);
    } catch (err) {
      setErrMsg(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingCsv(false);
      if (csvFileInputRef.current) csvFileInputRef.current.value = "";
    }
  };

  const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100%" }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="NewProject" />
      <input ref={csvFileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handlePhaseCsvUpload} />

      <BtHero>
        <BtPageHeader
          back={{ label: "Projects", onClick: () => navigate("/projects") }}
          eyebrow={isEditMode ? "Edit project" : "New project"}
          size="md"
          title={isEditMode ? "Edit Project" : "Create Project"}
          subtitle={isEditMode
            ? "Update project configurations, timelines, and budget breakdown."
            : "Configure project scope, budget allocation, floor breakdown, and construction phases."}
          actions={<BtIconButton icon={HelpCircle} label="Page tour" onDark onClick={() => setRunTour(true)} />}
        />
      </BtHero>

      <BtSheet>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {!isEditMode && limitMaxProjects !== -1 && (
            <Banner tone="info" icon={Info}>
              <strong>Project limits:</strong> you have created <strong className="tnum">{projectCount}</strong> of <strong className="tnum">{limitMaxProjects}</strong> projects on your plan.
              {projectCount >= limitMaxProjects && (
                <div style={{ marginTop: 8 }}>
                  <BtButton variant="primary" size="compact" onClick={() => navigate("/subscription")}>Upgrade Plan</BtButton>
                </div>
              )}
            </Banner>
          )}

          <BtCard padding="20px" className="tour-budget-config">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <BtTile icon={FileText} bg="var(--accent-soft)" fg="var(--accent-ink)" size={44} />
              <div style={{ minWidth: 0 }}>
                <div className="bt-eyebrow" style={{ color: "var(--ink-3)", marginBottom: 4 }}>Phases &amp; budget configuration</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Import or export CSV budgets for all phases.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <BtButton variant="secondary" size="small" icon={Download} onClick={downloadPhaseTemplate}>Download Template</BtButton>
              <BtButton variant="primary" size="small" icon={Upload} loading={isUploadingCsv} onClick={() => csvFileInputRef.current?.click()}>Upload Phase CSV</BtButton>
              <BtButton variant="secondary" size="small" onClick={exportCurrentPhasesCsv}>Export CSV</BtButton>
            </div>
          </BtCard>

          <Section title="Project Setup" icon={ClipboardList} defaultOpen>
            <div style={grid2}>
              <BtField
                className="tour-project-name"
                label="Project name"
                required
                value={projectName}
                onChange={e => { setProjectName(e.target.value); if (fieldErrors.name) setFieldErrors(f => ({ ...f, name: undefined })); }}
                placeholder="e.g. Skyline Towers"
                error={fieldErrors.name}
              />
              <BtField
                className="tour-city"
                label="City"
                icon={MapPin}
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Bengaluru"
              />
            </div>
          </Section>

          <Section title="Basic Information" icon={Info} defaultOpen>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={grid2}>
                <BtField label="Project code" icon={Hash} value={projectCode} disabled readOnly helperText="Generated automatically." onChange={() => {}} />
                <BtField label="Map location / address" icon={MapPin} value={mapAddress} onChange={e => setMapAddress(e.target.value)} placeholder="Full site address" />
              </div>

              <div className="tour-client">
                <SubHeading icon={User}>Client details</SubHeading>
                <div style={grid2}>
                  <BtField label="Client / owner" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client or owner name" />
                  <BtField label="Contact number" icon={Phone} type="tel" inputMode="numeric" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="10-digit mobile number" maxLength={10} />
                </div>
              </div>

              <div className="tour-manager">
                <SubHeading icon={HardHat}>Site team</SubHeading>
                <div style={grid2}>
                  <BtField label="Engineer in charge" value={siteEngineer} onChange={e => setSiteEngineer(e.target.value)} placeholder="Engineer name" />
                  <BtField label="Main contractor" value={contractorName} onChange={e => setContractorName(e.target.value)} placeholder="Contractor name" />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Building Type" icon={Building2} defaultOpen className="tour-building-type">
            <div style={grid2}>
              <BtSelect label="Main type" value={mainType} onChange={e => { setMainType(e.target.value); setSubType("Select Sub Type"); }}>
                {Object.keys(buildingTypes).map(t => <option key={t} value={t}>{t}</option>)}
              </BtSelect>
              <BtSelect label="Sub type" value={showSubTypeCustom ? "Other (Custom)" : subType} onChange={e => setSubType(e.target.value)}>
                {subTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </BtSelect>
            </div>
            {showSubTypeCustom && (
              <div style={{ marginTop: 16 }}>
                <BtField label="Custom sub type" value={customSubType} onChange={e => setCustomSubType(e.target.value)} placeholder="Enter custom sub type" />
              </div>
            )}
          </Section>

          <Section title="Land & Floors" icon={Layers} defaultOpen>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12 }}>
                <BtField label="Total land area" type="number" inputMode="decimal" min="0" value={landArea} onChange={e => setLandArea(e.target.value)} placeholder="2400" />
                <BtSelect label="Unit" value={landUnit} onChange={e => setLandUnit(e.target.value)}>
                  {landUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </BtSelect>
              </div>
              <div className="tour-floors">
                <SubHeading>Floors included</SubHeading>
                <ChipSelect options={floorOptions} selected={selectedFloors} onChange={setSelectedFloors} multi />
              </div>
            </div>
          </Section>

          <Section title="Rooms & Bathrooms" icon={Bed} defaultOpen={false} count={rooms.room1BHK + rooms.room2BHK + rooms.room3BHK + rooms.roomCustom + bathrooms.bathWestern + bathrooms.bathIndian + bathrooms.bathCommon + bathrooms.bathAttached}>
            <div className="bt-grid-2" style={{ gap: 24 }}>
              <div>
                <SubHeading>Room types</SubHeading>
                <Stepper label="1 BHK" value={rooms.room1BHK} onChange={v => setRooms(p => ({ ...p, room1BHK: v }))} />
                <Stepper label="2 BHK" value={rooms.room2BHK} onChange={v => setRooms(p => ({ ...p, room2BHK: v }))} />
                <Stepper label="3 BHK" value={rooms.room3BHK} onChange={v => setRooms(p => ({ ...p, room3BHK: v }))} />
                <Stepper label="Custom room" value={rooms.roomCustom} onChange={v => setRooms(p => ({ ...p, roomCustom: v }))} />
              </div>
              <div>
                <SubHeading>Bathroom types</SubHeading>
                <Stepper label="Western toilet" value={bathrooms.bathWestern} onChange={v => setBathrooms(p => ({ ...p, bathWestern: v }))} />
                <Stepper label="Indian toilet" value={bathrooms.bathIndian} onChange={v => setBathrooms(p => ({ ...p, bathIndian: v }))} />
                <Stepper label="Common bath" value={bathrooms.bathCommon} onChange={v => setBathrooms(p => ({ ...p, bathCommon: v }))} />
                <Stepper label="Attached bath" value={bathrooms.bathAttached} onChange={v => setBathrooms(p => ({ ...p, bathAttached: v }))} />
              </div>
            </div>
          </Section>

          <Section title="Additional Configuration" icon={Settings} defaultOpen={false} count={features.length}>
            <CheckboxGroup items={additionalFeatures} selected={features} onChange={setFeatures} />
          </Section>

          <Section title="Utility & Services" icon={Zap} defaultOpen={false} count={utilities.length}>
            <CheckboxGroup items={utilityServices} selected={utilities} onChange={setUtilities} />
          </Section>

          <Section title="Gas Connection" icon={Flame} defaultOpen={false} count={gas.length}>
            <CheckboxGroup items={gasConnections} selected={gas} onChange={setGas} />
          </Section>

          <Section title="Kitchen Requirements" icon={ChefHat} defaultOpen={false} count={kitchen.length}>
            <CheckboxGroup items={kitchenReqs} selected={kitchen} onChange={setKitchen} />
          </Section>

          <Section title="Electrical & Plumbing" icon={Zap} defaultOpen={false} count={electrical.length}>
            <CheckboxGroup items={electricalPlumbing} selected={electrical} onChange={setElectrical} />
          </Section>

          <Section title="Terrace & Interior" icon={Sun} defaultOpen={false} count={terrace.length}>
            <CheckboxGroup items={terraceInterior} selected={terrace} onChange={setTerrace} />
          </Section>

          <Section title="Dates, Budget & Status" icon={CalendarDays} defaultOpen>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <SubHeading>Project timeline</SubHeading>
                <div style={grid2}>
                  <BtField label="Start date" icon={Calendar} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <BtField
                    label="Expected end date"
                    icon={Calendar}
                    type="date"
                    value={expectedEndDate}
                    onChange={e => { setExpectedEndDate(e.target.value); if (fieldErrors.endDate) setFieldErrors(f => ({ ...f, endDate: undefined })); }}
                    error={fieldErrors.endDate}
                  />
                </div>
              </div>

              <div className="tour-budget-inputs">
                <SubHeading>Budget breakdown</SubHeading>
                <div className="bt-grid-2">
                  <BtField label="Materials" isCurrency type="number" inputMode="decimal" min="0" value={budgetMaterial} onChange={e => setBudgetMaterial(e.target.value)} placeholder="0" />
                  <BtField label="Labour" isCurrency type="number" inputMode="decimal" min="0" value={budgetLabour} onChange={e => setBudgetLabour(e.target.value)} placeholder="0" />
                  <BtField label="Equipment" isCurrency type="number" inputMode="decimal" min="0" value={budgetEquipment} onChange={e => setBudgetEquipment(e.target.value)} placeholder="0" />
                  <BtField label="Miscellaneous" isCurrency type="number" inputMode="decimal" min="0" value={budgetMisc} onChange={e => setBudgetMisc(e.target.value)} placeholder="0" />
                </div>
                {totalBudget > 0 && (
                  <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "var(--r-input)", background: "var(--fill)" }}>
                    <span style={{ fontSize: 14, color: "var(--ink-2)" }}>Total budget</span>
                    <strong className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)" }}>{formatInr(totalBudget)}</strong>
                  </div>
                )}
              </div>

              <div>
                <SubHeading>Project status</SubHeading>
                <ChipSelect options={statusChips} selected={status} onChange={setStatus} multi={false} />
              </div>
            </div>
          </Section>

          <Section title="Construction Phases" icon={ClipboardList} defaultOpen>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "12px 14px", borderRadius: "var(--r-input)", background: "var(--fill)", marginBottom: 14 }}>
              <div>
                <div className="tnum" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{selectedCount} of {totalCount} activities selected</div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>Select the phases and activities this project needs.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <BtButton variant="secondary" size="compact" onClick={selectAllPhases}>Select all</BtButton>
                <BtButton variant="secondary" size="compact" onClick={clearAllPhases}>Clear</BtButton>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {phases.map((phase, idx) => {
                const actIds = phase.activities.map(a => a.id);
                const allSel = actIds.length > 0 && actIds.every(id => selectedActivityIds.has(id));
                const someSel = actIds.some(id => selectedActivityIds.has(id));
                const isExpanded = phasesExpanded[phase.id] === true;
                return (
                  <div key={phase.id} style={{ background: "var(--card)", borderRadius: "var(--r-tile)", border: "1px solid var(--line)", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", padding: "10px 12px 10px 20px", gap: 12 }}>
                      <CheckBox checked={allSel} partial={!allSel && someSel} label={`Select all activities in ${phase.phaseName}`} onClick={() => togglePhaseSelection(phase.id)} />
                      <div style={{ flex: "1 1 120px", minWidth: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)", overflowWrap: "anywhere" }}>{phase.phaseName}</div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <BtIconButton icon={Pencil} size={36} label={`Rename ${phase.phaseName}`} onClick={() => handleRenamePhase(phase.id)} />
                        <BtIconButton icon={ChevronUp} size={36} label={`Move ${phase.phaseName} up`} onClick={() => movePhase(idx, -1)} disabled={idx === 0} />
                        <BtIconButton icon={ChevronDown} size={36} label={`Move ${phase.phaseName} down`} onClick={() => movePhase(idx, 1)} disabled={idx === phases.length - 1} />
                        <BtIconButton
                          icon={isExpanded ? Minus : Plus}
                          size={36}
                          label={`${isExpanded ? "Collapse" : "Expand"} ${phase.phaseName}`}
                          onClick={() => setPhasesExpanded(prev => ({ ...prev, [phase.id]: !isExpanded }))}
                        />
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid var(--line)", background: "var(--ground)" }}>
                        {phase.activities.map(act => {
                          const isSel = selectedActivityIds.has(act.id);
                          return (
                            <div key={act.id} className="bt-hover-row" onClick={() => toggleActivitySelection(act.id)}
                              style={{ display: "flex", alignItems: "center", minHeight: 44, padding: "0 16px 0 32px", gap: 12, cursor: "pointer", borderBottom: "1px solid var(--line)" }}>
                              <CheckBox checked={isSel} size={20} label={`Include ${act.name}`} onClick={(e) => { e.stopPropagation(); toggleActivitySelection(act.id); }} />
                              <span style={{ flex: 1, fontSize: 14, fontWeight: isSel ? 600 : 400, color: isSel ? "var(--ink)" : "var(--ink-2)" }}>{act.name}</span>
                            </div>
                          );
                        })}
                        <div style={{ padding: "8px 16px 8px 24px" }}>
                          <BtButton variant="ghost" size="compact" icon={Plus} onClick={() => handleAddCustomActivity(phase.id)}>Add custom activity</BtButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14 }}>
              <BtButton variant="secondary" size="small" icon={Plus} onClick={handleAddCustomPhase}>Add custom phase</BtButton>
            </div>
          </Section>

          <Section title="Site Photo" icon={Camera} defaultOpen={false}>
            <div className="tour-site-photos">
              <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/gif, image/webp" style={{ display: "none" }} onChange={e => handlePhotoFile(e.target.files[0])} />
              <div
                role="button"
                tabIndex={0}
                aria-label={photoPreview ? "Replace site photo" : "Upload site photo"}
                onClick={() => fileInputRef.current.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current.click(); } }}
                style={{
                  border: `2px dashed ${photoPreview ? "var(--ink)" : "var(--input-border)"}`, borderRadius: "var(--r-input)",
                  padding: photoPreview ? 0 : "28px 20px", background: photoPreview ? "transparent" : "var(--fill)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer", overflow: "hidden", minHeight: 120, justifyContent: "center",
                }}
              >
                {photoPreview ? (
                  <div style={{ position: "relative", width: "100%" }}>
                    <img src={photoPreview} alt="Site preview" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
                    <BtButton variant="onDark" size="compact" icon={X} onClick={removePhoto} style={{ position: "absolute", top: 10, right: 10, background: "var(--noir)" }}>Remove</BtButton>
                  </div>
                ) : (
                  <>
                    <BtTile icon={Upload} bg="var(--card)" fg="var(--ink)" size={44} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Click to upload a site photo</div>
                      <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>PNG, JPG, GIF, WebP up to 10MB</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Section>

          <Section title="Project Documents & Blueprints" icon={FileText} defaultOpen={false} count={documentFiles.length + documents.length}>
            <input type="file" multiple accept=".pdf,image/*,.doc,.docx" onChange={handleDocumentFiles} style={{ display: "none" }} id="doc-upload-input" />
            <label htmlFor="doc-upload-input" style={{ border: "2px dashed var(--input-border)", borderRadius: "var(--r-input)", minHeight: 64, padding: 16, background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", marginBottom: 12, color: "var(--ink)", fontSize: 14, fontWeight: 600 }}>
              <Upload size={18} />
              Upload documents / blueprints (PDF, images)
            </label>

            {(documents.length > 0 || documentFiles.length > 0) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {documents.map((doc, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--fill)", padding: "4px 6px 4px 14px", borderRadius: "var(--r-tile)", fontSize: 14 }}>
                    <span style={{ color: "var(--ink)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.split("/").pop()}</span>
                    <BtIconButton icon={X} size={36} label={`Remove ${doc.split("/").pop()}`} onClick={() => removeExistingDocument(doc)} />
                  </div>
                ))}
                {documentFiles.map((file, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--accent-soft)", padding: "4px 6px 4px 14px", borderRadius: "var(--r-tile)", fontSize: 14 }}>
                    <span style={{ color: "var(--ink)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name} (new)</span>
                    <BtIconButton icon={X} size={36} label={`Remove ${file.name}`} onClick={() => removeDocumentFile(idx)} />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Project Scope" icon={FileText} defaultOpen={false}>
            <BtTextarea
              label="Scope of work"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Describe the primary objectives and key milestones of the project..."
              rows={4}
            />
          </Section>

          {/* Sticky submit bar: messages + actions stay in reach while scrolling the long form */}
          <div
            style={{
              position: "sticky", bottom: 12, zIndex: 20, display: "flex", flexDirection: "column", gap: 12,
              padding: 12, borderRadius: "var(--r-card)", background: "var(--card)", border: "1px solid var(--line)", boxShadow: "var(--shadow-raised)",
            }}
          >
            {errMsg && <Banner tone="error" icon={AlertCircle}>{errMsg}</Banner>}
            {successMsg && <Banner tone="success" icon={CheckCircle2}>{successMsg}</Banner>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <BtButton variant="secondary" onClick={() => navigate("/projects")} disabled={saving} style={{ flex: "1 1 120px" }}>Cancel</BtButton>
              <span className="tour-save-btn" style={{ flex: "2 1 200px", display: "flex" }}>
                <BtButton variant="primary" fullWidth loading={saving} onClick={handleSubmit} icon={isEditMode ? Check : Plus}>
                  {isEditMode ? "Update Project" : "Create Project"}
                </BtButton>
              </span>
            </div>
          </div>
        </div>
      </BtSheet>

      {nameDialog && (
        <NameDialog
          key={`${nameDialog.mode}-${nameDialog.phaseId || ""}`}
          title={nameDialog.mode === "addPhase" ? "Add custom phase" : nameDialog.mode === "renamePhase" ? "Rename phase" : "Add custom activity"}
          label={nameDialog.mode === "addActivity" ? "Activity name" : "Phase name"}
          initial={nameDialog.initial || ""}
          confirmLabel={nameDialog.mode === "renamePhase" ? "Save name" : "Add"}
          onSubmit={submitNameDialog}
          onClose={() => setNameDialog(null)}
        />
      )}
    </div>
  );
}
