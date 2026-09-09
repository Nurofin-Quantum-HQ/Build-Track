import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography } from '../styles/designTokens';
import { Card, Badge, Button, Spinner, EmptyState, ErrorState, Toast, ConfirmDialog } from '../components/ui';
import { approvalAPI, transactionAPI } from '../api';
import { CheckCircle, ClipboardCheck, User, Building2, Package, HelpCircle, Image as ImageIcon, X } from 'lucide-react';
import ModuleTour from '../components/ModuleTour';

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

const typeStyles = {
  Materials: { bg: '#FFF5F0', color: '#F97316' },
  Wages: { bg: '#E8F5E9', color: '#2E7D32' },
  Expense: { bg: '#FFF3E0', color: '#E65100' },
  Income: { bg: '#FFF7F0', color: '#EA580C' },
};

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info', key: 0 });
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-header', content: 'Review and approve project entries submitted by your team.', disableBeacon: true },
    { target: '.tour-tabs', content: 'Toggle between pending approvals and your history.' },
    { target: '.tour-list', content: 'Approve or reject entries from this list.' }
  ];

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = tab === 'pending'
        ? await approvalAPI.getPending()
        : await approvalAPI.getHistory();
      const data = res.data?.entries || res.data?.transactions || res.data || [];
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load entries');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleApprove = async (id) => {
    setApproving(id);
    try {
      await approvalAPI.approve(id);
      setToast({ message: 'Entry approved successfully', type: 'success', key: Date.now() });
      setEntries((prev) => prev.filter((e) => (e._id || e.id) !== id));
    } catch (err) {
      setToast({ message: err.friendlyMessage || 'Failed to approve', type: 'error', key: Date.now() });
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id) => {
    setRejecting(id);
    try {
      await approvalAPI.reject(id, 'Rejected by manager');
      setToast({ message: 'Entry rejected', type: 'info', key: Date.now() });
      setEntries((prev) => prev.filter((e) => (e._id || e.id) !== id));
    } catch (err) {
      setToast({ message: err.friendlyMessage || 'Failed to reject', type: 'error', key: Date.now() });
    } finally {
      setRejecting(null);
    }
  };

  const showNotify = (msg, type) => {
    setToast({ message: msg, type, key: Date.now() });
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="ApprovalDashboard" />
      <Toast
        key={toast.key}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, message: '' }))}
      />
      <ConfirmDialog
        open={!!confirmDlg}
        message={confirmDlg?.message || ''}
        onConfirm={confirmDlg?.onConfirm}
        onCancel={() => setConfirmDlg(null)}
        danger={confirmDlg?.danger}
        confirmLabel={confirmDlg?.confirmLabel}
      />

      <div className="tour-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, margin: 0 }}>
          Approvals
        </h2>
        <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
          <HelpCircle size={16} color={colors.textLight} />
        </button>
      </div>

      <div className="tour-tabs" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pending', 'history'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              borderRadius: radius.sm,
              background: tab === t ? colors.primaryBlue : colors.cardBg,
              color: tab === t ? '#FFF' : colors.textSecondary,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s',
              border: tab === t ? 'none' : `1px solid ${colors.cardBorder}`,
            }}
          >
            {t === 'pending' ? 'Pending' : 'History'}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner style={{ padding: 60 }} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEntries} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={tab === 'pending' ? <CheckCircle size={48} /> : <ClipboardCheck size={48} />}
          title={tab === 'pending' ? 'No Pending Approvals' : 'No Approval History'}
          description={tab === 'pending'
            ? 'All entries have been reviewed. Great job!'
            : 'No approval history found.'}
        />
      ) : (
        <div className="tour-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map((entry) => {
            const id = entry._id || entry.id;
            const type = typeStyles[entry.type] || typeStyles.Materials;
            const amount = Number(entry.amount || entry.totalAmount || 0);
            const isPending = tab === 'pending';
            const photos = Array.isArray(entry.photos) ? entry.photos : (entry.photo ? [entry.photo] : (entry.images || []));
            const hasPhotos = photos.length > 0;

            return (
              <Card key={id} hoverable onClick={() => navigate('/entry-detail', { state: { entry, isPending } })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: type.bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {entry.type === 'Wages' ? <User size={18} /> : entry.type === 'Expense' ? <Building2 size={18} /> : <Package size={18} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.title || entry.name || 'Untitled'}
                      </span>
                      <Badge variant={entry.type === 'Wages' ? 'success' : entry.type === 'Expense' ? 'warning' : 'info'} style={{ fontSize: 10 }}>
                        {entry.type === 'Wages' ? 'Labour' : entry.type === 'Expense' ? 'Equipment' : entry.type || 'N/A'}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: colors.textSecondary }}>
                      <span>{formatDate(entry.date || entry.createdAt)}</span>
                      <span>{entry.projectName || entry.project || '—'}</span>
                      {hasPhotos && (
                        <span onClick={(e) => { e.stopPropagation(); setLightbox({ photos, index: 0 }); }} style={{ color: '#F97316', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: 600 }}>
                          <ImageIcon size={14} /> View Proof
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: colors.textPrimary }}>
                      {formatCurrency(amount)}
                    </div>
                    {isPending && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(id); }}
                          disabled={approving === id}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: 'none',
                            background: colors.success, color: '#FFF',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            opacity: approving === id ? 0.5 : 1,
                          }}
                        >
                          {approving === id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(id); }}
                          disabled={rejecting === id}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: 'none',
                            background: colors.error, color: '#FFF',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            opacity: rejecting === id ? 0.5 : 1,
                          }}
                        >
                          {rejecting === id ? '...' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setLightbox(null)}>
          <div style={{ position: 'absolute', top: 20, right: 20, cursor: 'pointer', background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: '50%' }} onClick={() => setLightbox(null)}>
            <X color="#FFF" size={24} />
          </div>
          <img src={lightbox.photos[lightbox.index]} alt="Proof" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
          {lightbox.photos.length > 1 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }} onClick={e => e.stopPropagation()}>
              {lightbox.photos.map((p, i) => (
                <div key={i} onClick={() => setLightbox({ ...lightbox, index: i })} style={{ width: 60, height: 60, borderRadius: 8, border: lightbox.index === i ? '2px solid #F97316' : '2px solid transparent', cursor: 'pointer', backgroundImage: `url(${p})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}