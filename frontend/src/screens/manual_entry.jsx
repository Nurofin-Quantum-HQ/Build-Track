import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transactionAPI } from '../api';
import useProjectStore from '../stores/projectStore';
import {
  BtHero,
  BtSheet,
  BtButton,
  BtCard,
  BtBadge,
  BtChip,
  BtField,
  BtSelect,
  BtTextarea,
  BtSegmented,
  BtPageHeader,
  BtIconButton,
  formatInr,
  showBtSuccess,
  btToast,
} from '../components/ui';
import { Building2, HelpCircle, X, Paperclip, Camera, Package, Users, Truck, Receipt, CreditCard, FileText, AlertCircle, Trash2 } from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import PayNowSheet from '../components/PayNowSheet';
import { useAuth } from '../contexts/AuthContext';

const ENTRY_TYPES = [
  { value: 'material', label: 'Material' },
  { value: 'labour', label: 'Labour' },
  { value: 'equipment', label: 'Equipment' },
];

const UNIT_OPTIONS = {
  material: ['Bags', 'Kg', 'Tonnes', 'Sq.Ft', 'Cubic Ft', 'Pieces', 'Liters', 'Unit'],
  labour: ['Day', 'Hour', 'Sq.Ft', 'Unit'],
  equipment: ['Day', 'Hour', 'Week', 'Month', 'Trip'],
};

const normalizeUnitForApi = (u) => {
  if (!u) return 'unit';
  const s = String(u).trim().toLowerCase();
  if (s === 'bags' || s === 'bag') return 'bag';
  if (s === 'kg' || s === 'kgs') return 'kg';
  if (s === 'tonnes' || s === 'ton' || s === 'tons') return 'ton';
  if (s === 'sq.ft' || s === 'sqft' || s === 'sq ft') return 'sqft';
  if (s === 'cubic ft' || s === 'cft') return 'sqft';
  if (s === 'day' || s === 'days') return 'day';
  if (s === 'hour' || s === 'hours') return 'hour';
  if (s === 'liters' || s === 'ltr' || s === 'ltrs') return 'ltr';
  if (s === 'trip' || s === 'truck') return 'truck';
  return 'unit';
};

const findMatchingUnitOption = (raw, type) => {
  if (!raw) return (UNIT_OPTIONS[type] || [])[0] || 'Unit';
  const list = UNIT_OPTIONS[type] || [];
  const clean = String(raw).trim().toLowerCase();
  const direct = list.find((opt) => opt.toLowerCase() === clean);
  if (direct) return direct;
  const singular = clean.replace(/s$/, '');
  const match = list.find((opt) => opt.toLowerCase().replace(/s$/, '') === singular);
  if (match) return match;
  if (clean === 'bag' && list.includes('Bags')) return 'Bags';
  if (clean === 'ton' && list.includes('Tonnes')) return 'Tonnes';
  if (clean === 'sqft' && list.includes('Sq.Ft')) return 'Sq.Ft';
  if (clean === 'truck' && list.includes('Trip')) return 'Trip';
  return list[0] || 'Unit';
};

const GST_PERCENTAGES = [0, 5, 12, 18, 28];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Credit'];

const NAME_KEY = { material: 'itemName', labour: 'workerName', equipment: 'equipmentName' };
const NAME_LABEL = { material: 'Material / item name', labour: 'Worker / team name', equipment: 'Equipment name' };
const NAME_PLACEHOLDER = {
  material: 'e.g. 53-Grade OPC Cement, Steel TMT Bars, River Sand',
  labour: 'e.g. Ramesh Masons, Plastering Crew Team 1',
  equipment: 'e.g. JCB 3DX Backhoe, Concrete Mixer 10/7',
};
const SECTION_ICON = { material: Package, labour: Users, equipment: Truck };
const SECTION_TITLE = { material: 'Material details', labour: 'Labour and crew shift', equipment: 'Equipment and machinery' };
const QTY_LABEL = { material: 'Quantity', labour: 'Number of workers', equipment: 'Quantity (hours or days)' };

const AUTOCOMPLETE_FIELDS = {
  material: {
    itemName: ['Cement', 'Sand', 'Gravel', 'Steel', 'Bricks', 'Blocks', 'Tiles', 'Pipes', 'Wires', 'Paint'],
  },
  labour: {
    workerName: ['Team A', 'Team B', 'Mason Team', 'Ramesh & Co.', 'Shankar Masons'],
  },
  equipment: {
    equipmentName: ['JCB Excavator', 'Tower Crane', 'Concrete Mixer', 'Bulldozer', 'Compactor', 'Generator'],
  },
};

const money = (v) => '₹' + (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatPaymentDateTime(dateStr, rawId = null) {
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

const fileToDataUri = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

function CardTitle({ icon: Icon, children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      {Icon && (
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--r-chip)',
            background: 'var(--fill)',
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} strokeWidth={1.9} />
        </span>
      )}
      <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        {children}
      </h2>
      {right}
    </div>
  );
}

function Eyebrow({ children, style }) {
  return (
    <div className="bt-eyebrow" style={{ color: 'var(--ink-3)', marginBottom: 8, ...style }}>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, strong, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, fontSize: 14, color: tone || 'var(--ink-2)' }}>
      <span style={{ overflowWrap: 'anywhere' }}>{label}</span>
      <span className="tnum" style={{ fontWeight: strong ? 700 : 600, color: tone || 'var(--ink)', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  );
}

export default function ManualEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can, isAdmin } = useAuth();

  const allowedTypes = useMemo(() => {
    const types = [];
    if (isAdmin || can('manage_expenses') || can('add_entries')) types.push('material');
    if (isAdmin || can('add_entries') || can('submit_daily_update')) types.push('labour');
    if (isAdmin || can('manage_equipment_master')) types.push('equipment');
    return types;
  }, [can, isAdmin]);

  const canMarkPaid = isAdmin || can('approve_payments') || can('mark_paid');

  const [entryType, setEntryType] = useState(() => (allowedTypes.length > 0 ? allowedTypes[0] : 'material'));
  const [projects, setProjects] = useState(() => {
    return useProjectStore.getState().projects || [];
  });
  const [selectedProject, setSelectedProject] = useState(() => {
    const initialProjects = useProjectStore.getState().projects || [];
    const passed = location.state?.project;
    if (passed) {
      const pid = typeof passed === 'object' ? (passed._id || passed.id || '') : String(passed);
      if (initialProjects.some((p) => (p._id || p.id) === pid)) {
        return pid;
      }
    }
    const qProject = new URLSearchParams(location.search).get('project');
    if (qProject && initialProjects.some((p) => (p._id || p.id) === qProject)) {
      return qProject;
    }
    const storeSel = useProjectStore.getState().selectedProject?._id;
    if (storeSel && initialProjects.some((p) => (p._id || p.id) === storeSel)) {
      return storeSel;
    }
    return '';
  });
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [values, setValues] = useState({});
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [errors, setErrors] = useState({});

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [, setSourceTransactionId] = useState(null);
  const [runTour, setRunTour] = useState(false);

  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [selectedActivityName, setSelectedActivityName] = useState('');

  const [isWithGst, setIsWithGst] = useState(false);
  const [gstPercentage, setGstPercentage] = useState(18);

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPayNow, setShowPayNow] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const [attachments, setAttachments] = useState([]);
  const attachmentInputRef = useRef(null);

  const tourSteps = [
    { target: '.tour-header', content: 'Here you can manually log materials, labour, or equipment.', disableBeacon: true },
    { target: '.tour-entry-types', content: 'Choose the type of entry you want to record.' },
    { target: '.tour-project-context', content: 'Select the project, phase, and activity for this entry.' },
    { target: '.tour-field-item', content: 'Fill in the details for the specific item, rate, and quantity.' },
    { target: '.tour-amount-calc', content: 'The total amount is calculated automatically.' },
    { target: '.tour-payment', content: 'Mark if the entry is already paid and specify the payment method.' },
    { target: '.tour-attachments', content: 'Upload bills, receipts, or site photos for this entry.' },
    { target: '.tour-save-btn', content: 'Click here to save the manual entry.' },
  ];

  const selectedProjectData = useMemo(() => {
    return projects.find((p) => p._id === selectedProject) || null;
  }, [projects, selectedProject]);

  const floors = useMemo(() => selectedProjectData?.floors || [], [selectedProjectData]);
  const phases = useMemo(() => selectedProjectData?.selectedPhases || [], [selectedProjectData]);

  const uniqueActivityNames = useMemo(() => {
    if (!selectedProjectData) return [];
    const activities = [];
    if (selectedPhaseId) {
      const match = phases.find((ph) => String(ph.id) === selectedPhaseId);
      activities.push(...(match?.activities || []));
    } else {
      activities.push(...(selectedProjectData.selectedPhases?.flatMap((p) => p.activities || []) || []));
    }
    return [...new Set(activities.map((a) => a.name))];
  }, [selectedProjectData, phases, selectedPhaseId]);

  useEffect(() => {
    useProjectStore
      .getState()
      .fetchContext()
      .then((list) => {
        const validList = list || [];
        setProjects(validList);
        const passed = location.state?.project;
        const passedId = passed ? (typeof passed === 'object' ? (passed._id || passed.id || '') : String(passed)) : null;
        if (passedId && validList.some((p) => (p._id || p.id) === passedId)) {
          setSelectedProject(passedId);
        } else {
          setSelectedProject((prev) => (validList.some((p) => (p._id || p.id) === prev) ? prev : ''));
        }
      })
      .catch(() => {});
  }, [location.state]);

  useEffect(() => {
    if (allowedTypes.length === 0) {
      navigate('/');
    } else if (!isEditing && !allowedTypes.includes(entryType)) {
      setEntryType(allowedTypes[0]);
    }
  }, [allowedTypes, entryType, isEditing, navigate]);

  // Initial query / state population
  useEffect(() => {
    if (location.state && location.state.transaction) {
      const tx = location.state.transaction;
      setIsEditing(true);
      setEditingId(tx._id || tx.id);

      const typeMapRev = { Materials: 'material', Wages: 'labour', Expense: 'equipment' };
      const eType = typeMapRev[tx.type] || 'material';
      setEntryType(eType);
      setSelectedProject(tx.project?._id || tx.project || '');
      if (tx.date || tx.createdAt) {
        setDate(new Date(tx.date || tx.createdAt).toISOString().split('T')[0]);
      }
      setNotes(tx.notes || '');
      setUnit(findMatchingUnitOption(tx.unit, eType));
      setSelectedFloor(tx.floor || '');
      setSelectedPhaseId(tx.phaseId || tx.phase || '');
      setSelectedActivityName(tx.activity || '');
      setIsWithGst(tx.isWithGst || false);
      setGstPercentage(tx.gstPercentage || 18);
      setPaymentMethod(tx.paymentMethod || 'Cash');
      setPaymentHistory(tx.paymentHistory || []);

      const nameVal = tx.title || tx.materialName || tx.workerName || tx.equipmentName || '';
      if (eType === 'material') {
        setValues({
          itemName: nameVal,
          quantity: tx.quantity || '',
          rate: tx.rate || '',
          brand: tx.brand || '',
          supplier: tx.supplier || '',
        });
      } else if (eType === 'labour') {
        setValues({
          workerName: nameVal,
          quantity: tx.quantity || '',
          rate: tx.rate || '',
          workType: tx.workType || '',
          contractor: tx.contractor || '',
          overtime: tx.overtime || '',
        });
      } else if (eType === 'equipment') {
        setValues({
          equipmentName: nameVal,
          quantity: tx.quantity || '',
          rate: tx.rate || '',
          model: tx.model || '',
          operator: tx.operator || '',
        });
      }
    } else {
      const params = new URLSearchParams(location.search);
      const qType = params.get('type');
      const qProject = params.get('project');
      const qName = params.get('name');
      const qUnit = params.get('unit');
      const qBrand = params.get('brand');
      const qIsDuplicate = params.get('isDuplicate') === 'true';
      const qSourceTxId = params.get('sourceTransactionId');

      setIsEditing(false);
      setIsDuplicate(qIsDuplicate);
      setSourceTransactionId(qIsDuplicate ? qSourceTxId : null);

      if (qType && ['material', 'labour', 'equipment'].includes(qType)) {
        setEntryType(qType);
      }
      if (qProject) {
        setSelectedProject(qProject);
      }
      if (qUnit) {
        setUnit(qUnit);
      }
      if (qName) {
        const nameKey = qType === 'material' ? 'itemName' : qType === 'labour' ? 'workerName' : 'equipmentName';
        setValues((prev) => ({
          ...prev,
          [nameKey]: qName,
          brand: qBrand || '',
        }));
      }

      if (location.state?.project) {
        const proj = location.state.project;
        const pid = typeof proj === 'object' ? (proj._id || proj.id || '') : String(proj);
        if (pid) {
          setProjects((prev) => {
            if (prev.some((p) => (p._id || p.id) === pid)) {
              setSelectedProject(pid);
            }
            return prev;
          });
        }
      }
      if (location.state?.prefill) {
        const prefill = location.state.prefill;
        if (prefill.phase) setSelectedPhaseId(prefill.phase);
        if (prefill.activity) setSelectedActivityName(prefill.activity);
      }
    }
  }, [location.state, location.search]);

  // Default unit if not set
  useEffect(() => {
    const opts = UNIT_OPTIONS[entryType];
    if (!opts) return;
    if (!unit || (!isEditing && !opts.includes(unit))) {
      setUnit(opts[0]);
    }
  }, [entryType, unit, isEditing]);

  const handleFieldChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculations
  const qty = parseFloat(values.quantity) || 0;
  const rate = parseFloat(values.rate) || 0;
  const subtotal = qty * rate;
  const overtimeHours = parseFloat(values.overtime) || 0;
  const overtimeRate = rate > 0 ? rate / 8 : 0; // standard 8h day
  const overtimeAmount = overtimeHours * overtimeRate;
  const baseBeforeTax = subtotal + overtimeAmount;
  const gstAmount = isWithGst ? (baseBeforeTax * gstPercentage) / 100 : 0;
  const totalAmount = baseBeforeTax + gstAmount;

  const nameKey = NAME_KEY[entryType];
  const alreadyPaid = useMemo(
    () => (paymentHistory || []).reduce((sum, p) => sum + (Number(p?.amount) || 0), 0),
    [paymentHistory]
  );
  const paidNow = paymentResult ? Number(paymentResult.amount) || 0 : 0;
  const balanceDue = Math.max(0, totalAmount - alreadyPaid - paidNow);

  const validate = () => {
    const next = {};
    if (!selectedProject) next.project = 'Select a project for this entry';
    if (!values[nameKey] || !values[nameKey].trim()) {
      next[nameKey] = `Enter the ${nameKey === 'itemName' ? 'item' : nameKey === 'workerName' ? 'worker' : 'equipment'} name`;
    }
    if (qty <= 0) next.quantity = 'Enter a quantity greater than 0';
    if (rate <= 0) next.rate = 'Enter a rate greater than 0';
    return next;
  };

  const FIELD_IDS = { project: 'me-project', [nameKey]: 'me-name', quantity: 'me-quantity', rate: 'me-rate' };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrMsg('');

    const found = validate();
    setErrors(found);
    const firstKey = ['project', nameKey, 'quantity', 'rate'].find((k) => found[k]);
    if (firstKey) {
      const el = document.getElementById(FIELD_IDS[firstKey]);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
      }
      return;
    }

    setSaving(true);

    try {
      const typeMap = { material: 'Materials', labour: 'Wages', equipment: 'Expense' };
      const phaseObj = phases.find((ph) => String(ph.id) === selectedPhaseId);
      const phaseName = phaseObj?.phaseName || selectedPhaseId || '';

      const actObj = phaseObj?.activities?.find((a) => a.name === selectedActivityName);
      const activityId = actObj?.id || '';

      const payload = {
        title: values[nameKey].trim(),
        type: typeMap[entryType],
        project: selectedProject,
        date: (() => {
          const d = new Date(date);
          const now = new Date();
          d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          return d.toISOString();
        })(),
        notes: notes || '',
        quantity: qty,
        rate: rate,
        unit: normalizeUnitForApi(unit),
      };

      if (entryType === 'material') {
        payload.subType = 'Purchase';
        payload.brand = values.brand || '';
        payload.supplier = values.supplier || '';
      } else if (entryType === 'labour') {
        payload.category = values.contractor || '';
        payload.remarks = values.workType || '';
      } else if (entryType === 'equipment') {
        payload.category = values.equipmentName || '';
        payload.supplier = values.operator || '';
        payload.model = values.model || '';
      }

      Object.assign(payload, {
        floor: selectedFloor,
        floorId: '',
        phase: phaseName,
        phaseId: selectedPhaseId,
        activity: selectedActivityName,
        activityId: activityId,
        isWithGst: isWithGst,
        gstPercentage: isWithGst ? gstPercentage : 0,
        gstAmount: gstAmount,
        amount: totalAmount,
        totalAmount: totalAmount,
        overtime: overtimeHours,
        overtimeAmount: overtimeAmount,
      });

      // Payment fields the server actually reads (paidAmount / paymentStatus / paymentMode / paymentDate).
      if (isEditing) {
        let currentHistory = [...paymentHistory];
        if (paymentResult) {
          currentHistory.push({
            date: paymentResult.paymentDate || new Date().toISOString(),
            method: paymentResult.apiMode || paymentResult.method || 'Cash',
            amount: paidNow,
            note: paymentResult.note || '',
          });
        }
        const totalPaid = currentHistory.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
        payload.paymentHistory = currentHistory;
        payload.paidAmount = totalPaid;
        if (totalPaid >= totalAmount && totalAmount > 0) {
          payload.paymentStatus = 'Paid';
        } else if (totalPaid > 0) {
          payload.paymentStatus = 'Partial';
        } else {
          payload.paymentStatus = 'Pending';
        }
        if (currentHistory.length > 0) {
          const last = currentHistory[currentHistory.length - 1];
          payload.paymentMode = last.method || paymentMethod;
          payload.paymentDate = last.date;
        } else {
          payload.paymentMode = paymentMethod !== 'Credit' ? paymentMethod : 'Cash';
        }
        if (paymentResult?.requestEsign && paymentResult.clientEmail) {
          payload.requestEsign = true;
          payload.clientEmail = paymentResult.clientEmail;
        }
        if (paymentResult?.receiptFile) {
          payload.paymentReceipt = await fileToDataUri(paymentResult.receiptFile);
        }
      } else if (paymentResult) {
        payload.paidAmount = alreadyPaid + paidNow;
        payload.paymentStatus = paymentResult.status;
        payload.paymentMode = paymentResult.apiMode;
        payload.paymentDate = paymentResult.paymentDate;
        if (paymentResult.note) payload.paymentNote = paymentResult.note;
        if (paymentResult.requestEsign && paymentResult.clientEmail) {
          payload.requestEsign = true;
          payload.clientEmail = paymentResult.clientEmail;
        }
        if (paymentResult.receiptFile) {
          payload.paymentReceipt = await fileToDataUri(paymentResult.receiptFile);
        }
      } else if (paymentMethod !== 'Credit') {
        payload.paymentMode = paymentMethod;
      }

      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k];
      });

      const hasFiles = attachments.length > 0;
      let finalData = payload;

      if (hasFiles) {
        const formData = new FormData();
        Object.keys(payload).forEach((key) => {
          if (key === 'paymentHistory') {
            formData.append(key, JSON.stringify(payload[key]));
          } else {
            formData.append(key, payload[key]);
          }
        });
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });
        finalData = formData;
      }

      if (isEditing) {
        await transactionAPI.update(editingId, finalData);
        btToast('Entry updated.');
        setTimeout(() => navigate(-1), 1000);
      } else {
        await transactionAPI.create(finalData);

        const typeName = entryType.charAt(0).toUpperCase() + entryType.slice(1);
        const recordedPayment = paidNow > 0;
        showBtSuccess({
          kind: recordedPayment ? 'money' : entryType === 'material' ? 'bags' : 'check',
          title: `${typeName} saved`,
          message: `${values[nameKey]} for ${formatInr(totalAmount)} has been logged to your site ledger.`,
          label: 'Entry saved',
          onDismiss: () => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate('/transaction');
            }
          },
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'save'} entry.`;
      setErrMsg(msg);
      btToast(msg, { error: true });
    } finally {
      setSaving(false);
    }
  };

  const openPayNow = () => {
    if (totalAmount <= 0) {
      const next = { ...errors };
      if (qty <= 0) next.quantity = 'Enter a quantity greater than 0';
      if (rate <= 0) next.rate = 'Enter a rate greater than 0';
      setErrors(next);
      btToast('Enter quantity and rate first, so there is an amount to settle.', { error: true });
      return;
    }
    setShowPayNow(true);
  };

  const lockedType = isEditing || isDuplicate;
  const typeOptions = ENTRY_TYPES.filter((t) => allowedTypes.includes(t.value));

  const vendorName = values.supplier || values.operator || values.contractor || '';

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="ManualEntry" />

      <div className="tour-header">
        <BtHero>
          <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
            <BtPageHeader
              back={{ label: 'Back', onClick: () => navigate(-1) }}
              eyebrow={isEditing ? 'Edit transaction' : isDuplicate ? 'Repeat entry' : 'Manual entry'}
              title={isEditing ? 'Edit entry' : isDuplicate ? 'Repeat entry' : 'Manual entry'}
              subtitle="Record site spend with tax and payment tracking."
              size="md"
              actions={<BtIconButton icon={HelpCircle} label="Page tour" onDark onClick={() => setRunTour(true)} />}
            >
              <div
                className="tour-entry-types"
                style={{ opacity: lockedType ? 0.6 : 1, pointerEvents: lockedType ? 'none' : 'auto', maxWidth: 420 }}
                aria-disabled={lockedType || undefined}
              >
                <BtSegmented options={typeOptions} value={entryType} onChange={setEntryType} style={{ width: '100%' }} />
              </div>
            </BtPageHeader>
          </div>
        </BtHero>
      </div>

      <BtSheet padding="28px 28px 64px">
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {errMsg && (
            <div
              role="alert"
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                background: 'var(--status-danger-soft)',
                borderRadius: 'var(--r-input)',
                padding: '14px 16px',
                color: 'var(--status-danger)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{errMsg}</span>
            </div>
          )}

          {/* ── Project context ── */}
          <BtCard padding="24px" className="tour-project-context" style={{ overflow: 'visible' }}>
            <CardTitle icon={Building2}>Project context</CardTitle>
            <div className="bt-grid-2">
              <BtSelect
                id="me-project"
                label="Project"
                required
                value={selectedProject}
                error={errors.project}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setSelectedFloor('');
                  setSelectedPhaseId('');
                  setSelectedActivityName('');
                  setErrors((prev) => ({ ...prev, project: undefined }));
                }}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.projectName || p.name}
                  </option>
                ))}
              </BtSelect>

              <BtField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

              <BtSelect
                label="Floor"
                disabled={!selectedProject || floors.length === 0}
                value={selectedFloor}
                helperText={selectedProject && floors.length === 0 ? 'This project has no floors set up' : undefined}
                onChange={(e) => setSelectedFloor(e.target.value)}
              >
                <option value="">All floors</option>
                {floors.map((f, i) => (
                  <option key={i} value={f}>
                    {f}
                  </option>
                ))}
              </BtSelect>

              <BtSelect
                label="Phase"
                disabled={!selectedProject || phases.length === 0}
                value={selectedPhaseId}
                helperText={selectedProject && phases.length === 0 ? 'This project has no phases set up' : undefined}
                onChange={(e) => {
                  setSelectedPhaseId(e.target.value);
                  setSelectedActivityName('');
                }}
              >
                <option value="">Select phase</option>
                {phases.map((ph) => (
                  <option key={ph.id} value={String(ph.id)}>
                    {ph.phaseName}
                  </option>
                ))}
              </BtSelect>

              {uniqueActivityNames.length > 0 && (
                <BtSelect label="Activity" value={selectedActivityName} onChange={(e) => setSelectedActivityName(e.target.value)}>
                  <option value="">Select activity</option>
                  {uniqueActivityNames.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </BtSelect>
              )}
            </div>
          </BtCard>

          {/* ── Item details ── */}
          <BtCard padding="24px" className="tour-field-item" style={{ overflow: 'visible' }}>
            <CardTitle icon={SECTION_ICON[entryType]}>{SECTION_TITLE[entryType]}</CardTitle>

            <div style={{ marginBottom: 18 }}>
              <BtField
                id="me-name"
                label={NAME_LABEL[entryType]}
                required
                value={values[nameKey] || ''}
                error={errors[nameKey]}
                onChange={(e) => handleFieldChange(nameKey, e.target.value)}
                placeholder={NAME_PLACEHOLDER[entryType]}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {(AUTOCOMPLETE_FIELDS[entryType]?.[nameKey] || []).map((sugg) => (
                  <BtChip key={sugg} label={`+ ${sugg}`} onClick={() => handleFieldChange(nameKey, sugg)} style={{ height: 32, padding: '0 12px', fontSize: 13 }} />
                ))}
              </div>
            </div>

            <div className="bt-grid-3" style={{ marginBottom: 18 }}>
              <BtField
                id="me-quantity"
                label={QTY_LABEL[entryType]}
                required
                type="number"
                step="any"
                value={values.quantity || ''}
                error={errors.quantity}
                onChange={(e) => handleFieldChange('quantity', e.target.value)}
                placeholder="0"
              />
              <BtSelect label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
                {(UNIT_OPTIONS[entryType] || []).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </BtSelect>
              <BtField
                id="me-rate"
                label={entryType === 'labour' ? 'Rate per worker' : 'Rate per unit'}
                required
                isCurrency
                type="number"
                step="any"
                value={values.rate || ''}
                error={errors.rate}
                onChange={(e) => handleFieldChange('rate', e.target.value)}
                placeholder="0.00"
              />
            </div>

            {entryType === 'material' && (
              <div className="bt-grid-2">
                <BtField label="Brand / manufacturer" value={values.brand || ''} onChange={(e) => handleFieldChange('brand', e.target.value)} placeholder="e.g. UltraTech, Tata Steel" />
                <BtField label="Supplier / vendor" value={values.supplier || ''} onChange={(e) => handleFieldChange('supplier', e.target.value)} placeholder="e.g. Local Builders Mart" />
              </div>
            )}

            {entryType === 'labour' && (
              <div className="bt-grid-3">
                <BtField label="Trade / work type" value={values.workType || ''} onChange={(e) => handleFieldChange('workType', e.target.value)} placeholder="e.g. Mason, Plasterer" />
                <BtField label="Contractor / agency" value={values.contractor || ''} onChange={(e) => handleFieldChange('contractor', e.target.value)} placeholder="e.g. Sub-contractor name" />
                <BtField label="Overtime hours" type="number" step="any" value={values.overtime || ''} onChange={(e) => handleFieldChange('overtime', e.target.value)} placeholder="0" />
              </div>
            )}

            {entryType === 'equipment' && (
              <div className="bt-grid-2">
                <BtField label="Model / capacity" value={values.model || ''} onChange={(e) => handleFieldChange('model', e.target.value)} placeholder="e.g. 200HP, 10 Tonne" />
                <BtField label="Operator / rental provider" value={values.operator || ''} onChange={(e) => handleFieldChange('operator', e.target.value)} placeholder="e.g. Raj Machinery Fleet" />
              </div>
            )}
          </BtCard>

          {/* ── Taxes and total ── */}
          <BtCard padding="24px" className="tour-amount-calc">
            <CardTitle
              icon={Receipt}
              right={
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', minHeight: 40 }}>
                  <input
                    type="checkbox"
                    checked={isWithGst}
                    onChange={(e) => setIsWithGst(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--ink)', cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Apply GST</span>
                </label>
              }
            >
              Taxes and total
            </CardTitle>

            {isWithGst && (
              <div style={{ marginBottom: 18 }}>
                <Eyebrow>GST rate</Eyebrow>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GST_PERCENTAGES.map((pct) => (
                    <BtChip key={pct} label={`${pct}%`} selected={gstPercentage === pct} onClick={() => setGstPercentage(pct)} aria-pressed={gstPercentage === pct} />
                  ))}
                </div>
              </div>
            )}

            {/* Receipt-style summary */}
            <div style={{ background: 'var(--ground)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SummaryRow label={`Subtotal (${qty} ${unit} × ₹${rate})`} value={money(subtotal)} />
                {overtimeAmount > 0 && <SummaryRow label={`Overtime (${overtimeHours} hrs)`} value={`+${money(overtimeAmount)}`} />}
                {isWithGst && <SummaryRow label={`GST (${gstPercentage}%)`} value={`+${money(gstAmount)}`} />}
              </div>
              <div style={{ borderTop: '1.5px dashed var(--input-border)', margin: '14px 0' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Total</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-3)' }}>Added to the site ledger</div>
                </div>
                <div
                  className="tnum"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}
                >
                  {money(totalAmount)}
                </div>
              </div>
              {(paidNow > 0 || alreadyPaid > 0) && (
                <>
                  <div style={{ borderTop: '1px solid var(--line)', margin: '14px 0' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {alreadyPaid > 0 && <SummaryRow label="Already paid" value={money(alreadyPaid)} />}
                    {paidNow > 0 && <SummaryRow label="Paid with this entry" value={money(paidNow)} tone="var(--status-success)" />}
                    <SummaryRow label="Balance due" value={money(balanceDue)} strong />
                  </div>
                </>
              )}
            </div>
          </BtCard>

          {/* ── Payment ── */}
          <BtCard padding="24px" className="tour-payment">
            <CardTitle icon={CreditCard}>Payment and settlement</CardTitle>

            <div style={{ marginBottom: 18 }}>
              <Eyebrow>Payment method</Eyebrow>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PAYMENT_METHODS.map((method) => (
                  <BtChip key={method} label={method} selected={paymentMethod === method} onClick={() => setPaymentMethod(method)} aria-pressed={paymentMethod === method} />
                ))}
              </div>
            </div>

            {/* Existing payment records with option to delete payment (parity with Flutter application) */}
            {paymentHistory.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Eyebrow>Payment records ({paymentHistory.length})</Eyebrow>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-success)' }}>
                    Total paid: {formatInr(alreadyPaid)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {paymentHistory.map((p, idx) => (
                    <div
                      key={p._id || idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--r-tile, 10px)',
                        background: 'var(--fill)',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--status-success)' }}>
                            +{formatInr(p.amount)}
                          </span>
                          <BtBadge tone="neutral" showDot={false} label={p.method || p.paymentMode || 'Cash'} />
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
                          {formatPaymentDateTime(p.date || p.paymentDate, p._id || p.id || editingId)}
                        </div>
                        {p.note && (
                          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{p.note}</div>
                        )}
                      </div>

                      {canMarkPaid && (
                        <BtIconButton
                          icon={Trash2}
                          label="Delete payment"
                          size={32}
                          onClick={() => {
                            setPaymentHistory((prev) => prev.filter((_, i) => i !== idx));
                            btToast('Payment record removed.');
                          }}
                          style={{
                            color: 'var(--status-danger, #ef4444)',
                            background: 'var(--status-danger-soft, #fee2e2)',
                            borderColor: 'transparent',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canMarkPaid ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  flexWrap: 'wrap',
                  padding: '14px 16px',
                  background: paymentResult ? 'var(--status-success-soft)' : 'var(--fill)',
                  borderRadius: 'var(--r-input)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                    {paymentHistory.length > 0 ? 'Add additional payment' : 'Settle now'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>
                    {paymentResult
                      ? `${money(paymentResult.amount)} recorded as ${paymentResult.status.toLowerCase()} via ${paymentResult.method}`
                      : paymentHistory.length > 0
                      ? 'Record another payment installment or receipt for this entry'
                      : 'Record a payment, receipt or e-signature with this entry'}
                  </div>
                </div>
                <BtButton variant={paymentResult ? 'secondary' : 'primary'} size="small" onClick={openPayNow}>
                  {paymentResult ? 'Edit payment' : paymentHistory.length > 0 ? '+ Add payment' : 'Pay / settle'}
                </BtButton>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--ink-2)', background: 'var(--fill)', borderRadius: 'var(--r-input)', padding: '14px 16px', lineHeight: 1.5 }}>
                Payments are recorded by an admin once this entry is approved.
              </div>
            )}
          </BtCard>

          {/* ── Notes and attachments ── */}
          <BtCard padding="24px" className="tour-attachments">
            <CardTitle icon={FileText}>Notes and attachments</CardTitle>
            <div style={{ marginBottom: 20 }}>
              <BtTextarea
                label="Notes and site remarks"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Delivery vehicle number, quality observations, or verification notes"
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Receipts and bill attachments</span>
                <input type="file" multiple ref={attachmentInputRef} onChange={handleFileSelect} style={{ display: 'none' }} aria-label="Attach files" />
                <BtButton variant="secondary" size="compact" icon={Paperclip} onClick={() => attachmentInputRef.current?.click()}>
                  Attach files
                </BtButton>
              </div>

              {attachments.length === 0 ? (
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className="bt-hover-row"
                  style={{
                    width: '100%',
                    font: 'inherit',
                    boxSizing: 'border-box',
                    border: '1.5px dashed var(--input-border)',
                    borderRadius: 'var(--r-input)',
                    padding: '22px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--ground)',
                    color: 'var(--ink)',
                  }}
                >
                  <Camera size={22} color="var(--ink-3)" style={{ margin: '0 auto 6px', display: 'block' }} />
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>Upload a bill photo or PDF</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>Receipts, bills or verification photos</span>
                </button>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {attachments.map((file, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '4px 4px 4px 12px',
                        borderRadius: 'var(--r-full)',
                        background: 'var(--fill)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: 'var(--font-ui)',
                        fontSize: 13,
                        color: 'var(--ink)',
                      }}
                    >
                      <Paperclip size={13} />
                      <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      <BtIconButton icon={X} label={`Remove ${file.name}`} size={32} onClick={() => handleRemoveAttachment(i)} style={{ border: 'none', background: 'transparent' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </BtCard>

          {/* ── Submit ── */}
          <div className="tour-save-btn" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div className="tnum" style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)' }}>
              Total <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 18 }}>{money(totalAmount)}</strong>
              {paymentResult && <BtBadge tone={paymentResult.status === 'Paid' ? 'success' : paymentResult.status === 'Partial' ? 'warning' : 'neutral'} label={paymentResult.status} style={{ marginLeft: 10 }} />}
            </div>
            <BtButton type="submit" variant="primary" loading={saving} style={{ flex: '1 1 240px', maxWidth: 420, fontWeight: 700 }}>
              {isEditing ? 'Update entry' : 'Save entry'}
            </BtButton>
          </div>
        </form>
      </BtSheet>

      {showPayNow && (
        <PayNowSheet
          open={showPayNow}
          entryTitle={values[nameKey] || ''}
          typeLabel={ENTRY_TYPES.find((t) => t.value === entryType)?.label || ''}
          vendorName={vendorName}
          totalAmount={totalAmount}
          alreadyPaid={alreadyPaid}
          onClose={() => setShowPayNow(false)}
          onConfirm={(res) => {
            setPaymentResult(res.amount > 0 ? res : null);
            setShowPayNow(false);
            btToast(res.amount > 0 ? 'Payment details added to this entry.' : 'No payment recorded.');
          }}
        />
      )}
    </div>
  );
}
