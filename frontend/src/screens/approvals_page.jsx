import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalAPI } from '../api';
import {
  CheckCircle,
  ClipboardCheck,
  User,
  Building2,
  Package,
  HelpCircle,
  Image as ImageIcon,
  X,
  ArrowLeft,
  Clock,
  AlertCircle,
  Check,
  XCircle,
  Eye,
} from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import { Toast } from '../components/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import BtHero from '../components/ui/BtHero';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtBadge from '../components/ui/BtBadge';
import BtButton from '../components/ui/BtButton';
import BtPressable from '../components/ui/BtPressable';
import BtEmpty from '../components/ui/BtEmpty';
import BtSegmented from '../components/ui/BtSegmented';
import BtCountUp from '../components/ui/BtCountUp';

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending'); // 'pending' | 'history'
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
    { target: '.tour-list', content: 'Approve or reject entries directly with one click.' },
  ];

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        tab === 'pending'
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

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;
    setRejecting(id);
    try {
      await approvalAPI.reject(id, reason || 'Rejected by manager');
      setToast({ message: 'Entry rejected', type: 'info', key: Date.now() });
      setEntries((prev) => prev.filter((e) => (e._id || e.id) !== id));
    } catch (err) {
      setToast({ message: err.friendlyMessage || 'Failed to reject', type: 'error', key: Date.now() });
    } finally {
      setRejecting(null);
    }
  };

  const pendingTotal = entries.reduce((sum, e) => sum + (e.amount || 0), 0);

  const segmentedTabs = [
    { label: tab === 'pending' && entries.length > 0 ? `To Approve (${entries.length})` : 'To Approve', value: 'pending' },
    { label: 'History', value: 'history' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>
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

      {/* ── TOP HERO (Deep Noir with blueprint grid) ── */}
      <BtHero padding="24px 32px 48px">
        <div
          className="tour-header"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                color: 'var(--on-noir-2)',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Inbox &amp; Sign-Offs
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--bone)',
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Approvals
            </h1>
            <p style={{ fontSize: 13, color: 'var(--on-noir-2)', margin: '4px 0 0' }}>
              Review and verify submitted expenses, materials, and daily site updates
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setRunTour(true)}
              title="Help Tour"
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--r-btn, 12px)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--bone)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <HelpCircle size={17} />
            </button>
          </div>
        </div>

        {/* Hero Segmented Switcher & Total Waiting Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 8,
          }}
        >
          <div className="tour-tabs">
            <BtSegmented
              options={segmentedTabs}
              value={tab}
              onChange={(val) => setTab(val)}
            />
          </div>

          {tab === 'pending' && entries.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: 'var(--on-noir-2)', fontFamily: 'var(--font-ui)' }}>
                Waiting for sign-off:
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--bone)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <BtCountUp value={pendingTotal} format={formatCurrency} />
              </span>
            </div>
          )}
        </div>
      </BtHero>

      {/* ── MAIN CONTENT (Overlapping BtSheet) ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 110,
                  borderRadius: 'var(--r-card)',
                  background: 'var(--fill)',
                  animation: 'pulse 1.4s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        ) : error ? (
          <div
            style={{
              padding: 24,
              borderRadius: 'var(--r-card)',
              background: '#FEE2E2',
              color: '#991B1B',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600 }}>{error}</div>
            <button
              onClick={fetchEntries}
              style={{
                marginTop: 12,
                padding: '6px 14px',
                borderRadius: 8,
                background: '#991B1B',
                color: '#FFF',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <BtEmpty
            title={tab === 'pending' ? 'All caught up!' : 'No approval history yet'}
            message={
              tab === 'pending'
                ? 'No items are currently waiting for your review. Team submissions will appear here.'
                : 'Items that you approve or reject will be archived here for record keeping.'
            }
          />
        ) : (
          <div className="tour-list" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {entries.map((entry) => {
              const id = entry._id || entry.id;
              const projectName =
                entry.project?.name || entry.projectName || (typeof entry.project === 'string' ? entry.project : 'Project');
              const creatorName =
                entry.createdBy?.name || entry.userName || (typeof entry.user === 'string' ? entry.user : 'Team Member');
              const type = entry.type || entry.category || 'Materials';
              const isPending = (entry.approvalStatus || 'pending').toLowerCase() === 'pending';

              const typeTones = {
                material: 'info',
                labour: 'warn',
                equipment: 'good',
                wages: 'warn',
                expense: 'muted',
              };

              return (
                <BtCard
                  key={id}
                  padding="20px 24px"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  {/* Left: Info */}
                  <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <BtBadge tone={typeTones[type.toLowerCase()] || 'muted'}>
                        {type.toUpperCase()}
                      </BtBadge>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
                        {projectName}
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>·</span>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        {formatDate(entry.date || entry.createdAt)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--ink)',
                        marginBottom: 4,
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {entry.description || entry.title || 'Expense entry'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                      <span>Submitted by: <strong style={{ color: 'var(--ink)' }}>{creatorName}</strong></span>
                      {entry.billPhoto && (
                        <button
                          onClick={() => setLightbox(entry.billPhoto)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-ink)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <ImageIcon size={13} />
                          <span>View Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                      marginLeft: 'auto',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--ink-soft)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Amount
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 22,
                          fontWeight: 700,
                          color: 'var(--ink)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatCurrency(entry.amount)}
                      </div>
                    </div>

                    {tab === 'pending' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => handleReject(id)}
                          disabled={rejecting === id || approving === id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            height: 38,
                            padding: '0 14px',
                            borderRadius: 'var(--r-btn, 12px)',
                            background: '#FFFFFF',
                            border: '1px solid var(--line)',
                            color: 'var(--danger)',
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'background 150ms ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#FEE2E2')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                        >
                          <X size={15} />
                          <span>Reject</span>
                        </button>

                        <button
                          onClick={() => handleApprove(id)}
                          disabled={approving === id || rejecting === id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            height: 38,
                            padding: '0 18px',
                            borderRadius: 'var(--r-btn, 12px)',
                            background: 'var(--ink)',
                            border: 'none',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(12, 14, 18, 0.1)',
                            transition: 'transform 150ms ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          <Check size={15} />
                          <span>Approve</span>
                        </button>
                      </div>
                    )}

                    {tab === 'history' && (
                      <BtBadge
                        tone={
                          (entry.approvalStatus || '').toLowerCase() === 'approved'
                            ? 'good'
                            : 'bad'
                        }
                      >
                        {entry.approvalStatus || 'Resolved'}
                      </BtBadge>
                    )}
                  </div>
                </BtCard>
              );
            })}
          </div>
        )}
      </BtSheet>

      {/* Lightbox for Receipt / Bill Photo */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(12, 14, 18, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: 'var(--r-card)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
          >
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(0,0,0,0.6)',
                color: '#FFF',
                border: 'none',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
            <img
              src={lightbox}
              alt="Receipt attachment"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
