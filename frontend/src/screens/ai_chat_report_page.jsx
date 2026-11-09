import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { aiDashboardAPI, aiChatAPI } from '../api';
import BtHero from '../components/ui/BtHero';
import BtSheet from '../components/ui/BtSheet';
import BtPageHeader from '../components/ui/BtPageHeader';
import BtButton from '../components/ui/BtButton';
import BtIconButton from '../components/ui/BtIconButton';
import BtCard from '../components/ui/BtCard';
import BtChip from '../components/ui/BtChip';
import BtBadge from '../components/ui/BtBadge';
import BtField from '../components/ui/BtField';
import BtProgress from '../components/ui/BtProgress';
import BtSkeleton from '../components/ui/BtSkeleton';
import BtSectionHeader from '../components/ui/BtSectionHeader';
import { BtErrorCard } from '../components/ui/BtEmpty';
import { formatInr } from '../components/ui/BtCountUp';
import { Toast } from '../components/Toast';
import {
  Sparkles,
  RotateCcw,
  Download,
  Copy,
  Search,
  X,
  SlidersHorizontal,
  AlertTriangle,
  Info,
  Clock,
  Hash,
  IndianRupee,
  Trophy,
  Boxes,
  Scale,
  PackageMinus,
  HardHat,
  Truck,
  CalendarRange,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
} from 'lucide-react';

// Prompt list is a product decision, so the wording stays exactly as it was.
// Each prompt only gets an icon + colour that says what it is about.
const QUICK_PROMPTS = [
  { label: 'Show material usage', Icon: Boxes, tone: 'material' },
  { label: 'Compare project costs', Icon: Scale, tone: 'ink' },
  { label: 'Low stock materials', Icon: PackageMinus, tone: 'warning' },
  { label: 'Labour summary', Icon: HardHat, tone: 'labour' },
  { label: 'Equipment usage', Icon: Truck, tone: 'equipment' },
  { label: 'Monthly spending', Icon: CalendarRange, tone: 'accent' },
];

const TONE = {
  material: { bg: 'var(--type-material-soft)', fg: 'var(--type-material)' },
  labour: { bg: 'var(--type-labour-soft)', fg: 'var(--type-labour)' },
  equipment: { bg: 'var(--type-equipment-soft)', fg: 'var(--type-equipment)' },
  warning: { bg: 'var(--status-warning-soft)', fg: 'var(--status-warning)' },
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)' },
  ink: { bg: 'var(--fill)', fg: 'var(--ink-2)' },
};

const eyebrow = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
};

function friendlyError(err) {
  const isTimeout =
    err.code === 'ECONNABORTED' ||
    err.response?.status === 504 ||
    err.response?.data?.message === 'AI taking too long' ||
    err.response?.data?.error === 'AI taking too long' ||
    err.message?.includes('timeout') ||
    err.message?.includes('taking too long');

  if (isTimeout) return 'The AI is taking longer than usual to answer. Please try again in a moment.';
  const status = err.response?.status;
  if (!err.response || status >= 500) return 'Something went wrong while building your report. Please try again in a moment.';
  return err.response?.data?.message || err.friendlyMessage || err.message || 'An unknown error occurred.';
}

export default function AiChatReportPage() {
  const location = useLocation();

  const projectId = location.state?.projectId || 'all';

  const [state, setState] = useState('initial');
  const [errorMsg, setErrorMsg] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [currentQuery, setCurrentQuery] = useState('');
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'info' });

  const [visibleColumns, setVisibleColumns] = useState([]);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [tempActiveCols, setTempActiveCols] = useState([]);
  const [tempAllCols, setTempAllCols] = useState([]);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const cached = localStorage.getItem('bt_ai_searches_v1');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const clearToast = () => setToast({ msg: '', type: 'info' });

  const addRecentSearch = (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const copy = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...copy].slice(0, 5);
      try {
        localStorage.setItem('bt_ai_searches_v1', JSON.stringify(updated));
      } catch (e) {
        /* storage unavailable: recents just won't persist */
      }
      return updated;
    });
  };

  const submitSearch = async (queryText) => {
    const trimmed = queryText.trim();
    if (!trimmed || state === 'loading') return;

    addRecentSearch(trimmed);
    setCurrentQuery(trimmed);
    setState('loading');
    setErrorMsg('');
    setResult(null);

    try {
      let res;
      try {
        res = await aiChatAPI.ask({
          question: trimmed,
          projectId: projectId
        });
      } catch (chatErr) {
        if (
          chatErr.response?.status === 504 ||
          chatErr.code === 'ECONNABORTED' ||
          chatErr.response?.data?.message === 'AI taking too long' ||
          chatErr.response?.data?.error === 'AI taking too long'
        ) {
          throw chatErr;
        }
        res = await aiDashboardAPI.query({
          query: trimmed,
          projectId: projectId
        });
      }

      let responseData = res.data?.data;
      let table = responseData?.table;

      // Handle direct result from aiReportRoutes.js
      if (!responseData && res.data?.result) {
        const r = res.data.result;
        table = {
          type: r.table_type || 'entries',
          rows: (r.rows || []).map((row, idx) => ({ number: idx + 1, ...row })),
          columns: r.columns || (r.rows?.length ? Object.keys(r.rows[0]) : []),
          total: r.total_amount,
          totalAmount: r.total_amount,
          rowCount: r.rowCount || r.rows?.length || 0
        };
        responseData = {
          summary: r.text || r.summary || '',
          metrics: { totalSpent: r.total_amount },
          table,
          charts: null,
          alerts: [],
          actions: ['Export to CSV', 'Filter by project']
        };
      }

      table = table || {};
      responseData = responseData || {};

      const mappedResult = {
        summary: responseData.summary || '',
        metrics: responseData.metrics || {},
        tableType: table.type || 'none',
        tableRows: table.rows || [],
        columns: (table.columns || []).map(c => String(c)),
        totalAmount: table.total !== undefined && table.total !== null ? Number(table.total) : (table.totalAmount !== undefined && table.totalAmount !== null ? Number(table.totalAmount) : null),
        rowCount: table.rowCount !== undefined && table.rowCount !== null ? Number(table.rowCount) : null,
        actions: responseData.actions || [],
        charts: responseData.charts,
        alerts: responseData.alerts || [],
        projectBreakdown: responseData.charts?.projectBreakdown || []
      };

      setResult(mappedResult);
      setVisibleColumns(mappedResult.columns);
      setState('results');
    } catch (err) {
      console.error(err);
      setErrorMsg(friendlyError(err));
      setState('error');
    }
  };

  const handleReset = () => {
    setQueryInput('');
    setCurrentQuery('');
    setResult(null);
    setState('initial');
  };

  const runPrompt = (text) => {
    setQueryInput(text);
    submitSearch(text);
  };

  const openCustomizeModal = () => {
    if (!result) return;
    const all = result.columns;
    const active = visibleColumns;
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
    setVisibleColumns(tempActiveCols);
    setShowCustomizeModal(false);
    setToast({ msg: "Columns updated!", type: "success" });
  };

  const exportCsv = () => {
    if (!result || result.tableRows.length === 0) return;

    try {
      const csvData = [];

      if (result.tableType === 'inventory') {
        csvData.push(['Material', 'Quantity', 'Unit', 'Status']);
        for (const row of result.tableRows) {
          csvData.push([
            row.name || '',
            row.quantity || 0,
            row.unit || '',
            row.severity || ''
          ]);
        }
      } else {

        const headers = ['#', ...visibleColumns];
        csvData.push(headers);
        for (const row of result.tableRows) {
          const rowData = [row.number || ''];
          for (const col of visibleColumns) {
            rowData.push(row[col] !== undefined ? row[col] : '');
          }
          csvData.push(rowData);
        }
      }

      const csvContent = csvData.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BuildTrack_AI_Export_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({ msg: "CSV exported successfully!", type: "success" });
    } catch (e) {
      console.error(e);
      setToast({ msg: "Failed to export CSV", type: "error" });
    }
  };

  const shareSummary = async () => {
    if (!result) return;
    try {
      const text = `BuildTrack AI Summary: ${currentQuery}\n\n${result.summary}`;
      await navigator.clipboard.writeText(text);
      setToast({ msg: "Executive Summary copied to clipboard!", type: "success" });
    } catch {
      setToast({ msg: "Failed to copy summary", type: "error" });
    }
  };

  const getColWidth = (colName) => {
    if (colName === 'Amount (INR)' || colName === 'Amount' || colName === 'Price') return 120;
    if (colName === 'Description' || colName === 'Project' || colName === 'Material' || colName === 'Name') return 180;
    if (colName === 'Purchased Date' || colName === 'Payment Date' || colName === 'Qty' || colName === 'Quantity') return 110;
    return 130;
  };

  const busy = state === 'loading';
  const canAsk = queryInput.trim().length > 0 && !busy;
  const topProject = result?.projectBreakdown?.length
    ? Math.max(...result.projectBreakdown.map(i => Number(i.totalAmount || i.totalQty || 0)), 1)
    : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--ground)' }}>
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />

      <BtHero>
        <BtPageHeader
          eyebrow="AI assistant"
          title="Ask AI"
          subtitle="Ask about materials, costs or project status and get a short report back."
          actions={
            state !== 'initial' && (
              <BtButton variant="onDark" size="small" icon={RotateCcw} onClick={handleReset}>
                Start over
              </BtButton>
            )
          }
        />
      </BtHero>

      <BtSheet overlap={26} padding="28px 28px 64px" style={{ flex: 1 }}>
        <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── Ask box ── */}
          <BtCard padding="20px" style={{ overflow: 'visible' }}>
            <form
              onSubmit={(e) => { e.preventDefault(); submitSearch(queryInput); }}
              style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}
            >
              <BtField
                label="Your question"
                icon={Sparkles}
                value={queryInput}
                onChange={e => setQueryInput(e.target.value)}
                placeholder="e.g. Cement spend last month"
                suffix={
                  queryInput.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQueryInput('')}
                      aria-label="Clear question"
                      style={{
                        border: 'none', background: 'var(--fill)', color: 'var(--ink-2)', cursor: 'pointer',
                        width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )
                }
                style={{ flex: '1 1 280px' }}
              />
              <BtButton
                type="submit"
                variant="primary"
                icon={Search}
                disabled={!canAsk}
                style={{ flex: '0 0 auto' }}
              >
                Search
              </BtButton>
            </form>
            <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
              {projectId === 'all' ? 'Searches across all of your projects.' : 'Searches the project you opened this from.'}
            </p>
          </BtCard>

          {/* ── Initial: quick insights + recents ── */}
          {state === 'initial' && (
            <>
              <section aria-label="Quick insights">
                <BtSectionHeader title="Quick insights" style={{ padding: '0 2px 12px' }} />
                <div className="bt-grid-3">
                  {QUICK_PROMPTS.map(({ label, Icon, tone }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => runPrompt(label)}
                      className="bt-hover-card"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)',
                        padding: '16px 18px', minHeight: 72, cursor: 'pointer', boxShadow: 'var(--shadow-card)',
                        fontFamily: 'var(--font-ui)', color: 'var(--ink)',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                          background: TONE[tone].bg, color: TONE[tone].fg,
                          display: 'grid', placeItems: 'center',
                        }}
                      >
                        <Icon size={22} strokeWidth={1.85} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
                      <ArrowUpRight size={16} color="var(--ink-3)" aria-hidden style={{ flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </section>

              {recentSearches.length > 0 && (
                <section aria-label="Recent questions">
                  <BtSectionHeader title="Recent questions" style={{ padding: '0 2px 12px' }} />
                  <BtCard padding="0">
                    {recentSearches.map((s, idx) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => runPrompt(s)}
                        className="bt-hover-row"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52,
                          padding: '12px 20px', background: 'none', border: 'none', textAlign: 'left',
                          borderTop: idx === 0 ? 'none' : '1px solid var(--line)', cursor: 'pointer',
                          fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink)', fontWeight: 500,
                        }}
                      >
                        <Clock size={16} color="var(--ink-3)" aria-hidden />
                        <span style={{ flex: 1, minWidth: 0 }}>{s}</span>
                        <ArrowUpRight size={16} color="var(--ink-3)" aria-hidden />
                      </button>
                    ))}
                  </BtCard>
                </section>
              )}
            </>
          )}

          {/* ── Loading ── */}
          {state === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy="true" role="status" aria-live="polite">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink-2)', fontSize: 15 }}>
                <span aria-hidden style={{ display: 'inline-flex', gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      style={{
                        width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
                        animation: 'pulse 1.1s ease-in-out infinite', animationDelay: `${i * 0.18}s`,
                      }}
                    />
                  ))}
                </span>
                <span>
                  Building your report for <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{currentQuery}</b>
                </span>
              </div>

              <BtCard padding="22px">
                <BtSkeleton width={120} height={14} borderRadius="6px" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                  <BtSkeleton height={16} borderRadius="6px" />
                  <BtSkeleton height={16} borderRadius="6px" width="92%" />
                  <BtSkeleton height={16} borderRadius="6px" width="64%" />
                </div>
              </BtCard>

              <div className="bt-grid-2">
                <BtSkeleton height={104} borderRadius="var(--r-card)" />
                <BtSkeleton height={104} borderRadius="var(--r-card)" />
              </div>

              <BtSkeleton height={220} borderRadius="var(--r-card)" />
            </div>
          )}

          {/* ── Error ── */}
          {state === 'error' && (
            <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ ...eyebrow }}>Your question</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: -6 }}>
                {currentQuery}
              </div>
              <BtErrorCard
                title="Couldn't generate the report"
                message={errorMsg}
                onRetry={() => submitSearch(currentQuery)}
              />
            </div>
          )}

          {/* ── Results ── */}
          {state === 'results' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                  <div style={eyebrow}>Report</div>
                  <h2
                    style={{
                      margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 28px)',
                      fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--ink)', overflowWrap: 'anywhere',
                    }}
                  >
                    {currentQuery}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <BtButton variant="secondary" size="small" icon={Copy} onClick={shareSummary}>
                    Copy summary
                  </BtButton>
                  {result.tableRows.length > 0 && (
                    <BtButton variant="secondary" size="small" icon={Download} onClick={exportCsv}>
                      Export CSV
                    </BtButton>
                  )}
                </div>
              </div>

              {result.alerts.map((alert, idx) => {
                const isCritical = alert.type === 'critical';
                return (
                  <div
                    key={idx}
                    role="alert"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      background: isCritical ? 'var(--status-danger-soft)' : 'var(--status-warning-soft)',
                      border: `1px solid ${isCritical ? 'var(--status-danger-bright)' : 'var(--status-warning-bright)'}`,
                      borderRadius: 'var(--r-input)',
                      color: isCritical ? 'var(--status-danger)' : 'var(--status-warning)',
                      fontSize: 14, fontWeight: 600, lineHeight: 1.4,
                    }}
                  >
                    {isCritical ? <AlertTriangle size={18} style={{ flexShrink: 0 }} /> : <Info size={18} style={{ flexShrink: 0 }} />}
                    <span>{alert.message}</span>
                  </div>
                );
              })}

              {/* Summary */}
              <BtCard padding="22px 24px" style={{ borderLeft: '4px solid var(--accent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--accent-ink)' }}>
                  <Sparkles size={16} aria-hidden />
                  <span style={{ ...eyebrow, color: 'var(--accent-ink)' }}>Executive summary</span>
                </div>
                <div style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {result.summary || 'No summary was returned for this question.'}
                </div>
              </BtCard>

              {/* KPIs */}
              {(result.totalAmount !== null || result.rowCount !== null) && (
                <div className="bt-grid-2">
                  {result.totalAmount !== null && (
                    <BtCard padding="18px 20px">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={eyebrow}>Total amount</span>
                        <IndianRupee size={16} color="var(--ink-3)" aria-hidden />
                      </div>
                      <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', margin: '10px 0 2px', color: 'var(--ink)' }}>
                        {formatInr(result.totalAmount, { compact: true })}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{formatInr(result.totalAmount)} exact</div>
                    </BtCard>
                  )}
                  {result.rowCount !== null && (
                    <BtCard padding="18px 20px">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={eyebrow}>{result.tableType === 'inventory' ? 'Items tracked' : 'Total entries'}</span>
                        <Hash size={16} color="var(--ink-3)" aria-hidden />
                      </div>
                      <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', margin: '10px 0 2px', color: 'var(--ink)' }}>
                        {result.rowCount}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                        {result.tableType === 'inventory' ? 'materials in stock' : 'records matched'}
                      </div>
                    </BtCard>
                  )}
                </div>
              )}

              {/* By project */}
              {result.projectBreakdown.length > 1 && (
                <BtCard padding="20px 22px">
                  <BtSectionHeader title="By project" style={{ padding: '0 0 12px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {result.projectBreakdown.map((item, idx) => {
                      const isTop = idx === 0;
                      const val = Number(item.totalAmount || 0);
                      const valStr = val > 0 ? formatInr(val) : `${item.totalQty || 0} units`;
                      const share = (val > 0 ? val : Number(item.totalQty || 0)) / topProject;
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: isTop ? 700 : 600, color: 'var(--ink)', minWidth: 0 }}>
                              {isTop && <Trophy size={15} color="var(--accent-ink)" aria-hidden style={{ flexShrink: 0 }} />}
                              <span style={{ overflowWrap: 'anywhere' }}>{item.projectName || 'Unknown'}</span>
                            </span>
                            <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                              {valStr}
                            </span>
                          </div>
                          <BtProgress value={share} />
                        </div>
                      );
                    })}
                  </div>
                </BtCard>
              )}

              {/* Table */}
              {result.tableRows.length > 0 && (
                <BtCard padding="0" style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                      {result.tableType === 'inventory' ? 'Inventory details' : 'Transaction details'}
                    </h3>

                    {result.tableType !== 'inventory' && (
                      <BtButton variant="ghost" size="compact" icon={SlidersHorizontal} onClick={openCustomizeModal}>
                        Customize columns
                      </BtButton>
                    )}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    {result.tableType === 'inventory' ? (
                      <table className="bt-table">
                        <thead>
                          <tr>
                            {['Material', 'Type', 'Quantity', 'Status'].map(col => (
                              <th key={col} className={col === 'Quantity' ? 'num' : undefined}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.tableRows.map((r, i) => {
                            const severity = (r.severity || 'ok').toLowerCase();
                            const tone = severity === 'critical' ? 'danger' : (severity === 'low' ? 'warning' : 'success');
                            return (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{r.name || '—'}</td>
                                <td style={{ color: 'var(--ink-2)' }}>{r.category || '—'}</td>
                                <td className="num" style={{ fontWeight: 600 }}>{r.quantity || 0} {r.unit || ''}</td>
                                <td><BtBadge tone={tone} label={severity.charAt(0).toUpperCase() + severity.slice(1)} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <table className="bt-table">
                        <thead>
                          <tr>
                            <th style={{ width: 48 }}>#</th>
                            {visibleColumns.map(col => (
                              <th
                                key={col}
                                className={col.includes('Amount') || col.includes('Price') ? 'num' : undefined}
                                style={{ minWidth: getColWidth(col) }}
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.tableRows.map((r, i) => (
                            <tr key={i}>
                              <td style={{ color: 'var(--ink-3)' }}>{r.number || (i + 1)}</td>
                              {visibleColumns.map(col => {
                                const isAmount = col.includes('Amount') || col.includes('Price');
                                const val = r[col];
                                const displayVal = isAmount ? formatInr(Number(val || 0)) : String(val !== undefined ? val : '—');
                                return (
                                  <td
                                    key={col}
                                    className={isAmount ? 'num' : undefined}
                                    style={{ fontWeight: isAmount ? 600 : 400 }}
                                  >
                                    {displayVal}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </BtCard>
              )}

              {/* Follow-ups */}
              {result.actions.length > 0 && (
                <section>
                  <div style={{ ...eyebrow, marginBottom: 12 }}>Ask next</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.actions.map((act) => (
                      <BtChip key={act} label={act} onClick={() => runPrompt(act)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </BtSheet>

      {showCustomizeModal && result && (
        <CustomizeColumnsModal
          tempAllCols={tempAllCols}
          tempActiveCols={tempActiveCols}
          onToggle={handleToggleColumn}
          onMove={handleMoveColumn}
          onReset={() => {
            setTempActiveCols([...result.columns]);
            setTempAllCols([...result.columns]);
          }}
          onSave={saveCustomizeColumns}
          onClose={() => setShowCustomizeModal(false)}
        />
      )}
    </div>
  );
}

function CustomizeColumnsModal({ tempAllCols, tempActiveCols, onToggle, onMove, onReset, onSave, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('input[type="checkbox"]')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const f = ref.current?.querySelectorAll('button:not([disabled]), input');
        if (!f || !f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-cols-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)', borderRadius: 'var(--r-card)', width: 'min(420px, 100%)', maxHeight: 'calc(100vh - 32px)',
          display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-raised)', border: '1px solid var(--line)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '20px 20px 0' }}>
          <div>
            <h3 id="ai-cols-title" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Customize columns
            </h3>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45 }}>
              Show, hide or reorder the columns in the transaction table.
            </p>
          </div>
          <BtIconButton icon={X} label="Close" size={40} onClick={onClose} />
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tempAllCols.map((col, idx) => {
            const isChecked = tempActiveCols.includes(col);
            return (
              <div
                key={col}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '4px 6px 4px 12px', background: 'var(--bone)', border: '1px solid var(--line)', borderRadius: 'var(--r-tile)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minHeight: 44, cursor: 'pointer', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(col)}
                    style={{ width: 18, height: 18, accentColor: 'var(--ink)', cursor: 'pointer' }}
                  />
                  <span>{col}</span>
                </label>

                <div style={{ display: 'flex', gap: 2 }}>
                  <BtIconButton
                    icon={ChevronUp}
                    label={`Move ${col} up`}
                    size={40}
                    disabled={idx === 0}
                    onClick={() => onMove(idx, -1)}
                    style={{ border: 'none', background: 'transparent' }}
                  />
                  <BtIconButton
                    icon={ChevronDown}
                    label={`Move ${col} down`}
                    size={40}
                    disabled={idx === tempAllCols.length - 1}
                    onClick={() => onMove(idx, 1)}
                    style={{ border: 'none', background: 'transparent' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '4px 20px 20px' }}>
          <BtButton variant="secondary" size="small" onClick={onReset} style={{ flex: 1 }}>
            Reset default
          </BtButton>
          <BtButton variant="primary" size="small" onClick={onSave} style={{ flex: 1 }}>
            Save
          </BtButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
