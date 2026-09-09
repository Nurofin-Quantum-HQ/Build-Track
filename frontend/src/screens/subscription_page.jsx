import { useState, useEffect } from "react";
import { subscriptionAPI } from "../api";
import { Bell, Star, ClipboardList, AlertTriangle, Lock, Building2, CreditCard, HelpCircle } from "lucide-react";
import ModuleTour from "../components/ModuleTour";

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
    price: 498,
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

const CHECKMARK = (
  <span style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: "50%", background: "#fff5f0",
    color: "#ea580c", fontSize: 11, fontWeight: 800, flexShrink: 0,
  }}>✓</span>
);

const TOPBAR_H = 65;

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [subStatus, setSubStatus] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState("");
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 768);
  const [runTour, setRunTour] = useState(false);

  const tourSteps = [
    { target: '.tour-current-plan', content: 'Here is your current active subscription and its status.', disableBeacon: true },
    { target: '.tour-plans', content: 'Explore our available plans. Upgrade to unlock more projects and users.' },
    { target: '.tour-restore-purchases', content: 'If you have upgraded on another device, use this to sync your purchases.' }
  ];


  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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

  const handleSubscribe = async (planId) => {
    if (planId === currentPlan) return;
    if (planId === "free") return;

    try {
      setProcessing(planId);
      setError("");

      const { data } = await subscriptionAPI.initiate({ plan: planId });

      if (data.success && data.paymentParams) {
        const { airpayUrl, ...formFields } = data.paymentParams;

        const form = document.createElement("form");
        form.method = "POST";
        form.action = airpayUrl;

        Object.entries(formFields).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate payment. Please try again.");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        minHeight: "100vh", flex: 1, minWidth: 0, width: "100%",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}>
        <div style={{
          height: TOPBAR_H, flexShrink: 0,
          background: "#fff", borderBottom: "1px solid #ebebeb",
          padding: "0 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Subscription Plans</h1>
        </div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flex: 1, color: "#888", fontSize: 15,
        }}>
          Loading subscription plans...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      minHeight: "100vh",
      flex: 1, minWidth: 0, width: "100%",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#f7f7f8",
    }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="Subscription" />

      <div style={{
        height: TOPBAR_H, flexShrink: 0,
        background: "#fff", borderBottom: "1px solid #ebebeb",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 12, overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(16px,2vw,20px)", fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap" }}>
            Subscription & Billing
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, background: "#f5f5f5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Bell size={16} /></div>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
            <HelpCircle size={16} color={'#94A3B8'} />
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch",
        padding: "clamp(16px,2.5vw,28px) clamp(16px,3vw,28px) 60px",
        display: "flex", flexDirection: "column", gap: "clamp(14px,2vw,22px)",
        boxSizing: "border-box",
      }}>

        <div style={{
          background: "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)",
          borderRadius: "clamp(16px,2vw,20px)",
          padding: isNarrow ? "28px 20px" : "40px 44px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -60, right: -40,
            width: 220, height: 220, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }} />
          <div style={{
            position: "absolute", bottom: -80, left: "40%",
            width: 280, height: 280, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 640 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.2)", borderRadius: 20,
              padding: "6px 14px", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.03em", marginBottom: 16, backdropFilter: "blur(4px)",
            }}>
              <Star size={14} /> Unlock Premium Features
            </div>
            <h2 style={{
              margin: "0 0 8px", fontSize: "clamp(22px,3vw,32px)",
              fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.2,
            }}>
              Choose the Right Plan for Your Business
            </h2>
            <p style={{
              margin: 0, fontSize: "clamp(13px,1.4vw,16px)", lineHeight: 1.6,
              opacity: 0.9,
            }}>
              Scale your construction management with powerful tools designed for teams of all sizes.
              No hidden fees, cancel anytime.
            </p>
          </div>
        </div>

        {subStatus && (
          <div className="tour-current-plan" style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #ebebeb",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "#fff5f0", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}><ClipboardList size={16} /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
                  Current Plan: <span style={{ color: "#ea580c" }}>{PLANS.find(p => p.id === currentPlan)?.title || "Free"}</span>
                </div>
                {subStatus.endDate && (
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    Renews on {new Date(subStatus.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                )}
              </div>
            </div>
            {subStatus.status && subStatus.status !== "cancelled" && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: subStatus.status === "active" ? "#16a34a" : "#ea580c",
                background: subStatus.status === "active" ? "#f0fdf4" : "#fff5f0",
                padding: "4px 12px", borderRadius: 20, letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}>
                {subStatus.status}
              </span>
            )}
          </div>
        )}

        {error && (
          <div style={{
            padding: "12px 16px", background: "#fee2e2",
            border: "1px solid #fca5a5", borderRadius: 10,
            color: "#991b1b", fontSize: 13, display: "flex",
            alignItems: "center", gap: 8,
          }}>
            <span><AlertTriangle size={14} /></span>
            <span>{error}</span>
            <span onClick={() => setError("")} style={{ marginLeft: "auto", cursor: "pointer", fontWeight: 700, fontSize: 16, lineHeight: 1 }}>×</span>
          </div>
        )}

        <div className="tour-plans" style={{
          display: "grid",
          gridTemplateColumns: isNarrow
            ? "1fr"
            : "repeat(3, 1fr)",
          gap: "clamp(12px,1.5vw,18px)",
        }}>
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isProcessing = processing === plan.id;

            return (
              <div
                key={plan.id}
                style={{
                  background: plan.highlighted
                    ? "linear-gradient(180deg, #fff5f0 0%, #fff 40%)"
                    : "#fff",
                  borderRadius: "clamp(14px,1.5vw,18px)",
                  border: plan.highlighted
                    ? "2px solid #ea580c"
                    : "1px solid #ebebeb",
                  padding: "clamp(20px,2.5vw,28px)",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: plan.highlighted
                    ? "0 8px 32px rgba(234,88,12,0.12)"
                    : "0 1px 8px rgba(0,0,0,0.04)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = plan.highlighted
                    ? "0 12px 40px rgba(234,88,12,0.18)"
                    : "0 8px 24px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = plan.highlighted
                    ? "0 8px 32px rgba(234,88,12,0.12)"
                    : "0 1px 8px rgba(0,0,0,0.04)";
                }}>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {plan.highlighted && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: "#fff",
                      background: "#ea580c", padding: "3px 10px",
                      borderRadius: 20, letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}>
                      Most Popular
                    </span>
                  )}
                  {isCurrent && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: "#16a34a",
                      background: "#f0fdf4", border: "1px solid #bbf7d0",
                      padding: "3px 10px", borderRadius: 20,
                      letterSpacing: "0.05em", textTransform: "uppercase",
                    }}>
                      Current Plan
                    </span>
                  )}
                </div>

                <div style={{
                  fontSize: "clamp(16px,1.6vw,20px)", fontWeight: 800,
                  color: "#1a1a1a", marginBottom: 4,
                }}>
                  {plan.title}
                </div>

                <div style={{
                  fontSize: "clamp(11px,1.1vw,13px)", color: "#888",
                  marginBottom: 16, lineHeight: 1.4,
                }}>
                  {plan.tagline}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <span style={{
                    fontSize: "clamp(28px,3vw,36px)", fontWeight: 800,
                    color: plan.highlighted ? "#ea580c" : "#1a1a1a",
                    letterSpacing: "-1px",
                  }}>
                    {plan.price === 0 ? "₹0" : `₹${plan.price.toLocaleString("en-IN")}`}
                  </span>
                  <span style={{
                    fontSize: 13, color: "#888", fontWeight: 500,
                    marginLeft: 4,
                  }}>
                    {plan.period}
                  </span>
                </div>

                <div style={{
                  display: "flex", gap: 12, marginBottom: 18,
                  paddingBottom: 16, borderBottom: "1px solid #f0f0f0",
                }}>
                  <div style={{
                    flex: 1, background: "#f7f7f8", borderRadius: 8,
                    padding: "8px 10px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Users</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginTop: 2 }}>{plan.users}</div>
                  </div>
                  <div style={{
                    flex: 1, background: "#f7f7f8", borderRadius: 8,
                    padding: "8px 10px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Projects</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginTop: 2 }}>{plan.projects}</div>
                  </div>
                </div>

                <div style={{
                  flex: 1, display: "flex", flexDirection: "column", gap: 10,
                  marginBottom: 20,
                }}>
                  {plan.features.map((feat, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      {CHECKMARK}
                      <span style={{
                        fontSize: "clamp(12px,1.1vw,13px)", color: "#555",
                        lineHeight: 1.5, fontWeight: 500,
                      }}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || isProcessing}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    borderRadius: 12,
                    border: isCurrent
                      ? "1px solid #e5e5e5"
                      : plan.highlighted
                        ? "none"
                        : "2px solid #ea580c",
                    background: isCurrent
                      ? "#f5f5f5"
                      : plan.highlighted
                        ? "#ea580c"
                        : "#fff",
                    color: isCurrent
                      ? "#999"
                      : plan.highlighted
                        ? "#fff"
                        : "#ea580c",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: isCurrent || isProcessing ? "not-allowed" : "pointer",
                    boxShadow: isCurrent
                      ? "none"
                      : plan.highlighted
                        ? "0 4px 14px rgba(234,88,12,0.35)"
                        : "none",
                    transition: "all 0.2s ease",
                    opacity: isProcessing ? 0.7 : 1,
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={e => {
                    if (isCurrent || isProcessing) return;
                    if (plan.highlighted) {
                      e.currentTarget.style.background = "#c2410c";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(234,88,12,0.4)";
                    } else {
                      e.currentTarget.style.background = "#fff5f0";
                    }
                  }}
                  onMouseLeave={e => {
                    if (isCurrent || isProcessing) return;
                    if (plan.highlighted) {
                      e.currentTarget.style.background = "#ea580c";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(234,88,12,0.35)";
                    } else {
                      e.currentTarget.style.background = "#fff";
                    }
                  }}
                >
                  {isCurrent
                    ? "✓ Current Plan"
                    : isProcessing
                      ? "Processing..."
                      : plan.price === 0
                        ? "Get Started"
                        : `Subscribe to ${plan.title}`}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
          paddingBottom: 20,
        }}>
          <span
            style={{
              fontSize: 14, color: "#ea580c", fontWeight: 700,
              cursor: "pointer", padding: "8px 20px", borderRadius: 10,
              background: "#fff5f0", border: "1px solid #fde8d8",
              transition: "background 0.15s",
            }}
            className="hover-bg-subtle tour-restore-purchases"
            onClick={async () => {
              try {
                await subscriptionAPI.getStatus();
                alert("Purchases restored successfully!");
              } catch {
                alert("No previous purchases found to restore.");
              }
            }}
          >
            Restore Purchases
          </span>

          <p style={{
            fontSize: 11, color: "#aaa", textAlign: "center",
            maxWidth: 520, lineHeight: 1.6, margin: 0,
          }}>
            Subscriptions automatically renew at the end of each billing period unless cancelled
            at least 24 hours before the renewal date. You can manage your subscription from your
            account settings. Payment is processed securely through our payment partner.
          </p>

          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            marginTop: 4,
          }}>
            {[
              { icon: Lock, label: "Secure Payment" },
              { icon: Building2, label: "RBI Compliant" },
              { icon: CreditCard, label: "UPI / Cards" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} style={{
                fontSize: 11, color: "#888", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Icon size={14} />
                {label}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
