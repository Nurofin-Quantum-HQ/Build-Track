import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transactionAPI, approvalAPI } from '../api';
import RecordPaymentSheet from '../components/RecordPaymentSheet';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import BtHero from '../components/ui/BtHero';
import BtSheet from '../components/ui/BtSheet';
import BtPageHeader from '../components/ui/BtPageHeader';
import BtCard from '../components/ui/BtCard';
import BtBadge from '../components/ui/BtBadge';
import BtButton from '../components/ui/BtButton';
import BtEmpty from '../components/ui/BtEmpty';
import BtProgress from '../components/ui/BtProgress';
import btToast from '../components/ui/BtToast';
import { formatInr } from '../components/ui/BtCountUp';
import {
  Package, User, Wrench, IndianRupee, Trash2, Calendar,
  CreditCard, Building2, Hash, FileText, AlertTriangle,
  CheckCircle, XCircle, Clock, MapPin, Phone, UserCheck, FileCheck,
  ExternalLink, Receipt, Pencil, ArrowLeft,
} from 'lucide-react';

// Raw API types (Materials / Wages / Expense / Income) and the lowercase
// names the report mapper produces both resolve to one config.
const TYPE_CONFIG = {
  material: { label: 'Material', tone: 'material', color: 'var(--type-material)', bg: 'var(--type-material-soft)', icon: Package },
  labour: { label: 'Labour', tone: 'labour', color: 'var(--type-labour)', bg: 'var(--type-labour-soft)', icon: User },
  equipment: { label: 'Equipment', tone: 'equipment', color: 'var(--type-equipment)', bg: 'var(--type-equipment-soft)', icon: Wrench },
  income: { label: 'Income', tone: 'income', color: 'var(--type-income)', bg: 'var(--type-income-soft)', icon: IndianRupee },
};
const TYPE_ALIASES = { materials: 'material', wages: 'labour', expense: 'equipment' };

function resolveType(type) {
  const key = String(type || '').toLowerCase();
  return TYPE_CONFIG[TYPE_ALIASES[key] || key] || null;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr, rawId = null) {
  if (!dateStr) return '—';
  let d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  const isUtcMidnight =
    (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) ||
    (typeof dateStr === "string" && (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr.endsWith("T00:00:00.000Z")));

  const isLocalMidnight = d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;

  if ((isUtcMidnight || isLocalMidnight) && rawId && String(rawId).length === 24) {
    try {
      const ts = parseInt(String(rawId).substring(0, 8), 16) * 1000;
      const fromId = new Date(ts);
      if (!isNaN(fromId.getTime())) {
        d = fromId;
      }
    } catch {}
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  const isStillMidnight =
    (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) ||
    (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) ||
    (isUtcMidnight && !rawId);

  if (isStillMidnight) {
    return `${day} ${month} ${year}`;
  }

  let hrs = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  hrs = hrs % 12 || 12;
  return `${day} ${month} ${year}, ${String(hrs).padStart(2, '0')}:${mins} ${ampm}`;
}

function paymentTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || s === 'fully paid') return 'success';
  if (s === 'partial') return 'warning';
  return 'danger';
}

function paymentLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || s === 'fully paid') return 'Fully paid';
  if (s === 'partial') return 'Partial';
  if (!s) return 'Not paid';
  return 'Not paid';
}

const sectionTitleStyle = {
  margin: 0,
  fontFamily: 'var(--font-ui)',
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--ink)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

function Section({ title, icon: Icon, action, badge, children }) {
  return (
    <BtCard padding="20px 22px" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h3 style={sectionTitleStyle}>
          {Icon && <Icon size={17} strokeWidth={1.9} color="var(--ink-2)" />}
          {title}
        </h3>
        {badge || action || null}
      </div>
      {children}
    </BtCard>
  );
}

function StatTile({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bone)', border: '1px solid var(--line)', borderRadius: 'var(--r-tile)', padding: '12px 14px', minWidth: 0 }}>
      <div className="bt-eyebrow" style={{ color: 'var(--ink-3)' }}>{label}</div>
      <div
        className="tnum"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: color || 'var(--ink)',
          marginTop: 4,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function EntryDetailPage({ entryData, onCloseModal, isModal = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, can } = useAuth();
  const [entry, setEntry] = useState(entryData || location.state?.entry);
  const [isPending, setIsPending] = useState(location.state?.isPending);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const goBack = () => (isModal ? onCloseModal?.() : navigate(-1));

  if (!entry) {
    return (
      <div style={{ background: 'var(--ground)', minHeight: isModal ? undefined : '100vh' }}>
        {!isModal && (
          <BtHero>
            <BtPageHeader eyebrow="Entry details" title="Entry details" subtitle="Open an entry from Log or Reports to see it here." />
          </BtHero>
        )}
        <BtSheet overlap={isModal ? 0 : 26}>
          <BtCard padding="8px">
            <BtEmpty
              icon={AlertTriangle}
              title="No entry selected"
              message="Open an entry from the Log or Reports page to see its details."
              actionLabel="Go back"
              onAction={goBack}
            />
          </BtCard>
        </BtSheet>
      </div>
    );
  }

  const tc = resolveType(entry.type) || { label: 'Entry', tone: 'neutral', color: 'var(--ink-2)', bg: 'var(--fill)', icon: FileText };
  const TypeIcon = tc.icon;
  const isIncome = tc.tone === 'income';
  const role = (user?.role || '').toLowerCase();
  // The server only accepts deletes from Admins or users holding `delete_entry`.
  const canDelete = role === 'admin' || can('delete_entry');
  const canRecordPayment = can('mark_paid') || can('approve_payments') || role === 'admin';

  const entryId = entry._id || entry.id;
  const totalAmt = Number(entry.amount || 0);
  const paidAmt = Number(entry.paidAmount || 0);
  const outstandingAmt = Math.max(0, totalAmt - paidAmt);

  const gstPct = Number(entry.gstPercentage || entry.gst || 0);
  const isWithGst = Boolean(entry.isWithGst || gstPct > 0);
  const taxableBase = isWithGst && gstPct > 0 ? totalAmt / (1 + gstPct / 100) : totalAmt;
  const gstTaxAmt = totalAmt - taxableBase;

  const paymentHistory = entry.paymentHistory || [];
  const projectName = entry.project?.projectName || entry.projectName || '';

  const payDateVal = entry.paymentDate || (entry.paidAmount > 0 ? (paymentHistory[0]?.date || entry.date) : null);

  const fields = [
    { icon: Calendar, label: 'Date', value: formatDateTime(entry.date, entryId) },
    { icon: Hash, label: 'Entry ID', value: entryId || '—', mono: true },
    { icon: Building2, label: 'Project', value: projectName || 'No project', dim: !projectName },
    { icon: MapPin, label: 'Location / site', value: entry.site || entry.location || '—' },
    { icon: User, label: 'Supplier / vendor', value: entry.supplier || entry.vendor || entry.contractor || entry.workerName || '—' },
    { icon: UserCheck, label: 'Operator / worker', value: entry.operator || entry.workerName || '—' },
    { icon: Phone, label: 'Contact', value: entry.contact || entry.phone || '—' },
    { icon: FileText, label: 'Category', value: entry.category || entry.materialType || entry.workType || '—' },
    { icon: Package, label: 'Quantity', value: entry.quantity ? `${entry.quantity} ${entry.unit || ''}`.trim() : '—' },
    { icon: CreditCard, label: 'Rate', value: entry.rate ? formatInr(entry.rate) : '—' },
    { icon: IndianRupee, label: 'Total amount', value: formatInr(totalAmt), strong: true },
    { icon: CheckCircle, label: 'Payment status', value: entry.paymentStatus ? paymentLabel(entry.paymentStatus) : '—' },
    ...(payDateVal ? [{ icon: Clock, label: 'Payment date & time', value: formatDateTime(payDateVal, entryId) }] : []),
    ...(entry.paymentMode ? [{ icon: CreditCard, label: 'Payment mode', value: entry.paymentMode }] : []),
  ];

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approvalAPI.approve(entryId);
      btToast('Entry approved');
      setIsPending(false);
    } catch {
      btToast('Could not approve this entry', { error: true });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await approvalAPI.reject(entryId, 'Rejected by manager');
      btToast('Entry rejected');
      setIsPending(false);
      goBack();
    } catch {
      btToast('Could not reject this entry', { error: true });
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setShowDelete(false);
    try {
      await transactionAPI.delete(entryId);
      btToast('Entry deleted');
      goBack();
    } catch {
      setDeleting(false);
      btToast('Could not delete this entry', { error: true });
    }
  };

  const handlePaymentSaved = async (msg) => {
    btToast(msg || 'Payment recorded');
    try {
      const res = await transactionAPI.getById(entryId);
      if (res.data?.transaction) {
        setEntry(res.data.transaction);
      }
    } catch {
      // the saved payment is already confirmed by the toast; the next load will refresh the totals
    }
  };

  const deleteButton = canDelete ? (
    <BtButton variant={isModal ? 'destructive' : 'onDark'} size="small" icon={Trash2} onClick={() => setShowDelete(true)} disabled={deleting}>
      Delete
    </BtButton>
  ) : null;

  const body = (
    <div style={{ maxWidth: isModal ? undefined : 960, margin: '0 auto' }}>
      {/* Summary */}
      <BtCard padding="22px" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div
              aria-hidden="true"
              style={{ width: 52, height: 52, borderRadius: 'var(--r-input)', background: tc.bg, color: tc.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}
            >
              <TypeIcon size={22} strokeWidth={1.9} />
            </div>
            <div style={{ minWidth: 0 }}>
              <BtBadge tone={tc.tone} label={tc.label} />
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginTop: 8, overflowWrap: 'anywhere' }}>
                {entry.title || 'Untitled entry'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              className="tnum"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: isIncome ? 'var(--status-success)' : 'var(--ink)',
                lineHeight: 1.1,
              }}
            >
              {isIncome ? '+' : ''}{formatInr(totalAmt)}
            </div>
            <div style={{ marginTop: 8 }}>
              <BtBadge tone={paymentTone(entry.paymentStatus)} label={entry.paymentStatus ? paymentLabel(entry.paymentStatus) : 'Not paid'} />
            </div>
          </div>
        </div>
      </BtCard>

      {/* Payment summary */}
      <Section
        title="Payment summary"
        icon={Receipt}
        action={
          canRecordPayment && outstandingAmt > 0 ? (
            <BtButton variant="primary" size="small" icon={Receipt} onClick={() => setShowPaymentSheet(true)}>
              Record payment
            </BtButton>
          ) : null
        }
      >
        <div className="bt-grid-3">
          <StatTile label="Total bill" value={formatInr(totalAmt)} />
          <StatTile label="Paid" value={formatInr(paidAmt)} color="var(--status-success)" />
          <StatTile label="Outstanding" value={formatInr(outstandingAmt)} color={outstandingAmt > 0 ? 'var(--status-danger)' : 'var(--status-success)'} />
        </div>
        {totalAmt > 0 && (
          <div style={{ marginTop: 16 }}>
            <BtProgress value={Math.min(1, paidAmt / totalAmt)} color="var(--status-success-bright)" />
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
              {Math.round(Math.min(1, paidAmt / totalAmt) * 100)}% of the bill is paid
            </div>
          </div>
        )}
      </Section>

      {isWithGst && (
        <Section
          title="GST and tax"
          icon={FileCheck}
          badge={<BtBadge tone="brand" label={gstPct > 0 ? `${gstPct}% GST` : 'GST included'} />}
        >
          <div className="bt-grid-3">
            <StatTile label="Taxable base" value={formatInr(taxableBase)} />
            <StatTile label={`GST (${gstPct}%)`} value={formatInr(gstTaxAmt)} />
            <StatTile label="Net total" value={formatInr(totalAmt)} />
          </div>
        </Section>
      )}

      <Section title={`Payment history (${paymentHistory.length})`} icon={Clock}>
        {paymentHistory.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0' }}>
            No payments recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {paymentHistory.map((log, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 0',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--line)',
                }}
              >
                <div
                  className="tnum"
                  style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--fill)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 13, fontWeight: 600 }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--status-success)' }}>
                      +{formatInr(log.amount)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{formatDateTime(log.date || log.createdAt, log._id || log.id || entryId)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    <BtBadge tone="neutral" showDot={false} label={log.method || 'Cash'} />
                    {log.note && <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{log.note}</span>}
                  </div>
                  {log.receipt && (
                    <a
                      href={log.receipt}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13.5, color: 'var(--accent-ink)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontWeight: 600 }}
                    >
                      <ExternalLink size={13} /> View receipt
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Entry information" icon={FileText}>
        <div className="bt-grid-2" style={{ columnGap: 28, rowGap: 0 }}>
          {fields.map((f) => {
            const FieldIcon = f.icon;
            return (
              <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--line)', minWidth: 0 }}>
                <FieldIcon size={15} strokeWidth={1.8} color="var(--ink-3)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="bt-eyebrow" style={{ color: 'var(--ink-3)' }}>{f.label}</div>
                  <div
                    className={f.strong ? 'tnum' : undefined}
                    style={{
                      fontSize: 15,
                      fontWeight: f.strong ? 700 : 500,
                      color: f.dim ? 'var(--ink-3)' : 'var(--ink)',
                      marginTop: 3,
                      overflowWrap: 'anywhere',
                      fontFamily: f.mono ? 'var(--font-mono)' : undefined,
                      ...(f.mono ? { fontSize: 13 } : {}),
                    }}
                  >
                    {f.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {entry.notes && (
        <Section title="Notes" icon={FileText}>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, overflowWrap: 'anywhere' }}>{entry.notes}</p>
        </Section>
      )}

      {((entry.eSignStatus && String(entry.eSignStatus).toLowerCase().replace(/[\s_-]/g, '') !== 'notrequested') || entry.signatureData) && (
        <Section
          title="E-signature"
          icon={FileCheck}
          badge={
            <BtBadge
              tone={entry.eSignStatus === 'Signed' || entry.signatureData ? 'success' : 'warning'}
              label={entry.eSignStatus || (entry.signatureData ? 'Signed' : 'Pending')}
            />
          }
        >
          {entry.signatureData ? (
            <div style={{ background: 'var(--bone)', borderRadius: 'var(--r-tile)', padding: 16, display: 'flex', justifyContent: 'center', border: '1px dashed var(--input-border)' }}>
              <img
                src={entry.signatureData.startsWith('data:image') ? entry.signatureData : `data:image/png;base64,${entry.signatureData}`}
                alt="E-signature"
                style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--ink-3)', padding: '8px 0', textAlign: 'center' }}>
              Signature pending from the field agent.
            </div>
          )}
        </Section>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {isPending && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <BtButton variant="destructive" size="normal" icon={XCircle} loading={rejecting} disabled={approving} onClick={handleReject} style={{ flex: '1 1 180px' }}>
              Reject
            </BtButton>
            <BtButton variant="primary" size="normal" icon={CheckCircle} loading={approving} disabled={rejecting} onClick={handleApprove} style={{ flex: '1 1 180px' }}>
              Approve
            </BtButton>
          </div>
        )}
        <BtButton
          variant="secondary"
          size="normal"
          icon={Pencil}
          fullWidth
          onClick={() => navigate('/manualentry', { state: { transaction: { ...entry, isEditing: true } } })}
        >
          Edit entry
        </BtButton>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--ground)', minHeight: isModal ? undefined : '100vh', fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>
      {isModal ? (
        <div style={{ padding: '20px 24px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <BtButton variant="secondary" size="small" icon={ArrowLeft} onClick={goBack}>Back</BtButton>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Entry details</h2>
          </div>
          {deleteButton}
        </div>
      ) : (
        <BtHero>
          <BtPageHeader
            back={{ label: 'Back', onClick: goBack }}
            eyebrow="Entry details"
            title={entry.title || tc.label}
            subtitle={`${projectName || 'No project'} · ${formatDate(entry.date)}`}
            size="md"
            actions={deleteButton}
          />
        </BtHero>
      )}

      <BtSheet overlap={isModal ? 0 : 26} padding={isModal ? '16px 24px 40px' : '24px 28px 56px'}>
        {body}
      </BtSheet>

      <ConfirmDialog
        open={showDelete}
        danger
        message={`Delete "${entry.title || 'this entry'}"? This cannot be undone.`}
        confirmLabel="Delete entry"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      {showPaymentSheet && (
        <RecordPaymentSheet
          open={showPaymentSheet}
          entry={{ rawTx: entry }}
          onClose={() => setShowPaymentSheet(false)}
          onSaved={handlePaymentSaved}
        />
      )}
    </div>
  );
}
