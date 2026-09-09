export const colors = {
  bg: 'transparent',
  card: 'var(--glass-bg)',
  subtle: 'var(--bg-subtle)',
  hover: 'var(--bg-hover)',
  primary: '#F97316',
  primaryHover: '#EA580C',
  primaryLight: 'var(--primary-light)',
  primarySubtle: 'var(--primary-subtle)',
  border: 'var(--border)',
  borderLight: 'var(--border-light)',
  textPrimary: '#111827',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  success: '#22C55E',
  successLight: 'var(--success-light)',
  danger: '#EF4444',
  dangerLight: 'var(--danger-light)',
  warning: '#F59E0B',
  warningLight: 'var(--warning-light)',
  info: '#F97316',
  infoLight: 'var(--info-light)',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 };

export const shadows = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
};

export const glass = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(var(--glass-blur))',
  WebkitBackdropFilter: 'blur(var(--glass-blur))',
  border: 'var(--glass-border)',
};

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  h1: { fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, color: colors.textPrimary },
  h2: { fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: colors.textPrimary },
  h3: { fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25, color: colors.textPrimary },
  body: { fontSize: '15px', fontWeight: 400, lineHeight: 1.5, color: colors.textPrimary },
  caption: { fontSize: '13px', fontWeight: 500, lineHeight: 1.4, color: colors.textSecondary },
  label: { fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: colors.textSecondary },
};

export const gradients = {
  primaryGradient: 'linear-gradient(90deg, #F97316 0%, #FB923C 100%)',
  primaryButton: 'linear-gradient(90deg, #F97316 0%, #F97316 100%)',
  progressBar: 'linear-gradient(90deg, #F97316 0%, #FB923C 100%)',
  navActiveItem: 'linear-gradient(90deg, #F97316 0%, #FB923C 100%)',
  authBackground: 'linear-gradient(135deg, #EA580C 0%, #F97316 50%, #FB923C 100%)',
  pageBackground: 'radial-gradient(circle at top right, #FFF1E8, #ffffff)',
};

export const buttonStyles = {
  primary: { height: 44, borderRadius: radius.md, fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer', background: gradients.primaryButton, color: '#FFFFFF' },
  outline: { height: 44, borderRadius: radius.md, fontWeight: 600, fontSize: 15, border: `1.5px solid ${colors.primary}`, background: 'transparent', color: colors.primary, cursor: 'pointer' },
};

export const inputStyles = {
  borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: '12px 14px', fontSize: 14,
  fontFamily: typography.fontFamily, backgroundColor: colors.card, color: colors.textPrimary, outline: 'none', width: '100%',
};

colors.primaryBlue = colors.primary;
colors.background = colors.bg;
colors.cardBg = colors.card;
colors.cardBorder = colors.border;
colors.textLight = colors.textSecondary;
colors.textMedium = colors.textSecondary;
colors.inputBorder = colors.border;
colors.divider = colors.border;
colors.gradientStart = '#F97316';
colors.gradientMid = '#FB923C';
colors.gradientEnd = '#FB923C';
colors.authStart = '#EA580C';
colors.authMid = '#F97316';
colors.authEnd = '#FB923C';
colors.bgBase1 = colors.bg;
colors.bgBase2 = colors.subtle;
colors.bgBase3 = colors.subtle;
colors.bgBase4 = colors.bg;
colors.bgGlow1 = colors.card;
colors.bgGlow2 = colors.primary;
colors.bgGlow3 = colors.primaryLight;
colors.iconBg = colors.primaryLight;
colors.sidebarBg = colors.card;
colors.sidebarActive = colors.primaryLight;
colors.primarySurface = colors.primaryLight;
colors.navActiveItemBg = colors.primaryLight;
colors.navActiveBorder = colors.primary;
colors.navText = colors.textSecondary;
colors.navActiveText = colors.primary;
colors.badgeWarningBg = colors.warningLight;
colors.badgeWarningText = '#B45309';
colors.badgeSuccessBg = colors.successLight;
colors.badgeSuccessText = '#15803D';
colors.badgePendingBg = colors.warningLight;
colors.badgePendingText = '#92400E';
colors.badgeInfoBg = colors.primaryLight;
colors.badgeInfoText = colors.primary;

shadows.card = 'var(--shadow-sm)';
shadows.large = 'var(--shadow-lg)';
shadows.hover = 'var(--shadow-xl)';
