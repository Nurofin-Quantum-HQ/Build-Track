import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { projectAPI, transactionAPI, userAPI } from "../api";
import useProjectStore from "../stores/projectStore";
import useTransactionStore from "../stores/transactionStore";
import perfLogger from "../utils/performanceLogger";
import { Toast } from "../components/Toast";
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
import BtCard from "../components/ui/BtCard";
import BtChip from "../components/ui/BtChip";
import BtSegmented from "../components/ui/BtSegmented";
import BtBadge from "../components/ui/BtBadge";
import BtEmpty from "../components/ui/BtEmpty";
import BtButton from "../components/ui/BtButton";
import BtPressable from "../components/ui/BtPressable";

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
  const [toast, setToast] = useState({ msg: "", type: "info" });

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

  const clearToast = useCallback(() => setToast({ msg: "", type: "info" }), []);

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
      return match ? match.projectName || match.name : "Unknown Project";
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
    navigate(
      `/manualentry?type=${activeKey}&project=${entry.projectId}&name=${entry.description}&unit=${entry.unit}&brand=${entry.brand || ""}&isDuplicate=true&sourceTransactionId=${sourceId}&returnUrl=${returnUrl}`
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
        const statusStr = getPaymentStatusLabel(entry.paymentStatus);
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
          if (col === "Purchased Date") {
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
  const uiActiveCols = [...activeCols, "Add More", "Record Payment", "Actions"];

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

  const handleInlineReject = async (entry) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;
    try {
      await transactionAPI.reject(entry.rawTx?._id || entry.id, reason);
      setToast({ msg: "Entry rejected", type: "info" });
      loadData();
    } catch (err) {
      setToast({
        msg: err.response?.data?.message || "Failed to reject entry",
        type: "error",
      });
    }
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
      <ModuleTour
        steps={tourSteps}
        run={runTour}
        setRun={setRunTour}
        moduleName="FinancialReportPage"
      />
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />

      {/* ── TOP HERO (Deep Noir with blueprint grid & glow) ── */}
      <BtHero padding="24px 32px 48px">
        {/* Row 1: Eyebrow + Title + Header Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.08em",
                color: "var(--on-noir-2)",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {totalCount} {totalCount === 1 ? "ENTRY" : "ENTRIES"} ·{" "}
              {(datePreset || "All Time").toUpperCase()}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--bone)",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Reports
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--on-noir-2)",
                margin: "4px 0 0",
              }}
            >
              Financial analytics &amp; transaction log audit
            </p>
          </div>

          {/* Action buttons on dark hero */}
          <div
            className="tour-export-btns"
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
          >
            <button
              onClick={() => setRunTour(true)}
              title="Tour &amp; Guidelines"
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--r-btn, 12px)",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "var(--bone)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")
              }
            >
              <HelpCircle size={17} />
            </button>

            <button
              onClick={() => navigate("/ai-chat")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 38,
                padding: "0 14px",
                borderRadius: "var(--r-btn, 12px)",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "var(--bone)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")
              }
            >
              <Sparkles size={15} color="var(--accent)" />
              <span>Ask AI</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 38,
                padding: "0 14px",
                borderRadius: "var(--r-btn, 12px)",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "var(--bone)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")
              }
            >
              <FileSpreadsheet size={15} />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              disabled={filteredEntries.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 38,
                padding: "0 16px",
                borderRadius: "var(--r-btn, 12px)",
                background: "#FFFFFF",
                border: "none",
                color: "var(--ink)",
                fontSize: 13,
                fontWeight: 700,
                cursor: filteredEntries.length === 0 ? "not-allowed" : "pointer",
                opacity: filteredEntries.length === 0 ? 0.6 : 1,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "transform 150ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Download size={15} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Row 2: Horizontal Filter Chips on Dark */}
        <div
          className="tour-project-filter"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 4,
          }}
        >
          {/* Project selector dropdown (Blueprint Noir) */}
          <div ref={projectDropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setProjectDropdownOpen((v) => !v);
                setDateDropdownOpen(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 12px",
                borderRadius: "var(--r-btn, 12px)",
                background: selectedProjectId !== "all" ? "rgba(224, 169, 59, 0.16)" : "rgba(255, 255, 255, 0.08)",
                border: selectedProjectId !== "all" ? "1px solid rgba(224, 169, 59, 0.38)" : "1px solid rgba(255, 255, 255, 0.14)",
                color: selectedProjectId !== "all" ? "var(--accent, #E0A93B)" : "var(--bone, #F6F4EF)",
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: "var(--font-ui)",
                cursor: "pointer",
                transition: "all 140ms ease",
                whiteSpace: "nowrap",
                backdropFilter: "blur(8px)",
              }}
            >
              <Building2 size={14} color={selectedProjectId !== "all" ? "var(--accent)" : "rgba(255, 255, 255, 0.75)"} />
              <span>
                {selectedProjectId === "all" ? "All projects" : getProjectName(selectedProjectId)}
              </span>
              <ChevronDown
                size={13}
                style={{
                  transform: projectDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease",
                  opacity: 0.7,
                }}
              />
            </button>

            {projectDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  width: "280px",
                  background: "var(--noir-2, #14171D)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: "14px",
                  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.7)",
                  zIndex: 200,
                  padding: "6px",
                  backdropFilter: "blur(20px)",
                  animation: "fadeIn 120ms ease",
                }}
              >
                <div
                  style={{
                    padding: "6px 10px 6px",
                    fontSize: "10.5px",
                    fontFamily: "var(--font-mono)",
                    color: "rgba(246, 244, 239, 0.45)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    marginBottom: "4px",
                  }}
                >
                  Select Project
                </div>

                <div
                  onClick={() => {
                    setSelectedProjectId("all");
                    setSelectedFloor("");
                    setSelectedPhaseId("");
                    setSelectedActivityName("");
                    setCurrentPage(1);
                    setProjectDropdownOpen(false);
                  }}
                  style={{
                    padding: "9px 11px",
                    borderRadius: "9px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    background: selectedProjectId === "all" ? "rgba(255, 255, 255, 0.10)" : "transparent",
                    color: selectedProjectId === "all" ? "var(--bone, #F6F4EF)" : "rgba(246, 244, 239, 0.8)",
                    fontSize: 13,
                    fontWeight: selectedProjectId === "all" ? 600 : 500,
                    transition: "background 100ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProjectId !== "all") e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProjectId !== "all") e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Building2 size={14} color="var(--accent, #E0A93B)" />
                    <span>All projects</span>
                  </div>
                  {selectedProjectId === "all" && <Check size={14} color="var(--accent, #E0A93B)" />}
                </div>

                {projects.length > 0 && (
                  <div
                    style={{
                      maxHeight: "220px",
                      overflowY: "auto",
                      marginTop: "4px",
                      paddingTop: "4px",
                      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {projects.map((p) => {
                      const pid = p._id || p.id;
                      const isSel = selectedProjectId === pid;
                      return (
                        <div
                          key={pid}
                          onClick={() => {
                            setSelectedProjectId(pid);
                            setSelectedFloor("");
                            setSelectedPhaseId("");
                            setSelectedActivityName("");
                            setCurrentPage(1);
                            setProjectDropdownOpen(false);
                          }}
                          style={{
                            padding: "9px 11px",
                            borderRadius: "9px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            background: isSel ? "rgba(255, 255, 255, 0.10)" : "transparent",
                            color: isSel ? "var(--bone, #F6F4EF)" : "rgba(246, 244, 239, 0.8)",
                            fontSize: 13,
                            fontWeight: isSel ? 600 : 500,
                            transition: "background 100ms ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSel) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSel) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
                            <Building2 size={14} color={isSel ? "var(--accent)" : "rgba(255, 255, 255, 0.45)"} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.projectName || p.name}
                            </span>
                          </div>
                          {isSel && <Check size={14} color="var(--accent, #E0A93B)" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date preset selector dropdown (Blueprint Noir) */}
          <div ref={dateDropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setDateDropdownOpen((v) => !v);
                setProjectDropdownOpen(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 12px",
                borderRadius: "var(--r-btn, 12px)",
                background: datePreset !== "All Time" ? "rgba(224, 169, 59, 0.16)" : "rgba(255, 255, 255, 0.08)",
                border: datePreset !== "All Time" ? "1px solid rgba(224, 169, 59, 0.38)" : "1px solid rgba(255, 255, 255, 0.14)",
                color: datePreset !== "All Time" ? "var(--accent, #E0A93B)" : "var(--bone, #F6F4EF)",
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: "var(--font-ui)",
                cursor: "pointer",
                transition: "all 140ms ease",
                whiteSpace: "nowrap",
                backdropFilter: "blur(8px)",
              }}
            >
              <Calendar size={14} color={datePreset !== "All Time" ? "var(--accent)" : "rgba(255, 255, 255, 0.75)"} />
              <span>
                {datePreset === "Custom" && (startDate || endDate)
                  ? `${startDate ? formatDateShort(startDate) : "…"} – ${endDate ? formatDateShort(endDate) : "…"}`
                  : datePreset}
              </span>
              <ChevronDown
                size={13}
                style={{
                  transform: dateDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease",
                  opacity: 0.7,
                }}
              />
            </button>

            {dateDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  width: "220px",
                  background: "var(--noir-2, #14171D)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: "14px",
                  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.7)",
                  zIndex: 200,
                  padding: "6px",
                  backdropFilter: "blur(20px)",
                  animation: "fadeIn 120ms ease",
                }}
              >
                <div
                  style={{
                    padding: "6px 10px 6px",
                    fontSize: "10.5px",
                    fontFamily: "var(--font-mono)",
                    color: "rgba(246, 244, 239, 0.45)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    marginBottom: "4px",
                  }}
                >
                  Date Preset
                </div>

                {[
                  "All Time",
                  "Today",
                  "This Week",
                  "This Month",
                  "Last 30 Days",
                  "This Year",
                  "Custom",
                ].map((preset) => {
                  const isSel = datePreset === preset;
                  return (
                    <div
                      key={preset}
                      onClick={() => {
                        handleDatePreset(preset);
                        setDateDropdownOpen(false);
                      }}
                      style={{
                        padding: "8px 11px",
                        borderRadius: "9px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        background: isSel ? "rgba(255, 255, 255, 0.10)" : "transparent",
                        color: isSel ? "var(--bone, #F6F4EF)" : "rgba(246, 244, 239, 0.8)",
                        fontSize: 13,
                        fontWeight: isSel ? 600 : 500,
                        transition: "background 100ms ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSel) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSel) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span>{preset}</span>
                      {isSel && <Check size={14} color="var(--accent, #E0A93B)" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scoping Filters toggle chip */}
          <BtChip
            label={
              extraFiltersCount === 0
                ? "Filter"
                : `Filter · ${extraFiltersCount}`
            }
            onDark={true}
            selected={extraFiltersCount > 0 || showFiltersDrawer}
            icon={Filter}
            onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
          />

          {/* Chart Toggle Chip */}
          <BtChip
            label={showChart ? "Hide Chart" : "Analytics Chart"}
            onDark={true}
            selected={showChart}
            icon={SlidersHorizontal}
            onClick={() => setShowChart(!showChart)}
          />

          {/* Reset Filters chip */}
          {(selectedProjectId !== "all" ||
            datePreset !== "All Time" ||
            extraFiltersCount > 0 ||
            searchQuery.trim().length > 0) && (
            <button
              onClick={() => {
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
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 36,
                padding: "0 12px",
                borderRadius: "var(--r-chip)",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#FCA5A5",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </BtHero>

      {/* ── MAIN CONTENT (Overlapping BtSheet) ── */}
      <BtSheet overlap={26} padding="24px 32px 64px">
        {/* Category Tabs: All | Materials | Labour | Equipment */}
        <div
          className="tour-report-tabs"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
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
          />

          {/* View Toggle: Table vs Cards */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--fill)",
              borderRadius: "var(--r-tile)",
              padding: 3,
            }}
          >
            <button
              onClick={() => setViewMode("table")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                height: 32,
                borderRadius: 10,
                background: viewMode === "table" ? "#FFFFFF" : "transparent",
                color: viewMode === "table" ? "var(--ink)" : "var(--ink-soft)",
                boxShadow:
                  viewMode === "table"
                    ? "0 1px 3px rgba(12, 14, 18, 0.08)"
                    : "none",
                fontSize: 12.5,
                fontWeight: viewMode === "table" ? 700 : 500,
                cursor: "pointer",
                border: "none",
              }}
            >
              <TableIcon size={14} />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                height: 32,
                borderRadius: 10,
                background: viewMode === "cards" ? "#FFFFFF" : "transparent",
                color: viewMode === "cards" ? "var(--ink)" : "var(--ink-soft)",
                boxShadow:
                  viewMode === "cards"
                    ? "0 1px 3px rgba(12, 14, 18, 0.08)"
                    : "none",
                fontSize: 12.5,
                fontWeight: viewMode === "cards" ? 700 : 500,
                cursor: "pointer",
                border: "none",
              }}
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
          </div>
        </div>

        {/* Expandable Scoping Filters Bar */}
        {showFiltersDrawer && (
          <div
            style={{
              background: "var(--card)",
              borderRadius: "var(--r-card)",
              border: "1px solid var(--line)",
              padding: 20,
              marginBottom: 20,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Granular Scoping Filters
              </span>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-soft)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {/* Floor */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                    marginBottom: 5,
                  }}
                >
                  Floor
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    disabled={selectedProjectId === "all" || floors.length === 0}
                    value={floors.length === 0 ? "" : selectedFloor || "Select Floor"}
                    onChange={(e) => {
                      setSelectedFloor(
                        e.target.value === "Select Floor" ? "" : e.target.value
                      );
                      setCurrentPage(1);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background:
                        selectedProjectId === "all" || floors.length === 0
                          ? "var(--fill)"
                          : "#FFFFFF",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink)",
                      outline: "none",
                    }}
                  >
                    <option value={floors.length === 0 ? "" : "Select Floor"}>
                      {floors.length === 0 ? "No floors" : "All Floors"}
                    </option>
                    {floors.map((fl, idx) => (
                      <option
                        key={idx}
                        value={typeof fl === "string" ? fl : fl.name}
                      >
                        {typeof fl === "string" ? fl : fl.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phase */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                    marginBottom: 5,
                  }}
                >
                  Phase
                </label>
                <select
                  disabled={selectedProjectId === "all" || phases.length === 0}
                  value={selectedPhaseId || "Select Phase"}
                  onChange={(e) => {
                    const val =
                      e.target.value === "Select Phase" ? "" : e.target.value;
                    setSelectedPhaseId(val);
                    setSelectedActivityName("");
                    setCurrentPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background:
                      selectedProjectId === "all" || phases.length === 0
                        ? "var(--fill)"
                        : "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink)",
                    outline: "none",
                  }}
                >
                  <option value="Select Phase">All Phases</option>
                  {phases.map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.phaseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                    marginBottom: 5,
                  }}
                >
                  Activity
                </label>
                <select
                  disabled={
                    selectedProjectId === "all" ||
                    uniqueActivityNames.length === 0
                  }
                  value={selectedActivityName || "Select Activity"}
                  onChange={(e) => {
                    setSelectedActivityName(
                      e.target.value === "Select Activity" ? "" : e.target.value
                    );
                    setCurrentPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background:
                      selectedProjectId === "all" ||
                      uniqueActivityNames.length === 0
                        ? "var(--fill)"
                        : "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink)",
                    outline: "none",
                  }}
                >
                  <option value="Select Activity">All Activities</option>
                  {uniqueActivityNames.map((actName, idx) => (
                    <option key={idx} value={actName}>
                      {actName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                    marginBottom: 5,
                  }}
                >
                  Payment Status
                </label>
                <select
                  value={selectedPaymentStatus}
                  onChange={(e) => {
                    setSelectedPaymentStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink)",
                    outline: "none",
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Fully Paid">Fully Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Not Paid">Not Paid</option>
                </select>
              </div>

              {/* Custom Date Range if Custom Selected */}
              {datePreset === "Custom" && (
                <>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ink-soft)",
                        marginBottom: 5,
                      }}
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={isValidDate(startDate) ? startDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => {
                        const d = e.target.value ? new Date(e.target.value) : null;
                        setStartDate(isValidDate(d) ? d : null);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        background: "#FFFFFF",
                        fontSize: 13,
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ink-soft)",
                        marginBottom: 5,
                      }}
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      value={isValidDate(endDate) ? endDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => {
                        const d = e.target.value ? new Date(e.target.value) : null;
                        setEndDate(isValidDate(d) ? d : null);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        background: "#FFFFFF",
                        fontSize: 13,
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── SUMMARY STRIP (Total Billed · Paid · Remaining) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {/* Card 1: Total Billed */}
          <div
            style={{
              background: "var(--ink)",
              color: "#FFFFFF",
              borderRadius: "var(--r-card)",
              padding: "20px 24px",
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 110,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--on-noir-2)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Total Billed
              </span>
              <CreditCard size={18} color="var(--accent)" />
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                color: "var(--bone)",
                marginTop: 6,
              }}
            >
              {formatINR(costSummary.totalBilled)}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                fontSize: 12,
                color: "var(--on-noir-2)",
                marginTop: 4,
              }}
            >
              <span>Mat: {formatINR(costSummary.material)}</span>
              <span>·</span>
              <span>Lab: {formatINR(costSummary.labour)}</span>
              <span>·</span>
              <span>Eq: {formatINR(costSummary.equipment)}</span>
            </div>
          </div>

          {/* Card 2: Total Paid */}
          <div
            style={{
              background: "var(--card)",
              borderRadius: "var(--r-card)",
              border: "1px solid var(--line)",
              padding: "20px 24px",
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 110,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Paid Out
              </span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--success-soft)",
                  color: "var(--success)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CheckCircle size={16} />
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--success)",
                fontVariantNumeric: "tabular-nums",
                marginTop: 6,
              }}
            >
              {formatINR(costSummary.paid)}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
              {costSummary.totalBilled > 0
                ? `${Math.round((costSummary.paid / costSummary.totalBilled) * 100)}% of billed amount cleared`
                : "No bills recorded"}
            </div>
          </div>

          {/* Card 3: Remaining / Due */}
          <div
            style={{
              background: "var(--card)",
              borderRadius: "var(--r-card)",
              border: "1px solid var(--line)",
              padding: "20px 24px",
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 110,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Remaining Due
              </span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background:
                    costSummary.remaining > 0
                      ? "var(--warn-soft)"
                      : "var(--success-soft)",
                  color:
                    costSummary.remaining > 0 ? "var(--warn)" : "var(--success)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Clock size={16} />
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color:
                  costSummary.remaining > 0 ? "var(--warn)" : "var(--success)",
                fontVariantNumeric: "tabular-nums",
                marginTop: 6,
              }}
            >
              {formatINR(costSummary.remaining)}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
              {costSummary.remaining > 0
                ? "Pending payment settlement"
                : "All approved bills cleared"}
            </div>
          </div>
        </div>

        {/* Visual Analytics Chart: Spend vs Budget (collapsible) */}
        {showChart && (
          <div
            style={{
              background: "var(--card)",
              borderRadius: "var(--r-card)",
              border: "1px solid var(--line)",
              padding: "20px 24px",
              marginBottom: 20,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  Spend vs Budget by Category
                </h3>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                  }}
                >
                  Compare actual expenses against allocated category budgets
                </p>
              </div>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <SpendVsBudgetChart data={chartData} />
            </div>
          </div>
        )}

        {/* ── TOOLBAR (Search · Suggestions · Edit Columns · Sort) ── */}
        <div
          style={{
            background: "var(--card)",
            borderRadius: "var(--r-card)",
            border: "1px solid var(--line)",
            padding: "14px 18px",
            marginBottom: 16,
            boxShadow: "var(--shadow-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Live Search Bar */}
          <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 440 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--fill)",
                borderRadius: "var(--r-btn, 12px)",
                padding: "8px 14px",
                border: "1px solid transparent",
              }}
            >
              <Search size={16} color="var(--ink-soft)" />
              <input
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedItemName("");
                  setShowSuggestions(true);
                  setCurrentPage(1);
                }}
                placeholder="Search description, contractor, brand, amount..."
                style={{
                  border: "none",
                  background: "transparent",
                  width: "100%",
                  outline: "none",
                  fontSize: 13,
                  fontFamily: "var(--font-ui)",
                  color: "var(--ink)",
                }}
              />
              {searchQuery.trim().length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedItemName("");
                    setShowSuggestions(false);
                    setCurrentPage(1);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-soft)",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Suggestions Popup */}
            {showSuggestions && textQuerySuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "#FFFFFF",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-card)",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  zIndex: 50,
                  maxHeight: 180,
                  overflowY: "auto",
                }}
              >
                {textQuerySuggestions.map((name) => (
                  <div
                    key={name}
                    onMouseDown={() => {
                      setSearchQuery(name);
                      setSelectedItemName(name);
                      setShowSuggestions(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "var(--ink)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--fill)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span style={{ color: "var(--accent-ink)" }}>↳</span>
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toolbar actions on right: Edit Columns, Sort */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Edit Columns */}
            <button
              onClick={() => openCustomizeModal()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 14px",
                borderRadius: "var(--r-btn, 12px)",
                border: "1px solid var(--line)",
                background: "#FFFFFF",
                color: "var(--ink)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--fill)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#FFFFFF")
              }
            >
              <SlidersHorizontal size={14} />
              <span>Edit Columns</span>
            </button>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortAscending(!sortAscending)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 14px",
                borderRadius: "var(--r-btn, 12px)",
                border: "1px solid var(--line)",
                background: "#FFFFFF",
                color: "var(--ink)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--fill)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#FFFFFF")
              }
            >
              <ArrowUpDown size={14} />
              <span>
                {sortColumn === "date"
                  ? sortAscending
                    ? "Date: Oldest"
                    : "Date: Newest"
                  : sortColumn === "amount"
                    ? sortAscending
                      ? "Amount: Low"
                      : "Amount: High"
                    : sortAscending
                      ? "Project: A–Z"
                      : "Project: Z–A"}
              </span>
            </button>
          </div>
        </div>

        {/* ── REPORT ENTRIES (Table View or Card View) ── */}
        {viewMode === "table" ? (
          <div
            style={{
              background: "var(--card)",
              borderRadius: "var(--r-card)",
              border: "1px solid var(--line)",
              overflow: "hidden",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ overflowX: "auto", position: "relative" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                {/* Sticky Header */}
                <thead>
                  <tr style={{ background: "var(--fill)" }}>
                    {/* Pinned first column: row # */}
                    <th
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 11,
                        background: "var(--fill)",
                        borderRight: "1px solid var(--line)",
                        borderBottom: "1px solid var(--line)",
                        padding: "12px 14px",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "var(--ink-soft)",
                        letterSpacing: "0.06em",
                        textAlign: "center",
                        width: 44,
                      }}
                    >
                      #
                    </th>
                    {uiActiveCols.map((colName) => {
                      const isSortable = [
                        "Date",
                        "Purchased Date",
                        "Project",
                        "Amount",
                      ].includes(colName);
                      const isAmount = colName === "Amount" || colName === "Paid" || colName === "Remaining" || colName === "Rate" || colName === "Rate/Day" || colName === "Rent Rate";

                      const handleSortClick = () => {
                        if (colName === "Date" || colName === "Purchased Date") {
                          setSortColumn("date");
                          setSortAscending(!sortAscending);
                        } else if (colName === "Project") {
                          setSortColumn("project");
                          setSortAscending(!sortAscending);
                        } else if (colName === "Amount") {
                          setSortColumn("amount");
                          setSortAscending(!sortAscending);
                        }
                      };

                      return (
                        <th
                          key={colName}
                          onClick={isSortable ? handleSortClick : undefined}
                          style={{
                            padding: "12px 16px",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            color: "var(--ink-soft)",
                            letterSpacing: "0.06em",
                            textAlign: isAmount ? "right" : "left",
                            whiteSpace: "nowrap",
                            cursor: isSortable ? "pointer" : "default",
                            borderBottom: "1px solid var(--line)",
                          }}
                        >
                          {colName === "Amount"
                            ? "AMOUNT (INR)"
                            : colName.toUpperCase()}
                          {isSortable &&
                            sortColumn ===
                              (colName === "Project"
                                ? "project"
                                : colName === "Amount"
                                  ? "amount"
                                  : "date") && (
                              <span style={{ marginLeft: 4, color: "var(--ink)" }}>
                                {sortAscending ? "▲" : "▼"}
                              </span>
                            )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {paginatedEntries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={uiActiveCols.length + 1}
                        style={{ padding: 48, textAlign: "center" }}
                      >
                        <BtEmpty
                          title="No transaction logs match filters"
                          message="Try adjusting your dates, project selection, or search keywords."
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedEntries.map((entry, rowIdx) => {
                      const projectName = getProjectName(entry.projectId);
                      const globalRowIdx = (safeCurrentPage - 1) * rowsPerPage + rowIdx + 1;

                      return (
                        <tr
                          key={entry.id || rowIdx}
                          style={{
                            borderBottom: "1px solid var(--line)",
                            cursor: "pointer",
                            transition: "background 120ms ease",
                          }}
                          onClick={(e) => {
                            if (e.target.closest("button")) return;
                            setDetailsEntry(entry);
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "var(--fill)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          {/* Pinned row number */}
                          <td
                            style={{
                              position: "sticky",
                              left: 0,
                              zIndex: 5,
                              background: "#FFFFFF",
                              borderRight: "1px solid var(--line)",
                              borderBottom: "1px solid var(--line)",
                              padding: "14px 12px",
                              fontSize: 12,
                              fontFamily: "var(--font-mono)",
                              color: "var(--ink-soft)",
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {globalRowIdx}
                          </td>

                          {uiActiveCols.map((colName) => {
                            const valStyle = {
                              padding: "14px 16px",
                              fontSize: 13,
                              color: "var(--ink)",
                              borderBottom: "1px solid var(--line)",
                              whiteSpace: "nowrap",
                            };

                            if (colName === "Purchased Date") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {formatDateShort(entry.date)}
                                </td>
                              );
                            } else if (colName === "Payment Date") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {entry.paymentDate
                                    ? formatDateShort(entry.paymentDate)
                                    : "—"}
                                </td>
                              );
                            } else if (colName === "Project") {
                              return (
                                <td
                                  key={colName}
                                  style={{ ...valStyle, fontWeight: 600 }}
                                >
                                  {projectName}
                                </td>
                              );
                            } else if (colName === "Type") {
                              const typeTones = {
                                material: "info",
                                labour: "warn",
                                equipment: "good",
                              };
                              return (
                                <td key={colName} style={valStyle}>
                                  <BtBadge tone={typeTones[entry.type] || "muted"}>
                                    {entry.type.toUpperCase()}
                                  </BtBadge>
                                </td>
                              );
                            } else if (colName === "Description") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {entry.description || "—"}
                                </td>
                              );
                            } else if (
                              colName === "Material" ||
                              colName === "Worker Type" ||
                              colName === "Equipment"
                            ) {
                              return (
                                <td key={colName} style={{ ...valStyle, fontWeight: 500 }}>
                                  {entry.description}
                                </td>
                              );
                            } else if (colName === "Brand") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {entry.brand || "—"}
                                </td>
                              );
                            } else if (colName === "Floor") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {entry.floor || "—"}
                                </td>
                              );
                            } else if (colName === "Phase") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {entry.phase || "—"}
                                </td>
                              );
                            } else if (colName === "Activity") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {entry.activity || "—"}
                                </td>
                              );
                            } else if (colName === "Unit") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {entry.unit || "—"}
                                </td>
                              );
                            } else if (colName === "Status") {
                              const payStatus = getPaymentStatusLabel(
                                entry.paymentStatus
                              );
                              const tone =
                                payStatus === "Fully Paid"
                                  ? "good"
                                  : payStatus === "Partial"
                                    ? "warn"
                                    : "bad";
                              return (
                                <td key={colName} style={valStyle}>
                                  <BtBadge tone={tone}>{payStatus}</BtBadge>
                                </td>
                              );
                            } else if (colName === "Approval") {
                              const raw = entry.rawTx || {};
                              const appStatus = raw.approvalStatus || "Approved";
                              const tone =
                                appStatus === "Approved"
                                  ? "good"
                                  : appStatus === "Rejected"
                                    ? "bad"
                                    : "warn";
                              const isPendingApproval = appStatus === "Pending";
                              return (
                                <td key={colName} style={valStyle}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <BtBadge tone={tone}>{appStatus}</BtBadge>
                                    {isPendingApproval && canApprove && (
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <button
                                          onClick={() => handleInlineApprove(entry)}
                                          title="Approve Entry"
                                          style={{
                                            border: "none",
                                            background: "var(--success-soft)",
                                            color: "var(--success)",
                                            borderRadius: 6,
                                            padding: "2px 8px",
                                            cursor: "pointer",
                                            fontWeight: 700,
                                            fontSize: 12,
                                          }}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={() => handleInlineReject(entry)}
                                          title="Reject Entry"
                                          style={{
                                            border: "none",
                                            background: "var(--danger-soft)",
                                            color: "var(--danger)",
                                            borderRadius: 6,
                                            padding: "2px 8px",
                                            cursor: "pointer",
                                            fontWeight: 700,
                                            fontSize: 12,
                                          }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            } else if (colName === "Amount") {
                              return (
                                <td
                                  key={colName}
                                  style={{
                                    ...valStyle,
                                    textAlign: "right",
                                    fontWeight: 700,
                                    fontFamily: "var(--font-display)",
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {formatINR(entry.amount)}
                                </td>
                              );
                            } else if (colName === "Paid") {
                              return (
                                <td
                                  key={colName}
                                  style={{
                                    ...valStyle,
                                    textAlign: "right",
                                    fontWeight: 600,
                                    color: "var(--success)",
                                    fontFamily: "var(--font-display)",
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {formatINR(entry.paidAmount || 0)}
                                </td>
                              );
                            } else if (colName === "Remaining") {
                              const rem = Math.max(
                                0,
                                (entry.amount || 0) - (entry.paidAmount || 0)
                              );
                              return (
                                <td
                                  key={colName}
                                  style={{
                                    ...valStyle,
                                    textAlign: "right",
                                    fontWeight: 600,
                                    color: rem > 0 ? "var(--danger)" : "var(--success)",
                                    fontFamily: "var(--font-display)",
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {formatINR(rem)}
                                </td>
                              );
                            } else if (
                              colName === "Rate" ||
                              colName === "Rate/Day" ||
                              colName === "Rent Rate"
                            ) {
                              return (
                                <td
                                  key={colName}
                                  style={{
                                    ...valStyle,
                                    textAlign: "right",
                                    fontFamily: "var(--font-display)",
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {formatINR(entry.ratePerUnit)}
                                </td>
                              );
                            } else if (
                              colName === "Qty" ||
                              colName === "Days" ||
                              colName === "Duration"
                            ) {
                              const rate = entry.ratePerUnit || 0;
                              const val = rate === 0 ? 0 : entry.amount / rate;
                              return (
                                <td
                                  key={colName}
                                  style={{
                                    ...valStyle,
                                    textAlign: "right",
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  {val.toFixed(1)}
                                </td>
                              );
                            } else if (colName === "Add More") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {canAddEdit ? (
                                    <button
                                      onClick={() => handleAddMore(entry)}
                                      style={{
                                        padding: "4px 10px",
                                        border: "1px solid var(--line)",
                                        background: "#FFFFFF",
                                        borderRadius: 8,
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: "var(--ink)",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <PlusCircle size={12} />
                                      <span>Add More</span>
                                    </button>
                                  ) : (
                                    <span style={{ color: "var(--ink-soft)" }}>—</span>
                                  )}
                                </td>
                              );
                            } else if (colName === "Record Payment") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {canRecordPayment ? (
                                    <button
                                      onClick={() => handleRecordPaymentClick(entry)}
                                      style={{
                                        padding: "4px 10px",
                                        border: "1px solid var(--accent)",
                                        background: "var(--accent-soft)",
                                        borderRadius: 8,
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        color: "var(--accent-ink)",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <CreditCard size={12} />
                                      <span>Pay Log</span>
                                    </button>
                                  ) : (
                                    <span style={{ color: "var(--ink-soft)" }}>—</span>
                                  )}
                                </td>
                              );
                            } else if (colName === "Actions") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {canAddEdit && (
                                    <button
                                      onClick={() => handleEditEntry(entry)}
                                      style={{
                                        padding: "4px 10px",
                                        border: "1px solid var(--line)",
                                        background: "#FFFFFF",
                                        borderRadius: 8,
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: "var(--ink)",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <Edit2 size={12} />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                </td>
                              );
                            } else {
                              return (
                                <td key={colName} style={valStyle}>
                                  —
                                </td>
                              );
                            }
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {totalCount > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderTop: "1px solid var(--line)",
                  background: "#FFFFFF",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontFamily: "var(--font-mono)",
                      color: "var(--ink-soft)",
                    }}
                  >
                    Showing{" "}
                    <b>
                      {(safeCurrentPage - 1) * rowsPerPage + 1}–
                      {Math.min(safeCurrentPage * rowsPerPage, totalCount)}
                    </b>{" "}
                    of <b>{totalCount}</b> entries
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      Rows:
                    </span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(safeCurrentPage - 1)}
                    style={{
                      border: "1px solid var(--line)",
                      background: safeCurrentPage <= 1 ? "var(--fill)" : "#FFFFFF",
                      cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
                      padding: "6px 10px",
                      borderRadius: 8,
                      color:
                        safeCurrentPage <= 1 ? "var(--ink-soft)" : "var(--ink)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      fontFamily: "var(--font-ui)",
                      color: "var(--ink)",
                    }}
                  >
                    Page {safeCurrentPage} of {totalPages}
                  </span>
                  <button
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(safeCurrentPage + 1)}
                    style={{
                      border: "1px solid var(--line)",
                      background:
                        safeCurrentPage >= totalPages ? "var(--fill)" : "#FFFFFF",
                      cursor:
                        safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
                      padding: "6px 10px",
                      borderRadius: 8,
                      color:
                        safeCurrentPage >= totalPages
                          ? "var(--ink-soft)"
                          : "var(--ink)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── CARDS VIEW ── */
          <div>
            {paginatedEntries.length === 0 ? (
              <BtEmpty
                title="No transaction logs match filters"
                message="Try adjusting your dates, project selection, or search keywords."
              />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {paginatedEntries.map((entry) => {
                  const projectName = getProjectName(entry.projectId);
                  const payStatus = getPaymentStatusLabel(entry.paymentStatus);
                  const tone =
                    payStatus === "Fully Paid"
                      ? "good"
                      : payStatus === "Partial"
                        ? "warn"
                        : "bad";
                  const rem = Math.max(
                    0,
                    (entry.amount || 0) - (entry.paidAmount || 0)
                  );

                  return (
                    <BtCard
                      key={entry.id}
                      onClick={() => setDetailsEntry(entry)}
                      style={{ cursor: "pointer", position: "relative" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--ink-soft)",
                              fontWeight: 500,
                            }}
                          >
                            {projectName}
                          </div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "var(--ink)",
                              marginTop: 2,
                            }}
                          >
                            {entry.description || "Entry Log"}
                          </div>
                        </div>
                        <BtBadge tone={tone}>{payStatus}</BtBadge>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          margin: "12px 0 8px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              fontFamily: "var(--font-mono)",
                              color: "var(--ink-soft)",
                              textTransform: "uppercase",
                            }}
                          >
                            Amount
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 22,
                              fontWeight: 700,
                              color: "var(--ink)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatINR(entry.amount)}
                          </div>
                        </div>

                        {rem > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontFamily: "var(--font-mono)",
                                color: "var(--ink-soft)",
                                textTransform: "uppercase",
                              }}
                            >
                              Balance Due
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontSize: 16,
                                fontWeight: 700,
                                color: "var(--danger)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatINR(rem)}
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderTop: "1px solid var(--line)",
                          paddingTop: 10,
                          marginTop: 6,
                          fontSize: 12,
                          color: "var(--ink-soft)",
                        }}
                      >
                        <span>{formatDateShort(entry.date)}</span>
                        {canRecordPayment && rem > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecordPaymentClick(entry);
                            }}
                            style={{
                              border: "none",
                              background: "var(--accent-soft)",
                              color: "var(--accent-ink)",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Record Payment
                          </button>
                        )}
                      </div>
                    </BtCard>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </BtSheet>

      {/* ── CUSTOMIZE COLUMNS MODAL ── */}
      {showCustomizeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(12, 14, 18, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "var(--r-sheet)",
              width: "100%",
              maxWidth: 380,
              padding: 24,
              boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "var(--font-ui)",
                  color: "var(--ink)",
                }}
              >
                Customize Columns
              </h3>
              <button
                onClick={() => setShowCustomizeModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-soft)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p
              style={{
                margin: "0 0 14px",
                fontSize: 12.5,
                color: "var(--ink-soft)",
                lineHeight: 1.4,
              }}
            >
              Check columns to display and use arrows to change column order.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 320,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {tempAllCols.map((col, idx) => {
                const isChecked = tempActiveCols.includes(col);
                return (
                  <div
                    key={col}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--fill)",
                      borderRadius: 8,
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleColumn(col)}
                        style={{ accentColor: "var(--ink)" }}
                      />
                      <span>{col}</span>
                    </label>

                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMoveColumn(idx, -1)}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: idx === 0 ? "not-allowed" : "pointer",
                          color: idx === 0 ? "#CBD5E1" : "var(--ink)",
                          fontSize: 12,
                          fontWeight: "bold",
                        }}
                      >
                        ▲
                      </button>
                      <button
                        disabled={idx === tempAllCols.length - 1}
                        onClick={() => handleMoveColumn(idx, 1)}
                        style={{
                          border: "none",
                          background: "none",
                          cursor:
                            idx === tempAllCols.length - 1
                              ? "not-allowed"
                              : "pointer",
                          color:
                            idx === tempAllCols.length - 1
                              ? "#CBD5E1"
                              : "var(--ink)",
                          fontSize: 12,
                          fontWeight: "bold",
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 20,
                borderTop: "1px solid var(--line)",
                paddingTop: 16,
              }}
            >
              <button
                onClick={saveCustomizeColumns}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "var(--r-btn, 12px)",
                  background: "var(--ink)",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ENTRY DETAILS MODAL / DRAWER ── */}
      {detailsEntry && (
        <div
          onClick={() => setDetailsEntry(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(12, 14, 18, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 900,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              width: "100%",
              maxWidth: 440,
              height: "100vh",
              padding: "28px 32px",
              boxShadow: "-4px 0 25px rgba(0,0,0,0.15)",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: "var(--font-ui)",
                  color: "var(--ink)",
                }}
              >
                Entry Details
              </h3>
              <button
                onClick={() => setDetailsEntry(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-soft)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Project", val: getProjectName(detailsEntry.projectId) },
                { label: "Type", val: detailsEntry.type.toUpperCase() },
                { label: "Date", val: formatDateLong(detailsEntry.date) },
                {
                  label: "Total Amount",
                  val: formatINR(
                    detailsEntry.rawTx?.amount || detailsEntry.amount
                  ),
                  bold: true,
                },
                {
                  label: "Paid Amount",
                  val: formatINR(detailsEntry.rawTx?.paidAmount || 0),
                  bold: true,
                  textColor: "var(--success)",
                },
                {
                  label: "Balance",
                  val: formatINR(
                    detailsEntry.rawTx?.remainingAmount ??
                      (detailsEntry.rawTx?.amount || detailsEntry.amount) -
                        (detailsEntry.rawTx?.paidAmount || 0)
                  ),
                  bold: true,
                  textColor: "var(--danger)",
                },
                {
                  label: "Status",
                  val: getPaymentStatusLabel(
                    detailsEntry.paymentStatus,
                    detailsEntry.rawTx
                  ),
                },
                { label: "Description", val: detailsEntry.description || "—" },
                { label: "Brand", val: detailsEntry.brand || "—" },
                { label: "Floor", val: detailsEntry.floor || "—" },
                { label: "Phase", val: detailsEntry.phase || "—" },
                { label: "Unit", val: detailsEntry.unit || "—" },
                {
                  label: "Rejection Reason",
                  val: detailsEntry.rejectionReason,
                  isWarning: true,
                },
              ].map((row) => {
                if (!row.val && row.val !== 0 && row.val !== "₹0") return null;
                return (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      fontSize: 13,
                      borderBottom: "1px solid var(--fill)",
                      paddingBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 120,
                        fontWeight: 600,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontWeight: row.bold ? 700 : 500,
                        color: row.textColor
                          ? row.textColor
                          : row.isWarning
                            ? "var(--danger)"
                            : "var(--ink)",
                      }}
                    >
                      {row.val}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Payment History */}
            {detailsEntry?.rawTx?.paymentHistory?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "var(--ink-soft)",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Payment History
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: 160,
                    overflowY: "auto",
                  }}
                >
                  {detailsEntry.rawTx.paymentHistory.map((ph, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "var(--fill)",
                        border: "1px solid var(--line)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: "var(--font-display)",
                            color: "var(--ink)",
                          }}
                        >
                          {formatINR(ph.amount)}
                        </span>
                        <BtBadge tone="muted">{ph.method || "Cash"}</BtBadge>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                        {formatDateLong(ph.date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 24,
                borderTop: "1px solid var(--line)",
                paddingTop: 16,
              }}
            >
              <button
                onClick={() => {
                  const entry = detailsEntry;
                  setDetailsEntry(null);
                  handleAddMore(entry);
                }}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Add More
              </button>

              <button
                onClick={() => {
                  const entry = detailsEntry;
                  setDetailsEntry(null);
                  handleRecordPaymentClick(entry);
                }}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 8,
                  border: "1px solid var(--accent)",
                  background: "var(--accent-soft)",
                  color: "var(--accent-ink)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Record Payment
              </button>

              <button
                onClick={() => {
                  const entry = detailsEntry;
                  setDetailsEntry(null);
                  handleEditEntry(entry);
                }}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT CSV MODAL ── */}
      {showImportModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(12, 14, 18, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "var(--r-sheet)",
              width: "100%",
              maxWidth: 860,
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: "var(--font-ui)",
                }}
              >
                Import or Revert CSV
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-soft)",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <CsvImport onComplete={() => window.location.reload()} />
          </div>
        </div>
      )}

      {/* ── EXPORT OPTIONS MODAL ── */}
      {showExportModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(12, 14, 18, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "var(--r-sheet)",
              width: "100%",
              maxWidth: 440,
              padding: 24,
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "var(--font-ui)",
                    color: "var(--ink)",
                  }}
                >
                  Export Report
                </h3>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 13,
                    color: "var(--ink-soft)",
                  }}
                >
                  Select your export format
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-soft)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 10,
              }}
            >
              {/* PDF Export Card */}
              <button
                onClick={() => {
                  setShowExportModal(false);
                  handleExportPDF();
                }}
                style={{
                  textAlign: "left",
                  padding: 16,
                  borderRadius: "var(--r-card)",
                  border: "1px solid var(--line)",
                  background: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--ink)";
                  e.currentTarget.style.background = "var(--fill)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.background = "#FFFFFF";
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--ink)",
                    color: "#FFFFFF",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  PDF
                </div>
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}
                  >
                    Download PDF Report
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                    Ready to print or share with clients
                  </div>
                </div>
              </button>

              {/* CSV Export Card */}
              <button
                onClick={() => {
                  setShowExportModal(false);
                  handleExportCSV(false);
                }}
                style={{
                  textAlign: "left",
                  padding: 16,
                  borderRadius: "var(--r-card)",
                  border: "1px solid var(--line)",
                  background: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--ink)";
                  e.currentTarget.style.background = "var(--fill)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.background = "#FFFFFF";
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--success-soft)",
                    color: "var(--success)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  CSV
                </div>
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}
                  >
                    Download CSV Spreadsheet
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                    Opens cleanly in Excel or Google Sheets
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
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
