import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { HELP_CATEGORIES, HELP_TOPICS, searchHelpTopics } from "./helpKnowledgeBase";
import {
  X,
  RotateCcw,
  Send,
  ArrowRight,
  Search,
  Sparkles,
  Compass,
  Lightbulb,
  Globe,
} from "lucide-react";
import useHelpStore, { SUPPORTED_LANGUAGES, LANGUAGE_LOCALES } from "./helpStore";
import { getLocalizedTopic } from "./helpTranslations";
import { openReportProblem } from "../ReportProblem/openReportProblem";
import BtIconButton from "../ui/BtIconButton";
import SupportAgentIcon from "../ui/SupportAgentIcon";

export default function HelpAssistantModal() {
  const navigate = useNavigate();
  const {
    isOpen,
    closeHelp,
    messages,
    selectedCategory,
    setSelectedCategory,
    selectedLanguage,
    setSelectedLanguage,
    searchQuery,
    setSearchQuery,
    selectTopicById,
    askQuestion,
    resetChat,
  } = useHelpStore();

  const currentLocale = LANGUAGE_LOCALES[selectedLanguage] || LANGUAGE_LOCALES.en;

  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    askQuestion(inputVal);
    setInputVal("");
  };

  const filteredTopics = searchHelpTopics(searchQuery, selectedCategory);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="BuildTrack Help Assistant"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        animation: "fadeIn 150ms ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeHelp();
      }}
    >
      <style>{`
        .bt-help-chat-input,
        .bt-help-chat-input:focus,
        .bt-help-chat-input:active {
          background: transparent !important;
          background-color: transparent !important;
          color: #ffffff !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .bt-help-chat-input::placeholder {
          color: rgba(246, 244, 239, 0.45) !important;
        }
      `}</style>
      <div
        style={{
          width: "min(620px, 100vw)",
          height: "100dvh",
          background: "#10131a",
          borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 35px rgba(0, 0, 0, 0.75)",
          color: "var(--bone, #f6f4ef)",
          overflow: "hidden",
        }}
      >
        {/* ── Top Header ── */}
        <header
          style={{
            height: "64px",
            minHeight: "64px",
            background: "#0c0e12",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, var(--accent, #e0a93b), var(--accent-ink, var(--accent, #e0a93b)))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px color-mix(in srgb, var(--accent, #e0a93b) 35%, transparent)",
                color: "var(--on-accent, #0c0e12)",
                flexShrink: 0,
              }}
            >
              <SupportAgentIcon size={22} color="currentColor" />
            </div>
            <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.2px", whiteSpace: "nowrap" }}>
                  BuildTrack Assistant
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    background: "color-mix(in srgb, var(--accent, #e0a93b) 18%, transparent)",
                    color: "var(--accent, #e0a93b)",
                    border: "1px solid color-mix(in srgb, var(--accent, #e0a93b) 30%, transparent)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Interactive Help
                </span>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  color: "rgba(246, 244, 239, 0.55)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                {currentLocale.subtitle}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={resetChat}
              title="Reset conversation and clear history"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(246, 244, 239, 0.8)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 140ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
            >
              <RotateCcw size={13} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap", display: "inline-block" }}>Reset</span>
            </button>

            <BtIconButton
              icon={X}
              label="Close help"
              onDark
              size={36}
              onClick={closeHelp}
            />
          </div>
        </header>

        {/* ── Small Language Switcher Option at Top ── */}
        <div
          style={{
            padding: "8px 16px",
            background: "#0c0e12",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "rgba(246, 244, 239, 0.65)",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <Globe size={14} style={{ color: "var(--accent, #e0a93b)" }} />
            <span>Language:</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLanguage(lang.code)}
                  title={`${lang.name} (${lang.nativeName})`}
                  style={{
                    padding: "3px 9px",
                    borderRadius: "14px",
                    fontSize: "11.5px",
                    fontWeight: active ? 700 : 500,
                    whiteSpace: "nowrap",
                    background: active
                      ? "color-mix(in srgb, var(--accent, #e0a93b) 22%, transparent)"
                      : "rgba(255, 255, 255, 0.05)",
                    color: active ? "var(--accent, #e0a93b)" : "rgba(246, 244, 239, 0.75)",
                    border: active
                      ? "1px solid var(--accent, #e0a93b)"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: "pointer",
                    transition: "all 140ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                >
                  {lang.nativeName}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Category Filters Carousel ── */}
        <div
          style={{
            padding: "10px 16px",
            background: "#141720",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            flexShrink: 0,
            scrollbarWidth: "none",
          }}
        >
          {HELP_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: active ? 600 : 500,
                  whiteSpace: "nowrap",
                  background: active ? "var(--accent, #e0a93b)" : "rgba(255, 255, 255, 0.06)",
                  color: active ? "var(--on-accent, #0c0e12)" : "rgba(246, 244, 239, 0.75)",
                  border: active ? "1px solid var(--accent, #e0a93b)" : "1px solid rgba(255, 255, 255, 0.1)",
                  cursor: "pointer",
                  transition: "all 140ms ease",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── Scrollable Chat Messages Area ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {messages.map((msg) => {
            const isBot = msg.sender === "bot";
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: isBot ? "row" : "row-reverse",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                {isBot && (
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#1e293b",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    <SupportAgentIcon size={18} color="var(--accent, #e0a93b)" />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: "88%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {/* Speech bubble */}
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                      background: isBot ? "rgba(255, 255, 255, 0.05)" : "var(--accent, #e0a93b)",
                      border: isBot ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
                      color: isBot ? "#f6f4ef" : "var(--on-accent, #0c0e12)",
                      fontSize: "14px",
                      lineHeight: "1.55",
                      boxShadow: isBot ? "none" : "0 2px 8px color-mix(in srgb, var(--accent, #e0a93b) 30%, transparent)",
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Rich Topic Card if this message contains a structured feature guide */}
                  {msg.topic && (
                    <div
                      style={{
                        marginTop: "4px",
                        background: "#151922",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "14px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {/* Breadcrumbs Path */}
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "var(--accent, #e0a93b)",
                          background: "color-mix(in srgb, var(--accent, #e0a93b) 14%, transparent)",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          border: "1px solid color-mix(in srgb, var(--accent, #e0a93b) 28%, transparent)",
                          alignSelf: "flex-start",
                        }}
                      >
                        <Compass size={12} />
                        <span>Path: {msg.topic.breadcrumbs}</span>
                      </div>

                      <div style={{ fontSize: "13px", color: "rgba(246, 244, 239, 0.75)" }}>
                        {msg.topic.summary}
                      </div>

                      {/* Numbered Steps */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          marginTop: "2px",
                        }}
                      >
                        {msg.topic.steps.map((step, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "10px",
                              fontSize: "13px",
                              lineHeight: "1.5",
                              background: "rgba(255, 255, 255, 0.03)",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                            }}
                          >
                            <span
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "10px",
                                background: "var(--accent, #e0a93b)",
                                color: "var(--on-accent, #0c0e12)",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyCenter: "center",
                                flexShrink: 0,
                                marginTop: "1px",
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span style={{ color: "rgba(246, 244, 239, 0.9)" }}>
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Pro Tip */}
                      {msg.topic.tips && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "rgba(245, 158, 11, 0.08)",
                            border: "1px solid rgba(245, 158, 11, 0.2)",
                            fontSize: "12px",
                            color: "#fbbf24",
                            lineHeight: "1.45",
                          }}
                        >
                          <Lightbulb size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
                          <span>
                            <strong>Pro Tip:</strong> {msg.topic.tips}
                          </span>
                        </div>
                      )}

                      {/* Take Me There Action Button */}
                      {msg.topic.route && (
                        <button
                          type="button"
                          onClick={() => {
                            closeHelp();
                            if (msg.topic.id === "report_problem") {
                              openReportProblem({ settleMs: 150 });
                            } else {
                              navigate(msg.topic.route);
                            }
                          }}
                          style={{
                            marginTop: "4px",
                            height: "40px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, var(--accent, #e0a93b), var(--accent-ink, var(--accent, #e0a93b)))",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "var(--on-accent, #0c0e12)",
                            fontSize: "13px",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            cursor: "pointer",
                            boxShadow: "0 2px 10px color-mix(in srgb, var(--accent, #e0a93b) 35%, transparent)",
                            transition: "all 140ms ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1.0")}
                        >
                          <span>{msg.topic.actionLabel || "Take Me There"}</span>
                          <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Related suggestions if any */}
                  {msg.relatedTopics && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        marginTop: "4px",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: "rgba(246, 244, 239, 0.5)", fontWeight: 600 }}>
                        Related Guides:
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {msg.relatedTopics.map((rel) => (
                          <button
                            key={rel.id}
                            type="button"
                            onClick={() => selectTopicById(rel.id)}
                            style={{
                              fontSize: "12px",
                              padding: "4px 10px",
                              borderRadius: "14px",
                              background: "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "var(--accent, #e0a93b)",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            {rel.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Topic Suggestion Chips Box ── */}
        <div
          style={{
            padding: "12px 16px",
            background: "#0c0e12",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "rgba(246, 244, 239, 0.5)",
              fontWeight: 600,
            }}
          >
            <span>Popular Topics in {HELP_CATEGORIES.find((c) => c.id === selectedCategory)?.label}:</span>
            <span>{filteredTopics.length} guides available</span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "4px",
              scrollbarWidth: "none",
            }}
          >
            {filteredTopics.slice(0, 8).map((topic) => {
              const loc = getLocalizedTopic(topic, selectedLanguage) || topic;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => selectTopicById(topic.id)}
                  style={{
                    fontSize: "12px",
                    padding: "6px 12px",
                    borderRadius: "16px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "rgba(246, 244, 239, 0.85)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 140ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "color-mix(in srgb, var(--accent, #e0a93b) 18%, transparent)";
                    e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent, #e0a93b) 35%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  <Sparkles size={12} color="var(--accent, #e0a93b)" />
                  <span>{loc.title}</span>
                </button>
              );
            })}
          </div>

          {/* ── Input Box & Send ── */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "46px",
                borderRadius: "12px",
                background: "#181d27",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                gap: "8px",
                boxSizing: "border-box",
              }}
            >
              <Search size={16} color="rgba(246, 244, 239, 0.45)" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={currentLocale.placeholder}
                className="bt-help-chat-input"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "100%",
                  background: "transparent",
                  backgroundColor: "transparent",
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  caretColor: "var(--accent, #e0a93b)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!inputVal.trim()}
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                background: inputVal.trim() ? "var(--accent, #e0a93b)" : "rgba(255, 255, 255, 0.06)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: inputVal.trim() ? "pointer" : "default",
                color: inputVal.trim() ? "var(--on-accent, #0c0e12)" : "rgba(255, 255, 255, 0.3)",
                boxShadow: inputVal.trim() ? "0 2px 10px color-mix(in srgb, var(--accent, #e0a93b) 30%, transparent)" : "none",
                transition: "all 140ms ease",
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </form>

          <div
            style={{
              fontSize: "11px",
              color: "rgba(246, 244, 239, 0.4)",
              textAlign: "center",
              marginTop: "2px",
            }}
          >
            Your questions and steps are saved automatically so you can cross-check while working.
          </div>
        </div>
      </div>
    </div>
  );
}
