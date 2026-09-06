import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { projectAPI, workerAPI, subscriptionAPI } from "../api";
import { resolveImageUrl } from "../utils/imageUrl";
import useProjectStore from "../stores/projectStore";
import { buildDefaultPhases, addCustomPhase, addActivityToPhase, mergePhasesWithDefaults } from "../utils/constructionPhases";
import { Badge, Button } from "../components/ui";
import ModuleTour from "../components/ModuleTour";
import {
  ChevronDown, Plus, X, Check, Camera, MapPin, Calendar, User, Phone,
  Building2, Home, Layers, Bed, Bath, Settings, Zap, Flame, ChefHat, Sun,
  CalendarDays, DollarSign, HardHat, FileText, Hash, ArrowLeft, Upload,
  ClipboardList, Users, Wrench, HelpCircle
} from "lucide-react";

const TOPBAR_H = 65;

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

function Accordion({ title, icon, defaultOpen, children, count, subtitle }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  return (
    <div style={{ marginBottom: 14, background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 16, flexShrink: 0, color: '#F97316', display: 'flex' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{title}</span>
          {(count !== undefined || subtitle) && (
            <span style={{ fontSize: 12, color: "#64748B", marginLeft: 8 }}>
              {count !== undefined ? `(${count})` : subtitle}
            </span>
          )}
        </div>
        <ChevronDown size={16} color="#94A3B8" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </div>
      {open && <div style={{ padding: "0 18px 14px" }}>{children}</div>}
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
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(opt => {
        const isOn = multi ? selected.includes(opt) : selected === opt;
        return (
          <div key={opt} onClick={() => handleToggle(opt)}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500,
              cursor: "pointer", transition: "all 0.15s",
              background: isOn ? "#F97316" : "#F8FAFC",
              color: isOn ? "#fff" : "#475569",
              border: `1px solid ${isOn ? "#F97316" : "#E5E7EB"}`,
              fontFamily: 'inherit',
            }}>
            {opt}
          </div>
        );
      })}
    </div>
  );
}

function Stepper({ label, value, onChange, min = 0, max = 99 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))}
          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: 'inherit' }}>
          \u2212
        </button>
        <span style={{ width: 24, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#111827" }}>{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: 'inherit' }}>
          +
        </button>
      </div>
    </div>
  );
}

function CheckboxGroup({ items, selected, onChange, columns = 2 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 6 }}>
      {items.map(item => {
        const isOn = selected.includes(item);
        return (
          <label key={item} onClick={() => onChange(isOn ? selected.filter(s => s !== item) : [...selected, item])}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#475569", userSelect: "none", background: isOn ? "#FFF5F0" : "transparent", transition: "background 0.15s" }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isOn ? "#F97316" : "#CBD5E1"}`, background: isOn ? "#F97316" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
              {isOn && <Check size={10} color="#fff" strokeWidth={3} />}
            </div>
            {item}
          </label>
        );
      })}
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

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [projectName, setProjectName] = useState("");
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
  const [successMsg, setSuccessMsg] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [projectCount, setProjectCount] = useState(0);

  const currentPlan = subscription?.plan?.toLowerCase() || 'free';
  const limitMaxProjects = subscription?.maxProjects !== undefined ? subscription.maxProjects : (currentPlan.includes('free') ? 1 : currentPlan.includes('starter') ? 2 : currentPlan.includes('growth') ? 4 : -1);

  const projectCode = isEditMode ? (editProject.projectCode || `CF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`) : `CF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const handleAddCustomPhase = () => {
    const name = prompt("Enter custom phase name:");
    if (!name || !name.trim()) return;
    const phaseName = name.trim();
    const phaseId = `custom_phase_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const actId = `custom_act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newPhase = {
      id: phaseId,
      phaseName,
      isCustom: true,
      activities: [
        {
          id: actId,
          name: phaseName,
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
    setPhasesExpanded(prev => ({ ...prev, [phaseId]: true }));
  };

  const handleRenamePhase = (phaseId) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;
    const newName = prompt("Edit phase name:", phase.phaseName);
    if (!newName || !newName.trim()) return;
    const phaseName = newName.trim();
    const duplicate = phases.some(p => p.id !== phaseId && p.phaseName.trim().toLowerCase() === phaseName.toLowerCase());
    if (duplicate) {
      alert("A phase with this name already exists.");
      return;
    }
    setPhases(prev => prev.map(p => p.id === phaseId ? { ...p, phaseName, isCustom: true } : p));
  };

  const handleAddCustomActivity = (phaseId) => {
    const name = prompt("Enter custom activity name:");
    if (!name || !name.trim()) return;
    const actName = name.trim();
    const actId = `${phaseId}::custom_act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newAct = {
      id: actId,
      name: actName,
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
    if (!projectName.trim()) { setErrMsg("Project name is required."); return; }

    if (startDate && expectedEndDate) {
      const s = new Date(startDate);
      const e = new Date(expectedEndDate);
      if (e < s) {
        setErrMsg("Expected End Date cannot be earlier than Start Date.");
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

  const baseInput = { width: "100%", padding: "10px 12px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", fontFamily: "Inter, 'Segoe UI', sans-serif", background: "#F8FAFC" }}>
      <input ref={csvFileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handlePhaseCsvUpload} />

      <div style={{ height: TOPBAR_H, flexShrink: 0, background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AddNewProject" />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.03em" }}>{isEditMode ? "Edit Project" : "New Project"}</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>{isEditMode ? "Edit project configuration" : "Create a new construction project"}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
            <HelpCircle size={16} color="#64748B" />
          </button>
          <button onClick={() => navigate("/projects")} style={{ padding: "8px 16px", background: "#fff", color: "#475569", border: "1px solid #E5E7EB", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 24px 60px", boxSizing: "border-box" }}>
        <div className="tour-budget-config" style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "16px 20px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", maxWidth: 800, margin: "0 auto 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#10B9811A", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981" }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: "0.5px", textTransform: "uppercase" }}>PHASES & BUDGET CONFIGURATION</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Import/Export CSV budgets for all phases.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={downloadPhaseTemplate} style={{ flex: 1, padding: "9px 14px", background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#F97316", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
              <Upload size={14} style={{ transform: "rotate(180deg)" }} /> Download Template
            </button>
            <button onClick={() => csvFileInputRef.current?.click()} disabled={isUploadingCsv} style={{ flex: 1, padding: "9px 14px", background: "#F97316", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", cursor: isUploadingCsv ? "not-allowed" : "pointer", opacity: isUploadingCsv ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
              <Upload size={14} /> {isUploadingCsv ? "Uploading..." : "Upload Phase CSV"}
            </button>
            <button onClick={exportCurrentPhasesCsv} style={{ padding: "9px 14px", background: "#F1F5F9", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
              Export CSV
            </button>
          </div>
        </div>
        {errMsg && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#DC2626", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {errMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", color: "#166534", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={14} /> {successMsg}
          </div>
        )}

        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {!isEditMode && limitMaxProjects !== -1 && (
            <div style={{ padding: '12px', background: '#FFF5F0', borderRadius: 8, border: '1px solid #FDE8D8', display: 'flex', gap: 8, marginBottom: 20 }}>
              <div style={{ flexShrink: 0, color: '#F97316' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </div>
              <div style={{ fontSize: 13, color: '#111827' }}>
                <strong>Project Limits:</strong> You have created <strong>{projectCount}</strong> out of <strong>{limitMaxProjects}</strong> projects.
                {projectCount >= limitMaxProjects && (
                  <span style={{ marginLeft: 8, color: '#DC2626', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/subscription')}>
                    Upgrade Plan
                  </span>
                )}
              </div>
            </div>
          )}

          <Accordion title="Project Setup" icon={<ClipboardList size={16} />} defaultOpen>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 12 }}>
              <div className="tour-project-name">
                <label style={labelStyle}>Project Name *</label>
                <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Skyline Towers" style={baseInput} />
              </div>
              <div className="tour-city">
                <label style={labelStyle}>City</label>
                <div style={{ position: "relative" }}>
                  <MapPin size={14} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Bengaluru" style={{ ...baseInput, paddingLeft: 34 }} />
                </div>
              </div>
            </div>
          </Accordion>

          <Accordion title="Basic Information" icon={<InfoIcon />} defaultOpen>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Project Code</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E5E7EB" }}>
                <Hash size={14} color="#F97316" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{projectCode}</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Map Location / Address</label>
              <div style={{ position: "relative" }}>
                <MapPin size={14} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input value={mapAddress} onChange={e => setMapAddress(e.target.value)} placeholder="Full site address" style={{ ...baseInput, paddingLeft: 34 }} />
              </div>
            </div>

            <div className="tour-client" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <User size={14} color="#F97316" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Client Details</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client / Owner" style={baseInput} />
                <input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="+91 XXXXX XXXXX" maxLength={10} style={baseInput} />
              </div>
            </div>

            <div className="tour-manager">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <HardHat size={14} color="#F97316" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Site Team</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <input value={siteEngineer} onChange={e => setSiteEngineer(e.target.value)} placeholder="Engineer in charge" style={baseInput} />
                <input value={contractorName} onChange={e => setContractorName(e.target.value)} placeholder="Main contractor" style={baseInput} />
              </div>
            </div>
          </Accordion>

          <div className="tour-building-type">
            <Accordion title="Building Type" icon={<Building2 size={16} />} defaultOpen>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Main Type</label>
                <div style={{ position: "relative" }}>
                  <select value={mainType} onChange={e => { setMainType(e.target.value); setSubType("Select Sub Type"); }}
                    style={{ ...baseInput, appearance: "none", cursor: "pointer", paddingRight: 36 }}>
                    {Object.keys(buildingTypes).map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} color="#94A3B8" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Sub Type</label>
                <div style={{ position: "relative" }}>
                  <select value={showSubTypeCustom ? "Other (Custom)" : subType} onChange={e => setSubType(e.target.value)}
                    style={{ ...baseInput, appearance: "none", cursor: "pointer", paddingRight: 36 }}>
                    {subTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} color="#94A3B8" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              </div>
            </div>
            {showSubTypeCustom && (
              <div style={{ marginTop: 10 }}>
                <input value={customSubType} onChange={e => setCustomSubType(e.target.value)} placeholder="Enter custom sub type" style={baseInput} />
              </div>
            )}
            </Accordion>
          </div>

          <Accordion title="Land & Floors" icon={<Layers size={16} />} defaultOpen>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Total Land Area</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={landArea} onChange={e => setLandArea(e.target.value)} placeholder="2400" type="number" style={{ ...baseInput, flex: 2 }} />
                <div style={{ position: "relative", flex: 1 }}>
                  <select value={landUnit} onChange={e => setLandUnit(e.target.value)}
                    style={{ ...baseInput, appearance: "none", cursor: "pointer", paddingRight: 36 }}>
                    {landUnits.map(u => <option key={u}>{u}</option>)}
                  </select>
                  <ChevronDown size={14} color="#94A3B8" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              </div>
            </div>
            <div className="tour-floors">
              <label style={labelStyle}>Floors Included</label>
              <ChipSelect options={floorOptions} selected={selectedFloors} onChange={setSelectedFloors} multi />
            </div>
          </Accordion>

          <Accordion title="Rooms & Bathrooms" icon={<Bed size={16} />} count={rooms.room1BHK + rooms.room2BHK + rooms.room3BHK + rooms.roomCustom + bathrooms.bathWestern + bathrooms.bathIndian + bathrooms.bathCommon + bathrooms.bathAttached}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>Room Types</div>
              <Stepper label="1 BHK" value={rooms.room1BHK} onChange={v => setRooms(p => ({ ...p, room1BHK: v }))} />
              <Stepper label="2 BHK" value={rooms.room2BHK} onChange={v => setRooms(p => ({ ...p, room2BHK: v }))} />
              <Stepper label="3 BHK" value={rooms.room3BHK} onChange={v => setRooms(p => ({ ...p, room3BHK: v }))} />
              <Stepper label="Custom Room" value={rooms.roomCustom} onChange={v => setRooms(p => ({ ...p, roomCustom: v }))} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>Bathroom Types</div>
              <Stepper label="Western Toilet" value={bathrooms.bathWestern} onChange={v => setBathrooms(p => ({ ...p, bathWestern: v }))} />
              <Stepper label="Indian Toilet" value={bathrooms.bathIndian} onChange={v => setBathrooms(p => ({ ...p, bathIndian: v }))} />
              <Stepper label="Common Bath" value={bathrooms.bathCommon} onChange={v => setBathrooms(p => ({ ...p, bathCommon: v }))} />
              <Stepper label="Attached Bath" value={bathrooms.bathAttached} onChange={v => setBathrooms(p => ({ ...p, bathAttached: v }))} />
            </div>
          </Accordion>

          <Accordion title="Additional Configuration" icon={<Settings size={16} />} count={features.length}>
            <CheckboxGroup items={additionalFeatures} selected={features} onChange={setFeatures} />
          </Accordion>

          <Accordion title="Utility & Services" icon={<Zap size={16} />} count={utilities.length}>
            <CheckboxGroup items={utilityServices} selected={utilities} onChange={setUtilities} />
          </Accordion>

          <Accordion title="Gas Connection" icon={<Flame size={16} />} count={gas.length}>
            <CheckboxGroup items={gasConnections} selected={gas} onChange={setGas} />
          </Accordion>

          <Accordion title="Kitchen Requirements" icon={<ChefHat size={16} />} count={kitchen.length}>
            <CheckboxGroup items={kitchenReqs} selected={kitchen} onChange={setKitchen} />
          </Accordion>

          <Accordion title="Electrical & Plumbing" icon={<Zap size={16} />} count={electrical.length}>
            <CheckboxGroup items={electricalPlumbing} selected={electrical} onChange={setElectrical} />
          </Accordion>

          <Accordion title="Terrace & Interior" icon={<Sun size={16} />} count={terrace.length}>
            <CheckboxGroup items={terraceInterior} selected={terrace} onChange={setTerrace} />
          </Accordion>

          <Accordion title="Dates, Budget & Status" icon={<CalendarDays size={16} />} defaultOpen>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>Project Timeline</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Start Date *</label>
                  <div style={{ position: "relative" }}>
                    <Calendar size={14} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...baseInput, paddingLeft: 34, color: startDate ? "#111827" : "#94A3B8" }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Expected End Date</label>
                  <div style={{ position: "relative" }}>
                    <Calendar size={14} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <input type="date" value={expectedEndDate} onChange={e => setExpectedEndDate(e.target.value)} style={{ ...baseInput, paddingLeft: 34, color: expectedEndDate ? "#111827" : "#94A3B8" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="tour-budget-inputs" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>Budget Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Materials</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px" }}>
                    <DollarSign size={14} color="#F97316" />
                    <input value={budgetMaterial} onChange={e => setBudgetMaterial(e.target.value)} placeholder="0" type="number" style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "#111827", fontFamily: "inherit" }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Labour</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px" }}>
                    <DollarSign size={14} color="#0EA5E9" />
                    <input value={budgetLabour} onChange={e => setBudgetLabour(e.target.value)} placeholder="0" type="number" style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "#111827", fontFamily: "inherit" }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Equipment</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px" }}>
                    <DollarSign size={14} color="#EA580C" />
                    <input value={budgetEquipment} onChange={e => setBudgetEquipment(e.target.value)} placeholder="0" type="number" style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "#111827", fontFamily: "inherit" }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Miscellaneous</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px" }}>
                    <DollarSign size={14} color="#F59E0B" />
                    <input value={budgetMisc} onChange={e => setBudgetMisc(e.target.value)} placeholder="0" type="number" style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "#111827", fontFamily: "inherit" }} />
                  </div>
                </div>
              </div>
              {totalBudget > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#111827", textAlign: "right" }}>
                  Total: ₹{totalBudget.toLocaleString("en-IN")}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>Project Status</div>
              <ChipSelect options={statusChips} selected={status} onChange={setStatus} multi={false} />
            </div>
          </Accordion>

          <Accordion title="Construction Phases" icon={<ClipboardList size={16} />} defaultOpen>
            <div style={{ background: "#F8FAFC", borderRadius: 8, border: "1px solid #E5E7EB", padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>CONSTRUCTION PHASES</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#F97316", cursor: "pointer" }} onClick={selectAllPhases}>Select All</span>
                <span style={{ fontSize: 12, color: "#CBD5E1" }}>|</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", cursor: "pointer" }} onClick={clearAllPhases}>Clear</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Select phases and activities required.</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F97316", marginTop: 6 }}>{selectedCount} of {totalCount} activities selected</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {phases.map((phase, idx) => {
                const actIds = phase.activities.map(a => a.id);
                const allSel = actIds.every(id => selectedActivityIds.has(id));
                const someSel = actIds.some(id => selectedActivityIds.has(id));
                const isExpanded = phasesExpanded[phase.id] !== false;
                return (
                  <div key={phase.id} style={{ background: "#fff", borderRadius: 8, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 10 }}>
                      <div onClick={() => togglePhaseSelection(phase.id)}
                        style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${allSel ? "#F97316" : "#CBD5E1"}`, background: allSel ? "#F97316" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", transition: "all 0.15s" }}>
                        {allSel && <Check size={11} color="#fff" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{phase.phaseName}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button onClick={(e) => { e.stopPropagation(); handleRenamePhase(phase.id); }} style={{ padding: "2px 6px", fontSize: 11, background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 4, cursor: "pointer", color: "#475569" }}>✎</button>
                        <button onClick={(e) => { e.stopPropagation(); movePhase(idx, -1); }} disabled={idx === 0} style={{ padding: "2px 6px", fontSize: 11, background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 4, cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.4 : 1 }}>▲</button>
                        <button onClick={(e) => { e.stopPropagation(); movePhase(idx, 1); }} disabled={idx === phases.length - 1} style={{ padding: "2px 6px", fontSize: 11, background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 4, cursor: idx === phases.length - 1 ? "not-allowed" : "pointer", opacity: idx === phases.length - 1 ? 0.4 : 1 }}>▼</button>
                      </div>
                      <div onClick={() => setPhasesExpanded(prev => ({ ...prev, [phase.id]: !isExpanded }))} style={{ cursor: "pointer", display: "flex", color: "#94A3B8" }}>
                        <ChevronDown size={16} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.18s" }} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #F1F5F9" }}>
                        {phase.activities.map(act => {
                          const isSel = selectedActivityIds.has(act.id);
                          return (
                            <div key={act.id} onClick={() => toggleActivitySelection(act.id)}
                              style={{ display: "flex", alignItems: "center", padding: "8px 14px 8px 18px", gap: 8, cursor: "pointer", borderTop: "1px solid #F8FAFC" }}>
                              <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${isSel ? "#F97316" : "#CBD5E1"}`, background: isSel ? "#F97316" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                                {isSel && <Check size={10} color="#fff" strokeWidth={3} />}
                              </div>
                              <span style={{ flex: 1, fontSize: 13, fontWeight: isSel ? 500 : 400, color: isSel ? "#111827" : "#64748B" }}>{act.name}</span>
                            </div>
                          );
                        })}
                        <div onClick={() => handleAddCustomActivity(phase.id)} style={{ padding: "6px 14px 10px 18px", cursor: "pointer" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#F97316" }}>+ Add Custom Activity</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div onClick={handleAddCustomPhase} style={{ marginTop: 10, cursor: "pointer", padding: "4px 0" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#F97316" }}>+ Add Custom Phase</span>
            </div>
          </Accordion>

          <Accordion title="Site Photo" icon={<Camera size={16} />}>
            <div className="tour-site-photos">
              <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/gif, image/webp" style={{ display: "none" }} onChange={e => handlePhotoFile(e.target.files[0])} />
            <div onClick={() => fileInputRef.current.click()} style={{ border: `2px dashed ${photoPreview ? "#F97316" : "#E5E7EB"}`, borderRadius: 8, padding: photoPreview ? 0 : "24px 20px", background: photoPreview ? "transparent" : "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer", transition: "all 0.2s", overflow: "hidden", minHeight: 100, justifyContent: "center" }}>
              {photoPreview ? (
                <div style={{ position: "relative", width: "100%" }}>
                  <img src={photoPreview} alt="preview" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block", borderRadius: 8 }} />
                  <button onClick={removePhoto} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: 'inherit' }}>
                    <X size={12} /> Remove
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF5F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Upload size={18} color="#F97316" />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Click to upload site photo</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>PNG, JPG, GIF, WebP up to 10MB</div>
                  </div>
                </>
              )}
            </div>
            </div>
          </Accordion>

          <Accordion title="Project Documents & Blueprints" icon={<FileText size={16} />} count={documentFiles.length + documents.length}>
            <input type="file" multiple accept=".pdf,image/*,.doc,.docx" onChange={handleDocumentFiles} style={{ display: "none" }} id="doc-upload-input" />
            <label htmlFor="doc-upload-input" style={{ border: "2px dashed #E5E7EB", borderRadius: 8, padding: "16px", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", marginBottom: 12 }}>
              <Upload size={16} color="#F97316" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#F97316" }}>Upload Documents / Blueprints (PDF, Images)</span>
            </label>

            {(documents.length > 0 || documentFiles.length > 0) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {documents.map((doc, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F1F5F9", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>
                    <span style={{ color: "#334155", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.split("/").pop()}</span>
                    <button onClick={() => removeExistingDocument(doc)} style={{ border: "none", background: "none", color: "#DC2626", cursor: "pointer" }}><X size={14} /></button>
                  </div>
                ))}
                {documentFiles.map((file, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFF5F0", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>
                    <span style={{ color: "#F97316", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name} (New)</span>
                    <button onClick={() => removeDocumentFile(idx)} style={{ border: "none", background: "none", color: "#DC2626", cursor: "pointer" }}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </Accordion>

          <Accordion title="Project Scope" icon={<FileText size={16} />}>
            <textarea value={""} onChange={() => {}}
              placeholder="Describe the primary objectives and key milestones of the project..."
              rows={4}
              style={{ ...baseInput, resize: "vertical", lineHeight: 1.6, width: "100%", fontFamily: 'inherit' }} />
          </Accordion>
          {errMsg && (
            <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#991B1B", fontSize: 13, fontWeight: 600, marginTop: 12 }}>
              ⚠️ {errMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, color: "#166534", fontSize: 13, fontWeight: 600, marginTop: 12 }}>
              ✓ {successMsg}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <button className="tour-save-btn" onClick={handleSubmit} disabled={saving}
              style={{ minHeight: 46, padding: "12px 0", background: "#F97316", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.6 : 1, transition: "background 0.2s", fontFamily: 'inherit' }}>
              {saving ? <><SpinnerIcon /> Saving\u2026</> : isEditMode ? <><Check size={16} /> Update Project</> : <><Plus size={16} /> Create Project</>}
            </button>
            <button onClick={() => navigate("/projects")} disabled={saving}
              style={{ minHeight: 46, padding: "12px 0", background: "#fff", color: "#475569", border: "1px solid #E5E7EB", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.7s linear infinite" }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" opacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}