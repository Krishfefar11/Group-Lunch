// ── Group Lunch Food App Design System ────────────────────────────────────────
// Light theme — warm whites, food orange accent, clean cards

export const colors = {
  bg: {
    canvas:  '#F6F0E6',   // warm cream — footer, deepest surface
    base:    '#FFF8F2',   // main page background
    surface: '#FFFFFF',   // cards — pure white
    raised:  '#FFF4EA',   // elevated cards, inputs
    overlay: '#FDECD8',   // dropdown overlays
    glass:   'rgba(255,255,255,0.92)',
  },
  border: {
    subtle:  'rgba(2,6,12,0.05)',
    default: 'rgba(2,6,12,0.1)',
    strong:  'rgba(2,6,12,0.18)',
    glow:    'rgba(244,82,15,0.25)',
    focus:   'rgba(244,82,15,0.55)',
  },
  // "gold" key kept for backward compat — values are now food-orange
  gold: {
    dim:     'rgba(244,82,15,0.07)',
    muted:   'rgba(244,82,15,0.14)',
    soft:    '#C84000',
    base:    '#F4520F',   // primary orange
    bright:  '#F97316',
    light:   '#FBB87A',
    glow:    '0 0 32px rgba(244,82,15,0.18)',
    glowLg:  '0 0 56px rgba(244,82,15,0.25)',
    glowXl:  '0 0 80px rgba(244,82,15,0.32)',
    gradient:'linear-gradient(135deg, #F4520F 0%, #F97316 100%)',
    gradientDim: 'linear-gradient(135deg, rgba(244,82,15,0.09) 0%, rgba(249,115,22,0.04) 100%)',
  },
  text: {
    primary:   '#1C1C1E',
    secondary: '#5B5961',
    muted:     '#9B97A2',
    faint:     '#D0CDD6',
    gold:      '#F4520F',   // accent text (links, highlights)
    inverse:   '#FFFFFF',   // text on orange buttons
  },
  veg:    '#0F8A65',   // classic Indian veg green
  nonVeg: '#E23744',   // classic Indian non-veg red
  green:  {
    base: '#16A34A',
    dim:  'rgba(22,163,74,0.08)',
    muted:'rgba(22,163,74,0.16)',
    text: '#15803D',
    gradient: 'linear-gradient(135deg, #16A34A, #22C55E)',
  },
  red:    {
    base: '#E23744',
    dim:  'rgba(226,55,68,0.08)',
    text: '#C31B28',
  },
  amber:  {
    base: '#F59E0B',
    dim:  'rgba(245,158,11,0.08)',
    text: '#B45309',
  },
  blue:   {
    base: '#2563EB',
    dim:  'rgba(37,99,235,0.08)',
    text: '#1D4ED8',
    gradient: 'linear-gradient(135deg, #2563EB, #60A5FA)',
  },
  purple: {
    base: '#7C3AED',
    dim:  'rgba(124,58,237,0.08)',
    text: '#6D28D9',
  },
  gradients: {
    hero:    'linear-gradient(135deg, #FFF8F2 0%, #FFF4EA 50%, #FFF8F2 100%)',
    card:    'linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
    gold:    'linear-gradient(135deg, #F4520F 0%, #F97316 100%)',
    goldDim: 'linear-gradient(135deg, rgba(244,82,15,0.08) 0%, rgba(249,115,22,0.04) 100%)',
    surface: 'linear-gradient(145deg, #FFFFFF 0%, #FFF8F2 100%)',
    glow:    'radial-gradient(circle at 50% 0%, rgba(244,82,15,0.1) 0%, transparent 60%)',
    glowBlue:'radial-gradient(circle at 50% 0%, rgba(37,99,235,0.07) 0%, transparent 60%)',
  },
};

export const space = {
  0.5: '2px',
  1:  '4px',  2: '8px',   3: '12px', 4: '16px',  5: '20px',
  6:  '24px', 7: '28px',  8: '32px', 9: '36px',  10: '40px',
  12: '48px', 14: '56px', 16: '64px',20: '80px',  24: '96px',
  32: '128px',
};

export const radius = {
  xs:  '6px',
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  full:'9999px',
};

export const shadow = {
  xs:   '0 1px 2px rgba(0,0,0,0.06)',
  sm:   '0 2px 6px rgba(0,0,0,0.07)',
  md:   '0 4px 16px rgba(0,0,0,0.08)',
  lg:   '0 8px 28px rgba(0,0,0,0.1)',
  xl:   '0 16px 48px rgba(0,0,0,0.12)',
  '2xl':'0 24px 64px rgba(0,0,0,0.14)',
  card: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
  cardHover: '0 2px 8px rgba(0,0,0,0.08), 0 8px 28px rgba(0,0,0,0.1)',
  gold: '0 4px 16px rgba(244,82,15,0.22)',
  goldLg: '0 6px 24px rgba(244,82,15,0.32)',
  goldXl: '0 10px 36px rgba(244,82,15,0.42)',
  inset:'inset 0 1px 0 rgba(255,255,255,0.8)',
  innerGlow: 'inset 0 0 24px rgba(244,82,15,0.04)',
};

export const font = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  size: {
    '2xs': '10px',
    xs:   '11px',
    sm:   '12px',
    base: '14px',
    md:   '15px',
    lg:   '17px',
    xl:   '20px',
    '2xl':'24px',
    '3xl':'30px',
    '4xl':'38px',
    '5xl':'48px',
    '6xl':'60px',
    '7xl':'72px',
  },
  weight: {
    light:    300,
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    extrabold:800,
    black:    900,
  },
  lineHeight: {
    none:     1,
    tight:    1.12,
    snug:     1.28,
    normal:   1.55,
    relaxed:  1.7,
    loose:    1.9,
  },
  tracking: {
    tighter: '-0.04em',
    tight:   '-0.025em',
    snug:    '-0.015em',
    normal:  '0',
    wide:    '0.05em',
    wider:   '0.1em',
    widest:  '0.18em',
  },
};

export const transition = {
  instant: 'all 0.08s ease',
  fast:    'all 0.14s ease',
  base:    'all 0.22s ease',
  slow:    'all 0.38s ease',
  spring:  'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce:  'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth:  'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

export const zIndex = {
  base:     0,
  above:    1,
  card:     10,
  sticky:   100,
  fab:      150,
  overlay:  180,
  modal:    200,
  toast:    300,
  tooltip:  400,
};

// ── Composite style helpers ────────────────────────────────────────────────────

export const card = {
  base: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.xl,
    boxShadow:    shadow.card,
  },
  raised: {
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.strong}`,
    borderRadius: radius.xl,
    boxShadow:    shadow.md,
  },
  gold: {
    background:   colors.bg.surface,
    border:       `1px solid rgba(244,82,15,0.2)`,
    borderRadius: radius.xl,
    boxShadow:    `${shadow.card}, ${colors.gold.glow}`,
  },
};

export const inputBase = {
  background:  colors.bg.raised,
  border:      `1px solid ${colors.border.default}`,
  borderRadius: radius.md,
  color:       colors.text.primary,
  fontFamily:  font.family,
  fontSize:    font.size.base,
  padding:     '13px 16px',
  outline:     'none',
  width:       '100%',
  boxSizing:   'border-box',
  transition:  transition.base,
};

export const btnPrimary = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            8,
  background:     colors.gold.base,
  color:          colors.text.inverse,
  border:         'none',
  borderRadius:   radius.lg,
  fontFamily:     font.family,
  fontSize:       font.size.md,
  fontWeight:     font.weight.bold,
  cursor:         'pointer',
  padding:        '14px 28px',
  letterSpacing:  font.tracking.snug,
  transition:     transition.base,
  boxShadow:      shadow.gold,
};

export const btnSecondary = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            8,
  background:     'transparent',
  color:          colors.text.secondary,
  border:         `1px solid ${colors.border.default}`,
  borderRadius:   radius.lg,
  fontFamily:     font.family,
  fontSize:       font.size.md,
  fontWeight:     font.weight.medium,
  cursor:         'pointer',
  padding:        '13px 24px',
  transition:     transition.base,
};

export const chip = (variant = 'default') => {
  const variants = {
    gold:    { bg: colors.gold.dim,    color: colors.gold.base,   border: 'rgba(244,82,15,0.2)' },
    green:   { bg: colors.green.dim,   color: colors.green.text,  border: 'rgba(22,163,74,0.2)' },
    red:     { bg: colors.red.dim,     color: colors.red.text,    border: 'rgba(226,55,68,0.2)' },
    amber:   { bg: colors.amber.dim,   color: colors.amber.text,  border: 'rgba(245,158,11,0.2)' },
    blue:    { bg: colors.blue.dim,    color: colors.blue.text,   border: 'rgba(37,99,235,0.2)' },
    purple:  { bg: colors.purple.dim,  color: colors.purple.text, border: 'rgba(124,58,237,0.2)' },
    default: { bg: colors.bg.raised,   color: colors.text.secondary, border: colors.border.default },
  };
  const v = variants[variant] || variants.default;
  return {
    display:       'inline-flex',
    alignItems:    'center',
    gap:           5,
    padding:       '4px 12px',
    borderRadius:  radius.full,
    fontSize:      font.size.xs,
    fontWeight:    font.weight.semibold,
    letterSpacing: font.tracking.wide,
    background:    v.bg,
    color:         v.color,
    border:        `1px solid ${v.border}`,
  };
};
