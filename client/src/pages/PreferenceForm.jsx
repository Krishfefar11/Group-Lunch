import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

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

  const [me,         setMe]         = useState(null);
  const [cuisine,    setCuisine]    = useState([]);
  const [diet,       setDiet]       = useState([]);
  const [budget,     setBudget]     = useState('any');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [step,       setStep]       = useState(1);

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
      await axios.post(`/api/sessions/${sessionId}/preferences`, {
        memberId:   me.memberId,
        memberName: me.memberName,
        cuisine:    cuisine.length > 0 ? cuisine : ['Any'],
        diet:       diet.length   > 0 ? diet    : ['none'],
        budget,
      });
      localStorage.setItem(`member_${sessionId}`, JSON.stringify({ ...me, hasSubmittedPreference: true }));
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
      <div style={s.blob1} />

      <div style={s.shell}>

        {/* ── Progress header ───────────────────────────────────────────── */}
        <div style={s.progressHeader}>
          <button style={s.backBtn} onClick={() => step === 1 ? navigate(`/session/${sessionId}`) : setStep(step - 1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Step pills */}
          <div style={s.stepPills}>
            {STEPS.map((st, i) => {
              const n = i + 1;
              const done    = n < step;
              const active  = n === step;
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <div style={{ width: 24, height: 1, background: done ? colors.gold.muted : colors.border.subtle }} />}
                  <div style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         6,
                    cursor:      done ? 'pointer' : 'default',
                  }} onClick={() => done && setStep(n)}>
                    <div style={{
                      width:          22,
                      height:         22,
                      borderRadius:   radius.full,
                      background:     done ? colors.gold.muted : active ? colors.gold.dim : 'transparent',
                      border:         `1.5px solid ${done || active ? colors.gold.muted : colors.border.subtle}`,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      fontSize:       font.size.xs,
                      fontWeight:     font.weight.bold,
                      color:          done ? colors.gold.bright : active ? colors.gold.base : colors.text.muted,
                      flexShrink:     0,
                      transition:     transition.base,
                    }}>
                      {done ? (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={colors.gold.bright} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : n}
                    </div>
                    <span style={{
                      fontSize:   font.size.xs,
                      fontWeight: active ? font.weight.semibold : font.weight.regular,
                      color:      active ? colors.text.primary : colors.text.muted,
                      letterSpacing: '0.03em',
                    }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <span style={{ width: 32 }} /> {/* spacer */}
        </div>

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div style={s.card} className="animate-scale-in" key={step}>

          <div style={s.cardTop}>
            <h2 style={s.title}>{STEPS[step - 1].desc}</h2>
            <p style={s.subtitle}>
              Filling for <span style={{ color: colors.text.gold, fontWeight: font.weight.semibold }}>{me.memberName}</span>
            </p>
          </div>

          {/* ── STEP 1: Cuisine ──────────────────────────────────────── */}
          {step === 1 && (
            <>
              <p style={s.hint}>Pick one or more cuisines. Everyone's choices are combined to find the best match.</p>
              <div style={s.chipGrid}>
                {CUISINES.map((c) => {
                  const active = cuisine.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      style={{
                        ...s.chip,
                        ...(active ? s.chipActive : {}),
                      }}
                      onClick={() => toggleCuisine(c.id)}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = colors.border.strong; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = colors.border.default; }}
                    >
                      <span style={{ fontSize: 18 }}>{c.emoji}</span>
                      <span>{c.label}</span>
                      {active && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 2 }}>
                          <path d="M2 6l3 3 5-5" stroke={colors.text.inverse} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                style={{ ...s.nextBtn, opacity: cuisine.length === 0 ? 0.45 : 1 }}
                onClick={() => setStep(2)}
                disabled={cuisine.length === 0}
                onMouseEnter={(e) => { if (cuisine.length > 0) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
                Next — Dietary →
              </button>
            </>
          )}

          {/* ── STEP 2: Diet ─────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <p style={s.hint}>Select all that apply. This is used as a hard filter in restaurant matching.</p>
              <div style={s.chipGrid}>
                {DIETS.map((d) => {
                  const active = diet.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      style={{ ...s.chip, ...(active ? s.chipActive : {}) }}
                      onClick={() => toggleDiet(d.id)}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = colors.border.strong; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = colors.border.default; }}
                    >
                      <span style={{ fontSize: 18 }}>{d.emoji}</span>
                      <span>{d.label}</span>
                      {active && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 2 }}>
                          <path d="M2 6l3 3 5-5" stroke={colors.text.inverse} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                style={s.nextBtn}
                onClick={() => setStep(3)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
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
                      style={{ ...s.budgetCard, ...(active ? s.budgetActive : {}) }}
                      onClick={() => setBudget(b.id)}
                      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = colors.border.strong; e.currentTarget.style.background = colors.bg.overlay; } }}
                      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = colors.border.default; e.currentTarget.style.background = colors.bg.raised; } }}
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
                style={{ ...s.nextBtn, opacity: submitting ? 0.7 : 1 }}
                onClick={handleSubmit}
                disabled={submitting}
                onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
                {submitting ? (
                  <><span style={s.spinner} /> Submitting...</>
                ) : 'Submit Preferences ✓'}
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
  page: {
    minHeight:  '100vh',
    background: colors.bg.base,
    display:    'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding:    '28px 16px 60px',
    position:   'relative',
    overflow:   'hidden',
  },
  blob1: {
    position: 'absolute', top: '-20%', right: '-15%',
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(240,165,0,0.05) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  shell: {
    width:    '100%',
    maxWidth: 480,
    position: 'relative',
    zIndex:   1,
  },
  progressHeader: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   24,
  },
  backBtn: {
    width:        32,
    height:       32,
    borderRadius: radius.md,
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    cursor:       'pointer',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    transition:   transition.fast,
    flexShrink:   0,
  },
  stepPills: {
    display:    'flex',
    alignItems: 'center',
    gap:        4,
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
    fontSize:      font.size.xl,
    fontWeight:    font.weight.bold,
    color:         colors.text.primary,
    letterSpacing: '-0.02em',
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
    lineHeight:  1.6,
  },
  chipGrid: {
    display:    'flex',
    flexWrap:   'wrap',
    gap:        8,
    marginBottom: 24,
  },
  chip: {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          6,
    padding:      '8px 14px',
    borderRadius: radius.full,
    border:       `1px solid ${colors.border.default}`,
    background:   colors.bg.raised,
    fontSize:     font.size.sm,
    fontWeight:   font.weight.medium,
    color:        colors.text.secondary,
    cursor:       'pointer',
    transition:   transition.base,
    fontFamily:   font.family,
  },
  chipActive: {
    background:  colors.gold.base,
    color:       colors.text.inverse,
    border:      `1px solid ${colors.gold.base}`,
    fontWeight:  font.weight.semibold,
  },
  nextBtn: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    width:          '100%',
    background:     colors.gold.base,
    color:          colors.text.inverse,
    border:         'none',
    borderRadius:   radius.lg,
    fontFamily:     font.family,
    fontSize:       font.size.md,
    fontWeight:     font.weight.bold,
    cursor:         'pointer',
    padding:        '14px',
    letterSpacing:  '-0.01em',
    transition:     transition.base,
    boxShadow:      '0 4px 20px rgba(240,165,0,0.28)',
  },
  budgetList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           8,
    marginBottom:  20,
  },
  budgetCard: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '14px 16px',
    borderRadius:   radius.lg,
    border:         `1px solid ${colors.border.default}`,
    background:     colors.bg.raised,
    cursor:         'pointer',
    transition:     transition.base,
    fontFamily:     font.family,
  },
  budgetActive: {
    borderColor: colors.gold.base,
    background:  colors.gold.dim,
    boxShadow:   '0 0 0 1px rgba(240,165,0,0.25)',
  },
  budgetIcon:  { fontSize: 24, flexShrink: 0 },
  budgetLabel: { fontSize: font.size.base, fontWeight: font.weight.semibold, margin: '0 0 2px' },
  budgetDesc:  { fontSize: font.size.xs, color: colors.text.muted, margin: 0 },
  radioEmpty: {
    width:        18,
    height:       18,
    borderRadius: '50%',
    border:       `1.5px solid ${colors.border.default}`,
    flexShrink:   0,
  },
  radioActive: {
    width:          18,
    height:         18,
    borderRadius:   '50%',
    border:         `1.5px solid ${colors.gold.base}`,
    background:     colors.gold.dim,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  radioInner: {
    width:        8,
    height:       8,
    borderRadius: '50%',
    background:   colors.gold.base,
  },
  summary: {
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.subtle}`,
    borderRadius: radius.lg,
    padding:      '14px 16px',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize:      font.size.xs,
    fontWeight:    font.weight.semibold,
    color:         colors.text.muted,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    marginBottom:  10,
  },
  summaryGrid: {
    display:       'flex',
    flexDirection: 'column',
    gap:           6,
  },
  summaryItem: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  summaryKey: {
    fontSize: font.size.sm,
    color:    colors.text.muted,
  },
  summaryVal: {
    fontSize:   font.size.sm,
    color:      colors.text.primary,
    fontWeight: font.weight.medium,
    maxWidth:   '60%',
    textAlign:  'right',
    wordBreak:  'break-word',
  },
  errorMsg: {
    fontSize:    font.size.xs,
    color:       colors.red.text,
    marginBottom: 12,
  },
  spinner: {
    display:      'inline-block',
    width:        14,
    height:       14,
    border:       '2px solid rgba(0,0,0,0.15)',
    borderTopColor: colors.text.inverse,
    borderRadius: '50%',
    animation:    'spin 0.7s linear infinite',
    flexShrink:   0,
  },
  stepCount: {
    textAlign:   'center',
    fontSize:    font.size.xs,
    color:       colors.text.muted,
    letterSpacing: '0.05em',
  },
};
