import { useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function LightPremiumInput({ icon: Icon, rightElement, label, error, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: "relative", marginBottom: 18, width: "100%" }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "12.5px",
            fontWeight: "700",
            color: error ? "#EF4444" : focused ? "#EA580C" : "#334155",
            marginBottom: 6,
            letterSpacing: "-0.01em",
            transition: "color 0.15s ease"
          }}
        >
          {label}
        </label>
      )}

      <div
        className={`premium-input-wrapper ${error ? "error" : focused ? "focused" : ""}`}
        style={{ position: "relative" }}
      >
        {Icon && (
          <Icon
            size={17}
            style={{
              color: focused ? "#EA580C" : "#94A3B8",
              marginRight: 10,
              flexShrink: 0,
              transition: "color 0.15s ease"
            }}
          />
        )}

        <input
          {...props}
          className="custom-input-field"
          placeholder={props.placeholder || (label ? `Enter your ${label.toLowerCase()}` : "")}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={{
            flex: 1,
            color: "#0F172A",
            fontSize: "14px",
            fontWeight: "500",
            fontFamily: "inherit",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: 0,
            width: "100%",
            zIndex: 10,
            ...props.style
          }}
        />

        {rightElement && (
          <div style={{ display: "flex", alignItems: "center", marginLeft: 8, flexShrink: 0, zIndex: 20 }}>
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, color: "#EF4444", fontSize: "11px", fontWeight: "700", animation: "slideDown 0.15s ease" }}>
          <AlertTriangle size={11} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
