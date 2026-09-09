import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { transactionAPI } from "../api";
import useTransactionStore from "../stores/transactionStore";
import perfLogger from "../utils/performanceLogger";
import { Toast, ConfirmDialog } from "../components/Toast";
import { Card, Badge, Button, EmptyState } from "../components/ui";
import ModuleTour from "../components/ModuleTour";
import { colors, radius, shadows, typography, gradients } from "../styles/designTokens";
import {
  Search,
  Plus,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Trash2,
  Filter,
  Calendar,
  Clock,
  Briefcase,
  Layers,
  Wrench,
  Package,
  TrendingUp,
  X,
  Users,
  HelpCircle
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

const TYPE_STYLES = {
  Materials: { bg: colors.primaryLight, color: colors.primary, label: "Materials", icon: Package },
  Wages:     { bg: colors.successLight, color: colors.success, label: "Labour", icon: Users },
  Expense:   { bg: colors.warningLight, color: colors.warning, label: "Equipment", icon: Wrench },
  Income:    { bg: "#FFF5F0", color: "#EA580C", label: "Income", icon: TrendingUp },
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

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

function formatTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  const h = dt.getHours(), m = String(dt.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

export default function TransactionLog() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { transactions, fetchTransactions: storeFetchTransactions } = useTransactionStore();

  const [loading, setLoading] = useState(transactions.length === 0);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(() => searchParams.get("type") || "All");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const [confirmDlg, setConfirmDlg] = useState(null);
  const clearToast = useCallback(() => setToast({ msg: "", type: "info" }), []);

  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-header', content: 'View a detailed log of all project transactions.', disableBeacon: true },
    { target: '.tour-stats', content: 'See a quick summary of income, expenses, and net balance.' },
    { target: '.tour-filters', content: 'Search and filter transactions by type.' },
    { target: '.tour-list', content: 'Click on any transaction to see full details.' }
  ];

  useEffect(() => {
    perfLogger.endRoute('/transaction');
    perfLogger.logMount('TransactionLog');
  }, []);

  const fetchTransactions = useCallback(async (force = false) => {
    if (transactions.length === 0) setLoading(true);
    setError("");
    try {
      await storeFetchTransactions({}, force);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [transactions.length, storeFetchTransactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = (id) => {
    const tx = transactions.find(t => t._id === id);
    setConfirmDlg({
      message: `Delete "${tx?.title || "this entry"}"?`, danger: true, confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirmDlg(null);
        try { await transactionAPI.delete(id); fetchTransactions(); setToast({ msg: "Deleted.", type: "success" }); }
        catch { setToast({ msg: "Delete failed.", type: "error" }); }
      },
    });
  };

  const filtered = transactions.filter(t => {
    const q = search.toLowerCase();
    const desc = (t.title || "").toLowerCase();
    const proj = resolveProjectName(t.project).toLowerCase();
    const matchSearch = !q || desc.includes(q) || proj.includes(q);
    if (filter === "All") return matchSearch;
    return matchSearch && t.type === filter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const income = transactions.filter(t => t.type === "Income").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = transactions.filter(t => t.type !== "Income").reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto', fontFamily: typography.fontFamily, animation: 'fadeUp 300ms ease' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="TransactionLog" />
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />
      {confirmDlg && <ConfirmDialog message={confirmDlg.message} danger={confirmDlg.danger} confirmLabel={confirmDlg.confirmLabel} onConfirm={confirmDlg.onConfirm} onCancel={() => setConfirmDlg(null)} />}

      <div className="tour-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
              Transaction Log
            </h1>
            <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
              <HelpCircle size={16} color={colors.textLight} />
            </button>
          </div>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0 }}>View and manage all transactions across construction projects</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" onClick={fetchTransactions}>
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Refresh
          </Button>
          <Button variant="primary" size="md" onClick={() => navigate("/manualentry")}>
            <Plus size={16} style={{ marginRight: 4 }} /> New Entry
          </Button>
        </div>
      </div>

      <div className="tour-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        {[
          { label: 'Total Income', value: income, color: colors.success, bg: colors.successLight, icon: ArrowUpRight },
          { label: 'Total Expenses', value: expenses, color: colors.danger, bg: colors.dangerLight, icon: ArrowDownRight },
          { label: 'Net Balance', value: income - expenses, color: income - expenses >= 0 ? colors.primary : colors.danger, bg: income - expenses >= 0 ? colors.primaryLight : colors.dangerLight, icon: DollarSign },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card key={idx} style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: item.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  color: item.color,
                }}>
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.textSecondary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: item.label === 'Net Balance' ? colors.textPrimary : item.color, letterSpacing: '-0.02em' }}>
                    ₹{Math.abs(item.value).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="tour-filters" style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', background: colors.card,
          border: `1px solid ${colors.border}`, borderRadius: 10,
          padding: '0 14px', height: 42, gap: 10, minWidth: 320,
          transition: 'all 150ms ease',
        }}
          onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Search size={16} color={colors.textTertiary} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search transactions, projects, items..."
            style={{ border: 'none', outline: 'none', fontSize: 14, color: colors.textPrimary, background: 'transparent', width: '100%', fontFamily: typography.fontFamily }}
          />
          {search && (
            <X size={14} color={colors.textTertiary} style={{ cursor: 'pointer' }} onClick={() => { setSearch(''); setPage(1); }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, background: '#E6EAF2', padding: 4, borderRadius: 10 }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13,
                background: filter === f.value ? colors.card : 'transparent',
                color: filter === f.value ? colors.primary : colors.textSecondary,
                transition: 'all 150ms ease', fontFamily: typography.fontFamily,
                boxShadow: filter === f.value ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}33`, borderRadius: 12, padding: '14px 20px', color: colors.danger, fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, fontWeight: 500 }}>{error}</span>
          <Button variant="danger" size="sm" onClick={fetchTransactions}>Retry</Button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${colors.border}`, borderTopColor: colors.primary, animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: colors.textSecondary }}>Loading transactions...</div>
        </div>
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={<DollarSign size={24} />}
          title={transactions.length === 0 ? "No transactions found" : "No matches found"}
          description={transactions.length === 0 ? 'Create your first manual or voice transaction to populate this list.' : 'Try adjusting your search terms or filters.'}
          actionLabel={transactions.length === 0 ? "Add Transaction" : undefined}
          onAction={() => navigate("/manualentry")}
        />
      ) : (
        <div className="tour-list">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paginated.map((t, i) => {
              const st = TYPE_STYLES[t.type] || TYPE_STYLES.Expense;
              const pName = resolveProjectName(t.project) || "";
              const isPositive = t.type === "Income";
              const TypeIcon = st.icon || DollarSign;

              return (
                <div key={t._id || i} className="tx-row" style={{
                  display: 'flex', alignItems: 'center', gap: 18,
                  background: colors.card, borderRadius: 14,
                  border: `1px solid ${colors.border}`, padding: '16px 20px',
                  cursor: 'pointer',
                }}
                  onClick={() => navigate("/entry-detail", { state: { entry: t } })}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: st.color,
                  }}>
                    <TypeIcon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{t.title || "Untitled"}</span>
                        {pName && (
                          <span style={{
                            fontSize: 12, color: colors.textSecondary, fontWeight: 500,
                            background: colors.subtle, padding: '2px 8px', borderRadius: 6,
                            display: 'inline-flex', alignItems: 'center', gap: 4
                          }}>
                            <Briefcase size={11} color={colors.textTertiary} /> {pName}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Badge variant={t.type === 'Wages' ? 'success' : t.type === 'Expense' ? 'warning' : t.type === 'Income' ? 'info' : 'default'} size="sm">
                          {st.label}
                        </Badge>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(t._id); }}
                          className="tx-delete-btn"
                          style={{
                            color: colors.textTertiary, cursor: 'pointer', display: 'flex', padding: 6,
                            background: 'none', border: `1px solid ${colors.border}`, borderRadius: 8,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} color={colors.textTertiary} />
                        {t.date ? `${formatDate(t.date)}` : ''}
                        <span style={{ color: colors.border }}>&middot;</span>
                        <Clock size={12} color={colors.textTertiary} />
                        {t.date ? `${formatTime(t.date)}` : ''}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: isPositive ? colors.success : colors.textPrimary }}>
                        {isPositive ? '+' : '-'}₹{(t.amount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length > ITEMS_PER_PAGE && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, fontSize: 13, color: colors.textSecondary }}>
              <span style={{ fontWeight: 500 }}>Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="pagination-btn"
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: `1px solid ${colors.border}`,
                    background: colors.card, color: page <= 1 ? colors.textTertiary : colors.textPrimary,
                    cursor: page <= 1 ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: typography.fontFamily,
                  }}
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  let p;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i === 4 ? totalPages : i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = [1, "...", page, "...", totalPages][i];
                  return typeof p === "number" ? (
                    <button key={p} onClick={() => setPage(p)}
                      className={p !== page ? "pagination-btn" : ""}
                      style={{
                        padding: '8px 16px', borderRadius: 8,
                        background: p === page ? gradients.primaryGradient : colors.card,
                        color: p === page ? '#fff' : colors.textPrimary,
                        fontWeight: 700, fontSize: 13, cursor: 'pointer', minWidth: 38, fontFamily: typography.fontFamily,
                        boxShadow: p === page ? '0 2px 8px rgba(249, 115, 22, 0.15)' : 'none',
                        border: p === page ? 'none' : `1px solid ${colors.border}`,
                      }}
                    >
                      {p}
                    </button>
                  ) : <span key={`e${i}`} style={{ padding: '8px 6px', color: colors.textTertiary, display: 'flex', alignItems: 'center' }}>{p}</span>;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="pagination-btn"
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: `1px solid ${colors.border}`,
                    background: colors.card, color: page >= totalPages ? colors.textTertiary : colors.textPrimary,
                    cursor: page >= totalPages ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: typography.fontFamily,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}