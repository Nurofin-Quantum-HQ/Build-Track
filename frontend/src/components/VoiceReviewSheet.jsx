import { useState, useCallback, useRef } from "react";
import { PAYMENT_MODES, GST_PERCENTAGES, ACTIVITY_OPTIONS, PHASE_OPTIONS } from "../utils/voiceConstants";
import { colors, radius, shadows, typography, gradients } from "../styles/designTokens";
import {
  Package,
  Users,
  Wrench,
  Building2,
  MapPin,
  ClipboardList,
  Hammer,
  Clock,
  Mic,
  Coins,
  Ruler,
  Tag,
  Handshake,
  CreditCard,
  ChevronRight,
  X,
  AlertTriangle,
  Info,
  Check,
  CornerDownRight,
  CheckSquare,
  Layers,
  HelpCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import Button from "./ui/Button";

const ENTRY_TYPES = [
  { id: 'material', label: 'Material', icon: Package, desc: 'Cement, sand, steel, bricks...' },
  { id: 'labour', label: 'Labour', icon: Users, desc: 'Workers, masons, helpers...' },
  { id: 'equipment', label: 'Equipment', icon: Wrench, desc: 'JCB, crane, mixer...' },
];

const UNITS = ['Bags', 'Kg', 'Tons', 'CFT', 'Sqft', 'Rft', 'Nos', 'Ltrs', 'Cum', 'Days', 'Hours', 'Per Day', 'Trips', 'Load'];

const QUICK_ITEMS = {
  material: ['Cement', 'Sand', 'Steel', 'Bricks', 'Aggregate', 'Tiles', 'Paint', 'Pipes', 'Wire', 'Block'],
  labour: ['Mason', 'Helper', 'Carpenter', 'Plumber', 'Electrician', 'Painter', 'Welder', 'Supervisor'],
  equipment: ['JCB', 'Crane', 'Mixer', 'Compactor', 'Loader', 'Excavator', 'Generator', 'Compressor', 'Roller', 'Tipper'],
};

const LABOUR_TYPES = ['Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter', 'Helper', 'Welder', 'Supervisor', 'Fitter', 'Bar Bender', 'Other'];

const formatINR = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '0';
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
  return num.toLocaleString('en-IN');
};

const stepIconMap = {
  entryType: Package,
  project: Building2,
  labourType: Users,
  workerCount: Users,
  hoursWorked: Clock,
  dailyWage: Coins,
  equipmentName: Wrench,
  hoursUsed: Clock,
  rate: Coins,
  itemName: Tag,
  quantity: Layers,
  unit: Ruler,
  floor: MapPin,
  phase: ClipboardList,
  activity: Hammer,
  optionals: FileText,
  review: CheckSquare,
};

function useStepVoice() {
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState('');
  const recRef = useRef(null);

  const start = useCallback((onResult) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setResult(text);
      setListening(false);
      onResult?.(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, result, start, stop };
}

function StepMicButton({ onTranscript }) {
  const { listening, start, stop } = useStepVoice();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        listening ? stop() : start(onTranscript);
      }}
      style={{
        width: 44, height: 44, borderRadius: '50%', border: 'none',
        background: listening ? '#FEE2E2' : colors.primaryLight,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, transition: 'all 200ms ease',
        boxShadow: listening ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : 'none',
      }}
      title="Speak this value"
    >
      <Mic size={18} color={listening ? '#EF4444' : colors.primary} />
    </button>
  );
}

function buildInitialData(d = {}) {
  return {
    entryType: d.entryType || '',
    project: d.projectId || d.project || '',
    projectName: d.projectName || '',
    floor: d.floor || '',
    phase: d.phase || '',
    activity: d.activity || '',
    itemName: d.items?.[0] || d.itemName || '',
    quantity: d.quantity || '',
    unit: d.unit || '',
    rate: d.unitPrice || d.rate || '',
    brand: d.brand || '',
    supplier: d.supplier || '',
    gstApplicable: d.gstApplicable || false,
    gstPercentage: d.gstPercentage || '',
    paymentMode: d.paymentMode || 'cash',
    notes: d.notes || '',

    labourType: d.labourType || d.items?.[0] || '',
    workerCount: d.workerCount || '',
    hoursWorked: d.hoursWorked || '',
    dailyWage: d.dailyWage || '',
    advanceAmount: d.advanceAmount || '',

    equipmentName: d.equipmentName || d.items?.[0] || '',
    hoursUsed: d.hoursUsed || '',
    operatorName: d.operatorName || '',
    fuelCost: d.fuelCost || '',
  };
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: colors.textSecondary,
  letterSpacing: '0.08em', marginBottom: 8,
};

const inputStyle = {
  width: '100%', height: 48, padding: '0 16px', borderRadius: 12,
  border: `1px solid ${colors.border}`, background: colors.card,
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: typography.fontFamily,
  transition: 'all 150ms ease',
};

export default function VoiceReviewSheet({
  isOpen,
  onClose,
  initialData = {},
  projects = [],
  onSave,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState(() => buildInitialData(initialData));
  const [customInput, setCustomInput] = useState('');

  const steps = buildSteps(data.entryType);
  const step = steps[currentStep];

  const computedAmount = computeAmount(data);
  const gstAmount = data.gstApplicable && data.gstPercentage
    ? computedAmount * (Number(data.gstPercentage) / 100)
    : 0;
  const totalAmount = computedAmount + gstAmount;

  const updateField = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const stepsLength = steps.length;
  const goNext = useCallback(() => {
    setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, stepsLength - 1));
      setCustomInput('');
    }, 150);
  }, [stepsLength]);

  const handleSave = () => {
    onSave?.({
      ...data,
      amount: totalAmount,
      computedAmount,
      gstAmount,
    });
  };

  if (!isOpen || !step) return null;

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        width: '100%', maxWidth: 580, maxHeight: '92vh',
        background: colors.bg, borderRadius: '24px 24px 0 0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -20px 25px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 4px' }}>
          <div style={{ width: 44, height: 5, borderRadius: 99, background: '#CBD5E1' }} />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 24px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: gradients.primaryGradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
            }}>
              <Mic size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: colors.textPrimary, letterSpacing: '-0.02em' }}>BuildTrack AI</div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: 500 }}>
                Step {currentStep + 1} of {steps.length} &middot; {step.label}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: `1px solid ${colors.border}`,
            background: colors.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textSecondary,
            transition: 'all 150ms ease',
          }}
            className="hover-bg-subtle"
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ height: 4, background: '#E6EAF2', borderRadius: 99 }}>
            <div style={{
              height: '100%', width: `${progress}%`, borderRadius: 99,
              background: gradients.primaryGradient,
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }} />
          </div>
        </div>

        {currentStep > 0 && (
          <div style={{
            display: 'flex', gap: 8, padding: '0 24px 12px',
            overflowX: 'auto', flexShrink: 0,
          }}>
            {steps.slice(0, currentStep).map(s => {
              const val = getStepValue(s.id, data);
              if (!val) return null;
              const Icon = stepIconMap[s.id] || Package;
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 99,
                  border: `1px solid ${colors.primary}33`, background: colors.primaryLight,
                  fontSize: 12, fontWeight: 700, color: colors.primary,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                  transition: 'all 150ms ease',
                }} onClick={() => setCurrentStep(steps.indexOf(s))}>
                  <Icon size={12} color={colors.primary} />
                  <span>{val}</span>
                  <Check size={12} color={colors.success} style={{ marginLeft: 2 }} />
                </div>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          {renderStep({
            step, data, updateField, goNext, customInput, setCustomInput,
            projects, computedAmount, totalAmount, gstAmount,
            setCurrentStep, handleSave,
          })}
        </div>
      </div>
    </div>
  );
}

function buildSteps(entryType) {
  const base = [
    { id: 'entryType', label: 'Entry Type', icon: Package, required: true },
    { id: 'project', label: 'Project', icon: Building2, required: true },
  ];

  if (entryType === 'labour') {
    return [
      ...base,
      { id: 'labourType', label: 'Labour Type', icon: Users, required: true },
      { id: 'workerCount', label: 'Worker Count', icon: Users, required: true },
      { id: 'hoursWorked', label: 'Hours Worked', icon: Clock, required: true },
      { id: 'dailyWage', label: 'Daily Wage (₹)', icon: Coins, required: true },
      { id: 'floor', label: 'Floor', icon: MapPin, required: false },
      { id: 'phase', label: 'Phase', icon: ClipboardList, required: false },
      { id: 'activity', label: 'Activity', icon: Hammer, required: false },
      { id: 'optionals', label: 'Details', icon: FileText, required: false },
      { id: 'review', label: 'Review', icon: CheckSquare, required: true },
    ];
  }

  if (entryType === 'equipment') {
    return [
      ...base,
      { id: 'equipmentName', label: 'Equipment', icon: Wrench, required: true },
      { id: 'hoursUsed', label: 'Hours Used', icon: Clock, required: true },
      { id: 'rate', label: 'Rate (₹/hr)', icon: Coins, required: true },
      { id: 'floor', label: 'Floor', icon: MapPin, required: false },
      { id: 'phase', label: 'Phase', icon: ClipboardList, required: false },
      { id: 'activity', label: 'Activity', icon: Hammer, required: false },
      { id: 'optionals', label: 'Details', icon: FileText, required: false },
      { id: 'review', label: 'Review', icon: CheckSquare, required: true },
    ];
  }

  return [
    ...base,
    { id: 'itemName', label: 'Item Name', icon: Tag, required: true },
    { id: 'quantity', label: 'Quantity', icon: Layers, required: true },
    { id: 'unit', label: 'Unit', icon: Ruler, required: true },
    { id: 'rate', label: 'Rate (₹)', icon: Coins, required: true },
    { id: 'floor', label: 'Floor', icon: MapPin, required: false },
    { id: 'phase', label: 'Phase', icon: ClipboardList, required: false },
    { id: 'activity', label: 'Activity', icon: Hammer, required: false },
    { id: 'optionals', label: 'Details', icon: FileText, required: false },
    { id: 'review', label: 'Review', icon: CheckSquare, required: true },
  ];
}

function getStepValue(stepId, data) {
  switch (stepId) {
    case 'project': return data.projectName || data.project;
    case 'labourType': return data.labourType;
    case 'workerCount': return data.workerCount ? `${data.workerCount} workers` : '';
    case 'hoursWorked': return data.hoursWorked ? `${data.hoursWorked} hrs` : '';
    case 'dailyWage': return data.dailyWage ? `₹${formatINR(data.dailyWage)}` : '';
    case 'equipmentName': return data.equipmentName;
    case 'hoursUsed': return data.hoursUsed ? `${data.hoursUsed} hrs` : '';
    case 'itemName': return data.itemName;
    case 'quantity': return data.quantity ? `${data.quantity} ${data.unit}` : '';
    case 'unit': return data.unit;
    case 'rate': return data.rate ? `₹${formatINR(data.rate)}` : '';
    case 'floor': return data.floor;
    case 'phase': return data.phase;
    case 'activity': return data.activity;
    default: return '';
  }
}

function computeAmount(data) {
  if (data.entryType === 'labour') {
    const workers = Number(data.workerCount) || 0;
    const hours = Number(data.hoursWorked) || 0;
    const wage = Number(data.dailyWage) || 0;
    if (workers && hours && wage) return workers * hours * wage;
    if (workers && wage) return workers * wage;
    return 0;
  }
  if (data.entryType === 'equipment') {
    const hours = Number(data.hoursUsed) || 0;
    const rate = Number(data.rate) || 0;
    return hours * rate;
  }

  const qty = Number(data.quantity) || 0;
  const rate = Number(data.rate) || 0;
  return qty * rate;
}

function renderStep({ step, data, updateField, goNext, customInput, setCustomInput, projects, computedAmount, totalAmount, gstAmount, setCurrentStep, handleSave }) {
  const Icon = stepIconMap[step.id] || Package;

  switch (step.id) {
    case 'entryType':
      return (
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em', marginBottom: 6 }}>What type of entry?</div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>Select the category that best describes this entry</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {ENTRY_TYPES.map(t => {
              const TIcon = t.icon;
              return (
                <div key={t.id} onClick={() => { updateField('entryType', t.id); setTimeout(goNext, 200); }}
                  style={{
                    padding: '24px 16px', borderRadius: 14, cursor: 'pointer',
                    border: `2px solid ${data.entryType === t.id ? colors.primary : colors.border}`,
                    background: data.entryType === t.id ? colors.primaryLight : colors.card,
                    textAlign: 'center', transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="hover-lift-sm"
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: data.entryType === t.id ? '#FFFFFF' : colors.subtle,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: data.entryType === t.id ? colors.primary : colors.textSecondary,
                  }}>
                    <TIcon size={22} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: colors.textPrimary, marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.3 }}>{t.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'project':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Building2 size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Select Project</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Which project is this entry for?</div>
          {projects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {projects.map(p => (
                <div key={p._id} onClick={() => { updateField('project', p._id); updateField('projectName', p.projectName || p.name); setTimeout(goNext, 200); }}
                  style={{
                    padding: '16px 20px', borderRadius: 14, cursor: 'pointer',
                    border: `2px solid ${data.project === p._id ? colors.primary : colors.border}`,
                    background: data.project === p._id ? colors.primaryLight : colors.card,
                    display: 'flex', alignItems: 'center', gap: 16,
                    transition: 'all 150ms ease',
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: data.project === p._id ? '#fff' : colors.subtle,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: data.project === p._id ? colors.primary : colors.textSecondary,
                  }}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: colors.textPrimary }}>{p.projectName || p.name}</div>
                    {p.location && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{p.location}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>OR TYPE PROJECT NAME</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={customInput} onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { updateField('project', customInput.trim()); updateField('projectName', customInput.trim()); goNext(); } }}
              placeholder="Type project name..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            />
            <Button variant="primary" size="md" onClick={() => { if (customInput.trim()) { updateField('project', customInput.trim()); updateField('projectName', customInput.trim()); goNext(); } }}>
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      );

    case 'itemName':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Tag size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Item Name</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>What is this entry about?</div>
          {QUICK_ITEMS[data.entryType] && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {QUICK_ITEMS[data.entryType].map(item => (
                <div key={item} onClick={() => { updateField('itemName', item); setTimeout(goNext, 200); }}
                  style={{
                    padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                    border: `1.5px solid ${data.itemName === item ? colors.primary : colors.border}`,
                    background: data.itemName === item ? colors.primaryLight : colors.card,
                    fontSize: 13, fontWeight: 600, color: data.itemName === item ? colors.primary : colors.textSecondary,
                    transition: 'all 150ms ease',
                  }}>{item}</div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input value={customInput} onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { updateField('itemName', customInput.trim()); goNext(); } }}
              placeholder="Type item name..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            />
            <StepMicButton onTranscript={(text) => { updateField('itemName', text); }} />
          </div>
        </div>
      );

    case 'labourType':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Users size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Labour Type</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>What type of worker?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {LABOUR_TYPES.map(t => (
              <div key={t} onClick={() => { updateField('labourType', t); setTimeout(goNext, 200); }}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.labourType === t ? colors.primary : colors.border}`,
                  background: data.labourType === t ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.labourType === t ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>{t}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input value={customInput} onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { updateField('labourType', customInput.trim()); goNext(); } }}
              placeholder="Or type labour type..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            />
            <StepMicButton onTranscript={(text) => { updateField('labourType', text); }} />
          </div>
        </div>
      );

    case 'workerCount':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Users size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Worker Count</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>How many workers?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <input type="number" value={data.workerCount} onChange={e => updateField('workerCount', e.target.value)}
              placeholder="0" autoFocus
              style={{
                flex: 1, height: 64, padding: '0 16px', borderRadius: 12,
                border: `2px solid ${colors.primary}`, background: colors.card,
                fontSize: 28, fontWeight: 800, color: colors.textPrimary, outline: 'none', textAlign: 'center',
                fontFamily: typography.fontFamily,
              }} />
            <StepMicButton onTranscript={(text) => { const n = text.match(/\d+/); if (n) updateField('workerCount', n[0]); }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[1, 2, 3, 5, 8, 10, 15, 20].map(n => (
              <div key={n} onClick={() => updateField('workerCount', String(n))}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.workerCount === String(n) ? colors.primary : colors.border}`,
                  background: data.workerCount === String(n) ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.workerCount === String(n) ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>{n}</div>
            ))}
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={goNext} disabled={!data.workerCount} style={{ marginTop: 24 }}>
            Next
          </Button>
        </div>
      );

    case 'hoursWorked':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Clock size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Hours Worked</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>How many hours?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <input type="number" value={data.hoursWorked} onChange={e => updateField('hoursWorked', e.target.value)}
              placeholder="0" autoFocus
              style={{
                flex: 1, height: 64, padding: '0 16px', borderRadius: 12,
                border: `2px solid ${colors.primary}`, background: colors.card,
                fontSize: 28, fontWeight: 800, color: colors.textPrimary, outline: 'none', textAlign: 'center',
                fontFamily: typography.fontFamily,
              }} />
            <StepMicButton onTranscript={(text) => { const n = text.match(/\d+(\.\d+)?/); if (n) updateField('hoursWorked', n[0]); }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[4, 6, 8, 9, 10, 12].map(n => (
              <div key={n} onClick={() => updateField('hoursWorked', String(n))}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.hoursWorked === String(n) ? colors.primary : colors.border}`,
                  background: data.hoursWorked === String(n) ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.hoursWorked === String(n) ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>{n}h</div>
            ))}
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={goNext} disabled={!data.hoursWorked} style={{ marginTop: 24 }}>
            Next
          </Button>
        </div>
      );

    case 'dailyWage':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Coins size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Daily Wage (₹)</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Rate per worker per day?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <input type="number" value={data.dailyWage} onChange={e => updateField('dailyWage', e.target.value)}
              placeholder="0" autoFocus
              style={{
                flex: 1, height: 64, padding: '0 16px', borderRadius: 12,
                border: `2px solid ${colors.primary}`, background: colors.card,
                fontSize: 28, fontWeight: 800, color: colors.textPrimary, outline: 'none',
                fontFamily: typography.fontFamily,
              }} />
            <StepMicButton onTranscript={(text) => { const n = text.match(/\d[\d,]*/); if (n) updateField('dailyWage', n[0].replace(/,/g, '')); }} />
          </div>
          {data.workerCount && data.hoursWorked && data.dailyWage && (
            <div style={{
              padding: '12px 18px', borderRadius: 12,
              background: colors.primaryLight, border: `1px solid ${colors.primary}33`,
              marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>Total Amount</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: colors.primary }}>₹{formatINR(data.workerCount * data.hoursWorked * data.dailyWage)}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[500, 600, 800, 1000, 1200, 1500].map(n => (
              <div key={n} onClick={() => updateField('dailyWage', String(n))}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.dailyWage === String(n) ? colors.primary : colors.border}`,
                  background: data.dailyWage === String(n) ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.dailyWage === String(n) ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>₹{n}</div>
            ))}
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={goNext} disabled={!data.dailyWage} style={{ marginTop: 24 }}>
            Next
          </Button>
        </div>
      );

    case 'equipmentName':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Wrench size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Equipment</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Which equipment was used?</div>
          {QUICK_ITEMS.equipment && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {QUICK_ITEMS.equipment.map(item => (
                <div key={item} onClick={() => { updateField('equipmentName', item); setTimeout(goNext, 200); }}
                  style={{
                    padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                    border: `1.5px solid ${data.equipmentName === item ? colors.primary : colors.border}`,
                    background: data.equipmentName === item ? colors.primaryLight : colors.card,
                    fontSize: 13, fontWeight: 600, color: data.equipmentName === item ? colors.primary : colors.textSecondary,
                    transition: 'all 150ms ease',
                  }}>{item}</div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input value={customInput} onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { updateField('equipmentName', customInput.trim()); goNext(); } }}
              placeholder="Or type equipment name..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            />
            <StepMicButton onTranscript={(text) => { updateField('equipmentName', text); }} />
          </div>
        </div>
      );

    case 'hoursUsed':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Clock size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Hours Used</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>How many hours was it operated?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <input type="number" value={data.hoursUsed} onChange={e => updateField('hoursUsed', e.target.value)}
              placeholder="0" autoFocus
              style={{
                flex: 1, height: 64, padding: '0 16px', borderRadius: 12,
                border: `2px solid ${colors.primary}`, background: colors.card,
                fontSize: 28, fontWeight: 800, color: colors.textPrimary, outline: 'none', textAlign: 'center',
                fontFamily: typography.fontFamily,
              }} />
            <StepMicButton onTranscript={(text) => { const n = text.match(/\d+(\.\d+)?/); if (n) updateField('hoursUsed', n[0]); }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[2, 4, 6, 8, 10, 12].map(n => (
              <div key={n} onClick={() => updateField('hoursUsed', String(n))}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.hoursUsed === String(n) ? colors.primary : colors.border}`,
                  background: data.hoursUsed === String(n) ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.hoursUsed === String(n) ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>{n}h</div>
            ))}
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={goNext} disabled={!data.hoursUsed} style={{ marginTop: 24 }}>
            Next
          </Button>
        </div>
      );

    case 'quantity':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Layers size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Quantity</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Enter the material quantity</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <input type="number" value={data.quantity} onChange={e => updateField('quantity', e.target.value)}
              placeholder="0" autoFocus
              style={{
                flex: 1, height: 64, padding: '0 16px', borderRadius: 12,
                border: `2px solid ${colors.primary}`, background: colors.card,
                fontSize: 28, fontWeight: 800, color: colors.textPrimary, outline: 'none', textAlign: 'center',
                fontFamily: typography.fontFamily,
              }} />
            <StepMicButton onTranscript={(text) => { const n = text.match(/\d+(\.\d+)?/); if (n) updateField('quantity', n[0]); }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[10, 20, 50, 100, 200, 500].map(n => (
              <div key={n} onClick={() => updateField('quantity', String(n))}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.quantity === String(n) ? colors.primary : colors.border}`,
                  background: data.quantity === String(n) ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.quantity === String(n) ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>{n}</div>
            ))}
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={goNext} disabled={!data.quantity} style={{ marginTop: 24 }}>
            Next
          </Button>
        </div>
      );

    case 'unit':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ruler size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Select Unit</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Select the measurement unit</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {UNITS.map(u => (
              <div key={u} onClick={() => { updateField('unit', u); setTimeout(goNext, 200); }}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.unit === u ? colors.primary : colors.border}`,
                  background: data.unit === u ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.unit === u ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>{u}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={customInput} onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { updateField('unit', customInput.trim()); goNext(); } }}
              placeholder="Or type custom unit..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            />
            <Button variant="primary" size="md" onClick={() => { if (customInput.trim()) { updateField('unit', customInput.trim()); goNext(); } }}>
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      );

    case 'rate':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Coins size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>
              {data.entryType === 'equipment' ? 'Equipment Rate (₹/hr)' : 'Unit Price (₹)'}
            </div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
            {data.entryType === 'equipment' ? 'Enter rate per hour' : `Rate per ${data.unit || 'unit'}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <input type="number" value={data.rate} onChange={e => updateField('rate', e.target.value)}
              placeholder="0" autoFocus
              style={{
                flex: 1, height: 64, padding: '0 16px', borderRadius: 12,
                border: `2px solid ${colors.primary}`, background: colors.card,
                fontSize: 28, fontWeight: 800, color: colors.textPrimary, outline: 'none',
                fontFamily: typography.fontFamily,
              }} />
            <StepMicButton onTranscript={(text) => { const n = text.match(/\d[\d,]*/); if (n) updateField('rate', n[0].replace(/,/g, '')); }} />
          </div>
          {data.quantity && data.rate && (
            <div style={{
              padding: '12px 18px', borderRadius: 12,
              background: colors.primaryLight, border: `1px solid ${colors.primary}33`,
              marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>Computed Subtotal</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: colors.primary }}>₹{formatINR(data.quantity * data.rate)}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[10, 50, 100, 350, 450, 1000, 2000].map(n => (
              <div key={n} onClick={() => updateField('rate', String(n))}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.rate === String(n) ? colors.primary : colors.border}`,
                  background: data.rate === String(n) ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.rate === String(n) ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>₹{n}</div>
            ))}
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={goNext} disabled={!data.rate} style={{ marginTop: 24 }}>
            Next
          </Button>
        </div>
      );

    case 'floor':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <MapPin size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Floor</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Select which floor this applies to</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {['Ground Floor', 'First Floor', 'Second Floor', 'Roof', 'Basement', 'N/A'].map(f => (
              <div key={f} onClick={() => { updateField('floor', f); setTimeout(goNext, 200); }}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.floor === f ? colors.primary : colors.border}`,
                  background: data.floor === f ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.floor === f ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>{f}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={customInput} onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { updateField('floor', customInput.trim()); goNext(); } }}
              placeholder="Or type custom floor details..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            />
            <Button variant="primary" size="md" onClick={() => { if (customInput.trim()) { updateField('floor', customInput.trim()); goNext(); } }}>
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      );

    case 'phase':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <ClipboardList size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Phase</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Select the project phase</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {PHASE_OPTIONS.map(p => (
              <div key={p} onClick={() => { updateField('phase', p); setTimeout(goNext, 200); }}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.phase === p ? colors.primary : colors.border}`,
                  background: data.phase === p ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.phase === p ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>{p}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={customInput} onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { updateField('phase', customInput.trim()); goNext(); } }}
              placeholder="Or type custom phase..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            />
            <Button variant="primary" size="md" onClick={() => { if (customInput.trim()) { updateField('phase', customInput.trim()); goNext(); } }}>
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      );

    case 'activity':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Hammer size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Activity</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Select construction activity</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {ACTIVITY_OPTIONS.map(a => (
              <div key={a} onClick={() => { updateField('activity', a); setTimeout(goNext, 200); }}
                style={{
                  padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${data.activity === a ? colors.primary : colors.border}`,
                  background: data.activity === a ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.activity === a ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>{a}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={customInput} onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { updateField('activity', customInput.trim()); goNext(); } }}
              placeholder="Or type custom activity..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            />
            <Button variant="primary" size="md" onClick={() => { if (customInput.trim()) { updateField('activity', customInput.trim()); goNext(); } }}>
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      );

    case 'optionals':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <FileText size={20} color={colors.primary} />
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em' }}>Additional Details</div>
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Fill out any optional records</div>

          <div style={{ maxHeight: '42vh', overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.entryType === 'material' && (
              <>
                <label style={labelStyle}>BRAND</label>
                <input value={data.brand} onChange={e => updateField('brand', e.target.value)}
                  placeholder="e.g. UltraTech" style={inputStyle} />
                <label style={labelStyle}>SUPPLIER</label>
                <input value={data.supplier} onChange={e => updateField('supplier', e.target.value)}
                  placeholder="e.g. local dealer" style={inputStyle} />
              </>
            )}

            {data.entryType === 'labour' && (
              <>
                <label style={labelStyle}>ADVANCE AMOUNT (₹)</label>
                <input type="number" value={data.advanceAmount} onChange={e => updateField('advanceAmount', e.target.value)}
                  placeholder="0" style={inputStyle} />
              </>
            )}

            {data.entryType === 'equipment' && (
              <>
                <label style={labelStyle}>OPERATOR NAME</label>
                <input value={data.operatorName} onChange={e => updateField('operatorName', e.target.value)}
                  placeholder="e.g. Ramesh" style={inputStyle} />
                <label style={labelStyle}>FUEL COST (₹)</label>
                <input type="number" value={data.fuelCost} onChange={e => updateField('fuelCost', e.target.value)}
                  placeholder="0" style={inputStyle} />
              </>
            )}

            <label style={labelStyle}>GST APPLICABLE?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div onClick={() => updateField('gstApplicable', false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${!data.gstApplicable ? colors.primary : colors.border}`,
                  background: !data.gstApplicable ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: !data.gstApplicable ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>No GST</div>
              <div onClick={() => updateField('gstApplicable', true)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${data.gstApplicable ? colors.primary : colors.border}`,
                  background: data.gstApplicable ? colors.primaryLight : colors.card,
                  fontSize: 13, fontWeight: 600, color: data.gstApplicable ? colors.primary : colors.textSecondary,
                  transition: 'all 150ms ease',
                }}>With GST</div>
            </div>
            {data.gstApplicable && (
              <>
                <label style={{ ...labelStyle, marginTop: 4 }}>GST PERCENTAGE</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {GST_PERCENTAGES.filter(g => g > 0).map(g => (
                    <div key={g} onClick={() => updateField('gstPercentage', String(g))}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                        border: `2px solid ${data.gstPercentage === String(g) ? colors.primary : colors.border}`,
                        background: data.gstPercentage === String(g) ? colors.primaryLight : colors.card,
                        fontSize: 13, fontWeight: 600, color: data.gstPercentage === String(g) ? colors.primary : colors.textSecondary,
                        transition: 'all 150ms ease',
                      }}>{g}%</div>
                  ))}
                </div>
              </>
            )}

            <label style={{ ...labelStyle, marginTop: 4 }}>PAYMENT MODE</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_MODES.map(m => (
                <div key={m} onClick={() => updateField('paymentMode', m.toLowerCase())}
                  style={{
                    padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                    border: `1.5px solid ${data.paymentMode === m.toLowerCase() ? colors.primary : colors.border}`,
                    background: data.paymentMode === m.toLowerCase() ? colors.primaryLight : colors.card,
                    fontSize: 12, fontWeight: 600, color: data.paymentMode === m.toLowerCase() ? colors.primary : colors.textSecondary,
                    transition: 'all 150ms ease',
                  }}>{m}</div>
              ))}
            </div>

            <label style={labelStyle}>NOTES</label>
            <textarea value={data.notes} onChange={e => updateField('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              style={{ ...inputStyle, height: 'auto', resize: 'vertical', padding: '12px 16px' }} />
          </div>

          <Button variant="primary" size="lg" fullWidth onClick={goNext} style={{ marginTop: 20 }}>
            Review Entry
          </Button>
        </div>
      );

    case 'review':
      return (
        <div>
          <div style={{
            padding: '20px 24px', borderRadius: 14, marginBottom: 20,
            background: gradients.primaryGradient,
            color: '#fff',
            boxShadow: '0 8px 20px rgba(249, 115, 22, 0.25)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, letterSpacing: '0.06em', marginBottom: 6 }}>TOTAL AMOUNT</div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: typography.fontFamily }}>₹{formatINR(totalAmount)}</div>
            {gstAmount > 0 && (
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, fontWeight: 500 }}>
                +{data.gstPercentage}% GST = ₹{formatINR(gstAmount)}
              </div>
            )}
          </div>
          <div style={{ background: colors.card, borderRadius: 14, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            {[
              { label: 'Type', value: data.entryType?.charAt(0).toUpperCase() + data.entryType?.slice(1) },
              { label: 'Project', value: data.projectName || data.project },
              ...(data.entryType === 'labour' ? [
                { label: 'Labour Type', value: data.labourType },
                { label: 'Workers', value: data.workerCount },
                { label: 'Hours', value: data.hoursWorked },
                { label: 'Daily Wage', value: `₹${formatINR(data.dailyWage)}` },
                ...(data.advanceAmount ? [{ label: 'Advance', value: `₹${formatINR(data.advanceAmount)}` }] : []),
              ] : data.entryType === 'equipment' ? [
                { label: 'Equipment', value: data.equipmentName },
                { label: 'Hours', value: data.hoursUsed },
                { label: 'Rate', value: `₹${formatINR(data.rate)} / hr` },
                ...(data.operatorName ? [{ label: 'Operator', value: data.operatorName }] : []),
                ...(data.fuelCost ? [{ label: 'Fuel Cost', value: `₹${formatINR(data.fuelCost)}` }] : []),
              ] : [
                { label: 'Item', value: data.itemName },
                { label: 'Quantity', value: `${data.quantity} ${data.unit}` },
                { label: 'Rate', value: `₹${formatINR(data.rate)} / ${data.unit}` },
              ]),
              { label: 'Subtotal', value: `₹${formatINR(computedAmount)}` },
              ...(data.brand ? [{ label: 'Brand', value: data.brand }] : []),
              ...(data.supplier ? [{ label: 'Supplier', value: data.supplier }] : []),
              ...(data.gstApplicable ? [{ label: 'GST', value: `${data.gstPercentage}% (+₹${formatINR(gstAmount)})` }] : []),
              { label: 'Payment', value: data.paymentMode?.charAt(0).toUpperCase() + data.paymentMode?.slice(1) },
              ...(data.floor && data.floor !== 'N/A' ? [{ label: 'Floor', value: data.floor }] : []),
              ...(data.phase && data.phase !== 'N/A' ? [{ label: 'Phase', value: data.phase }] : []),
              ...(data.activity && data.activity !== 'N/A' ? [{ label: 'Activity', value: data.activity }] : []),
              ...(data.notes ? [{ label: 'Notes', value: data.notes }] : []),
            ].map((row, i, arr) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px',
                borderBottom: i < arr.length - 1 ? `1px solid ${colors.border}50` : 'none',
              }}>
                <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, textTransform: 'capitalize', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Button variant="ghost" size="lg" onClick={() => setCurrentStep(0)} style={{ flex: 1, border: `1px solid ${colors.border}` }}>
              Edit
            </Button>
            <Button variant="primary" size="lg" onClick={handleSave} style={{ flex: 2 }}>
              Confirm &amp; Save
            </Button>
          </div>
        </div>
      );

    default:
      return null;
  }
}
