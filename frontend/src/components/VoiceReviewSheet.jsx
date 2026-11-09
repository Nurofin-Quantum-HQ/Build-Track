import { useState, useCallback, useRef, useEffect } from "react";
import { PAYMENT_MODES, GST_PERCENTAGES, ACTIVITY_OPTIONS, PHASE_OPTIONS } from "../utils/voiceConstants";
import {
  Package, Users, Wrench, Building2, MapPin, ClipboardList, Hammer, Clock, Mic, Coins, Ruler, Tag,
  ChevronRight, X, Check, Layers, FileText, CheckSquare,
} from "lucide-react";
import { BtButton, BtChip, BtField, BtTextarea, BtIconButton, BtProgress } from "./ui";

const ENTRY_TYPES = [
  { id: 'material', label: 'Material', icon: Package, desc: 'Cement, sand, steel, bricks...' },
  { id: 'labour', label: 'Labour', icon: Users, desc: 'Workers, masons, helpers...' },
  { id: 'equipment', label: 'Equipment', icon: Wrench, desc: 'JCB, crane, mixer...' },
];

const TYPE_VAR = { material: 'var(--type-material)', labour: 'var(--type-labour)', equipment: 'var(--type-equipment)' };

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
    <BtIconButton
      icon={Mic}
      size={48}
      active={listening}
      label={listening ? 'Stop listening' : 'Speak this value'}
      onClick={() => (listening ? stop() : start(onTranscript))}
      style={listening ? { color: 'var(--status-danger)', borderColor: 'var(--status-danger)' } : undefined}
    />
  );
}

/* ───────── Small building blocks shared by every step ───────── */

function StepHeading({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {Icon && <Icon size={20} color="var(--ink)" strokeWidth={1.9} />}
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{title}</h3>
      </div>
      {subtitle && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

function ChipRow({ items, isSelected, onPick, format = (x) => x, style }) {
  return (
    <div role="group" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, ...style }}>
      {items.map((item) => (
        <BtChip key={item} label={format(item)} selected={isSelected(item)} onClick={() => onPick(item)} variant="accent" aria-pressed={isSelected(item)} />
      ))}
    </div>
  );
}

function TypeInRow({ value, onChange, placeholder, label, onSubmit, mic }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <BtField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } }}
      />
      {mic ? (
        mic
      ) : (
        <BtButton variant="primary" aria-label="Use this value" onClick={onSubmit} style={{ width: 48, minHeight: 48, height: 48, padding: 0, flexShrink: 0, borderRadius: 'var(--r-input)' }}>
          <ChevronRight size={18} />
        </BtButton>
      )}
    </div>
  );
}

function NumberStep({ label, value, onChange, onMic, step, isCurrency, helper, quick, quickFormat, onQuick, isQuickSelected, onNext }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 16 }}>
        <BtField
          label={label}
          required
          type="number"
          step={step}
          isCurrency={isCurrency}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          autoFocus
          inputStyle={{ fontSize: 22, fontWeight: 700 }}
        />
        <StepMicButton onTranscript={onMic} />
      </div>
      {helper}
      <ChipRow items={quick} isSelected={isQuickSelected} onPick={onQuick} format={quickFormat} />
      <BtButton variant="primary" fullWidth onClick={onNext} disabled={!value} style={{ marginTop: 24 }}>
        Next
      </BtButton>
    </div>
  );
}

function SubtotalPill({ label, value }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 'var(--r-input)', background: 'var(--accent-soft)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 600 }}>{label}</span>
      <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{'\u20B9'}{value}</span>
    </div>
  );
}

function Eyebrow({ children, style }) {
  return <div className="bt-eyebrow" style={{ color: 'var(--ink-3)', margin: '4px 0 8px', ...style }}>{children}</div>;
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

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleSave = () => {
    onSave?.({
      ...data,
      amount: totalAmount,
      computedAmount,
      gstAmount,
    });
  };

  if (!isOpen || !step) return null;

  const progress = ((currentStep + 1) / steps.length);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, background: 'var(--scrim)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review voice entry"
        style={{
          width: '100%', maxWidth: 600, maxHeight: '92vh',
          background: 'var(--ground)', borderRadius: 'var(--r-sheet) var(--r-sheet) 0 0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: 'var(--shadow-raised)',
          animation: 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 2px' }}>
          <div style={{ width: 44, height: 5, borderRadius: 99, background: 'var(--input-border)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px 14px', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: 'var(--ink)', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Mic size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Check your entry</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>
                Step {currentStep + 1} of {steps.length} &middot; {step.label}
              </div>
            </div>
          </div>
          <BtIconButton icon={X} label="Close review" size={40} onClick={onClose} />
        </div>

        <div style={{ padding: '0 24px 14px' }}>
          <BtProgress value={progress} height={6} color="var(--ink)" aria-label={`Step ${currentStep + 1} of ${steps.length}`} />
        </div>

        {currentStep > 0 && (
          <div style={{ display: 'flex', gap: 8, padding: '0 24px 12px', overflowX: 'auto', flexShrink: 0 }}>
            {steps.slice(0, currentStep).map(s => {
              const val = getStepValue(s.id, data);
              if (!val) return null;
              const Icon = stepIconMap[s.id] || Package;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setCurrentStep(steps.indexOf(s))}
                  aria-label={`Edit ${s.label}: ${val}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
                    borderRadius: 'var(--r-full)', border: '1px solid var(--line)', background: 'var(--card)',
                    fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)',
                    whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                  }}
                >
                  <Icon size={13} color="var(--ink-2)" />
                  <span>{val}</span>
                  <Check size={13} color="var(--status-success)" strokeWidth={2.6} />
                </button>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 28px' }}>
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
  const pickAndNext = (field) => (v) => { updateField(field, v); setTimeout(goNext, 200); };
  const submitCustom = (field, extra) => () => {
    const v = customInput.trim();
    if (!v) return;
    updateField(field, v);
    extra?.(v);
    goNext();
  };

  switch (step.id) {
    case 'entryType':
      return (
        <div>
          <StepHeading title="What type of entry?" subtitle="Pick the category that best describes this entry." />
          <div className="bt-grid-3" role="radiogroup" aria-label="Entry type">
            {ENTRY_TYPES.map(t => {
              const TIcon = t.icon;
              const sel = data.entryType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => { updateField('entryType', t.id); setTimeout(goNext, 200); }}
                  className="bt-hover-card"
                  style={{
                    font: 'inherit', margin: 0, boxSizing: 'border-box', padding: '20px 12px', borderRadius: 'var(--r-card)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                    border: `2px solid ${sel ? 'var(--ink)' : 'var(--line)'}`,
                    background: 'var(--card)', textAlign: 'center',
                    boxShadow: sel ? '0 0 0 4px var(--accent-soft)' : 'none',
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', background: 'var(--fill)', color: TYPE_VAR[t.id],
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px',
                  }}>
                    <TIcon size={22} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.35 }}>{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      );

    case 'project':
      return (
        <div>
          <StepHeading icon={Building2} title="Select project" subtitle="Which project is this entry for?" />
          {projects.length > 0 && (
            <div role="radiogroup" aria-label="Project" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {projects.map(p => {
                const sel = data.project === p._id;
                return (
                  <button
                    key={p._id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => { updateField('project', p._id); updateField('projectName', p.projectName || p.name); setTimeout(goNext, 200); }}
                    className="bt-hover-row"
                    style={{
                      font: 'inherit', margin: 0, textAlign: 'left', padding: '14px 16px', borderRadius: 'var(--r-input)', cursor: 'pointer',
                      border: `2px solid ${sel ? 'var(--ink)' : 'var(--line)'}`, background: 'var(--card)',
                      display: 'flex', alignItems: 'center', gap: 14, minHeight: 64,
                    }}
                  >
                    <span style={{ width: 40, height: 40, borderRadius: 'var(--r-chip)', background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', flexShrink: 0 }}>
                      <Building2 size={18} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{p.projectName || p.name}</span>
                      {p.location && <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{p.location}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <TypeInRow
            label="Or type a project name"
            placeholder="Type project name..."
            value={customInput}
            onChange={setCustomInput}
            onSubmit={() => {
              const v = customInput.trim();
              if (v) { updateField('project', v); updateField('projectName', v); goNext(); }
            }}
          />
        </div>
      );

    case 'itemName':
      return (
        <div>
          <StepHeading icon={Tag} title="Item name" subtitle="What is this entry about?" />
          <ChipRow items={QUICK_ITEMS[data.entryType] || []} isSelected={i => data.itemName === i} onPick={pickAndNext('itemName')} style={{ marginBottom: 20 }} />
          <TypeInRow
            label="Or type the item"
            placeholder="Type item name..."
            value={customInput}
            onChange={setCustomInput}
            onSubmit={submitCustom('itemName')}
            mic={<StepMicButton onTranscript={(text) => updateField('itemName', text)} />}
          />
        </div>
      );

    case 'labourType':
      return (
        <div>
          <StepHeading icon={Users} title="Labour type" subtitle="What type of worker?" />
          <ChipRow items={LABOUR_TYPES} isSelected={i => data.labourType === i} onPick={pickAndNext('labourType')} style={{ marginBottom: 20 }} />
          <TypeInRow
            label="Or type the labour type"
            placeholder="Type labour type..."
            value={customInput}
            onChange={setCustomInput}
            onSubmit={submitCustom('labourType')}
            mic={<StepMicButton onTranscript={(text) => updateField('labourType', text)} />}
          />
        </div>
      );

    case 'workerCount':
      return (
        <div>
          <StepHeading icon={Users} title="Worker count" subtitle="How many workers?" />
          <NumberStep
            label="Number of workers" value={data.workerCount} onChange={(v) => updateField('workerCount', v)}
            onMic={(text) => { const n = text.match(/\d+/); if (n) updateField('workerCount', n[0]); }}
            quick={[1, 2, 3, 5, 8, 10, 15, 20]} quickFormat={(n) => String(n)}
            isQuickSelected={(n) => data.workerCount === String(n)} onQuick={(n) => updateField('workerCount', String(n))}
            onNext={goNext}
          />
        </div>
      );

    case 'hoursWorked':
      return (
        <div>
          <StepHeading icon={Clock} title="Hours worked" subtitle="How many hours?" />
          <NumberStep
            label="Hours worked" value={data.hoursWorked} onChange={(v) => updateField('hoursWorked', v)}
            onMic={(text) => { const n = text.match(/\d+(\.\d+)?/); if (n) updateField('hoursWorked', n[0]); }}
            quick={[4, 6, 8, 9, 10, 12]} quickFormat={(n) => `${n}h`}
            isQuickSelected={(n) => data.hoursWorked === String(n)} onQuick={(n) => updateField('hoursWorked', String(n))}
            onNext={goNext}
          />
        </div>
      );

    case 'dailyWage':
      return (
        <div>
          <StepHeading icon={Coins} title="Daily wage" subtitle="Rate per worker per day." />
          <NumberStep
            label="Daily wage" isCurrency value={data.dailyWage} onChange={(v) => updateField('dailyWage', v)}
            onMic={(text) => { const n = text.match(/\d[\d,]*/); if (n) updateField('dailyWage', n[0].replace(/,/g, '')); }}
            helper={data.workerCount && data.hoursWorked && data.dailyWage
              ? <SubtotalPill label="Total amount" value={formatINR(data.workerCount * data.hoursWorked * data.dailyWage)} /> : null}
            quick={[500, 600, 800, 1000, 1200, 1500]} quickFormat={(n) => `\u20B9${n}`}
            isQuickSelected={(n) => data.dailyWage === String(n)} onQuick={(n) => updateField('dailyWage', String(n))}
            onNext={goNext}
          />
        </div>
      );

    case 'equipmentName':
      return (
        <div>
          <StepHeading icon={Wrench} title="Equipment" subtitle="Which equipment was used?" />
          <ChipRow items={QUICK_ITEMS.equipment} isSelected={i => data.equipmentName === i} onPick={pickAndNext('equipmentName')} style={{ marginBottom: 20 }} />
          <TypeInRow
            label="Or type the equipment"
            placeholder="Type equipment name..."
            value={customInput}
            onChange={setCustomInput}
            onSubmit={submitCustom('equipmentName')}
            mic={<StepMicButton onTranscript={(text) => updateField('equipmentName', text)} />}
          />
        </div>
      );

    case 'hoursUsed':
      return (
        <div>
          <StepHeading icon={Clock} title="Hours used" subtitle="How many hours was it operated?" />
          <NumberStep
            label="Hours used" value={data.hoursUsed} onChange={(v) => updateField('hoursUsed', v)}
            onMic={(text) => { const n = text.match(/\d+(\.\d+)?/); if (n) updateField('hoursUsed', n[0]); }}
            quick={[2, 4, 6, 8, 10, 12]} quickFormat={(n) => `${n}h`}
            isQuickSelected={(n) => data.hoursUsed === String(n)} onQuick={(n) => updateField('hoursUsed', String(n))}
            onNext={goNext}
          />
        </div>
      );

    case 'quantity':
      return (
        <div>
          <StepHeading icon={Layers} title="Quantity" subtitle="Enter the material quantity." />
          <NumberStep
            label="Quantity" step="any" value={data.quantity} onChange={(v) => updateField('quantity', v)}
            onMic={(text) => { const n = text.match(/\d+(\.\d+)?/); if (n) updateField('quantity', n[0]); }}
            quick={[10, 20, 50, 100, 200, 500]} quickFormat={(n) => String(n)}
            isQuickSelected={(n) => data.quantity === String(n)} onQuick={(n) => updateField('quantity', String(n))}
            onNext={goNext}
          />
        </div>
      );

    case 'unit':
      return (
        <div>
          <StepHeading icon={Ruler} title="Select unit" subtitle="Select the measurement unit." />
          <ChipRow items={UNITS} isSelected={i => data.unit === i} onPick={pickAndNext('unit')} style={{ marginBottom: 20 }} />
          <TypeInRow label="Or type a custom unit" placeholder="Type custom unit..." value={customInput} onChange={setCustomInput} onSubmit={submitCustom('unit')} />
        </div>
      );

    case 'rate':
      return (
        <div>
          <StepHeading
            icon={Coins}
            title={data.entryType === 'equipment' ? 'Equipment rate (\u20B9/hr)' : 'Unit price (\u20B9)'}
            subtitle={data.entryType === 'equipment' ? 'Enter rate per hour.' : `Rate per ${data.unit || 'unit'}.`}
          />
          <NumberStep
            label={data.entryType === 'equipment' ? 'Rate per hour' : 'Rate per unit'} isCurrency step="any" value={data.rate} onChange={(v) => updateField('rate', v)}
            onMic={(text) => { const n = text.match(/\d[\d,]*/); if (n) updateField('rate', n[0].replace(/,/g, '')); }}
            helper={data.quantity && data.rate ? <SubtotalPill label="Computed subtotal" value={formatINR(data.quantity * data.rate)} /> : null}
            quick={[10, 50, 100, 350, 450, 1000, 2000]} quickFormat={(n) => `\u20B9${n}`}
            isQuickSelected={(n) => data.rate === String(n)} onQuick={(n) => updateField('rate', String(n))}
            onNext={goNext}
          />
        </div>
      );

    case 'floor':
      return (
        <div>
          <StepHeading icon={MapPin} title="Floor" subtitle="Which floor does this apply to?" />
          <ChipRow items={['Ground Floor', 'First Floor', 'Second Floor', 'Roof', 'Basement', 'N/A']} isSelected={i => data.floor === i} onPick={pickAndNext('floor')} style={{ marginBottom: 20 }} />
          <TypeInRow label="Or type floor details" placeholder="Type custom floor details..." value={customInput} onChange={setCustomInput} onSubmit={submitCustom('floor')} />
        </div>
      );

    case 'phase':
      return (
        <div>
          <StepHeading icon={ClipboardList} title="Phase" subtitle="Select the project phase." />
          <ChipRow items={PHASE_OPTIONS} isSelected={i => data.phase === i} onPick={pickAndNext('phase')} style={{ marginBottom: 20 }} />
          <TypeInRow label="Or type a phase" placeholder="Type custom phase..." value={customInput} onChange={setCustomInput} onSubmit={submitCustom('phase')} />
        </div>
      );

    case 'activity':
      return (
        <div>
          <StepHeading icon={Hammer} title="Activity" subtitle="Select the construction activity." />
          <ChipRow items={ACTIVITY_OPTIONS} isSelected={i => data.activity === i} onPick={pickAndNext('activity')} style={{ marginBottom: 20 }} />
          <TypeInRow label="Or type an activity" placeholder="Type custom activity..." value={customInput} onChange={setCustomInput} onSubmit={submitCustom('activity')} />
        </div>
      );

    case 'optionals':
      return (
        <div>
          <StepHeading icon={FileText} title="Additional details" subtitle="Everything here is optional." />
          <div style={{ maxHeight: '42vh', overflowY: 'auto', padding: '4px 4px 4px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.entryType === 'material' && (
              <>
                <BtField label="Brand" value={data.brand} onChange={e => updateField('brand', e.target.value)} placeholder="e.g. UltraTech" />
                <BtField label="Supplier" value={data.supplier} onChange={e => updateField('supplier', e.target.value)} placeholder="e.g. local dealer" />
              </>
            )}
            {data.entryType === 'labour' && (
              <BtField label="Advance amount" isCurrency type="number" value={data.advanceAmount} onChange={e => updateField('advanceAmount', e.target.value)} placeholder="0" />
            )}
            {data.entryType === 'equipment' && (
              <>
                <BtField label="Operator name" value={data.operatorName} onChange={e => updateField('operatorName', e.target.value)} placeholder="e.g. Ramesh" />
                <BtField label="Fuel cost" isCurrency type="number" value={data.fuelCost} onChange={e => updateField('fuelCost', e.target.value)} placeholder="0" />
              </>
            )}

            <div>
              <Eyebrow>GST applicable?</Eyebrow>
              <div style={{ display: 'flex', gap: 8 }}>
                <BtChip label="No GST" selected={!data.gstApplicable} variant="accent" onClick={() => updateField('gstApplicable', false)} style={{ flex: 1, justifyContent: 'center', height: 44 }} aria-pressed={!data.gstApplicable} />
                <BtChip label="With GST" selected={!!data.gstApplicable} variant="accent" onClick={() => updateField('gstApplicable', true)} style={{ flex: 1, justifyContent: 'center', height: 44 }} aria-pressed={!!data.gstApplicable} />
              </div>
            </div>

            {data.gstApplicable && (
              <div>
                <Eyebrow>GST percentage</Eyebrow>
                <div style={{ display: 'flex', gap: 8 }}>
                  {GST_PERCENTAGES.filter(g => g > 0).map(g => (
                    <BtChip key={g} label={`${g}%`} selected={data.gstPercentage === String(g)} variant="accent" onClick={() => updateField('gstPercentage', String(g))} style={{ flex: 1, justifyContent: 'center', height: 44 }} aria-pressed={data.gstPercentage === String(g)} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <Eyebrow>Payment mode</Eyebrow>
              <ChipRow items={PAYMENT_MODES} isSelected={m => data.paymentMode === m.toLowerCase()} onPick={(m) => updateField('paymentMode', m.toLowerCase())} />
            </div>

            <BtTextarea label="Notes" value={data.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Any additional notes..." rows={3} />
          </div>

          <BtButton variant="primary" fullWidth onClick={goNext} style={{ marginTop: 20 }}>
            Review entry
          </BtButton>
        </div>
      );

    case 'review': {
      const rows = [
        { label: 'Type', value: data.entryType?.charAt(0).toUpperCase() + data.entryType?.slice(1) },
        { label: 'Project', value: data.projectName || data.project },
        ...(data.entryType === 'labour' ? [
          { label: 'Labour type', value: data.labourType },
          { label: 'Workers', value: data.workerCount },
          { label: 'Hours', value: data.hoursWorked },
          { label: 'Daily wage', value: `\u20B9${formatINR(data.dailyWage)}`, num: true },
          ...(data.advanceAmount ? [{ label: 'Advance', value: `\u20B9${formatINR(data.advanceAmount)}`, num: true }] : []),
        ] : data.entryType === 'equipment' ? [
          { label: 'Equipment', value: data.equipmentName },
          { label: 'Hours', value: data.hoursUsed },
          { label: 'Rate', value: `\u20B9${formatINR(data.rate)} / hr`, num: true },
          ...(data.operatorName ? [{ label: 'Operator', value: data.operatorName }] : []),
          ...(data.fuelCost ? [{ label: 'Fuel cost', value: `\u20B9${formatINR(data.fuelCost)}`, num: true }] : []),
        ] : [
          { label: 'Item', value: data.itemName },
          { label: 'Quantity', value: `${data.quantity} ${data.unit}` },
          { label: 'Rate', value: `\u20B9${formatINR(data.rate)} / ${data.unit}`, num: true },
        ]),
        { label: 'Subtotal', value: `\u20B9${formatINR(computedAmount)}`, num: true },
        ...(data.brand ? [{ label: 'Brand', value: data.brand }] : []),
        ...(data.supplier ? [{ label: 'Supplier', value: data.supplier }] : []),
        ...(data.gstApplicable ? [{ label: 'GST', value: `${data.gstPercentage}% (+\u20B9${formatINR(gstAmount)})`, num: true }] : []),
        { label: 'Payment', value: data.paymentMode?.charAt(0).toUpperCase() + data.paymentMode?.slice(1) },
        ...(data.floor && data.floor !== 'N/A' ? [{ label: 'Floor', value: data.floor }] : []),
        ...(data.phase && data.phase !== 'N/A' ? [{ label: 'Phase', value: data.phase }] : []),
        ...(data.activity && data.activity !== 'N/A' ? [{ label: 'Activity', value: data.activity }] : []),
        ...(data.notes ? [{ label: 'Notes', value: data.notes }] : []),
      ];
      return (
        <div>
          <div style={{ padding: '20px 24px', borderRadius: 'var(--r-card)', marginBottom: 16, background: 'var(--noir)', color: 'var(--on-noir)' }}>
            <div className="bt-eyebrow" style={{ color: 'var(--on-noir-3)', marginBottom: 6 }}>Total amount</div>
            <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>{'\u20B9'}{formatINR(totalAmount)}</div>
            {gstAmount > 0 && (
              <div style={{ fontSize: 13, color: 'var(--on-noir-2)', marginTop: 4 }}>
                Includes {data.gstPercentage}% GST of {'\u20B9'}{formatINR(gstAmount)}
              </div>
            )}
          </div>
          <div style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--line)', overflow: 'hidden' }}>
            {rows.map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, padding: '12px 18px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{row.label}</span>
                <span className={row.num ? 'tnum' : undefined} style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', textAlign: 'right', maxWidth: '62%', overflowWrap: 'anywhere' }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
            <BtButton variant="secondary" onClick={() => setCurrentStep(0)} style={{ flex: 1 }}>
              Edit
            </BtButton>
            <BtButton variant="primary" onClick={handleSave} style={{ flex: 2 }}>
              Confirm &amp; save
            </BtButton>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
