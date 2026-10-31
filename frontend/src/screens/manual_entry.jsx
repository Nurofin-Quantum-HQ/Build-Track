import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transactionAPI } from '../api';
import useProjectStore from '../stores/projectStore';
import { Toast } from '../components/Toast';
import {
  BtHero,
  BtSheet,
  BtButton,
  BtCard,
  BtBadge,
  BtCountUp,
  formatInr,
  showBtSuccess,
  btToast,
} from '../components/ui';
import {
  Building2,
  ChevronDown,
  HelpCircle,
  CheckCircle2,
  X,
  Trash2,
  ArrowLeft,
  IndianRupee,
  Layers,
  Paperclip,
  Check,
  CreditCard,
  FileText,
  Clock,
  Sparkles,
  Camera,
} from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import PayNowSheet from '../components/PayNowSheet';
import { useAuth } from '../contexts/AuthContext';

const ENTRY_TYPES = [
  { key: 'material', label: 'Material' },
  { key: 'labour', label: 'Labour' },
  { key: 'equipment', label: 'Equipment' },
];

const UNIT_OPTIONS = {
  material: ['Bags', 'Kg', 'Tonnes', 'Sq.Ft', 'Cubic Ft', 'Pieces', 'Liters', 'Unit'],
  labour: ['Day', 'Hour', 'Sq.Ft', 'Unit'],
  equipment: ['Day', 'Hour', 'Week', 'Month', 'Trip'],
};

const GST_PERCENTAGES = [0, 5, 12, 18, 28];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Credit'];

const FIELDS = {
  material: [
    { key: 'itemName', label: 'Material / Item Name', required: true, type: 'text', placeholder: 'e.g. Cement, Sand, Steel' },
    { key: 'quantity', label: 'Quantity', required: true, type: 'number', min: 0.01 },
    { key: 'rate', label: 'Rate (₹)', required: true, type: 'number', prefix: '₹', min: 0.01 },
    { key: 'brand', label: 'Brand', required: false, type: 'text', placeholder: 'e.g. ACC, UltraTech' },
    { key: 'supplier', label: 'Supplier / Vendor', required: false, type: 'text', placeholder: 'e.g. BuildMart' },
  ],
  labour: [
    { key: 'workerName', label: 'Worker / Team Name', required: true, type: 'text', placeholder: 'e.g. Ramesh, Team A' },
    { key: 'quantity', label: 'Number of Workers', required: true, type: 'number', min: 1 },
    { key: 'rate', label: 'Rate per Worker (₹)', required: true, type: 'number', prefix: '₹', min: 0.01 },
    { key: 'workType', label: 'Trade / Work Type', required: false, type: 'text', placeholder: 'e.g. Mason, Carpenter' },
    { key: 'contractor', label: 'Contractor / Team', required: false, type: 'text', placeholder: 'e.g. Kumar Contractors' },
    { key: 'overtime', label: 'Overtime Hours', required: false, type: 'number', min: 0, placeholder: '0' },
  ],
  equipment: [
    { key: 'equipmentName', label: 'Equipment Name', required: true, type: 'text', placeholder: 'e.g. JCB, Crane, Mixer' },
    { key: 'quantity', label: 'Quantity (Hours/Days)', required: true, type: 'number', min: 0.01 },
    { key: 'rate', label: 'Rate (₹)', required: true, type: 'number', prefix: '₹', min: 0.01 },
    { key: 'model', label: 'Model / Sub-Class', required: false, type: 'text', placeholder: 'e.g. CAT 320' },
    { key: 'operator', label: 'Operator / Vendor', required: false, type: 'text', placeholder: 'e.g. Raj Equipment' },
  ],
};

const AUTOCOMPLETE_FIELDS = {
  material: {
    itemName: ['Cement', 'Sand', 'Gravel', 'Steel', 'Bricks', 'Blocks', 'Tiles', 'Pipes', 'Wires', 'Paint'],
    brand: ['ACC', 'UltraTech', 'Ambuja', 'Shree Cement', 'Tata Tiscon', 'Jindal Panther'],
    supplier: ['BuildMart', 'MaterialHub', 'Local Depot', 'National Steel'],
  },
  labour: {
    workerName: ['Team A', 'Team B', 'Mason Team', 'Ramesh & Co.', 'Shankar Masons'],
    workType: ['Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter', 'Bar Bender'],
    contractor: ['Kumar Contractors', 'Reddy Builders', 'City Labour Force'],
  },
  equipment: {
    equipmentName: ['JCB Excavator', 'Tower Crane', 'Concrete Mixer', 'Bulldozer', 'Compactor', 'Generator'],
    model: ['CAT 320', 'Komatsu PC200', 'Hitachi ZX200', 'Ashok Leyland 250kVA'],
    operator: ['Raj Equipment', 'ABC Rentals', 'Heavy Machinery Fleet'],
  },
};

export default function ManualEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can, isAdmin } = useAuth();

  const allowedTypes = useMemo(() => {
    const types = [];
    if (isAdmin || can('manage_expenses')) types.push('material');
    if (isAdmin || can('add_entries') || can('submit_daily_update')) types.push('labour');
    if (isAdmin || can('manage_equipment_master')) types.push('equipment');
    return types;
  }, [can, isAdmin]);

  const [entryType, setEntryType] = useState(() => (allowedTypes.length > 0 ? allowedTypes[0] : 'material'));
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [values, setValues] = useState({});
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [toast, setToast] = useState({ msg: '', type: 'info' });
  const clearToast = useCallback(() => setToast({ msg: '', type: 'info' }), []);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [sourceTransactionId, setSourceTransactionId] = useState(null);
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
      .then((list) => setProjects(list || []))
      .catch(() => {});
  }, []);

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
      setUnit(tx.unit || '');
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
        setSelectedProject(proj._id || proj.id || '');
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
    if (!unit && UNIT_OPTIONS[entryType]) {
      setUnit(UNIT_OPTIONS[entryType][0]);
    }
  }, [entryType, unit]);

  const handleFieldChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
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

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrMsg('');

    if (!selectedProject) {
      setErrMsg('Please select a project.');
      return;
    }

    const nameKey = entryType === 'material' ? 'itemName' : entryType === 'labour' ? 'workerName' : 'equipmentName';
    if (!values[nameKey] || !values[nameKey].trim()) {
      setErrMsg(`Please enter the ${nameKey === 'itemName' ? 'item' : nameKey === 'workerName' ? 'worker' : 'equipment'} name.`);
      return;
    }

    if (qty <= 0) {
      setErrMsg('Please enter a valid quantity.');
      return;
    }
    if (rate <= 0) {
      setErrMsg('Please enter a valid rate.');
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
        unit: unit,
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
        totalAmount: totalAmount,
        overtime: overtimeHours,
        overtimeAmount: overtimeAmount,
        isPaid: Boolean(paymentResult),
        paymentMethod: paymentResult?.method || paymentMethod,
        paymentDate: paymentResult?.paymentDate
          ? paymentResult.paymentDate.split('T')[0]
          : new Date().toISOString().split('T')[0],
        paymentHistory: paymentHistory,
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
        attachments.forEach((file, idx) => {
          formData.append(`attachment_${idx}`, file);
        });
        finalData = formData;
      }

      if (isEditing) {
        await transactionAPI.update(editingId, finalData);
        btToast.success('Entry updated successfully!');
        setTimeout(() => navigate(-1), 1000);
      } else {
        await transactionAPI.create(finalData);

        // Trigger celebratory success modal
        showBtSuccess({
          kind: 'money',
          title: `${entryType.charAt(0).toUpperCase() + entryType.slice(1)} Entry Saved!`,
          message: `${values[nameKey]} for ₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} has been logged to your site ledger.`,
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
      btToast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10.5px',
    fontWeight: 700,
    color: 'var(--ink-3)',
    letterSpacing: '0.06em',
    marginBottom: '6px',
    textTransform: 'uppercase',
    display: 'block',
  };

  const inputStyle = {
    width: '100%',
    height: '48px',
    padding: '0 14px',
    borderRadius: 'var(--r-input)',
    border: '1px solid var(--line)',
    background: 'var(--fill)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-ui)',
    fontSize: '14px',
    fontWeight: 500,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 150ms ease, background 150ms ease',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    background: 'var(--card)',
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="ManualEntry" />
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />

      {/* ══════════════════════════════════════════════════════════
          HERO (Blueprint Noir Header)
         ══════════════════════════════════════════════════════════ */}
      <BtHero padding="28px 32px 56px">
        <div style={{ maxWidth: 840, margin: '0 auto', width: '100%' }}>
          {/* Back nav & help */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: 'var(--bone)',
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setRunTour(true)}
              title="Help"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '18px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: 'var(--on-noir-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <HelpCircle size={16} />
            </button>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--on-noir-3)',
              marginBottom: '6px',
            }}
          >
            {isEditing ? 'EDIT TRANSACTION' : isDuplicate ? 'REPEAT ENTRY' : 'MANUAL ENTRY'}
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 38px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--bone)',
            }}
          >
            {isEditing ? 'Edit Entry' : isDuplicate ? 'Repeat Entry' : 'Manual Entry'}
          </h1>

          <p
            style={{
              margin: '6px 0 20px',
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              color: 'var(--on-noir-2)',
            }}
          >
            Record granular site expenses with tax computation and payment tracking.
          </p>

          {/* Type Selector Tabs on Dark */}
          <div
            className="tour-entry-types"
            style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '4px',
              borderRadius: 'var(--r-button)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              gap: '4px',
            }}
          >
            {ENTRY_TYPES.filter((t) => allowedTypes.includes(t.key)).map((t) => {
              const isSelected = entryType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => !isEditing && !isDuplicate && setEntryType(t.key)}
                  disabled={isEditing || isDuplicate}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'calc(var(--r-button) - 4px)',
                    border: 'none',
                    background: isSelected ? 'var(--bone)' : 'transparent',
                    color: isSelected ? 'var(--ink)' : 'var(--on-noir-2)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isEditing || isDuplicate ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </BtHero>

      {/* ══════════════════════════════════════════════════════════
          SHEET (Bone Form Container)
         ══════════════════════════════════════════════════════════ */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: 840,
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {errMsg && (
            <div
              style={{
                background: 'var(--tone-red-bg)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--r-input)',
                padding: '14px 18px',
                color: 'var(--status-danger-bright)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {errMsg}
            </div>
          )}

          {/* ── CARD 1: Project Scoping & Execution Context ── */}
          <BtCard padding="24px" className="tour-project-context">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--fill)',
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={16} />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                }}
              >
                Project Context
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              {/* Project Select */}
              <div>
                <label style={labelStyle}>
                  Project <span style={{ color: 'var(--status-danger-bright)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedProject}
                    onChange={(e) => {
                      setSelectedProject(e.target.value);
                      setSelectedFloor('');
                      setSelectedPhaseId('');
                      setSelectedActivityName('');
                    }}
                    style={selectStyle}
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.projectName || p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    color="var(--ink-3)"
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Floor */}
              <div>
                <label style={labelStyle}>Floor</label>
                <div style={{ position: 'relative' }}>
                  <select
                    disabled={!selectedProject || floors.length === 0}
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    style={{ ...selectStyle, opacity: !selectedProject || floors.length === 0 ? 0.6 : 1 }}
                  >
                    <option value="">All Floors</option>
                    {floors.map((f, i) => (
                      <option key={i} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    color="var(--ink-3)"
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                </div>
              </div>

              {/* Phase */}
              <div>
                <label style={labelStyle}>Phase</label>
                <div style={{ position: 'relative' }}>
                  <select
                    disabled={!selectedProject || phases.length === 0}
                    value={selectedPhaseId}
                    onChange={(e) => {
                      setSelectedPhaseId(e.target.value);
                      setSelectedActivityName('');
                    }}
                    style={{ ...selectStyle, opacity: !selectedProject || phases.length === 0 ? 0.6 : 1 }}
                  >
                    <option value="">Select Phase</option>
                    {phases.map((ph) => (
                      <option key={ph.id} value={String(ph.id)}>
                        {ph.phaseName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    color="var(--ink-3)"
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                </div>
              </div>
            </div>
          </BtCard>

          {/* ── CARD 2: Item Information & Quantities ── */}
          <BtCard padding="24px" className="tour-field-item">
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: '16px',
              }}
            >
              {entryType === 'material'
                ? 'Material Details'
                : entryType === 'labour'
                ? 'Labour & Crew Shift'
                : 'Equipment & Machinery'}
            </div>

            {/* Item Name / Worker / Equipment with Autocomplete Chips */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                {entryType === 'material'
                  ? 'Material / Item Name'
                  : entryType === 'labour'
                  ? 'Worker / Team Name'
                  : 'Equipment Name'}{' '}
                <span style={{ color: 'var(--status-danger-bright)' }}>*</span>
              </label>

              <input
                type="text"
                value={
                  values[
                    entryType === 'material'
                      ? 'itemName'
                      : entryType === 'labour'
                      ? 'workerName'
                      : 'equipmentName'
                  ] || ''
                }
                onChange={(e) =>
                  handleFieldChange(
                    entryType === 'material'
                      ? 'itemName'
                      : entryType === 'labour'
                      ? 'workerName'
                      : 'equipmentName',
                    e.target.value
                  )
                }
                placeholder={
                  entryType === 'material'
                    ? 'e.g. 53-Grade OPC Cement, Steel TMT Bars, River Sand'
                    : entryType === 'labour'
                    ? 'e.g. Ramesh Masons, Plastering Crew Team 1'
                    : 'e.g. JCB 3DX Backhoe, Concrete Mixer 10/7'
                }
                style={inputStyle}
              />

              {/* Autocomplete chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {(AUTOCOMPLETE_FIELDS[entryType]?.[
                  entryType === 'material'
                    ? 'itemName'
                    : entryType === 'labour'
                    ? 'workerName'
                    : 'equipmentName'
                ] || []).map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() =>
                      handleFieldChange(
                        entryType === 'material'
                          ? 'itemName'
                          : entryType === 'labour'
                          ? 'workerName'
                          : 'equipmentName',
                        sugg
                      )
                    }
                    style={{
                      background: 'var(--fill)',
                      border: '1px solid var(--line)',
                      borderRadius: '12px',
                      padding: '3px 10px',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '12px',
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                    }}
                  >
                    + {sugg}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity, Unit, Rate Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>
                  Quantity <span style={{ color: 'var(--status-danger-bright)' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={values.quantity || ''}
                  onChange={(e) => handleFieldChange('quantity', e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Unit</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={selectStyle}
                  >
                    {(UNIT_OPTIONS[entryType] || []).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    color="var(--ink-3)"
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Rate per Unit (₹) <span style={{ color: 'var(--status-danger-bright)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--ink-3)',
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={values.rate || ''}
                    onChange={(e) => handleFieldChange('rate', e.target.value)}
                    placeholder="0.00"
                    style={{ ...inputStyle, paddingLeft: '32px' }}
                  />
                </div>
              </div>
            </div>

            {/* Extra Category Fields */}
            {entryType === 'material' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Brand / Manufacturer</label>
                  <input
                    type="text"
                    value={values.brand || ''}
                    onChange={(e) => handleFieldChange('brand', e.target.value)}
                    placeholder="e.g. UltraTech, Tata Steel"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Supplier / Vendor</label>
                  <input
                    type="text"
                    value={values.supplier || ''}
                    onChange={(e) => handleFieldChange('supplier', e.target.value)}
                    placeholder="e.g. Local Builders Mart"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {entryType === 'labour' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Trade / Work Type</label>
                  <input
                    type="text"
                    value={values.workType || ''}
                    onChange={(e) => handleFieldChange('workType', e.target.value)}
                    placeholder="e.g. Mason, Plasterer"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contractor / Agency</label>
                  <input
                    type="text"
                    value={values.contractor || ''}
                    onChange={(e) => handleFieldChange('contractor', e.target.value)}
                    placeholder="e.g. Sub-contractor name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Overtime Hours</label>
                  <input
                    type="number"
                    step="any"
                    value={values.overtime || ''}
                    onChange={(e) => handleFieldChange('overtime', e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {entryType === 'equipment' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Model / Capacity</label>
                  <input
                    type="text"
                    value={values.model || ''}
                    onChange={(e) => handleFieldChange('model', e.target.value)}
                    placeholder="e.g. 200HP, 10 Tonne"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Operator / Rental Provider</label>
                  <input
                    type="text"
                    value={values.operator || ''}
                    onChange={(e) => handleFieldChange('operator', e.target.value)}
                    placeholder="e.g. Raj Machinery Fleet"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </BtCard>

          {/* ── CARD 3: GST & Amount Calculation ── */}
          <BtCard padding="24px" className="tour-amount-calc">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                }}
              >
                Taxes & Total Valuation
              </div>

              {/* GST Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={isWithGst}
                  onChange={(e) => setIsWithGst(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--ink)' }}
                />
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                  Apply GST
                </span>
              </label>
            </div>

            {/* GST Percentage Options */}
            {isWithGst && (
              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>GST RATE</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {GST_PERCENTAGES.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setGstPercentage(pct)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--r-button)',
                        border: `1px solid ${gstPercentage === pct ? 'var(--ink)' : 'var(--line)'}`,
                        background: gstPercentage === pct ? 'var(--ink)' : 'var(--card)',
                        color: gstPercentage === pct ? 'var(--bone)' : 'var(--ink)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Calculation Breakdown Lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ink-2)' }}>
                <span>Subtotal ({qty} {unit} × ₹{rate})</span>
                <span className="tnum" style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              {overtimeAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ink-2)' }}>
                  <span>Overtime ({overtimeHours} hrs)</span>
                  <span className="tnum" style={{ fontWeight: 600 }}>+₹{overtimeAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              )}

              {isWithGst && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ink-2)' }}>
                  <span>GST ({gstPercentage}%)</span>
                  <span className="tnum" style={{ fontWeight: 600 }}>+₹{gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            {/* Big Total Amount */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '16px' }}>
              <div>
                <div style={labelStyle}>TOTAL CALCULATED VALUE</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--ink-3)' }}>
                  Ledger impact
                </div>
              </div>

              <div
                className="tnum"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(28px, 4vw, 36px)',
                  fontWeight: 800,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                }}
              >
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </BtCard>

          {/* ── CARD 4: Payment Details ── */}
          <BtCard padding="24px" className="tour-payment">
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: '16px',
              }}
            >
              Payment & Settlement
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>PAYMENT METHOD</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--r-button)',
                        border: `1px solid ${isSelected ? 'var(--ink)' : 'var(--line)'}`,
                        background: isSelected ? 'var(--ink)' : 'var(--card)',
                        color: isSelected ? 'var(--bone)' : 'var(--ink)',
                        fontFamily: 'var(--font-ui)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 140ms ease',
                      }}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settle Now shortcut */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--fill)', borderRadius: 'var(--r-input)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                  Direct Instant Settlement
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '2px' }}>
                  {paymentResult ? `Recorded as Paid via ${paymentResult.method}` : 'Record payment receipt or sign e-voucher now'}
                </div>
              </div>

              <BtButton
                variant={paymentResult ? 'secondary' : 'primary'}
                small
                onPress={() => setShowPayNow(true)}
              >
                {paymentResult ? 'Edit Payment' : 'Pay / Settle'}
              </BtButton>
            </div>
          </BtCard>

          {/* ── CARD 5: Notes & Attachments ── */}
          <BtCard padding="24px" className="tour-attachments">
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>NOTES & SITE REMARKS</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add delivery vehicle number, quality observations, or verification notes…"
                style={{
                  ...inputStyle,
                  height: 'auto',
                  padding: '12px 14px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={labelStyle}>RECEIPTS & BILL ATTACHMENTS</label>
                <input
                  type="file"
                  multiple
                  ref={attachmentInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Paperclip size={14} /> + Attach Files
                </button>
              </div>

              {attachments.length === 0 ? (
                <div
                  onClick={() => attachmentInputRef.current?.click()}
                  style={{
                    border: '1.5px dashed var(--line)',
                    borderRadius: 'var(--r-input)',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--fill)',
                  }}
                >
                  <Camera size={22} color="var(--ink-3)" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    Upload bill photo or PDF
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>
                    Click to select receipts, bills, or verification photos
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {attachments.map((file, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--r-button)',
                        background: 'var(--fill)',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: 'var(--font-ui)',
                        fontSize: '12px',
                        color: 'var(--ink)',
                      }}
                    >
                      <Paperclip size={12} />
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--ink-3)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </BtCard>

          {/* ── Submit Action ── */}
          <div className="tour-save-btn" style={{ marginTop: '8px' }}>
            <BtButton
              type="submit"
              variant="primary"
              loading={saving}
              style={{
                width: '100%',
                height: '52px',
                fontSize: '16px',
                fontWeight: 700,
              }}
            >
              {isEditing ? 'Update Entry' : 'Save Entry'}
            </BtButton>
          </div>
        </form>
      </BtSheet>

      {/* PayNow Bottom Sheet Modal */}
      {showPayNow && (
        <PayNowSheet
          open={showPayNow}
          totalAmount={totalAmount}
          onClose={() => setShowPayNow(false)}
          onPaid={(res) => {
            setPaymentResult(res);
            setShowPayNow(false);
            btToast.success('Settlement details applied');
          }}
        />
      )}
    </div>
  );
}
