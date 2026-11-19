import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Shield,
  ShieldCheck,
  Lock,
  FileText,
  CreditCard,
  Bot,
  Database,
  Trash2,
  Mail,
  MapPin,
  Scale,
  Printer,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Search,
  EyeOff,
  UserCheck,
  Server,
  AlertCircle,
  HelpCircle,
  Building,
} from "lucide-react";
import nurofinLogo from "../assets/nurofin-black.svg";
import BtHero from "../components/ui/BtHero";
import BtPageHeader from "../components/ui/BtPageHeader";
import BtSheet from "../components/ui/BtSheet";
import BtButton from "../components/ui/BtButton";

export default function PrivacyPolicyPage({ isEmbedded = false }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState("sec-1");
  const [copiedContact, setCopiedContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);

  // Find the scrollable ancestor container (e.g. DashboardLayout's <main> or document/window)
  const findScrollParent = (node) => {
    if (!node) return null;
    let p = node.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const style = window.getComputedStyle(p);
      const ov = style.overflowY;
      if ((ov === "auto" || ov === "scroll") && p.scrollHeight > p.clientHeight) {
        return p;
      }
      p = p.parentElement;
    }
    return null;
  };

  // Track reading progress and active section on scroll
  useEffect(() => {
    const mainEl = document.querySelector("main");

    const handleScroll = () => {
      const isMainScrollable =
        mainEl &&
        (mainEl.scrollHeight > mainEl.clientHeight ||
          window.getComputedStyle(mainEl).overflowY === "auto" ||
          window.getComputedStyle(mainEl).overflowY === "scroll");

      const scrollContainer = isMainScrollable ? mainEl : document.documentElement;
      const scrollTop = isMainScrollable ? mainEl.scrollTop : window.scrollY;
      const scrollHeight = isMainScrollable ? mainEl.scrollHeight : document.documentElement.scrollHeight;
      const clientHeight = isMainScrollable ? mainEl.clientHeight : window.innerHeight;

      const totalScroll = scrollHeight - clientHeight;
      if (totalScroll > 0) {
        setScrollProgress((scrollTop / totalScroll) * 100);
      }

      const sections = document.querySelectorAll("section[id]");
      let current = "sec-1";
      const referenceTop = isMainScrollable ? mainEl.getBoundingClientRect().top : 0;

      sections.forEach((section) => {
        const top = section.getBoundingClientRect().top - referenceTop;
        if (top <= 140) {
          current = section.getAttribute("id");
        }
      });
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Run once on mount
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (mainEl) {
        mainEl.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  // Jump to hash if present in URL on mount
  useEffect(() => {
    const hash = window.location.hash?.replace("#", "");
    if (hash) {
      const timer = setTimeout(() => {
        scrollTo(hash);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("info.nurofin@gmail.com");
    setCopiedContact(true);
    setTimeout(() => setCopiedContact(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    setActiveSection(id);

    const scrollContainer = findScrollParent(el) || document.querySelector("main");

    if (
      scrollContainer &&
      (scrollContainer.scrollHeight > scrollContainer.clientHeight ||
        window.getComputedStyle(scrollContainer).overflowY === "auto" ||
        window.getComputedStyle(scrollContainer).overflowY === "scroll")
    ) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop =
        scrollContainer.scrollTop + (elRect.top - containerRect.top) - 24;
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });
    } else {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }

    try {
      window.history.replaceState(null, null, `#${id}`);
    } catch (_) {}
  };

  const scrollToTop = () => {
    const mainEl = document.querySelector("main");
    if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setActiveSection("sec-1");
  };

  const SECTIONS = [
    { id: "sec-1", num: "01", title: "About BuildTrack" },
    { id: "sec-2", num: "02", title: "Information We Collect" },
    { id: "sec-3", num: "03", title: "Information We Do Not Collect" },
    { id: "sec-4", num: "04", title: "How We Use Your Information" },
    { id: "sec-5", num: "05", title: "How We Share Information" },
    { id: "sec-6", num: "06", title: "Payment Information" },
    { id: "sec-7", num: "07", title: "AI and Automated Processing" },
    { id: "sec-8", num: "08", title: "Data Storage and Security" },
    { id: "sec-9", num: "09", title: "Data Retention" },
    { id: "sec-10", num: "10", title: "Account Deletion" },
    { id: "sec-11", num: "11", title: "Your Privacy Rights" },
    { id: "sec-12", num: "12", title: "Children's Privacy" },
    { id: "sec-13", num: "13", title: "Cookies & Tracking" },
    { id: "sec-14", num: "14", title: "Third-Party Services" },
    { id: "sec-15", num: "15", title: "International Processing" },
    { id: "sec-16", num: "16", title: "Data Roles & Fiduciary" },
    { id: "sec-17", num: "17", title: "Security Incidents" },
    { id: "sec-18", num: "18", title: "Changes to This Policy" },
    { id: "sec-19", num: "19", title: "Contact & Grievance" },
    { id: "sec-20", num: "20", title: "Governing Law" },
    { id: "sec-21", num: "21", title: "Acceptance" },
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.filter((s) => s.title.toLowerCase().includes(q) || s.num.includes(q));
  }, [searchQuery]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ground, #F2F0EB)",
        color: "var(--ink, #111317)",
        fontFamily: "var(--font-ui, system-ui, -apple-system, sans-serif)",
        position: "relative",
      }}
    >
      {/* ── Top Reading Progress Bar ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: 3,
          width: `${scrollProgress}%`,
          background: "var(--accent, #E0A93B)",
          zIndex: 1000,
          transition: "width 80ms ease-out",
        }}
      />

      {/* ── Standalone Navigation Header (Only when not embedded in Portal Dashboard) ── */}
      {!isEmbedded && (
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 900,
            background: "var(--noir, #0C0E12)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/buildtrack-logo.png"
              alt="BuildTrack"
              style={{ width: 32, height: 32, borderRadius: "6px", objectFit: "contain" }}
            />
            <span
              style={{
                fontFamily: "var(--font-display, system-ui)",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--on-noir, #F6F4EF)",
                letterSpacing: "-0.02em",
              }}
            >
              BuildTrack
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--on-noir-3, #8B949E)",
                fontFamily: "var(--font-mono, monospace)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                paddingLeft: 8,
                borderLeft: "1px solid rgba(255, 255, 255, 0.16)",
              }}
            >
              Privacy Portal
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handlePrint}
              title="Print or Save as PDF"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                borderRadius: "var(--r-chip, 8px)",
                padding: "7px 12px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--on-noir, #F6F4EF)",
                cursor: "pointer",
                transition: "background 140ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
            >
              <Printer size={14} />
              <span className="hide-on-mobile">Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? "/" : "/login")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--accent, #E0A93B)",
                border: "none",
                borderRadius: "var(--r-chip, 8px)",
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--noir, #0C0E12)",
                cursor: "pointer",
                transition: "opacity 140ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <span>{isAuthenticated ? "Dashboard" : "Sign In"}</span>
            </button>
          </div>
        </header>
      )}

      {/* ── Native Portal Hero & Header ── */}
      <BtHero padding={isEmbedded ? "36px 36px 44px" : "32px 24px 40px"}>
        <BtPageHeader
          back={
            isEmbedded
              ? { label: "Settings", onClick: () => navigate("/settings") }
              : { label: "Sign In", onClick: () => navigate("/login") }
          }
          eyebrow="Trust, Security & Legal Compliance"
          title="Privacy & Data Protection Policy"
          subtitle="Full statutory compliance under the Digital Personal Data Protection Act (DPDPA), 2023. Governed by Nurofin Quantum Financials Labs Pvt. Ltd."
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BtButton
                onDark
                variant="secondary"
                size="small"
                icon={Printer}
                onClick={handlePrint}
              >
                Print / PDF
              </BtButton>
              {!isEmbedded && !isAuthenticated && (
                <BtButton
                  onDark
                  variant="primary"
                  size="small"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </BtButton>
              )}
            </div>
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(224, 169, 59, 0.16)",
                border: "1px solid rgba(224, 169, 59, 0.35)",
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent, #E0A93B)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <ShieldCheck size={14} /> DPDPA 2023 COMPLIANT
            </span>
            <span style={{ fontSize: 13, color: "var(--on-noir-3)", fontFamily: "var(--font-mono)" }}>
              Effective: 01-06-2026 · Updated: 15-09-2026 · India Jurisdiction
            </span>
          </div>
        </BtPageHeader>
      </BtHero>

      {/* ── Sheet Container ── */}
      <BtSheet overlap={24} padding={isEmbedded ? "24px 32px 80px" : "24px 20px 80px"}>

        {/* ── Key Highlights Strip ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              background: "var(--card, #FFFFFF)",
              padding: "18px 20px",
              borderRadius: "var(--r-tile, 12px)",
              border: "1px solid var(--line, #E6E3DC)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--status-success-soft, #DDF3EA)",
                  color: "var(--status-success, #067A52)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <EyeOff size={16} />
              </div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink, #111317)" }}>
                Zero GPS Tracking
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2, #525864)", lineHeight: 1.5 }}>
              BuildTrack does not request, track, or store real-time physical GPS device locations.
            </p>
          </div>

          <div
            style={{
              background: "var(--card, #FFFFFF)",
              padding: "18px 20px",
              borderRadius: "var(--r-tile, 12px)",
              border: "1px solid var(--line, #E6E3DC)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--status-success-soft, #DDF3EA)",
                  color: "var(--status-success, #067A52)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CreditCard size={16} />
              </div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink, #111317)" }}>
                Secure Payments via Airpay
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2, #525864)", lineHeight: 1.5 }}>
              Card numbers, CVVs, and UPI PINs are processed directly by Airpay and are never stored on our servers.
            </p>
          </div>

          <div
            style={{
              background: "var(--card, #FFFFFF)",
              padding: "18px 20px",
              borderRadius: "var(--r-tile, 12px)",
              border: "1px solid var(--line, #E6E3DC)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--status-success-soft, #DDF3EA)",
                  color: "var(--status-success, #067A52)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={16} />
              </div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink, #111317)" }}>
                Enterprise Safeguards
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2, #525864)", lineHeight: 1.5 }}>
              Enforced with bcrypt hashing, HTTPS TLS 1.3 encryption, and strict role-based access control.
            </p>
          </div>

          <div
            style={{
              background: "var(--card, #FFFFFF)",
              padding: "18px 20px",
              borderRadius: "var(--r-tile, 12px)",
              border: "1px solid var(--line, #E6E3DC)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--accent-soft, rgba(224, 169, 59, 0.16))",
                  color: "var(--accent-ink, #7A5308)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Scale size={16} />
              </div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink, #111317)" }}>
                DPDP Act Compliant
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2, #525864)", lineHeight: 1.5 }}>
              Clear adherence to Data Fiduciary and Data Processor roles under Indian Data Protection Law.
            </p>
          </div>
        </div>

        {/* ── Two-Column Content: Sticky Nav + Policy Sections ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px minmax(0, 1fr)",
            gap: 32,
            alignItems: "start",
          }}
          className="policy-grid"
        >
          {/* ── Left Sidebar / Table of Contents ── */}
          <aside
            style={{
              position: "sticky",
              top: 84,
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
              background: "var(--card, #FFFFFF)",
              border: "1px solid var(--line, #E6E3DC)",
              borderRadius: "var(--r-card, 16px)",
              padding: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
            className="policy-sidebar"
          >
            <div style={{ marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--ink-3, #6F7582)",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Table of Contents (21 Sections)
              </span>

              {/* Quick Filter */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--fill, #EFEDE8)",
                  borderRadius: 6,
                  padding: "6px 10px",
                }}
              >
                <Search size={13} style={{ color: "var(--ink-3, #6F7582)" }} />
                <input
                  type="text"
                  placeholder="Filter sections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "none",
                    border: "none",
                    outline: "none",
                    fontSize: 12,
                    fontFamily: "inherit",
                    color: "var(--ink, #111317)",
                    width: "100%",
                  }}
                />
              </div>
            </div>

            <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {filteredSections.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollTo(sec.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 10px",
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "var(--ink, #111317)" : "var(--ink-2, #525864)",
                      background: isActive ? "var(--fill, #EFEDE8)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 11,
                        color: isActive ? "var(--accent-ink, #7A5308)" : "var(--ink-3, #6F7582)",
                        flexShrink: 0,
                      }}
                    >
                      {sec.num}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sec.title}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid var(--line, #E6E3DC)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={handleCopyEmail}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "var(--fill, #EFEDE8)",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--ink, #111317)",
                  cursor: "pointer",
                }}
              >
                {copiedContact ? <Check size={12} color="#067A52" /> : <Copy size={12} />}
                <span>{copiedContact ? "Email Copied!" : "Copy Privacy Email"}</span>
              </button>
            </div>
          </aside>

          {/* ── Right Content: Full Policy Sections ── */}
          <div style={{ minWidth: 0 }} className="policy-main-content">
            {/* Mobile Quick Jump Dropdown */}
            <div className="policy-mobile-jump" style={{ display: "none", marginBottom: 16 }}>
              <div
                style={{
                  background: "var(--card, #FFFFFF)",
                  border: "1px solid var(--line, #E6E3DC)",
                  borderRadius: "var(--r-tile, 12px)",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-3)", letterSpacing: "0.05em" }}>
                    Jump to Section (21)
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent, #E0A93B)" }}>
                    {SECTIONS.find((s) => s.id === activeSection)?.num || "01"} / 21
                  </span>
                </div>
                <select
                  value={activeSection}
                  onChange={(e) => scrollTo(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--line, #E6E3DC)",
                    background: "var(--fill, #EFEDE8)",
                    color: "var(--ink, #111317)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.num}. {sec.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                background: "var(--card, #FFFFFF)",
                border: "1px solid var(--line, #E6E3DC)",
                borderRadius: "var(--r-card, 16px)",
                padding: "36px 40px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
                lineHeight: 1.7,
              }}
              className="policy-content"
            >
              {/* Preamble */}
              <div
                style={{
                  background: "var(--fill, #EFEDE8)",
                  borderRadius: "var(--r-tile, 12px)",
                  padding: "20px 24px",
                  marginBottom: 36,
                  borderLeft: "4px solid var(--accent, #E0A93B)",
                }}
              >
                <p style={{ margin: "0 0 10px", fontSize: 14.5, fontWeight: 500, color: "var(--ink, #111317)" }}>
                  BuildTrack ("BuildTrack", "we", "us", or "our"), powered by <strong>Nurofin</strong>, respects your privacy and is committed to protecting the personal information that you provide when using the BuildTrack web application, mobile applications, and related services (collectively, the "Services").
                </p>
                <p style={{ margin: "0 0 10px", fontSize: 14.5, color: "var(--ink-2, #525864)" }}>
                  This Privacy Policy explains what information we collect, how we use it, how we share and protect it, and the choices and rights available to you.
                </p>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "var(--ink, #111317)" }}>
                  By accessing or using BuildTrack, you acknowledge that you have read and understood this Privacy Policy.
                </p>
              </div>

              {/* ── Section 1: About BuildTrack ── */}
              <section id="sec-1" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>01</span>
                  <h2 style={sectionTitleStyle}>ABOUT BUILDTRACK</h2>
                </div>
                <p style={pStyle}>
                  BuildTrack is a construction project management and financial workflow platform designed for builders, contractors, project managers, site engineers, supervisors, and other authorized personnel.
                </p>
                <p style={pStyle}>
                  The platform enables users to manage construction projects, workforce information, materials, equipment, tasks, project progress, expenses, payments, reports, documents, and related financial records.
                </p>
                <p style={{ ...pStyle, fontWeight: 600, color: "var(--ink, #111317)" }}>
                  BuildTrack is primarily intended for business and professional use by individuals aged 18 years or older.
                </p>
              </section>

              {/* ── Section 2: Information We Collect ── */}
              <section id="sec-2" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>02</span>
                  <h2 style={sectionTitleStyle}>INFORMATION WE COLLECT</h2>
                </div>
                <p style={pStyle}>
                  Depending on how you use BuildTrack, we may collect the following categories of information:
                </p>

                {/* 2.1 */}
                <div style={subCardStyle}>
                  <h3 style={subTitleStyle}>2.1 Account and Contact Information</h3>
                  <p style={{ ...pStyle, margin: "0 0 8px" }}>This may include:</p>
                  <ul style={ulStyle}>
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Mobile phone number</li>
                    <li>Company or organization name</li>
                    <li>Company logo and profile information</li>
                    <li>Profile photograph</li>
                    <li>Login and authentication information</li>
                  </ul>
                  <div style={calloutBoxStyle}>
                    <Lock size={15} color="#067A52" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: "var(--status-success, #067A52)", fontWeight: 600 }}>
                      Passwords are stored using secure cryptographic password hashing mechanisms (bcrypt) and are never stored as plain text.
                    </span>
                  </div>
                </div>

                {/* 2.2 */}
                <div style={subCardStyle}>
                  <h3 style={subTitleStyle}>2.2 Workforce and Project Information</h3>
                  <p style={{ ...pStyle, margin: "0 0 8px" }}>Users may enter information relating to construction projects and personnel, including:</p>
                  <ul style={ulStyle}>
                    <li>Worker names and trade/occupation</li>
                    <li>Worker mobile numbers</li>
                    <li>Worker photographs</li>
                    <li>Worker identification or verification documents</li>
                    <li>Client or property-owner names</li>
                    <li>Contractor and site engineer information</li>
                    <li>Construction site contact information</li>
                    <li>Project names, codes, and addresses</li>
                    <li>Project specifications and progress information</li>
                  </ul>
                  <p style={{ ...pStyle, fontSize: 13, color: "var(--ink-3, #6F7582)", marginTop: 8, fontStyle: "italic" }}>
                    Users are responsible for ensuring that they have the appropriate authority to provide personal information relating to workers, contractors, clients, or other third parties.
                  </p>
                </div>

                {/* 2.3 */}
                <div style={subCardStyle}>
                  <h3 style={subTitleStyle}>2.3 Financial and Transaction Information</h3>
                  <p style={{ ...pStyle, margin: "0 0 8px" }}>BuildTrack may process information entered by users concerning:</p>
                  <ul style={ulStyle}>
                    <li>Project budgets and costs</li>
                    <li>Labour wages and payroll records</li>
                    <li>Material and equipment expenses</li>
                    <li>Invoices and receipts</li>
                    <li>GST information</li>
                    <li>Payment modes (Cash, Bank Transfer, UPI, Cheque)</li>
                    <li>Payment references and transaction amounts</li>
                    <li>Subscription and billing information</li>
                    <li>Digital payment receipts and signatures</li>
                  </ul>
                  <div style={calloutBoxStyle}>
                    <CreditCard size={15} color="#067A52" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: "var(--status-success, #067A52)", fontWeight: 600 }}>
                      BuildTrack does <strong>not</strong> store credit/debit card numbers, CVVs, UPI PINs, or banking passwords. Subscription payments are processed through the third-party payment provider Airpay.
                    </span>
                  </div>
                </div>

                {/* 2.4 */}
                <div style={subCardStyle}>
                  <h3 style={subTitleStyle}>2.4 Photos, Documents and Signatures</h3>
                  <p style={pStyle}>
                    Where enabled and authorized by the user, BuildTrack may process photographs, documents, receipts, project media, and digital signatures uploaded through the Services.
                  </p>
                  <p style={{ ...pStyle, margin: 0 }}>
                    These may be used for project documentation, workforce verification, expense verification, payment receipts, approvals, and related business purposes.
                  </p>
                </div>

                {/* 2.5 */}
                <div style={subCardStyle}>
                  <h3 style={subTitleStyle}>2.5 Voice and AI-Related Information</h3>
                  <p style={pStyle}>
                    BuildTrack provides optional AI-assisted features such as voice-based data entry and AI-powered reporting.
                  </p>
                  <p style={{ ...pStyle, margin: 0 }}>
                    When these features are used, relevant voice-to-text transcripts, project information, worker names, project names, queries, and related contextual information may be processed by third-party AI service providers to provide the requested functionality.
                  </p>
                </div>

                {/* 2.6 */}
                <div style={{ ...subCardStyle, marginBottom: 0 }}>
                  <h3 style={subTitleStyle}>2.6 Technical and Usage Information</h3>
                  <p style={{ ...pStyle, margin: "0 0 8px" }}>We may automatically receive certain technical information when you use BuildTrack, including:</p>
                  <ul style={ulStyle}>
                    <li>IP address</li>
                    <li>Browser and device information</li>
                    <li>HTTP user-agent information</li>
                    <li>Application usage information</li>
                    <li>Push notification tokens</li>
                    <li>Error and diagnostic information</li>
                    <li>Analytics and engagement information</li>
                  </ul>
                  <p style={{ ...pStyle, fontSize: 13, color: "var(--ink-2, #525864)", marginTop: 8 }}>
                    BuildTrack uses <strong>Firebase Analytics</strong> for certain web usage and engagement measurements.
                  </p>
                </div>
              </section>

              {/* ── Section 3: Information We Do Not Collect ── */}
              <section id="sec-3" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>03</span>
                  <h2 style={sectionTitleStyle}>INFORMATION WE DO NOT COLLECT</h2>
                </div>

                <div
                  style={{
                    background: "rgba(224, 169, 59, 0.08)",
                    border: "1px solid rgba(224, 169, 59, 0.3)",
                    borderRadius: "var(--r-tile, 12px)",
                    padding: "20px 24px",
                    marginBottom: 16,
                  }}
                >
                  <h4 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "var(--accent-ink, #7A5308)" }}>
                    No GPS or Real-Time Device Location Tracking
                  </h4>
                  <p style={{ ...pStyle, margin: 0 }}>
                    BuildTrack does <strong>not</strong> use GPS or real-time device location tracking. The platform does not request or use GPS permissions for tracking a user's physical location. Any construction site location or address stored in BuildTrack is information entered manually by the user for project management purposes.
                  </p>
                </div>

                <div
                  style={{
                    background: "rgba(6, 122, 82, 0.08)",
                    border: "1px solid rgba(6, 122, 82, 0.3)",
                    borderRadius: "var(--r-tile, 12px)",
                    padding: "20px 24px",
                  }}
                >
                  <h4 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "var(--status-success, #067A52)" }}>
                    No Raw Payment Credentials
                  </h4>
                  <p style={{ ...pStyle, margin: 0 }}>
                    BuildTrack also does <strong>not</strong> store raw payment credentials such as credit/debit card numbers, CVVs, UPI PINs, or banking passwords.
                  </p>
                </div>
              </section>

              {/* ── Section 4: How We Use Your Information ── */}
              <section id="sec-4" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>04</span>
                  <h2 style={sectionTitleStyle}>HOW WE USE YOUR INFORMATION</h2>
                </div>
                <p style={pStyle}>We may use information collected through BuildTrack to:</p>
                <ol
                  style={{
                    paddingLeft: 22,
                    margin: "0 0 16px",
                    color: "var(--ink-2, #525864)",
                    fontSize: 14.5,
                    lineHeight: 1.8,
                  }}
                >
                  <li>Create and manage user accounts.</li>
                  <li>Authenticate users and secure access to the Services.</li>
                  <li>Provide project management and construction management functionality.</li>
                  <li>Manage workers, contractors, clients, and project teams.</li>
                  <li>Track project progress, tasks, materials, and inventory.</li>
                  <li>Process expenses, transactions, invoices, and financial records.</li>
                  <li>Generate reports, statements, and project summaries.</li>
                  <li>Generate and deliver digital receipts and e-signature documents.</li>
                  <li>Process subscription payments and maintain billing records.</li>
                  <li>Send account-related emails, notifications, and security communications.</li>
                  <li>Provide optional AI-assisted features.</li>
                  <li>Provide push notifications and application alerts.</li>
                  <li>Monitor, maintain, and improve the performance and security of the Services.</li>
                  <li>Detect, prevent, and investigate fraud, abuse, unauthorized access, and security incidents.</li>
                  <li>Comply with applicable legal, regulatory, accounting, and contractual obligations.</li>
                </ol>
                <p style={{ ...pStyle, fontWeight: 600, color: "var(--ink, #111317)" }}>
                  We process personal data only for legitimate and specified purposes relevant to providing and operating the Services.
                </p>
              </section>

              {/* ── Section 5: How We Share Information ── */}
              <section id="sec-5" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>05</span>
                  <h2 style={sectionTitleStyle}>HOW WE SHARE INFORMATION</h2>
                </div>
                <div
                  style={{
                    background: "var(--fill, #EFEDE8)",
                    padding: "12px 18px",
                    borderRadius: 8,
                    fontWeight: 700,
                    color: "var(--ink, #111317)",
                    marginBottom: 16,
                  }}
                >
                  We do not sell your personal information.
                </div>
                <p style={pStyle}>
                  We may share or provide access to information where reasonably necessary to operate BuildTrack, provide requested services, comply with law, or protect our rights.
                </p>

                <div style={subCardStyle}>
                  <h3 style={subTitleStyle}>5.1 Authorized Users Within Your Organization</h3>
                  <p style={pStyle}>
                    Depending on the permissions assigned by an organization's administrator, information may be accessible to administrators, supervisors, site engineers, project staff, finance personnel, and other authorized users. Access is strictly controlled according to the user's role and permissions.
                  </p>
                </div>

                <div style={subCardStyle}>
                  <h3 style={subTitleStyle}>5.2 Service Providers</h3>
                  <p style={pStyle}>
                    BuildTrack uses selected third-party service providers to operate its infrastructure and features:
                  </p>

                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                        textAlign: "left",
                        marginTop: 10,
                      }}
                    >
                      <thead>
                        <tr style={{ background: "var(--fill, #EFEDE8)", borderBottom: "1px solid var(--line, #E6E3DC)" }}>
                          <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--ink, #111317)" }}>Provider</th>
                          <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--ink, #111317)" }}>Service Function</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid var(--line, #E6E3DC)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>MongoDB / Cloud Hosting</td>
                          <td style={{ padding: "10px 12px", color: "var(--ink-2, #525864)" }}>Database and application infrastructure</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--line, #E6E3DC)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>Cloudinary</td>
                          <td style={{ padding: "10px 12px", color: "var(--ink-2, #525864)" }}>Storage and delivery of uploaded media, receipts, and documents</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--line, #E6E3DC)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>AWS SES</td>
                          <td style={{ padding: "10px 12px", color: "var(--ink-2, #525864)" }}>Transactional email delivery and notification dispatches</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--line, #E6E3DC)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>Google Firebase</td>
                          <td style={{ padding: "10px 12px", color: "var(--ink-2, #525864)" }}>Push notifications and application engagement analytics</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--line, #E6E3DC)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>Airpay</td>
                          <td style={{ padding: "10px 12px", color: "var(--ink-2, #525864)" }}>Subscription payment processing and billing recurring mandates</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--line, #E6E3DC)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>Google Services</td>
                          <td style={{ padding: "10px 12px", color: "var(--ink-2, #525864)" }}>Authentication (Google Sign-In) and selected AI services</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>Groq</td>
                          <td style={{ padding: "10px 12px", color: "var(--ink-2, #525864)" }}>Optional AI processing and automated report generation</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p style={{ ...pStyle, fontSize: 13, color: "var(--ink-3, #6F7582)", marginTop: 10, fontStyle: "italic" }}>
                    These providers process information only as necessary to provide their respective services to BuildTrack.
                  </p>
                </div>

                <div style={subCardStyle}>
                  <h3 style={subTitleStyle}>5.3 External Clients and Recipients</h3>
                  <p style={pStyle}>
                    Where a user chooses to send a transaction receipt, e-signature request, invoice, or other project-related communication to a client or external recipient, relevant information may be shared with that recipient.
                  </p>
                </div>

                <div style={{ ...subCardStyle, marginBottom: 0 }}>
                  <h3 style={subTitleStyle}>5.4 Legal and Regulatory Requirements</h3>
                  <p style={pStyle}>
                    We may disclose information where required or permitted by applicable law, regulation, court order, governmental authority, or legal process, or where necessary to protect the rights, safety, security, or property of BuildTrack, our users, or others.
                  </p>
                </div>
              </section>

              {/* ── Section 6: Payment Information ── */}
              <section id="sec-6" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>06</span>
                  <h2 style={sectionTitleStyle}>PAYMENT INFORMATION</h2>
                </div>
                <p style={pStyle}>
                  Paid subscriptions may be processed through <strong>Airpay</strong>.
                </p>
                <p style={pStyle}>
                  When you subscribe to a paid BuildTrack plan, relevant information such as your name, email address, phone number, order information, and payment amount may be provided to the payment provider for processing the transaction.
                </p>
                <p style={pStyle}>
                  Payment instruments such as credit/debit card numbers, CVVs, and UPI PINs are processed directly by the payment provider and are not stored by BuildTrack.
                </p>
              </section>

              {/* ── Section 7: AI and Automated Processing ── */}
              <section id="sec-7" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>07</span>
                  <h2 style={sectionTitleStyle}>AI AND AUTOMATED PROCESSING</h2>
                </div>
                <p style={pStyle}>
                  Certain BuildTrack features use third-party artificial intelligence services.
                </p>
                <p style={pStyle}>
                  For example, optional AI features may process natural-language queries, voice transcripts, project names, worker names, and relevant project context in order to generate reports, interpret voice commands, or provide AI-assisted functionality.
                </p>
                <div
                  style={{
                    background: "var(--fill, #EFEDE8)",
                    borderLeft: "4px solid var(--ink, #111317)",
                    borderRadius: "0 8px 8px 0",
                    padding: "14px 18px",
                    fontSize: 13.5,
                    color: "var(--ink-2, #525864)",
                    lineHeight: 1.6,
                  }}
                >
                  <strong>Advisory:</strong> AI features are intended to assist users and may occasionally produce inaccurate or incomplete results. Users should independently verify important financial, contractual, construction, tax, or business decisions before relying on AI-generated information.
                </div>
              </section>

              {/* ── Section 8: Data Storage and Security ── */}
              <section id="sec-8" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>08</span>
                  <h2 style={sectionTitleStyle}>DATA STORAGE AND SECURITY</h2>
                </div>
                <p style={pStyle}>
                  We implement reasonable technical and organizational safeguards designed to protect information against unauthorized access, alteration, disclosure, loss, or misuse.
                </p>
                <p style={pStyle}>
                  Security measures used within the BuildTrack platform include:
                </p>
                <ul style={ulStyle}>
                  <li>Authentication controls and session token verification</li>
                  <li>Cryptographic password hashing (bcrypt)</li>
                  <li>Role-based access permissions and authorization boundaries</li>
                  <li>API rate limiting and brute-force prevention</li>
                  <li>Security headers and cross-site protections</li>
                  <li>HTTPS-based communications (TLS encryption in transit)</li>
                  <li>Structured session and token invalidation controls</li>
                </ul>
                <p style={pStyle}>
                  However, no method of transmitting or storing information over the internet can be guaranteed to be completely secure. Users should also maintain the confidentiality of their login credentials and immediately report suspected unauthorized access.
                </p>
              </section>

              {/* ── Section 9: Data Retention ── */}
              <section id="sec-9" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>09</span>
                  <h2 style={sectionTitleStyle}>DATA RETENTION</h2>
                </div>
                <p style={pStyle}>We retain information for as long as reasonably necessary to:</p>
                <ul style={ulStyle}>
                  <li>Provide the Services;</li>
                  <li>Maintain business and transaction records;</li>
                  <li>Meet contractual obligations;</li>
                  <li>Comply with applicable legal, tax, accounting, and regulatory requirements;</li>
                  <li>Resolve disputes;</li>
                  <li>Prevent fraud and security abuse; or</li>
                  <li>Enforce applicable agreements.</li>
                </ul>
                <p style={pStyle}>
                  Certain temporary information has shorter retention periods. For example, BuildTrack's technical implementation currently uses short-lived registration OTPs, password-reset tokens, and e-signature request tokens.
                </p>
                <p style={pStyle}>
                  Account and historical business records may remain stored until they are deleted by an authorized user or are otherwise no longer required, subject to applicable legal and contractual requirements.
                </p>
              </section>

              {/* ── Section 10: Account Deletion ── */}
              <section id="sec-10" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>10</span>
                  <h2 style={sectionTitleStyle}>ACCOUNT DELETION</h2>
                </div>
                <p style={pStyle}>
                  Users may request deletion of their BuildTrack account through the account deletion option available within the application settings. Users may also submit an account deletion request through our designated web-based account deletion page or by emailing our Privacy Contact.
                </p>
                <p style={pStyle}>
                  Upon deletion, associated account information and data will be deleted or anonymized, subject to applicable legal, regulatory, contractual, tax, accounting, fraud-prevention, and dispute-resolution requirements. Certain information may therefore be retained where legally required or reasonably necessary.
                </p>
              </section>

              {/* ── Section 11: Your Privacy Rights ── */}
              <section id="sec-11" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>11</span>
                  <h2 style={sectionTitleStyle}>YOUR PRIVACY RIGHTS</h2>
                </div>
                <p style={pStyle}>Subject to applicable law, you may have rights relating to your personal data, including the ability to:</p>
                <ul style={ulStyle}>
                  <li>Request access to personal information held about you;</li>
                  <li>Request correction or updating of inaccurate information;</li>
                  <li>Request deletion of personal information where legally permitted;</li>
                  <li>Withdraw consent where processing is based on consent;</li>
                  <li>Request information regarding how your personal data is processed;</li>
                  <li>Raise a privacy-related complaint or grievance.</li>
                </ul>
                <p style={pStyle}>
                  Some requests may be subject to identity verification, contractual obligations, legal requirements, or legitimate business requirements.
                </p>
                <p style={pStyle}>
                  BuildTrack currently provides account/profile correction, administrator account deletion, notification preference controls, and certain financial data export functionality directly within the platform.
                </p>
              </section>

              {/* ── Section 12: Children's Privacy ── */}
              <section id="sec-12" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>12</span>
                  <h2 style={sectionTitleStyle}>CHILDREN'S PRIVACY</h2>
                </div>
                <p style={pStyle}>
                  BuildTrack is intended for business and professional use and is not directed toward children under the age of 18.
                </p>
                <p style={pStyle}>
                  We do not knowingly seek to collect personal information from children through the Services. If you believe that a child has provided personal information to BuildTrack without appropriate authorization, please contact us so that we can take appropriate action.
                </p>
              </section>

              {/* ── Section 13: Cookies and Tracking Technologies ── */}
              <section id="sec-13" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>13</span>
                  <h2 style={sectionTitleStyle}>COOKIES AND TRACKING TECHNOLOGIES</h2>
                </div>
                <p style={pStyle}>
                  BuildTrack does <strong>not</strong> currently use traditional HTTP cookies for authentication.
                </p>
                <p style={pStyle}>
                  The web application uses browser local storage for authentication tokens and certain application preferences. The mobile application uses device storage for session and application information.
                </p>
                <p style={pStyle}>
                  BuildTrack may use analytics technologies, including Firebase Analytics, to understand application usage and improve the Services.
                </p>
              </section>

              {/* ── Section 14: Third-Party Services and Links ── */}
              <section id="sec-14" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>14</span>
                  <h2 style={sectionTitleStyle}>THIRD-PARTY SERVICES AND LINKS</h2>
                </div>
                <p style={pStyle}>
                  BuildTrack may integrate with or provide access to third-party services such as payment processors, authentication providers, cloud storage providers, analytics services, communication services, and AI providers.
                </p>
                <p style={pStyle}>
                  Third-party services operate under their own privacy policies and terms. We encourage users to review the privacy policies of third-party providers before using their services. BuildTrack is not responsible for the privacy practices of third-party services outside our control.
                </p>
              </section>

              {/* ── Section 15: International Data Processing ── */}
              <section id="sec-15" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>15</span>
                  <h2 style={sectionTitleStyle}>INTERNATIONAL DATA PROCESSING</h2>
                </div>
                <p style={pStyle}>
                  Some of our technology and service providers may process information in countries outside India.
                </p>
                <p style={pStyle}>
                  Where personal information is transferred across borders, we seek to use appropriate contractual, technical, and organizational safeguards and comply with applicable data protection requirements.
                </p>
                <p style={pStyle}>
                  The specific location of data processing may vary depending on the infrastructure and third-party services used by BuildTrack.
                </p>
              </section>

              {/* ── Section 16: Data Processor and Data Fiduciary Roles ── */}
              <section id="sec-16" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>16</span>
                  <h2 style={sectionTitleStyle}>DATA PROCESSOR AND DATA FIDUCIARY ROLES</h2>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 16,
                  }}
                  className="role-grid"
                >
                  <div style={{ background: "var(--fill, #EFEDE8)", padding: "16px 18px", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Building size={16} color="var(--ink, #111317)" />
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Nurofin as Data Fiduciary</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2, #525864)", lineHeight: 1.5 }}>
                      For information relating to an account, subscription, authentication, and the direct BuildTrack service relationship, Nurofin may determine the purposes and means of processing applicable to that information.
                    </p>
                  </div>

                  <div style={{ background: "var(--fill, #EFEDE8)", padding: "16px 18px", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <UserCheck size={16} color="var(--ink, #111317)" />
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>BuildTrack as Data Processor</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2, #525864)", lineHeight: 1.5 }}>
                      For personal information that a customer independently uploads or manages concerning its workers, contractors, clients, suppliers, or other third parties, the customer determines the purposes, while BuildTrack processes such information to provide the Services on the customer's instructions.
                    </p>
                  </div>
                </div>
                <p style={{ ...pStyle, fontSize: 13.5, fontStyle: "italic", color: "var(--ink-3, #6F7582)" }}>
                  Customers are responsible for ensuring that they have an appropriate lawful basis and authorization to collect and provide such third-party information to BuildTrack.
                </p>
              </section>

              {/* ── Section 17: Data Breaches and Security Incidents ── */}
              <section id="sec-17" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>17</span>
                  <h2 style={sectionTitleStyle}>DATA BREACHES AND SECURITY INCIDENTS</h2>
                </div>
                <p style={pStyle}>
                  If we become aware of a security incident involving personal information, we will assess the incident and take reasonable steps to contain, investigate, remediate, and notify affected parties or authorities where required by applicable law.
                </p>
                <p style={pStyle}>
                  Users should promptly notify us at <strong>info.nurofin@gmail.com</strong> if they believe their account or credentials have been compromised.
                </p>
              </section>

              {/* ── Section 18: Changes to This Privacy Policy ── */}
              <section id="sec-18" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>18</span>
                  <h2 style={sectionTitleStyle}>CHANGES TO THIS PRIVACY POLICY</h2>
                </div>
                <p style={pStyle}>We may update this Privacy Policy from time to time to reflect changes to:</p>
                <ul style={ulStyle}>
                  <li>Our Services;</li>
                  <li>Data processing practices;</li>
                  <li>Third-party service providers;</li>
                  <li>Applicable laws and regulations; or</li>
                  <li>Security and operational requirements.</li>
                </ul>
                <p style={pStyle}>
                  When material changes are made, we may provide appropriate notice through the BuildTrack application, website, email, or other reasonable communication channels.
                </p>
                <p style={pStyle}>
                  The revised Privacy Policy will include an updated "Last Updated" date.
                </p>
              </section>

              {/* ── Section 19: Contact and Grievance Redressal ── */}
              <section id="sec-19" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>19</span>
                  <h2 style={sectionTitleStyle}>CONTACT AND GRIEVANCE REDRESSAL</h2>
                </div>
                <p style={pStyle}>
                  If you have questions, concerns, requests, or complaints regarding this Privacy Policy or the processing of your personal information, please contact:
                </p>

                {/* Grievance Card */}
                <div
                  style={{
                    background: "var(--fill, #EFEDE8)",
                    border: "1px solid var(--line, #E6E3DC)",
                    borderRadius: "var(--r-tile, 12px)",
                    padding: "24px 28px",
                    marginTop: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: "var(--ink, #111317)",
                        color: "var(--bone, #F6F4EF)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Shield size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--ink, #111317)" }}>
                        Nurofin / BuildTrack
                      </h4>
                      <span style={{ fontSize: 13, color: "var(--ink-2, #525864)" }}>
                        Official Privacy & Grievance Department
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3, #6F7582)", textTransform: "uppercase" }}>
                        Grievance Officer
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink, #111317)", marginTop: 2 }}>
                        Vincent
                      </div>
                      <div style={{ fontSize: 13, color: "var(--ink-2, #525864)" }}>
                        Chief Executive Officer (CEO)
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3, #6F7582)", textTransform: "uppercase" }}>
                        Direct Privacy Contact
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <a
                          href="mailto:info.nurofin@gmail.com"
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--accent-ink, #7A5308)",
                            textDecoration: "underline",
                          }}
                        >
                          info.nurofin@gmail.com
                        </a>
                      </div>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3, #6F7582)", textTransform: "uppercase" }}>
                        Registered Office Address
                      </div>
                      <div style={{ fontSize: 13.5, color: "var(--ink, #111317)", marginTop: 4, lineHeight: 1.6 }}>
                        No. 68, Survey No. 133/1, 2nd Cross, 4th Main Road, Kithiganuru Village,<br />
                        Bidarahalli, Bengaluru, Bengaluru Urban District,<br />
                        State of Karnataka - 560049, India.
                      </div>
                    </div>
                  </div>
                </div>

                <p style={{ ...pStyle, marginTop: 14, fontSize: 13, color: "var(--ink-3, #6F7582)" }}>
                  We will review and respond to privacy-related requests in accordance with applicable law.
                </p>
              </section>

              {/* ── Section 20: Governing Law ── */}
              <section id="sec-20" style={{ marginBottom: 44, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>20</span>
                  <h2 style={sectionTitleStyle}>GOVERNING LAW</h2>
                </div>
                <p style={pStyle}>
                  This Privacy Policy shall be interpreted in accordance with the applicable laws and regulations of India, including applicable data protection and privacy legislation (such as the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000).
                </p>
                <p style={pStyle}>
                  Where BuildTrack processes personal information subject to additional privacy laws or regulations in another jurisdiction, the applicable mandatory requirements of that jurisdiction may also apply.
                </p>
              </section>

              {/* ── Section 21: Acceptance ── */}
              <section id="sec-21" style={{ marginBottom: 24, scrollMarginTop: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionBadgeStyle}>21</span>
                  <h2 style={sectionTitleStyle}>ACCEPTANCE</h2>
                </div>
                <p style={pStyle}>
                  By registering for, accessing, or using BuildTrack, you acknowledge that you have read this Privacy Policy and understand how your personal information may be collected, used, stored, and shared as described above.
                </p>
                <p style={pStyle}>
                  If you do not agree with the applicable privacy practices, you should discontinue use of the Services and contact us regarding available account and data options.
                </p>

                <div
                  style={{
                    marginTop: 32,
                    paddingTop: 24,
                    borderTop: "1px solid var(--line, #E6E3DC)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    fontSize: 13,
                    color: "var(--ink-3, #6F7582)",
                  }}
                >
                  <span>© 2026 Nurofin. All Rights Reserved.</span>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ink, #111317)",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 13,
                      textDecoration: "underline",
                      padding: 0,
                    }}
                  >
                    Back to Top ↑
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </BtSheet>

      {/* ── Global Styles for Responsive & Print ── */}
      <style>{`
        @media (max-width: 900px) {
          .policy-grid {
            grid-template-columns: 1fr !important;
          }
          .policy-sidebar {
            display: none !important;
          }
          .policy-mobile-jump {
            display: block !important;
          }
          .policy-content {
            padding: 24px 20px !important;
          }
          .role-grid {
            grid-template-columns: 1fr !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
        }

        @media print {
          header, aside, .hide-on-mobile, button {
            display: none !important;
          }
          body, html {
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          .policy-content {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          section {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

// ── Reusable Component Styles ──
const sectionBadgeStyle = {
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
  fontWeight: 700,
  background: "var(--ink, #111317)",
  color: "var(--bone, #F6F4EF)",
  padding: "3px 8px",
  borderRadius: 5,
  flexShrink: 0,
};

const sectionTitleStyle = {
  fontFamily: "var(--font-display, system-ui)",
  fontSize: 20,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  color: "var(--ink, #111317)",
  margin: 0,
};

const pStyle = {
  fontSize: 14.5,
  color: "var(--ink-2, #525864)",
  lineHeight: 1.7,
  margin: "0 0 14px",
};

const subCardStyle = {
  background: "var(--fill, #EFEDE8)",
  borderRadius: "var(--r-tile, 12px)",
  padding: "18px 20px",
  marginBottom: 16,
};

const subTitleStyle = {
  fontSize: 15.5,
  fontWeight: 700,
  color: "var(--ink, #111317)",
  margin: "0 0 10px",
};

const ulStyle = {
  paddingLeft: 22,
  margin: "0 0 12px",
  color: "var(--ink-2, #525864)",
  fontSize: 14,
  lineHeight: 1.7,
};

const calloutBoxStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  background: "var(--card, #FFFFFF)",
  border: "1px solid var(--line, #E6E3DC)",
  borderRadius: 8,
  padding: "10px 14px",
  marginTop: 10,
};
