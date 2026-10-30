import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: this.props.inline ? "280px" : "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
            fontFamily: "var(--font-ui, system-ui, sans-serif)",
            background: "var(--ground, #F2F0EB)",
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: "100%",
              background: "#FFFFFF",
              borderRadius: "16px",
              border: "1px solid var(--line, #E6E3DC)",
              boxShadow: "0 10px 30px rgba(17, 19, 23, 0.08)",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--status-danger-soft, #FCE7E7)",
                color: "var(--status-danger, #BE2A30)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 18px",
              }}
            >
              <AlertTriangle size={26} />
            </div>

            <h2
              style={{
                fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)",
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--ink, #111317)",
                margin: "0 0 8px",
                letterSpacing: "-0.01em",
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                fontSize: "14px",
                color: "var(--ink-2, #525864)",
                lineHeight: 1.5,
                margin: "0 0 20px",
              }}
            >
              {this.props.fallbackMessage ||
                "An unexpected issue occurred while rendering this section. You can refresh or return to the dashboard."}
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  background: "#F8F7F4",
                  border: "1px solid var(--line, #E6E3DC)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono, monospace)",
                  color: "var(--ink-2, #525864)",
                  textAlign: "left",
                  maxHeight: "90px",
                  overflowY: "auto",
                  marginBottom: "24px",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  height: "42px",
                  padding: "0 18px",
                  borderRadius: "12px",
                  background: "var(--ink, #111317)",
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "opacity 150ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <RefreshCw size={15} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  height: "42px",
                  padding: "0 18px",
                  borderRadius: "12px",
                  background: "var(--fill, #EFEDE8)",
                  color: "var(--ink, #111317)",
                  border: "1px solid var(--line, #E6E3DC)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 150ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#E6E3DC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--fill, #EFEDE8)")}
              >
                <Home size={15} />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
