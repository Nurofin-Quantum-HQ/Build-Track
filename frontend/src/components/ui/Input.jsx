import { colors, radius, typography } from '../../styles/designTokens';

export default function Input({
  label, error, icon, type = 'text', style, containerStyle, ...props
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', ...containerStyle }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary, letterSpacing: '0.02em' }}>{label}</label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 16, color: colors.textTertiary, display: 'flex', fontSize: 18, pointerEvents: 'none' }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          {...props}
          style={{
            width: '100%',
            height: 48,
            padding: icon ? '0 16px 0 46px' : '0 16px',
            fontSize: 14,
            fontWeight: 400,
            fontFamily: typography.fontFamily,
            color: colors.textPrimary,
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${error ? colors.danger : 'rgba(255, 255, 255, 0.45)'}`,
            borderRadius: radius.lg,
            outline: 'none',
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: error ? `0 0 0 3px ${colors.danger}20` : '0 4px 10px rgba(15, 23, 42, 0.02)',
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? colors.danger : colors.primary;
            e.currentTarget.style.boxShadow = error
              ? `0 0 0 3px ${colors.danger}20`
              : `0 0 0 3px rgba(249, 115, 22, 0.12)`;
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? colors.danger : 'rgba(255, 255, 255, 0.45)';
            e.currentTarget.style.boxShadow = error ? `0 0 0 3px ${colors.danger}20` : '0 4px 10px rgba(15, 23, 42, 0.02)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.55)';
          }}
        />
      </div>
      {error && <span style={{ fontSize: 12, color: colors.danger, fontWeight: 500, marginTop: 2 }}>{error}</span>}
    </div>
  );
}
