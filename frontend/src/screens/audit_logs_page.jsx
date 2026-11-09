import { useState, useEffect, useCallback } from "react";
import { transactionAPI, projectAPI, authAPI } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Lock, Search, ClipboardList, RefreshCw, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import ModuleTour from "../components/ModuleTour";
import BtHero from "../components/ui/BtHero";
import BtPageHeader from "../components/ui/BtPageHeader";
import BtSheet from "../components/ui/BtSheet";
import BtCard from "../components/ui/BtCard";
import BtBadge from "../components/ui/BtBadge";
import BtButton from "../components/ui/BtButton";
import BtIconButton from "../components/ui/BtIconButton";
import BtChip from "../components/ui/BtChip";
import BtEmpty, { BtErrorCard } from "../components/ui/BtEmpty";
import BtSkeleton from "../components/ui/BtSkeleton";
import BtField from "../components/ui/BtField";

const ITEMS_PER_PAGE = 15;

const ACTION_META = {
  create:  { tone: "success",  label: "Created" },
  update:  { tone: "warning",  label: "Updated" },
  delete:  { tone: "danger",   label: "Deleted" },
  approve: { tone: "material", label: "Approved" },
};

const KPI_META = [
  { key: "create", label: "Creates", color: "var(--status-success)" },
  { key: "update", label: "Updates", color: "var(--status-warning)" },
  { key: "delete", label: "Deletes", color: "var(--status-danger)" },
  { key: "approve", label: "Approvals", color: "var(--type-material)" },
];

const FILTERS = ["All", "Creates", "Updates", "Deletes", "Approvals"];

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildLogs(transactions, projects, users) {
  const userMap = {};
  (users || []).forEach((u) => {
    userMap[u._id || u.id] = u.name || u.email || "Unknown";
  });

  const resolveUser = (obj) => {
    if (!obj) return "System";
    if (typeof obj === "string") return userMap[obj] || "Unknown User";
    return obj.name || obj.email || "Unknown User";
  };

  const resolveProject = (obj) => {
    if (!obj) return "";
    if (typeof obj === "string") {
      const found = (projects || []).find((p) => p._id === obj);
      return found ? found.projectName || found.name || "" : "";
    }
    return obj.projectName || obj.name || "";
  };

  const logs = [];

  (transactions || []).forEach((t) => {
    const userName = resolveUser(t.createdBy || t.user);
    const projectName = resolveProject(t.project);
    const date = t.updatedAt || t.createdAt || t.date;
    const amountStr = t.amount ? `₹${Number(t.amount).toLocaleString('en-IN')}` : '';
    const details = [
      t.type || "General",
      projectName ? `Project: ${projectName}` : "",
      amountStr,
      t.category ? `Category: ${t.category}` : "",
      t.vendorName ? `Vendor: ${t.vendorName}` : ""
    ].filter(Boolean).join(" • ");

    if (t.status === "approved" || t.status === "rejected") {
      logs.push({
        id: `tx-approve-${t._id}`,
        action: "approve",
        description: `${userName} ${t.status === "approved" ? "approved" : "rejected"} transaction "${t.title || "Untitled"}"`,
        detail: details,
        timestamp: date,
        user: userName,
      });
    }

    if (t.createdAt && t.createdAt !== date) {
      logs.push({
        id: `tx-create-${t._id}`,
        action: "create",
        description: `${userName} created transaction "${t.title || "Untitled"}"`,
        detail: details,
        timestamp: t.createdAt,
        user: userName,
      });
    }

    if (t.updatedAt && t.updatedAt !== t.createdAt) {
      logs.push({
        id: `tx-update-${t._id}`,
        action: "update",
        description: `${userName} updated transaction "${t.title || "Untitled"}"`,
        detail: details,
        timestamp: t.updatedAt,
        user: userName,
      });
    }
  });

  (projects || []).forEach((p) => {
    const userName = resolveUser(p.createdBy || p.user);
    const projectName = p.projectName || p.name || "Untitled Project";
    
    const budgetValue = typeof p.budget === "object" && p.budget !== null ? p.budget.total : p.budget;
    const details = [
      p.status ? `Status: ${p.status}` : "",
      budgetValue ? `Budget: ₹${Number(budgetValue).toLocaleString('en-IN')}` : "",
      p.location ? `Loc: ${p.location}` : ""
    ].filter(Boolean).join(" • ");

    if (p.createdAt) {
      logs.push({
        id: `proj-create-${p._id}`,
        action: "create",
        description: `${userName} created project "${projectName}"`,
        detail: details,
        timestamp: p.createdAt,
        user: userName,
      });
    }

    if (p.updatedAt && p.updatedAt !== p.createdAt) {
      logs.push({
        id: `proj-update-${p._id}`,
        action: "update",
        description: `${userName} updated project "${projectName}"`,
        detail: details,
        timestamp: p.updatedAt,
        user: userName,
      });
    }
  });

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return logs;
}

export default function AuditLogsPage() {
  const { user, isAdmin } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [runTour, setRunTour] = useState(false);

  const tourSteps = [
    { target: '.tour-header', content: 'View detailed system activity across projects, transactions, and users.', disableBeacon: true },
    { target: '.tour-kpis', content: 'Quick summary of recent action counts.' },
    { target: '.tour-filters', content: 'Filter logs by action type or search for specific keywords.' },
    { target: '.tour-log-list', content: 'The chronological list of all audit events.' }
  ];

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      transactionAPI.getAll(),
      projectAPI.getAll(),
      authAPI.listUsers(),
    ])
      .then(([txRes, projRes, usersRes]) => {
        const txData = txRes.data.transactions || txRes.data || [];
        const projData = projRes.data.projects || projRes.data || [];
        const userData = usersRes.data.users || usersRes.data || [];
        setLogs(buildLogs(txData, projData, userData));
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ||
          err?.friendlyMessage ||
          "Failed to load audit logs. Please try again."
        );
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLogs();
    const onFocus = () => fetchLogs();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchLogs]);

  const filtered = logs.filter((log) => {
    const matchSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase());
    if (filter === "All") return matchSearch;
    if (filter === "Creates") return matchSearch && log.action === "create";
    if (filter === "Updates") return matchSearch && log.action === "update";
    if (filter === "Deletes") return matchSearch && log.action === "delete";
    if (filter === "Approvals") return matchSearch && log.action === "approve";
    return matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const getPages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "...", totalPages];
    if (page >= totalPages - 2) return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page, "...", totalPages];
  };

  const paginationLabel = () => {
    if (filtered.length === 0) return "Showing 0 entries";
    const from = (page - 1) * ITEMS_PER_PAGE + 1;
    const to = Math.min(page * ITEMS_PER_PAGE, filtered.length);
    return `Showing ${from}–${to} of ${filtered.length} entries`;
  };

  const counts = {
    create: logs.filter((l) => l.action === "create").length,
    update: logs.filter((l) => l.action === "update").length,
    delete: logs.filter((l) => l.action === "delete").length,
    approve: logs.filter((l) => l.action === "approve").length,
  };

  const clearFilters = () => { setFilter("All"); setSearch(""); };

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ground)" }}>
        <BtHero>
          <BtPageHeader
            eyebrow="Security and audit trail"
            title="Audit Logs"
            subtitle="Recent system activity across projects, transactions and users."
          />
        </BtHero>
        <BtSheet overlap={26} padding="28px 32px 64px">
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <BtCard padding={0}>
              <BtEmpty
                icon={Lock}
                title="Admin access only"
                message={`You don't have permission to view the audit logs. Signed in as ${user?.name || user?.email || "Unknown"} (${user?.role || "N/A"}).`}
              />
            </BtCard>
          </div>
        </BtSheet>
      </div>
    );
  }

  const showSkeleton = loading && logs.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--ground)" }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AuditLogs" />

      <BtHero>
        <div className="tour-header">
          <BtPageHeader
            eyebrow="Security and audit trail"
            title="Audit Logs"
            subtitle="Recent system activity across projects, transactions and users."
            actions={
              <>
                <BtIconButton onDark icon={HelpCircle} label="Page tour" onClick={() => setRunTour(true)} />
                <BtButton variant="onDark" size="small" icon={RefreshCw} loading={loading} onClick={fetchLogs}>
                  Refresh
                </BtButton>
              </>
            }
          />
        </div>
      </BtHero>

      <BtSheet overlap={26} padding="28px 32px 64px">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {error && <BtErrorCard title="Couldn't load audit logs" message={error} onRetry={fetchLogs} />}

          {/* KPIs */}
          <div className="tour-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
            {KPI_META.map((k) => (
              <BtCard key={k.key} padding="16px 20px">
                <div className="bt-eyebrow" style={{ color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: k.color }} />
                  {k.label}
                </div>
                <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)", marginTop: 6 }}>
                  {counts[k.key]}
                </div>
              </BtCard>
            ))}
          </div>

          {/* Filters */}
          <div className="tour-filters" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div role="group" aria-label="Filter by action" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FILTERS.map((f) => (
                <BtChip key={f} label={f} selected={filter === f} aria-pressed={filter === f} onClick={() => setFilter(f)} style={{ height: 40 }} />
              ))}
            </div>
            <div style={{ width: 280, maxWidth: "100%" }}>
              <BtField
                size="compact"
                icon={Search}
                type="search"
                aria-label="Search logs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs"
              />
            </div>
          </div>

          {/* Table */}
          <BtCard padding={0} className="tour-log-list" style={{ overflowX: "auto" }}>
            {showSkeleton ? (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2, 3, 4, 5].map((i) => <BtSkeleton key={i} height="44px" />)}
              </div>
            ) : filtered.length === 0 ? (
              <BtEmpty
                icon={ClipboardList}
                title="No audit logs found"
                message={
                  search
                    ? `No results for "${search}". Try a different search term.`
                    : filter !== "All"
                      ? `No ${filter.toLowerCase()} activity recorded yet.`
                      : "System activity will appear here as users interact with the platform."
                }
                actionLabel={search || filter !== "All" ? "Clear filters" : undefined}
                onAction={search || filter !== "All" ? clearFilters : undefined}
              />
            ) : (
              <table className="bt-table" style={{ minWidth: 620 }}>
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>When</th>
                    <th style={{ width: 120 }}>Action</th>
                    <th>Activity</th>
                    <th style={{ width: 170 }}>By</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log) => {
                    const meta = ACTION_META[log.action] || ACTION_META.update;
                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: "nowrap", color: "var(--ink-2)" }}>{relativeTime(log.timestamp)}</td>
                        <td><BtBadge tone={meta.tone} label={meta.label} showDot={false} /></td>
                        <td>
                          <div style={{ fontWeight: 500, lineHeight: 1.45, overflowWrap: "anywhere" }}>{log.description}</div>
                          {log.detail && <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2, overflowWrap: "anywhere" }}>{log.detail}</div>}
                        </td>
                        <td style={{ color: "var(--ink-2)" }}>{log.user}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {filtered.length > 0 && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{paginationLabel()}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <BtIconButton icon={ChevronLeft} label="Previous page" size={40} disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
                  {getPages().map((p, i) =>
                    typeof p === "number" ? (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPage(p)}
                        aria-label={`Page ${p}`}
                        aria-current={page === p ? "page" : undefined}
                        style={{
                          minWidth: 40, height: 40, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
                          fontFamily: "var(--font-ui)",
                          border: page === p ? "1px solid var(--ink)" : "1px solid var(--line)",
                          background: page === p ? "var(--ink)" : "var(--card)",
                          color: page === p ? "#FFFFFF" : "var(--ink-2)",
                        }}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={i} style={{ minWidth: 24, textAlign: "center", color: "var(--ink-3)" }}>{p}</span>
                    )
                  )}
                  <BtIconButton icon={ChevronRight} label="Next page" size={40} disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
                </div>
              </div>
            )}
          </BtCard>
        </div>
      </BtSheet>
    </div>
  );
}
