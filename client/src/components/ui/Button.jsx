import { colors, font, radius, transition } from '../../design-system/tokens';

const variants = {
  primary: {
    background:  colors.gold.base,
    color:       colors.text.inverse,
    border:      'none',
    boxShadow:   `0 4px 20px rgba(240,165,0,0.28)`,
  },
  secondary: {
    background:  'transparent',
    color:       colors.text.secondary,
    border:      `1px solid ${colors.border.default}`,
    boxShadow:   'none',
  },
  ghost: {
    background:  'transparent',
    color:       colors.text.gold,
    border:      'none',
    boxShadow:   'none',
  },
  danger: {
    background:  colors.red.dim,
    color:       colors.red.text,
    border:      `1px solid rgba(239,68,68,0.25)`,
    boxShadow:   'none',
  },
  success: {
    background:  colors.green.dim,
    color:       colors.green.text,
    border:      `1px solid rgba(16,185,129,0.25)`,
    boxShadow:   'none',
  },
};

const sizes = {
  sm: { fontSize: font.size.sm, padding: '7px 14px', borderRadius: radius.md },
  md: { fontSize: font.size.base, padding: '11px 22px', borderRadius: radius.lg },
  lg: { fontSize: font.size.md, padding: '14px 28px', borderRadius: radius.lg },
  xl: { fontSize: font.size.lg, padding: '17px 36px', borderRadius: radius.xl },
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  style = {},
  type = 'button',
}) {
  const v = variants[variant] || variants.primary;
  const sz = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        justifyContent:'center',
        gap:           8,
        fontFamily:    font.family,
        fontWeight:    font.weight.semibold,
        cursor:        disabled || loading ? 'not-allowed' : 'pointer',
        opacity:       disabled || loading ? 0.55 : 1,
        transition:    transition.base,
        width:         fullWidth ? '100%' : 'auto',
        letterSpacing: '-0.01em',
        whiteSpace:    'nowrap',
        ...v,
        ...sz,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled || loading) return;
        e.currentTarget.style.transform = 'translateY(-1px)';
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(240,165,0,0.42)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = v.boxShadow || 'none';
      }}
    >
      {loading ? (
        <>
          <span style={spinnerStyle} />
          {children}
        </>
      ) : children}
    </button>
  );
}

const spinnerStyle = {
  width:  14,
  height: 14,
  border: '2px solid rgba(0,0,0,0.2)',
  borderTopColor: 'currentColor',
  borderRadius:   '50%',
  animation:      'spin 0.7s linear infinite',
  flexShrink:     0,
};
