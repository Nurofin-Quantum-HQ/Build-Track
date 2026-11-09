import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { transactionAPI } from "../api";
import useTransactionStore from "../stores/transactionStore";
import { useAuth } from "../contexts/AuthContext";
import perfLogger from "../utils/performanceLogger";
import ModuleTour from "../components/ModuleTour";
import BtHero from "../components/ui/BtHero";
import BtSheet from "../components/ui/BtSheet";
import BtPageHeader from "../components/ui/BtPageHeader";
import BtButton from "../components/ui/BtButton";
import BtIconButton from "../components/ui/BtIconButton";
import BtCard from "../components/ui/BtCard";
import BtBadge from "../components/ui/BtBadge";
import BtChip from "../components/ui/BtChip";
import BtField from "../components/ui/BtField";
import BtEmpty, { BtErrorCard } from "../components/ui/BtEmpty";
import BtSkeleton from "../components/ui/BtSkeleton";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import btToast from "../components/ui/BtToast";
import { formatInr } from "../components/ui/BtCountUp";
import {
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Trash2,
  Clock,
  Briefcase,
  Wrench,
  Package,
  TrendingUp,
  Users,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Scale,
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

const TYPE_STYLES = {
  Materials: { tone: "material", label: "Material", color: "var(--type-material)", bg: "var(--type-material-soft)", icon: Package },
  Wages: { tone: "labour", label: "Labour", color: "var(--type-labour)", bg: "var(--type-labour-soft)", icon: Users },
  Expense: { tone: "equipment", label: "Equipment", color: "var(--type-equipment)", bg: "var(--type-equipment-soft)", icon: Wrench },
  Income: { tone: "income", label: "Income", color: "var(--type-income)", bg: "var(--type-income-soft)", icon: TrendingUp },
};

const FILTERS = [
  { label: "All", value: "All" },
  { label: "Materials", value: "Materials" },
  { label: "Labour", value: "Wages" },
  { label: "Equipment", value: "Expense" },
  { label: "Income", value: "Income" },
];

function resolveProjectName(project) {
  if (!project) return "";
  if (typeof project === "string") return project;
  return project.projectName || project.name || "";
}

function toDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function dayKey(d) {
  const dt = toDate(d);
  if (!dt) return "unknown";
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
}

function dayLabel(d) {
  const dt = toDate(d);
  if (!dt) return "No date";
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(dt)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(dStr, rawTxId) {
  let d = null;
  if (dStr) {
    d = new Date(dStr);
    if (!isNaN(d.getTime()) && d.toISOString().endsWith("T00:00:00.000Z") && rawTxId && rawTxId.length === 24) {
      d = new Date(parseInt(rawTxId.substring(0, 8), 16) * 1000);
    }
  } else if (rawTxId && rawTxId.length === 24) {
    d = new Date(parseInt(rawTxId.substring(0, 8), 16) * 1000);
  }
  if (!d || isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

export default function TransactionLog() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [searchParams] = useSearchParams();
  const { transactions, fetchTransactions: storeFetchTransactions } = useTransactionStore();

  const [loading, setLoading] = useState(transactions.length === 0);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(() => searchParams.get("type") || "All");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [runTour, setRunTour] = useState(false);

  // The server only accepts deletes from Admins or users holding `delete_entry`.
  const canDelete = (user?.role || "").toLowerCase() === "admin" || can("delete_entry");

  const tourSteps = [
    { target: ".tour-header", content: "View a detailed log of all project transactions.", disableBeacon: true },
    { target: ".tour-stats", content: "See a quick summary of income, expenses, and net balance." },
    { target: ".tour-filters", content: "Search and filter transactions by type." },
    { target: ".tour-list", content: "Click on any transaction to see full details." },
  ];

  useEffect(() => {
    perfLogger.endRoute("/transaction");
    perfLogger.logMount("TransactionLog");
  }, []);

  const fetchTransactions = useCallback(
    async (force = false) => {
      if (transactions.length === 0) setLoading(true);
      setError("");
      try {
        await storeFetchTransactions({}, force);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    },
    [transactions.length, storeFetchTransactions]
  );

  useEffect(() => {
    fetchTransactions();
    const handleFocus = () => {
      fetchTransactions(true);
    };
    window.addEventListener("focus", handleFocus);
    const interval = setInterval(() => {
      fetchTransactions(true);
    }, 30000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [fetchTransactions]);

  const handleDelete = (id) => {
    const tx = transactions.find((t) => t._id === id);
    setConfirmDlg({
      message: `Delete "${tx?.title || "this entry"}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          await transactionAPI.delete(id);
          fetchTransactions(true);
          btToast("Entry deleted");
        } catch {
          btToast("Could not delete this entry", { error: true });
        }
      },
    });
  };

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        const q = search.toLowerCase();
        const desc = (t.title || "").toLowerCase();
        const proj = resolveProjectName(t.project).toLowerCase();
        const matchSearch = !q || desc.includes(q) || proj.includes(q);
        if (filter === "All") return matchSearch;
        return matchSearch && t.type === filter;
      }),
    [transactions, search, filter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const groups = useMemo(() => {
    const out = [];
    for (const t of paginated) {
      const key = dayKey(t.date);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(t);
      else out.push({ key, label: dayLabel(t.date), items: [t] });
    }
    return out;
  }, [paginated]);

  const income = transactions.filter((t) => t.type === "Income").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = transactions.filter((t) => t.type !== "Income").reduce((s, t) => s + (t.amount || 0), 0);
  const net = income - expenses;

  const tiles = [
    { label: "Total income", value: formatInr(income, { compact: true }), color: "var(--status-success)", bg: "var(--status-success-soft)", icon: ArrowUpRight },
    { label: "Total expenses", value: formatInr(expenses, { compact: true }), color: "var(--ink)", bg: "var(--fill)", icon: ArrowDownRight },
    {
      label: "Net balance",
      value: `${net < 0 ? "-" : ""}${formatInr(Math.abs(net), { compact: true })}`,
      color: net >= 0 ? "var(--ink)" : "var(--status-danger)",
      bg: net >= 0 ? "var(--accent-soft)" : "var(--status-danger-soft)",
      icon: Scale,
    },
  ];

  const activeFilterLabel = FILTERS.find((f) => f.value === filter)?.label || filter;

  const renderEmpty = () => {
    if (transactions.length === 0) {
      return (
        <BtEmpty
          icon={IndianRupee}
          title="No entries yet"
          message="Add your first entry by hand or by voice and it will appear here."
          actionLabel="Add entry"
          onAction={() => navigate("/manualentry")}
        />
      );
    }
    if (search.trim()) {
      return (
        <BtEmpty
          icon={Search}
          title={`No matches for "${search.trim()}"`}
          message={filter === "All" ? "Try a different title or project name." : `Nothing in ${activeFilterLabel} matches that search.`}
          actionLabel="Clear search"
          onAction={() => {
            setSearch("");
            setPage(1);
          }}
        />
      );
    }
    return (
      <BtEmpty
        icon={IndianRupee}
        title={`No ${activeFilterLabel.toLowerCase()} entries`}
        message={`Nothing has been logged under ${activeFilterLabel} yet.`}
        actionLabel="Show all entries"
        onAction={() => {
          setFilter("All");
          setPage(1);
        }}
      />
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--ground)", fontFamily: "var(--font-ui)", color: "var(--ink)" }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="TransactionLog" />
      <style>{`
        .tx-row {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto 40px;
          grid-template-areas: "icon title amt del" "icon meta badge del";
          column-gap: 14px;
          row-gap: 3px;
          padding: 14px 18px;
          min-height: 72px;
          cursor: pointer;
          align-items: center;
        }
        .tx-row:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
        @media (max-width: 640px) {
          .tx-row {
            grid-template-columns: 44px minmax(0, 1fr) auto auto;
            grid-template-areas: "icon title amt amt" "icon meta badge del";
            column-gap: 10px;
            padding: 12px 14px;
          }
          .tx-row .tx-time { display: none !important; }
        }
      `}</style>
      <ConfirmDialog
        open={Boolean(confirmDlg)}
        danger
        message={confirmDlg?.message}
        confirmLabel="Delete entry"
        onConfirm={confirmDlg?.onConfirm}
        onCancel={() => setConfirmDlg(null)}
      />

      <BtHero>
        <div className="tour-header">
          <BtPageHeader
            eyebrow="Ledger"
            title="Transaction log"
            subtitle="Every expense and income entry across your projects, newest first."
            actions={
              <>
                <BtIconButton icon={HelpCircle} label="Page tour" onDark onClick={() => setRunTour(true)} />
                <BtButton variant="accent" size="small" icon={Plus} onClick={() => navigate("/choose-entry-mode")}>
                  New entry
                </BtButton>
              </>
            }
          />
        </div>
      </BtHero>

      <BtSheet overlap={26} padding="28px 32px 64px">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="tour-stats bt-grid-3" style={{ marginBottom: 24 }}>
            {tiles.map((item) => {
              const Icon = item.icon;
              return (
                <BtCard key={item.label} padding="18px 20px">
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      aria-hidden="true"
                      style={{ width: 44, height: 44, borderRadius: "var(--r-tile)", background: item.bg, color: item.color, display: "grid", placeItems: "center", flexShrink: 0 }}
                    >
                      <Icon size={20} strokeWidth={1.9} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="bt-eyebrow" style={{ color: "var(--ink-3)" }}>{item.label}</div>
                      <div
                        className="tnum"
                        style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: item.color, marginTop: 4, lineHeight: 1.1 }}
                      >
                        {item.value}
                      </div>
                    </div>
                  </div>
                </BtCard>
              );
            })}
          </div>

          <div className="tour-filters" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <BtField
              label="Search entries"
              icon={Search}
              size="compact"
              type="text"
              placeholder="Search by title or project"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ maxWidth: 440 }}
            />
            <div role="tablist" aria-label="Entry type" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FILTERS.map((f) => (
                <BtChip
                  key={f.value}
                  label={f.label}
                  selected={filter === f.value}
                  role="tab"
                  aria-selected={filter === f.value}
                  onClick={() => {
                    setFilter(f.value);
                    setPage(1);
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <BtErrorCard
              title="Couldn't load the log"
              message={error}
              onRetry={() => fetchTransactions(true)}
              style={{ marginBottom: 20 }}
            />
          )}

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-busy="true" aria-label="Loading entries">
              {[0, 1, 2, 3, 4].map((i) => (
                <BtSkeleton key={i} height="76px" borderRadius="var(--r-card)" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            !error && <BtCard padding="8px">{renderEmpty()}</BtCard>
          ) : (
            <div className="tour-list">
              {groups.map((g) => (
                <section key={g.key} aria-label={g.label} style={{ marginBottom: 20 }}>
                  <div className="bt-eyebrow" style={{ color: "var(--ink-3)", margin: "0 4px 8px" }}>{g.label}</div>
                  <BtCard padding="0" style={{ overflow: "hidden" }}>
                    {g.items.map((t, i) => {
                      const st = TYPE_STYLES[t.type] || TYPE_STYLES.Expense;
                      const pName = resolveProjectName(t.project);
                      const isIncome = t.type === "Income";
                      const TypeIcon = st.icon || IndianRupee;
                      const time = formatTime(t.createdAt || t.date, t._id);
                      const open = () => navigate("/entry-detail", { state: { entry: t } });

                      return (
                        <div
                          key={t._id || i}
                          role="button"
                          tabIndex={0}
                          className="bt-hover-row tx-row"
                          onClick={open}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              open();
                            }
                          }}
                          style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}
                        >
                          <div
                            aria-hidden="true"
                            style={{ gridArea: "icon", width: 44, height: 44, borderRadius: "var(--r-tile)", background: st.bg, color: st.color, display: "grid", placeItems: "center", alignSelf: "center" }}
                          >
                            <TypeIcon size={19} strokeWidth={1.9} />
                          </div>

                          <div style={{ gridArea: "title", alignSelf: "end", minWidth: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.title || "Untitled"}
                          </div>
                          <div style={{ gridArea: "meta", alignSelf: "start", minWidth: 0, display: "flex", alignItems: "flex-start", gap: 6, fontSize: 13, color: "var(--ink-3)" }}>
                            <Briefcase size={12} aria-hidden="true" style={{ flexShrink: 0, marginTop: 3 }} />
                            <span style={{ minWidth: 0, color: pName ? "var(--ink-2)" : "var(--ink-3)" }}>{pName || "No project"}</span>
                            {time && (
                              <span className="tx-time" style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, whiteSpace: "nowrap", marginTop: 1 }}>
                                <span aria-hidden="true">&middot;</span>
                                <Clock size={12} aria-hidden="true" />
                                <span>{time}</span>
                              </span>
                            )}
                          </div>

                          <span
                            className="tnum"
                            style={{ gridArea: "amt", justifySelf: "end", alignSelf: "end", fontSize: 16, fontWeight: 700, color: isIncome ? "var(--status-success)" : "var(--ink)", fontFamily: "var(--font-display)" }}
                          >
                            {isIncome ? "+" : "-"}{formatInr(t.amount || 0)}
                          </span>
                          <span style={{ gridArea: "badge", justifySelf: "end", alignSelf: "start" }}>
                            <BtBadge tone={st.tone} label={st.label} />
                          </span>

                          {canDelete && (
                            <span style={{ gridArea: "del", alignSelf: "center" }}>
                              <BtIconButton
                                icon={Trash2}
                                label={`Delete ${t.title || "entry"}`}
                                size={40}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(t._id);
                                }}
                              />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </BtCard>
                </section>
              ))}

              {filtered.length > ITEMS_PER_PAGE && (
                <nav
                  aria-label="Pagination"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 12, flexWrap: "wrap" }}
                >
                  <span style={{ fontSize: 14, color: "var(--ink-2)" }}>
                    Showing <b className="tnum">{(safePage - 1) * ITEMS_PER_PAGE + 1}&ndash;{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</b> of{" "}
                    <b className="tnum">{filtered.length}</b> entries
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <BtButton variant="secondary" size="small" icon={ChevronLeft} disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                      Prev
                    </BtButton>
                    <span className="tnum" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", minWidth: 80, textAlign: "center" }}>
                      Page {safePage} of {totalPages}
                    </span>
                    <BtButton variant="secondary" size="small" trailingIcon={ChevronRight} disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                      Next
                    </BtButton>
                  </div>
                </nav>
              )}
            </div>
          )}
        </div>
      </BtSheet>
    </div>
  );
}
