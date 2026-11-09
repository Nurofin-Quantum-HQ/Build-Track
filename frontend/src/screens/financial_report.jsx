import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { transactionAPI, userAPI } from "../api";
import useProjectStore from "../stores/projectStore";
import useTransactionStore from "../stores/transactionStore";
import perfLogger from "../utils/performanceLogger";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import RecordPaymentSheet from "../components/RecordPaymentSheet";
import CsvImport from "../components/CsvImport";
import {
  Sparkles,
  Building,
  ChevronDown,
  Download,
  SlidersHorizontal,
  PlusCircle,
  CreditCard,
  Edit2,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Check,
  RotateCcw,
  Search,
  FileText,
  User,
  Users,
  Package,
  Wrench,
  IndianRupee,
  HelpCircle,
  CheckCircle,
  Clock,
  Trash2,
  Table as TableIcon,
  LayoutGrid,
  Filter,
  FileSpreadsheet,
  ArrowUpDown,
  Building2,
  ChevronUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import ModuleTour from "../components/ModuleTour";
import { SpendVsBudgetChart } from "../components/Charts";
import {
  isReportEntry,
  mapTransactionToEntry,
  getPaymentStatusLabel,
  calculateFilteredCostSummary,
} from "../utils/reportCalculations";
import BtHero from "../components/ui/BtHero";
import BtSheet from "../components/ui/BtSheet";
import BtPageHeader from "../components/ui/BtPageHeader";
import BtCard from "../components/ui/BtCard";
import BtChip from "../components/ui/BtChip";
import BtSegmented from "../components/ui/BtSegmented";
import BtBadge from "../components/ui/BtBadge";
import BtEmpty, { BtErrorCard } from "../components/ui/BtEmpty";
import BtButton from "../components/ui/BtButton";
import BtIconButton from "../components/ui/BtIconButton";
import BtField, { BtSelect, BtTextarea } from "../components/ui/BtField";
import BtSkeleton from "../components/ui/BtSkeleton";
import btToast from "../components/ui/BtToast";
import { formatInr } from "../components/ui/BtCountUp";

const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

const parseSessionDate = (key) => {
  try {
    const val = sessionStorage.getItem(key);
    if (!val || val === "null" || val === "undefined") return null;
    const d = new Date(val);
    return isValidDate(d) ? d : null;
  } catch {
    return null;
  }
};

function formatINR(n) {
  return `\u20B9${Number(n || 0).toLocaleString("en-IN")}`;
}

function formatDateShort(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function formatDateLong(dt) {
  if (!dt) return "-";
  let dateObj = dt;
  if (!(dt instanceof Date)) {
    dateObj = new Date(dt);
  }
  if (isNaN(dateObj.getTime())) return String(dt);

  const isMidnightLocal =
    dateObj.getHours() === 0 &&
    dateObj.getMinutes() === 0 &&
    dateObj.getSeconds() === 0;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  if (isMidnightLocal) {
    return `${day} ${month} ${year}`;
  }

  const hour24 = dateObj.getHours();
  const ampm = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  const hour = String(hour12).padStart(2, "0");
  const minute = String(dateObj.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hour}:${minute} ${ampm}`;
}

// "Created At": the saved timestamp, or the one embedded in the Mongo id.
function formatCreatedAt(createdAt, rawId) {
  let d = createdAt ? new Date(createdAt) : null;
  if (
    (!d || isNaN(d.getTime()) || d.toISOString().endsWith("T00:00:00.000Z")) &&
    rawId &&
    String(rawId).length === 24
  ) {
    d = new Date(parseInt(String(rawId).substring(0, 8), 16) * 1000);
  }
  if (!d || isNaN(d.getTime())) return "\u2014";
  return formatDateLong(d);
}

const TYPE_LABELS = { material: "Material", labour: "Labour", equipment: "Equipment" };

const statusTone = (label) =>
  label === "Fully Paid" ? "success" : label === "Partial" ? "warning" : "danger";

const approvalTone = (status) =>
  status === "Approved" ? "success" : status === "Rejected" ? "danger" : "warning";

const COLUMN_WIDTHS = {
  "Created At": 170,
  "Purchased Date": 124,
  "Payment Date": 124,
  Project: 180,
  Type: 118,
  Description: 190,
  Material: 190,
  "Worker Type": 170,
  Equipment: 190,
  Brand: 120,
  Floor: 96,
  Phase: 130,
  Activity: 140,
  Unit: 84,
  Status: 128,
  Approval: 150,
};

const MONEY_COLS = new Set(["Amount", "Paid", "Remaining", "Rate", "Rate/Day", "Rent Rate"]);
const NUMBER_COLS = new Set(["Qty", "Days", "Duration"]);

const DEFAULT_COLS = {
  All: [
    "Purchased Date",
    "Project",
    "Type",
    "Description",
    "Brand",
    "Floor",
    "Phase",
    "Activity",
    "Unit",
    "Status",
    "Amount",
    "Paid",
    "Remaining",
    "Payment Date",
  ],
  Materials: [
    "Purchased Date",
    "Project",
    "Material",
    "Brand",
    "Rate",
    "Qty",
    "Unit",
    "Status",
    "Amount",
    "Paid",
    "Remaining",
    "Payment Date",
  ],
  Labour: [
    "Purchased Date",
    "Project",
    "Worker Type",
    "Rate/Day",
    "Days",
    "Status",
    "Amount",
    "Paid",
    "Remaining",
    "Payment Date",
  ],
  Equipment: [
    "Purchased Date",
    "Project",
    "Equipment",
    "Rent Rate",
    "Duration",
    "Status",
    "Amount",
    "Paid",
    "Remaining",
    "Payment Date",
  ],
};

const ALL_COLS = {
  All: [
    "Created At",
    "Purchased Date",
    "Project",
    "Type",
    "Description",
    "Brand",
    "Floor",
    "Phase",
    "Activity",
    "Unit",
    "Status",
    "Amount",
    "Paid",
    "Remaining",
    "Payment Date",
  ],
  Materials: [
    "Created At",
    "Purchased Date",
    "Project",
    "Material",
    "Brand",
    "Rate",
    "Qty",
    "Unit",
    "Floor",
    "Phase",
    "Activity",
    "Status",
    "Amount",
    "Paid",
    "Remaining",
    "Payment Date",
  ],
  Labour: [
    "Created At",
    "Purchased Date",
    "Project",
    "Worker Type",
    "Rate/Day",
    "Days",
    "Unit",
    "Floor",
    "Phase",
    "Activity",
    "Status",
    "Amount",
    "Paid",
    "Remaining",
    "Payment Date",
  ],
  Equipment: [
    "Created At",
    "Purchased Date",
    "Project",
    "Equipment",
    "Rent Rate",
    "Duration",
    "Unit",
    "Floor",
    "Phase",
    "Activity",
    "Status",
    "Amount",
    "Paid",
    "Remaining",
    "Payment Date",
  ],
};

export default function FinancialReportPage() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // App-wide toast (components/ui/BtToast); the page keeps its {msg, type} call shape.
  const setToast = useCallback(
    ({ msg, type }) => btToast(msg, { error: type === "error" }),
    []
  );

  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"

  const [selectedProjectId, setSelectedProjectId] = useState(
    () =>
      sessionStorage.getItem("fr_proj") ||
      useProjectStore.getState().selectedProject?._id ||
      "all"
  );
  const [selectedFloor, setSelectedFloor] = useState(
    () => sessionStorage.getItem("fr_floor") || ""
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState(
    () => sessionStorage.getItem("fr_phase") || ""
  );
  const [selectedActivityName, setSelectedActivityName] = useState(
    () => sessionStorage.getItem("fr_activity") || ""
  );
  const [datePreset, setDatePreset] = useState(
    () => sessionStorage.getItem("fr_datePreset") || "All Time"
  );
  const [startDate, setStartDate] = useState(() => parseSessionDate("fr_startDate"));
  const [endDate, setEndDate] = useState(() => parseSessionDate("fr_endDate"));

  const [activeTab, setActiveTab] = useState(
    () =>
      location.state?.activeTab ||
      sessionStorage.getItem("fr_tab") ||
      "All"
  );

  const [searchQuery, setSearchQuery] = useState(
    () => sessionStorage.getItem("fr_search") || ""
  );
  const [selectedItemName, setSelectedItemName] = useState(
    () => sessionStorage.getItem("fr_item") || ""
  );
  const [reportGenerated, setReportGenerated] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(
    () => sessionStorage.getItem("fr_payStatus") || "All"
  );
  const [sortColumn, setSortColumn] = useState("date");
  const [sortAscending, setSortAscending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const projectDropdownRef = useRef(null);
  const dateDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setProjectDropdownOpen(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        setDateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const [activeColumns, setActiveColumns] = useState(() => {
    try {
      if (user?.preferences?.reportColumns) {
        return user.preferences.reportColumns;
      }
      const cached = localStorage.getItem("bt_reports_active_cols_v1");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading cached columns:", e);
    }
    return { ...DEFAULT_COLS };
  });

  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [tempActiveCols, setTempActiveCols] = useState([]);
  const [tempAllCols, setTempAllCols] = useState([]);

  const [detailsEntry, setDetailsEntry] = useState(null);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentItem, setPaymentItem] = useState(null);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("fr_proj", selectedProjectId);
    sessionStorage.setItem("fr_floor", selectedFloor);
    sessionStorage.setItem("fr_phase", selectedPhaseId);
    sessionStorage.setItem("fr_activity", selectedActivityName);
    sessionStorage.setItem("fr_datePreset", datePreset);
    if (isValidDate(startDate)) sessionStorage.setItem("fr_startDate", startDate.toISOString());
    else sessionStorage.removeItem("fr_startDate");
    if (isValidDate(endDate)) sessionStorage.setItem("fr_endDate", endDate.toISOString());
    else sessionStorage.removeItem("fr_endDate");
    sessionStorage.setItem("fr_tab", activeTab);
    sessionStorage.setItem("fr_search", searchQuery);
    sessionStorage.setItem("fr_item", selectedItemName);
    sessionStorage.setItem("fr_payStatus", selectedPaymentStatus);
  }, [
    selectedProjectId,
    selectedFloor,
    selectedPhaseId,
    selectedActivityName,
    datePreset,
    startDate,
    endDate,
    activeTab,
    searchQuery,
    selectedItemName,
    selectedPaymentStatus,
  ]);

  const { projects: projStore, fetchProjects: storeFetchProjects } =
    useProjectStore();
  const { transactions: txStore, fetchTransactions: storeFetchTransactions } =
    useTransactionStore();

  const [runTour, setRunTour] = useState(false);

  const tourSteps = [
    {
      target: ".tour-project-filter",
      content: "Filter reports by Project, Floor, Phase, Activity, and Date.",
      disableBeacon: true,
    },
    {
      target: ".tour-report-tabs",
      content: "Switch between All, Materials, Labour, and Equipment categories.",
    },
    {
      target: ".tour-export-btns",
      content: "Customize columns and export the report to CSV or PDF.",
    },
  ];

  useEffect(() => {
    perfLogger.endRoute("/reports");
    perfLogger.logMount("ReportsPage");
  }, []);

  const loadData = useCallback(
    (force = false) => {
      if (
        useProjectStore.getState().projects.length === 0 &&
        useTransactionStore.getState().transactions.length === 0
      )
        setLoading(true);
      setError("");
      Promise.all([
        storeFetchProjects({}, force),
        storeFetchTransactions({ limit: 10000, filterByViewAccess: true }, force),
      ])
        .then(() => {})
        .catch(() => setError("Failed to load project details and reports log."))
        .finally(() => setLoading(false));
    },
    [storeFetchProjects, storeFetchTransactions]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (projStore) {
      setProjects(projStore);
    }
  }, [projStore]);

  useEffect(() => {
    if (txStore) {
      const mappedList = txStore
        .filter(isReportEntry)
        .map((tx) => mapTransactionToEntry(tx));
      setTransactions(mappedList);
    }
  }, [txStore]);

  const saveActiveColumns = (updated) => {
    setActiveColumns(updated);
    localStorage.setItem("bt_reports_active_cols_v1", JSON.stringify(updated));
    userAPI
      .updateProfileAlt({ preferences: { reportColumns: updated } })
      .catch((err) =>
        console.error("Failed to save report columns to profile", err)
      );
  };

  useEffect(() => {
    setSelectedItemName("");
    setReportGenerated(true);
    setShowSuggestions(false);
    setCurrentPage(1);
  }, [activeTab]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => String(p._id) === selectedProjectId);
  }, [projects, selectedProjectId]);

  const getProjectName = useCallback(
    (id) => {
      const match = projects.find((p) => String(p._id) === String(id));
      return match ? match.projectName || match.name : "No project";
    },
    [projects]
  );

  const floors = useMemo(() => {
    return selectedProject?.floors || [];
  }, [selectedProject]);

  const phases = useMemo(() => {
    return selectedProject?.selectedPhases || [];
  }, [selectedProject]);

  const selectedPhaseName = useMemo(() => {
    const match = phases.find((ph) => String(ph.id) === selectedPhaseId);
    return match ? match.phaseName : "Select Phase";
  }, [phases, selectedPhaseId]);

  const uniqueActivityNames = useMemo(() => {
    const activities = [];
    if (selectedPhaseId) {
      const match = phases.find((ph) => String(ph.id) === selectedPhaseId);
      activities.push(...(match?.activities || []));
    } else if (selectedProject) {
      activities.push(
        ...(selectedProject.selectedPhases?.flatMap((p) => p.activities || []) || [])
      );
    }
    return [...new Set(activities.map((a) => a.name))];
  }, [selectedProject, phases, selectedPhaseId]);

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    setCurrentPage(1);
    const now = new Date();

    switch (preset) {
      case "All Time":
        setStartDate(null);
        setEndDate(null);
        break;
      case "Today":
        setStartDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
        setEndDate(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        );
        break;
      case "This Week": {
        const weekday = now.getDay() || 7;
        const start = new Date(now);
        start.setDate(now.getDate() - (weekday - 1));
        setStartDate(new Date(start.getFullYear(), start.getMonth(), start.getDate()));
        setEndDate(null);
        break;
      }
      case "This Month":
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setEndDate(null);
        break;
      case "Last 30 Days": {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        setStartDate(new Date(start.getFullYear(), start.getMonth(), start.getDate()));
        setEndDate(null);
        break;
      }
      case "This Year":
        setStartDate(new Date(now.getFullYear(), 0, 1));
        setEndDate(null);
        break;
      case "Custom":
        break;
      default:
        break;
    }
  };

  const selectedTypes = useMemo(() => {
    if (activeTab === "Materials") return new Set(["material"]);
    if (activeTab === "Labour") return new Set(["labour"]);
    if (activeTab === "Equipment") return new Set(["equipment"]);
    return new Set(["material", "labour", "equipment"]);
  }, [activeTab]);

  const filteredEntries = useMemo(() => {
    return transactions.filter((entry) => {
      if (
        selectedProjectId !== "all" &&
        String(entry.projectId) !== selectedProjectId
      ) {
        return false;
      }

      if (selectedProjectId !== "all") {
        if (selectedFloor && selectedFloor !== "Select Floor") {
          if (entry.floor !== selectedFloor) return false;
        }

        if (selectedPhaseId && selectedPhaseId !== "Select Phase") {
          const matchPhase = phases.find((ph) => String(ph.id) === selectedPhaseId);
          const phaseName = matchPhase?.phaseName;
          if (
            entry.phaseId !== selectedPhaseId &&
            (!phaseName || entry.phase !== phaseName)
          ) {
            return false;
          }
        }

        if (
          selectedActivityName &&
          selectedActivityName !== "Select Activity"
        ) {
          if (
            entry.activity !== selectedActivityName &&
            entry.description !== selectedActivityName
          ) {
            return false;
          }
        }
      }

      if (!selectedTypes.has(entry.type)) {
        return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const cleanNumeric = q
          .replace(/^(rs\.?|₹)\s*/i, "")
          .replace(/,/g, "")
          .trim();
        const projectName = getProjectName(entry.projectId).toLowerCase();
        const descMatch = (entry.description || "").toLowerCase().includes(q);
        const brandMatch = (entry.brand || "").toLowerCase().includes(q);
        const contractorMatch = (entry.contractor || "")
          .toLowerCase()
          .includes(q);
        const supplierMatch = (entry.supplier || "").toLowerCase().includes(q);
        const categoryMatch = (entry.category || "").toLowerCase().includes(q);
        const workerMatch = (entry.workerName || "").toLowerCase().includes(q);
        const notesMatch = (entry.notes || "").toLowerCase().includes(q);
        const remarksMatch = (entry.remarks || "").toLowerCase().includes(q);
        const projectMatch = projectName.includes(q);
        const floorMatch = (entry.floor || "").toLowerCase().includes(q);
        const phaseMatch = (entry.phase || "").toLowerCase().includes(q);
        const activityMatch = (entry.activity || "").toLowerCase().includes(q);
        const unitMatch = (entry.unit || "").toLowerCase().includes(q);
        const typeMatch = (entry.type || "").toLowerCase().includes(q);
        const statusMatch = getPaymentStatusLabel(entry.paymentStatus, {
          amount: entry.amount,
          paidAmount: entry.paidAmount,
        })
          .toLowerCase()
          .includes(q);
        const dateMatch = formatDateShort(entry.date).toLowerCase().includes(q);
        const payDateMatch = entry.paymentDate
          ? formatDateShort(entry.paymentDate).toLowerCase().includes(q)
          : false;

        let amountMatch = false;
        if (cleanNumeric.length > 0 && !isNaN(Number(cleanNumeric))) {
          amountMatch =
            String(entry.amount).includes(cleanNumeric) ||
            String(Math.round(entry.amount)).includes(cleanNumeric) ||
            String(entry.ratePerUnit || 0).includes(cleanNumeric) ||
            String(entry.paidAmount || 0).includes(cleanNumeric) ||
            String(Math.round(entry.paidAmount || 0)).includes(cleanNumeric) ||
            String(entry.amount - entry.paidAmount || 0).includes(cleanNumeric) ||
            String(Math.round(entry.amount - entry.paidAmount || 0)).includes(
              cleanNumeric
            ) ||
            String(entry.quantity || 0).includes(cleanNumeric);
        }
        if (!amountMatch) {
          amountMatch =
            formatINR(entry.amount).toLowerCase().includes(q) ||
            formatINR(entry.ratePerUnit || 0).toLowerCase().includes(q) ||
            formatINR(entry.paidAmount || 0).toLowerCase().includes(q);
        }

        let rawTxMatch = false;
        if (entry.rawTx && typeof entry.rawTx === "object") {
          for (const key of Object.keys(entry.rawTx)) {
            const val = entry.rawTx[key];
            if (typeof val === "string" && val.toLowerCase().includes(q)) {
              rawTxMatch = true;
              break;
            }
          }
        }

        if (
          !descMatch &&
          !brandMatch &&
          !contractorMatch &&
          !supplierMatch &&
          !categoryMatch &&
          !workerMatch &&
          !notesMatch &&
          !remarksMatch &&
          !projectMatch &&
          !floorMatch &&
          !phaseMatch &&
          !activityMatch &&
          !unitMatch &&
          !amountMatch &&
          !typeMatch &&
          !statusMatch &&
          !dateMatch &&
          !payDateMatch &&
          !rawTxMatch
        ) {
          return false;
        }
      }

      if (activeTab !== "All" && selectedItemName && selectedItemName !== "All") {
        const matchesItem =
          entry.description === selectedItemName ||
          entry.brand === selectedItemName ||
          entry.contractor === selectedItemName ||
          entry.category === selectedItemName ||
          entry.supplier === selectedItemName ||
          entry.workerName === selectedItemName;
        if (!matchesItem) return false;
      }

      if (selectedPaymentStatus !== "All") {
        const computedLabel = getPaymentStatusLabel(entry.paymentStatus, {
          amount: entry.amount,
          paidAmount: entry.paidAmount,
        });
        if (computedLabel.toLowerCase() !== selectedPaymentStatus.toLowerCase()) {
          return false;
        }
      }

      const entDate = isValidDate(entry.date)
        ? entry.date
        : entry.date ? new Date(entry.date) : null;

      if (isValidDate(startDate)) {
        if (!isValidDate(entDate)) return false;
        const eDate = new Date(
          entDate.getFullYear(),
          entDate.getMonth(),
          entDate.getDate()
        );
        const sDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        );
        if (eDate.getTime() < sDate.getTime()) return false;
      }
      if (isValidDate(endDate)) {
        if (!isValidDate(entDate)) return false;
        const eDate = new Date(
          entDate.getFullYear(),
          entDate.getMonth(),
          entDate.getDate()
        );
        const edDate = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate() + 1
        );
        if (eDate.getTime() >= edDate.getTime()) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedProjectId,
    selectedFloor,
    selectedPhaseId,
    selectedActivityName,
    selectedTypes,
    activeTab,
    reportGenerated,
    searchQuery,
    selectedItemName,
    selectedPaymentStatus,
    startDate,
    endDate,
    getProjectName,
    phases,
  ]);

  const textQuerySuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const set = new Set();
    for (const t of transactions) {
      const desc = t.itemDescription || t.description || t.title || t.name || "";
      if (desc && desc.toLowerCase().includes(q)) set.add(desc);
      const contractor = t.contractorName || t.contractor || "";
      if (contractor && contractor.toLowerCase().includes(q)) set.add(contractor);
      const brand = t.brand || "";
      if (brand && brand.toLowerCase().includes(q)) set.add(brand);
    }
    return Array.from(set).slice(0, 8);
  }, [searchQuery, transactions]);

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortColumn === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortColumn === "project") {
        cmp = getProjectName(a.projectId).localeCompare(
          getProjectName(b.projectId)
        );
      }
      return sortAscending ? cmp : -cmp;
    });
  }, [filteredEntries, sortColumn, sortAscending, getProjectName]);

  const costSummary = useMemo(() => {
    return calculateFilteredCostSummary(filteredEntries);
  }, [filteredEntries]);

  const chartData = useMemo(() => {
    let materialBudget = 0;
    let labourBudget = 0;
    let equipmentBudget = 0;
    if (selectedProject) {
      materialBudget =
        selectedProject.budget?.material ||
        selectedProject.budgetMaterial ||
        0;
      labourBudget =
        selectedProject.budget?.labour || selectedProject.budgetLabour || 0;
      equipmentBudget =
        selectedProject.budget?.equipment ||
        selectedProject.budgetEquipment ||
        0;
    } else {
      for (const p of projects) {
        materialBudget += p.budget?.material || p.budgetMaterial || 0;
        labourBudget += p.budget?.labour || p.budgetLabour || 0;
        equipmentBudget += p.budget?.equipment || p.budgetEquipment || 0;
      }
    }

    const matActual = costSummary.material || 0;
    const labActual = costSummary.labour || 0;
    const eqActual = costSummary.equipment || 0;

    return [
      {
        category: "Material",
        actual: matActual,
        budget:
          materialBudget > 0 ? materialBudget : Math.max(matActual * 1.2, 50000),
      },
      {
        category: "Labour",
        actual: labActual,
        budget:
          labourBudget > 0 ? labourBudget : Math.max(labActual * 1.15, 40000),
      },
      {
        category: "Equipment",
        actual: eqActual,
        budget:
          equipmentBudget > 0
            ? equipmentBudget
            : Math.max(eqActual * 1.25, 25000),
      },
    ];
  }, [selectedProject, projects, costSummary]);

  const totalCount = sortedEntries.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedEntries = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * rowsPerPage;
    return sortedEntries.slice(startIdx, startIdx + rowsPerPage);
  }, [sortedEntries, safeCurrentPage, rowsPerPage]);

  const openCustomizeModal = () => {
    const all = (ALL_COLS && ALL_COLS[activeTab]) || ALL_COLS.All || [];
    const active =
      (activeColumns && activeColumns[activeTab]) || DEFAULT_COLS[activeTab] || DEFAULT_COLS.All || [];
    const inactive = all.filter((c) => !active.includes(c));
    setTempActiveCols([...active]);
    setTempAllCols([...active, ...inactive]);
    setShowCustomizeModal(true);
  };

  const handleToggleColumn = (col) => {
    if (tempActiveCols.includes(col)) {
      if (tempActiveCols.length > 1) {
        setTempActiveCols(tempActiveCols.filter((c) => c !== col));
      } else {
        setToast({ msg: "At least one column must be visible.", type: "error" });
      }
    } else {
      const updated = [];
      for (const c of tempAllCols) {
        if (tempActiveCols.includes(c) || c === col) {
          updated.push(c);
        }
      }
      setTempActiveCols(updated);
    }
  };

  const handleMoveColumn = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= tempAllCols.length) return;
    const copy = [...tempAllCols];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIndex, 0, moved);
    setTempAllCols(copy);
    const updatedActive = [];
    for (const c of copy) {
      if (tempActiveCols.includes(c)) {
        updatedActive.push(c);
      }
    }
    setTempActiveCols(updatedActive);
  };

  const saveCustomizeColumns = () => {
    const updated = { ...activeColumns, [activeTab]: tempActiveCols };
    saveActiveColumns(updated);
    setShowCustomizeModal(false);
    setToast({ msg: "Column preferences saved!", type: "success" });
  };

  const handleAddMore = (entry) => {
    const activeKey =
      entry.type === "material"
        ? "material"
        : entry.type === "labour"
          ? "labour"
          : "equipment";
    const sourceId =
      entry.id || (entry.rawTx ? entry.rawTx._id || entry.rawTx.id : "");
    const returnUrl = encodeURIComponent("/reports");
    // Entries saved without a project carry a placeholder id: don't pass it on.
    const knownProject = projects.some(
      (p) => String(p._id) === String(entry.projectId)
    )
      ? entry.projectId
      : "";
    navigate(
      `/manualentry?type=${activeKey}&project=${encodeURIComponent(knownProject)}&name=${encodeURIComponent(entry.description || "")}&unit=${encodeURIComponent(entry.unit || "")}&brand=${encodeURIComponent(entry.brand || "")}&isDuplicate=true&sourceTransactionId=${sourceId}&returnUrl=${returnUrl}`
    );
  };

  const handleEditEntry = (entry) => {
    navigate(`/manualentry`, { state: { transaction: entry.rawTx } });
  };

  const handleRecordPaymentClick = (entry) => {
    setPaymentItem(entry);
    setPaymentSheetOpen(true);
  };

  const handleExportCSV = (exportAll) => {
    if (filteredEntries.length === 0) {
      setToast({ msg: "No report entries to export.", type: "error" });
      return;
    }

    try {
      const activeCols = exportAll
        ? ALL_COLS[activeTab] || []
        : (activeColumns && activeColumns[activeTab]) ||
          DEFAULT_COLS[activeTab] ||
          [];
      const headers = [
        "Transaction ID",
        "Action",
        ...activeCols.map((col) => (col === "Amount" ? "Amount (INR)" : col)),
      ];

      let maxPayments = 0;
      for (const entry of filteredEntries) {
        const ph = entry.rawTx?.paymentHistory || [];
        if (ph.length > maxPayments) maxPayments = ph.length;
      }
      for (let i = 1; i <= maxPayments; i++) {
        headers.push(`Payment ${i} Amount`);
        headers.push(`Payment ${i} Date`);
        headers.push(`Payment ${i} Mode`);
      }

      const csvBuffer = [];
      csvBuffer.push(
        headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",")
      );

      const formatLocal = (dStr) => {
        if (!dStr) return "—";
        const d = typeof dStr === "string" ? new Date(dStr) : dStr;
        if (isNaN(d.getTime())) return "—";
        const pad = (n) => n.toString().padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      };

      for (const entry of filteredEntries) {
        const dateStr = formatLocal(entry.date);
        const projectName = getProjectName(entry.projectId);
        const amountStr = entry.amount.toFixed(2);
        const statusStr = getPaymentStatusLabel(entry.paymentStatus, {
          amount: entry.amount,
          paidAmount: entry.paidAmount,
        });
        const payDateStr = formatLocal(entry.paymentDate);

        const formatDateTime = (dStr, rawTxId) => {
          let d = null;
          if (dStr) {
            d = new Date(dStr);
            if (!isValidDate(d)) {
              d = null;
            } else if (
              d.toISOString().endsWith("T00:00:00.000Z") &&
              rawTxId &&
              rawTxId.length === 24
            ) {
              const timestamp = parseInt(rawTxId.substring(0, 8), 16) * 1000;
              d = new Date(timestamp);
            }
          } else if (rawTxId && rawTxId.length === 24) {
            const timestamp = parseInt(rawTxId.substring(0, 8), 16) * 1000;
            d = new Date(timestamp);
          }
          if (!d || isNaN(d.getTime())) return "";

          let hours = d.getHours();
          const minutes = d.getMinutes();
          const ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12;
          hours = hours ? hours : 12;
          const pad = (n) => n.toString().padStart(2, "0");
          return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(hours)}:${pad(minutes)} ${ampm}`;
        };

        const rowValues = [entry.rawTx?._id || "", "unchanged"];
        for (const col of activeCols) {
          if (col === "Created At") {
            rowValues.push(formatDateTime(entry.rawTx?.createdAt, entry.rawTx?._id));
          } else if (col === "Purchased Date") {
            rowValues.push(dateStr);
          } else if (col === "Payment Date") {
            rowValues.push(payDateStr);
          } else if (col === "Project") {
            rowValues.push(projectName);
          } else if (col === "Type") {
            rowValues.push(entry.type.toUpperCase());
          } else if (
            col === "Description" ||
            col === "Material" ||
            col === "Worker Type" ||
            col === "Equipment"
          ) {
            rowValues.push(entry.description || "—");
          } else if (col === "Brand") {
            rowValues.push(entry.brand || "—");
          } else if (col === "Floor") {
            rowValues.push(entry.floor || "—");
          } else if (col === "Phase") {
            rowValues.push(entry.phase || "—");
          } else if (col === "Activity") {
            rowValues.push(entry.activity || "—");
          } else if (col === "Unit") {
            rowValues.push(entry.unit || "—");
          } else if (col === "Status") {
            rowValues.push(statusStr);
          } else if (col === "Amount") {
            rowValues.push(amountStr);
          } else if (col === "Paid") {
            rowValues.push((entry.paidAmount || 0).toFixed(2));
          } else if (col === "Remaining") {
            const rem = Math.max(0, (entry.amount || 0) - (entry.paidAmount || 0));
            rowValues.push(rem.toFixed(2));
          } else if (
            col === "Rate" ||
            col === "Rate/Day" ||
            col === "Rent Rate"
          ) {
            rowValues.push((entry.ratePerUnit || 0).toFixed(2));
          } else if (
            col === "Qty" ||
            col === "Days" ||
            col === "Duration"
          ) {
            const rate = entry.ratePerUnit || 0;
            const val = rate === 0 ? 0 : entry.amount / rate;
            rowValues.push(val.toFixed(1));
          }
        }

        const ph = entry.rawTx?.paymentHistory || [];
        for (let i = 0; i < maxPayments; i++) {
          if (i < ph.length) {
            rowValues.push(ph[i].amount);
            rowValues.push(formatLocal(ph[i].date));
            rowValues.push(ph[i].method || ph[i].mode || "");
          } else {
            rowValues.push("");
            rowValues.push("");
            rowValues.push("");
          }
        }

        csvBuffer.push(
          rowValues.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
        );
      }

      const blob = new Blob(["\uFEFF" + csvBuffer.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BuildTrack_Report_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({ msg: "CSV exported successfully!", type: "success" });
    } catch {
      setToast({ msg: "CSV Export failed", type: "error" });
    }
  };

  const handleExportPDF = () => {
    if (filteredEntries.length === 0) {
      setToast({ msg: "No report entries to export.", type: "error" });
      return;
    }

    try {
      const doc = new jsPDF("l", "mm", "a4");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);

      const title =
        selectedProjectId === "all"
          ? "All Active Projects Summary Report"
          : `${getProjectName(selectedProjectId)} Report`;
      doc.text(title, 14, 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const parts = [];
      if (selectedProjectId !== "all") {
        parts.push(`Project: ${getProjectName(selectedProjectId)}`);
        if (selectedFloor) parts.push(`Floor: ${selectedFloor}`);
        if (selectedPhaseId) parts.push(`Phase: ${selectedPhaseName}`);
        if (selectedActivityName) parts.push(`Activity: ${selectedActivityName}`);
      } else {
        parts.push("All Projects");
      }
      parts.push(
        `Types: ${[...selectedTypes].map((t) => t.toUpperCase()).join(", ")}`
      );
      parts.push(`Payment Status: ${selectedPaymentStatus}`);
      parts.push(`Date Preset: ${datePreset}`);
      doc.text(parts.join(" | "), 14, 23);

      doc.setFontSize(10);
      doc.text(
        `Total Billed: ${formatINR(costSummary.totalBilled)}  |  Paid: ${formatINR(costSummary.paid)}  |  Remaining: ${formatINR(costSummary.remaining)}  |  Material: ${formatINR(costSummary.material)}  |  Labour: ${formatINR(costSummary.labour)}  |  Equipment: ${formatINR(costSummary.equipment)}`,
        14,
        30
      );

      const activeCols =
        (activeColumns && activeColumns[activeTab]) ||
        DEFAULT_COLS[activeTab] ||
        [];
      const headers = activeCols.map((col) =>
        col === "Amount" ? "Amount (INR)" : col
      );

      const body = filteredEntries.map((entry) => {
        const row = [];
        for (const col of activeCols) {
          if (col === "Created At") {
            row.push(formatCreatedAt(entry.rawTx?.createdAt, entry.rawTx?._id));
          } else if (col === "Purchased Date") {
            row.push(formatDateShort(entry.date));
          } else if (col === "Payment Date") {
            row.push(entry.paymentDate ? formatDateShort(entry.paymentDate) : "—");
          } else if (col === "Project") {
            row.push(getProjectName(entry.projectId));
          } else if (col === "Type") {
            row.push(entry.type.toUpperCase());
          } else if (
            col === "Description" ||
            col === "Material" ||
            col === "Worker Type" ||
            col === "Equipment"
          ) {
            row.push(entry.description || "—");
          } else if (col === "Brand") {
            row.push(entry.brand || "—");
          } else if (col === "Floor") {
            row.push(entry.floor || "—");
          } else if (col === "Phase") {
            row.push(entry.phase || "—");
          } else if (col === "Activity") {
            row.push(entry.activity || "—");
          } else if (col === "Unit") {
            row.push(entry.unit || "—");
          } else if (col === "Status") {
            row.push(
              getPaymentStatusLabel(entry.paymentStatus, {
                amount: entry.amount,
                paidAmount: entry.paidAmount,
              })
            );
          } else if (col === "Amount") {
            row.push(entry.amount.toFixed(2));
          } else if (col === "Paid") {
            row.push((entry.paidAmount || 0).toFixed(2));
          } else if (col === "Remaining") {
            const rem = Math.max(0, (entry.amount || 0) - (entry.paidAmount || 0));
            row.push(rem.toFixed(2));
          } else if (
            col === "Rate" ||
            col === "Rate/Day" ||
            col === "Rent Rate"
          ) {
            row.push((entry.ratePerUnit || 0).toFixed(2));
          } else if (
            col === "Qty" ||
            col === "Days" ||
            col === "Duration"
          ) {
            const rate = entry.ratePerUnit || 0;
            const val = rate === 0 ? 0 : entry.amount / rate;
            row.push(val.toFixed(1));
          }
        }
        return row;
      });

      autoTable(doc, {
        startY: 35,
        head: [headers],
        body: body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [17, 19, 23], textColor: 255 },
      });

      doc.save(`BuildTrack_Report_${new Date().getTime()}.pdf`);
      setToast({ msg: "PDF exported successfully!", type: "success" });
    } catch {
      setToast({ msg: "PDF Export failed", type: "error" });
    }
  };

  const activeCols =
    (activeColumns && activeColumns[activeTab]) || DEFAULT_COLS[activeTab] || [];
  const uiActiveCols = [...activeCols, "Actions"];

  const canRecordPayment =
    can("mark_paid") || can("approve_payments") || user?.role === "Admin";
  const canApprove = can("approve_payments") || user?.role === "Admin";
  const canAddEdit = can("add_entries") || user?.role === "Admin";

  const handleInlineApprove = async (entry) => {
    try {
      await transactionAPI.approve(entry.rawTx?._id || entry.id);
      setToast({ msg: "Entry approved successfully!", type: "success" });
      loadData();
    } catch (err) {
      setToast({
        msg: err.response?.data?.message || "Failed to approve entry",
        type: "error",
      });
    }
  };

  const handleInlineReject = (entry) => {
    setRejectReason("");
    setRejectTarget(entry);
  };

  const confirmInlineReject = async () => {
    const entry = rejectTarget;
    if (!entry) return;
    setRejectBusy(true);
    try {
      await transactionAPI.reject(
        entry.rawTx?._id || entry.id,
        rejectReason.trim()
      );
      setToast({ msg: "Entry rejected", type: "info" });
      setRejectTarget(null);
      loadData();
    } catch (err) {
      setToast({
        msg: err.response?.data?.message || "Failed to reject entry",
        type: "error",
      });
    } finally {
      setRejectBusy(false);
    }
  };

  const resetAllFilters = () => {
    setSelectedProjectId("all");
    setSelectedFloor("");
    setSelectedPhaseId("");
    setSelectedActivityName("");
    setDatePreset("All Time");
    setStartDate(null);
    setEndDate(null);
    setSearchQuery("");
    setSelectedItemName("");
    setSelectedPaymentStatus("All");
    setCurrentPage(1);
  };

  const extraFiltersCount = [
    selectedFloor,
    selectedPhaseId,
    selectedActivityName,
    selectedPaymentStatus !== "All" ? selectedPaymentStatus : null,
  ].filter(Boolean).length;

  const categoryTabOptions = [
    { label: "All", value: "All" },
    { label: "Materials", value: "Materials" },
    { label: "Labour", value: "Labour" },
    { label: "Equipment", value: "Equipment" },
  ];

  const hasActiveFilters =
    selectedProjectId !== "all" ||
    datePreset !== "All Time" ||
    extraFiltersCount > 0 ||
    searchQuery.trim().length > 0;

  const projectLabel = (entry) => {
    const name = getProjectName(entry.projectId);
    return { name, none: name === "No project" };
  };

  const isFirstLoad = loading && transactions.length === 0;

  const sortHint =
    sortColumn === "date"
      ? sortAscending
        ? "Date: Oldest"
        : "Date: Newest"
      : sortColumn === "amount"
        ? sortAscending
          ? "Amount: Low"
          : "Amount: High"
        : sortAscending
          ? "Project: A–Z"
          : "Project: Z–A";

  const sortKeyForColumn = (colName) =>
    colName === "Purchased Date" || colName === "Date"
      ? "date"
      : colName === "Project"
        ? "project"
        : colName === "Amount"
          ? "amount"
          : null;

  const handleSortClick = (colName) => {
    const key = sortKeyForColumn(colName);
    if (!key) return;
    setSortColumn(key);
    setSortAscending(!sortAscending);
  };

  const emptyState = (
    <BtEmpty
      icon={Search}
      title="No entries match these filters"
      message="Try a wider date range, another project, or a different search."
      actionLabel={hasActiveFilters ? "Reset filters" : undefined}
      onAction={hasActiveFilters ? resetAllFilters : undefined}
    />
  );

  const paginationBar = totalCount > 0 && (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        padding: "14px 20px",
        borderTop: "1px solid var(--line)",
        background: "var(--card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: "var(--ink-2)" }}>
          Showing{" "}
          <b className="tnum" style={{ color: "var(--ink)" }}>
            {(safeCurrentPage - 1) * rowsPerPage + 1}&ndash;
            {Math.min(safeCurrentPage * rowsPerPage, totalCount)}
          </b>{" "}
          of <b className="tnum" style={{ color: "var(--ink)" }}>{totalCount}</b> entries
        </span>
        <BtSelect
          aria-label="Rows per page"
          size="compact"
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          style={{ width: 140 }}
        >
          <option value={10}>10 rows</option>
          <option value={20}>20 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </BtSelect>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BtIconButton
          icon={ChevronLeft}
          label="Previous page"
          disabled={safeCurrentPage <= 1}
          onClick={() => setCurrentPage(safeCurrentPage - 1)}
        />
        <span className="tnum" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", minWidth: 96, textAlign: "center" }}>
          Page {safeCurrentPage} of {totalPages}
        </span>
        <BtIconButton
          icon={ChevronRight}
          label="Next page"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => setCurrentPage(safeCurrentPage + 1)}
        />
      </div>
    </div>
  );

  const renderCell = (colName, entry) => {
    const none = (
      <span style={{ color: "var(--ink-3)" }}>{"—"}</span>
    );
    const text = (val, extra = {}) => (
      <td
        key={colName}
        className="txt"
        title={val || undefined}
        style={{
          minWidth: COLUMN_WIDTHS[colName],
          maxWidth: Math.max(COLUMN_WIDTHS[colName] || 0, 260),
          ...extra,
        }}
      >
        {val || none}
      </td>
    );
    const rem = Math.max(0, (entry.amount || 0) - (entry.paidAmount || 0));

    switch (colName) {
      case "Created At":
        return text(formatCreatedAt(entry.rawTx?.createdAt, entry.rawTx?._id));
      case "Purchased Date":
        return <td key={colName} style={{ minWidth: COLUMN_WIDTHS[colName] }}>{formatDateShort(entry.date)}</td>;
      case "Payment Date":
        return (
          <td key={colName} style={{ minWidth: COLUMN_WIDTHS[colName] }}>
            {entry.paymentDate ? formatDateShort(entry.paymentDate) : none}
          </td>
        );
      case "Project": {
        const { name, none: noProj } = projectLabel(entry);
        return text(name, {
          fontWeight: noProj ? 500 : 600,
          color: noProj ? "var(--ink-3)" : "var(--ink)",
        });
      }
      case "Type":
        return (
          <td key={colName} style={{ minWidth: COLUMN_WIDTHS[colName] }}>
            <BtBadge tone={entry.type} label={TYPE_LABELS[entry.type] || entry.type} />
          </td>
        );
      case "Description":
      case "Material":
      case "Worker Type":
      case "Equipment":
        return text(entry.description, { fontWeight: colName === "Description" ? 400 : 500 });
      case "Brand":
        return text(entry.brand);
      case "Floor":
        return text(entry.floor);
      case "Phase":
        return text(entry.phase);
      case "Activity":
        return text(entry.activity);
      case "Unit":
        return text(entry.unit);
      case "Status": {
        const label = getPaymentStatusLabel(entry.paymentStatus, {
          amount: entry.amount,
          paidAmount: entry.paidAmount,
        });
        return (
          <td key={colName} style={{ minWidth: COLUMN_WIDTHS[colName] }}>
            <BtBadge tone={statusTone(label)} label={label} />
          </td>
        );
      }
      case "Approval": {
        const appStatus = (entry.rawTx || {}).approvalStatus || "Approved";
        const isPendingApproval = appStatus === "Pending";
        return (
          <td key={colName} style={{ minWidth: COLUMN_WIDTHS[colName] }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BtBadge tone={approvalTone(appStatus)} label={appStatus} />
              {isPendingApproval && canApprove && (
                <div style={{ display: "flex", gap: 6 }}>
                  <BtIconButton
                    icon={Check}
                    label="Approve entry"
                    size={32}
                    onClick={() => handleInlineApprove(entry)}
                    style={{ color: "var(--status-success)", background: "var(--status-success-soft)", borderColor: "transparent" }}
                  />
                  <BtIconButton
                    icon={X}
                    label="Reject entry"
                    size={32}
                    onClick={() => handleInlineReject(entry)}
                    style={{ color: "var(--status-danger)", background: "var(--status-danger-soft)", borderColor: "transparent" }}
                  />
                </div>
              )}
            </div>
          </td>
        );
      }
      case "Amount":
        return (
          <td key={colName} className="num" style={{ fontWeight: 700, color: "var(--ink)", minWidth: 112 }}>
            {formatInr(entry.amount)}
          </td>
        );
      case "Paid":
        return (
          <td key={colName} className="num" style={{ fontWeight: 600, color: "var(--status-success)", minWidth: 104 }}>
            {formatInr(entry.paidAmount || 0)}
          </td>
        );
      case "Remaining":
        return (
          <td
            key={colName}
            className="num"
            style={{ fontWeight: 600, color: rem > 0 ? "var(--status-danger)" : "var(--status-success)", minWidth: 112 }}
          >
            {formatInr(rem)}
          </td>
        );
      case "Rate":
      case "Rate/Day":
      case "Rent Rate":
        return (
          <td key={colName} className="num" style={{ minWidth: 100 }}>
            {formatInr(entry.ratePerUnit)}
          </td>
        );
      case "Qty":
      case "Days":
      case "Duration": {
        const rate = entry.ratePerUnit || 0;
        const val = rate === 0 ? 0 : entry.amount / rate;
        return (
          <td key={colName} className="num" style={{ minWidth: 80 }}>
            {val.toFixed(1)}
          </td>
        );
      }
      case "Actions":
        return (
          <td key={colName} className="fr-sr" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {canAddEdit || canRecordPayment ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {canRecordPayment && (
                  <BtIconButton
                    icon={CreditCard}
                    label="Record payment"
                    size={34}
                    onClick={() => handleRecordPaymentClick(entry)}
                  />
                )}
                {canAddEdit && (
                  <>
                    <BtIconButton
                      icon={PlusCircle}
                      label="Add more like this"
                      size={34}
                      onClick={() => handleAddMore(entry)}
                    />
                    <BtIconButton
                      icon={Edit2}
                      label="Edit entry"
                      size={34}
                      onClick={() => handleEditEntry(entry)}
                    />
                  </>
                )}
              </div>
            ) : (
              none
            )}
          </td>
        );
      default:
        return <td key={colName}>{none}</td>;
    }
  };

  const hubStyles = `
    .fr-chip {
      display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px;
      border-radius: var(--r-chip); background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--noir-line); color: var(--on-noir);
      font-family: var(--font-ui); font-size: 13px; font-weight: 600; cursor: pointer;
      max-width: 100%; white-space: nowrap; transition: background 150ms ease, border-color 150ms ease;
    }
    .fr-chip:hover { background: rgba(255, 255, 255, 0.14); }
    .fr-chip[data-active="true"] {
      background: color-mix(in srgb, var(--accent) 18%, transparent);
      border-color: color-mix(in srgb, var(--accent) 45%, transparent);
      color: var(--accent);
    }
    .fr-chip .fr-chip-label { overflow: hidden; text-overflow: ellipsis; }
    .fr-reset { background: color-mix(in srgb, var(--status-danger-bright) 14%, transparent);
      border-color: color-mix(in srgb, var(--status-danger-bright) 35%, transparent);
      color: var(--status-danger-bright); }
    .fr-reset:hover { background: color-mix(in srgb, var(--status-danger-bright) 24%, transparent); }
    .fr-menu {
      position: absolute; top: calc(100% + 6px); left: 0; z-index: 200;
      max-width: calc(100vw - 48px); padding: 6px; border-radius: 14px;
      background: var(--noir-2); border: 1px solid var(--noir-line);
      box-shadow: var(--shadow-raised); animation: fadeIn 120ms ease;
    }
    .fr-menu-title { color: var(--on-noir-3); padding: 6px 10px 8px; border-bottom: 1px solid var(--noir-line); margin-bottom: 4px; }
    .fr-menu-list { max-height: 340px; overflow-y: auto; }
    .fr-menu-item {
      display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 10px;
      min-height: 40px; padding: 0 11px; border: none; border-radius: 10px; background: transparent;
      color: var(--on-noir-2); font-family: var(--font-ui); font-size: 14px; font-weight: 500;
      cursor: pointer; text-align: left;
    }
    .fr-menu-item:hover { background: rgba(255, 255, 255, 0.07); color: var(--on-noir); }
    .fr-menu-item[aria-selected="true"] { background: rgba(255, 255, 255, 0.11); color: var(--on-noir); font-weight: 600; }
    .fr-menu-item > span { display: inline-flex; align-items: center; gap: 9px; min-width: 0; }
    .fr-menu-item > span > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .fr-scroll { overflow: auto; max-height: min(660px, calc(100vh - 150px)); position: relative; }
    .fr-table { width: max-content; min-width: 100%; }
    .fr-table th, .fr-table td { white-space: nowrap; }
    .fr-table th { padding: 12px 14px; }
    .fr-table td { padding: 12px 14px; font-size: 14px; }
    .fr-table td.txt { overflow: hidden; text-overflow: ellipsis; }
    .fr-table th.num { text-align: right; }
    .fr-table tbody tr { cursor: pointer; }
    .fr-table tbody tr:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
    .fr-table th[data-sort] { cursor: pointer; user-select: none; }
    .fr-table th[data-sort]:hover { color: var(--ink); }
    .fr-sl, .fr-sr { position: sticky; z-index: 2; background: var(--card); }
    .fr-sl { left: 0; border-right: 1px solid var(--line); text-align: center; padding-left: 10px !important; padding-right: 10px !important; width: 52px; min-width: 52px; }
    .fr-sr { right: 0; border-left: 1px solid var(--line); box-shadow: -8px 0 10px -8px color-mix(in srgb, var(--ink) 22%, transparent); }
    .fr-table th.fr-sl, .fr-table th.fr-sr { background: var(--bone); z-index: 4; }
    .fr-table tbody tr:hover td.fr-sl, .fr-table tbody tr:hover td.fr-sr { background: var(--bone); }

    .fr-scrim {
      position: fixed; inset: 0; z-index: 1000; background: var(--scrim);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .fr-modal {
      background: var(--card); border-radius: var(--r-sheet); width: 100%; max-height: 90vh;
      display: flex; flex-direction: column; box-shadow: var(--shadow-raised); overflow: hidden;
      font-family: var(--font-ui); color: var(--ink);
    }
    .fr-modal-body { padding: 0 24px 24px; overflow-y: auto; }
    .fr-drawer-scrim { align-items: stretch; justify-content: flex-end; padding: 0; }
    .fr-drawer {
      background: var(--card); width: 100%; max-width: 460px; height: 100%;
      display: flex; flex-direction: column; box-shadow: var(--shadow-raised);
      border-radius: var(--r-sheet) 0 0 var(--r-sheet); overflow: hidden;
      font-family: var(--font-ui); color: var(--ink);
    }
    .fr-option {
      display: flex; width: 100%; align-items: center; gap: 14px; padding: 16px; text-align: left;
      border-radius: var(--r-card); border: 1px solid var(--line); background: var(--card);
      cursor: pointer; font-family: var(--font-ui); transition: border-color 150ms ease, background 150ms ease;
    }
    .fr-option:hover { border-color: var(--ink); background: var(--bone); }
    .fr-toolbar { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    @media (max-width: 640px) {
      .fr-scrim { align-items: flex-end; padding: 0; }
      .fr-modal { border-radius: var(--r-sheet) var(--r-sheet) 0 0; max-height: 94vh; }
      .fr-drawer { border-radius: 0; max-width: 100%; }
      .fr-modal-body { padding: 0 18px 20px; }
      .fr-scroll { max-height: min(560px, calc(100vh - 150px)); }
      .fr-sr { position: static; box-shadow: none; }
      .fr-table th.fr-sr { z-index: 1; }
    }
  `;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minHeight: "100vh",
        background: "var(--ground)",
        fontFamily: "var(--font-ui)",
        color: "var(--ink)",
      }}
    >
      <style>{hubStyles}</style>
      <ModuleTour
        steps={tourSteps}
        run={runTour}
        setRun={setRunTour}
        moduleName="FinancialReportPage"
      />

      {/* ── HERO ── */}
      <BtHero padding="24px 32px 48px">
        <BtPageHeader
          eyebrow="Analytics"
          title="Reports"
          subtitle={`What you've billed, paid and still owe. ${totalCount} ${totalCount === 1 ? "entry" : "entries"} · ${datePreset || "All Time"}.`}
          actions={
            <div
              className="tour-export-btns"
              style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", maxWidth: "calc(100vw - 64px)" }}
            >
              <BtIconButton
                icon={HelpCircle}
                label="Page tour"
                onDark
                onClick={() => setRunTour(true)}
              />
              <BtButton
                variant="onDark"
                size="small"
                icon={Sparkles}
                onClick={() => navigate("/ai-chat")}
              >
                Ask AI
              </BtButton>
              <BtButton
                variant="onDark"
                size="small"
                icon={FileSpreadsheet}
                onClick={() => setShowImportModal(true)}
              >
                Import CSV
              </BtButton>
              <BtButton
                variant="accent"
                size="small"
                icon={Download}
                disabled={filteredEntries.length === 0}
                onClick={() => setShowExportModal(true)}
              >
                Export
              </BtButton>
            </div>
          }
        >
          <div
            className="tour-project-filter"
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
          >
            <HeroMenu
              icon={Building2}
              label={selectedProjectId === "all" ? "All projects" : getProjectName(selectedProjectId)}
              active={selectedProjectId !== "all"}
              open={projectDropdownOpen}
              onToggle={() => {
                setProjectDropdownOpen((v) => !v);
                setDateDropdownOpen(false);
              }}
              menuRef={projectDropdownRef}
              title="Project"
              width={290}
            >
              <HeroMenuItem
                selected={selectedProjectId === "all"}
                icon={Building2}
                onClick={() => {
                  setSelectedProjectId("all");
                  setSelectedFloor("");
                  setSelectedPhaseId("");
                  setSelectedActivityName("");
                  setCurrentPage(1);
                  setProjectDropdownOpen(false);
                }}
              >
                All projects
              </HeroMenuItem>
              {projects.map((p) => {
                const pid = p._id || p.id;
                return (
                  <HeroMenuItem
                    key={pid}
                    selected={selectedProjectId === pid}
                    icon={Building2}
                    onClick={() => {
                      setSelectedProjectId(pid);
                      setSelectedFloor("");
                      setSelectedPhaseId("");
                      setSelectedActivityName("");
                      setCurrentPage(1);
                      setProjectDropdownOpen(false);
                    }}
                  >
                    {p.projectName || p.name}
                  </HeroMenuItem>
                );
              })}
            </HeroMenu>

            <HeroMenu
              icon={Calendar}
              label={
                datePreset === "Custom" && (startDate || endDate)
                  ? `${startDate ? formatDateShort(startDate) : "…"} – ${endDate ? formatDateShort(endDate) : "…"}`
                  : datePreset
              }
              active={datePreset !== "All Time"}
              open={dateDropdownOpen}
              onToggle={() => {
                setDateDropdownOpen((v) => !v);
                setProjectDropdownOpen(false);
              }}
              menuRef={dateDropdownRef}
              title="Date range"
              width={230}
            >
              {["All Time", "Today", "This Week", "This Month", "Last 30 Days", "This Year", "Custom"].map(
                (preset) => (
                  <HeroMenuItem
                    key={preset}
                    selected={datePreset === preset}
                    onClick={() => {
                      handleDatePreset(preset);
                      setDateDropdownOpen(false);
                      if (preset === "Custom") setShowFiltersDrawer(true);
                    }}
                  >
                    {preset}
                  </HeroMenuItem>
                )
              )}
            </HeroMenu>

            <button
              type="button"
              className="fr-chip"
              data-active={extraFiltersCount > 0 || showFiltersDrawer}
              aria-expanded={showFiltersDrawer}
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
            >
              <Filter size={15} />
              <span>{extraFiltersCount === 0 ? "Filter" : `Filter · ${extraFiltersCount}`}</span>
            </button>

            <button
              type="button"
              className="fr-chip"
              data-active={showChart}
              aria-expanded={showChart}
              onClick={() => setShowChart(!showChart)}
            >
              <SlidersHorizontal size={15} />
              <span>{showChart ? "Hide chart" : "Analytics Chart"}</span>
            </button>

            {hasActiveFilters && (
              <button type="button" className="fr-chip fr-reset" onClick={resetAllFilters}>
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </BtPageHeader>
      </BtHero>

      {/* ── SHEET ── */}
      <BtSheet overlap={26} padding="24px 32px 64px">
        {error && (
          <BtErrorCard
            title="Couldn't load the report"
            message={error}
            onRetry={() => loadData(true)}
            style={{ marginBottom: 20 }}
          />
        )}

        {/* Category tabs + view toggle */}
        <div
          className="tour-report-tabs"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <BtSegmented
            options={categoryTabOptions}
            value={activeTab}
            onChange={(val) => {
              setActiveTab(val);
              setCurrentPage(1);
            }}
            style={{ maxWidth: "100%", overflowX: "auto" }}
          />
          <BtSegmented
            options={[
              { label: "Table", value: "table", icon: TableIcon },
              { label: "Cards", value: "cards", icon: LayoutGrid },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        </div>

        {/* Granular filters */}
        {showFiltersDrawer && (
          <BtCard padding="20px 22px" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Filters</h3>
              <BtIconButton icon={X} label="Close filters" size={36} onClick={() => setShowFiltersDrawer(false)} />
            </div>

            <div className="bt-grid-4">
              <BtSelect
                label="Floor"
                size="compact"
                disabled={selectedProjectId === "all" || floors.length === 0}
                helperText={selectedProjectId === "all" ? "Pick a project first" : undefined}
                value={floors.length === 0 ? "" : selectedFloor || "Select Floor"}
                onChange={(e) => {
                  setSelectedFloor(e.target.value === "Select Floor" ? "" : e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value={floors.length === 0 ? "" : "Select Floor"}>
                  {floors.length === 0 ? "No floors" : "All floors"}
                </option>
                {floors.map((fl, idx) => (
                  <option key={idx} value={typeof fl === "string" ? fl : fl.name}>
                    {typeof fl === "string" ? fl : fl.name}
                  </option>
                ))}
              </BtSelect>

              <BtSelect
                label="Phase"
                size="compact"
                disabled={selectedProjectId === "all" || phases.length === 0}
                helperText={selectedProjectId === "all" ? "Pick a project first" : undefined}
                value={selectedPhaseId || "Select Phase"}
                onChange={(e) => {
                  setSelectedPhaseId(e.target.value === "Select Phase" ? "" : e.target.value);
                  setSelectedActivityName("");
                  setCurrentPage(1);
                }}
              >
                <option value="Select Phase">All phases</option>
                {phases.map((ph) => (
                  <option key={ph.id} value={ph.id}>
                    {ph.phaseName}
                  </option>
                ))}
              </BtSelect>

              <BtSelect
                label="Activity"
                size="compact"
                disabled={selectedProjectId === "all" || uniqueActivityNames.length === 0}
                helperText={selectedProjectId === "all" ? "Pick a project first" : undefined}
                value={selectedActivityName || "Select Activity"}
                onChange={(e) => {
                  setSelectedActivityName(e.target.value === "Select Activity" ? "" : e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="Select Activity">All activities</option>
                {uniqueActivityNames.map((actName, idx) => (
                  <option key={idx} value={actName}>
                    {actName}
                  </option>
                ))}
              </BtSelect>

              <BtSelect
                label="Payment status"
                size="compact"
                value={selectedPaymentStatus}
                onChange={(e) => {
                  setSelectedPaymentStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All statuses</option>
                <option value="Fully Paid">Fully paid</option>
                <option value="Partial">Partial</option>
                <option value="Not Paid">Not paid</option>
              </BtSelect>

              {datePreset === "Custom" && (
                <>
                  <BtField
                    label="Start date"
                    type="date"
                    size="compact"
                    value={isValidDate(startDate) ? startDate.toISOString().split("T")[0] : ""}
                    onChange={(e) => {
                      const d = e.target.value ? new Date(e.target.value) : null;
                      setStartDate(isValidDate(d) ? d : null);
                    }}
                  />
                  <BtField
                    label="End date"
                    type="date"
                    size="compact"
                    value={isValidDate(endDate) ? endDate.toISOString().split("T")[0] : ""}
                    onChange={(e) => {
                      const d = e.target.value ? new Date(e.target.value) : null;
                      setEndDate(isValidDate(d) ? d : null);
                    }}
                  />
                </>
              )}
            </div>
          </BtCard>
        )}

        {/* ── KPI strip ── */}
        {isFirstLoad ? (
          <div className="bt-grid-3" style={{ marginBottom: 20 }}>
            {[0, 1, 2].map((i) => (
              <BtSkeleton key={i} height="128px" borderRadius="var(--r-card)" />
            ))}
          </div>
        ) : (
          <div className="bt-grid-3" style={{ marginBottom: 20 }}>
            <BtCard
              padding="20px 24px"
              style={{ background: "var(--noir)", color: "var(--on-noir)", border: "1px solid var(--noir-line)", minHeight: 128 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="bt-eyebrow" style={{ color: "var(--on-noir-2)" }}>Total billed</span>
                <CreditCard size={18} color="var(--accent)" />
              </div>
              <div
                className="tnum"
                style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--on-noir)", marginTop: 8 }}
              >
                {formatInr(costSummary.totalBilled, { compact: true })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                {[
                  ["Material", costSummary.material],
                  ["Labour", costSummary.labour],
                  ["Equipment", costSummary.equipment],
                ].map(([label, val]) => (
                  <div key={label} style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--on-noir-3)" }}>{label}</div>
                    <div className="tnum" style={{ fontSize: 14, fontWeight: 600, color: "var(--on-noir)" }}>
                      {formatInr(val, { compact: true })}
                    </div>
                  </div>
                ))}
              </div>
            </BtCard>

            <BtCard padding="20px 24px" style={{ minHeight: 128 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="bt-eyebrow" style={{ color: "var(--ink-3)" }}>Paid out</span>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--status-success-soft)", color: "var(--status-success)", display: "grid", placeItems: "center" }}>
                  <CheckCircle size={16} />
                </span>
              </div>
              <div
                className="tnum"
                style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--status-success)", marginTop: 8 }}
              >
                {formatInr(costSummary.paid, { compact: true })}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
                {costSummary.totalBilled > 0
                  ? `${Math.round((costSummary.paid / costSummary.totalBilled) * 100)}% of the billed amount is cleared`
                  : "No bills recorded"}
              </div>
            </BtCard>

            <BtCard padding="20px 24px" style={{ minHeight: 128 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="bt-eyebrow" style={{ color: "var(--ink-3)" }}>Remaining due</span>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: costSummary.remaining > 0 ? "var(--status-warning-soft)" : "var(--status-success-soft)",
                    color: costSummary.remaining > 0 ? "var(--status-warning)" : "var(--status-success)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Clock size={16} />
                </span>
              </div>
              <div
                className="tnum"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: costSummary.remaining > 0 ? "var(--status-warning)" : "var(--status-success)",
                  marginTop: 8,
                }}
              >
                {formatInr(costSummary.remaining, { compact: true })}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
                {costSummary.remaining > 0 ? "Waiting to be paid" : "All approved bills are cleared"}
              </div>
            </BtCard>
          </div>
        )}

        {/* Spend vs budget chart */}
        {showChart && (
          <BtCard padding="20px 24px" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Spend vs budget by category</h3>
            <p style={{ margin: "4px 0 12px", fontSize: 14, color: "var(--ink-2)" }}>
              Actual spend against each category's budget.
            </p>
            <div style={{ width: "100%", height: 260 }}>
              <SpendVsBudgetChart data={chartData} />
            </div>
          </BtCard>
        )}

        {/* ── Toolbar ── */}
        <BtCard padding="14px 18px" style={{ marginBottom: 16, overflow: "visible" }}>
          <div className="fr-toolbar">
            <div style={{ position: "relative", flex: "1 1 300px", maxWidth: 460 }}>
              <BtField
                label="Search"
                size="compact"
                icon={Search}
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedItemName("");
                  setShowSuggestions(true);
                  setCurrentPage(1);
                }}
                placeholder="Description, contractor, brand, amount"
                suffix={
                  searchQuery.trim().length > 0 ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedItemName("");
                        setShowSuggestions(false);
                        setCurrentPage(1);
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", display: "flex", padding: 6, margin: -6 }}
                    >
                      <X size={16} />
                    </button>
                  ) : undefined
                }
              />

              {showSuggestions && textQuerySuggestions.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Search suggestions"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-input)",
                    boxShadow: "var(--shadow-raised)",
                    zIndex: 50,
                    maxHeight: 240,
                    overflowY: "auto",
                    padding: 6,
                  }}
                >
                  {textQuerySuggestions.map((name) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      key={name}
                      className="bt-hover-row"
                      onMouseDown={() => {
                        setSearchQuery(name);
                        setSelectedItemName(name);
                        setShowSuggestions(false);
                      }}
                      style={{
                        display: "flex",
                        width: "100%",
                        alignItems: "center",
                        gap: 8,
                        minHeight: 40,
                        padding: "0 12px",
                        border: "none",
                        background: "transparent",
                        borderRadius: 10,
                        fontFamily: "var(--font-ui)",
                        fontSize: 14,
                        color: "var(--ink)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <Search size={14} color="var(--ink-3)" />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <BtButton variant="secondary" size="small" icon={SlidersHorizontal} onClick={openCustomizeModal}>
                Edit Columns
              </BtButton>
              <BtButton
                variant="secondary"
                size="small"
                icon={ArrowUpDown}
                aria-label={`Sort order, currently ${sortHint}. Click to reverse.`}
                onClick={() => setSortAscending(!sortAscending)}
              >
                {sortHint}
              </BtButton>
            </div>
          </div>
        </BtCard>

        {/* ── Entries ── */}
        {isFirstLoad ? (
          <BtCard padding="20px">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-busy="true" aria-label="Loading entries">
              <BtSkeleton height="36px" borderRadius="var(--r-tile)" />
              {[0, 1, 2, 3, 4].map((i) => (
                <BtSkeleton key={i} height="44px" borderRadius="var(--r-tile)" />
              ))}
            </div>
          </BtCard>
        ) : viewMode === "table" && paginatedEntries.length === 0 ? (
          <BtCard padding="8px">{emptyState}</BtCard>
        ) : viewMode === "table" ? (
          <BtCard padding="0" style={{ overflow: "hidden" }}>
            <div className="fr-scroll">
              <table className="bt-table fr-table">
                <thead>
                  <tr>
                    <th className="fr-sl" scope="col">#</th>
                    {uiActiveCols.map((colName) => {
                      const sortKey = sortKeyForColumn(colName);
                      const isSorted = sortKey && sortColumn === sortKey;
                      return (
                        <th
                          key={colName}
                          scope="col"
                          className={`${MONEY_COLS.has(colName) || NUMBER_COLS.has(colName) ? "num" : ""} ${colName === "Actions" ? "fr-sr" : ""}`}
                          data-sort={sortKey || undefined}
                          aria-sort={isSorted ? (sortAscending ? "ascending" : "descending") : undefined}
                          tabIndex={sortKey ? 0 : undefined}
                          onClick={sortKey ? () => handleSortClick(colName) : undefined}
                          onKeyDown={
                            sortKey
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleSortClick(colName);
                                  }
                                }
                              : undefined
                          }
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {colName === "Amount" ? "Amount (INR)" : colName}
                            {isSorted && (sortAscending ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {                    paginatedEntries.map((entry, rowIdx) => {
                      const globalRowIdx = (safeCurrentPage - 1) * rowsPerPage + rowIdx + 1;
                      return (
                        <tr
                          key={entry.id || rowIdx}
                          tabIndex={0}
                          aria-label={`Open details for ${entry.description || "entry"}`}
                          onClick={(e) => {
                            if (e.target.closest("button")) return;
                            setDetailsEntry(entry);
                          }}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setDetailsEntry(entry);
                            }
                          }}
                        >
                          <td className="fr-sl" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>
                            {globalRowIdx}
                          </td>
                          {uiActiveCols.map((colName) => renderCell(colName, entry))}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {paginationBar}
          </BtCard>
        ) : (
          /* ── Cards view ── */
          <div>
            {paginatedEntries.length === 0 ? (
              <BtCard padding="8px">{emptyState}</BtCard>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
                    gap: 16,
                  }}
                >
                  {paginatedEntries.map((entry) => {
                    const { name: projectName, none: noProj } = projectLabel(entry);
                    const payStatus = getPaymentStatusLabel(entry.paymentStatus, {
                      amount: entry.amount,
                      paidAmount: entry.paidAmount,
                    });
                    const rem = Math.max(0, (entry.amount || 0) - (entry.paidAmount || 0));
                    const typeKey = TYPE_LABELS[entry.type] ? entry.type : "material";

                    return (
                      <BtCard
                        key={entry.id}
                        padding="18px 20px"
                        className="bt-hover-card"
                        role="button"
                        tabIndex={0}
                        aria-label={`Open details for ${entry.description || "entry"}`}
                        onClick={() => setDetailsEntry(entry)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDetailsEntry(entry);
                          }
                        }}
                        style={{ display: "flex", flexDirection: "column", gap: 12 }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <BtBadge tone={typeKey} label={TYPE_LABELS[typeKey]} />
                          <BtBadge tone={statusTone(payStatus)} label={payStatus} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", overflowWrap: "anywhere" }}>
                            {entry.description || "Entry"}
                          </div>
                          <div style={{ fontSize: 13, color: noProj ? "var(--ink-3)" : "var(--ink-2)", marginTop: 2 }}>
                            {projectName}
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
                          <div>
                            <div className="bt-eyebrow" style={{ color: "var(--ink-3)" }}>Amount</div>
                            <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
                              {formatInr(entry.amount)}
                            </div>
                          </div>
                          {rem > 0 && (
                            <div style={{ textAlign: "right" }}>
                              <div className="bt-eyebrow" style={{ color: "var(--ink-3)" }}>Balance due</div>
                              <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--status-danger)" }}>
                                {formatInr(rem)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                            borderTop: "1px solid var(--line)",
                            paddingTop: 12,
                            fontSize: 13,
                            color: "var(--ink-3)",
                            minHeight: 44,
                          }}
                        >
                          <span>{formatDateShort(entry.date)}</span>
                          {canRecordPayment && rem > 0 && (
                            <BtButton
                              variant="secondary"
                              size="compact"
                              icon={CreditCard}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecordPaymentClick(entry);
                              }}
                            >
                              Record payment
                            </BtButton>
                          )}
                        </div>
                      </BtCard>
                    );
                  })}
                </div>
                <BtCard padding="0" style={{ marginTop: 16 }}>{paginationBar}</BtCard>
              </>
            )}
          </div>
        )}
      </BtSheet>

      {/* ── Edit columns ── */}
      {showCustomizeModal && (
        <ModalShell
          title="Edit columns"
          subtitle="Tick the columns to show and use the arrows to reorder them."
          onClose={() => setShowCustomizeModal(false)}
          maxWidth={420}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "50vh", overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
            {tempAllCols.map((col, idx) => {
              const isChecked = tempActiveCols.includes(col);
              return (
                <div
                  key={col}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "4px 6px 4px 14px",
                    background: isChecked ? "var(--bone)" : "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-tile)",
                    minHeight: 48,
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 15, fontWeight: 600, flex: 1, minHeight: 40 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleColumn(col)}
                      style={{ accentColor: "var(--ink)", width: 18, height: 18 }}
                    />
                    <span>{col}</span>
                  </label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <BtIconButton icon={ChevronUp} label={`Move ${col} up`} size={36} disabled={idx === 0} onClick={() => handleMoveColumn(idx, -1)} />
                    <BtIconButton icon={ChevronDown} label={`Move ${col} down`} size={36} disabled={idx === tempAllCols.length - 1} onClick={() => handleMoveColumn(idx, 1)} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20 }}>
            <BtButton variant="primary" size="normal" fullWidth onClick={saveCustomizeColumns}>
              Save columns
            </BtButton>
          </div>
        </ModalShell>
      )}

      {/* ── Entry details drawer ── */}
      {detailsEntry && (
        <DetailsDrawer
          entry={detailsEntry}
          projectInfo={projectLabel(detailsEntry)}
          canAddEdit={canAddEdit}
          canRecordPayment={canRecordPayment}
          onClose={() => setDetailsEntry(null)}
          onAddMore={() => {
            const entry = detailsEntry;
            setDetailsEntry(null);
            handleAddMore(entry);
          }}
          onRecordPayment={() => {
            const entry = detailsEntry;
            setDetailsEntry(null);
            handleRecordPaymentClick(entry);
          }}
          onEdit={() => {
            const entry = detailsEntry;
            setDetailsEntry(null);
            handleEditEntry(entry);
          }}
        />
      )}

      {/* ── Import CSV ── */}
      {showImportModal && (
        <ModalShell
          title="Import or revert CSV"
          subtitle="Bring entries in from a spreadsheet, or undo a previous import."
          onClose={() => setShowImportModal(false)}
          maxWidth={860}
          zIndex={1100}
        >
          <CsvImport onComplete={() => window.location.reload()} />
        </ModalShell>
      )}

      {/* ── Export ── */}
      {showExportModal && (
        <ModalShell
          title="Export report"
          subtitle="Choose a format for the entries you are viewing."
          onClose={() => setShowExportModal(false)}
          maxWidth={440}
          zIndex={1200}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              className="fr-option"
              onClick={() => {
                setShowExportModal(false);
                handleExportPDF();
              }}
            >
              <span style={{ width: 44, height: 44, borderRadius: "var(--r-tile)", background: "var(--ink)", color: "#FFFFFF", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                PDF
              </span>
              <span>
                <span style={{ display: "block", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>Download PDF report</span>
                <span style={{ display: "block", fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>Ready to print or share with clients</span>
              </span>
            </button>

            <button
              type="button"
              className="fr-option"
              onClick={() => {
                setShowExportModal(false);
                handleExportCSV(false);
              }}
            >
              <span style={{ width: 44, height: 44, borderRadius: "var(--r-tile)", background: "var(--status-success-soft)", color: "var(--status-success)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                CSV
              </span>
              <span>
                <span style={{ display: "block", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>Download CSV spreadsheet</span>
                <span style={{ display: "block", fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>Opens cleanly in Excel or Google Sheets</span>
              </span>
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Reject reason ── */}
      {rejectTarget && (
        <ModalShell
          title="Reject this entry?"
          subtitle={rejectTarget.description || "Entry"}
          onClose={() => !rejectBusy && setRejectTarget(null)}
          maxWidth={440}
          zIndex={1300}
        >
          <BtTextarea
            label="Reason"
            rows={3}
            placeholder="Tell the team why this entry is being rejected"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <BtButton variant="secondary" size="normal" disabled={rejectBusy} onClick={() => setRejectTarget(null)} style={{ flex: 1 }}>
              Cancel
            </BtButton>
            <BtButton variant="destructive" size="normal" loading={rejectBusy} onClick={confirmInlineReject} style={{ flex: 1 }}>
              Reject entry
            </BtButton>
          </div>
        </ModalShell>
      )}

      {/* Record Payment Sheet */}
      <RecordPaymentSheet
        open={paymentSheetOpen}
        entry={paymentItem}
        projects={projects}
        onClose={() => setPaymentSheetOpen(false)}
        onSaved={(msg) => {
          setToast({
            msg: msg || "Payment recorded successfully",
            type: "success",
          });
          loadData();
        }}
      />
    </div>
  );
}

/* ───────────────────────── local building blocks ───────────────────────── */

function HeroMenu({ icon, label, active, open, onToggle, menuRef, title, width, children }) {
  const Icon = icon;
  return (
    <div ref={menuRef} style={{ position: "relative", maxWidth: "100%" }}>
      <button
        type="button"
        className="fr-chip"
        data-active={active}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
      >
        <Icon size={15} />
        <span className="fr-chip-label">{label}</span>
        <ChevronDown
          size={14}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms ease", opacity: 0.7, flexShrink: 0 }}
        />
      </button>
      {open && (
        <div className="fr-menu" style={{ width }}>
          <div className="bt-eyebrow fr-menu-title">{title}</div>
          <div className="fr-menu-list" role="listbox" aria-label={title}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function HeroMenuItem({ selected, icon: Icon, onClick, children }) {
  return (
    <button type="button" role="option" aria-selected={selected} className="fr-menu-item" onClick={onClick}>
      <span>
        {Icon && <Icon size={15} color={selected ? "var(--accent)" : "var(--on-noir-3)"} style={{ flexShrink: 0 }} />}
        <span>{children}</span>
      </span>
      {selected && <Check size={15} color="var(--accent)" style={{ flexShrink: 0 }} />}
    </button>
  );
}

function ModalShell({ title, subtitle, onClose, maxWidth = 440, zIndex = 1000, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fr-scrim"
      role="presentation"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="fr-modal" style={{ maxWidth }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "22px 24px 16px" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {title}
            </h2>
            {subtitle && <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-2)" }}>{subtitle}</p>}
          </div>
          <BtIconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="fr-modal-body">{children}</div>
      </div>
    </div>
  , document.body);
}

function DetailsDrawer({ entry, projectInfo, canAddEdit, canRecordPayment, onClose, onAddMore, onRecordPayment, onEdit }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total = Number(entry.rawTx?.amount || entry.amount || 0);
  const paid = Number(entry.rawTx?.paidAmount || 0);
  const balance = Number(entry.rawTx?.remainingAmount ?? total - paid);
  const status = getPaymentStatusLabel(entry.paymentStatus, entry.rawTx);
  const typeKey = TYPE_LABELS[entry.type] ? entry.type : "material";
  const history = entry.rawTx?.paymentHistory || [];

  const rows = [
    { label: "Project", val: projectInfo.name, dim: projectInfo.none },
    { label: "Date", val: formatDateLong(entry.date) },
    { label: "Description", val: entry.description },
    { label: "Brand", val: entry.brand },
    { label: "Floor", val: entry.floor },
    { label: "Phase", val: entry.phase },
    { label: "Unit", val: entry.unit },
    { label: "Rejection reason", val: entry.rejectionReason, danger: true },
  ].filter((r) => r.val);

  return createPortal(
    <div
      className="fr-scrim fr-drawer-scrim"
      role="presentation"
      style={{ zIndex: 900 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Entry details" className="fr-drawer">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "22px 24px 12px" }}>
          <div>
            <div className="bt-eyebrow" style={{ color: "var(--ink-3)" }}>Entry details</div>
            <h2 style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}>
              {entry.description || "Entry"}
            </h2>
          </div>
          <BtIconButton icon={X} label="Close details" onClick={onClose} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 24px 16px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <BtBadge tone={typeKey} label={TYPE_LABELS[typeKey]} />
            <BtBadge tone={statusTone(status)} label={status} />
          </div>

          <div className="bt-grid-3" style={{ gap: 10, marginBottom: 20 }}>
            {[
              { label: "Total", val: total, color: "var(--ink)" },
              { label: "Paid", val: paid, color: "var(--status-success)" },
              { label: "Balance", val: balance, color: balance > 0 ? "var(--status-danger)" : "var(--status-success)" },
            ].map((k) => (
              <div key={k.label} style={{ background: "var(--bone)", border: "1px solid var(--line)", borderRadius: "var(--r-tile)", padding: "10px 12px", minWidth: 0 }}>
                <div className="bt-eyebrow" style={{ color: "var(--ink-3)" }}>{k.label}</div>
                <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: k.color, marginTop: 2, overflowWrap: "anywhere" }}>
                  {formatInr(k.val)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((row) => (
              <div
                key={row.label}
                style={{ display: "grid", gridTemplateColumns: "128px minmax(0, 1fr)", gap: 12, padding: "11px 0", borderTop: "1px solid var(--line)", fontSize: 14 }}
              >
                <span style={{ color: "var(--ink-3)" }}>{row.label}</span>
                <span style={{ color: row.danger ? "var(--status-danger)" : row.dim ? "var(--ink-3)" : "var(--ink)", fontWeight: 500, overflowWrap: "anywhere" }}>
                  {row.val}
                </span>
              </div>
            ))}
          </div>

          {history.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="bt-eyebrow" style={{ color: "var(--ink-3)", marginBottom: 10 }}>Payment history</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((ph, idx) => (
                  <div
                    key={idx}
                    style={{ padding: "10px 14px", borderRadius: "var(--r-tile)", background: "var(--bone)", border: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                  >
                    <div>
                      <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>
                        {formatInr(ph.amount)}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{formatDateLong(ph.date)}</div>
                    </div>
                    <BtBadge tone="neutral" showDot={false} label={ph.method || "Cash"} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {(canAddEdit || canRecordPayment) && (
          <div style={{ display: "flex", gap: 8, padding: "14px 24px 20px", borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
            {canAddEdit && (
              <BtButton variant="secondary" size="small" icon={PlusCircle} onClick={onAddMore} style={{ flex: "1 1 auto" }}>
                Add more
              </BtButton>
            )}
            {canRecordPayment && (
              <BtButton variant="primary" size="small" icon={CreditCard} onClick={onRecordPayment} style={{ flex: "1 1 auto" }}>
                Record payment
              </BtButton>
            )}
            {canAddEdit && (
              <BtButton variant="secondary" size="small" icon={Edit2} onClick={onEdit} style={{ flex: "1 1 auto" }}>
                Edit entry
              </BtButton>
            )}
          </div>
        )}
      </div>
    </div>
  , document.body);
}
