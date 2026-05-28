import { colors, font, radius } from '../../design-system/tokens';

const presets = {
  gold:    { bg: colors.gold.muted,   color: colors.gold.bright, border: `1px solid rgba(240,165,0,0.25)` },
  green:   { bg: colors.green.dim,    color: colors.green.text,  border: `1px solid rgba(16,185,129,0.2)` },
  red:     { bg: colors.red.dim,      color: colors.red.text,    border: `1px solid rgba(239,68,68,0.2)` },
  amber:   { bg: colors.amber.dim,    color: colors.amber.text,  border: `1px solid rgba(245,158,11,0.2)` },
  blue:    { bg: colors.blue.dim,     color: colors.blue.text,   border: `1px solid rgba(99,102,241,0.2)` },
  neutral: {
    bg: 'rgba(255,255,255,0.06)',
    color: colors.text.secondary,
    border: `1px solid ${colors.border.default}`,
  },
};

export default function Badge({ children, variant = 'neutral', dot, style = {} }) {
  const p = presets[variant] || presets.neutral;
  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           5,
      padding:       '3px 10px',
      borderRadius:  radius.full,
      fontSize:      font.size.xs,
      fontWeight:    font.weight.semibold,
      letterSpacing: '0.04em',
      background:    p.bg,
      color:         p.color,
      border:        p.border,
      whiteSpace:    'nowrap',
      ...style,
    }}>
      {dot && (
        <span style={{
          width: 5, height: 5,
          borderRadius: '50%',
          background: p.color,
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}
