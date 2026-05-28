// ── Group Lunch Premium Design System ─────────────────────────────────────────
// Version 2.0 — Apple × Linear × Stripe quality
// Dark & ultra-premium theme — near-black backgrounds, gold accents

export const colors = {
  bg: {
    canvas:  '#040408',   // deepest background — pure dark
    base:    '#080810',   // page background
    surface: '#0f0f1e',   // cards
    raised:  '#161626',   // elevated cards, modals
    overlay: '#1c1c30',   // dropdown overlays
    glass:   'rgba(15,15,30,0.72)', // glassmorphism base
  },
  border: {
    subtle:  'rgba(255,255,255,0.04)',
    default: 'rgba(255,255,255,0.08)',
    strong:  'rgba(255,255,255,0.14)',
    glow:    'rgba(240,165,0,0.3)',
    focus:   'rgba(240,165,0,0.6)',
  },
  gold: {
    dim:     'rgba(240,165,0,0.07)',
    muted:   'rgba(240,165,0,0.16)',
    soft:    '#c8870a',
    base:    '#f0a500',
    bright:  '#fbbf24',
    light:   '#fcd34d',
    glow:    '0 0 32px rgba(240,165,0,0.2)',
    glowLg:  '0 0 56px rgba(240,165,0,0.28)',
    glowXl:  '0 0 80px rgba(240,165,0,0.35)',
    gradient:'linear-gradient(135deg, #f0a500 0%, #fbbf24 100%)',
    gradientDim: 'linear-gradient(135deg, rgba(240,165,0,0.12) 0%, rgba(251,191,36,0.06) 100%)',
  },
  text: {
    primary:   '#f0f0f8',
    secondary: '#7878a0',
    muted:     '#3c3c60',
    faint:     '#252540',
    gold:      '#f0a500',
    inverse:   '#040408',
  },
  veg:    '#22c55e',
  nonVeg: '#ef4444',
  green:  {
    base: '#10b981',
    dim:  'rgba(16,185,129,0.1)',
    muted:'rgba(16,185,129,0.18)',
    text: '#34d399',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
  },
  red:    {
    base: '#ef4444',
    dim:  'rgba(239,68,68,0.1)',
    text: '#f87171',
  },
  amber:  {
    base: '#f59e0b',
    dim:  'rgba(245,158,11,0.1)',
    text: '#fbbf24',
  },
  blue:   {
    base: '#6366f1',
    dim:  'rgba(99,102,241,0.1)',
    text: '#818cf8',
    gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
  },
  purple: {
    base: '#8b5cf6',
    dim:  'rgba(139,92,246,0.1)',
    text: '#a78bfa',
  },
  // Accent gradients
  gradients: {
    hero:    'linear-gradient(135deg, #0a0a18 0%, #120c20 50%, #0a1018 100%)',
    card:    'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
    gold:    'linear-gradient(135deg, #f0a500 0%, #fbbf24 100%)',
    goldDim: 'linear-gradient(135deg, rgba(240,165,0,0.1) 0%, rgba(251,191,36,0.05) 100%)',
    surface: 'linear-gradient(145deg, #0f0f1e 0%, #0c0c18 100%)',
    glow:    'radial-gradient(circle at 50% 0%, rgba(240,165,0,0.12) 0%, transparent 60%)',
    glowBlue:'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 60%)',
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
  xs:   '0 1px 3px rgba(0,0,0,0.4)',
  sm:   '0 2px 8px rgba(0,0,0,0.5)',
  md:   '0 4px 24px rgba(0,0,0,0.55)',
  lg:   '0 8px 40px rgba(0,0,0,0.65)',
  xl:   '0 16px 60px rgba(0,0,0,0.72)',
  '2xl':'0 24px 80px rgba(0,0,0,0.8)',
  card: '0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.5)',
  cardHover: '0 1px 0 rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.65)',
  gold: '0 0 32px rgba(240,165,0,0.2)',
  goldLg: '0 4px 32px rgba(240,165,0,0.35)',
  goldXl: '0 8px 48px rgba(240,165,0,0.45)',
  inset:'inset 0 1px 0 rgba(255,255,255,0.06)',
  innerGlow: 'inset 0 0 24px rgba(240,165,0,0.04)',
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
    backdropFilter: 'blur(0px)',
  },
  glass: {
    background:     colors.bg.glass,
    border:         `1px solid ${colors.border.subtle}`,
    borderRadius:   radius.xl,
    boxShadow:      shadow.lg,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  raised: {
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.strong}`,
    borderRadius: radius.xl,
    boxShadow:    shadow.lg,
  },
  gold: {
    background:   colors.bg.surface,
    border:       `1px solid rgba(240,165,0,0.2)`,
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
  boxShadow:      `0 4px 20px rgba(240,165,0,0.3)`,
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

export const btnGhost = {
  background:    'transparent',
  color:         colors.text.gold,
  border:        'none',
  fontFamily:    font.family,
  fontSize:      font.size.sm,
  fontWeight:    font.weight.semibold,
  cursor:        'pointer',
  padding:       '8px 0',
  letterSpacing: font.tracking.wide,
  textTransform: 'uppercase',
};

// ── Premium label / chip helpers ──────────────────────────────────────────────
export const chip = (variant = 'default') => {
  const variants = {
    gold:    { bg: colors.gold.dim,    color: colors.gold.base,   border: 'rgba(240,165,0,0.2)' },
    green:   { bg: colors.green.dim,   color: colors.green.text,  border: 'rgba(16,185,129,0.2)' },
    red:     { bg: colors.red.dim,     color: colors.red.text,    border: 'rgba(239,68,68,0.2)' },
    amber:   { bg: colors.amber.dim,   color: colors.amber.text,  border: 'rgba(245,158,11,0.2)' },
    blue:    { bg: colors.blue.dim,    color: colors.blue.text,   border: 'rgba(99,102,241,0.2)' },
    purple:  { bg: colors.purple.dim,  color: colors.purple.text, border: 'rgba(139,92,246,0.2)' },
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
