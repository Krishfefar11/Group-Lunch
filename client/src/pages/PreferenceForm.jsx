import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/api';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

const INJECTED_CSS = `
  .pf-chip { transition: all 0.15s ease; }
  .pf-chip:hover:not(.pf-chip-active) { border-color: #f4520f !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .pf-budget-card { transition: all 0.15s ease; }
  .pf-budget-card:hover:not(.pf-budget-active) { border-color: #e5e5e5 !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
  .pf-next-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pf-next-btn:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 8px 28px rgba(240,165,0,0.38) !important; }
  @media (max-width: 380px) {
    .pf-chip { padding: 10px 12px !important; font-size: 12px !important; }
    .pf-chip-emoji { font-size: 20px !important; }
    .pf-shell { padding: 20px 12px 60px !important; }
  }
  @media (min-width: 540px) {
    .pf-chip-grid { grid-template-columns: repeat(3, 1fr) !important; }
  }
  @media (min-width: 720px) {
    .pf-chip-grid { grid-template-columns: repeat(4, 1fr) !important; }
    .pf-card { padding: 32px 30px !important; }
  }
`;

const CUISINES = [
  { id: 'NorthIndian', label: 'North Indian', emoji: '🫕' },
  { id: 'SouthIndian', label: 'South Indian', emoji: '🥞' },
  { id: 'Biryani',     label: 'Biryani',      emoji: '🍛' },
  { id: 'Chinese',     label: 'Chinese',       emoji: '🥡' },
  { id: 'Pizza',       label: 'Pizza',         emoji: '🍕' },
  { id: 'Burgers',     label: 'Burgers',       emoji: '🍔' },
  { id: 'Wraps',       label: 'Wraps',         emoji: '🌯' },
  { id: 'Continental', label: 'Continental',   emoji: '🍝' },
  { id: 'Breakfast',   label: 'Breakfast',     emoji: '🍳' },
  { id: 'Any',         label: 'Anything',      emoji: '🍽️' },
];

const DIETS = [
  { id: 'veg',        label: 'Veg Only',        emoji: '🥦' },
  { id: 'jain',       label: 'Jain',            emoji: '🌿' },
  { id: 'no-peanuts', label: 'No Peanuts',      emoji: '🥜' },
  { id: 'no-spicy',   label: 'No Spicy',        emoji: '🌶️' },
  { id: 'none',       label: 'No Restrictions', emoji: '✅' },
];

const BUDGETS = [
  { id: 'under200', label: 'Under ₹200', desc: 'Light on the wallet', icon: '💸' },
  { id: '200to400', label: '₹200 – ₹400', desc: 'The sweet spot',     icon: '💰' },
  { id: 'any',      label: 'Any budget',  desc: "Sky's the limit",    icon: '🚀' },
];

export default function PreferenceForm() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [me,          setMe]          = useState(null);
  const [cuisine,     setCuisine]     = useState([]);
  const [diet,        setDiet]        = useState([]);
  const [budget,      setBudget]      = useState('any');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [step,        setStep]        = useState(1);
  // A4 — NL input
  const [nlText,      setNlText]      = useState('');
  const [nlLoading,   setNlLoading]   = useState(false);
  const [nlError,     setNlError]     = useState('');
  const [nlFilled,    setNlFilled]    = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`member_${sessionId}`);
    if (!stored) { navigate(`/session/${sessionId}`); return; }
    setMe(JSON.parse(stored));
  }, [sessionId, navigate]);

  // Auto-fill form when the AI chat bot detects preferences
  useEffect(() => {
    const handler = (e) => {
      const { cuisine, diet, budget } = e.detail || {};
      if (cuisine?.length) setCuisine(cuisine);
      if (diet?.length)    setDiet(diet);
      if (budget)          setBudget(budget);
      setStep(3); // jump to review step so user can confirm
    };
    window.addEventListener('chatbot-fill-preferences', handler);
    return () => window.removeEventListener('chatbot-fill-preferences', handler);
  }, []);

  // A4 — Extract preferences from free-form text via agent API
  const handleNlExtract = async () => {
    if (!nlText.trim() || nlLoading) return;
    setNlLoading(true);
    setNlError('');
    try {
      const res = await API.post(`/sessions/${sessionId}/extract-preferences`, { text: nlText.trim() });
      const { cuisine: c, diet: d, budget: b } = res.data.data;
      if (c?.length) setCuisine(c);
      if (d?.length) setDiet(d);
      if (b)         setBudget(b);
      setNlFilled(true);
      setStep(3); // jump to review
    } catch {
      setNlError('Could not extract preferences — try selecting manually below.');
    } finally {
      setNlLoading(false);
    }
  };

  const toggleCuisine = (id) => {
    if (id === 'Any') { setCuisine(['Any']); return; }
    setCuisine((prev) => {
      const without = prev.filter((c) => c !== 'Any');
      return without.includes(id) ? without.filter((c) => c !== id) : [...without, id];
    });
  };

  const toggleDiet = (id) => {
    if (id === 'none') { setDiet(['none']); return; }
    setDiet((prev) => {
      const without = prev.filter((d) => d !== 'none');
      return without.includes(id) ? without.filter((d) => d !== id) : [...without, id];
    });
  };

  const handleSubmit = async () => {
    if (!me) return;
    setSubmitting(true);
    setError('');
    try {
      await API.post(`/sessions/${sessionId}/preferences`, {
        memberId:   me.memberId,
        memberName: me.memberName,
        cuisine:    cuisine.length > 0 ? cuisine : ['Any'],
        diet:       diet.length   > 0 ? diet    : ['none'],
        budget,
      });
      // Save diet + cuisine + budget so MenuView can filter items for this member
      localStorage.setItem(`member_${sessionId}`, JSON.stringify({
        ...me,
        hasSubmittedPreference: true,
        diet:    diet.length   > 0 ? diet    : ['none'],
        cuisine: cuisine.length > 0 ? cuisine : ['Any'],
        budget,
      }));
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  if (!me) return null;

  const STEPS = [
    { label: 'Cuisine', desc: 'What are you craving?' },
    { label: 'Dietary', desc: 'Any restrictions?' },
    { label: 'Budget',  desc: 'Per-person spend?' },
  ];

  return (
    <div style={s.page}>
      <style>{INJECTED_CSS}</style>
      <div style={s.blob1} />

      <div style={s.shell} className="pf-shell">

        {/* ── Progress header ───────────────────────────────────────────── */}
        <div style={s.progressHeader}>
          <button style={s.backBtn} onClick={() => step === 1 ? navigate(`/session/${sessionId}`) : setStep(step - 1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Step indicators */}
          <div style={s.stepPills}>
            {STEPS.map((st, i) => {
              const n = i + 1;
              const done    = n < step;
              const active  = n === step;
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <div style={{ width: 28, height: 2, borderRadius: 1, background: done ? colors.gold.base : colors.border.subtle, transition: transition.base }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: done ? 'pointer' : 'default' }}
                    onClick={() => done && setStep(n)}>
                    <div style={{
                      width:          26,
                      height:         26,
                      borderRadius:   radius.full,
                      background:     done ? colors.gold.base : active ? colors.gold.dim : 'transparent',
                      border:         `2px solid ${done ? colors.gold.base : active ? colors.gold.muted : colors.border.subtle}`,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      fontSize:       font.size.xs,
                      fontWeight:     font.weight.bold,
                      color:          done ? '#fff' : active ? colors.gold.base : colors.text.muted,
                      flexShrink:     0,
                      transition:     transition.base,
                    }}>
                      {done ? (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : n}
                    </div>
                    <span style={{
                      fontSize:   font.size.xs,
                      fontWeight: active ? font.weight.bold : font.weight.regular,
                      color:      active ? colors.text.primary : done ? colors.text.secondary : colors.text.muted,
                      letterSpacing: '0.02em',
                    }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <span style={{ width: 32 }} />
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────── */}
        <div style={s.progressBarTrack}>
          <div style={{ ...s.progressBarFill, width: `${((step - 1) / 2) * 100}%` }} />
        </div>

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div style={s.card} className="pf-card animate-scale-in" key={step}>

          <div style={s.cardTop}>
            <h2 style={s.title}>{STEPS[step - 1].desc}</h2>
            <p style={s.subtitle}>
              Filling for <span style={{ color: colors.text.gold, fontWeight: font.weight.semibold }}>{me.memberName}</span>
            </p>
          </div>

          {/* ── STEP 1: Cuisine ──────────────────────────────────────── */}
          {step === 1 && (
            <>
              {/* ── A4: Natural Language Input ─────────────────────────── */}
              <div style={s.nlBox}>
                <p style={s.nlTitle}>✨ Just describe your preferences</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={s.nlInput}
                    type="text"
                    placeholder="e.g. vegetarian, prefer Chinese, tight budget under ₹200…"
                    value={nlText}
                    onChange={(e) => { setNlText(e.target.value); setNlError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNlExtract(); }}
                    onFocus={(e) => { e.target.style.borderColor = colors.border.focus; }}
                    onBlur={(e) => { e.target.style.borderColor = colors.border.default; }}
                  />
                  <button
                    style={{ ...s.nlBtn, opacity: nlLoading || !nlText.trim() ? 0.6 : 1 }}
                    onClick={handleNlExtract}
                    disabled={nlLoading || !nlText.trim()}
                  >
                    {nlLoading ? '…' : '→'}
                  </button>
                </div>
                {nlError && <p style={{ fontSize: font.size.xs, color: colors.red?.text || '#ef4444', margin: '6px 0 0' }}>{nlError}</p>}
                {nlFilled && <p style={{ fontSize: font.size.xs, color: colors.green.text, margin: '6px 0 0' }}>✓ Preferences auto-filled from your description — review below</p>}
                <p style={{ fontSize: font.size.xs, color: colors.text.muted, margin: '8px 0 0', textAlign: 'center' }}>— or select manually below —</p>
              </div>

              <p style={s.hint}>Pick one or more cuisines. Everyone's choices are combined to find the best match for the group.</p>
              <div style={s.chipGrid} className="pf-chip-grid">
                {CUISINES.map((c) => {
                  const active = cuisine.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      className={`pf-chip${active ? ' pf-chip-active' : ''}`}
                      style={{ ...s.chip, ...(active ? s.chipActive : {}) }}
                      onClick={() => toggleCuisine(c.id)}
                    >
                      <span className="pf-chip-emoji" style={s.chipEmoji}>{c.emoji}</span>
                      <span style={s.chipLabel}>{c.label}</span>
                      {active && (
                        <div style={s.chipCheck}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                className="pf-next-btn"
                style={{ ...s.nextBtn, opacity: cuisine.length === 0 ? 0.45 : 1 }}
                onClick={() => setStep(2)}
                disabled={cuisine.length === 0}
              >
                Next — Dietary Preferences →
              </button>
            </>
          )}

          {/* ── STEP 2: Diet ─────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <p style={s.hint}>Select all that apply. These are used as hard filters — items that don't match won't be shown.</p>
              <div style={s.chipGrid} className="pf-chip-grid">
                {DIETS.map((d) => {
                  const active = diet.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      className={`pf-chip${active ? ' pf-chip-active' : ''}`}
                      style={{ ...s.chip, ...(active ? s.chipActive : {}) }}
                      onClick={() => toggleDiet(d.id)}
                    >
                      <span className="pf-chip-emoji" style={s.chipEmoji}>{d.emoji}</span>
                      <span style={s.chipLabel}>{d.label}</span>
                      {active && (
                        <div style={s.chipCheck}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button className="pf-next-btn" style={s.nextBtn} onClick={() => setStep(3)}>
                Next — Budget →
              </button>
            </>
          )}

          {/* ── STEP 3: Budget ───────────────────────────────────────── */}
          {step === 3 && (
            <>
              <p style={s.hint}>Pick your comfortable per-person spend for today's lunch.</p>
              <div style={s.budgetList}>
                {BUDGETS.map((b) => {
                  const active = budget === b.id;
                  return (
                    <button
                      key={b.id}
                      className={`pf-budget-card${active ? ' pf-budget-active' : ''}`}
                      style={{ ...s.budgetCard, ...(active ? s.budgetActive : {}) }}
                      onClick={() => setBudget(b.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={s.budgetIcon}>{b.icon}</span>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ ...s.budgetLabel, color: active ? colors.text.primary : colors.text.secondary }}>{b.label}</p>
                          <p style={s.budgetDesc}>{b.desc}</p>
                        </div>
                      </div>
                      {active && (
                        <div style={s.radioActive}>
                          <div style={s.radioInner} />
                        </div>
                      )}
                      {!active && <div style={s.radioEmpty} />}
                    </button>
                  );
                })}
              </div>

              {/* Summary */}
              <div style={s.summary}>
                <p style={s.summaryTitle}>Your choices</p>
                <div style={s.summaryGrid}>
                  <div style={s.summaryItem}>
                    <span style={s.summaryKey}>Cuisine</span>
                    <span style={s.summaryVal}>{cuisine.join(', ') || 'Any'}</span>
                  </div>
                  <div style={s.summaryItem}>
                    <span style={s.summaryKey}>Diet</span>
                    <span style={s.summaryVal}>{diet.join(', ') || 'No restrictions'}</span>
                  </div>
                  <div style={s.summaryItem}>
                    <span style={s.summaryKey}>Budget</span>
                    <span style={s.summaryVal}>{BUDGETS.find((b2) => b2.id === budget)?.label}</span>
                  </div>
                </div>
              </div>

              {error && <p style={s.errorMsg}>{error}</p>}

              <button
                className="pf-next-btn"
                style={{ ...s.nextBtn, opacity: submitting ? 0.7 : 1 }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <><span style={s.spinner} className="gl-spinner" /> Submitting...</>
                ) : '✓ Submit Preferences'}
              </button>
            </>
          )}

        </div>

        {/* Step counter */}
        <p style={s.stepCount}>Step {step} of 3</p>

      </div>
    </div>
  );
}

const s = {
  // ── A4: Natural-language input box ────────────────────────────────────────
  nlBox: {
    background:   `linear-gradient(135deg, rgba(240,165,0,0.06), rgba(240,165,0,0.02))`,
    border:       `1px solid rgba(240,165,0,0.2)`,
    borderRadius: radius.lg,
    padding:      '14px 16px 12px',
    marginBottom: 20,
  },
  nlTitle: {
    fontSize:     font.size.xs,
    fontWeight:   font.weight.semibold,
    color:        colors.gold.bright,
    marginBottom: 10,
    letterSpacing: '0.03em',
  },
  nlInput: {
    flex:         1,
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color:        colors.text.primary,
    fontFamily:   font.family,
    fontSize:     font.size.sm,
    padding:      '10px 13px',
    outline:      'none',
    transition:   transition.fast,
    boxSizing:    'border-box',
  },
  nlBtn: {
    background:   colors.gold.base,
    color:        colors.text.inverse,
    border:       'none',
    borderRadius: radius.md,
    fontFamily:   font.family,
    fontWeight:   font.weight.bold,
    fontSize:     font.size.md,
    cursor:       'pointer',
    padding:      '10px 18px',
    transition:   transition.fast,
    flexShrink:   0,
  },
  page: {
    minHeight:      '100vh',
    background:     colors.bg.base,
    display:        'flex',
    alignItems:     'flex-start',
    justifyContent: 'center',
    padding:        '28px 16px 60px',
    position:       'relative',
    overflow:       'hidden',
  },
  blob1: {
    position: 'absolute', top: '-20%', right: '-15%',
    width: 550, height: 550, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(240,165,0,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  shell: {
    width:    '100%',
    maxWidth: 500,
    position: 'relative',
    zIndex:   1,
    padding:  '0',
  },
  progressHeader: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   14,
  },
  backBtn: {
    width:        36,
    height:       36,
    borderRadius: radius.md,
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    cursor:       'pointer',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    transition:   transition.fast,
    flexShrink:   0,
    boxShadow:    '0 1px 4px rgba(0,0,0,0.05)',
  },
  stepPills: {
    display:    'flex',
    alignItems: 'center',
    gap:        4,
  },

  // Progress bar
  progressBarTrack: {
    height:       3,
    background:   colors.border.subtle,
    borderRadius: 2,
    marginBottom: 20,
    overflow:     'hidden',
  },
  progressBarFill: {
    height:      '100%',
    background:  `linear-gradient(90deg, ${colors.gold.base}, #f4520f)`,
    borderRadius: 2,
    transition:  'width 0.4s ease',
  },

  card: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius['2xl'],
    padding:      '28px 24px',
    boxShadow:    `${shadow.card}, inset 0 1px 0 rgba(255,255,255,0.05)`,
    marginBottom: 12,
  },
  cardTop: {
    marginBottom: 20,
  },
  title: {
    fontSize:      font.size['2xl'],
    fontWeight:    font.weight.bold,
    color:         colors.text.primary,
    letterSpacing: '-0.025em',
    marginBottom:  4,
  },
  subtitle: {
    fontSize: font.size.sm,
    color:    colors.text.muted,
  },
  hint: {
    fontSize:    font.size.sm,
    color:       colors.text.muted,
    marginBottom: 18,
    lineHeight:  1.65,
  },

  // Chip grid — displays as 2-col grid by default, CSS overrides above for larger
  chipGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap:                 10,
    marginBottom:        24,
  },
  chip: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    padding:        '16px 10px',
    borderRadius:   radius.xl,
    border:         `1.5px solid ${colors.border.default}`,
    background:     colors.bg.raised,
    fontSize:       font.size.sm,
    fontWeight:     font.weight.medium,
    color:          colors.text.secondary,
    cursor:         'pointer',
    fontFamily:     font.family,
    position:       'relative',
    textAlign:      'center',
    minHeight:      80,
  },
  chipActive: {
    background:  `linear-gradient(135deg, ${colors.gold.base} 0%, #f4520f 100%)`,
    color:       '#fff',
    border:      `1.5px solid transparent`,
    fontWeight:  font.weight.bold,
    boxShadow:   '0 4px 14px rgba(240,165,0,0.3)',
  },
  chipEmoji: { fontSize: 26, lineHeight: 1 },
  chipLabel: { fontSize: font.size.xs, fontWeight: 'inherit', lineHeight: 1.3 },
  chipCheck: {
    position:    'absolute',
    top:         6,
    right:       6,
    width:       18,
    height:      18,
    borderRadius: radius.full,
    background:  'rgba(255,255,255,0.25)',
    display:     'flex',
    alignItems:  'center',
    justifyContent: 'center',
  },

  nextBtn: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    width:          '100%',
    background:     `linear-gradient(135deg, ${colors.gold.base} 0%, #f4520f 100%)`,
    color:          '#fff',
    border:         'none',
    borderRadius:   radius.xl,
    fontFamily:     font.family,
    fontSize:       font.size.md,
    fontWeight:     font.weight.bold,
    cursor:         'pointer',
    padding:        '15px',
    letterSpacing:  '-0.01em',
    boxShadow:      '0 4px 20px rgba(240,165,0,0.28)',
  },
  budgetList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           10,
    marginBottom:  20,
  },
  budgetCard: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '16px 18px',
    borderRadius:   radius.xl,
    border:         `1.5px solid ${colors.border.default}`,
    background:     colors.bg.raised,
    cursor:         'pointer',
    fontFamily:     font.family,
  },
  budgetActive: {
    borderColor: colors.gold.base,
    background:  colors.gold.dim,
    boxShadow:   '0 0 0 1px rgba(240,165,0,0.2)',
  },
  budgetIcon:  { fontSize: 26, flexShrink: 0 },
  budgetLabel: { fontSize: font.size.base, fontWeight: font.weight.semibold, margin: '0 0 3px' },
  budgetDesc:  { fontSize: font.size.xs, color: colors.text.muted, margin: 0 },
  radioEmpty: {
    width:        20,
    height:       20,
    borderRadius: '50%',
    border:       `2px solid ${colors.border.default}`,
    flexShrink:   0,
  },
  radioActive: {
    width:          20,
    height:         20,
    borderRadius:   '50%',
    border:         `2px solid ${colors.gold.base}`,
    background:     colors.gold.dim,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  radioInner: {
    width:        9,
    height:       9,
    borderRadius: '50%',
    background:   colors.gold.base,
  },
  summary: {
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.subtle}`,
    borderRadius: radius.xl,
    padding:      '16px 18px',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize:      font.size.xs,
    fontWeight:    font.weight.bold,
    color:         colors.text.muted,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom:  12,
  },
  summaryGrid: {
    display:       'flex',
    flexDirection: 'column',
    gap:           8,
  },
  summaryItem: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    gap:            12,
  },
  summaryKey: {
    fontSize: font.size.sm,
    color:    colors.text.muted,
    flexShrink: 0,
  },
  summaryVal: {
    fontSize:   font.size.sm,
    color:      colors.text.primary,
    fontWeight: font.weight.semibold,
    textAlign:  'right',
    wordBreak:  'break-word',
  },
  errorMsg: {
    fontSize:    font.size.xs,
    color:       colors.red.text,
    marginBottom: 12,
    padding:     '8px 12px',
    background:  'rgba(239,68,68,0.07)',
    borderRadius: radius.md,
    border:      '1px solid rgba(239,68,68,0.2)',
  },
  spinner: {
    display:      'inline-block',
    width:        14,
    height:       14,
    borderRadius: '50%',
    flexShrink:   0,
  },
  stepCount: {
    textAlign:   'center',
    fontSize:    font.size.xs,
    color:       colors.text.muted,
    letterSpacing: '0.05em',
  },
};
