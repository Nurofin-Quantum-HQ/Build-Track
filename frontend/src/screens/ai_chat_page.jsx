import { useState, useEffect, useRef } from "react";
import { aiChatAPI } from "../api";
import useAuthStore from "../stores/authStore";
import useProjectStore from "../stores/projectStore";
import { Bell } from "lucide-react";

const SUGGESTIONS = [
  "Entries in June",
  "Cement spend",
  "Labour this week",
  "Inventory status",
  "Budget health",
  "Project progress",
  "Pending payments",
];

const SEVERITY_COLOR = {
  ok:      { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a", label: "In Stock" },
  low:     { bg: "#fffbeb", color: "#d97706", dot: "#d97706", label: "Low Stock" },
  critical:{ bg: "#fee2e2", color: "#dc2626", dot: "#dc2626", label: "Out of Stock" },
};

function DataTable({ title, rows }) {
  if (!rows || !rows.length) return null;
  return (
    <div style={{ marginTop: 10, background: "#fff", borderRadius: 12, border: "1px solid #ebebeb", overflow: "hidden" }}>
      {title && (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #f0f0f0", fontSize: 12, fontWeight: 700, color: "#555" }}>
          {title}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
              {Object.keys(rows[0]).map((k) => (
                <th key={k} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f5f5f5" : "none", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                {Object.values(row).map((val, j) => (
                  <td key={j} style={{ padding: "8px 12px", color: "#333", whiteSpace: "nowrap" }}>
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryTable({ title, rows }) {
  if (!rows || !rows.length) return null;
  return (
    <div style={{ marginTop: 10, background: "#fff", borderRadius: 12, border: "1px solid #ebebeb", overflow: "hidden" }}>
      {title && (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #f0f0f0", fontSize: 12, fontWeight: 700, color: "#555" }}>
          {title}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
              {Object.keys(rows[0]).map((k) => (
                <th key={k} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const severityKey = (row.severity || row.status || "").toLowerCase().replace(/\s+/g, "_");
              const sev = SEVERITY_COLOR[severityKey] || { bg: "#f5f5f5", color: "#888", dot: "#888", label: row.severity || row.status || "—" };
              return (
                <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f5f5f5" : "none", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  {Object.entries(row).map(([key, val], j) => {
                    if (key === "severity" || key === "status") {
                      return (
                        <td key={j} style={{ padding: "8px 12px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: sev.bg, color: sev.color,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: sev.dot }} />
                            {sev.label}
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={j} style={{ padding: "8px 12px", color: "#333", whiteSpace: "nowrap" }}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#d4d4d4",
            animation: `bounce 1.2s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function AIChatPage() {
  const user = useAuthStore((s) => s.user);
  const selectedProject = useProjectStore((s) => s.selectedProject);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          text: `Hi${user?.name ? ` ${user.name.split(" ")[0]}` : ""}! I'm your AI project assistant. Ask me anything about your project data — entries, expenses, inventory, budget, or worker activity.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  const sendMessage = async (question) => {
    const text = (question || input).trim();
    if (!text || loading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const projectId = selectedProject?._id || selectedProject?.id || null;
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.text }));

      const { data } = await aiChatAPI.ask({ question: text, projectId, history });
      const result = data?.result || data || {};

      const aiMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: result.text || "I couldn't generate a response. Please try again.",
        table_type: result.table_type || null,
        table_title: result.table_title || null,
        rows: result.rows || null,
        inventory_rows: result.inventory_rows || null,
        total_amount: result.total_amount || null,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = {
        id: `e-${Date.now()}`,
        role: "assistant",
        text: err.friendlyMessage || err.response?.data?.message || "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = (msg) => {
    const isUser = msg.role === "user";

    return (
      <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: isMobile ? "90%" : "75%", flexDirection: isUser ? "row-reverse" : "row" }}>
          {!isUser && (
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, var(--color-primary-hover, #EA580C), #c2410c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#fff", fontWeight: 700, boxShadow: "0 2px 8px rgba(234,88,12,0.3)",
            }}>AI</div>
          )}
          <div>
            <div style={{
              padding: isUser ? "10px 16px" : "12px 16px",
              borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: isUser ? "linear-gradient(135deg, var(--color-primary-hover, #EA580C), #c2410c)" : "#fff",
              color: isUser ? "#fff" : "#1a1a1a",
              fontSize: 14, lineHeight: 1.6, fontWeight: isUser ? 500 : 400,
              boxShadow: isUser ? "0 2px 12px rgba(234,88,12,0.25)" : "0 1px 6px rgba(0,0,0,0.06)",
              border: isUser ? "none" : "1px solid #ebebeb",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {msg.text}
            </div>
            {msg.total_amount != null && (
              <div style={{
                marginTop: 8, padding: "8px 14px", background: "#fff5f0", borderRadius: 10,
                border: "1px solid #fed7aa", fontSize: 13, fontWeight: 700, color: "var(--color-primary-hover, #EA580C)",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                Total: ₹{Number(msg.total_amount).toLocaleString("en-IN")}
              </div>
            )}
            {msg.table_type === "inventory" && msg.inventory_rows ? (
              <InventoryTable title={msg.table_title} rows={msg.inventory_rows} />
            ) : msg.rows ? (
              <DataTable title={msg.table_title} rows={msg.rows} />
            ) : null}
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#bbb", padding: "0 4px", textAlign: isUser ? "right" : "left" }}>
          {formatTime(msg.timestamp)}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      flex: 1, minWidth: 0, width: "100%",
      background: "#f7f7f8",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>

      <div style={{
        height: 64, flexShrink: 0,
        background: "#fff", borderBottom: "1px solid #ebebeb",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--color-primary-hover, #EA580C), #c2410c)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#fff", fontWeight: 700,
            boxShadow: "0 2px 8px rgba(234,88,12,0.3)",
          }}>AI</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2 }}>
              AI Chat
            </h1>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
              Report Insights &amp; Analytics
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {selectedProject && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: "var(--color-primary-hover, #EA580C)",
              background: "#fff5f0", border: "1px solid #fed7aa",
              borderRadius: 20, padding: "4px 12px", letterSpacing: "0.04em",
              maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {selectedProject.projectName || "Project"}
            </span>
          )}
          <div style={{ width: 36, height: 36, background: "#f5f5f5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer" }}><Bell size={16} /></div>
        </div>
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        padding: "clamp(16px, 2.5vw, 28px) clamp(16px, 3vw, 28px)",
        display: "flex", flexDirection: "column", gap: 20,
      }}>

        {messages.filter((m) => m.role === "user").length === 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                style={{
                  padding: "8px 16px", borderRadius: 20,
                  background: "#fff", border: "1px solid #e5e5e5",
                  fontSize: 13, fontWeight: 600, color: "#555",
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary-hover, #EA580C)";
                  e.currentTarget.style.color = "var(--color-primary-hover, #EA580C)";
                  e.currentTarget.style.background = "#fff5f0";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(234,88,12,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e5e5";
                  e.currentTarget.style.color = "#555";
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => renderMessage(msg))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, var(--color-primary-hover, #EA580C), #c2410c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#fff", fontWeight: 700,
              boxShadow: "0 2px 8px rgba(234,88,12,0.3)",
            }}>AI</div>
            <div style={{
              padding: "12px 18px", borderRadius: "16px 16px 16px 4px",
              background: "#fff", border: "1px solid #ebebeb",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}>
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div style={{
        flexShrink: 0,
        background: "#fff", borderTop: "1px solid #ebebeb",
        padding: "clamp(12px, 2vw, 16px) clamp(16px, 3vw, 28px)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 10,
          maxWidth: 900, margin: "0 auto",
          background: "#f7f7f8",
          border: "1px solid #e5e5e5",
          borderRadius: 16, padding: "6px 6px 6px 18px",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-primary-hover, #EA580C)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(234,88,12,0.1)";
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              e.currentTarget.style.borderColor = "#e5e5e5";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about entries, expenses, inventory, budget..."
            rows={1}
            style={{
              flex: 1, border: "none", background: "transparent",
              outline: "none", fontSize: 14, color: "#1a1a1a",
              fontWeight: 500, lineHeight: 1.5,
              resize: "none", minHeight: 24, maxHeight: 120,
              fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
              padding: "8px 0",
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: input.trim() && !loading ? "var(--color-primary-hover, #EA580C)" : "#e5e5e5",
              border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s, transform 0.15s",
              boxShadow: input.trim() && !loading ? "0 2px 8px rgba(234,88,12,0.3)" : "none",
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !loading) {
                e.currentTarget.style.background = "#c2410c";
                e.currentTarget.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (input.trim() && !loading) {
                e.currentTarget.style.background = "var(--color-primary-hover, #EA580C)";
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? "#fff" : "#aaa"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 8 }}>
          AI responses are based on your project data. Verify critical financial details.
        </div>
      </div>
    </div>
  );
}
