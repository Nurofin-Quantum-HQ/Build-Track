import { colors, radius, shadows, typography, gradients } from '../../styles/designTokens';

const sizeMap = {
  sm: { height: 32, fontSize: 13, padding: '0 12px' },
  md: { height: 42, fontSize: 14, padding: '0 18px' },
  lg: { height: 48, fontSize: 15, padding: '0 24px' },
};

export default function Button({ children, variant = 'primary', size = 'md', icon, style, disabled, onClick, loading, fullWidth, type }) {
  const s = sizeMap[size];

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: gradients.primaryGradient,
          color: colors.textInverse,
          border: 'none',
          boxShadow: '0 4px 10px rgba(249, 115, 22, 0.15)',
        };
      case 'secondary':
        return {
          background: colors.card,
          color: colors.textPrimary,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: colors.primary,
          border: `1.5px solid ${colors.primary}`,
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: colors.textSecondary,
          border: 'none',
        };
      case 'danger':
        return {
          background: colors.danger,
          color: colors.textInverse,
          border: 'none',
        };
      default:
        return {};
    }
  };

  const vStyles = getVariantStyles();

  return (
    <button
      type={type || 'button'}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily: typography.fontFamily,
        borderRadius: radius.lg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        ...vStyles,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translateY(-2px)';
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(249, 115, 22, 0.45)';
        } else if (variant === 'secondary') {
          e.currentTarget.style.background = '#F8FAFC';
          e.currentTarget.style.borderColor = '#CBD5E1';
        } else if (variant === 'outline') {
          e.currentTarget.style.background = colors.primaryLight;
        } else if (variant === 'ghost') {
          e.currentTarget.style.background = '#F1F5F9';
          e.currentTarget.style.color = colors.textPrimary;
        } else if (variant === 'danger') {
          e.currentTarget.style.background = '#DC2626';
          e.currentTarget.style.boxShadow = '0 6px 12px rgba(239, 68, 68, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 4px 10px rgba(249, 115, 22, 0.15)';
        } else if (variant === 'secondary') {
          e.currentTarget.style.background = colors.card;
          e.currentTarget.style.borderColor = colors.border;
        } else if (variant === 'outline') {
          e.currentTarget.style.background = 'transparent';
        } else if (variant === 'ghost') {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = colors.textSecondary;
        } else if (variant === 'danger') {
          e.currentTarget.style.background = colors.danger;
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', animation: 'spin 0.6s linear infinite' }}>⟳</span>
      ) : icon ? (
        <span style={{ display: 'inline-flex', fontSize: 16 }}>{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
