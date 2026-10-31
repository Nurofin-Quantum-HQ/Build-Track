import { colors, applyAccent, ACCENT_PRESETS } from './styles/designTokens';

export const COLORS = {
  primary: '#111317', // Brand ink
  primaryDark: '#0C0E12',
  primaryPurple: 'var(--accent, #E0A93B)',
  primaryLight: 'var(--accent-soft, rgba(224, 169, 59, 0.16))',

  background: '#F2F0EB',
  backgroundMid: '#F8F7F4',
  backgroundEnd: '#FFFFFF',

  surface: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBorder: '#E6E3DC',

  textPrimary: '#111317',
  textMedium: '#525864',
  textSecondary: '#6F7582',
  textBlue: 'var(--accent-ink, #7A5308)',
  textAmount: '#111317',

  divider: '#E6E3DC',
  inputBorder: '#D8D4CB',

  iconBg: '#EFEDE8',
  sidebarActive: '#EFEDE8',
  sidebarBg: '#FFFFFF',

  success: '#067A52',
  warning: '#935600',
  error: '#BE2A30',
  info: 'var(--accent, #E0A93B)',

  badgeSuccessBg: '#DDF3EA',
  badgeSuccessText: '#067A52',
  badgeWarningBg: '#FCEFD9',
  badgeWarningText: '#935600',
  badgePendingBg: '#FCEFD9',
  badgePendingText: '#935600',
  badgeInfoBg: 'var(--accent-soft, rgba(224, 169, 59, 0.16))',
  badgeInfoText: 'var(--accent-ink, #7A5308)',

  authStart: '#0C0E12',
  authMid: '#14171D',
  authEnd: '#1F242D',

  accent: 'var(--accent, #E0A93B)',
  accentInk: 'var(--accent-ink, #7A5308)',
};

export const GRADIENTS = {
  primaryButton: '#111317',
  background: '#F2F0EB',
  authBg: '#0C0E12',
};

export { applyAccent, ACCENT_PRESETS };

export default COLORS;
