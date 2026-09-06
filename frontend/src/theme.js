export const COLORS = {
  primary:        "#F97316",
  primaryDark:    "#EA580C",
  primaryPurple:  "#FB923C",
  primaryLight:   "#FFF5F0",

  background:     "#FFF1E8",
  backgroundMid:  "#FFF7F0",
  backgroundEnd:  "#FFFFFF",

  surface:        "rgba(255, 255, 255, 0.6)",
  cardBg:         "rgba(255, 255, 255, 0.6)",
  cardBorder:     "rgba(255, 255, 255, 0.4)",

  textPrimary:    "#1A1A2E",
  textMedium:     "#4B5563",
  textSecondary:  "#6B7280",
  textBlue:       "#F97316",
  textAmount:     "#1A1A2E",

  divider:        "#E5E7EB",
  inputBorder:    "#E5E7EB",

  iconBg:         "#FFF1E8",
  sidebarActive:  "#FFF5F0",
  sidebarBg:      "rgba(255, 255, 255, 0.6)",

  success:        "#10B981",
  warning:        "#F59E0B",
  error:          "#EF4444",
  info:           "#F97316",

  badgeSuccessBg: "#E6F9F0",
  badgeSuccessText: "#15803D",
  badgeWarningBg: "#FFF4E0",
  badgeWarningText: "#B45309",
  badgePendingBg: "#FFF0D6",
  badgePendingText: "#92400E",
  badgeInfoBg:    "#FFF5F0",
  badgeInfoText:  "#EA580C",

  authStart:      "#EA580C",
  authMid:        "#F97316",
  authEnd:        "#FB923C",
};

export const GRADIENTS = {
  primaryButton:  `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryPurple} 100%)`,
  background:     `radial-gradient(circle at top right, #FFF1E8, #ffffff)`,
  authBg:         `linear-gradient(135deg, ${COLORS.authStart} 0%, ${COLORS.authEnd} 100%)`,
};

export default COLORS;
