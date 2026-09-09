import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Badge, Button, Spinner, Toast, ConfirmDialog } from '../components/ui';
import { transactionAPI, approvalAPI } from '../api';
import RecordPaymentSheet from '../components/RecordPaymentSheet';
import { useAuth } from '../contexts/AuthContext';
import {
  Package, User, Wrench, DollarSign, ArrowLeft, Trash2, Calendar,
  CreditCard, Building2, Hash, FileText, AlertTriangle, CheckCircle,
  XCircle, Clock, MapPin, Phone, UserCheck, FileCheck, ExternalLink,
  Receipt, PlusCircle
} from 'lucide-react';

const typeConfig = {
  Materials: { label: 'Material', bg: '#FFF5F0', color: '#F97316', icon: <Package size={18} /> },
  Wages: { label: 'Labour', bg: '#F0FDF4', color: '#22C55E', icon: <User size={18} /> },
  Expense: { label: 'Equipment', bg: '#FFF7ED', color: '#F97316', icon: <Wrench size={18} /> },
  Income: { label: 'Income', bg: '#FFF7F0', color: '#EA580C', icon: <DollarSign size={18} /> },
};

function formatCurrency(amount) {
  return '\u20B9' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export default function EntryDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, can } = useAuth();
  const [entry, setEntry] = useState(location.state?.entry);
  const [isPending, setIsPending] = useState(location.state?.isPending);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  if (!entry) {
    return (
      <div style={{ padding: '40px 28px', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
        <h3 style={{ color: '#111827', margin: '0 0 8px', fontWeight: 700 }}>No Entry Data</h3>
        <p style={{ color: '#64748B', marginBottom: 20 }}>Please navigate here from a transaction or entry list.</p>
        <Button variant="secondary" size="md" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Go Back
        </Button>
      </div>
    );
  }

  if (deleted) {
    return (
      <div style={{ padding: '40px 28px', textAlign: 'center' }}>
        <CheckCircle size={48} color="#22C55E" style={{ marginBottom: 16 }} />
        <h3 style={{ color: '#111827', margin: '0 0 8px', fontWeight: 700 }}>Entry Deleted</h3>
        <p style={{ color: '#64748B', marginBottom: 20 }}>This entry has been successfully removed.</p>
        <Button variant="secondary" size="md" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Go Back
        </Button>
      </div>
    );
  }

  const tc = typeConfig[entry.type] || { label: 'Entry', bg: '#F1F5F9', color: '#64748B', icon: <FileText size={18} /> };
  const canDelete = user?.role === 'Admin' || can('delete_project');
  const canRecordPayment = can('mark_paid') || can('approve_payments') || user?.role === 'Admin';

  const totalAmt = Number(entry.amount || 0);
  const paidAmt = Number(entry.paidAmount || 0);
  const outstandingAmt = Math.max(0, totalAmt - paidAmt);

  const gstPct = Number(entry.gstPercentage || entry.gst || 0);
  const isWithGst = Boolean(entry.isWithGst || gstPct > 0);
  const taxableBase = isWithGst && gstPct > 0 ? (totalAmt / (1 + gstPct / 100)) : totalAmt;
  const gstTaxAmt = totalAmt - taxableBase;

  const paymentHistory = entry.paymentHistory || [];

  const fields = [
    { icon: <Calendar size={14} />, label: 'Date', value: formatDate(entry.date) },
    { icon: <Hash size={14} />, label: 'Entry ID', value: entry._id || entry.id || '\u2014' },
    { icon: <Building2 size={14} />, label: 'Project', value: entry.project?.projectName || entry.projectName || '\u2014' },
    { icon: <MapPin size={14} />, label: 'Location/Site', value: entry.site || entry.location || '\u2014' },
    { icon: <User size={14} />, label: 'Supplier/Vendor', value: entry.supplier || entry.vendor || entry.contractor || entry.workerName || '\u2014' },
    { icon: <UserCheck size={14} />, label: 'Operator/Worker', value: entry.operator || entry.workerName || '\u2014' },
    { icon: <Phone size={14} />, label: 'Contact', value: entry.contact || entry.phone || '\u2014' },
    { icon: <FileText size={14} />, label: 'Category', value: entry.category || entry.materialType || entry.workType || '\u2014' },
    { icon: <Package size={14} />, label: 'Quantity', value: entry.quantity ? `${entry.quantity} ${entry.unit || ''}` : '\u2014' },
    { icon: <CreditCard size={14} />, label: 'Rate', value: entry.rate ? formatCurrency(entry.rate) : '\u2014' },
    { icon: <DollarSign size={14} />, label: 'Total Amount', value: formatCurrency(entry.amount), highlight: true },
    { icon: <CheckCircle size={14} />, label: 'Payment Status', value: entry.paymentStatus || '\u2014' },
  ];

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approvalAPI.approve(entry._id || entry.id);
      setToastMsg("Entry approved successfully");
      setIsPending(false);
    } catch { setToastMsg("Failed to approve"); }
    finally { setApproving(false); }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await approvalAPI.reject(entry._id || entry.id, "Rejected by manager");
      setToastMsg("Entry rejected");
      setIsPending(false);
      navigate(-1);
    } catch { setToastMsg("Failed to reject"); }
    finally { setRejecting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await transactionAPI.delete(entry._id || entry.id);
      setDeleted(true);
    } catch {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handlePaymentSaved = async (msg) => {
    setToastMsg(msg);
    try {
      const res = await transactionAPI.getById(entry._id || entry.id);
      if (res.data?.transaction) {
        setEntry(res.data.transaction);
      }
    } catch {

    }
    setTimeout(() => setToastMsg(""), 4000);
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 680, margin: '0 auto', fontFamily: "Inter, 'Segoe UI', sans-serif" }}>
      {toastMsg && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", color: "#166534", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={14} /> {toastMsg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)}
            style={{ border: 'none', background: '#F1F5F9', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.03em' }}>Entry Details</h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>{entry.title || tc.label}</p>
          </div>
        </div>
        {canDelete && (
          <button onClick={() => setShowDelete(true)}
            style={{ border: '1px solid #FECACA', borderRadius: 8, padding: '8px 14px', background: '#fff', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>

      <Card padding="20px" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tc.color }}>
              {tc.icon}
            </div>
            <div>
              <Badge variant={entry.type === 'Wages' ? 'success' : entry.type === 'Expense' ? 'warning' : 'info'} size="sm">{tc.label}</Badge>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 6 }}>{entry.title || 'Untitled Entry'}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: entry.type === 'Income' ? '#22C55E' : '#111827', letterSpacing: '-0.03em' }}>
              {entry.type === 'Income' ? '+' : '-'}{formatCurrency(entry.amount)}
            </div>
            <Badge variant={entry.paymentStatus === 'Paid' ? 'success' : entry.paymentStatus === 'Partial' ? 'warning' : 'info'} size="sm">{entry.paymentStatus || '\u2014'}</Badge>
          </div>
        </div>
      </Card>

      <Card padding="20px" style={{ marginBottom: 16, background: '#FAFAFA', border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Summary</div>
          {canRecordPayment && outstandingAmt > 0 && (
            <button onClick={() => setShowPaymentSheet(true)}
              style={{ border: 'none', background: '#F97316', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Receipt size={14} /> Record Payment
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ background: '#fff', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>TOTAL BILL</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginTop: 2 }}>{formatCurrency(totalAmt)}</div>
          </div>
          <div style={{ background: '#fff', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>PAID AMOUNT</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginTop: 2 }}>{formatCurrency(paidAmt)}</div>
          </div>
          <div style={{ background: '#fff', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>OUTSTANDING</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', marginTop: 2 }}>{formatCurrency(outstandingAmt)}</div>
          </div>
        </div>
      </Card>

      {isWithGst && (
        <Card padding="20px" style={{ marginBottom: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCheck size={16} color="#F97316" /> GST & Tax Breakdown
            </div>
            <Badge variant="info" size="sm">{gstPct > 0 ? `${gstPct}% GST` : 'GST Included'}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, background: '#F8FAFC', padding: 12, borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Taxable Base</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginTop: 2 }}>{formatCurrency(taxableBase)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748B' }}>GST Tax ({gstPct}%)</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F97316', marginTop: 2 }}>{formatCurrency(gstTaxAmt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Net Total</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 2 }}>{formatCurrency(totalAmt)}</div>
            </div>
          </div>
        </Card>
      )}

      <Card padding="20px" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={16} color="#F97316" /> Payment History Timeline ({paymentHistory.length})
        </h3>
        {paymentHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
            No partial payments recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paymentHistory.map((log, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: idx < paymentHistory.length - 1 ? '1px dashed #E2E8F0' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>
                  #{idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>+{formatCurrency(log.amount)}</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{formatDate(log.date)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant="outline" size="sm">{log.method || 'Cash'}</Badge>
                    {log.note && <span style={{ color: '#64748B' }}>{log.note}</span>}
                  </div>
                  {log.receipt && (
                    <a href={log.receipt} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#F97316', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 600 }}>
                      <ExternalLink size={12} /> View Receipt
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="20px" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 14px' }}>Entry Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {fields.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
              <span style={{ color: '#94A3B8', display: 'flex', flexShrink: 0 }}>{f.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.03em', textTransform: 'uppercase' }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: f.highlight ? 700 : 500, color: f.highlight ? '#F97316' : '#111827' }}>{f.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {entry.notes && (
        <Card padding="20px" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>Notes</h3>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>{entry.notes}</p>
        </Card>
      )}

      {((entry.eSignStatus && entry.eSignStatus !== 'Not requested') || entry.signatureData) && (
        <Card padding="20px" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCheck size={16} color="#10B981" /> E-Signature Verification
            </h3>
            <Badge variant={entry.eSignStatus === 'Signed' || entry.signatureData ? 'success' : 'warning'} size="sm">
              {entry.eSignStatus || (entry.signatureData ? 'Signed' : 'Pending')}
            </Badge>
          </div>
          {entry.signatureData ? (
            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'center', border: '1px dashed #CBD5E1' }}>
              <img 
                src={entry.signatureData.startsWith('data:image') ? entry.signatureData : `data:image/png;base64,${entry.signatureData}`} 
                alt="E-Signature" 
                style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} 
              />
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
              Signature pending from field agent.
            </div>
          )}
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isPending && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="danger" size="md" fullWidth onClick={handleReject} disabled={rejecting}>
              <XCircle size={14} /> {rejecting ? '...' : 'Reject'}
            </Button>
            <Button variant="primary" size="md" fullWidth onClick={handleApprove} disabled={approving}>
              <CheckCircle size={14} /> {approving ? '...' : 'Approve'}
            </Button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" fullWidth onClick={() => navigate('/manualentry', { state: { transaction: { ...entry, isEditing: true } } })}>
            <FileText size={14} /> Edit Entry
          </Button>
        </div>
      </div>

      {showDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
          onClick={() => setShowDelete(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 400, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Delete Entry?</h3>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>This action cannot be undone. Are you sure you want to delete this entry?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="md" fullWidth onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" size="md" fullWidth onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
