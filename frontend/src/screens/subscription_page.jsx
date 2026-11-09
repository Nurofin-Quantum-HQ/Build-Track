import { useState, useEffect, useRef } from "react";
import { subscriptionAPI } from "../api";
import { useAuth } from "../contexts/AuthContext";
import {
  AlertCircle,
  Building2,
  Check,
  CreditCard,
  HelpCircle,
  Info,
  Lock,
  Phone,
  RefreshCw,
  Users,
  X,
  Zap,
} from "lucide-react";
import ModuleTour from "../components/ModuleTour";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import BtHero from "../components/ui/BtHero";
import BtPageHeader from "../components/ui/BtPageHeader";
import BtSheet from "../components/ui/BtSheet";
import BtCard from "../components/ui/BtCard";
import BtBadge from "../components/ui/BtBadge";
import BtButton from "../components/ui/BtButton";
import BtIconButton from "../components/ui/BtIconButton";
import BtSegmented from "../components/ui/BtSegmented";
import BtSkeleton from "../components/ui/BtSkeleton";
import BtField from "../components/ui/BtField";
import btToast from "../components/ui/BtToast";

const PLANS = [
  {
    id: "free",
    title: "Free",
    price: 0,
    period: "forever",
    tagline: "Try out BuildTrack with no commitment.",
    users: "2 users",
    projects: "1 project / 30 days",
    features: [
      "1 project / 30 days",
      "Up to 2 users",
      "Basic project tracking",
      "Labour & material entries",
      "Community support",
    ],
    highlighted: false,
  },
  {
    id: "starter",
    title: "Starter",
    price: 2,
    period: "/mo",
    tagline: "For small teams just getting started.",
    users: "5 users",
    projects: "2 projects",
    features: [
      "2 active projects",
      "Up to 5 users",
      "Labour & material tracking",
      "Basic reports",
      "Email support",
    ],
    highlighted: false,
  },
  {
    id: "growth",
    title: "Growth",
    price: 999,
    period: "/mo",
    tagline: "Scale your operations with more capacity.",
    users: "8 users",
    projects: "4 projects",
    features: [
      "4 active projects",
      "Up to 8 users",
      "Advanced reports & analytics",
      "Inventory tracking",
      "Priority support",
    ],
    highlighted: false,
  },
  {
    id: "pro",
    title: "Pro",
    price: 1499,
    period: "/mo",
    tagline: "Everything you need for growing teams.",
    users: "15 users",
    projects: "6 projects",
    features: [
      "6 active projects",
      "Up to 15 users",
      "Full inventory & receipt storage",
      "Advanced cost analytics",
      "24/7 priority support",
    ],
    highlighted: true,
  },
  {
    id: "business",
    title: "Business",
    price: 2499,
    period: "/mo",
    tagline: "For agencies managing multiple sites.",
    users: "25 users",
    projects: "12 projects",
    features: [
      "12 active projects",
      "Up to 25 users",
      "Role management",
      "API access",
      "Dedicated support",
    ],
    highlighted: false,
  },
  {
    id: "enterprise",
    title: "Enterprise",
    price: 4999,
    period: "/mo",
    tagline: "Advanced tools for large, multi-team operations.",
    users: "Unlimited users",
    projects: "Unlimited",
    features: [
      "Unlimited projects",
      "Unlimited users",
      "Multi-user role management",
      "Custom integrations & API",
      "Dedicated account manager",
    ],
    highlighted: false,
  },
];

const BILLING_OPTIONS = [
  { label: "AutoPay", value: "auto", icon: RefreshCw },
  { label: "One-time", value: "once", icon: Zap },
];

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Phone number modal — shown when Airpay requires buyer_phone */
function PhoneModal({ planTitle, onSubmit, onCancel, loading }) {
  const [phone, setPhone] = useState("");
  const [savePhone, setSavePhone] = useState(true);
  const [phoneError, setPhoneError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    const onKey = (e) => { if (e.key === "Escape" && !loading) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [loading, onCancel]);

  function validate(val) {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "Phone number is required.";
    if (digits.length < 8 || digits.length > 15) return "Enter a valid phone number (8–15 digits).";
    return "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate(phone);
    if (err) { setPhoneError(err); return; }
    onSubmit({ phone: phone.replace(/\D/g, ""), savePhone });
  }

  return (
    <div
      onClick={() => { if (!loading) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "var(--scrim)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)", borderRadius: "var(--r-sheet)", padding: "28px 28px 24px",
          maxWidth: 440, width: "100%", boxShadow: "var(--shadow-raised)",
          position: "relative", boxSizing: "border-box",
        }}
      >
        <div style={{ position: "absolute", top: 14, right: 14 }}>
          <BtIconButton icon={X} label="Close" size={36} onClick={onCancel} disabled={loading} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, paddingRight: 40 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "var(--r-tile)", background: "var(--accent-soft)",
            color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Phone size={20} strokeWidth={1.9} />
          </div>
          <div>
            <h2 id="phone-modal-title" style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              Mobile number needed
            </h2>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>
              For the {planTitle} plan payment
            </div>
          </div>
        </div>

        <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, margin: "0 0 18px" }}>
          Airpay requires your mobile number to process the payment securely.
          It is used only for payment verification.
        </p>

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <BtField
            label="Mobile number"
            required
            type="tel"
            inputMode="tel"
            icon={Phone}
            placeholder="e.g. 9876543210"
            value={phone}
            error={phoneError}
            onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
            ref={inputRef}
          />

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ink-2)", cursor: "pointer", minHeight: 40 }}>
            <input
              type="checkbox"
              checked={savePhone}
              onChange={(e) => setSavePhone(e.target.checked)}
              style={{ accentColor: "var(--ink)", width: 18, height: 18, flexShrink: 0 }}
            />
            Save this number to my profile for future payments
          </label>

          <BtButton type="submit" variant="primary" fullWidth loading={loading}>
            Continue to payment
          </BtButton>
        </form>
      </div>
    </div>
  );
}

function PlanCardSkeleton() {
  return (
    <BtCard padding="24px" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <BtSkeleton width="40%" height="22px" />
      <BtSkeleton width="80%" height="14px" />
      <BtSkeleton width="50%" height="40px" />
      <BtSkeleton height="56px" />
      <BtSkeleton width="90%" height="14px" />
      <BtSkeleton width="75%" height="14px" />
      <BtSkeleton width="85%" height="14px" />
      <BtSkeleton height="52px" borderRadius="var(--r-button)" style={{ marginTop: 8 }} />
    </BtCard>
  );
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [loading, setLoading]         = useState(true);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [subStatus, setSubStatus]     = useState(null);
  const [processing, setProcessing]   = useState(null);
  const [error, setError]             = useState("");
  const [runTour, setRunTour]         = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [restoring, setRestoring]     = useState(false);

  // Phone modal state
  const [phonePlan, setPhonePlan]     = useState(null); // which plan triggered modal
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [isAutoRenew, setIsAutoRenew]   = useState(true); // true = Monthly AutoPay (default), false = One-Time Payment

  const tourSteps = [
    { target: '.tour-current-plan', content: 'Here is your current active subscription and its status.', disableBeacon: true },
    { target: '.tour-plans', content: 'Explore our available plans. Upgrade to unlock more projects and users.' },
    { target: '.tour-restore-purchases', content: 'If you have upgraded on another device, use this to sync your purchases.' }
  ];

  useEffect(() => {
    // Check for payment return status in URL
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") {
      setError("");
      // Clear query params
      window.history.replaceState({}, "", window.location.pathname);
    } else if (status === "failed") {
      const reason = params.get("reason");
      if (reason) {
        setError(`Payment failed: ${reason}`);
      } else {
        setError("Payment was not completed. Please try again.");
      }
      window.history.replaceState({}, "", window.location.pathname);
    } else if (status === "pending") {
      setError("Payment is being confirmed. Please wait a moment and refresh.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    subscriptionAPI
      .getStatus()
      .then(({ data }) => {
        if (!isMounted) return;
        if (data.hasSubscription) {
          setCurrentPlan(data.plan || "free");
          setSubStatus(data);
        } else {
          setCurrentPlan("free");
          setSubStatus({ hasSubscription: false, plan: "free" });
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setCurrentPlan("free");
        setSubStatus({ hasSubscription: false, plan: "free" });
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  /**
   * Submits Airpay payment form.
   * paymentParams contains: airpayUrl + form fields.
   */
  function submitAirpayForm(paymentParams, airpayRequest) {
    const { airpayUrl, ...formFields } = paymentParams;
    if (airpayRequest) {
      console.log("[AirPay Request] encrypted payload contents:", JSON.stringify(airpayRequest, null, 2));
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = airpayUrl;
    Object.entries(formFields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type  = "hidden";
      input.name  = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  /**
   * Initiates payment — handles phone-required 422 response
   * by showing the PhoneModal.
   */
  const handleSubscribe = async (planId, phoneData = null) => {
    if (planId === currentPlan) return;
    if (planId === "free") return;

    try {
      setProcessing(planId);
      setError("");

      const payload = { plan: planId, isRecurring: isAutoRenew };
      if (phoneData) {
        payload.phone     = phoneData.phone;
        payload.savePhone = phoneData.savePhone;
      }

      const { data } = await subscriptionAPI.initiate(payload);

      if (data.success && data.paymentParams) {
        submitAirpayForm(data.paymentParams, data.airpayRequest);
      }
    } catch (err) {
      const status = err.response?.status;
      const body   = err.response?.data;

      if (status === 422 && body?.requiresPhone) {
        // Show phone modal — keep processing state so button shows "Processing…"
        setProcessing(null);
        setPhonePlan(planId);
        return;
      }

      setError(body?.message || "Failed to initiate payment. Please try again.");
    } finally {
      if (!phonePlan) setProcessing(null);
    }
  };

  /** Called when user submits phone number from modal */
  const handlePhoneSubmit = async ({ phone, savePhone }) => {
    setPhoneLoading(true);
    try {
      const { data } = await subscriptionAPI.initiate({
        plan: phonePlan,
        phone,
        savePhone,
        isRecurring: isAutoRenew,

      });

      if (data.success && data.paymentParams) {
        setPhonePlan(null);
        submitAirpayForm(data.paymentParams, data.airpayRequest);
      }
    } catch (err) {
      const body = err.response?.data;
      setError(body?.message || "Payment initiation failed. Please try again.");
      setPhonePlan(null);
    } finally {
      setPhoneLoading(false);
      setProcessing(null);
    }
  };

  /** Cancels the active subscription (called after the user confirms in the dialog) */
  const handleCancelSubscription = async () => {
    setConfirmCancel(false);
    try {
      setProcessing("cancel");
      const { data } = await subscriptionAPI.cancel();
      if (data.success) {
        // Refresh status
        const statusRes = await subscriptionAPI.getStatus();
        if (statusRes.data.hasSubscription) {
          setCurrentPlan(statusRes.data.plan || "free");
          setSubStatus(statusRes.data);
        } else {
          setCurrentPlan("free");
          setSubStatus({ hasSubscription: false, plan: "free" });
        }
        btToast("Subscription cancelled successfully.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel subscription.");
    } finally {
      setProcessing(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await subscriptionAPI.getStatus();
      btToast("Purchases restored successfully!");
    } catch {
      btToast("No previous purchases found to restore.", { error: true });
    } finally {
      setRestoring(false);
    }
  };

  const currentMeta = PLANS.find((p) => p.id === currentPlan) || PLANS[0];
  const canCancel = subStatus?.status === "active" && isAdmin && currentPlan !== "free";
  const statusLabel = subStatus?.status
    ? subStatus.status.charAt(0).toUpperCase() + subStatus.status.slice(1)
    : null;
  const statusTone = subStatus?.status === "active" ? "success" : subStatus?.status === "cancelled" ? "danger" : "warning";

  return (
    <div style={{ minHeight: "100vh", background: "var(--ground)" }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="Subscription" />

      <ConfirmDialog
        open={confirmCancel}
        danger
        message="End your subscription? You will be reverted to the Free plan."
        confirmLabel="End subscription"
        onConfirm={handleCancelSubscription}
        onCancel={() => setConfirmCancel(false)}
      />

      {/* Phone capture modal */}
      {phonePlan && (
        <PhoneModal
          planTitle={PLANS.find((p) => p.id === phonePlan)?.title || phonePlan}
          loading={phoneLoading}
          onSubmit={handlePhoneSubmit}
          onCancel={() => { setPhonePlan(null); setProcessing(null); }}
        />
      )}

      {/* ── HERO ── */}
      <BtHero>
        <BtPageHeader
          eyebrow="Billing"
          title="Subscription"
          subtitle="Your plan, billing and what each tier includes."
          actions={<BtIconButton onDark icon={HelpCircle} label="Page tour" onClick={() => setRunTour(true)} />}
        >
          <div
            className="tour-current-plan"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--noir-line)",
              borderRadius: "var(--r-card)",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 260px" }}>
                <BtSkeleton width="120px" height="12px" style={{ opacity: 0.25 }} />
                <BtSkeleton width="200px" height="30px" style={{ opacity: 0.25 }} />
                <BtSkeleton width="260px" height="14px" style={{ opacity: 0.25 }} />
              </div>
            ) : (
              <>
                <div style={{ minWidth: 0 }}>
                  <div className="bt-eyebrow" style={{ color: "var(--on-noir-3)", marginBottom: 6 }}>
                    Current plan
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700,
                        letterSpacing: "-0.025em", color: "var(--on-noir)", lineHeight: 1.1,
                      }}
                    >
                      {currentMeta.title}
                    </span>
                    {statusLabel && <BtBadge tone={statusTone} label={statusLabel} />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: 14, color: "var(--on-noir-2)" }}>
                    {subStatus?.endDate ? (
                      <span>Renews on <strong style={{ color: "var(--on-noir)", fontWeight: 600 }}>{formatDate(subStatus.endDate)}</strong></span>
                    ) : (
                      <span>No renewal date, free forever</span>
                    )}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Users size={14} strokeWidth={1.9} /> {currentMeta.users}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={14} strokeWidth={1.9} /> {currentMeta.projects}
                    </span>
                  </div>
                </div>

                {canCancel && (
                  <BtButton
                    variant="destructive"
                    size="small"
                    loading={processing === "cancel"}
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel plan
                  </BtButton>
                )}
              </>
            )}
          </div>
        </BtPageHeader>
      </BtHero>

      {/* ── SHEET ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              style={{
                padding: "12px 12px 12px 16px", background: "var(--status-danger-soft)",
                border: "1px solid var(--status-danger)", borderRadius: "var(--r-input)",
                color: "var(--status-danger)", fontSize: 14, fontWeight: 500,
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{error}</span>
              <BtIconButton icon={X} label="Dismiss message" size={36} onClick={() => setError("")} style={{ background: "transparent", border: "none", color: "var(--status-danger)" }} />
            </div>
          )}

          {/* Managed by admin banner */}
          {!isAdmin && !loading && (
            <div
              style={{
                padding: "12px 16px", background: "var(--fill)",
                border: "1px solid var(--line)", borderRadius: "var(--r-input)",
                color: "var(--ink-2)", fontSize: 14, display: "flex",
                alignItems: "center", gap: 10,
              }}
            >
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>Your subscription is managed by your administrator.</span>
            </div>
          )}

          {/* Billing option: AutoPay or one-time */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
                Choose a plan
              </h2>
              <BtSegmented
                options={BILLING_OPTIONS}
                value={isAutoRenew ? "auto" : "once"}
                onChange={(v) => setIsAutoRenew(v === "auto")}
                aria-label="Billing method"
              />
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5 }}>
              {isAutoRenew
                ? "Pay for this month now. Your plan then renews automatically every month via UPI AutoPay. Cancel anytime."
                : "Pay once for 30 days via UPI, QR or card. No automatic renewals or recurring charges."}
            </p>
          </div>

          {/* Plans grid */}
          <div className="tour-plans bt-grid-3" style={{ gap: 20, alignItems: "stretch" }}>
            {loading
              ? [1, 2, 3].map((i) => <PlanCardSkeleton key={i} />)
              : PLANS.map((plan) => {
                  const isCurrent    = plan.id === currentPlan;
                  const isProcessing = processing === plan.id;
                  const busy         = processing !== null;

                  return (
                    <BtCard
                      key={plan.id}
                      padding="24px"
                      className={isCurrent ? undefined : "bt-hover-card"}
                      style={{
                        display: "flex", flexDirection: "column",
                        border: isCurrent
                          ? "2px solid var(--ink)"
                          : plan.highlighted
                            ? "2px solid var(--accent)"
                            : "2px solid var(--line)",
                      }}
                      aria-current={isCurrent ? "true" : undefined}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 24, marginBottom: 10 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
                          {plan.title}
                        </div>
                        {isCurrent ? (
                          <BtBadge tone="success" label="Current plan" showDot={false} />
                        ) : plan.highlighted ? (
                          <BtBadge tone="brand" label="Most popular" showDot={false} />
                        ) : null}
                      </div>

                      <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.45, minHeight: 40 }}>
                        {plan.tagline}
                      </div>

                      <div style={{ margin: "18px 0 18px", display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)", lineHeight: 1 }}>
                          {`₹${plan.price.toLocaleString("en-IN")}`}
                        </span>
                        <span style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 500 }}>{plan.period}</span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                        <div style={{ background: "var(--fill)", borderRadius: "var(--r-tile)", padding: "10px 12px", minWidth: 0 }}>
                          <div className="bt-eyebrow" style={{ color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 5 }}>
                            <Users size={12} strokeWidth={2} /> Users
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{plan.users}</div>
                        </div>
                        <div style={{ background: "var(--fill)", borderRadius: "var(--r-tile)", padding: "10px 12px", minWidth: 0 }}>
                          <div className="bt-eyebrow" style={{ color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 5 }}>
                            <Building2 size={12} strokeWidth={2} /> Projects
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{plan.projects}</div>
                        </div>
                      </div>

                      <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, flex: 1, display: "flex", flexDirection: "column", gap: 11 }}>
                        {plan.features.map((feat) => (
                          <li key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <span
                              style={{
                                width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                                background: "var(--status-success-soft)", color: "var(--status-success)",
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              <Check size={12} strokeWidth={3} />
                            </span>
                            <span style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.45 }}>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      {isAdmin && (
                        isCurrent ? (
                          <div
                            style={{
                              height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                              borderRadius: "var(--r-button)", background: "var(--status-success-soft)",
                              color: "var(--status-success)", fontSize: 15, fontWeight: 600,
                            }}
                          >
                            <Check size={18} strokeWidth={2.4} /> Your current plan
                          </div>
                        ) : plan.id === "free" ? (
                          <div style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", lineHeight: 1.45, padding: "6px 0" }}>
                            Applies automatically if you cancel your plan.
                          </div>
                        ) : (
                          <BtButton
                            variant={plan.highlighted ? "primary" : "secondary"}
                            fullWidth
                            loading={isProcessing}
                            disabled={busy && !isProcessing}
                            onClick={() => handleSubscribe(plan.id)}
                            style={{ fontSize: 15 }}
                          >
                            {isAutoRenew
                              ? "Subscribe with AutoPay"
                              : `Pay ₹${plan.price.toLocaleString("en-IN")} once`}
                          </BtButton>
                        )
                      )}
                    </BtCard>
                  );
                })}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 8 }}>
            <BtButton
              variant="secondary"
              size="small"
              icon={RefreshCw}
              loading={restoring}
              className="tour-restore-purchases"
              onClick={handleRestore}
            >
              Restore purchases
            </BtButton>

            <p style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
              Subscriptions automatically renew at the end of each billing period unless cancelled
              at least 24 hours before the renewal date. Payment is processed securely through our payment partner.
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
              {[
                { icon: Lock, label: "Secure payment" },
                { icon: Building2, label: "RBI compliant" },
                { icon: CreditCard, label: "UPI / Cards" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon size={14} strokeWidth={1.9} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </BtSheet>
    </div>
  );
}
