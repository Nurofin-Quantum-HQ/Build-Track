import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transactionAPI, voiceAPI } from '../api';
import useProjectStore from '../stores/projectStore';
import useTransactionStore from '../stores/transactionStore';
import perfLogger from '../utils/performanceLogger';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { parseTranscript, computeAmount } from '../utils/voiceParser';
import {
  Package,
  Users,
  Wrench,
  Building2,
  MapPin,
  ClipboardList,
  Hammer,
  Mic,
  Square,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  Pencil,
  Loader2,
} from 'lucide-react';
import ExecutionContextStep from '../components/ExecutionContextStep';
import ModuleTour from '../components/ModuleTour';
import VoiceReviewSheet from '../components/VoiceReviewSheet';
import {
  BtHero,
  BtSheet,
  BtPageHeader,
  BtIconButton,
  BtButton,
  BtCard,
  BtBadge,
  BtSegmented,
  BtSkeleton,
  BtSectionHeader,
  BtEmpty,
  BtProgress,
  formatInr,
} from '../components/ui';
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
  { id: 'material', label: 'Material', icon: Package },
  { id: 'labour', label: 'Labour', icon: Users },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
];

const ENTRY_EXAMPLES = {
  material: '"20 bags of UltraTech cement at 420 rupees per bag"',
  labour: '"8 masons worked 9 hours at 850 per day"',
  equipment: '"JCB excavator worked 6 hours at 1200 per hour, diesel 500"',
};

const TX_TYPE = { material: 'Materials', labour: 'Wages', equipment: 'Expense' };
const TX_TONE = { Materials: 'material', Wages: 'labour', Expense: 'equipment', Income: 'income', Revenue: 'income' };
const TX_LABEL = { Materials: 'Material', Wages: 'Labour', Expense: 'Equipment', Income: 'Income', Revenue: 'Income' };

const formatDate = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const projName = (p) => (typeof p === 'object' && p ? p.projectName || p.name || '' : p || '');

export default function VoiceAssistantPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedProject = location.state?.project || null;
  const requestedType = location.state?.type === 'labor' ? 'labour' : location.state?.type;
  const { can, isAdmin } = useAuth();

  const allowedTypes = useMemo(() => {
    const types = [];
    if (isAdmin || can('manage_expenses') || can('add_entries')) types.push('material');
    if (isAdmin || can('add_entries') || can('submit_daily_update')) types.push('labour');
    if (isAdmin || can('manage_equipment_master')) types.push('equipment');
    return types;
  }, [can, isAdmin]);

  const [status, setStatus] = useState(preselectedProject ? STATUS.idle : STATUS.context);
  const [entryType, setEntryType] = useState(() =>
    allowedTypes.includes(requestedType) ? requestedType : allowedTypes.length > 0 ? allowedTypes[0] : 'material'
  );

  useEffect(() => {
    if (allowedTypes.length === 0) {
      navigate('/');
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
  const retryTimerRef = useRef(null);
  const latestTranscriptRef = useRef('');

  const [runTour, setRunTour] = useState(false);

  const tourSteps = [
    { target: '.tour-header', content: 'Use the Voice Assistant to quickly record entries by speaking.', disableBeacon: true },
    { target: '.tour-entry-types', content: 'Select the type of entry before speaking.' },
    { target: '.tour-context', content: 'Set the project, floor, and phase context here.' },
    { target: '.tour-mic', content: 'Tap the microphone and describe your entry naturally.' },
    { target: '.tour-recent', content: 'Recently added entries appear here.' },
  ];

  const {
    interimTranscript,
    accumulatedTranscript,
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

  // Keep the newest transcript reachable from the delayed stop handler.
  latestTranscriptRef.current = accumulatedTranscript || interimTranscript || '';

  const { fetchTransactions: storeFetchTx } = useTransactionStore();

  const filterRecent = useCallback(
    (all) => {
      const currentType = TX_TYPE[entryType];
      return (all || [])
        .filter((t) => {
          if (t.type === 'Income' || t.type === 'Revenue') return false;
          if (currentType && t.type !== currentType) return false;
          if (executionContext.project) {
            const pn = projName(executionContext.project);
            const tProj = projName(t.project) || t.projectName || '';
            if (pn && tProj && tProj !== pn) return false;
          }
          return true;
        })
        .slice(0, 5);
    },
    [entryType, executionContext.project]
  );

  useEffect(() => {
    perfLogger.endRoute('/voice');
    perfLogger.logMount('VoiceAssistant');
  }, []);

  useEffect(() => {
    useProjectStore
      .getState()
      .fetchContext()
      .then((list) => setProjects(list || []))
      .catch(() => {});
    storeFetchTx()
      .then((list) => {
        const all = list || useTransactionStore.getState().transactions || [];
        setRecentEntries(filterRecent(all));
      })
      .catch(() => setRecentEntries([]))
      .finally(() => setRecentLoading(false));
  }, [storeFetchTx, filterRecent]);

  useEffect(() => {
    return () => {
      if (processTimerRef.current) clearInterval(processTimerRef.current);
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === STATUS.processing) {
      setProcessingStage(0);
      processTimerRef.current = setInterval(() => {
        setProcessingStage((prev) => {
          if (prev >= 6) {
            clearInterval(processTimerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    } else if (processTimerRef.current) {
      clearInterval(processTimerRef.current);
    }
    return () => {
      if (processTimerRef.current) clearInterval(processTimerRef.current);
    };
  }, [status]);

  const handleContextComplete = useCallback((ctx) => {
    setExecutionContext(ctx);
    setStatus(STATUS.idle);
  }, []);

  const handleStartListening = useCallback(() => {
    setSaveError('');
    resetTranscript();
    startRecording();
    setStatus(STATUS.listening);
  }, [startRecording, resetTranscript]);

  const handleRetry = useCallback(() => {
    stopRecording();
    resetTranscript();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => startRecording(), 250);
  }, [stopRecording, resetTranscript, startRecording]);

  const processTranscript = useCallback(
    async (text) => {
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
          projects: projects.map((p) => p.projectName || p.name),
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
        // The local parser result is used when the AI parser is unavailable.
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
    },
    [executionContext, projects, setSpeechProcessing, allowedTypes]
  );

  const handleStopListening = useCallback(() => {
    stopRecording();

    setTimeout(() => {
      const fullText = latestTranscriptRef.current || transcript;
      if (fullText.trim()) {
        processTranscript(fullText.trim());
      } else {
        setStatus(STATUS.idle);
        setSaveError("Couldn't hear or understand any speech. Please tap the mic and try again.");
      }
    }, 300);
  }, [stopRecording, transcript, processTranscript]);

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
    transactionAPI
      .getAll()
      .then(({ data }) => setRecentEntries(filterRecent(data.transactions || [])))
      .catch(() => setRecentEntries([]))
      .finally(() => setRecentLoading(false));
  }, [filterRecent]);

  const handleReviewSave = useCallback(
    async (reviewData) => {
      setShowReview(false);
      setStatus(STATUS.saving);
      setSaveError('');

      try {
        const amount = Number(reviewData.amount) || 0;

        const payload = {
          title: `${TX_TYPE[reviewData.entryType] || 'Expense'} - ${reviewData.itemName || reviewData.labourType || reviewData.equipmentName || 'Voice Entry'}`,
          amount,
          type: TX_TYPE[reviewData.entryType] || 'Expense',
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
          payload.subType = 'Purchase';
          payload.category = '';
        } else if (reviewData.entryType === 'labour') {
          payload.category = reviewData.contractor || '';
          payload.remarks = reviewData.labourType || '';
        } else if (reviewData.entryType === 'equipment') {
          payload.category = reviewData.equipmentName || '';
          payload.supplier = reviewData.operatorName || reviewData.supplier || '';
        }

        Object.keys(payload).forEach((k) => {
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
    },
    [transcript, executionContext, fetchRecentEntries, resetAll]
  );

  const viewEntries = useCallback(() => {
    const p = new URLSearchParams();
    if (executionContext?.project) {
      const proj = typeof executionContext.project === 'string' ? executionContext.project : projName(executionContext.project);
      if (proj) p.set('search', proj);
    }
    if (TX_TYPE[entryType]) p.set('type', TX_TYPE[entryType]);
    navigate(`/transaction?${p.toString()}`);
  }, [navigate, executionContext, entryType]);

  const isListening = status === STATUS.listening;
  const isIdle = status === STATUS.idle;
  const isProcessing = status === STATUS.processing;
  const isExtracting = status === STATUS.extracting;
  const isSaving = status === STATUS.saving;
  const isCompleted = status === STATUS.completed;
  const isError = status === STATUS.error;
  const isContext = status === STATUS.context;

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const subtitle = isContext
    ? 'Choose the project and where the work happened, then speak your entry.'
    : isListening
    ? `Listening… ${formatTime(sessionElapsed)}`
    : isProcessing
    ? 'Working out the details from what you said…'
    : isCompleted
    ? 'Entry saved.'
    : 'Say what happened on site. AI fills in the details and you check them before saving.';

  const typeOptions = ENTRY_TYPES.filter((t) => allowedTypes.includes(t.id)).map((t) => ({
    value: t.id,
    label: t.label,
    icon: t.icon,
  }));

  const contextChips = [
    executionContext.project && { icon: Building2, text: projName(executionContext.project), strong: true },
    executionContext.floor && { icon: MapPin, text: executionContext.floor },
    executionContext.phase && { icon: ClipboardList, text: executionContext.phase },
    executionContext.activity && { icon: Hammer, text: executionContext.activity },
  ].filter(Boolean);

  const bigMicStyle = {
    width: 96,
    height: 96,
    borderRadius: '50%',
    border: 'none',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'var(--ink)',
    color: '#FFFFFF',
    boxShadow: '0 0 0 6px var(--accent-soft), var(--shadow-raised)',
    transition: 'transform 200ms var(--ease)',
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes micRing {
          0% { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .voice-mic-btn:hover { transform: scale(1.05); }
        .voice-wave-lg { height: 44px; gap: 4px; justify-content: center; }
        .voice-wave-lg span { width: 4px; }
      `}</style>

      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="VoiceEntry" />

      <div className="tour-header">
        <BtHero>
          <div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
            <BtPageHeader
              back={{ label: 'Back', onClick: () => navigate(-1) }}
              eyebrow="Field operations · AI foreman"
              title="Voice entry"
              subtitle={subtitle}
              size="md"
              actions={<BtIconButton icon={HelpCircle} label="Page tour" onDark onClick={() => setRunTour(true)} />}
            />
          </div>
        </BtHero>
      </div>

      <BtSheet padding="28px 28px 64px">
        <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {isContext && (
            <ExecutionContextStep projects={projects} onComplete={handleContextComplete} onCancel={() => navigate(-1)} />
          )}

          {(isIdle || isListening) && (
            <>
              <div className="tour-entry-types" style={{ opacity: isListening ? 0.55 : 1, pointerEvents: isListening ? 'none' : 'auto' }}>
                <BtSegmented options={typeOptions} value={entryType} onChange={setEntryType} style={{ width: '100%', maxWidth: 460 }} />
              </div>

              {contextChips.length > 0 && (
                <BtCard className="tour-context" padding="12px 16px">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {contextChips.map((c, i) => {
                      const Icon = c.icon;
                      return (
                        <span
                          key={i}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            height: 30,
                            padding: '0 12px',
                            borderRadius: 'var(--r-chip)',
                            background: c.strong ? 'var(--ink)' : 'var(--fill)',
                            color: c.strong ? '#FFFFFF' : 'var(--ink)',
                            fontFamily: 'var(--font-ui)',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          <Icon size={14} strokeWidth={1.9} />
                          {c.text}
                        </span>
                      );
                    })}
                    <span style={{ marginLeft: 'auto' }}>
                      <BtButton variant="ghost" size="compact" icon={Pencil} disabled={isListening} onClick={() => setStatus(STATUS.context)}>
                        Edit
                      </BtButton>
                    </span>
                  </div>
                </BtCard>
              )}

              <BtCard className="tour-mic" padding="32px 24px" style={{ textAlign: 'center' }}>
                {isListening ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-danger-bright)', animation: 'pulse 1.2s ease-in-out infinite' }} />
                      <span className="bt-eyebrow" style={{ color: 'var(--status-danger)' }}>Listening</span>
                      <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                        {formatTime(sessionElapsed)}
                      </span>
                    </div>

                    <div style={{ position: 'relative', width: 96, height: 96 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          animation: 'micRing 1.6s ease-out infinite',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          color: 'var(--on-accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 28px var(--accent-glow)',
                        }}
                      >
                        <Mic size={38} strokeWidth={2} />
                      </span>
                    </div>

                    <div className="voice-wave voice-wave-lg" aria-hidden="true">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <span key={i} style={{ animationDelay: `${(i % 5) * 0.12}s`, opacity: 0.45 + Math.min(0.55, soundLevel) }} />
                      ))}
                    </div>

                    <div style={{ width: '100%', maxWidth: 420 }}>
                      <BtProgress value={Math.min(1, soundLevel)} height={6} aria-label="Microphone level" />
                    </div>

                    <div
                      aria-live="polite"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'var(--ground)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--r-input)',
                        padding: '14px 16px',
                        fontFamily: 'var(--font-ui)',
                        fontSize: 15,
                        lineHeight: 1.6,
                        minHeight: 64,
                        color: interimTranscript || accumulatedTranscript ? 'var(--ink)' : 'var(--ink-3)',
                      }}
                    >
                      {interimTranscript || accumulatedTranscript || 'Speak now. Your words appear here.'}
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <BtButton variant="secondary" size="small" icon={RotateCcw} onClick={handleRetry}>
                        Retry
                      </BtButton>
                      <BtButton variant="primary" size="small" icon={Square} onClick={handleStopListening}>
                        Stop and review
                      </BtButton>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    <button type="button" aria-label="Start recording" onClick={handleStartListening} className="voice-mic-btn" style={bigMicStyle}>
                      <Mic size={38} strokeWidth={2} />
                    </button>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '20px 0 6px' }}>
                      Tap to start speaking
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)', maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>
                      Speak naturally. AI picks out the item, quantity, rate, floor and phase.
                    </div>
                    {!hasSpeechRecognition && (
                      <div role="alert" style={{ fontSize: 14, color: 'var(--status-danger)', fontWeight: 600, marginTop: 14 }}>
                        Speech recognition is not supported here. Please use Chrome or Edge.
                      </div>
                    )}
                    {speechError && (
                      <div role="alert" style={{ fontSize: 14, color: 'var(--status-danger)', fontWeight: 600, marginTop: 14 }}>
                        {speechError}
                        {String(speechError).toLowerCase().includes('not-allowed') && (
                          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, fontWeight: 500 }}>
                            To enable it, click the lock icon in your browser address bar and set Microphone to "Allow".
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </BtCard>

              {isIdle && (
                <BtCard padding="16px 20px" style={{ background: 'var(--accent-soft)', border: '1px solid transparent', boxShadow: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Sparkles size={18} color="var(--accent-ink)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--accent-ink)', marginBottom: 4 }}>
                        Try saying
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        {ENTRY_EXAMPLES[entryType]}
                      </div>
                    </div>
                  </div>
                </BtCard>
              )}
            </>
          )}

          {isProcessing && (
            <BtCard padding="24px">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-ink)' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>BuildTrack AI</span>
                    <BtBadge tone={entryType} label={ENTRY_TYPES.find((t) => t.id === entryType)?.label || entryType} />
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>Extracting details…</div>
                </div>
              </div>
              <div style={{ borderRadius: 'var(--r-input)', background: 'var(--ground)', padding: 18, border: '1px solid var(--line)' }}>
                {['Entry type', 'Item / labour / equipment', 'Quantity and rate', 'Floor and phase', 'Amount', 'Brand and details'].map((label, i) => {
                  const state = processingStage > i + 1 ? 'completed' : processingStage === i + 1 ? 'current' : 'pending';
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < 5 ? 12 : 0, opacity: state === 'pending' ? 0.5 : 1 }}>
                      <div style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {state === 'completed' ? (
                          <CheckCircle2 size={17} color="var(--status-success)" />
                        ) : state === 'current' ? (
                          <Loader2 size={16} color="var(--ink)" style={{ animation: 'spin 0.8s linear infinite' }} />
                        ) : (
                          <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid var(--input-border)' }} />
                        )}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: state === 'current' ? 700 : 500, color: 'var(--ink)' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </BtCard>
          )}

          {isExtracting && parsedData && (
            <BtCard padding="24px" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 14 }}>
                Here is what AI understood
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {[
                  { label: 'Type', value: parsedData.entryType },
                  { label: 'Item', value: parsedData.items?.[0] || parsedData.labourType || parsedData.equipmentName },
                  { label: 'Qty', value: parsedData.quantity },
                  { label: 'Rate', value: parsedData.unitPrice ? formatInr(parsedData.unitPrice) : null },
                  { label: 'Amount', value: parsedData.amount ? formatInr(parsedData.amount) : null },
                ]
                  .filter((f) => f.value)
                  .map((f) => (
                    <BtBadge key={f.label} tone="success" showDot={false} label={`${f.label}: ${String(f.value)}`} style={{ height: 28, fontSize: 13 }} />
                  ))}
              </div>
            </BtCard>
          )}

          {isSaving && (
            <BtCard padding="32px" style={{ textAlign: 'center' }}>
              <Loader2 size={36} color="var(--ink)" style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Saving entry…</div>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4 }}>Just a moment</div>
            </BtCard>
          )}

          {isCompleted && (
            <BtCard padding="32px 28px" style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  margin: '0 auto 18px',
                  background: 'var(--status-success-soft)',
                  color: 'var(--status-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={34} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 6 }}>
                Entry saved
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>Your {entryType} entry has been recorded.</div>
              {parsedData && (
                <div style={{ background: 'var(--ground)', borderRadius: 'var(--r-input)', border: '1px solid var(--line)', padding: '4px 18px', marginBottom: 22, textAlign: 'left' }}>
                  {[
                    { k: 'Type', v: ENTRY_TYPES.find((t) => t.id === entryType)?.label || entryType },
                    { k: 'Item', v: parsedData.items?.[0] || parsedData.labourType || parsedData.equipmentName || '-' },
                    { k: 'Amount', v: formatInr(parsedData.amount || 0), num: true },
                    ...(savedEntryId ? [{ k: 'Entry ID', v: savedEntryId, mono: true }] : []),
                  ].map((r, i, arr) => (
                    <div
                      key={r.k}
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 14 }}
                    >
                      <span style={{ color: 'var(--ink-2)' }}>{r.k}</span>
                      <span className={r.num ? 'tnum' : undefined} style={{ fontWeight: 600, color: 'var(--ink)', fontFamily: r.mono ? 'var(--font-mono)' : undefined, overflowWrap: 'anywhere', textAlign: 'right' }}>
                        {r.v}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <BtButton variant="primary" fullWidth onClick={resetAll}>
                  Add another entry
                </BtButton>
                <BtButton variant="secondary" fullWidth onClick={viewEntries}>
                  View all entries
                </BtButton>
              </div>
            </BtCard>
          )}

          {(isError || saveError) && !isListening && (
            <BtCard padding="22px" style={{ border: '1px solid var(--status-danger)' }}>
              <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <AlertTriangle size={20} color="var(--status-danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--status-danger)' }}>Something went wrong</div>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.5 }}>
                    {saveError || speechError || 'Something went wrong. Please try again.'}
                  </div>
                </div>
              </div>
              <BtButton
                variant="primary"
                fullWidth
                onClick={() => {
                  setSaveError('');
                  resetAll();
                }}
              >
                Try again
              </BtButton>
            </BtCard>
          )}

          {(isIdle || isContext) && (
            <section className="tour-recent" style={{ marginTop: 12 }}>
              <BtSectionHeader title="Recent entries" action="View history" onAction={viewEntries} />
              <BtCard padding="0">
                {recentLoading ? (
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[0, 1, 2].map((i) => (
                      <BtSkeleton key={i} height="44px" />
                    ))}
                  </div>
                ) : recentEntries.length === 0 ? (
                  <BtEmpty icon={Clock} title="No entries yet" message="Entries you add will show up here." style={{ padding: '32px 24px' }} />
                ) : (
                  recentEntries.map((t, i) => {
                    const isIncome = t.type === 'Income' || t.type === 'Revenue';
                    return (
                      <div
                        key={t._id}
                        className="bt-hover-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 20px',
                          borderBottom: i < recentEntries.length - 1 ? '1px solid var(--line)' : 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                            <Clock size={12} color="var(--ink-3)" />
                            {formatDate(t.date)}
                          </div>
                        </div>
                        <BtBadge tone={TX_TONE[t.type] || 'neutral'} label={TX_LABEL[t.type] || t.type || 'Entry'} />
                        <div className="tnum" style={{ fontSize: 15, fontWeight: 700, color: isIncome ? 'var(--status-success)' : 'var(--ink)', minWidth: 84, textAlign: 'right' }}>
                          {isIncome ? '+' : ''}
                          {formatInr(t.amount || 0)}
                        </div>
                      </div>
                    );
                  })
                )}
              </BtCard>
            </section>
          )}
        </div>
      </BtSheet>

      <VoiceReviewSheet
        key={showReview ? 'review-open' : 'review-closed'}
        isOpen={showReview}
        onClose={() => {
          setShowReview(false);
          setStatus(STATUS.idle);
        }}
        initialData={parsedData || {}}
        projects={projects}
        executionContext={executionContext}
        onSave={handleReviewSave}
      />
    </div>
  );
}
