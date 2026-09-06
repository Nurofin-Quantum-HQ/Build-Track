import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  projectAPI,
  transactionAPI
} from "../api";
import useProjectStore from "../stores/projectStore";
import useTransactionStore from "../stores/transactionStore";
import perfLogger from "../utils/performanceLogger";
import { Toast } from "../components/Toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  colors,
  radius,
  shadows,
  gradients,
  typography
} from "../styles/designTokens";
import RecordPaymentSheet from "../components/RecordPaymentSheet";
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
  Clock
} from "lucide-react";
import ModuleTour from "../components/ModuleTour";
import {
  isReportEntry,
  mapTransactionToEntry,
  getPaymentStatusLabel,
  calculateFilteredCostSummary
} from "../utils/reportCalculations";

const primaryBlue = "#F97316";
const primaryPurple = "#EA580C";
const primaryLightBlue = "#06B6D4";

function formatINR(n) {
  return `\u20B9${Number(n || 0).toLocaleString("en-IN")}`;
}

function formatDateShort(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
}

function formatDateLong(dt) {
  if (!dt) return "—";
  const date = new Date(dt);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour24 = date.getHours();
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  const hour = String(hour12).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hour}:${minute} ${ampm}`;
}

const DEFAULT_COLS = {
  All: ['Purchased Date', 'Project', 'Type', 'Description', 'Brand', 'Floor', 'Phase', 'Activity', 'Unit', 'Status', 'Amount', 'Paid', 'Remaining', 'Payment Date'],
  Materials: ['Purchased Date', 'Project', 'Material', 'Brand', 'Rate', 'Qty', 'Unit', 'Status', 'Amount', 'Paid', 'Remaining', 'Payment Date'],
  Labour: ['Purchased Date', 'Project', 'Worker Type', 'Rate/Day', 'Days', 'Status', 'Amount', 'Paid', 'Remaining', 'Payment Date'],
  Equipment: ['Purchased Date', 'Project', 'Equipment', 'Rent Rate', 'Duration', 'Status', 'Amount', 'Paid', 'Remaining', 'Payment Date']
};

const ALL_COLS = {
  All: ['Purchased Date', 'Project', 'Type', 'Description', 'Brand', 'Floor', 'Phase', 'Activity', 'Unit', 'Status', 'Amount', 'Paid', 'Remaining', 'Payment Date'],
  Materials: ['Purchased Date', 'Project', 'Material', 'Brand', 'Rate', 'Qty', 'Unit', 'Floor', 'Phase', 'Activity', 'Status', 'Amount', 'Paid', 'Remaining', 'Payment Date'],
  Labour: ['Purchased Date', 'Project', 'Worker Type', 'Rate/Day', 'Days', 'Unit', 'Floor', 'Phase', 'Activity', 'Status', 'Amount', 'Paid', 'Remaining', 'Payment Date'],
  Equipment: ['Purchased Date', 'Project', 'Equipment', 'Rent Rate', 'Duration', 'Unit', 'Floor', 'Phase', 'Activity', 'Status', 'Amount', 'Paid', 'Remaining', 'Payment Date']
};

export default function FinancialReportPage() {
  const navigate = useNavigate();
  const { user, can } = useAuth();

  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "info" });

  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [selectedActivityName, setSelectedActivityName] = useState("");
  const [datePreset, setDatePreset] = useState("All Time");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [activeTab, setActiveTab] = useState("All");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemName, setSelectedItemName] = useState("");
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("All");
  const [sortColumn, setSortColumn] = useState("date");
  const [sortAscending, setSortAscending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [activeColumns, setActiveColumns] = useState(() => {
    try {
      const cached = localStorage.getItem("bt_reports_active_cols_v1");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
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

  const { projects: projStore, fetchProjects: storeFetchProjects } = useProjectStore();
  const { transactions: txStore, fetchTransactions: storeFetchTransactions } = useTransactionStore();

  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-project-filter', content: 'Filter reports by Project, Floor, Phase, Activity, and Date.', disableBeacon: true },
    { target: '.tour-report-tabs', content: 'Switch between All, Materials, Labour, and Equipment categories.' },
    { target: '.tour-export-btns', content: 'Customize columns and export the report to CSV.' }
  ];

  useEffect(() => {
    perfLogger.endRoute('/reports');
    perfLogger.logMount('ReportsPage');
  }, []);

  const loadData = useCallback((force = false) => {
    if (projStore.length === 0 && txStore.length === 0) setLoading(true);
    setError("");
    Promise.all([
      storeFetchProjects({}, force),
      storeFetchTransactions({ limit: 10000, filterByViewAccess: true }, force)
    ])
      .then(([projList, rawList]) => {
        const pList = projList || projStore || [];
        setProjects(pList);

        const list = rawList || txStore || [];
        const mappedList = list
          .filter(isReportEntry)
          .map(tx => mapTransactionToEntry(tx));
        setTransactions(mappedList);
      })
      .catch(() => setError("Failed to load project details and reports log."))
      .finally(() => setLoading(false));
  }, [projStore, txStore, storeFetchProjects, storeFetchTransactions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveActiveColumns = (updated) => {
    setActiveColumns(updated);
    localStorage.setItem("bt_reports_active_cols_v1", JSON.stringify(updated));
  };

  useEffect(() => {
    setSearchQuery("");
    setSelectedItemName("");
    setReportGenerated(false);
    setShowSuggestions(false);
    setCurrentPage(1);
  }, [activeTab]);

  const selectedProject = useMemo(() => {
    return projects.find(p => String(p._id) === selectedProjectId);
  }, [projects, selectedProjectId]);

  const getProjectName = useCallback((id) => {
    const match = projects.find(p => String(p._id) === String(id));
    return match ? match.projectName || match.name : "Unknown Project";
  }, [projects]);

  const floors = useMemo(() => {
    return selectedProject?.floors || [];
  }, [selectedProject]);

  const phases = useMemo(() => {
    return selectedProject?.selectedPhases || [];
  }, [selectedProject]);

  const selectedPhaseName = useMemo(() => {
    const match = phases.find(ph => String(ph.id) === selectedPhaseId);
    return match ? match.phaseName : "Select Phase";
  }, [phases, selectedPhaseId]);

  const uniqueActivityNames = useMemo(() => {
    const activities = [];
    if (selectedPhaseId) {
      const match = phases.find(ph => String(ph.id) === selectedPhaseId);
      activities.push(...(match?.activities || []));
    } else if (selectedProject) {
      activities.push(...(selectedProject.selectedPhases?.flatMap(p => p.activities || []) || []));
    }
    return [...new Set(activities.map(a => a.name))];
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
        setEndDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
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
    return transactions.filter(entry => {

      if (selectedProjectId !== "all" && String(entry.projectId) !== selectedProjectId) {
        return false;
      }

      if (selectedProjectId !== "all") {
        if (selectedFloor && selectedFloor !== "Select Floor") {
          if (entry.floor !== selectedFloor) return false;
        }

        if (selectedPhaseId && selectedPhaseId !== "Select Phase") {
          const matchPhase = phases.find(ph => String(ph.id) === selectedPhaseId);
          const phaseName = matchPhase?.phaseName;

          if (entry.phaseId !== selectedPhaseId && (!phaseName || entry.phase !== phaseName)) {
            return false;
          }
        }

        if (selectedActivityName && selectedActivityName !== "Select Activity") {
          if (entry.activity !== selectedActivityName && entry.description !== selectedActivityName) {
            return false;
          }
        }
      }

      if (!selectedTypes.has(entry.type)) {
        return false;
      }

      if (activeTab !== "All" && reportGenerated) {
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase();
          const descMatch = entry.description.toLowerCase().includes(q);
          const brandMatch = (entry.brand || '').toLowerCase().includes(q);
          if (!descMatch && !brandMatch) return false;
        }

        if (selectedItemName && selectedItemName !== "All") {
          if (entry.description !== selectedItemName) return false;
        }
      }

      if (activeTab === "All" && searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const projectName = getProjectName(entry.projectId).toLowerCase();
        const descMatch = entry.description.toLowerCase().includes(q);
        const brandMatch = (entry.brand || '').toLowerCase().includes(q);
        const projectMatch = projectName.includes(q);
        const floorMatch = (entry.floor || '').toLowerCase().includes(q);
        const phaseMatch = (entry.phase || '').toLowerCase().includes(q);
        const activityMatch = (entry.activity || '').toLowerCase().includes(q);
        const amountMatch = entry.amount.toString().includes(q);
        const typeMatch = entry.type.toLowerCase().includes(q);
        const statusMatch = getPaymentStatusLabel(entry.paymentStatus, {
          amount: entry.amount,
          paidAmount: entry.paidAmount,
        }).toLowerCase().includes(q);
        const dateMatch = formatDateShort(entry.date).toLowerCase().includes(q);
        const payDateMatch = entry.paymentDate ? formatDateShort(entry.paymentDate).toLowerCase().includes(q) : false;

        if (!descMatch && !brandMatch && !projectMatch && !floorMatch && !phaseMatch &&
            !activityMatch && !amountMatch && !typeMatch && !statusMatch && !dateMatch && !payDateMatch) {
          return false;
        }
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

      if (startDate) {
        const eDate = new Date(entry.date.getFullYear(), entry.date.getMonth(), entry.date.getDate());
        const sDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        if (eDate.getTime() < sDate.getTime()) return false;
      }
      if (endDate) {
        const eDate = new Date(entry.date.getFullYear(), entry.date.getMonth(), entry.date.getDate());
        const edDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
        if (eDate.getTime() >= edDate.getTime()) return false;
      }

      return true;
    });
  }, [transactions, selectedProjectId, selectedFloor, selectedPhaseId, selectedActivityName, selectedTypes, activeTab, reportGenerated, searchQuery, selectedItemName, selectedPaymentStatus, startDate, endDate, getProjectName, phases]);

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortColumn === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortColumn === "project") {
        cmp = getProjectName(a.projectId).localeCompare(getProjectName(b.projectId));
      }
      return sortAscending ? cmp : -cmp;
    });
  }, [filteredEntries, sortColumn, sortAscending, getProjectName]);

  const costSummary = useMemo(() => {
    return calculateFilteredCostSummary(filteredEntries);
  }, [filteredEntries]);

  const materialTotal = costSummary.material;
  const labourTotal = costSummary.labour;
  const equipmentTotal = costSummary.equipment;
  const grandTotal = costSummary.totalBilled;

  const totalCount = sortedEntries.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedEntries = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * rowsPerPage;
    return sortedEntries.slice(startIdx, startIdx + rowsPerPage);
  }, [sortedEntries, safeCurrentPage, rowsPerPage]);

  const uniqueItemNames = useMemo(() => {
    const targetType = activeTab === "Materials" ? "material" : activeTab === "Labour" ? "labour" : "equipment";
    return [...new Set(
      transactions
        .filter(e => e.type === targetType && (selectedProjectId === "all" || String(e.projectId) === selectedProjectId))
        .map(e => e.description)
        .filter(name => name !== undefined && name !== null && String(name).trim().length > 0)
    )].map(name => String(name));
  }, [transactions, activeTab, selectedProjectId]);

  const textQuerySuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return uniqueItemNames.filter(name => String(name).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [uniqueItemNames, searchQuery]);

  const showSuggestionsList = showSuggestions && searchQuery.trim().length > 0 && textQuerySuggestions.length > 0 &&
    !(textQuerySuggestions.length === 1 && textQuerySuggestions[0].toLowerCase() === searchQuery.toLowerCase());

  const openCustomizeModal = () => {
    const all = ALL_COLS[activeTab];
    const active = (activeColumns && activeColumns[activeTab]) || DEFAULT_COLS[activeTab];
    const inactive = all.filter(c => !active.includes(c));
    setTempActiveCols([...active]);
    setTempAllCols([...active, ...inactive]);
    setShowCustomizeModal(true);
  };

  const handleToggleColumn = (col) => {
    if (tempActiveCols.includes(col)) {
      if (tempActiveCols.length > 1) {
        setTempActiveCols(tempActiveCols.filter(c => c !== col));
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

  const resetCustomizeColumns = () => {
    const all = ALL_COLS[activeTab];
    setTempActiveCols([...DEFAULT_COLS[activeTab]]);
    setTempAllCols([...all]);
  };

  const handleAddMore = (entry) => {
    const activeKey = entry.type === "material" ? "material" : entry.type === "labour" ? "labour" : "equipment";
    const sourceId = entry.id || (entry.rawTx ? (entry.rawTx._id || entry.rawTx.id) : "");
    navigate(`/manualentry?type=${activeKey}&project=${entry.projectId}&name=${entry.description}&unit=${entry.unit}&brand=${entry.brand || ""}&isDuplicate=true&sourceTransactionId=${sourceId}`);
  };

  const handleEditEntry = (entry) => {
    navigate(`/manualentry`, { state: { transaction: entry.rawTx } });
  };

  const handleRecordPaymentClick = (entry) => {
    setPaymentItem(entry);
    setPaymentSheetOpen(true);
  };

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      setToast({ msg: "No report entries to export.", type: "error" });
      return;
    }

    try {
      const activeCols = (activeColumns && activeColumns[activeTab]) || DEFAULT_COLS[activeTab] || [];
      const headers = activeCols.map(col => col === "Amount" ? "Amount (INR)" : col);

      const csvBuffer = [];

      csvBuffer.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

      for (const entry of filteredEntries) {
        const dateStr = entry.date.toISOString().split("T")[0];
        const projectName = getProjectName(entry.projectId);
        const amountStr = entry.amount.toFixed(2);
        const statusStr = getPaymentStatusLabel(entry.paymentStatus);
        const payDateStr = entry.paymentDate ? entry.paymentDate.toISOString().split("T")[0] : "—";

        const rowValues = [];
        for (const col of activeCols) {
          if (col === 'Purchased Date') {
            rowValues.push(dateStr);
          } else if (col === 'Payment Date') {
            rowValues.push(payDateStr);
          } else if (col === 'Project') {
            rowValues.push(projectName);
          } else if (col === 'Type') {
            rowValues.push(entry.type.toUpperCase());
          } else if (col === 'Description' || col === 'Material' || col === 'Worker Type' || col === 'Equipment') {
            rowValues.push(entry.description || '—');
          } else if (col === 'Brand') {
            rowValues.push(entry.brand || '—');
          } else if (col === 'Floor') {
            rowValues.push(entry.floor || '—');
          } else if (col === 'Phase') {
            rowValues.push(entry.phase || '—');
          } else if (col === 'Activity') {
            rowValues.push(entry.activity || '—');
          } else if (col === 'Unit') {
            rowValues.push(entry.unit || '—');
          } else if (col === 'Status') {
            rowValues.push(statusStr);
          } else if (col === 'Amount') {
            rowValues.push(amountStr);
          } else if (col === 'Paid') {
            rowValues.push((entry.paidAmount || 0).toFixed(2));
          } else if (col === 'Remaining') {
            const rem = Math.max(0, (entry.amount || 0) - (entry.paidAmount || 0));
            rowValues.push(rem.toFixed(2));
          } else if (col === 'Rate' || col === 'Rate/Day' || col === 'Rent Rate') {
            rowValues.push((entry.ratePerUnit || 0).toFixed(2));
          } else if (col === 'Qty' || col === 'Days' || col === 'Duration') {
            const rate = entry.ratePerUnit || 0;
            const val = (rate === 0) ? 0 : entry.amount / rate;
            rowValues.push(val.toFixed(1));
          }
        }
        csvBuffer.push(rowValues.map(v => `"${v.replace(/"/g, '""')}"`).join(","));
      }

      const blob = new Blob(["\uFEFF" + csvBuffer.join("\n")], { type: "text/csv;charset=utf-8;" });
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

      const title = selectedProjectId === 'all'
        ? 'All Active Projects Summary Report'
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
      parts.push(`Types: ${[...selectedTypes].map(t => t.toUpperCase()).join(", ")}`);
      parts.push(`Payment Status: ${selectedPaymentStatus}`);
      parts.push(`Date Preset: ${datePreset}`);
      doc.text(parts.join(" | "), 14, 23);

      doc.setFontSize(10);
      doc.text(`Total Billed: ${formatINR(costSummary.totalBilled)}  |  Paid: ${formatINR(costSummary.paid)}  |  Remaining: ${formatINR(costSummary.remaining)}  |  Material: ${formatINR(costSummary.material)}  |  Labour: ${formatINR(costSummary.labour)}  |  Equipment: ${formatINR(costSummary.equipment)}`, 14, 30);

      const activeCols = (activeColumns && activeColumns[activeTab]) || DEFAULT_COLS[activeTab] || [];
      const headers = activeCols.map(col => col === "Amount" ? "Amount (INR)" : col);

      const body = filteredEntries.map(entry => {
        const row = [];
        for (const col of activeCols) {
          if (col === 'Purchased Date') {
            row.push(formatDateShort(entry.date));
          } else if (col === 'Payment Date') {
            row.push(entry.paymentDate ? formatDateShort(entry.paymentDate) : '—');
          } else if (col === 'Project') {
            row.push(getProjectName(entry.projectId));
          } else if (col === 'Type') {
            row.push(entry.type.toUpperCase());
          } else if (col === 'Description' || col === 'Material' || col === 'Worker Type' || col === 'Equipment') {
            row.push(entry.description || '—');
          } else if (col === 'Brand') {
            row.push(entry.brand || '—');
          } else if (col === 'Floor') {
            row.push(entry.floor || '—');
          } else if (col === 'Phase') {
            row.push(entry.phase || '—');
          } else if (col === 'Activity') {
            row.push(entry.activity || '—');
          } else if (col === 'Unit') {
            row.push(entry.unit || '—');
          } else if (col === 'Status') {
            row.push(getPaymentStatusLabel(entry.paymentStatus, { amount: entry.amount, paidAmount: entry.paidAmount }));
          } else if (col === 'Amount') {
            row.push(entry.amount.toFixed(2));
          } else if (col === 'Paid') {
            row.push((entry.paidAmount || 0).toFixed(2));
          } else if (col === 'Remaining') {
            const rem = Math.max(0, (entry.amount || 0) - (entry.paidAmount || 0));
            row.push(rem.toFixed(2));
          } else if (col === 'Rate' || col === 'Rate/Day' || col === 'Rent Rate') {
            row.push((entry.ratePerUnit || 0).toFixed(2));
          } else if (col === 'Qty' || col === 'Days' || col === 'Duration') {
            const rate = entry.ratePerUnit || 0;
            const val = (rate === 0) ? 0 : entry.amount / rate;
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
        headStyles: { fillColor: [249, 115, 22], textColor: 255 }
      });

      doc.save(`BuildTrack_Report_${new Date().getTime()}.pdf`);
      setToast({ msg: "PDF exported successfully!", type: "success" });
    } catch {
      setToast({ msg: "PDF Export failed", type: "error" });
    }
  };

  const activeCols = (activeColumns && activeColumns[activeTab]) || DEFAULT_COLS[activeTab] || [];
  const uiActiveCols = [...activeCols, 'Approval', 'Add More', 'Record Payment', 'Actions'];

  const canRecordPayment = can('mark_paid') || can('approve_payments') || user?.role === 'Admin';
  const canApprove = can('approve_payments') || user?.role === 'Admin';
  const canAddEdit = can('add_entries') || user?.role === 'Admin';

  const handleInlineApprove = async (entry) => {
    try {
      await transactionAPI.approve(entry.rawTx?._id || entry.id);
      setToast({ msg: "Entry approved successfully!", type: "success" });
      loadData();
    } catch (err) {
      setToast({ msg: err.response?.data?.message || "Failed to approve entry", type: "error" });
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
      setToast({ msg: err.response?.data?.message || "Failed to reject entry", type: "error" });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", background: colors.bgBase4, fontFamily: typography.fontFamily }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="FinancialReportPage" />
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />

      <div style={{ background: colors.cardBg, borderBottom: `1px solid ${colors.cardBorder}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.textPrimary }}>Reports</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.textLight }}>Financial analytics &amp; transaction log audit</p>
        </div>
        <div className="tour-export-btns" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: `1.5px solid ${colors.cardBorder}`, borderRadius: radius.md, cursor: 'pointer', flexShrink: 0, boxShadow: shadows.card }}>
            <HelpCircle size={16} color={colors.textLight} />
          </button>
          <button
            onClick={() => openCustomizeModal()}
            style={{
              padding: "9px 18px",
              borderRadius: radius.md,
              border: `1.5px solid ${colors.cardBorder}`,
              background: colors.cardBg,
              color: colors.textMedium,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: shadows.card
            }}
          >
            <SlidersHorizontal size={14} />
            Edit Columns
          </button>

          <div style={{ position: "relative" }}>
            <button
              onClick={handleExportCSV}
              disabled={filteredEntries.length === 0}
              style={{
                padding: "9px 18px",
                borderRadius: radius.md,
                border: "none",
                background: gradients.primaryButton,
                color: "#FFF",
                fontWeight: 700,
                fontSize: 13,
                cursor: filteredEntries.length === 0 ? "not-allowed" : "pointer",
                opacity: filteredEntries.length === 0 ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: shadows.card
              }}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

        <div
          onClick={() => navigate("/ai-chat")}
          style={{
            background: "linear-gradient(135deg, #F97316 0%, rgba(249, 115, 22, 0.8) 100%)",
            borderRadius: radius.lg,
            padding: "16px 20px",
            marginBottom: 24,
            cursor: "pointer",
            boxShadow: shadows.card,
            display: "flex",
            alignItems: "center",
            gap: 16,
            transition: "transform 0.15s ease"
          }}
          className="hover-lift-sm"
        >
          <div style={{ width: 42, height: 42, background: "rgba(255,255,255,0.18)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>Ask AI</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginTop: 2 }}>Ask about costs, entries &amp; inventory insights</div>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
        </div>

        <div className="tour-project-filter" style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: 20, marginBottom: 24, boxShadow: shadows.card }}>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, background: "rgba(249, 115, 22, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: primaryBlue, flexShrink: 0 }}>
              <Building size={16} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: "800", color: colors.textPrimary }}>Project Context</div>
              <div style={{ fontSize: 11.5, color: colors.textLight, marginTop: 1 }}>Configure scoping properties</div>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: `1px solid ${colors.divider}`, margin: "0 0 16px" }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>Project</label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedProjectId}
                  onChange={e => {
                    setSelectedProjectId(e.target.value);
                    setSelectedFloor("");
                    setSelectedPhaseId("");
                    setSelectedActivityName("");
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: "#FFF", fontSize: 13, fontWeight: "600", color: colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="all">All projects</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.projectName || p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: selectedProjectId === "all" || floors.length === 0 ? "#C5CAE9" : colors.textSecondary, marginBottom: 6 }}>Floor</label>
              <div style={{ position: "relative" }}>
                <select
                  disabled={selectedProjectId === "all" || floors.length === 0}
                  value={selectedFloor || "Select Floor"}
                  onChange={e => {
                    setSelectedFloor(e.target.value === "Select Floor" ? "" : e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: selectedProjectId === "all" || floors.length === 0 ? "#F9FAFB" : "#FFF", fontSize: 13, fontWeight: "600", color: selectedProjectId === "all" || floors.length === 0 ? "#9CA3AF" : colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="Select Floor">Select Floor</option>
                  {floors.map((fl, idx) => (
                    <option key={idx} value={typeof fl === 'string' ? fl : fl.name}>{typeof fl === 'string' ? fl : fl.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: selectedProjectId === "all" || phases.length === 0 ? "#C5CAE9" : colors.textSecondary, marginBottom: 6 }}>Phase</label>
              <div style={{ position: "relative" }}>
                <select
                  disabled={selectedProjectId === "all" || phases.length === 0}
                  value={selectedPhaseId || "Select Phase"}
                  onChange={e => {
                    const val = e.target.value === "Select Phase" ? "" : e.target.value;
                    setSelectedPhaseId(val);
                    setSelectedActivityName("");
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: selectedProjectId === "all" || phases.length === 0 ? "#F9FAFB" : "#FFF", fontSize: 13, fontWeight: "600", color: selectedProjectId === "all" || phases.length === 0 ? "#9CA3AF" : colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="Select Phase">Select Phase</option>
                  {phases.map(ph => (
                    <option key={ph.id} value={ph.id}>{ph.phaseName}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: selectedProjectId === "all" || uniqueActivityNames.length === 0 ? "#C5CAE9" : colors.textSecondary, marginBottom: 6 }}>Activity</label>
              <div style={{ position: "relative" }}>
                <select
                  disabled={selectedProjectId === "all" || uniqueActivityNames.length === 0}
                  value={selectedActivityName || "Select Activity"}
                  onChange={e => {
                    setSelectedActivityName(e.target.value === "Select Activity" ? "" : e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: selectedProjectId === "all" || uniqueActivityNames.length === 0 ? "#F9FAFB" : "#FFF", fontSize: 13, fontWeight: "600", color: selectedProjectId === "all" || uniqueActivityNames.length === 0 ? "#9CA3AF" : colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="Select Activity">Select Activity</option>
                  {uniqueActivityNames.map((actName, idx) => (
                    <option key={idx} value={actName}>{actName}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>Date Period</label>
              <div style={{ position: "relative" }}>
                <select
                  value={datePreset}
                  onChange={e => handleDatePreset(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: "#FFF", fontSize: 13, fontWeight: "600", color: colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="All Time">All Time</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="This Year">This Year</option>
                  <option value="Custom">Custom Range</option>
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>Payment Status</label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedPaymentStatus}
                  onChange={e => {
                    setSelectedPaymentStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: "#FFF", fontSize: 13, fontWeight: "600", color: colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Fully Paid">Fully Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Not Paid">Not Paid</option>
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            {datePreset === "Custom" && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>Start Date</label>
                  <input
                    type="date"
                    value={startDate ? startDate.toISOString().split("T")[0] : ""}
                    onChange={e => {
                      setStartDate(e.target.value ? new Date(e.target.value) : null);
                      setCurrentPage(1);
                    }}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: "#FFF", fontSize: 13, color: colors.textPrimary, outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>End Date</label>
                  <input
                    type="date"
                    value={endDate ? endDate.toISOString().split("T")[0] : ""}
                    onChange={e => {
                      setEndDate(e.target.value ? new Date(e.target.value) : null);
                      setCurrentPage(1);
                    }}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: "#FFF", fontSize: 13, color: colors.textPrimary, outline: "none" }}
                  />
                </div>
              </>
            )}

          </div>

        </div>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary, margin: "0 0 12px", letterSpacing: "-0.3px" }}>Filtered Cost Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>

            {/* ROW 1: Total Billed, Paid, Remaining */}
            <div style={{ background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)", borderRadius: radius.lg, padding: "18px 20px", boxShadow: shadows.card, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 104 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.85)" }}>Total Billed</span>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={16} color="#FFF" /></span>
              </div>
              <div style={{ color: "#FFF", fontSize: 22, fontWeight: "900", letterSpacing: "-0.3px" }}>{formatINR(costSummary.totalBilled)}</div>
            </div>

            <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: "18px 20px", boxShadow: shadows.card, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 104 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>Paid</span>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(21, 128, 61, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#15803D" }}><CheckCircle size={16} /></span>
              </div>
              <div style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: "-0.3px" }}>{formatINR(costSummary.paid)}</div>
            </div>

            <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: "18px 20px", boxShadow: shadows.card, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 104 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>Remaining</span>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: costSummary.remaining > 0 ? "rgba(220, 38, 38, 0.1)" : "rgba(21, 128, 61, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: costSummary.remaining > 0 ? "#DC2626" : "#15803D" }}><Clock size={16} /></span>
              </div>
              <div style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: "-0.3px" }}>{formatINR(costSummary.remaining)}</div>
            </div>

            {/* ROW 2: Material, Labour, Equipment */}
            <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: "18px 20px", boxShadow: shadows.card, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 104 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>Material</span>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(91, 95, 207, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#5B5FCF" }}><Package size={16} /></span>
              </div>
              <div style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: "-0.3px" }}>{formatINR(costSummary.material)}</div>
            </div>

            <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: "18px 20px", boxShadow: shadows.card, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 104 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>Labour</span>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: `${primaryPurple}15`, display: "flex", alignItems: "center", justifyContent: "center", color: primaryPurple }}><Users size={16} /></span>
              </div>
              <div style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: "-0.3px" }}>{formatINR(costSummary.labour)}</div>
            </div>

            <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: "18px 20px", boxShadow: shadows.card, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 104 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>Equipment</span>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: `${primaryLightBlue}15`, display: "flex", alignItems: "center", justifyContent: "center", color: primaryLightBlue }}><Wrench size={16} /></span>
              </div>
              <div style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: "-0.3px" }}>{formatINR(costSummary.equipment)}</div>
            </div>

          </div>
        </div>

        <div className="tour-report-tabs" style={{ display: "flex", background: colors.cardBg, borderRadius: radius.md, border: `1.2px solid ${colors.cardBorder}`, padding: 4, marginBottom: 20, boxShadow: shadows.card }}>
          {["All", "Materials", "Labour", "Equipment"].map(tab => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: radius.sm,
                  border: "none",
                  background: active ? gradients.primaryButton : "transparent",
                  color: active ? "#FFF" : colors.textMedium,
                  fontWeight: "700",
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {activeTab === "All" ? (

          <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: 14, marginBottom: 20, boxShadow: shadows.card, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, background: colors.bgBase4, borderRadius: 10, padding: "10px 14px" }}>
              <Search size={16} color="#757299" />
              <input
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by description, brand, project, phase, activity..."
                style={{ border: "none", background: "transparent", width: "100%", outline: "none", fontSize: 13, color: colors.textPrimary }}
              />
              {searchQuery.trim().length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#757299", display: "flex", alignItems: "center", padding: 0 }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (

          <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: 16, marginBottom: 20, boxShadow: shadows.card }}>

            <div style={{ position: "relative", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: colors.bgBase4, borderRadius: 10, padding: "10px 14px", border: showSuggestionsList ? `1px solid ${primaryBlue}` : "none" }}>
                <Search size={16} color="#757299" />
                <input
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setSelectedItemName("");
                    setShowSuggestions(true);
                  }}
                  placeholder={`Search ${activeTab.toLowerCase()}...`}
                  style={{ border: "none", background: "transparent", width: "100%", outline: "none", fontSize: 13, color: colors.textPrimary }}
                />
              </div>

              {showSuggestionsList && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#FFF", border: `1px solid #E2E4FA`, borderRadius: 10, boxShadow: shadows.card, zIndex: 50, maxHeight: 180, overflowY: "auto" }}>
                  {textQuerySuggestions.map(name => (
                    <div
                      key={name}
                      onMouseDown={() => {
                        setSearchQuery(name);
                        setSelectedItemName(name);
                        setShowSuggestions(false);
                      }}
                      style={{ padding: "10px 14px", fontSize: 13, color: colors.textPrimary, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                      className="hover-bg-subtle"
                    >
                      <span style={{ color: primaryBlue }}>↳</span>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <select
                  value={selectedItemName || "All"}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedItemName(val === "All" ? "" : val);
                    setSearchQuery(val === "All" ? "" : val);
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.2px solid #E2E4FA`, background: "#FFF", fontSize: 13, fontWeight: "600", color: colors.textPrimary, outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  <option value="All">All {activeTab === "Materials" ? "Material Names" : activeTab === "Labour" ? "Worker Types" : "Equipment Names"}</option>
                  {uniqueItemNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#757299" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div style={{ width: "100%", marginTop: 14 }}>
              <button
                onClick={() => {
                  setReportGenerated(true);
                  setCurrentPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: activeTab === "Materials" ? "#F97316" : activeTab === "Labour" ? primaryPurple : primaryLightBlue,
                  borderRadius: 10,
                  color: "#FFFFFF",
                  fontWeight: "700",
                  fontSize: 13.5,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                Generate CSV Report
              </button>
            </div>

          </div>
        )}

        {activeTab !== "All" && !reportGenerated ? (

          <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, padding: "60px 20px", textAlign: "center", boxShadow: shadows.card }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: activeTab === "Materials" ? "#F9731615" : activeTab === "Labour" ? `${primaryPurple}15` : `${primaryLightBlue}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: activeTab === "Materials" ? "#F97316" : activeTab === "Labour" ? primaryPurple : primaryLightBlue }}>
              <FileText size={24} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary, margin: "0 0 6px" }}>Configure Filters</h3>
            <p style={{ fontSize: 12.5, color: colors.textLight, margin: 0, lineHeight: 1.5 }}>
              Configure filters above and tap<br /><strong>"Generate CSV Report"</strong> to view transaction logs.
            </p>
          </div>
        ) : (

          <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.cardBorder}`, overflow: "hidden", boxShadow: shadows.card }}>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F5F6FF" }}>
                    {uiActiveCols.map((colName) => {
                      const isSortable = ["Date", "Purchased Date", "Project", "Amount"].includes(colName);
                      let style = {
                        padding: "14px 18px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: colors.textMedium,
                        letterSpacing: "0.06em",
                        textAlign: colName === "Amount" ? "right" : "left",
                        whiteSpace: "nowrap",
                        cursor: isSortable ? "pointer" : "default"
                      };

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
                          style={style}
                          onClick={isSortable ? handleSortClick : undefined}
                        >
                          {colName === "Amount" ? "AMOUNT (INR)" : colName.toUpperCase()}
                          {isSortable && sortColumn === (colName === "Project" ? "project" : colName === "Amount" ? "amount" : "date") && (
                            <span style={{ marginLeft: 4 }}>{sortAscending ? "▲" : "▼"}</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={uiActiveCols.length} style={{ padding: 48, textAlign: "center", color: colors.textLight, fontSize: 13 }}>
                        No transaction logs match filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedEntries.map((entry) => {
                      const projectName = getProjectName(entry.projectId);

                      return (
                        <tr
                          key={entry.id}
                          style={{ borderBottom: `1px solid ${colors.divider}`, cursor: "pointer" }}
                          onClick={(e) => {

                            if (e.target.closest("button")) return;
                            setDetailsEntry(entry);
                          }}
                          className="hover-bg-subtle"
                        >
                          {uiActiveCols.map((colName) => {
                            const valStyle = { padding: "14px 18px", fontSize: 12.5, color: colors.textPrimary };

                            if (colName === "Purchased Date") {
                              return <td key={colName} style={valStyle}>{formatDateShort(entry.date)}</td>;
                            } else if (colName === "Payment Date") {
                              return <td key={colName} style={valStyle}>{entry.paymentDate ? formatDateShort(entry.paymentDate) : "—"}</td>;
                            } else if (colName === "Project") {
                              return <td key={colName} style={{ ...valStyle, fontWeight: "600" }}>{projectName}</td>;
                            } else if (colName === "Type") {
                              const chipColor = entry.type === "material" ? "#F97316" : entry.type === "labour" ? primaryPurple : primaryLightBlue;
                              const chipBg = entry.type === "material" ? "#F9731615" : entry.type === "labour" ? `${primaryPurple}15` : `${primaryLightBlue}15`;
                              return (
                                <td key={colName} style={valStyle}>
                                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10.5, fontWeight: "700", background: chipBg, color: chipColor }}>
                                    {entry.type.toUpperCase()}
                                  </span>
                                </td>
                              );
                            } else if (colName === "Description") {
                              return <td key={colName} style={valStyle}>{entry.description || "—"}</td>;
                            } else if (colName === "Material" || colName === "Worker Type" || colName === "Equipment") {
                              return <td key={colName} style={valStyle}>{entry.description}</td>;
                            } else if (colName === "Brand") {
                              return <td key={colName} style={valStyle}>{entry.brand || "—"}</td>;
                            } else if (colName === "Floor") {
                              return <td key={colName} style={valStyle}>{entry.floor || "—"}</td>;
                            } else if (colName === "Phase") {
                              return <td key={colName} style={valStyle}>{entry.phase || "—"}</td>;
                            } else if (colName === "Activity") {
                              return <td key={colName} style={valStyle}>{entry.activity || "—"}</td>;
                            } else if (colName === "Unit") {
                              return <td key={colName} style={valStyle}>{entry.unit || "—"}</td>;
                            } else if (colName === "Status") {
                              const payStatus = getPaymentStatusLabel(entry.paymentStatus);
                              const col = payStatus === "Fully Paid" ? "#16a34a" : payStatus === "Partial" ? "#d97706" : "#dc2626";
                              const bg = payStatus === "Fully Paid" ? "#f0fdf4" : payStatus === "Partial" ? "#fffbeb" : "#fef2f2";
                              return (
                                <td key={colName} style={valStyle}>
                                  <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: "700", color: col, background: bg }}>
                                    {payStatus}
                                  </span>
                                </td>
                              );
                            } else if (colName === "Approval") {
                              const raw = entry.rawTx || {};
                              const appStatus = raw.approvalStatus || "Approved";
                              const col = appStatus === "Approved" ? "#166534" : appStatus === "Rejected" ? "#991b1b" : "#854d0e";
                              const bg = appStatus === "Approved" ? "#dcfce7" : appStatus === "Rejected" ? "#fee2e2" : "#fef9c3";
                              const isPendingApproval = appStatus === "Pending";
                              return (
                                <td key={colName} style={valStyle}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: "700", color: col, background: bg }}>
                                      {appStatus}
                                    </span>
                                    {isPendingApproval && canApprove && (
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <button onClick={() => handleInlineApprove(entry)} title="Approve Entry" style={{ border: "none", background: "#dcfce7", color: "#166534", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontWeight: 700, fontSize: 11 }}>✓</button>
                                        <button onClick={() => handleInlineReject(entry)} title="Reject Entry" style={{ border: "none", background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontWeight: 700, fontSize: 11 }}>✕</button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            } else if (colName === "Amount") {
                              return (
                                <td key={colName} style={{ ...valStyle, textAlign: "right", fontWeight: "700" }}>
                                  {formatINR(entry.amount)}
                                </td>
                              );
                            } else if (colName === "Paid") {
                              return (
                                <td key={colName} style={{ ...valStyle, textAlign: "right", fontWeight: "600", color: "#16a34a" }}>
                                  {formatINR(entry.paidAmount || 0)}
                                </td>
                              );
                            } else if (colName === "Remaining") {
                              const rem = Math.max(0, (entry.amount || 0) - (entry.paidAmount || 0));
                              return (
                                <td key={colName} style={{ ...valStyle, textAlign: "right", fontWeight: "600", color: rem > 0 ? "#dc2626" : "#16a34a" }}>
                                  {formatINR(rem)}
                                </td>
                              );
                            } else if (colName === "Rate" || colName === "Rate/Day" || colName === "Rent Rate") {
                              return (
                                <td key={colName} style={{ ...valStyle, textAlign: "right" }}>
                                  {formatINR(entry.ratePerUnit)}
                                </td>
                              );
                            } else if (colName === "Qty" || colName === "Days" || colName === "Duration") {
                              const rate = entry.ratePerUnit || 0;
                              const val = (rate === 0) ? 0 : entry.amount / rate;
                              return (
                                <td key={colName} style={{ ...valStyle, textAlign: "right" }}>
                                  {val.toFixed(1)}
                                </td>
                              );
                            } else if (colName === "Add More") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {canAddEdit ? (
                                    <button
                                      onClick={() => handleAddMore(entry)}
                                      style={{ padding: "6px 12px", border: `1.2px solid #E2E4FA`, background: "#FFF", borderRadius: 8, fontSize: 11.5, fontWeight: "700", color: primaryBlue, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                    >
                                      <PlusCircle size={12} /> Add More
                                    </button>
                                  ) : <span style={{ color: "#94A3B8" }}>—</span>}
                                </td>
                              );
                            } else if (colName === "Record Payment") {
                              return (
                                <td key={colName} style={valStyle}>
                                  {canRecordPayment ? (
                                    <button
                                      onClick={() => handleRecordPaymentClick(entry)}
                                      style={{ padding: "6px 12px", border: `1.2px solid #ca8a04`, background: "#FFF", borderRadius: 8, fontSize: 11.5, fontWeight: "700", color: "#ca8a04", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                    >
                                      <CreditCard size={12} /> Pay Log
                                    </button>
                                  ) : <span style={{ color: "#94A3B8" }}>—</span>}
                                </td>
                              );
                            } else if (colName === "Actions") {
                              return (
                                <td key={colName} style={valStyle}>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    {canAddEdit && (
                                      <button
                                        onClick={() => handleEditEntry(entry)}
                                        style={{ padding: "6px 10px", border: "1.2px solid #4b5563", background: "#fff", borderRadius: 8, fontSize: 11.5, fontWeight: "700", color: "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                      >
                                        <Edit2 size={12} /> Edit
                                      </button>
                                    )}
                                  </div>
                                </td>
                              );
                            } else {
                              return <td key={colName} style={valStyle}>—</td>;
                            }
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: `1px solid ${colors.cardBorder}`, background: "#FFF", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 12, color: colors.textLight }}>{totalCount} entries found</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: colors.textLight }}>Show:</span>
                    <select
                      value={rowsPerPage}
                      onChange={e => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{ padding: "4px 8px", borderRadius: 6, border: `1.2px solid #E2E4FA`, fontSize: 12, fontWeight: "700", color: colors.textPrimary, outline: "none" }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(safeCurrentPage - 1)}
                    style={{ border: `1px solid ${colors.cardBorder}`, background: "none", cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer", padding: 6, borderRadius: 8, color: safeCurrentPage <= 1 ? "#aaa" : colors.textPrimary }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 12.5, fontWeight: "600", color: colors.textPrimary }}>
                    Page {safeCurrentPage} of {totalPages}
                  </span>
                  <button
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(safeCurrentPage + 1)}
                    style={{ border: `1px solid ${colors.cardBorder}`, background: "none", cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer", padding: 6, borderRadius: 8, color: safeCurrentPage >= totalPages ? "#aaa" : colors.textPrimary }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {showCustomizeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#FFF", borderRadius: 16, width: 340, padding: 20, boxShadow: shadows.card, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: primaryBlue }}>Customize Columns</h3>
              <button onClick={() => setShowCustomizeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textLight }}><X size={18} /></button>
            </div>

            <hr style={{ border: "none", borderTop: `1px solid ${colors.divider}`, margin: "0 0 10px" }} />

            <p style={{ margin: "0 0 12px", fontSize: 11, color: colors.textLight, lineHeight: 1.4 }}>
              Toggle visibility or reorder columns in the reports table log layout. Move columns up and down inside the table list.
            </p>

            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
              {tempAllCols.map((col, idx) => {
                const isChecked = tempActiveCols.includes(col);
                return (
                  <div key={col} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: colors.bgBase4, borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleColumn(col)}
                        style={{ width: 15, height: 15, accentColor: primaryBlue, cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: "700", color: colors.textPrimary }}>{col}</span>
                    </div>

                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMoveColumn(idx, -1)}
                        style={{ border: "none", background: "none", cursor: idx === 0 ? "not-allowed" : "pointer", color: idx === 0 ? "#ccc" : colors.textPrimary, fontSize: 11, fontWeight: "bold" }}
                      >
                        ▲
                      </button>
                      <button
                        disabled={idx === tempAllCols.length - 1}
                        onClick={() => handleMoveColumn(idx, 1)}
                        style={{ border: "none", background: "none", cursor: idx === tempAllCols.length - 1 ? "not-allowed" : "pointer", color: idx === tempAllCols.length - 1 ? "#ccc" : colors.textPrimary, fontSize: 11, fontWeight: "bold" }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyItems: "stretch", gap: 10, marginTop: 18 }}>
              <button
                onClick={resetCustomizeColumns}
                style={{ flex: 1, padding: "10px 0", border: `1.2px solid ${colors.cardBorder}`, background: "none", borderRadius: 10, fontSize: 13, fontWeight: "700", color: colors.textMedium, cursor: "pointer" }}
              >
                Reset Default
              </button>
              <button
                onClick={saveCustomizeColumns}
                style={{ flex: 1, padding: "10px 0", border: "none", background: gradients.primaryButton, borderRadius: 10, fontSize: 13, fontWeight: "700", color: "#FFF", cursor: "pointer" }}
              >
                Save Columns
              </button>
            </div>

          </div>
        </div>
      )}

      {detailsEntry && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#FFF", borderRadius: 16, width: 360, padding: 22, boxShadow: shadows.card }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: primaryBlue }}>Entry Details</h3>
              <button onClick={() => setDetailsEntry(null)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textLight }}><X size={18} /></button>
            </div>

            <hr style={{ border: "none", borderTop: `1px solid ${colors.divider}`, margin: "0 0 14px" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Project", val: getProjectName(detailsEntry.projectId) },
                { label: "Type", val: detailsEntry.type.toUpperCase() },
                { label: "Date", val: formatDateLong(detailsEntry.date) },
                { label: "Total Amount", val: formatINR(detailsEntry.rawTx?.amount || detailsEntry.amount), bold: true },
                { label: "Paid Amount", val: formatINR(detailsEntry.rawTx?.paidAmount || 0), bold: true, textColor: "#166534" },
                { label: "Balance", val: formatINR(detailsEntry.rawTx?.remainingAmount ?? ((detailsEntry.rawTx?.amount || detailsEntry.amount) - (detailsEntry.rawTx?.paidAmount || 0))), bold: true, textColor: "#dc2626" },
                { label: "Status", val: getPaymentStatusLabel(detailsEntry.paymentStatus, detailsEntry.rawTx) },
                { label: "Description", val: detailsEntry.description || "—" },
                { label: "Brand", val: detailsEntry.brand || "—" },
                { label: "Floor", val: detailsEntry.floor || "—" },
                { label: "Phase", val: detailsEntry.phase || "—" },
                { label: "Unit", val: detailsEntry.unit || "—" },
                { label: "Rejection Reason", val: detailsEntry.rejectionReason, isWarning: true }
              ].map((row) => {
                if (!row.val && row.val !== 0 && row.val !== "₹0") return null;
                return (
                  <div key={row.label} style={{ display: "flex", fontSize: 12.5 }}>
                    <span style={{ width: 110, fontWeight: "600", color: colors.textSecondary }}>{row.label}</span>
                    <span style={{ flex: 1, fontWeight: row.bold ? "800" : "700", color: row.textColor ? row.textColor : (row.isWarning ? "#dc2626" : colors.textPrimary) }}>{row.val}</span>
                  </div>
                );
              })}
            </div>

            <hr style={{ border: "none", borderTop: `1px solid ${colors.divider}`, margin: "16px 0 14px" }} />

            {detailsEntry?.rawTx?.paymentHistory?.length > 0 && (
              <>
                <hr style={{ border: "none", borderTop: `1px solid ${colors.divider}`, margin: "14px 0" }} />
                <div style={{ fontSize: 11.5, fontWeight: 700, color: colors.textSecondary, marginBottom: 8 }}>
                  PAYMENT HISTORY
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 140, overflowY: "auto" }}>
                  {detailsEntry.rawTx.paymentHistory.map((ph, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: colors.bgBase4,
                        border: `1px solid ${colors.cardBorder}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.textPrimary }}>
                          {formatINR(ph.amount)}
                        </span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 11, padding: "2px 6px", background: "#FDE8D8", color: "#F97316", borderRadius: 4, fontWeight: 600 }}>
                            {ph.method || "—"}
                          </span>
                          {ph.receipt && (
                            <a href={ph.receipt} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#EA580C", fontWeight: 600, textDecoration: "none" }}>
                              Receipt ↗
                            </a>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: colors.textLight }}>
                        {formatDateLong(ph.date)}
                      </div>
                      {ph.note && (
                        <div style={{ fontSize: 11, color: colors.textSecondary, fontStyle: "italic", marginTop: 2 }}>
                          Note: {ph.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  const entry = detailsEntry;
                  setDetailsEntry(null);
                  handleAddMore(entry);
                }}
                style={{ flex: 1, padding: "8px 0", border: `1.2px solid #E2E4FA`, background: "#FFF", borderRadius: 8, fontSize: 11.5, fontWeight: "700", color: primaryBlue, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
              >
                <PlusCircle size={11} /> Add More
              </button>

              <button
                onClick={() => {
                  const entry = detailsEntry;
                  setDetailsEntry(null);
                  handleRecordPaymentClick(entry);
                }}
                style={{ flex: 1, padding: "8px 0", border: `1.2px solid #ca8a04`, background: "#FFF", borderRadius: 8, fontSize: 11.5, fontWeight: "700", color: "#ca8a04", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
              >
                <CreditCard size={11} /> Pay Log
              </button>

              <button
                onClick={() => {
                  const entry = detailsEntry;
                  setDetailsEntry(null);
                  handleEditEntry(entry);
                }}
                style={{ flex: 1, padding: "8px 0", border: `1.2px solid #4b5563`, background: "#FFF", borderRadius: 8, fontSize: 11.5, fontWeight: "700", color: "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
              >
                <Edit2 size={11} /> Edit
              </button>
            </div>

          </div>
        </div>
      )}

      <RecordPaymentSheet
        open={paymentSheetOpen}
        entry={paymentItem}
        projects={projects}
        onClose={() => setPaymentSheetOpen(false)}
        onSaved={(msg) => {
          setToast({ msg: msg || "Payment recorded successfully", type: "success" });
          loadData();
        }}
      />

    </div>
  );
}
