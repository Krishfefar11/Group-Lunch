import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkHealth } from '../api/api';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ end, suffix = '', duration = 1800 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = performance.now();
        const tick = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
          setCount(Math.floor(ease * end));
          if (progress < 1) requestAnimationFrame(tick);
          else setCount(end);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Floating food emoji ───────────────────────────────────────────────────────
function FloatingEmoji({ emoji, style }) {
  return (
    <div style={{
      position: 'absolute',
      fontSize: 28,
      animation: 'floatSlow 6s ease-in-out infinite',
      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))',
      userSelect: 'none',
      pointerEvents: 'none',
      ...style,
    }}>
      {emoji}
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ number, icon, title, desc, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="animate-fade-up"
      style={{
        animationDelay: `${delay}s`,
        opacity: 0,
        background: hovered
          ? 'linear-gradient(145deg, rgba(244,82,15,0.04), #FFFFFF)'
          : colors.bg.surface,
        border: `1px solid ${hovered ? 'rgba(244,82,15,0.2)' : colors.border.default}`,
        borderRadius: radius['2xl'],
        padding: '28px 24px',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.1)' : shadow.card,
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Step number */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 22,
        fontSize: 11,
        fontWeight: font.weight.bold,
        color: hovered ? colors.gold.base : colors.text.muted,
        letterSpacing: '0.1em',
        transition: 'color 0.3s',
      }}>
        {String(number).padStart(2, '0')}
      </div>

      {/* Icon */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: radius.lg,
        background: hovered ? 'rgba(244,82,15,0.1)' : colors.bg.raised,
        border: `1px solid ${hovered ? 'rgba(244,82,15,0.22)' : colors.border.subtle}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        marginBottom: 18,
        transition: 'all 0.3s',
      }}>
        {icon}
      </div>

      <h3 style={{
        fontSize: font.size.md,
        fontWeight: font.weight.bold,
        color: colors.text.primary,
        letterSpacing: '-0.015em',
        marginBottom: 8,
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: font.size.sm,
        color: colors.text.secondary,
        lineHeight: 1.65,
        margin: 0,
      }}>
        {desc}
      </p>

      {/* Hover glow */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,82,15,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

// ── Feature pill ──────────────────────────────────────────────────────────────
function FeaturePill({ icon, text }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '8px 14px',
      borderRadius: radius.full,
      background: colors.bg.surface,
      border: `1px solid ${colors.border.default}`,
      fontSize: font.size.sm,
      color: colors.text.secondary,
      fontWeight: font.weight.medium,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      {text}
    </div>
  );
}

// ── Testimonial card ──────────────────────────────────────────────────────────
function TestimonialCard({ name, role, text, emoji, delay = 0 }) {
  return (
    <div className="animate-fade-up" style={{
      animationDelay: `${delay}s`,
      opacity: 0,
      background: colors.bg.surface,
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius['2xl'],
      padding: '22px 20px',
      boxShadow: shadow.card,
    }}>
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 12,
      }}>
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{ color: colors.gold.base, fontSize: 11 }}>★</span>
        ))}
      </div>
      <p style={{
        fontSize: font.size.sm,
        color: colors.text.secondary,
        lineHeight: 1.7,
        marginBottom: 16,
        fontStyle: 'italic',
      }}>
        "{text}"
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: radius.full,
          background: `linear-gradient(135deg, rgba(244,82,15,0.14), rgba(244,82,15,0.06))`,
          border: `1.5px solid rgba(244,82,15,0.2)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}>
          {emoji}
        </div>
        <div>
          <p style={{ fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, margin: '0 0 1px' }}>{name}</p>
          <p style={{ fontSize: font.size.xs, color: colors.text.muted, margin: 0 }}>{role}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [serverOk, setServerOk] = useState(null);
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    checkHealth()
      .then(() => setServerOk(true))
      .catch(() => setServerOk(false));
    // Stagger hero reveal
    const t = setTimeout(() => setHeroReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={s.page}>

      {/* ── Ambient background ───────────────────────────────────────────── */}
      <div style={s.bgBlob1} />
      <div style={s.bgBlob2} />
      <div style={s.bgBlob3} />
      <div style={s.bgGrid} />

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav style={s.nav} className="animate-fade-down">
        <div style={s.navInner}>
          <div style={s.logo}>
            <span style={s.logoIcon}>🍱</span>
            <span style={s.logoText}>
              Group<span style={{ color: colors.gold.base }}>Lunch</span>
            </span>
          </div>

          <div style={s.navRight}>
            {serverOk !== null && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: radius.full,
                background: serverOk ? 'rgba(22,163,74,0.08)' : 'rgba(226,55,68,0.08)',
                border: `1px solid ${serverOk ? 'rgba(22,163,74,0.2)' : 'rgba(226,55,68,0.2)'}`,
                fontSize: font.size.xs,
                color: serverOk ? colors.green.text : colors.red.text,
                fontWeight: font.weight.semibold,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: serverOk ? colors.green.base : colors.red.base,
                  animation: serverOk ? 'pulse 2s ease infinite' : 'none',
                }} />
                {serverOk ? 'Live' : 'Offline'}
              </div>
            )}
            <button style={s.navCta} onClick={() => navigate('/create')} className="btn-gold">
              Start Session
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={s.hero}>
        {/* Floating emojis */}
        <FloatingEmoji emoji="🍕" style={{ top: '14%', left: '8%', animationDelay: '0s', fontSize: 32 }} />
        <FloatingEmoji emoji="🍜" style={{ top: '22%', right: '10%', animationDelay: '1.2s', fontSize: 26 }} />
        <FloatingEmoji emoji="🥗" style={{ bottom: '28%', left: '5%', animationDelay: '2.4s', fontSize: 24 }} />
        <FloatingEmoji emoji="🍛" style={{ bottom: '22%', right: '7%', animationDelay: '0.8s', fontSize: 30 }} />
        <FloatingEmoji emoji="🧆" style={{ top: '50%', left: '15%', animationDelay: '1.8s', fontSize: 20 }} />
        <FloatingEmoji emoji="🍱" style={{ top: '45%', right: '14%', animationDelay: '3s', fontSize: 22 }} />

        <div style={s.heroContent}>
          {/* Badge */}
          <div style={{
            ...s.heroBadge,
            opacity: heroReady ? 1 : 0,
            transform: heroReady ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1)',
          }}>
            <span style={{ fontSize: 11, animation: 'pulse 2s ease infinite' }}>✦</span>
            AI-powered group food ordering
          </div>

          {/* Main headline */}
          <h1 style={{
            ...s.heroTitle,
            opacity: heroReady ? 1 : 0,
            transform: heroReady ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.7s cubic-bezier(0.22,1,0.36,1) 0.08s',
          }}>
            <span style={{ display: 'block', color: colors.text.primary }}>
              Lunch for the
            </span>
            <span className="text-gradient-gold" style={{ display: 'block' }}>
              whole team.
            </span>
            <span style={{ display: 'block', color: colors.text.primary }}>
              One cart.
            </span>
          </h1>

          {/* Sub */}
          <p style={{
            ...s.heroSub,
            opacity: heroReady ? 1 : 0,
            transform: heroReady ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.7s cubic-bezier(0.22,1,0.36,1) 0.16s',
          }}>
            Create a session, invite your team, submit preferences — then let AI
            pick the perfect restaurant for everyone. One order. One cart.
          </p>

          {/* CTAs */}
          <div style={{
            ...s.heroCtas,
            opacity: heroReady ? 1 : 0,
            transform: heroReady ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.7s cubic-bezier(0.22,1,0.36,1) 0.24s',
          }}>
            <button style={s.ctaPrimary} onClick={() => navigate('/create')} className="btn-gold">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Start a Session
            </button>
            <button
              style={s.ctaSecondary}
              onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
            >
              See how it works
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 9l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Feature pills */}
          <div style={{
            ...s.heroPills,
            opacity: heroReady ? 1 : 0,
            transition: 'all 0.7s cubic-bezier(0.22,1,0.36,1) 0.32s',
          }}>
            <FeaturePill icon="🤖" text="AI restaurant matching" />
            <FeaturePill icon="🛒" text="Shared group cart" />
            <FeaturePill icon="🎟️" text="Auto coupon picker" />
            <FeaturePill icon="📍" text="Live order tracking" />
          </div>
        </div>

        {/* ── Order card preview ──────────────────────────────────────────── */}
        <div style={{
          ...s.heroCard,
          opacity: heroReady ? 1 : 0,
          transform: heroReady ? 'perspective(1200px) rotateY(-6deg) rotateX(3deg) scale(1)' : 'perspective(1200px) rotateY(-6deg) rotateX(3deg) scale(0.92)',
          transition: 'all 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s',
        }}>
          {/* Card header */}
          <div style={s.previewHeader}>
            <div style={s.previewTitle}>🍱 Group Lunch</div>
            <div style={{
              padding: '3px 10px',
              borderRadius: radius.full,
              background: 'rgba(22,163,74,0.1)',
              border: '1px solid rgba(22,163,74,0.2)',
              fontSize: 10,
              fontWeight: 700,
              color: colors.green.text,
              letterSpacing: '0.05em',
            }}>LIVE</div>
          </div>

          {/* Members */}
          <div style={s.previewMembers}>
            {[
              { name: 'Drashti', color: '#f0a500', pref: 'Veg, No spice' },
              { name: 'Rishi',   color: '#6366f1', pref: 'Non-veg' },
              { name: 'Priya',   color: '#10b981', pref: 'Jain' },
              { name: 'Arjun',   color: '#ef4444', pref: 'Veg' },
            ].map((m, i) => (
              <div key={m.name} style={s.previewMember}>
                <div style={{
                  ...s.previewAvatar,
                  background: `${m.color}22`,
                  border: `1.5px solid ${m.color}55`,
                  color: m.color,
                }}>
                  {m.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.primary }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: colors.text.muted }}>{m.pref}</div>
                </div>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: colors.green.base,
                  animation: `pulse 2s ease infinite`,
                  animationDelay: `${i * 0.3}s`,
                }} />
              </div>
            ))}
          </div>

          {/* AI recommendation */}
          <div style={s.previewReco}>
            <div style={s.previewRecoTop}>
              <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold.base, letterSpacing: '0.08em' }}>
                🤖 AI RECOMMENDATION
              </span>
              <span style={{
                fontSize: 10,
                background: 'rgba(244,82,15,0.1)',
                color: colors.gold.base,
                border: '1px solid rgba(244,82,15,0.22)',
                borderRadius: 4,
                padding: '2px 7px',
                fontWeight: 700,
              }}>98 / 100</span>
            </div>
            <div style={s.previewRecoName}>Bombay Bistro</div>
            <div style={{ fontSize: 10, color: colors.text.muted }}>All preferences satisfied · ₹280/person · 25 min</div>
          </div>

          {/* Total */}
          <div style={s.previewTotal}>
            <span style={{ fontSize: 10, color: colors.text.muted, letterSpacing: '0.08em' }}>TOTAL</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: colors.text.primary, letterSpacing: '-0.03em' }}>₹1,120</span>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: colors.border.subtle, borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
            <div style={{
              height: '100%',
              width: '75%',
              background: `linear-gradient(90deg, ${colors.gold.base}, ${colors.gold.bright})`,
              borderRadius: 99,
              animation: 'progressFill 1.5s ease 1s both',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 9, color: colors.text.muted }}>3/4 members ordered</span>
            <span style={{ fontSize: 9, color: colors.gold.base, fontWeight: 600 }}>75%</span>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section style={s.statsBar}>
        <div style={s.statsInner}>
          {[
            { label: 'Lunches ordered', end: 12400, suffix: '+' },
            { label: 'Teams using us', end: 840, suffix: '+' },
            { label: 'Avg group size', end: 6, suffix: ' people' },
            { label: 'Avg savings', end: 18, suffix: '%' },
          ].map((stat, i) => (
            <div key={stat.label} style={s.statItem} className="animate-fade-up" style2={{ animationDelay: `${i * 0.1}s` }}>
              <div style={s.statNum}>
                <Counter end={stat.end} suffix={stat.suffix} duration={1600} />
              </div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={s.section}>
        <div style={s.sectionInner}>

          <div style={s.sectionHeader} className="animate-fade-up">
            <div style={s.sectionChip}>How it works</div>
            <h2 style={s.sectionTitle}>
              From chaos to cart in<br />
              <span className="text-gradient-gold">under 5 minutes</span>
            </h2>
            <p style={s.sectionSub}>
              No more 12-message WhatsApp threads deciding where to eat.
              GroupLunch handles everything.
            </p>
          </div>

          <div style={s.stepsGrid}>
            <StepCard
              number={1} icon="🚀" delay={0.05}
              title="Start a session"
              desc="One organizer creates a session and shares the link with the team. Takes 5 seconds."
            />
            <StepCard
              number={2} icon="📝" delay={0.12}
              title="Everyone submits preferences"
              desc="Veg, non-veg, Jain, spice level, price range — each person picks what they want."
            />
            <StepCard
              number={3} icon="🤖" delay={0.19}
              title="AI finds the best fit"
              desc="Our scoring algorithm matches group preferences to nearby restaurants and ranks them."
            />
            <StepCard
              number={4} icon="🍽️" delay={0.26}
              title="Everyone picks their items"
              desc="One shared menu, each person adds their own dishes to the group cart in real-time."
            />
            <StepCard
              number={5} icon="🎟️" delay={0.33}
              title="Auto-apply the best coupon"
              desc="We automatically find and apply the coupon that saves your group the most money."
            />
            <StepCard
              number={6} icon="📍" delay={0.40}
              title="Live order tracking"
              desc="Watch your food go from kitchen to door with real-time status updates for the whole group."
            />
          </div>
        </div>
      </section>

      {/* ── Features highlight ───────────────────────────────────────────── */}
      <section style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.sectionInner}>

          <div style={s.featureRow} className="animate-fade-up">
            {/* Left: big feature */}
            <div style={s.featureBig}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: radius.xl,
                background: 'rgba(244,82,15,0.08)',
                border: '1px solid rgba(244,82,15,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                marginBottom: 20,
              }}>
                🤖
              </div>
              <div style={s.sectionChip}>Core feature</div>
              <h3 style={{
                fontSize: font.size['3xl'],
                fontWeight: font.weight.extrabold,
                color: colors.text.primary,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                margin: '12px 0 16px',
              }}>
                AI that<br />
                <span className="text-gradient-gold">actually gets</span><br />
                your group
              </h3>
              <p style={{
                fontSize: font.size.base,
                color: colors.text.secondary,
                lineHeight: 1.7,
                marginBottom: 24,
              }}>
                Our scoring engine weighs dietary restrictions, price sensitivity,
                cuisine preferences, and delivery time to find the restaurant that
                keeps everyone happy — not just the loudest person in the room.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Dietary restrictions fully respected',
                  'Price-per-person constraints applied',
                  'Ranked list with explainable scores',
                  'Re-run anytime for fresh suggestions',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'rgba(22,163,74,0.1)',
                      border: '1px solid rgba(22,163,74,0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={colors.green.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: font.size.sm, color: colors.text.secondary }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: mini features */}
            <div style={s.featureSmallGrid}>
              {[
                { icon: '🔗', title: 'Shareable link', desc: 'One URL joins your whole team. No apps, no accounts needed.' },
                { icon: '⚡', title: 'Real-time cart', desc: "Watch teammates add items live. No refreshing, no guessing." },
                { icon: '🎟️', title: 'Smart coupons', desc: 'We scan available codes and apply the one that saves most.' },
                { icon: '🛵', title: 'Live tracking', desc: 'From kitchen to door — everyone sees the same updates.' },
              ].map((f, i) => (
                <div key={f.title} className="animate-fade-up card-glow" style={{
                  animationDelay: `${0.08 + i * 0.1}s`,
                  opacity: 0,
                  background: colors.bg.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radius.xl,
                  padding: '20px',
                  boxShadow: shadow.card,
                  transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
                  <h4 style={{ fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.text.primary, marginBottom: 6, letterSpacing: '-0.01em' }}>{f.title}</h4>
                  <p style={{ fontSize: font.size.sm, color: colors.text.secondary, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.sectionInner}>

          <div style={s.sectionHeader} className="animate-fade-up">
            <div style={s.sectionChip}>Loved by teams</div>
            <h2 style={s.sectionTitle}>
              No more <span className="text-gradient-gold">"where should we eat?"</span>
            </h2>
          </div>

          <div style={s.testimonialGrid}>
            <TestimonialCard
              delay={0.06}
              emoji="🧑‍💻"
              name="Kiran M."
              role="Engineering Lead, TechCorp"
              text="We have 8 engineers with completely different diets. GroupLunch finds somewhere that works for all of us in seconds. It's actually magic."
            />
            <TestimonialCard
              delay={0.14}
              emoji="👩‍🎨"
              name="Sneha R."
              role="Design Director, Studio22"
              text="The AI scoring is shockingly good. It picked a restaurant none of us would've thought of, and everyone loved it."
            />
            <TestimonialCard
              delay={0.22}
              emoji="🧑‍💼"
              name="Vikram T."
              role="Founder, StartupXYZ"
              text="The coupon feature alone pays for itself. We saved ₹400 on our first order. The tracking is clean and everyone knows exactly when food arrives."
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section style={s.ctaSection}>
        <div style={s.ctaSectionInner}>

          {/* Warm glow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(244,82,15,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div className="animate-fade-up" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 20, animation: 'float 4s ease infinite' }}>🍱</div>

            <h2 style={{
              fontSize: font.size['4xl'],
              fontWeight: font.weight.extrabold,
              color: colors.text.primary,
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
              marginBottom: 16,
            }}>
              Ready to fix lunch<br />
              <span className="text-gradient-gold">for your team?</span>
            </h2>

            <p style={{
              fontSize: font.size.md,
              color: colors.text.secondary,
              lineHeight: 1.65,
              marginBottom: 32,
              maxWidth: 400,
              margin: '0 auto 32px',
            }}>
              Start a session, invite your team, and let AI do the heavy lifting.
              Free to use, no accounts required.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '15px 32px',
                  borderRadius: radius.xl,
                  background: colors.gold.base,
                  color: colors.text.inverse,
                  border: 'none',
                  fontSize: font.size.md,
                  fontWeight: font.weight.bold,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 6px 32px rgba(240,165,0,0.4)',
                  transition: 'all 0.22s ease',
                }}
                className="btn-gold"
                onClick={() => navigate('/create')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Start Free Session
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 24px',
                borderRadius: radius.xl,
                background: 'transparent',
                color: colors.text.secondary,
                border: `1px solid ${colors.border.default}`,
                fontSize: font.size.sm,
                fontWeight: font.weight.medium,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M10 9l5 3-5 3V9z" fill="currentColor"/>
                </svg>
                Watch demo
              </div>
            </div>

            <p style={{
              fontSize: font.size.xs,
              color: colors.text.muted,
              marginTop: 20,
              letterSpacing: '0.04em',
            }}>
              No sign-up · Share a link · Works on mobile
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerLogo}>
            <span style={{ fontSize: 18 }}>🍱</span>
            <span style={{ fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.text.secondary }}>
              Group<span style={{ color: colors.gold.base }}>Lunch</span>
            </span>
          </div>
          <p style={s.footerText}>
            Order together. Pay together. Eat well.
          </p>
          <p style={{ ...s.footerText, marginTop: 6, fontSize: font.size.xs }}>
            Built with ❤️ for teams who deserve better lunch decisions.
          </p>
        </div>
      </footer>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight:   '100vh',
    background:  colors.bg.base,
    position:    'relative',
    overflowX:   'hidden',
  },

  // Background effects
  bgBlob1: {
    position:     'fixed',
    top:          '-20%',
    left:         '-15%',
    width:        700,
    height:       700,
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(244,82,15,0.07) 0%, transparent 65%)',
    pointerEvents:'none',
    animation:    'blobPulse 12s ease-in-out infinite',
  },
  bgBlob2: {
    position:     'fixed',
    bottom:       '-25%',
    right:        '-20%',
    width:        800,
    height:       800,
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 65%)',
    pointerEvents:'none',
    animation:    'blobPulse 16s ease-in-out infinite reverse',
  },
  bgBlob3: {
    position:     'fixed',
    top:          '40%',
    left:         '30%',
    width:        500,
    height:       500,
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(22,163,74,0.04) 0%, transparent 65%)',
    pointerEvents:'none',
    animation:    'blobPulse 20s ease-in-out infinite 4s',
  },
  bgGrid: {
    position:    'fixed',
    inset:       0,
    backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.035) 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
    opacity: 0.6,
  },

  // Nav — warm white glass bar
  nav: {
    position:   'sticky',
    top:        0,
    zIndex:     100,
    background: 'rgba(255,248,242,0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${colors.border.subtle}`,
    boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
  },
  navInner: {
    maxWidth:       1100,
    margin:         '0 auto',
    padding:        '14px 24px',
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  logo: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
  },
  logoIcon: { fontSize: 22 },
  logoText: {
    fontSize:      font.size.lg,
    fontWeight:    font.weight.extrabold,
    color:         colors.text.primary,
    letterSpacing: '-0.025em',
  },
  navRight: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
  },
  navCta: {
    padding:      '9px 20px',
    borderRadius: radius.lg,
    background:   colors.gold.base,
    color:        colors.text.inverse,
    border:       'none',
    fontSize:     font.size.sm,
    fontWeight:   font.weight.bold,
    cursor:       'pointer',
    letterSpacing:'-0.01em',
    boxShadow:    '0 3px 16px rgba(240,165,0,0.3)',
  },

  // Hero
  hero: {
    maxWidth:      1100,
    margin:        '0 auto',
    padding:       '80px 24px 60px',
    display:       'flex',
    alignItems:    'center',
    gap:           60,
    position:      'relative',
    zIndex:        1,
    minHeight:     '90vh',
  },
  heroContent: {
    flex:     '0 0 auto',
    maxWidth: 520,
  },
  heroBadge: {
    display:       'inline-flex',
    alignItems:    'center',
    gap:           7,
    padding:       '6px 14px',
    borderRadius:  radius.full,
    background:    'rgba(244,82,15,0.08)',
    border:        '1px solid rgba(244,82,15,0.18)',
    fontSize:      font.size.xs,
    fontWeight:    font.weight.semibold,
    color:         colors.gold.base,
    letterSpacing: '0.05em',
    marginBottom:  24,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize:      font.size['5xl'],
    fontWeight:    font.weight.extrabold,
    letterSpacing: '-0.04em',
    lineHeight:    1.05,
    marginBottom:  20,
  },
  heroSub: {
    fontSize:     font.size.md,
    color:        colors.text.secondary,
    lineHeight:   1.7,
    marginBottom: 32,
    maxWidth:     460,
  },
  heroCtas: {
    display:    'flex',
    gap:        12,
    flexWrap:   'wrap',
    marginBottom: 28,
  },
  ctaPrimary: {
    display:        'flex',
    alignItems:     'center',
    gap:            8,
    padding:        '14px 28px',
    borderRadius:   radius.xl,
    background:     colors.gold.base,
    color:          colors.text.inverse,
    border:         'none',
    fontSize:       font.size.md,
    fontWeight:     font.weight.bold,
    cursor:         'pointer',
    letterSpacing:  '-0.01em',
    boxShadow:      '0 5px 28px rgba(240,165,0,0.38)',
  },
  ctaSecondary: {
    display:        'flex',
    alignItems:     'center',
    gap:            6,
    padding:        '13px 22px',
    borderRadius:   radius.xl,
    background:     'transparent',
    color:          colors.text.secondary,
    border:         `1px solid ${colors.border.default}`,
    fontSize:       font.size.base,
    fontWeight:     font.weight.medium,
    cursor:         'pointer',
    transition:     transition.base,
  },
  heroPills: {
    display:  'flex',
    gap:      8,
    flexWrap: 'wrap',
  },

  // Hero card preview
  heroCard: {
    flex:         '0 0 auto',
    width:        310,
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius['3xl'],
    padding:      '20px',
    boxShadow:    `${shadow.xl}, 0 0 40px rgba(244,82,15,0.08)`,
    position:     'relative',
    overflow:     'hidden',
    marginLeft:   'auto',
  },
  previewHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   16,
  },
  previewTitle: {
    fontSize:   12,
    fontWeight: 700,
    color:      colors.text.primary,
    letterSpacing: '-0.01em',
  },
  previewMembers: {
    display:       'flex',
    flexDirection: 'column',
    gap:           8,
    marginBottom:  16,
    background:    colors.bg.raised,
    borderRadius:  radius.lg,
    padding:       '10px 12px',
  },
  previewMember: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
  },
  previewAvatar: {
    width:          28,
    height:         28,
    borderRadius:   radius.full,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       11,
    fontWeight:     700,
    flexShrink:     0,
  },
  previewReco: {
    background:   'rgba(244,82,15,0.06)',
    border:       '1px solid rgba(244,82,15,0.14)',
    borderRadius: radius.lg,
    padding:      '12px 14px',
    marginBottom: 12,
  },
  previewRecoTop: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   6,
  },
  previewRecoName: {
    fontSize:      15,
    fontWeight:    800,
    color:         colors.text.primary,
    letterSpacing: '-0.02em',
    marginBottom:  4,
  },
  previewTotal: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
  },

  // Stats
  statsBar: {
    borderTop:    `1px solid ${colors.border.subtle}`,
    borderBottom: `1px solid ${colors.border.subtle}`,
    background:   colors.bg.surface,
    position:     'relative',
    zIndex:       1,
  },
  statsInner: {
    maxWidth:       1100,
    margin:         '0 auto',
    padding:        '32px 24px',
    display:        'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap:            24,
  },
  statItem: {
    textAlign:  'center',
    opacity:    0,
    animation:  'fadeUp 0.5s ease forwards',
  },
  statNum: {
    fontSize:      font.size['3xl'],
    fontWeight:    font.weight.extrabold,
    color:         colors.text.primary,
    letterSpacing: '-0.03em',
    lineHeight:    1,
    marginBottom:  6,
  },
  statLabel: {
    fontSize:   font.size.sm,
    color:      colors.text.muted,
    letterSpacing: '0.02em',
  },

  // Sections
  section: {
    padding:  '80px 0',
    position: 'relative',
    zIndex:   1,
  },
  sectionInner: {
    maxWidth: 1100,
    margin:   '0 auto',
    padding:  '0 24px',
  },
  sectionHeader: {
    textAlign:    'center',
    marginBottom: 48,
    maxWidth:     580,
    margin:       '0 auto 48px',
  },
  sectionChip: {
    display:       'inline-block',
    padding:       '4px 14px',
    borderRadius:  radius.full,
    background:    'rgba(244,82,15,0.08)',
    border:        '1px solid rgba(244,82,15,0.18)',
    fontSize:      font.size.xs,
    fontWeight:    font.weight.bold,
    color:         colors.gold.base,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    marginBottom:  16,
  },
  sectionTitle: {
    fontSize:      font.size['3xl'],
    fontWeight:    font.weight.extrabold,
    color:         colors.text.primary,
    letterSpacing: '-0.03em',
    lineHeight:    1.2,
    marginBottom:  14,
  },
  sectionSub: {
    fontSize:   font.size.base,
    color:      colors.text.secondary,
    lineHeight: 1.7,
  },
  stepsGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap:                 16,
  },

  // Feature row
  featureRow: {
    display:    'flex',
    gap:        40,
    alignItems: 'flex-start',
  },
  featureBig: {
    flex:     '0 0 400px',
    maxWidth: 400,
  },
  featureSmallGrid: {
    flex:                '1',
    display:             'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap:                 12,
    alignContent:        'start',
  },

  // Testimonials
  testimonialGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap:                 16,
  },

  // Final CTA section
  ctaSection: {
    padding:  '80px 0',
    position: 'relative',
    zIndex:   1,
    borderTop: `1px solid ${colors.border.subtle}`,
  },
  ctaSectionInner: {
    maxWidth:  900,
    margin:    '0 auto',
    padding:   '60px 24px',
    background: colors.bg.surface,
    border:    `1px solid ${colors.border.default}`,
    borderRadius: radius['3xl'],
    position:  'relative',
    overflow:  'hidden',
    textAlign: 'center',
    boxShadow: shadow.xl,
    marginLeft: 24,
    marginRight: 24,
  },

  // Footer
  footer: {
    borderTop:  `1px solid ${colors.border.subtle}`,
    background: colors.bg.canvas,
    padding:    '32px 24px',
    position:   'relative',
    zIndex:     1,
  },
  footerInner: {
    maxWidth:  1100,
    margin:    '0 auto',
    textAlign: 'center',
  },
  footerLogo: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    marginBottom:   10,
  },
  footerText: {
    fontSize: font.size.sm,
    color:    colors.text.muted,
    margin:   0,
  },
};

// ── Responsive overrides ──────────────────────────────────────────────────────
const responsiveStyle = document.createElement('style');
responsiveStyle.textContent = `
  @media (max-width: 900px) {
    #how-it-works { padding: 60px 0; }
  }

  @media (max-width: 768px) {
    /* Hero stacks vertically */
    section[style*="min-height: 90vh"] {
      flex-direction: column;
      padding-top: 48px;
      min-height: auto;
      text-align: center;
    }

    /* Stats grid 2-col on mobile */
    div[style*="grid-template-columns: repeat(4, 1fr)"] {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    /* Steps grid 1-col on mobile */
    div[style*="grid-template-columns: repeat(3, 1fr)"] {
      grid-template-columns: 1fr !important;
    }

    /* Testimonial 1-col on mobile */
    div[style*="repeat(3, 1fr)"] {
      grid-template-columns: 1fr !important;
    }
  }
`;
if (!document.head.querySelector('[data-home-responsive]')) {
  responsiveStyle.setAttribute('data-home-responsive', '');
  document.head.appendChild(responsiveStyle);
}
