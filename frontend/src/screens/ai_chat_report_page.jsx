import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { aiDashboardAPI } from '../api';
import { colors, radius, shadows, gradients } from '../styles/designTokens';
import { Card, Spinner } from '../components/ui';
import { Toast } from '../components/Toast';
import {
  Sparkles,
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  Trash,
  Download,
  Share2,
  Search,
  X,
  SlidersHorizontal,
  TrendingUp,
  AlertTriangle,
  Info,
  Check,
  Clock,
  Hash,
  Trophy
} from 'lucide-react';

const QUICK_PROMPTS = [
  'Show material usage',
  'Compare project costs',
  'Low stock materials',
  'Labour summary',
  'Equipment usage',
  'Monthly spending'
];

function formatCurrency(v) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}

export default function AiChatReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

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
    const cached = localStorage.getItem('bt_ai_searches_v1');
    return cached ? JSON.parse(cached) : [];
  });

  const clearToast = () => setToast({ msg: '', type: 'info' });

  const addRecentSearch = (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const copy = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...copy].slice(0, 5);
      localStorage.setItem('bt_ai_searches_v1', JSON.stringify(updated));
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
      const res = await aiDashboardAPI.query({
        query: trimmed,
        projectId: projectId
      });

      const responseData = res.data?.data || {};
      const table = responseData.table || {};

      const mappedResult = {
        summary: responseData.summary || '',
        metrics: responseData.metrics || {},
        tableType: table.type || 'none',
        tableRows: table.rows || [],
        columns: (table.columns || []).map(c => String(c)),
        totalAmount: table.total !== undefined ? Number(table.total) : (table.totalAmount !== undefined ? Number(table.totalAmount) : null),
        rowCount: table.rowCount !== undefined ? Number(table.rowCount) : null,
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
      setErrorMsg(err.response?.data?.message || err.friendlyMessage || err.message || 'An unknown error occurred.');
      setState('error');
    }
  };

  const handleReset = () => {
    setQueryInput('');
    setCurrentQuery('');
    setResult(null);
    setState('initial');
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
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
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

  const shareSummary = () => {
    if (!result) return;
    try {
      const text = `BuildTrack AI Summary: ${currentQuery}\n\n${result.summary}`;
      navigator.clipboard.writeText(text);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgBase4, fontFamily: typography.fontFamily }}>
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />

      <div style={{ background: colors.cardBg, borderBottom: `1px solid ${colors.cardBorder}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ border: 'none', background: colors.bgBase4, cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textPrimary }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, margin: 0 }}>
              Construction Intelligence
            </h2>
            <p style={{ fontSize: 12, color: colors.textLight, margin: 0 }}>
              AI insights report dashboard
            </p>
          </div>
        </div>

        {state === 'results' && (
          <button
            onClick={handleReset}
            style={{ padding: "8px 14px", borderRadius: radius.md, border: `1px solid ${colors.cardBorder}`, background: '#FFF', color: colors.textMedium, fontWeight: "700", fontSize: 12, cursor: "pointer", display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={13} />
            Reset AI
          </button>
        )}
      </div>

      <div style={{ padding: '16px 24px 8px', maxWidth: 840, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF', border: `1.2px solid #E2E4FA`, borderRadius: 16, padding: '10px 16px', boxShadow: shadows.sm }}>
          <Sparkles size={18} color={colors.primaryBlue} style={{ flexShrink: 0 }} />
          <input
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitSearch(queryInput); }}
            placeholder="Ask about materials, costs, project status..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: colors.textPrimary }}
          />
          {queryInput.trim().length > 0 && (
            <button onClick={() => setQueryInput('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.textLight }}><X size={16} /></button>
          )}
          <button
            disabled={!queryInput.trim() || state === 'loading'}
            onClick={() => submitSearch(queryInput)}
            style={{ border: 'none', background: gradients.primaryButton, color: '#FFF', fontWeight: '700', padding: '6px 14px', borderRadius: 8, fontSize: 12.5, cursor: (!queryInput.trim() || state === 'loading') ? 'not-allowed' : 'pointer' }}
          >
            Search
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        <div style={{ maxWidth: 840, width: '100%', margin: '0 auto' }}>

          {state === 'initial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 12 }}>

              <div>
                <h3 style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, margin: '0 0 12px' }}>Quick Insights</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  {QUICK_PROMPTS.map(p => (
                    <div
                      key={p}
                      onClick={() => { setQueryInput(p); submitSearch(p); }}
                      style={{ background: '#FFF', borderRadius: 16, border: '1px solid #EBEBEB', padding: 16, cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: shadows.sm }}
                      className="hover-lift-sm"
                    >
                      <TrendingUp size={16} color={colors.primaryBlue} style={{ marginBottom: 10 }} />
                      <div style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{p}</div>
                    </div>
                  ))}
                </div>
              </div>

              {recentSearches.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, margin: '0 0 10px' }}>Recent Queries</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#FFF', border: `1px solid ${colors.cardBorder}`, borderRadius: 14, overflow: 'hidden' }}>
                    {recentSearches.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => { setQueryInput(s); submitSearch(s); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: idx < recentSearches.length - 1 ? `1px solid ${colors.divider}` : 'none', cursor: 'pointer', fontSize: 13, color: colors.textPrimary }}
                        className="hover-bg-subtle"
                      >
                        <Clock size={14} color={colors.textLight} />
                        <span style={{ flex: 1, fontWeight: '600' }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {state === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 12 }}>

              <div style={{ background: '#E2E8F0', height: 120, borderRadius: 16, animation: 'pulse 1.5s infinite' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#E2E8F0', height: 90, borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
                <div style={{ background: '#E2E8F0', height: 90, borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
              </div>

              <div style={{ background: '#E2E8F0', height: 180, borderRadius: 16, animation: 'pulse 1.5s infinite' }} />

              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Spinner size={32} color={colors.primaryBlue} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: '700', color: colors.textLight }}>Generating analytics report...</div>
              </div>

            </div>
          )}

          {state === 'error' && (
            <div style={{ textAlign: 'center', padding: '60px 16px', background: '#FFF', borderRadius: 16, border: `1px solid ${colors.cardBorder}`, marginTop: 12 }}>
              <AlertTriangle size={48} color="#dc2626" style={{ marginBottom: 16 }} />
              <h3 style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary, margin: '0 0 8px' }}>Failed to generate report</h3>
              <p style={{ fontSize: 13, color: colors.textLight, margin: '0 0 20px', lineHeight: 1.5 }}>{errorMsg}</p>
              <button
                onClick={() => submitSearch(currentQuery)}
                style={{ padding: '10px 20px', background: colors.primaryBlue, border: 'none', borderRadius: 8, color: '#FFF', fontWeight: '700', fontSize: 13, cursor: 'pointer' }}
              >
                Try Again
              </button>
            </div>
          )}

          {state === 'results' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {result.alerts.map((alert, idx) => {
                const isCritical = alert.type === 'critical';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: isCritical ? '#FEF2F2' : '#FFF9E6',
                      border: `1.2px solid ${isCritical ? '#FCA5A5' : '#FDE047'}`,
                      borderRadius: 12,
                      color: isCritical ? '#991B1B' : '#854D0E',
                      fontSize: 12.5,
                      fontWeight: '700'
                    }}
                  >
                    {isCritical ? <AlertTriangle size={18} /> : <Info size={18} />}
                    <span>{alert.message}</span>
                  </div>
                );
              })}

              <div style={{ background: 'linear-gradient(135deg, #FFF5F0 0%, #FDE8D8 100%)', border: '2.5px solid #FFF', borderRadius: 20, padding: 20, boxShadow: shadows.md }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: colors.primaryBlue }}>
                  <Sparkles size={16} />
                  <span style={{ fontSize: 12, fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Executive Summary</span>
                </div>
                <div style={{ fontSize: 14.5, color: colors.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                  {result.summary}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={shareSummary}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.primaryBlue, fontWeight: '700', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Share2 size={14} /> Copy Summary
                </button>
                {result.tableRows.length > 0 && (
                  <button
                    onClick={exportCsv}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.primaryBlue, fontWeight: '700', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}
                  >
                    <Download size={14} /> Export CSV
                  </button>
                )}
              </div>

              {(result.totalAmount !== null || result.rowCount !== null) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {result.totalAmount !== null && (
                    <Card style={{ padding: 16 }}>
                      <TrendingUp size={16} color={colors.textLight} />
                      <div style={{ fontSize: 22, fontWeight: '900', color: colors.primaryBlue, margin: '8px 0 2px' }}>
                        {formatCurrency(result.totalAmount)}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textLight, fontWeight: '700' }}>Total Amount</div>
                    </Card>
                  )}
                  {result.rowCount !== null && (
                    <Card style={{ padding: 16 }}>
                      <Hash size={16} color={colors.textLight} />
                      <div style={{ fontSize: 22, fontWeight: '900', color: colors.primaryBlue, margin: '8px 0 2px' }}>
                        {result.rowCount}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textLight, fontWeight: '700' }}>
                        {result.tableType === 'inventory' ? 'Items Tracked' : 'Total Entries'}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {result.projectBreakdown.length > 1 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, margin: '0 0 10px' }}>By Project</h3>
                  <div style={{ background: '#FFF', border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.projectBreakdown.map((item, idx) => {
                      const isTop = idx === 0;
                      const val = Number(item.totalAmount || 0);
                      const valStr = val > 0 ? formatCurrency(val) : `${item.totalQty || 0} units`;
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                          <span style={{ fontWeight: isTop ? '700' : '600', color: colors.textPrimary }}>
                            {isTop ? <><Trophy size={14} /> </> : '• '}{item.projectName || 'Unknown'}
                          </span>
                          <span style={{ fontWeight: isTop ? '700' : '600', color: colors.textPrimary }}>
                            {valStr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.tableRows.length > 0 && (
                <div style={{ background: '#FFF', border: `1px solid ${colors.cardBorder}`, borderRadius: 16, overflow: 'hidden' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${colors.divider}` }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: colors.textPrimary }}>
                      {result.tableType === 'inventory' ? 'Inventory Details' : 'Transaction Details'}
                    </h3>

                    {result.tableType !== 'inventory' && (
                      <button
                        onClick={openCustomizeModal}
                        style={{ border: 'none', background: 'none', color: colors.primaryBlue, fontWeight: '700', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <SlidersHorizontal size={12} /> Customize Columns
                      </button>
                    )}
                  </div>

                  {result.tableType === 'inventory' ? (

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#F1F3F8', borderBottom: `1.5px solid ${colors.divider}` }}>
                            {['Material', 'Type', 'Quantity', 'Status'].map(col => (
                              <th key={col} style={{ padding: '12px 16px', fontSize: 11, fontWeight: '700', color: '#64748B', textAlign: 'left' }}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.tableRows.map((r, i) => {
                            const severity = (r.severity || 'ok').toLowerCase();
                            const statusColor = severity === 'critical' ? '#dc2626' : (severity === 'low' ? '#d97706' : '#16a34a');
                            const statusBg = severity === 'critical' ? '#fef2f2' : (severity === 'low' ? '#fffbeb' : '#f0fdf4');

                            return (
                              <tr key={i} style={{ borderBottom: `1px solid ${colors.divider}` }}>
                                <td style={{ padding: '12px 16px', fontSize: 13, color: colors.textPrimary, fontWeight: '600' }}>{r.name || '—'}</td>
                                <td style={{ padding: '12px 16px', fontSize: 12, color: colors.textLight, fontWeight: '700' }}>{(r.category || '—').toUpperCase()}</td>
                                <td style={{ padding: '12px 16px', fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>{r.quantity || 0} {r.unit || ''}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: '800', background: statusBg, color: statusColor }}>{severity.toUpperCase()}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#F1F3F8', borderBottom: `1.5px solid ${colors.divider}` }}>
                            <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: '700', color: '#64748B', textAlign: 'left', width: 36 }}>#</th>
                            {visibleColumns.map(col => (
                              <th
                                key={col}
                                style={{ padding: '12px 16px', fontSize: 11, fontWeight: '700', color: '#64748B', textAlign: col.includes('Amount') ? 'right' : 'left', minWidth: getColWidth(col) }}
                              >
                                {col.toUpperCase()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.tableRows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${colors.divider}` }}>
                              <td style={{ padding: '12px 16px', fontSize: 12, color: colors.textLight }}>{r.number || (i + 1)}</td>
                              {visibleColumns.map(col => {
                                const isAmount = col.includes('Amount') || col.includes('Amount (INR)') || col.includes('Price');
                                const val = r[col];
                                const displayVal = isAmount ? formatCurrency(Number(val || 0)) : String(val !== undefined ? val : '—');

                                return (
                                  <td
                                    key={col}
                                    style={{
                                      padding: '12px 16px',
                                      fontSize: 13,
                                      color: colors.textPrimary,
                                      fontWeight: isAmount ? '700' : '500',
                                      textAlign: isAmount ? 'right' : 'left'
                                    }}
                                  >
                                    {displayVal}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

              {result.actions.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 11.5, fontWeight: '800', color: colors.textLight, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suggested Explorations</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.actions.map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setQueryInput(act); submitSearch(act); }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 20,
                          border: 'none',
                          background: '#FFF5F0',
                          color: colors.primaryBlue,
                          fontSize: 12.5,
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        className="hover-bg-subtle"
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {showCustomizeModal && result && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#FFF", borderRadius: 16, width: 340, padding: 20, boxShadow: shadows.lg, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: colors.primaryBlue }}>Customize Columns</h3>
              <button onClick={() => setShowCustomizeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textLight }}><X size={18} /></button>
            </div>

            <hr style={{ border: "none", borderTop: `1px solid ${colors.divider}`, margin: "0 0 10px" }} />

            <p style={{ margin: "0 0 12px", fontSize: 11, color: colors.textLight, lineHeight: 1.4 }}>
              Toggle visibility or reorder columns in the AI transaction breakdown table.
            </p>

            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {tempAllCols.map((col, idx) => {
                const isChecked = tempActiveCols.includes(col);
                return (
                  <div key={col} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: colors.bgBase4, borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleColumn(col)}
                        style={{ width: 15, height: 15, accentColor: colors.primaryBlue, cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: "700", color: colors.textPrimary }}>{col}</span>
                    </div>

                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMoveColumn(idx, -1)}
                        style={{ border: "none", background: "none", cursor: idx === 0 ? "not-allowed" : "pointer", color: idx === 0 ? "#ccc" : colors.textPrimary }}
                      >
                        ▲
                      </button>
                      <button
                        disabled={idx === tempAllCols.length - 1}
                        onClick={() => handleMoveColumn(idx, 1)}
                        style={{ border: "none", background: "none", cursor: idx === tempAllCols.length - 1 ? "not-allowed" : "pointer", color: idx === tempAllCols.length - 1 ? "#ccc" : colors.textPrimary }}
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
                onClick={() => {
                  setTempActiveCols([...result.columns]);
                  setTempAllCols([...result.columns]);
                }}
                style={{ flex: 1, padding: "10px 0", border: `1.2px solid ${colors.cardBorder}`, background: "none", borderRadius: 10, fontSize: 13, fontWeight: "700", color: colors.textMedium, cursor: "pointer" }}
              >
                Reset Default
              </button>
              <button
                onClick={saveCustomizeColumns}
                style={{ flex: 1, padding: "10px 0", border: "none", background: gradients.primaryButton, borderRadius: 10, fontSize: 13, fontWeight: "700", color: "#FFF", cursor: "pointer" }}
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
