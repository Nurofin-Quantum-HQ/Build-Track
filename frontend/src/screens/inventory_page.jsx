import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { inventoryAPI, projectAPI, transactionAPI } from "../api";
import useInventoryStore from "../stores/inventoryStore";
import useTransactionStore from "../stores/transactionStore";
import useProjectStore from "../stores/projectStore";
import perfLogger from "../utils/performanceLogger";
import { Toast } from "../components/Toast";
import RecordPaymentSheet from "../components/RecordPaymentSheet";
import { Pencil, HelpCircle } from "lucide-react";
import ModuleTour from "../components/ModuleTour";
import Button from "../components/ui/Button";
import { colors, radius, spacing, shadows, gradients, typography } from "../styles/designTokens";

const STATUS_META = {
  "In Stock":    { label: "In Stock",    bg: "#E8F5E9", border: "#43A047", text: "#2E7D32" },
  "Low Stock":   { label: "Low Stock",   bg: "#FFF8E1", border: "#FFC107", text: "#F57F17" },
  "Out of Stock":{ label: "Out of Stock",bg: "#FFEBEE", border: "#E53935", text: "#C62828" },
};

const PAYMENT_STATUS_COLORS = {
  paid:    { bg: "#E8F5E9", text: "#2E7D32", border: "#43A047" },
  partial: { bg: "#FFF8E1", text: "#F57F17", border: "#FFC107" },
  pending: { bg: "#FFF5F0", text: "#F97316", border: "#F97316" },
  overdue: { bg: "#FFEBEE", text: "#C62828", border: "#E53935" },
};

function getStatus(balance, threshold = 5) {
  if (balance <= 0) return "Out of Stock";
  if (balance <= threshold) return "Low Stock";
  return "In Stock";
}

const TABS = [
  { key: "material", label: "Materials", icon: "M12 2l9 4.5v9L12 20l-9-4.5v-9L12 2zm0 2.1L4.5 8.25 12 12.4l7.5-4.15L12 4.1z" },
  { key: "labour",    label: "Labour",    icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" },
  { key: "equipment", label: "Equipment", icon: "M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8z" },
];

function isTransactionInDateRange(dateStr, filter, customRange) {
  if (filter === "All") return true;
  const txDate = new Date(dateStr);
  const now = new Date();
  const startOfDay = (d) => { d.setHours(0,0,0,0); return d; };
  const endOfDay = (d) => { d.setHours(23,59,59,999); return d; };
  switch (filter) {
    case "Today": {
      const start = startOfDay(new Date());
      const end = endOfDay(new Date());
      return txDate >= start && txDate <= end;
    }
    case "Yesterday": {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      return txDate >= startOfDay(yesterday) && txDate <= endOfDay(yesterday);
    }
    case "This Week": {
      const start = startOfDay(new Date(now));
      start.setDate(now.getDate() - now.getDay());
      return txDate >= start && txDate <= endOfDay(new Date(now));
    }
    case "This Month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return txDate >= start && txDate <= endOfDay(new Date());
    }
    case "Last Month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return txDate >= start && txDate <= end;
    }
    case "Last 3 Months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
      return txDate >= start && txDate <= endOfDay(new Date());
    }
    case "This Year": {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return txDate >= start && txDate <= endOfDay(new Date());
    }
    case "Custom": {
      if (!customRange || !customRange.start || !customRange.end) return true;
      const start = startOfDay(new Date(customRange.start));
      const end = endOfDay(new Date(customRange.end));
      return txDate >= start && txDate <= end;
    }
    default: return true;
  }
}

function getTypeLabel(type) {
  if (type === "labour") return "Days";
  if (type === "equipment") return "Hours";
  return "Qty";
}

function getVendorLabel(type) {
  if (type === "labour") return "Worker";
  if (type === "equipment") return "Operator";
  return "Vendor";
}

function getCategoryIcon(categoryName, type) {
  if (type === "labour") return { path: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", bg: "#FFF5F0", color: colors.primaryBlue };
  if (type === "equipment") return { path: "M22 9V7h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2v-2h-2V9h2zm-4 10H4V5h14v14zM6 13h5v4H6v-4zm6-6h4v3h-4V7zM6 7h5v5H6V7zm6 4h4v6h-4v-6z", bg: "#ECFDF5", color: "#16A34A" };
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("cement")) return { path: "M12 2l9 4.5v9L12 20l-9-4.5v-9L12 2z", bg: "#E8F5E9", color: "#4CAF50" };
  if (cat.includes("steel") || cat.includes("iron")) return { path: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z", bg: "#FFF5F0", color: "#F97316" };
  if (cat.includes("sand") || cat.includes("aggregate")) return { path: "M2 20h20v2H2v-2zm2-3h2v2H4v-2zm4-3h2v2H8v-2zm4-3h2v2h-2V11zm4-3h2v2h-2V8zm4-3h2v2h-2V5z", bg: "#FFF8E1", color: "#F59E0B" };
  if (cat.includes("brick") || cat.includes("block")) return { path: "M2 20h20v2H2v-2zm2-3h2v2H4v-2zm4-3h2v2H8v-2zm4-3h2v2h-2V11zm4-3h2v2h-2V8z", bg: "#FBE9E7", color: "#E64A19" };
  if (cat.includes("electric")) return { path: "M7 2v11h3v9l7-12h-4l4-8z", bg: "#FFF7F0", color: "#EA580C" };
  if (cat.includes("plumb") || cat.includes("pipe")) return { path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z", bg: "#FFF5F0", color: "#FB923C" };
  return { path: "M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8z", bg: "#FFF5F0", color: colors.primaryBlue };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function groupByDate(transactions) {
  const map = {};
  for (const tx of transactions) {
    const d = new Date(tx.date || tx.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!map[key]) map[key] = [];
    map[key].push(tx);
  }
  return Object.entries(map)
    .map(([key, txs]) => {
      const [y, m, d] = key.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      const label = `${String(d).padStart(2,"0")} ${MONTHS[m-1]} ${y}`;
      txs.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      return { label, date: dt, transactions: txs };
    })
    .sort((a, b) => b.date - a.date);
}

function formatCurr(v) {
  return "\u20B9" + v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function InventoryPage() {
  const navigate = useNavigate();

  const [dbInventory, setDbInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "info" });

  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-header', content: 'Track your materials, labour, and equipment inventory.', disableBeacon: true },
    { target: '.tour-project-context', content: 'Select which project\'s inventory to view.' },
    { target: '.tour-filters', content: 'Search and filter inventory by status or date.' },
    { target: '.tour-tabs', content: 'Switch between Materials, Labour, and Equipment views.' },
    { target: '.tour-kpis', content: 'Key performance indicators for your current view.' }
  ];

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [filterStatus, setFilterStatus] = useState("all");
  const [thresholdDrafts, setThresholdDrafts] = useState({});

  const [dateFilter, setDateFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expandedItems, setExpandedItems] = useState({});

  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);

  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentEntry, setRecordPaymentEntry] = useState(null);

  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(null);
      }
    }
    if (menuOpen !== null) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

  const { items: dbInventoryStore, fetchInventory: storeFetchInventory } = useInventoryStore();
  const { transactions: txStore, fetchTransactions: storeFetchTx } = useTransactionStore();
  const { projects: projStore, fetchProjects: storeFetchProj } = useProjectStore();

  useEffect(() => {
    perfLogger.endRoute('/inventory');
    perfLogger.logMount('InventoryPage');
  }, []);

  const fetchInventory = useCallback((force = false) => {
    if (dbInventoryStore.length === 0 && txStore.length === 0) setLoading(true);
    Promise.all([
      storeFetchInventory(force),
      storeFetchTx({ limit: 10000, filterByViewAccess: true }, force),
      storeFetchProj({}, force)
    ])
      .then(([dbItems, txItems, projList]) => {
        setDbInventory(dbItems || dbInventoryStore);
        setTransactions(txItems || txStore);
        setProjects(projList || projStore);
        const drafts = {};
        (dbItems || dbInventoryStore || []).forEach(item => { drafts[item._id] = Number(item.threshold ?? 5); });
        setThresholdDrafts(prev => ({ ...prev, ...drafts }));
      })
      .catch(() => setToast({ msg: "Failed to load inventory", type: "error" }))
      .finally(() => setLoading(false));
  }, [dbInventoryStore, txStore, projStore, storeFetchInventory, storeFetchTx, storeFetchProj]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { setCategoryFilter("All"); }, [activeTab]);

  const activeTabKey = TABS[activeTab].key;

  const dateFilteredTransactions = transactions.filter(t => {
    const tDate = t.date || t.createdAt;
    return isTransactionInDateRange(tDate, dateFilter, customDateRange);
  });

  const groupedItems = (() => {
    const grouped = {};
    for (const t of dateFilteredTransactions) {
      const rawType = (t.type || "").trim().toLowerCase();
      if (rawType === "income" || rawType === "revenue") continue;
      const approvalStatus = (t.approvalStatus || "").trim().toLowerCase();
      if (approvalStatus !== "approved") continue;

      const itemName = (t.title || t.materialName || t.name || "Unknown").trim();
      let tabType = "material";
      if (rawType === "wages" || rawType === "labour") tabType = "labour";
      else if (rawType === "expense" || rawType === "equipment") tabType = "equipment";
      else if (rawType === "materials") tabType = "material";
      else {
        const originalCategory = (t.category || t.materialName || "").trim().toLowerCase();
        if (originalCategory === "labour" || originalCategory === "wages" || originalCategory === "labor" || originalCategory.includes("labour")) tabType = "labour";
        else if (originalCategory === "equipment" || originalCategory === "machinery" || originalCategory === "expense") tabType = "equipment";
      }

      let unit = (t.unit || "").trim();
      if (unit.toLowerCase() === "units" || unit.toLowerCase() === "unit") unit = "";
      const pid = t.project?._id || t.project || "unknown";
      const pDoc = projects.find(p => String(p._id) === String(pid));
      const pName = t.project?.projectName || pDoc?.projectName || "";
      const key = `${itemName.toLowerCase()}||${tabType}||${unit.toLowerCase()}||${pid}`;
      const qty = Number(t.quantity || t.purchased || 0);
      const isPositive = String(t.subType).toLowerCase() !== "consumption" && String(t.materialType).toLowerCase() !== "usage";
      const dbMatch = dbInventory.find(inv => inv.materialName?.toLowerCase() === itemName.toLowerCase() && String(inv.project?._id || inv.project) === String(pid));

      if (grouped[key]) {
        if (isPositive) { grouped[key].purchased += qty; grouped[key].closingStock += qty; }
        else { grouped[key].used += qty; grouped[key].closingStock -= qty; }
        grouped[key].transactions.push(t);
      } else {
        grouped[key] = {
          _id: dbMatch?._id || key, isDbRecord: !!dbMatch, materialName: itemName, category: tabType,
          purchased: isPositive ? qty : 0, used: isPositive ? 0 : qty, closingStock: isPositive ? qty : -qty,
          threshold: dbMatch ? Number(dbMatch.threshold ?? 10) : 10, unit,
          project: t.project || pDoc || { _id: pid, projectName: pName }, brand: t.brand || dbMatch?.brand || "",
          transactions: [t],
        };
      }
    }

    const itemsList = Object.values(grouped);
    itemsList.forEach(item => {
      item.transactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      if (thresholdDrafts[item._id] === undefined) thresholdDrafts[item._id] = item.threshold;
    });
    return itemsList;
  })();

  const projectFiltered = groupedItems.filter(item => {
    const pid = item.project?._id || item.project;
    return !selectedProjectId || String(pid) === selectedProjectId;
  });

  const tabInventory = projectFiltered.filter(item => item.category === activeTabKey);

  const categoryChips = (() => {
    const cats = new Set();
    const skipSet = new Set(["materials", "material", "labour", "equipment", "general", "others", "unknown", "none"]);
    tabInventory.forEach(item => {
      item.transactions.forEach(t => {
        const catName = (t.categoryName || t.materialType || t.workType || t.equipmentType || t.category || "").trim();
        if (catName && !skipSet.has(catName.toLowerCase())) cats.add(catName);
      });
    });
    return ["All", ...Array.from(cats).sort()];
  })();

  const chipFiltered = tabInventory.filter(item => {
    if (categoryFilter === "All") return true;
    return item.transactions.some(t => {
      const catName = (t.categoryName || t.materialType || t.workType || t.equipmentType || t.category || "").trim().toLowerCase();
      return catName === categoryFilter.toLowerCase();
    });
  });

  const searchFiltered = chipFiltered.filter(item => {
    const q = search.toLowerCase();
    if (!q) return true;
    const matchName = item.materialName?.toLowerCase().includes(q) || item.brand?.toLowerCase().includes(q);
    const matchTx = item.transactions.some(t =>
      (t.supplier || t.vendor || t.workerName || t.operator || t.contractor || t.title || "").toLowerCase().includes(q)
    );
    return matchName || matchTx;
  });

  const filtered = searchFiltered.filter(item => {
    const status = getStatus(item.closingStock, item.threshold);
    return filterStatus === "all" || status === filterStatus;
  });

  const totalItems = filtered.length;
  const lowItems = filtered.filter(i => getStatus(i.closingStock, i.threshold) === "Low Stock").length;
  const emptyItems = filtered.filter(i => getStatus(i.closingStock, i.threshold) === "Out of Stock").length;
  const totalPurchased = filtered.reduce((s, i) => s + (i.purchased || 0), 0);
  const totalUsed = filtered.reduce((s, i) => s + (i.used || 0), 0);

  const labelPlural = activeTabKey === "material" ? "material" : activeTabKey === "labour" ? "labour entry" : "equipment item";
  const labelSuffix = totalItems !== 1 ? "s" : "";
  const selProject = selectedProjectId ? projects.find(p => String(p._id) === selectedProjectId) : null;
  const projectLabel = selProject?.projectName || "All Active Projects";

  const searchPlaceholder = (() => {
    if (activeTabKey === "labour") return "Search by worker or contractor...";
    if (activeTabKey === "equipment") return "Search by equipment or supplier...";
    return "Search by name, vendor, brand...";
  })();

  const paymentSummary = (() => {
    let totalBill = 0;
    let totalPaid = 0;
    tabInventory.forEach(item => {
      item.transactions.forEach(t => {
        const q = Number(t.quantity || t.purchased || t.days || t.hours || 0);
        let bill = Number(t.amount || 0);
        const rateVal = Number(t.rate || t.dailyWage || t.hourlyRate || 0);
        if (bill === 0 && q > 0 && rateVal > 0) bill = q * rateVal;
        totalBill += bill;
        totalPaid += Number(t.paidAmount || 0);
      });
    });
    return { totalBill, totalPaid, pending: Math.max(0, totalBill - totalPaid) };
  })();

  const kpiData = (() => {
    let totalQty = 0, totalCost = 0, totalPend = 0;
    const vendors = new Set();
    tabInventory.forEach(item => {
      item.transactions.forEach(t => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          (t.title || t.materialName || t.name || "").toLowerCase().includes(q) ||
          (t.brand || "").toLowerCase().includes(q) ||
          (t.supplier || t.vendor || t.workerName || t.operator || t.contractor || "").toLowerCase().includes(q);
        const catName = (t.categoryName || t.materialType || t.workType || t.equipmentType || t.category || "").trim();
        const matchChip = categoryFilter === "All" || catName.toLowerCase() === categoryFilter.toLowerCase();
        if (matchSearch && matchChip) {
          const qty = Number(t.quantity || t.purchased || t.days || t.hours || 0);
          totalQty += qty;
          let bill = Number(t.amount || 0);
          const rateVal = Number(t.rate || t.dailyWage || t.hourlyRate || 0);
          if (bill === 0 && qty > 0 && rateVal > 0) bill = qty * rateVal;
          totalCost += bill;
          const paid = Number(t.paidAmount || 0);
          const payStatus = (t.paymentStatus || "").trim().toLowerCase();
          if (payStatus !== "paid") totalPend += Math.max(0, bill - paid);
          const vendorName = (t.supplier || t.vendor || t.workerName || t.operator || "").trim();
          if (vendorName) vendors.add(vendorName.toLowerCase());
        }
      });
    });

    if (activeTabKey === "labour") {
      return [
        { label: "Total Days", value: String(totalQty), color: colors.primaryPurple, icon: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" },
        { label: "Labour Cost", value: formatCurr(totalCost), color: colors.primaryPurple, icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" },
        { label: "Pending Wages", value: formatCurr(totalPend), color: "#EF4444", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z", alert: totalPend > 0 },
        { label: "Contractors", value: String(vendors.size), color: "#10B981", icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3z" }
      ];
    } else if (activeTabKey === "equipment") {
      return [
        { label: "Total Hours", value: String(totalQty), color: colors.primaryLightBlue, icon: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" },
        { label: "Rental Cost", value: formatCurr(totalCost), color: colors.primaryLightBlue, icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" },
        { label: "Pending Pay", value: formatCurr(totalPend), color: "#EF4444", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z", alert: totalPend > 0 },
        { label: "Operators", value: String(vendors.size), color: "#10B981", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" }
      ];
    } else {
      return [
        { label: "Total Units", value: String(totalQty), color: colors.primaryBlue, icon: "M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8z" },
        { label: "Purchase Value", value: formatCurr(totalCost), color: colors.primaryPurple, icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" },
        { label: "Pending Pay", value: formatCurr(totalPend), color: "#EF4444", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z", alert: totalPend > 0 },
        { label: "Vendors", value: String(vendors.size), color: "#10B981", icon: "M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0-8a3 3 0 1 1-3 3 3 3 0 0 1 3-3zm0 9c-4.97 0-9 2.46-9 5.5V20h18v-1.5c0-3.04-4.03-5.5-9-5.5z" }
      ];
    }
  })();

  async function saveThreshold(item) {
    if (!item) return;
    const next = Number(thresholdDrafts[item._id]);
    if (!Number.isFinite(next) || next < 0) {
      setToast({ msg: "Threshold must be >= 0", type: "error" });
      return;
    }
    try {
      const params = {};
      if (!item.isDbRecord) {
        params.project = item.project?._id || item.project;
        params.materialName = item.materialName;
        params.category = item.category;
        params.unit = item.unit;
      }
      await inventoryAPI.updateThreshold(item._id, next, params);
      setToast({ msg: "Threshold updated", type: "success" });
      fetchInventory();
    } catch (err) {
      setToast({ msg: err.response?.data?.message || "Failed to update threshold", type: "error" });
    }
  }

  async function deleteItem(item) {
    if (!item?.isDbRecord) {
      setToast({ msg: "Only database items can be deleted", type: "error" });
      return;
    }
    if (!window.confirm(`Delete "${item.materialName}"? This cannot be undone.`)) return;
    try {
      await inventoryAPI.deleteItem(item._id);
      setToast({ msg: "Item deleted", type: "success" });
      fetchInventory();
    } catch (err) {
      setToast({ msg: err.response?.data?.message || "Failed to delete", type: "error" });
    }
    setMenuOpen(null);
  }
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "100%", minHeight: "100vh",
      fontFamily: typography.fontFamily, background: "transparent",
    }}>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "info" })} />
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="InventoryManagement" />

      <RecordPaymentSheet
        open={recordPaymentOpen}
        entry={recordPaymentEntry}
        projects={projects}
        onClose={() => setRecordPaymentOpen(false)}
        onSaved={(msg) => {
          setToast({ msg, type: "success" });
          setRecordPaymentOpen(false);
          fetchInventory();
        }}
      />

        <div className="tour-header" style={{
          padding: "18px 24px 14px", borderBottom: `1px solid ${colors.border}`,
          background: "#fff", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.textPrimary }}>Inventory</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.textLight }}>
              {loading ? "Loading..." : `${totalItems} ${labelPlural}${labelSuffix}`}
            </p>
          </div>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
            <HelpCircle size={16} color={colors.textLight} />
          </button>
        </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 40px" }}>

        <div className="tour-project-context" style={{
          display: "flex", alignItems: "center", gap: 10,
          background: colors.cardBg, borderRadius: radius.md,
          border: `1px solid #E0E5FF`, boxShadow: shadows.card,
          padding: "11px 14px", cursor: "pointer", marginBottom: 12,
          position: "relative",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: `${colors.primaryBlue}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={colors.primaryBlue} strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: colors.textLight, letterSpacing: "0.08em", marginBottom: 2, textTransform: "uppercase" }}>Project Context</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: colors.textPrimary }}>{projectLabel}</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>

          <select
            value={selectedProjectId || ""}
            onChange={e => setSelectedProjectId(e.target.value || null)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              width: "100%",
              height: "100%",
              cursor: "pointer",
              appearance: "none",
            }}
          >
            <option value="">All Active Projects</option>
            {projects.map(p => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.projectName}
              </option>
            ))}
          </select>
        </div>

        <div className="tour-filters" style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 200, display: "flex", alignItems: "center", gap: 10, background: colors.cardBg, borderRadius: radius.md, border: `1px solid #E8E5F6`, padding: "0 14px", boxShadow: shadows.card }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13.5, color: colors.textPrimary, background: "transparent", height: 48 }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: "0 14px", borderRadius: radius.md, border: `1px solid #E8E5F6`, background: colors.cardBg, fontSize: 13, color: colors.textPrimary, outline: "none", cursor: "pointer", minWidth: 130, height: 48, flex: 0.8 }}>
            <option value="all">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
          <select value={dateFilter} onChange={e => {
            const val = e.target.value;
            setDateFilter(val);
            if (val !== "Custom") setCustomDateRange(null);
            else {
              const start = prompt("Enter start date (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
              const end = prompt("Enter end date (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
              if (start && end) setCustomDateRange({ start, end });
              else setDateFilter("All");
            }
          }}
            style={{ padding: "0 14px", borderRadius: radius.md, border: `1px solid #E8E5F6`, background: colors.cardBg, fontSize: 13, color: colors.textPrimary, outline: "none", cursor: "pointer", minWidth: 130, height: 48, flex: 0.8 }}>
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="This Year">This Year</option>
            <option value="Custom">Custom Range...</option>
          </select>
          <button onClick={fetchInventory}
            style={{ padding: "0 16px", borderRadius: radius.md, border: `1px solid #E8E5F6`, background: colors.cardBg, color: colors.textLight, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, height: 48, flex: 0.5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            Refresh
          </button>
        </div>

        {dateFilter === "Custom" && customDateRange && (
          <div style={{ fontSize: 12.5, color: colors.primaryBlue, fontWeight: 700, marginBottom: 12 }}>
            Filtering transaction records between: {customDateRange.start} and {customDateRange.end}
          </div>
        )}

        <div className="tour-tabs" style={{ display: "flex", gap: 5, padding: 5, marginBottom: 12, background: colors.cardBg, borderRadius: radius.md, border: `1px solid #E8E5F6`, boxShadow: shadows.card }}>
          {TABS.map((tab, i) => {
            const active = i === activeTab;
            return (
              <button key={tab.key} onClick={() => setActiveTab(i)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "11px 0", borderRadius: 10, border: "none", cursor: "pointer",
                  background: active ? gradients.primaryButton : "transparent",
                  color: active ? "#FFF" : "#4B4966",
                  fontWeight: active ? 800 : 600, fontSize: 12.5, transition: "all 0.2s",
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={tab.icon} /></svg>
                {tab.label}
              </button>
            );
          })}
        </div>

        {categoryChips.length > 1 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 12, scrollbarWidth: "thin" }}>
            {categoryChips.map(chip => {
              const active = categoryFilter === chip;
              return (
                <button key={chip} onClick={() => setCategoryFilter(chip)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    border: `1px solid ${active ? colors.primaryBlue : "#E8E5F6"}`,
                    background: active ? colors.primaryBlue : colors.cardBg,
                    color: active ? "#FFF" : colors.textSecondary,
                    fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s"
                  }}>{chip}</button>
              );
            })}
          </div>
        )}

        <div className="tour-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
          {kpiData.map((kpi, i) => (
            <div key={i} style={{
              background: colors.cardBg, borderRadius: radius.lg,
              border: `1px solid ${kpi.alert ? `${kpi.color}50` : colors.cardBorder}`,
              padding: 13, boxShadow: shadows.card,
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, marginBottom: 10, background: `${kpi.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={kpi.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={kpi.icon} /></svg>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 900, color: colors.textPrimary, letterSpacing: "-0.3px", marginBottom: 2 }}>{kpi.value}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: colors.textLight }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {paymentSummary.totalBill > 0 && (
          <div style={{
            background: `linear-gradient(135deg, ${colors.primaryBlue}, ${colors.primaryPurple || "#F97316"})`,
            borderRadius: radius.lg, padding: "16px 20px", marginBottom: 16,
            color: "#FFF", boxShadow: "0 4px 16px rgba(249,115,22,0.25)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Total Billed</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{formatCurr(paymentSummary.totalBill)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Paid</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{formatCurr(paymentSummary.totalPaid)}</div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, height: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 8, background: "#FFF",
                width: `${paymentSummary.totalBill > 0 ? Math.min(100, (paymentSummary.totalPaid / paymentSummary.totalBill) * 100) : 0}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, fontWeight: 600, opacity: 0.9 }}>
              <span>{Math.round(paymentSummary.totalBill > 0 ? (paymentSummary.totalPaid / paymentSummary.totalBill) * 100 : 0)}% Paid</span>
              <span>{formatCurr(paymentSummary.pending)} Pending</span>
            </div>
          </div>
        )}

        {(lowItems > 0 || emptyItems > 0) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: radius.md, marginBottom: 16,
            background: emptyItems > 0 ? colors.dangerLight : colors.warningLight,
            border: `1px solid ${emptyItems > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={emptyItems > 0 ? "#EF4444" : "#F59E0B"} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: emptyItems > 0 ? "#DC2626" : "#B45309" }}>
                {emptyItems > 0 ? `${emptyItems} ${labelPlural}(s) out of stock!` : `${lowItems} ${labelPlural}(s) running low`}
              </div>
              <div style={{ fontSize: 12, color: colors.textLight }}>Adjust thresholds or restock to maintain supply.</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${colors.bgBase4}`, borderTopColor: colors.primaryBlue, animation: "spin 0.7s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 13, color: colors.textLight }}>Loading inventory...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: colors.textLight }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5" style={{ margin: "0 auto 12px", display: "block" }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {transactions.length === 0 ? `Add a Purchase transaction to start tracking ${labelPlural} stock.` : `No ${labelPlural}s match your filters.`}
            </div>
          </div>
        ) : (

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(() => {

              const allGroups = [];
              filtered.forEach(item => {
                const groups = groupByDate(item.transactions);
                allGroups.push({ item, groups });
              });

              return allGroups.map(({ item, groups }) => {
                const status = getStatus(item.closingStock, item.threshold);
                const meta = STATUS_META[status] || STATUS_META["In Stock"];
                const pid = item.project?._id || item.project;
                const pName = item.project?.projectName || projects.find(p => String(p._id) === String(pid))?.projectName || "";
                const balance = item.closingStock || 0;
                const catIcon = getCategoryIcon(
                  item.transactions[0]?.categoryName || item.transactions[0]?.materialType || "",
                  item.category
                );
                const typeLabel = getTypeLabel(item.category);
                const vendorLbl = getVendorLabel(item.category);

                const latestTx = item.transactions[0];
                const vendorName = latestTx?.supplier || latestTx?.vendor || latestTx?.workerName || latestTx?.operator || latestTx?.contractor || "";

                let itemBill = 0, itemPaid = 0;
                item.transactions.forEach(t => {
                  const q = Number(t.quantity || t.purchased || 0);
                  let bill = Number(t.amount || 0);
                  const r = Number(t.rate || t.dailyWage || t.hourlyRate || 0);
                  if (bill === 0 && q > 0 && r > 0) bill = q * r;
                  itemBill += bill;
                  itemPaid += Number(t.paidAmount || 0);
                });
                const itemPending = Math.max(0, itemBill - itemPaid);
                const payStatus = itemBill === 0 ? "pending" :
                  itemPaid >= itemBill ? "paid" :
                  itemPaid > 0 ? "partial" : "pending";
                const payColors = PAYMENT_STATUS_COLORS[payStatus] || PAYMENT_STATUS_COLORS.pending;

                return (
                  <div key={item._id} style={{
                    background: colors.cardBg, borderRadius: radius.lg,
                    border: `1px solid ${colors.cardBorder}`, boxShadow: shadows.card,
                    padding: "16px 18px", position: "relative",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, background: catIcon.bg,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill={catIcon.color}><path d={catIcon.path} /></svg>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: colors.textPrimary, letterSpacing: "-0.2px", marginBottom: 2 }}>{item.materialName}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                            {item.category === "labour" ? <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /> :
                             item.category === "equipment" ? <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /> :
                             <path d="M3 3h18v18H3zM3 9h18M9 21V9" />}
                          </svg>
                          <span style={{
                            fontSize: 11.5, color: vendorName ? colors.textLight : `${colors.textLight}80`,
                            fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {vendorName ? `${vendorLbl}: ${vendorName}` : `${vendorLbl}: —`}
                          </span>
                        </div>
                      </div>

                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
                        borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                        background: payColors.bg, border: `1px solid ${payColors.border}`, color: payColors.text,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: payColors.text }} />
                        {payStatus.charAt(0).toUpperCase() + payStatus.slice(1)}
                      </span>

                      <div style={{ position: "relative" }} ref={menuOpen === item._id ? menuRef : undefined}>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === item._id ? null : item._id);
                        }}
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            color: colors.textLight, fontSize: 18,
                          }}>⋮</button>
                        {menuOpen === item._id && (
                          <div style={{
                            position: "absolute", top: "100%", right: 0, zIndex: 100,
                            background: "#FFF", borderRadius: radius.md, border: `1px solid ${colors.cardBorder}`,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden",
                          }}>
                            <button onClick={() => {
                              setMenuOpen(null);
                              const editArgs = { ...(item.transactions[0] || {}), isEditing: true, id: item.transactions[0]?._id };
                              const addRoute = activeTabKey === "labour" ? "/manualentry" : activeTabKey === "equipment" ? "/manualentry" : "/manualentry";
                              navigate(addRoute, { state: { transaction: editArgs } });
                            }}
                              style={{
                                display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px",
                                border: "none", background: "transparent", cursor: "pointer", fontSize: 13,
                                color: colors.textPrimary, fontWeight: 600, textAlign: "left",
                              }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              Edit Entry
                            </button>
                            <button onClick={() => {
                              setMenuOpen(null);
                              let itemBill = 0, itemPaid = 0;
                              item.transactions.forEach(t => {
                                const q = Number(t.quantity || t.purchased || 0);
                                let bill = Number(t.amount || 0);
                                const r = Number(t.rate || t.dailyWage || t.hourlyRate || 0);
                                if (bill === 0 && q > 0 && r > 0) bill = q * r;
                                itemBill += bill;
                                itemPaid += Number(t.paidAmount || 0);
                              });
                              setRecordPaymentEntry({
                                rawTx: item.transactions[0],
                                amount: itemBill,
                                description: item.materialName,
                                brand: item.brand,
                                id: item.transactions[0]?._id,
                                type: item.category,
                              });
                              setRecordPaymentOpen(true);
                            }}
                              style={{
                                display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px",
                                border: "none", background: "transparent", cursor: "pointer", fontSize: 13,
                                color: colors.textPrimary, fontWeight: 600, textAlign: "left",
                              }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                              Record Payment
                            </button>
                            <button onClick={() => {
                              setMenuOpen(null);
                              const txType = activeTabKey === "material" ? "Materials" : activeTabKey === "labour" ? "Wages" : "Expense";
                              navigate(`/transaction?type=${txType}&search=${encodeURIComponent(item.materialName)}`);
                            }}
                              style={{
                                display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px",
                                border: "none", background: "transparent", cursor: "pointer", fontSize: 13,
                                color: colors.textPrimary, fontWeight: 600, textAlign: "left",
                              }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                              View History
                            </button>
                            {item.isDbRecord && (
                              <>
                                <div style={{ height: 1, background: colors.cardBorder }} />
                                <button onClick={() => deleteItem(item)}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px",
                                    border: "none", background: "transparent", cursor: "pointer", fontSize: 13,
                                    color: "#EF4444", fontWeight: 600, textAlign: "left",
                                  }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10,
                      background: `${colors.primaryPurple}08`, borderRadius: radius.sm, padding: "10px 12px",
                    }}>
                      <div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: colors.textLight, letterSpacing: "0.05em", marginBottom: 2 }}>{typeLabel.toUpperCase()}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.textPrimary }}>{balance.toLocaleString("en-IN")}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: colors.textLight, letterSpacing: "0.05em", marginBottom: 2 }}>PURCHASED</div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.primaryBlue }}>{(item.purchased || 0).toLocaleString("en-IN")}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: colors.textLight, letterSpacing: "0.05em", marginBottom: 2 }}>USED</div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#EF4444" }}>{(item.used || 0).toLocaleString("en-IN")}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textLight }}>Threshold:</span>
                        <input type="number" min="0"
                          value={thresholdDrafts[item._id] ?? 5}
                          onChange={e => setThresholdDrafts(prev => ({ ...prev, [item._id]: e.target.value }))}
                          style={{ width: 60, padding: "6px 8px", borderRadius: radius.sm, border: `1px solid ${colors.cardBorder}`, fontSize: 12, color: colors.textPrimary, background: colors.cardBg, outline: "none", textAlign: "right" }} />
                        <button onClick={() => saveThreshold(item)}
                          style={{ padding: "6px 12px", borderRadius: radius.sm, border: `1px solid ${colors.cardBorder}`, background: colors.cardBg, color: colors.primaryBlue, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Save</button>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setExpandedItems(prev => ({ ...prev, [item._id]: !prev[item._id] }))}
                          style={{ padding: "6px 12px", borderRadius: radius.sm, border: `1px solid ${colors.cardBorder}`, background: colors.cardBg, color: colors.textSecondary, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                          {expandedItems[item._id] ? "Hide Logs" : "View Logs"}
                        </button>
                        <button onClick={() => navigate(`/manualentry?type=${activeTabKey}&project=${item.project?._id || item.project}&name=${item.materialName}&unit=${item.unit}&brand=${item.brand || ""}`)}
                          style={{ padding: "8px 16px", borderRadius: radius.sm, border: "none", background: gradients.primaryButton, color: "#FFF", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          Add More
                        </button>
                      </div>
                    </div>

                    {expandedItems[item._id] && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.cardBorder}` }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: colors.textPrimary, marginBottom: 10 }}>
                          Transaction Logs ({item.transactions.length})
                        </div>

                        {groups.length === 0 ? (
                          <div style={{ fontSize: 12, color: colors.textLight, padding: "10px 0" }}>No transactions found.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {groups.map((group, gi) => {
                              const isCollapsed = collapsedGroups[`${item._id}_${group.label}`] ?? false;
                              return (
                                <div key={gi} style={{ marginBottom: 8 }}>
                                  <div
                                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [`${item._id}_${group.label}`]: !isCollapsed }))}
                                    style={{
                                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                                      background: "#F2F0FB", borderRadius: "8px 8px 0 0",
                                      cursor: "pointer", userSelect: "none",
                                    }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.primaryBlue} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: colors.textPrimary }}>{group.label}</span>
                                    <span style={{
                                      padding: "2px 8px", borderRadius: 10, fontSize: 10.5, fontWeight: 700,
                                      background: `${colors.primaryBlue}15`, color: colors.primaryBlue,
                                    }}>
                                      {group.transactions.length} {group.transactions.length === 1 ? "Item" : "Items"}
                                    </span>
                                    <span style={{ flex: 1 }} />
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2"
                                      style={{ transform: isCollapsed ? "rotate(0.5turn)" : "none", transition: "transform 0.2s" }}>
                                      <polyline points="18 15 12 9 6 15" />
                                    </svg>
                                  </div>

                                  {!isCollapsed && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 0 0" }}>
                                      {group.transactions.map((tx, idx) => {
                                        const txQty = Number(tx.quantity || tx.purchased || 0);
                                        const txRate = Number(tx.rate || tx.dailyWage || tx.hourlyRate || 0);
                                        const txAmount = tx.amount || (txQty * txRate);
                                        const isUsage = String(tx.subType).toLowerCase() === "consumption" || String(tx.materialType).toLowerCase() === "usage";
                                        const txStatus = (tx.paymentStatus || "pending").toLowerCase();
                                        const statColors = PAYMENT_STATUS_COLORS[txStatus] || PAYMENT_STATUS_COLORS.pending;

                                        return (
                                          <div key={tx._id || idx} style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            background: colors.bgBase4, borderRadius: radius.sm,
                                            padding: "10px 12px", border: "1px solid #FFF5F0", fontSize: 12.5,
                                          }}>
                                            <div style={{ flex: 1.2 }}>
                                              <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                                                {new Date(tx.date || tx.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                              </div>
                                              <div style={{ fontSize: 10, fontWeight: 800, color: isUsage ? "#EF4444" : colors.primaryBlue, marginTop: 2 }}>
                                                {isUsage ? "CONSUMPTION" : "PURCHASE"}
                                              </div>
                                            </div>
                                            <div style={{ flex: 2 }}>
                                              <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                                                {tx.supplier || tx.vendor || tx.workerName || tx.operatorName || "—"}
                                              </div>
                                              <div style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>
                                                {txQty} {tx.unit || item.unit} @ ₹{txRate.toLocaleString("en-IN")}
                                              </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1.5, justifyContent: "flex-end" }}>
                                              <div style={{ textAlign: "right" }}>
                                                <div style={{ fontWeight: 800, color: colors.textPrimary }}>₹{txAmount.toLocaleString("en-IN")}</div>
                                                <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, background: statColors.bg, color: statColors.text, marginTop: 2, textTransform: "uppercase" }}>
                                                  {txStatus}
                                                </span>
                                              </div>
                                              <button onClick={() => navigate("/manualentry", { state: { transaction: tx } })}
                                                style={{ background: "#FFF", border: "1px solid #FFF5F0", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: colors.primaryBlue }} title="Edit Transaction">
                                                <Pencil size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 12, color: colors.textLight, textAlign: "right" }}>
            Showing {filtered.length} of {groupedItems.filter(item => item.category === activeTabKey).length} {labelPlural}s &middot;
            Purchased: <strong>{totalPurchased.toLocaleString("en-IN")}</strong> &middot;
            Used: <strong>{totalUsed.toLocaleString("en-IN")}</strong>
          </div>
        )}
      </div>
    </div>
  );
}