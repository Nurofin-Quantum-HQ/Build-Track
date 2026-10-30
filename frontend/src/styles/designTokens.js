// BuildTrack Design Tokens — V2 Blueprint Noir
// Direct parity with Flutter Mobile App (feat/premium-redesign-v2)

export const ACCENT_PRESETS = {
  brass: '#E0A93B', // Default
  ember: '#FF7A2F',
  cobalt: '#4F6BFF',
  jade: '#16B981',
};

export function lum(hex) {
  if (!hex || typeof hex !== 'string') return 0.5;
  const clean = hex.startsWith('#') ? hex : `#${hex}`;
  if (clean.length !== 7) return 0.5;
  const c = [1, 3, 5]
    .map((i) => parseInt(clean.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function darken(hex, t) {
  const clean = hex.startsWith('#') ? hex : `#${hex}`;
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.round(parseInt(clean.slice(i, i + 2), 16) * (1 - t))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

export function applyAccent(rawHex) {
  if (!rawHex) rawHex = ACCENT_PRESETS.brass;
  // If user passed a preset name like 'brass' or 'ember'
  let hex = ACCENT_PRESETS[rawHex.toLowerCase()] || rawHex;
  if (!hex.startsWith('#')) hex = `#${hex}`;

  let ink = hex;
  let t = 0;
  while (contrast(ink, '#ffffff') < 4.5 && t < 1) {
    t += 0.04;
    ink = darken(hex, t);
  }

  const isLightAccent = lum(hex) > 0.33;
  const onAccent = isLightAccent ? '#0C0E12' : '#FFFFFF';
  const accentSoft = `color-mix(in srgb, ${hex} 16%, white)`;

  if (typeof document !== 'undefined') {
    const r = document.documentElement.style;
    r.setProperty('--accent', hex);
    r.setProperty('--accent-ink', ink);
    r.setProperty('--accent-soft', accentSoft);
    r.setProperty('--on-accent', onAccent);

    // Legacy sync
    r.setProperty('--color-primary', hex);
    r.setProperty('--color-primary-hover', ink);
    r.setProperty('--color-primary-light', accentSoft);
  }

  return { hex, ink, accentSoft, onAccent };
}

export const colors = {
  // Surfaces & Inks
  ink: '#111317',
  ink2: '#525864',
  ink3: '#6F7582',
  placeholder: '#9AA0AB',
  ground: '#F2F0EB', // Bone ground
  bone: '#F6F4EF',
  boneSoft: '#ECEAE4',
  bonePure: '#FFFFFF',
  boneBorder: 'rgba(246, 244, 239, 0.25)',
  card: '#FFFFFF',
  fill: '#EFEDE8',
  line: '#E6E3DC',
  inputBorder: '#D8D4CB',
  brandSoft: '#E9E6DF',
  scrim: 'rgba(10, 11, 14, 0.58)',

  // Noir surfaces
  noir: '#0C0E12',
  noir2: '#14171D',
  noir3: '#1F242D',
  onNoir: '#F6F4EF',
  onNoir2: 'rgba(246, 244, 239, 0.70)',
  onNoir3: 'rgba(246, 244, 239, 0.45)',
  noirLine: 'rgba(255, 255, 255, 0.10)',

  // Status
  success: '#067A52',
  successSoft: '#DDF3EA',
  successBright: '#12A574',

  warning: '#935600',
  warningSoft: '#FCEFD9',
  warningBright: '#F2A33A',

  danger: '#BE2A30',
  dangerSoft: '#FCE7E7',
  dangerBright: '#E5484D',

  steel: '#6E8BFF',
  slate: '#9AA3B2',

  // Entry types
  typeMaterial: '#2A78D6',
  typeMaterialSoft: 'rgba(42, 120, 214, 0.14)',
  typeLabour: '#EB6834',
  typeLabourSoft: 'rgba(235, 104, 52, 0.14)',
  typeEquipment: '#199E70',
  typeEquipmentSoft: 'rgba(25, 158, 112, 0.14)',
  typeIncome: '#12A574',
  typeIncomeSoft: 'rgba(18, 165, 116, 0.14)',

  // Dynamic values
  accent: 'var(--accent, #E0A93B)',
  accentInk: 'var(--accent-ink, #7A5308)',
  accentSoft: 'var(--accent-soft, rgba(224, 169, 59, 0.16))',
  onAccent: 'var(--on-accent, #0C0E12)',

  // Legacy mappings
  bg: '#F2F0EB',
  primary: '#111317',
  primaryHover: '#21252D',
  textPrimary: '#111317',
  textSecondary: '#525864',
  textTertiary: '#6F7582',
  textInverse: '#FFFFFF',
  border: '#E6E3DC',
  borderLight: '#EFEDE8',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  chip: 12,
  tile: 14,
  input: 16,
  button: 18,
  card: 22,
  sheet: 28,
  full: 9999,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
};

export const shadows = {
  card: '0 1px 2px rgba(12, 14, 18, 0.04), 0 12px 32px -16px rgba(12, 14, 18, 0.12)',
  raised: '0 2px 4px rgba(12, 14, 18, 0.05), 0 28px 56px -24px rgba(12, 14, 18, 0.22)',
  sm: '0 1px 2px rgba(12, 14, 18, 0.04)',
  md: '0 1px 2px rgba(12, 14, 18, 0.04), 0 12px 32px -16px rgba(12, 14, 18, 0.12)',
  lg: '0 2px 4px rgba(12, 14, 18, 0.05), 0 28px 56px -24px rgba(12, 14, 18, 0.22)',
};

export const typography = {
  fontDisplay: "'Bricolage Grotesque', system-ui, sans-serif",
  fontUi: "'Instrument Sans', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  fontChart: "'Fira Sans', system-ui, sans-serif",
  fontFamily: "'Instrument Sans', system-ui, sans-serif",

  d0: {
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
    fontSize: '52px',
    lineHeight: 1.0,
    fontWeight: 700,
    letterSpacing: '-2.2px',
    fontVariantNumeric: 'tabular-nums',
  },
  d1: {
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
    fontSize: '38px',
    lineHeight: 1.04,
    fontWeight: 700,
    letterSpacing: '-1.5px',
  },
  d2: {
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
    fontSize: '28px',
    lineHeight: 1.1,
    fontWeight: 700,
    letterSpacing: '-0.9px',
  },
  d3: {
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
    fontSize: '21px',
    lineHeight: 1.18,
    fontWeight: 600,
    letterSpacing: '-0.5px',
  },
  largeTitle: {
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: '32px',
    lineHeight: 1.1,
    fontWeight: 700,
    letterSpacing: '-1.1px',
    color: colors.ink,
  },
  amount: {
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
    fontSize: '32px',
    lineHeight: 1.15,
    fontWeight: 700,
    letterSpacing: '-0.035em',
    fontVariantNumeric: 'tabular-nums',
  },
  title: {
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: '20px',
    lineHeight: 1.22,
    fontWeight: 700,
  },
  headline: {
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: '17px',
    lineHeight: '22px',
    fontWeight: 600,
    letterSpacing: '-0.15px',
  },
  body: {
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: '16px',
    lineHeight: '22px',
    fontWeight: 400,
  },
  subhead: {
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 400,
    color: colors.ink2,
  },
  caption: {
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: 400,
    color: colors.ink3,
  },
  monoLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10.5px',
    lineHeight: 1.3,
    fontWeight: 500,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
  },
};

export const buttonStyles = {
  primary: {
    height: 52,
    borderRadius: radius.button,
    fontWeight: 600,
    fontSize: 16,
    border: 'none',
    cursor: 'pointer',
    background: colors.ink,
    color: '#FFFFFF',
    fontFamily: typography.fontUi,
    transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
  secondary: {
    height: 52,
    borderRadius: radius.button,
    fontWeight: 600,
    fontSize: 16,
    border: `1px solid ${colors.inputBorder}`,
    background: '#FFFFFF',
    color: colors.ink,
    cursor: 'pointer',
    fontFamily: typography.fontUi,
  },
};

export const inputStyles = {
  borderRadius: radius.input,
  border: `1px solid ${colors.inputBorder}`,
  padding: '14px 16px',
  height: 52,
  fontSize: 15,
  fontFamily: typography.fontUi,
  backgroundColor: '#FFFFFF',
  color: colors.ink,
  outline: 'none',
  width: '100%',
};

export const gradients = {
  pageBackground: colors.ground,
  noirBlueprint: colors.noir,
};

export default {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  applyAccent,
  ACCENT_PRESETS,
};
