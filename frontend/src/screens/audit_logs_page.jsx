import { useState, useEffect, useCallback } from "react";
import { transactionAPI, projectAPI, authAPI } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Lock, Search, ClipboardList, AlertTriangle } from "lucide-react";
import ModuleTour from "../components/ModuleTour";

const ITEMS_PER_PAGE = 15;

const ACTION_META = {
  create:   { icon: "+", bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0", label: "Created" },
  update:   { icon: "~", bg: "#FFF5F0", color: "#EA580C", border: "#FDE8D8", label: "Updated" },
  delete:   { icon: "×", bg: "#fee2e2", color: "#dc2626", border: "#fca5a5", label: "Deleted" },
  approve:  { icon: "✓", bg: "#ccfbf1", color: "#0d9488", border: "#99f6e4", label: "Approved" },
};

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

    if (t.status === "approved" || t.status === "rejected") {
      logs.push({
        id: `tx-approve-${t._id}`,
        action: "approve",
        description: `${userName} ${t.status === "approved" ? "approved" : "rejected"} transaction "${t.title || "Untitled"}"`,
        detail: projectName ? `Project: ${projectName}` : "",
        timestamp: date,
        user: userName,
      });
    }

    if (t.createdAt && t.createdAt !== date) {
      logs.push({
        id: `tx-create-${t._id}`,
        action: "create",
        description: `${userName} created transaction "${t.title || "Untitled"}"`,
        detail: `${t.type || "General"}${projectName ? " · " + projectName : ""}`,
        timestamp: t.createdAt,
        user: userName,
      });
    }

    if (t.updatedAt && t.updatedAt !== t.createdAt) {
      logs.push({
        id: `tx-update-${t._id}`,
        action: "update",
        description: `${userName} updated transaction "${t.title || "Untitled"}"`,
        detail: projectName ? `Project: ${projectName}` : "",
        timestamp: t.updatedAt,
        user: userName,
      });
    }
  });

  (projects || []).forEach((p) => {
    const userName = resolveUser(p.createdBy || p.user);
    const projectName = p.projectName || p.name || "Untitled Project";
    if (p.createdAt) {
      logs.push({
        id: `proj-create-${p._id}`,
        action: "create",
        description: `${userName} created project "${projectName}"`,
        detail: p.status ? `Status: ${p.status}` : "",
        timestamp: p.createdAt,
        user: userName,
      });
    }

    if (p.updatedAt && p.updatedAt !== p.createdAt) {
      logs.push({
        id: `proj-update-${p._id}`,
        action: "update",
        description: `${userName} updated project "${projectName}"`,
        detail: "",
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("resize", onResize);
    };
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

  if (!isAdmin) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100vh",
          fontFamily: "'Segoe UI', sans-serif",
          background: "#f7f7f8",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid #ebebeb",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            padding: "60px 48px",
            textAlign: "center",
            maxWidth: 420,
            width: "90%",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#fff7ed",
              border: "2px solid #fed7aa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 32,
            }}
          >
            <Lock size={28} />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "#1a1a1a",
              marginBottom: 10,
            }}
          >
            Admin Access Only
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#888",
              lineHeight: 1.6,
              marginBottom: 8,
            }}
          >
            You don't have permission to view the Audit Logs.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#aaa",
            }}
          >
            Signed in as <strong style={{ color: "#555" }}>{user?.name || user?.email || "Unknown"}</strong> ({user?.role || "N/A"})
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
        fontFamily: "'Segoe UI', sans-serif",
        background: "#f7f7f8",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AuditLogs" />
      {/* ── Top Bar ── */}
      <div className="tour-header"
        style={{
          flexShrink: 0,
          background: "#fff",
          borderBottom: "1px solid #ebebeb",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>
            Audit Logs
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>
            Recent system activity across projects, transactions, and users.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          style={{
            padding: "10px 16px",
            background: "#f5f5f5",
            color: "#555",
            border: "1px solid #e5e5e5",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Error Banner */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ color: "#dc2626", fontSize: 14, fontWeight: 500 }}>
              <AlertTriangle size={14} /> {error}
            </span>
            <button
              onClick={fetchLogs}
              style={{
                padding: "6px 14px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="tour-kpis"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          <div
            style={{
              background: "#dcfce7",
              borderRadius: 14,
              padding: "18px 22px",
              border: "1px solid #bbf7d0",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", letterSpacing: "0.08em", marginBottom: 8 }}>
              CREATES
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#15803d" }}>{counts.create}</div>
          </div>
          <div
            style={{
              background: "#FFF5F0",
              borderRadius: 14,
              padding: "18px 22px",
              border: "1px solid #FDE8D8",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", letterSpacing: "0.08em", marginBottom: 8 }}>
              UPDATES
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#F97316" }}>{counts.update}</div>
          </div>
          <div
            style={{
              background: "#fee2e2",
              borderRadius: 14,
              padding: "18px 22px",
              border: "1px solid #fca5a5",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", letterSpacing: "0.08em", marginBottom: 8 }}>
              DELETES
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#b91c1c" }}>{counts.delete}</div>
          </div>
          <div
            style={{
              background: "#ccfbf1",
              borderRadius: 14,
              padding: "18px 22px",
              border: "1px solid #99f6e4",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", letterSpacing: "0.08em", marginBottom: 8 }}>
              APPROVALS
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#0f766e" }}>{counts.approve}</div>
          </div>
        </div>

        {/* Filter + Search Row */}
        <div className="tour-filters"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {["All", "Creates", "Updates", "Deletes", "Approvals"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 20,
                  border: "1.5px solid",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: filter === f ? "#ea580c" : "#fff",
                  color: filter === f ? "#fff" : "#555",
                  borderColor: filter === f ? "#ea580c" : "#e5e5e5",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#fff",
              border: "1px solid #e5e5e5",
              borderRadius: 10,
              padding: "9px 14px",
              gap: 8,
            }}
          >
            <Search size={16} color="#aaa" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              style={{
                border: "none",
                outline: "none",
                fontSize: 13,
                color: "#555",
                background: "transparent",
                width: isMobile ? 130 : 220,
              }}
            />
          </div>
        </div>

        {/* Log List Card */}
        <div className="tour-log-list"
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #ebebeb",
            overflow: "hidden",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          }}
        >
          {loading ? (
            /* ── Loading State ── */
            <div
              style={{
                padding: 60,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: "3px solid #e5e5e5",
                  borderTopColor: "#ea580c",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ fontSize: 14, color: "#888" }}>Loading audit logs…</span>
            </div>
          ) : filtered.length === 0 ? (
            /* ── Empty State ── */
            <div
              style={{
                padding: 60,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                <ClipboardList size={24} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>
                No audit logs found
              </div>
              <div style={{ fontSize: 13, color: "#888", maxWidth: 360 }}>
                {search
                  ? `No results for "${search}". Try a different search term.`
                  : filter !== "All"
                    ? `No ${filter.toLowerCase()} activity recorded yet.`
                    : "System activity will appear here as users interact with the platform."
                }
              </div>
            </div>
          ) : (
            /* ── Log Entries ── */
            <div style={{ padding: isMobile ? 12 : "4px 0" }}>
              {paginated.map((log, idx) => {
                const meta = ACTION_META[log.action] || ACTION_META.update;
                return (
                  <div
                    key={log.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: isMobile ? 12 : 16,
                      padding: isMobile ? "14px 14px" : "16px 24px",
                      borderBottom: idx < paginated.length - 1 ? "1px solid #f5f5f5" : "none",
                      transition: "background 0.1s",
                      cursor: "default",
                    }}
                    className="hover-bg-subtle"
                  >
                    {/* Action Icon */}
                    <div
                      style={{
                        width: isMobile ? 36 : 40,
                        height: isMobile ? 36 : 40,
                        borderRadius: 10,
                        background: meta.bg,
                        border: `1px solid ${meta.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isMobile ? 16 : 18,
                        fontWeight: 800,
                        color: meta.color,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: isMobile ? 13 : 14,
                          fontWeight: 500,
                          color: "#1a1a1a",
                          lineHeight: 1.5,
                          marginBottom: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {log.description}
                      </div>
                      {log.detail && (
                        <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>
                          {log.detail}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            background: meta.bg,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                        <span style={{ fontSize: 12, color: "#888" }}>
                          by {log.user}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div
                      style={{
                        fontSize: 12,
                        color: "#aaa",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        paddingTop: 2,
                      }}
                    >
                      {relativeTime(log.timestamp)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Pagination ── */}
          {filtered.length > 0 && (
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 13, color: "#888" }}>{paginationLabel()}</span>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #e5e5e5",
                    background: "#fff",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    color: page === 1 ? "#ccc" : "#555",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ‹
                </button>
                {getPages().map((p, i) => (
                  <button
                    key={i}
                    onClick={() => typeof p === "number" && setPage(p)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid",
                      fontSize: 13,
                      cursor: typeof p === "number" ? "pointer" : "default",
                      fontWeight: 600,
                      borderColor: page === p ? "#ea580c" : "#e5e5e5",
                      background: page === p ? "#ea580c" : "#fff",
                      color: page === p ? "#fff" : "#555",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #e5e5e5",
                    background: "#fff",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    color: page === totalPages ? "#ccc" : "#555",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
