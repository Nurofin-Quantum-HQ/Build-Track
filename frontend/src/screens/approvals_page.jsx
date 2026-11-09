import React, { useState, useEffect, useCallback } from 'react';
import { approvalAPI } from '../api';
import {
  CheckCircle2,
  HelpCircle,
  X,
  Check,
  History,
  Receipt,
} from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import BtHero from '../components/ui/BtHero';
import BtPageHeader from '../components/ui/BtPageHeader';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtBadge from '../components/ui/BtBadge';
import BtButton from '../components/ui/BtButton';
import BtIconButton from '../components/ui/BtIconButton';
import BtEmpty, { BtErrorCard } from '../components/ui/BtEmpty';
import BtSegmented from '../components/ui/BtSegmented';
import BtSkeleton from '../components/ui/BtSkeleton';
import { BtTextarea } from '../components/ui/BtField';
import btToast from '../components/ui/BtToast';
import { formatInr } from '../components/ui/BtCountUp';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const TYPE_META = {
  material: { tone: 'material', label: 'Material' },
  materials: { tone: 'material', label: 'Material' },
  labour: { tone: 'labour', label: 'Labour' },
  wages: { tone: 'labour', label: 'Labour' },
  equipment: { tone: 'equipment', label: 'Equipment' },
  expense: { tone: 'equipment', label: 'Equipment' },
  income: { tone: 'income', label: 'Income' },
};

function typeMeta(type) {
  const key = String(type || '').toLowerCase();
  return TYPE_META[key] || { tone: 'neutral', label: type ? String(type).charAt(0).toUpperCase() + String(type).slice(1) : 'Entry' };
}

/** Reject dialog: asks for an optional reason, then rejects. */
function RejectDialog({ entry, loading, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, onCancel]);

  return (
    <div
      onClick={() => { if (!loading) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1500, background: 'var(--scrim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)', borderRadius: 'var(--r-sheet)', padding: 24,
          width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-raised)', boxSizing: 'border-box',
        }}
      >
        <h2 id="reject-title" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          Reject this entry?
        </h2>
        <p style={{ margin: '8px 0 16px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--ink)' }}>{entry.description || entry.title || 'Expense entry'}</strong>
          {' '}({formatInr(entry.amount)}) goes back to the person who submitted it.
        </p>
        <BtTextarea
          label="Reason (optional)"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell them what to fix"
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <BtButton variant="secondary" size="small" onClick={onCancel} disabled={loading}>Cancel</BtButton>
          <BtButton variant="destructive" size="small" icon={X} loading={loading} onClick={() => onConfirm(reason)}>
            Reject entry
          </BtButton>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'history'
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
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

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const handleApprove = async (id) => {
    setApproving(id);
    try {
      await approvalAPI.approve(id);
      btToast('Entry approved successfully');
      setEntries((prev) => prev.filter((e) => (e._id || e.id) !== id));
    } catch (err) {
      btToast(err.friendlyMessage || 'Failed to approve', { error: true });
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (reason) => {
    const target = rejectTarget;
    if (!target) return;
    const id = target._id || target.id;
    setRejecting(id);
    try {
      await approvalAPI.reject(id, (reason || '').trim() || 'Rejected by manager');
      btToast('Entry rejected');
      setEntries((prev) => prev.filter((e) => (e._id || e.id) !== id));
      setRejectTarget(null);
    } catch (err) {
      btToast(err.friendlyMessage || 'Failed to reject', { error: true });
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

      {rejectTarget && (
        <RejectDialog
          entry={rejectTarget}
          loading={rejecting !== null}
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {/* ── HERO ── */}
      <BtHero>
        <div className="tour-header">
          <BtPageHeader
            eyebrow="Inbox and sign-offs"
            title="Approvals"
            subtitle="Review and verify the expenses, materials and daily site updates your team submits."
            actions={<BtIconButton onDark icon={HelpCircle} label="Page tour" onClick={() => setRunTour(true)} />}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div className="tour-tabs">
                <BtSegmented options={segmentedTabs} value={tab} onChange={(val) => setTab(val)} />
              </div>

              {tab === 'pending' && !loading && entries.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 14, color: 'var(--on-noir-2)' }}>Waiting for sign-off</span>
                  <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--on-noir)', letterSpacing: '-0.02em' }}>
                    {formatInr(pendingTotal, { compact: true })}
                  </span>
                </div>
              )}
            </div>
          </BtPageHeader>
        </div>
      </BtHero>

      {/* ── SHEET ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3].map((i) => (
              <BtSkeleton key={i} height="104px" borderRadius="var(--r-card)" />
            ))}
          </div>
        ) : error ? (
          <BtErrorCard title="Couldn't load approvals" message={error} onRetry={fetchEntries} />
        ) : entries.length === 0 ? (
          <BtCard padding={0}>
            <BtEmpty
              icon={tab === 'pending' ? CheckCircle2 : History}
              title={tab === 'pending' ? 'All caught up' : 'No approval history yet'}
              message={
                tab === 'pending'
                  ? 'Nothing is waiting for your review. New team submissions will appear here.'
                  : 'Entries you approve or reject are kept here for your records.'
              }
            />
          </BtCard>
        ) : (
          <div className="tour-list" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {entries.map((entry) => {
              const id = entry._id || entry.id;
              const projectName =
                entry.project?.name || entry.project?.projectName || entry.projectName || (typeof entry.project === 'string' ? entry.project : 'Project');
              const creatorName =
                entry.createdBy?.name || entry.userName || (typeof entry.user === 'string' ? entry.user : 'Team Member');
              const meta = typeMeta(entry.type || entry.category || 'Materials');
              const status = (entry.approvalStatus || '').toLowerCase();
              const busy = approving === id || rejecting === id;

              return (
                <BtCard
                  key={id}
                  padding="20px 24px"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}
                >
                  <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <BtBadge tone={meta.tone} label={meta.label} showDot={false} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{projectName}</span>
                      <span style={{ fontSize: 13, color: 'var(--ink-3)' }} aria-hidden="true">·</span>
                      <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{formatDate(entry.date || entry.createdAt)}</span>
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, overflowWrap: 'anywhere' }}>
                      {entry.description || entry.title || 'Expense entry'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: 'var(--ink-2)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span
                          aria-hidden="true"
                          style={{
                            width: 24, height: 24, borderRadius: '50%', background: 'var(--fill)', border: '1px solid var(--line)',
                            display: 'inline-grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ink)',
                          }}
                        >
                          {creatorName.charAt(0).toUpperCase()}
                        </span>
                        <span>Submitted by <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{creatorName}</strong></span>
                      </span>
                      {entry.billPhoto && (
                        <button
                          type="button"
                          onClick={() => setLightbox(entry.billPhoto)}
                          className="bt-hover-row"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                            color: 'var(--accent-ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '6px 8px',
                            borderRadius: 'var(--r-chip)', fontFamily: 'var(--font-ui)',
                          }}
                        >
                          <Receipt size={14} />
                          <span>View receipt</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginLeft: 'auto' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="bt-eyebrow" style={{ color: 'var(--ink-3)' }}>Amount</div>
                      <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                        {formatInr(entry.amount)}
                      </div>
                    </div>

                    {tab === 'pending' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BtButton variant="destructive" size="small" icon={X} disabled={busy} onClick={() => setRejectTarget(entry)}>
                          Reject
                        </BtButton>
                        <BtButton variant="primary" size="small" icon={Check} loading={approving === id} disabled={busy && approving !== id} onClick={() => handleApprove(id)}>
                          Approve
                        </BtButton>
                      </div>
                    )}

                    {tab === 'history' && (
                      <BtBadge
                        tone={status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'neutral'}
                        label={status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Resolved'}
                      />
                    )}
                  </div>
                </BtCard>
              );
            })}
          </div>
        )}
      </BtSheet>

      {/* Lightbox for receipt / bill photo */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 1600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Receipt"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh', background: 'var(--card)', borderRadius: 'var(--r-card)',
              overflow: 'hidden', position: 'relative', boxShadow: 'var(--shadow-raised)',
            }}
          >
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <BtIconButton icon={X} label="Close receipt" size={38} onClick={() => setLightbox(null)} />
            </div>
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
