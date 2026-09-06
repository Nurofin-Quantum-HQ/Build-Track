import { colors, radius, typography } from '../../styles/designTokens';

const variantMap = {
  default: { bg: colors.subtle, color: colors.textSecondary },
  success: { bg: colors.successLight, color: '#15803D' },
  danger: { bg: colors.dangerLight, color: '#DC2626' },
  warning: { bg: colors.warningLight, color: '#B45309' },
  info: { bg: colors.primaryLight, color: colors.primary },
  gradient: { bg: 'linear-gradient(90deg, #F97316 0%, #FB923C 100%)', color: '#FFFFFF' },
};

export default function Badge({ children, variant = 'default', style, size = 'md' }) {
  const v = variantMap[variant] || variantMap.default;
  const s = size === 'sm' ? { padding: '2px 8px', fontSize: 11 } : { padding: '4px 12px', fontSize: 12 };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...s,
        fontWeight: 600,
        borderRadius: radius.full,
        background: v.bg,
        color: v.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
