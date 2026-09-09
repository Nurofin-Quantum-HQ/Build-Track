import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transactionAPI, voiceAPI } from '../api';
import useProjectStore from '../stores/projectStore';
import useTransactionStore from '../stores/transactionStore';
import perfLogger from '../utils/performanceLogger';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { parseTranscript, computeAmount } from '../utils/voiceParser';
import { createElement } from 'react';
import { colors, radius, shadows, typography, gradients } from '../styles/designTokens';
import { Package, User, Wrench, Building2, MapPin, ClipboardList, Hammer, ArrowLeft, Mic, Sparkles, CheckCircle2, ChevronRight, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import ExecutionContextStep from '../components/ExecutionContextStep';
import ModuleTour from '../components/ModuleTour';
import VoiceReviewSheet from '../components/VoiceReviewSheet';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';

const STATUS = {
  context: 'context',
  idle: 'idle',
  listening: 'listening',
  processing: 'processing',
  extracting: 'extracting',
  summary: 'summary',
  editing: 'editing',
  saving: 'saving',
  completed: 'completed',
  error: 'error',
};

const ENTRY_TYPES = [
  { id: 'material', label: 'Material', icon: 'material', color: '#F97316' },
  { id: 'labor', label: 'Labor', icon: 'labor', color: '#EA580C' },
  { id: 'equipment', label: 'Equipment', icon: 'equipment', color: '#FB923C' },
];

const typeIcons = {
  material: Package,
  labor: User,
  equipment: Wrench,
};

const ENTRY_EXAMPLES = {
  material: 'Say: "20 bags of UltraTech cement at 420 rupees per bag"',
  labour: 'Say: "8 masons worked 9 hours at 850 per day"',
  equipment: 'Say: "JCB excavator worked 6 hours at 1200 per hour, diesel 500"',
};

export default function VoiceAssistantPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedProject = location.state?.project || null;
  const { can, isAdmin } = useAuth();
  
  const allowedTypes = useMemo(() => {
    const types = [];
    if (isAdmin || can('manage_expenses')) types.push("material");
    if (isAdmin || can('add_entries') || can('submit_daily_update')) types.push("labor");
    if (isAdmin || can('manage_equipment_master')) types.push("equipment");
    return types;
  }, [can, isAdmin]);

  const [status, setStatus] = useState(preselectedProject ? STATUS.idle : STATUS.context);
  const [entryType, setEntryType] = useState(() => allowedTypes.length > 0 ? allowedTypes[0] : 'material');
  
  useEffect(() => {
    if (allowedTypes.length === 0) {
      navigate("/");
    } else if (!allowedTypes.includes(entryType)) {
      setEntryType(allowedTypes[0]);
    }
  }, [allowedTypes, entryType, navigate]);

  const [executionContext, setExecutionContext] = useState({
    project: preselectedProject,
    floor: null,
    phase: null,
    activity: null,
  });
  const [parsedData, setParsedData] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [projects, setProjects] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [savedEntryId, setSavedEntryId] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);

  const processTimerRef = useRef(null);
  const autoResetTimerRef = useRef(null);

  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-header', content: 'Use the Voice Assistant to quickly record entries by speaking.', disableBeacon: true },
    { target: '.tour-entry-types', content: 'Select the type of entry before speaking.' },
    { target: '.tour-context', content: 'Set the project, floor, and phase context here.' },
    { target: '.tour-mic', content: 'Tap the microphone and describe your entry naturally.' },
    { target: '.tour-recent', content: 'Recently added entries appear here.' }
  ];

  const {
    interimTranscript,
    accumulatedTranscript,
    isProcessing: speechProcessing,
    isEngineReady,
    error: speechError,
    soundLevel,
    sessionElapsed,
    hasSpeechRecognition,
    startRecording,
    stopRecording,
    resetTranscript,
    resetAll: resetSpeech,
    setProcessing: setSpeechProcessing,
  } = useSpeechRecognition();

  const { transactions: txStore, fetchTransactions: storeFetchTx } = useTransactionStore();

  useEffect(() => {
    perfLogger.endRoute('/voice');
    perfLogger.logMount('VoiceAssistant');
  }, []);

  useEffect(() => {
    useProjectStore.getState().fetchContext().then(list => setProjects(list || [])).catch(() => {});
    storeFetchTx().then(list => {
      const all = list || txStore || [];
      const typeMap = { material: 'Materials', labor: 'Wages', equipment: 'Expense' };
      const currentType = typeMap[entryType];
      const filtered = all.filter(t => {
        if (t.type === 'Income' || t.type === 'Revenue') return false;
        if (currentType && t.type !== currentType) return false;
          if (executionContext.project) {
             const getProjName = (p) => typeof p === 'object' && p ? (p.projectName || p.name || '') : (p || '');
             const projName = getProjName(executionContext.project);
             const tProj = getProjName(t.project) || t.projectName || '';
             if (projName && tProj && tProj !== projName) return false;
          }
        return true;
      });
      setRecentEntries(filtered.slice(0, 5));
    }).catch(() => setRecentEntries([])).finally(() => setRecentLoading(false));
  }, [txStore, storeFetchTx, entryType, executionContext.project]);

  useEffect(() => {
    return () => {
      if (processTimerRef.current) clearInterval(processTimerRef.current);
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === STATUS.processing) {
      setProcessingStage(0);
      processTimerRef.current = setInterval(() => {
        setProcessingStage(prev => {
          if (prev >= 6) { clearInterval(processTimerRef.current); return prev; }
          return prev + 1;
        });
      }, 500);
    } else {
      if (processTimerRef.current) clearInterval(processTimerRef.current);
    }
    return () => { if (processTimerRef.current) clearInterval(processTimerRef.current); };
  }, [status]);

  const handleContextComplete = useCallback((ctx) => {
    setExecutionContext(ctx);
    setStatus(STATUS.idle);
  }, []);

  const handleStartListening = useCallback(() => {
    resetTranscript();
    startRecording();
    setStatus(STATUS.listening);
  }, [startRecording, resetTranscript]);

  const handleStopListening = useCallback(() => {
    stopRecording();

    setTimeout(() => {
      const fullText = accumulatedTranscript || transcript;
      if (fullText.trim()) {
        processTranscript(fullText.trim());
      } else {
        setStatus(STATUS.idle);
      }
    }, 300);
  }, [stopRecording, accumulatedTranscript, transcript]);

  const processTranscript = useCallback(async (text) => {
    setStatus(STATUS.processing);
    setSpeechProcessing(true);
    setTranscript(text);

    let parsed = parseTranscript(text, {
      projectName: executionContext.project?.projectName || executionContext.project?.name,
    });

    if (executionContext.floor) parsed.floor = parsed.floor || executionContext.floor;
    if (executionContext.phase) parsed.phase = parsed.phase || executionContext.phase;
    if (executionContext.activity) parsed.activity = parsed.activity || executionContext.activity;
    if (executionContext.project) {
      parsed.projectId = executionContext.project._id;
      parsed.projectName = parsed.projectName || executionContext.project.projectName || executionContext.project.name;
    }

    try {
      const { data } = await voiceAPI.parse({
        transcript: text,
        workers: [],
        projects: projects.map(p => p.projectName || p.name),
        entryType: parsed.entryType,
      });
      if (data && data.fields) {

        Object.entries(data.fields).forEach(([k, v]) => {
          if (v !== null && v !== undefined && v !== '') {
            parsed[k] = v;
          }
        });
      }
    } catch {

    }

    parsed.amount = computeAmount(parsed);

    if (!allowedTypes.includes(parsed.entryType)) {
      setSpeechProcessing(false);
      setStatus(STATUS.error);
      setSaveError(`You do not have permission to log ${parsed.entryType} entries.`);
      return;
    }

    setParsedData(parsed);
    setEntryType(parsed.entryType);
    setSpeechProcessing(false);
    setStatus(STATUS.extracting);

    setTimeout(() => {
      setStatus(STATUS.summary);
      setShowReview(true);
    }, 800);
  }, [executionContext, projects, setSpeechProcessing]);

  const resetAll = useCallback(() => {
    if (autoResetTimerRef.current) {
      clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = null;
    }
    resetSpeech();
    setParsedData(null);
    setTranscript('');
    setSaveError('');
    setSavedEntryId(null);
    setShowReview(false);
    setProcessingStage(0);
    setStatus(STATUS.idle);
  }, [resetSpeech]);

  const fetchRecentEntries = useCallback(() => {
    setRecentLoading(true);
    transactionAPI.getAll()
      .then(({ data }) => {
        const all = data.transactions || [];
        const typeMap = { material: 'Materials', labor: 'Wages', equipment: 'Expense' };
        const currentType = typeMap[entryType];
        const filtered = all.filter(t => {
          if (t.type === 'Income' || t.type === 'Revenue') return false;
          if (currentType && t.type !== currentType) return false;
          if (executionContext.project) {
         const getProjName = (p) => typeof p === 'object' && p ? (p.projectName || p.name || '') : (p || '');
         const projName = getProjName(executionContext.project);
         const tProj = getProjName(t.project) || t.projectName || '';
         if (projName && tProj && tProj !== projName) return false;
          }
          return true;
        });
        setRecentEntries(filtered.slice(0, 5));
      })
      .catch(() => setRecentEntries([]))
      .finally(() => setRecentLoading(false));
  }, [entryType, executionContext.project]);

  const handleReviewSave = useCallback(async (reviewData) => {
    setShowReview(false);
    setStatus(STATUS.saving);
    setSaveError('');

    try {
      const typeMap = { material: 'Materials', labour: 'Wages', equipment: 'Expense' };
      const amount = Number(reviewData.amount) || 0;

      const payload = {
        title: `${typeMap[reviewData.entryType] || 'Expense'} - ${reviewData.itemName || reviewData.labourType || reviewData.equipmentName || 'Voice Entry'}`,
        amount,
        type: typeMap[reviewData.entryType] || 'Expense',
        date: new Date().toISOString(),
        notes: reviewData.notes || transcript || 'Entered via Voice Assistant',

        project: reviewData.project || executionContext.project?._id || undefined,
        projectName: reviewData.projectName || executionContext.project?.projectName || undefined,
        floor: reviewData.floor || executionContext.floor || undefined,
        phase: reviewData.phase || executionContext.phase || undefined,
        activity: reviewData.activity || executionContext.activity || undefined,

        entryType: reviewData.entryType,
        itemName: reviewData.itemName || undefined,
        labourType: reviewData.labourType || undefined,
        equipmentName: reviewData.equipmentName || reviewData.itemName || undefined,
        quantity: reviewData.quantity ? Number(reviewData.quantity) : undefined,
        unit: reviewData.unit || undefined,
        rate: reviewData.rate ? Number(reviewData.rate) : undefined,
        workerCount: reviewData.workerCount ? Number(reviewData.workerCount) : undefined,
        hoursWorked: reviewData.hoursWorked ? Number(reviewData.hoursWorked) : undefined,
        dailyWage: reviewData.dailyWage ? Number(reviewData.dailyWage) : undefined,
        advanceAmount: reviewData.advanceAmount ? Number(reviewData.advanceAmount) : undefined,
        hoursUsed: reviewData.hoursUsed ? Number(reviewData.hoursUsed) : undefined,
        operatorName: reviewData.operatorName || undefined,
        fuelCost: reviewData.fuelCost ? Number(reviewData.fuelCost) : undefined,

        brand: reviewData.brand || undefined,
        supplier: reviewData.supplier || undefined,
        gstApplicable: reviewData.gstApplicable || false,
        gstPercentage: reviewData.gstPercentage ? Number(reviewData.gstPercentage) : undefined,
        paymentMode: reviewData.paymentMode || 'cash',
        rawTranscript: transcript,
      };

      if (reviewData.entryType === 'material') {
        payload.subType = "Purchase";
        payload.category = ""; 
      } else if (reviewData.entryType === 'labour') {
        payload.category = reviewData.contractor || "";
        payload.remarks = reviewData.labourType || "";
      } else if (reviewData.entryType === 'equipment') {
        payload.category = reviewData.equipmentName || "";
        payload.supplier = reviewData.operatorName || reviewData.supplier || "";
      }

      Object.keys(payload).forEach(k => {
        if (payload[k] === undefined) delete payload[k];
      });

      const { data } = await transactionAPI.create(payload);
      setSavedEntryId(data?.transaction?._id || data?._id || null);
      setStatus(STATUS.completed);
      fetchRecentEntries();
      autoResetTimerRef.current = setTimeout(() => {
        resetAll();
      }, 2000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save entry');
      setStatus(STATUS.summary);
      setShowReview(true);
    }
  }, [transcript, executionContext, fetchRecentEntries, resetAll]);

  const viewEntries = useCallback(() => {
    const p = new URLSearchParams();
    if (executionContext?.project) {
      const proj = typeof executionContext.project === 'string' ? executionContext.project : (executionContext.project.projectName || executionContext.project.name || '');
      if (proj) p.set("search", proj);
    }
    if (entryType === 'material') p.set("type", "Materials");
    else if (entryType === 'labor') p.set("type", "Wages");
    else if (entryType === 'equipment') p.set("type", "Expense");
    navigate(`/transaction?${p.toString()}`);
  }, [navigate, executionContext, entryType]);

  const isListening = status === STATUS.listening;
  const isIdle = status === STATUS.idle;
  const isProcessing = status === STATUS.processing;
  const isExtracting = status === STATUS.extracting;
  const isSummary = status === STATUS.summary;
  const isSaving = status === STATUS.saving;
  const isCompleted = status === STATUS.completed;
  const isError = status === STATUS.error;
  const isContext = status === STATUS.context;

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{
      display: 'flex', width: '100%', height: '100vh',
      fontFamily: typography.fontFamily, background: colors.bg,
      overflow: 'hidden', flex: 1, minWidth: 0,
      flexDirection: 'column',
    }}>
      <style>{`
        @keyframes barWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes orbPulse {
          0%, 100% { box-shadow: 0 0 0 0px rgba(249, 115, 22, 0.2), 0 0 0 0px rgba(249, 115, 22, 0.1); }
          50% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0.15), 0 0 0 20px rgba(249, 115, 22, 0.08); }
        }
        .voice-card { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .fade-in { animation: fadeIn 0.3s ease; }
        .wave-bar {
          animation: barWave 1s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>

      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="VoiceEntry" />

      <div className="tour-header" style={{
        padding: '14px 24px', display: 'flex', alignItems: 'center',
        gap: 16, flexShrink: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)}
          className="premium-topbar-btn"
          style={{
            width: 38, height: 38, borderRadius: 10,
          }}
          aria-label="Go Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.02em' }}>
            {isContext ? 'Set Entry Context' : isCompleted ? 'Success' : 'BuildTrack AI'}
          </div>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
            {isContext
              ? 'Specify project location, floor, phase & construction activity'
              : isListening
              ? `Listening... ${formatTime(sessionElapsed)}`
              : isProcessing
              ? 'Analyzing voice input...'
              : isCompleted
              ? 'Entry saved successfully'
              : 'AI Voice Entry'}
          </div>
        </div>
        <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
          <HelpCircle size={16} color={colors.textLight} />
        </button>
        {isListening && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20,
            background: '#FEE2E2', border: '1px solid #FCA5A5',
            fontSize: 12, fontWeight: 700, color: '#DC2626',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', animation: 'orbPulse 1.5s ease-in-out infinite' }} />
            REC {formatTime(sessionElapsed)}
          </div>
        )}
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 24, paddingBottom: (isIdle || isListening) ? 180 : 40,
      }}>

        {isContext && (
          <ExecutionContextStep
            projects={projects}
            onComplete={handleContextComplete}
            onCancel={() => navigate(-1)}
          />
        )}

        {(isIdle || isListening) && (
          <>
            <div className="voice-card tour-entry-types" style={{
              background: colors.card, borderRadius: '14px',
              border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02)',
              padding: '8px', maxWidth: 440, width: '100%',
              display: 'flex', gap: 4,
            }}>
              {ENTRY_TYPES.filter(t => allowedTypes.includes(t.id)).map(t => (
                <button key={t.id} onClick={() => !isListening && setEntryType(t.id)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: '10px', border: 'none',
                    fontWeight: 700, fontSize: 13, cursor: isListening ? 'not-allowed' : 'pointer',
                    textTransform: 'capitalize', opacity: isListening ? 0.6 : 1,
                    background: entryType === t.id
                      ? gradients.primaryGradient
                      : 'transparent',
                    color: entryType === t.id ? '#FFF' : colors.textSecondary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}>
                  {createElement(typeIcons[t.icon] || Package, { size: 15, color: entryType === t.id ? '#FFF' : colors.textSecondary })} {t.label}
                </button>
              ))}
            </div>

            {(executionContext.project || executionContext.floor || executionContext.activity) && (
              <div className="voice-card tour-context" style={{
                background: colors.primarySubtle, borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                padding: '12px 18px', maxWidth: 600, width: '100%',
                display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
              }}>
                {executionContext.project && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={14} color={colors.primary} /> {executionContext.project.projectName || executionContext.project.name}
                    </span>
                )}
                {executionContext.floor && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, background: colors.card, padding: '4px 10px', borderRadius: 8, border: `1px solid ${colors.border}` }}>
                    <MapPin size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {executionContext.floor}
                  </span>
                )}
                {executionContext.phase && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, background: colors.card, padding: '4px 10px', borderRadius: 8, border: `1px solid ${colors.border}` }}>
                    <ClipboardList size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {executionContext.phase}
                  </span>
                )}
                {executionContext.activity && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, background: colors.card, padding: '4px 10px', borderRadius: 8, border: `1px solid ${colors.border}` }}>
                    <Hammer size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {executionContext.activity}
                  </span>
                )}
                <span
                  onClick={() => !isListening && setStatus(STATUS.context)}
                  style={{ fontSize: 12, fontWeight: 700, color: colors.primary, cursor: 'pointer', marginLeft: 'auto', textDecoration: 'underline' }}>
                  Edit
                </span>
              </div>
            )}

            <div className="voice-card tour-mic" style={{
              background: colors.card, borderRadius: '14px',
              border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              padding: '32px 24px', textAlign: 'center', maxWidth: 600, width: '100%',
            }}>
              {isListening ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.primary, letterSpacing: '0.08em', marginBottom: 16, textTransform: 'uppercase' }}>
                    LIVE TRANSCRIPT
                  </div>
                  <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 20 }}>
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div key={i} className="wave-bar"
                        style={{
                          width: 3, borderRadius: 99,
                          height: `${Math.max(4, soundLevel * 36)}px`,
                          background: gradients.primaryGradient,
                          animationDelay: `${i * 0.04}s`,
                          animationDuration: `${0.5 + (i % 5) * 0.1}s`,
                        }} />
                    ))}
                  </div>

                  <div style={{
                    background: 'rgba(249, 115, 22, 0.03)',
                    borderRadius: '12px', border: `1px solid ${colors.border}`,
                    padding: '18px', fontSize: 15, color: colors.textPrimary, fontWeight: 500,
                    lineHeight: 1.6, minHeight: 64, textAlign: 'left',
                  }}>
                    {interimTranscript || accumulatedTranscript || 'Listening... Speak now'}
                  </div>
                  <div style={{ marginTop: 16, height: 4, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99, width: `${soundLevel * 100}%`,
                      background: gradients.primaryGradient,
                      transition: 'width 0.1s ease',
                    }} />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: colors.textSecondary, fontWeight: 500 }}>
                    {formatTime(sessionElapsed)} &middot; Tap mic button below to stop recording
                  </div>
                </>
              ) : (
                <div style={{ padding: '16px 0' }}>
                  <div
                    onClick={handleStartListening}
                    style={{
                      width: 90, height: 90, borderRadius: '50%', margin: '0 auto 20px',
                      background: gradients.primaryGradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 10px 24px rgba(249, 115, 22, 0.25)',
                      transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    className="hover-scale"
                  >
                    <Mic size={36} color="white" />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em', marginBottom: 8 }}>
                    Tap to Start Listening
                  </div>
                  <div style={{ fontSize: 14, color: colors.textSecondary, maxWidth: 360, margin: '0 auto' }}>
                    Speak naturally. Our AI will automatically extract items, quantities, floors, and rates.
                  </div>
                  {!hasSpeechRecognition && (
                    <div style={{ fontSize: 13, color: colors.danger, fontWeight: 600, marginTop: 12 }}>
                      Speech recognition not supported. Please use Chrome or Edge.
                    </div>
                  )}
                  {speechError && (
                    <div style={{ fontSize: 13, color: colors.danger, fontWeight: 600, marginTop: 12 }}>
                      {speechError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isIdle && (
              <div className="voice-card" style={{
                background: colors.primarySubtle, borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                padding: '16px 20px', maxWidth: 600, width: '100%',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <Sparkles size={18} color={colors.primary} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.primary, marginBottom: 4 }}>Example Phrase:</div>
                  <div style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 1.4 }}>
                    {ENTRY_EXAMPLES[entryType]}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {isProcessing && (
          <div className="voice-card" style={{
            background: colors.card, borderRadius: '14px',
            border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            padding: '24px', maxWidth: 520, width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: colors.primaryLight,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: colors.primary,
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>BuildTrack AI</span>
                  <Badge variant="gradient" size="sm" style={{ textTransform: 'uppercase' }}>
                    {entryType}
                  </Badge>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.primary, marginTop: 2 }}>Processing...</div>
              </div>
            </div>
            <div style={{ borderRadius: '12px', background: colors.bg, padding: 18, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, marginBottom: 14 }}>
                Extracting details...
              </div>
              {['Entry Type', 'Item / Labour / Equipment', 'Quantity & Rate', 'Floor & Phase', 'Amount', 'Brand / Details'].map((label, i) => {
                const icon = processingStage > i + 1 ? 'completed' : processingStage === i + 1 ? 'current' : 'pending';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, opacity: icon === 'pending' ? 0.4 : 1 }}>
                    <div style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {icon === 'completed' ? (
                        <CheckCircle2 size={16} color={colors.success} />
                      ) : icon === 'current' ? (
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${colors.primary}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                      ) : (
                        <div style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${colors.textTertiary}` }} />
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: icon === 'current' ? 700 : 500, color: colors.textPrimary }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isExtracting && parsedData && (
          <div className="voice-card fade-in" style={{
            background: colors.card, borderRadius: '14px',
            border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            padding: '24px', maxWidth: 520, width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, marginBottom: 14 }}>
              AI Understanding Entry
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {[
                { label: 'Type', value: parsedData.entryType, active: true },
                { label: 'Item', value: parsedData.items?.[0] || parsedData.labourType || parsedData.equipmentName, active: !!parsedData.items?.[0] },
                { label: 'Qty', value: parsedData.quantity, active: !!parsedData.quantity },
                { label: 'Rate', value: parsedData.unitPrice ? `₹${parsedData.unitPrice}` : null, active: !!parsedData.unitPrice },
                { label: 'Amount', value: parsedData.amount ? `₹${parsedData.amount.toLocaleString('en-IN')}` : null, active: !!parsedData.amount },
              ].filter(f => f.value).map(f => (
                <div key={f.label} style={{
                  padding: '6px 12px', borderRadius: 10,
                  background: colors.successLight, border: `1px solid #BBF7D0`,
                  fontSize: 12, fontWeight: 600, color: '#16A34A',
                }}>
                  {f.label}: {String(f.value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {isSaving && (
          <div className="voice-card fade-in" style={{
            background: colors.card, borderRadius: '14px',
            border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            padding: '32px', maxWidth: 400, width: '100%', textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
              border: `3px solid ${colors.primaryLight}`,
              borderTopColor: colors.primary,
              animation: 'spin 0.7s linear infinite',
            }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>
              Saving Entry...
            </div>
            <div style={{ fontSize: 13, color: colors.textSecondary }}>
              Please wait
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="voice-card fade-in" style={{
            background: colors.card, borderRadius: '14px',
            border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            padding: '32px 28px', textAlign: 'center', maxWidth: 500, width: '100%',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: gradients.primaryGradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(249, 115, 22, 0.25)',
            }}>
              <CheckCircle2 size={32} color="white" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.02em', marginBottom: 6 }}>
              Entry Saved Successfully!
            </div>
            <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
              Your {entryType} entry has been recorded.
            </div>
            {parsedData && (
              <div style={{
                background: colors.successLight, borderRadius: '12px',
                border: '1px solid #BBF7D0', padding: '16px 20px', marginBottom: 24, textAlign: 'left',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>Type</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textPrimary, textTransform: 'capitalize' }}>{entryType}</span>
                </div>
                <div style={{ height: 1, background: '#DCFCE7', marginBottom: 8 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>Item</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textPrimary }}>
                    {parsedData.items?.[0] || parsedData.labourType || parsedData.equipmentName || '-'}
                  </span>
                </div>
                <div style={{ height: 1, background: '#DCFCE7', marginBottom: 8 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>Amount</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textPrimary }}>₹{parsedData.amount?.toLocaleString('en-IN') || '0'}</span>
                </div>
                {savedEntryId && (
                  <>
                    <div style={{ height: 1, background: '#DCFCE7', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: colors.textSecondary }}>Entry ID</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors.textPrimary, fontFamily: 'monospace' }}>{savedEntryId}</span>
                    </div>
                  </>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button variant="primary" size="md" fullWidth onClick={resetAll}>
                Add Another Entry
              </Button>
              <Button variant="ghost" size="md" fullWidth onClick={viewEntries} style={{ border: `1px solid ${colors.border}` }}>
                View All Entries
              </Button>
            </div>
          </div>
        )}

        {(isError || saveError) && (
          <div className="voice-card fade-in" style={{
            background: colors.card, borderRadius: '14px',
            border: `1px solid ${colors.danger}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            padding: '24px', maxWidth: 500, width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={20} color={colors.danger} />
              <span style={{ fontSize: 15, fontWeight: 700, color: colors.danger }}>Error</span>
            </div>
            <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
              {saveError || speechError || 'Something went wrong. Please try again.'}
            </div>
            <Button variant="danger" size="md" fullWidth onClick={() => { setSaveError(''); resetAll(); }}>
              Try Again
            </Button>
          </div>
        )}

        {(isIdle || isContext) && (
          <div className="tour-recent" style={{ width: '100%', maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>Recent Entries</h3>
              <span onClick={viewEntries}
                style={{ fontSize: 13, color: colors.primary, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                View History
              </span>
            </div>
            <div style={{
              background: colors.card, borderRadius: '14px',
              border: `1px solid ${colors.border}`, overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}>
              {recentLoading ? (
                <div style={{ padding: 30, textAlign: 'center', color: colors.textSecondary, fontSize: 14 }}>Loading...</div>
              ) : recentEntries.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: colors.textSecondary, fontSize: 14 }}>No entries yet</div>
              ) : recentEntries.map((t, i) => {
                const typeLabel = t.type || 'Expense';
                const typeColor = typeLabel === 'Materials' ? colors.primary : typeLabel === 'Wages' ? '#D97706' : typeLabel === 'Income' ? colors.success : colors.textSecondary;
                const typeBg = typeLabel === 'Materials' ? colors.primaryLight : typeLabel === 'Wages' ? '#FFFBEB' : typeLabel === 'Income' ? '#F0FDF4' : colors.subtle;
                return (
                  <div key={t._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: i < recentEntries.length - 1 ? `1px solid ${colors.border}` : 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, marginBottom: 2 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={colors.textTertiary} />
                        {new Date(t.date).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: typeBg, color: typeColor,
                    }}>{typeLabel.toUpperCase()}</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: typeLabel === 'Income' ? colors.success : colors.textPrimary, marginLeft: 16, minWidth: 80, textAlign: 'right' }}>
                      {typeLabel === 'Income' ? '+' : '-'}₹{(t.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {(isIdle || isListening) && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(248, 250, 252, 0.98) 60%, rgba(248, 250, 252, 0))',
          padding: '24px 24px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          display: 'flex', justifyContent: 'center', zIndex: 20,
        }}>
          <button
            onClick={isListening ? handleStopListening : handleStartListening}
            style={{
              width: isListening ? 68 : 76,
              height: isListening ? 68 : 76,
              borderRadius: '50%', border: 'none',
              background: isListening
                ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                : gradients.primaryGradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isListening
                ? '0 6px 20px rgba(239,68,68,0.4)'
                : '0 8px 30px rgba(249, 115, 22, 0.3)',
              transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="hover-scale"
          >
            {isListening ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <Mic size={30} color="white" />
            )}
          </button>
        </div>
      )}

      <VoiceReviewSheet
        key={showReview ? 'review-open' : 'review-closed'}
        isOpen={showReview}
        onClose={() => { setShowReview(false); setStatus(STATUS.summary); }}
        initialData={parsedData || {}}
        projects={projects}
        executionContext={executionContext}
        onSave={handleReviewSave}
      />
    </div>
  );
}