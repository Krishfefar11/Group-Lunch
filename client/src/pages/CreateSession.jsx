import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../api/api';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

export default function CreateSession() {
  const navigate               = useNavigate();
  const [name, setName]        = useState('');
  const [city, setCity]        = useState('');
  const [upiId, setUpiId]      = useState('');
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');
  const [created, setCreated]  = useState(null);
  const [copied, setCopied]    = useState(false);
  const shareSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter your name');
    if (!city.trim()) return setError('Please enter your city for restaurant search');
    setError('');
    setLoading(true);
    try {
      const res = await createSession({
        organizerName: name.trim(),
        deliveryCity:  city.trim(),
        upiId:         upiId.trim() || null,
      });
      const { sessionId, sessionUrl, organizerId } = res.data.data;
      localStorage.setItem(`member_${sessionId}`, JSON.stringify({
        memberId: organizerId, memberName: name.trim(), isOrganizer: true,
      }));
      setCreated({ sessionId, sessionUrl });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(created.sessionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShare = async () => {
    if (created && shareSupported) {
      try {
        await navigator.share({
          title: 'Join my group lunch!',
          text: "I'm organizing a group lunch — pick your preferences and let AI choose the best restaurant for us!",
          url: created.sessionUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  return (
    <div style={s.page}>
      {/* Ambient glow blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />

      <div style={s.shell}>

        {/* Logo row */}
        <div style={s.logoRow}>
          <button style={s.backBtn} onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span style={s.logoText}>Group<span style={{ color: colors.gold.base }}>Lunch</span></span>
        </div>

        {!created ? (
          /* ── Create form ──────────────────────────────────────────────── */
          <div style={s.card} className="animate-scale-in">
            <div style={s.cardHeader}>
              <div style={s.iconWrap}>🍱</div>
              <h1 style={s.title}>Start a Lunch Session</h1>
              <p style={s.subtitle}>
                Create a session, invite your team, and let AI find the perfect restaurant for everyone.
              </p>
            </div>

            <form onSubmit={handleCreate}>
              <label style={s.label}>Your name</label>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <input
                  style={{ ...s.input, ...(error && !name.trim() ? s.inputError : {}) }}
                  type="text"
                  placeholder="e.g. Drashti"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.border.focus;
                    e.target.style.boxShadow   = '0 0 0 3px rgba(240,165,0,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.border.default;
                    e.target.style.boxShadow   = 'none';
                  }}
                  autoFocus
                />
              </div>

              <label style={s.label}>📍 Your city</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input
                  style={{ ...s.input, ...(error && !city.trim() ? s.inputError : {}) }}
                  type="text"
                  placeholder="e.g. Bangalore, Mumbai, Delhi"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setError(''); }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.border.focus;
                    e.target.style.boxShadow   = '0 0 0 3px rgba(240,165,0,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.border.default;
                    e.target.style.boxShadow   = 'none';
                  }}
                />
                <p style={{ fontSize: '11px', color: colors.text.muted, margin: '5px 0 0', lineHeight: 1.4 }}>
                  Used to find real restaurants near you
                </p>
              </div>

              <label style={{ ...s.label, marginTop: 16 }}>💸 Your UPI ID <span style={{ color: colors.text.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — for split bill)</span></label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input
                  style={s.input}
                  type="text"
                  placeholder="e.g. krish@paytm or 9876543210@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.border.focus;
                    e.target.style.boxShadow   = '0 0 0 3px rgba(240,165,0,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.border.default;
                    e.target.style.boxShadow   = 'none';
                  }}
                />
                <p style={{ fontSize: '11px', color: colors.text.muted, margin: '5px 0 0', lineHeight: 1.4 }}>
                  Team members will get a UPI pay link to send you their share
                </p>
              </div>

              {error && (
                <p style={s.errorMsg}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill={colors.red.text} style={{ flexShrink: 0 }}>
                    <circle cx="6" cy="6" r="5.5" stroke={colors.red.text} strokeWidth="1" fill="none"/>
                    <path d="M6 3.5v3M6 8.5v.5" stroke={colors.red.text} strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  {error}
                </p>
              )}

              <button
                style={{ ...s.primaryBtn, opacity: loading ? 0.7 : 1, marginTop: 8 }}
                type="submit"
                disabled={loading}
                onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(240,165,0,0.4)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(240,165,0,0.28)'; }}
              >
                {loading ? (
                  <><span style={s.spinner} className="gl-spinner" /> Creating session...</>
                ) : (
                  <> Start Session <span style={{ opacity: 0.7 }}>→</span></>
                )}
              </button>
            </form>

            <div style={s.dividerRow}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>Already have a link?</span>
              <div style={s.dividerLine} />
            </div>

            <button
              style={s.secondaryBtn}
              onClick={() => navigate('/')}
            >
              Join an existing session
            </button>
          </div>
        ) : (
          /* ── Success state ────────────────────────────────────────────── */
          <div style={s.card} className="animate-scale-in">
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ ...s.iconWrap, background: colors.green.dim, border: `1px solid rgba(16,185,129,0.2)` }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke={colors.green.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={s.title}>Session created!</h2>
              <p style={s.subtitle}>Share this link with your team — anyone who opens it can join.</p>
            </div>

            {/* Link box */}
            <div style={s.linkBox}>
              <span style={s.linkText}>{created.sessionUrl}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                style={{ ...s.primaryBtn, flex: 1 }}
                onClick={handleCopy}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(240,165,0,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(240,165,0,0.28)'; }}
              >
                {copied ? (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Copied!</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/></svg> Copy Link</>
                )}
              </button>
              {shareSupported && (
                <button
                  style={{ ...s.primaryBtn, flex: 'none', padding: '14px 18px', background: 'rgba(240,165,0,0.12)', color: colors.gold.bright, border: `1px solid rgba(240,165,0,0.25)`, boxShadow: 'none' }}
                  onClick={handleShare}
                  title="Share via system share sheet"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(240,165,0,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(240,165,0,0.12)'; e.currentTarget.style.transform = ''; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>

            <button
              style={s.outlineBtn}
              onClick={() => window.location.href = `/session/${created.sessionId}`}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.strong; e.currentTarget.style.color = colors.text.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.default; e.currentTarget.style.color = colors.text.secondary; }}
            >
              Open Session →
            </button>

            <p style={s.hint}>
              💡 Drop this link in your team chat
            </p>
          </div>
        )}

        <p style={s.footerNote}>
          Group Lunch · Order together, pay together
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight:      '100vh',
    background:     colors.bg.base,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '24px 16px',
    position:       'relative',
    overflow:       'hidden',
  },
  blob1: {
    position:     'absolute',
    top:          '-15%',
    left:         '-10%',
    width:        520,
    height:       520,
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(244,82,15,0.07) 0%, transparent 70%)',
    pointerEvents:'none',
  },
  blob2: {
    position:     'absolute',
    bottom:       '-20%',
    right:        '-12%',
    width:        600,
    height:       600,
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 70%)',
    pointerEvents:'none',
  },
  shell: {
    width:     '100%',
    maxWidth:  440,
    position:  'relative',
    zIndex:    1,
  },
  logoRow: {
    display:        'flex',
    alignItems:     'center',
    gap:            12,
    marginBottom:   32,
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
  logoText: {
    fontSize:   font.size.lg,
    fontWeight: font.weight.bold,
    color:      colors.text.primary,
    letterSpacing: '-0.02em',
  },
  card: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius['2xl'],
    padding:      '36px 32px',
    boxShadow:    `${shadow.lg}, inset 0 1px 0 rgba(255,255,255,0.06)`,
    marginBottom: 20,
  },
  cardHeader: {
    textAlign:    'center',
    marginBottom: 28,
  },
  iconWrap: {
    width:         60,
    height:        60,
    borderRadius:  radius.xl,
    background:    colors.gold.dim,
    border:        `1px solid ${colors.gold.muted}`,
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    fontSize:      28,
    margin:        '0 auto 16px',
  },
  title: {
    fontSize:      font.size['2xl'],
    fontWeight:    font.weight.bold,
    color:         colors.text.primary,
    letterSpacing: '-0.025em',
    lineHeight:    1.2,
    marginBottom:  8,
  },
  subtitle: {
    fontSize:   font.size.base,
    color:      colors.text.secondary,
    lineHeight: 1.6,
    maxWidth:   320,
    margin:     '0 auto',
  },
  label: {
    display:       'block',
    fontSize:      font.size.xs,
    fontWeight:    font.weight.semibold,
    color:         colors.text.secondary,
    marginBottom:  7,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
  },
  input: {
    width:        '100%',
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color:        colors.text.primary,
    fontFamily:   font.family,
    fontSize:     font.size.md,
    padding:      '13px 16px',
    outline:      'none',
    boxSizing:    'border-box',
    transition:   transition.base,
  },
  inputError: {
    borderColor: 'rgba(239,68,68,0.45)',
  },
  errorMsg: {
    display:    'flex',
    alignItems: 'center',
    gap:        6,
    fontSize:   font.size.sm,
    color:      colors.red.text,
    marginBottom: 2,
  },
  primaryBtn: {
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
    marginBottom:   0,
  },
  spinner: {
    display:      'inline-block',
    width:        15,
    height:       15,
    borderRadius: '50%',
    flexShrink:   0,
  },
  dividerRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
    margin:     '20px 0',
  },
  dividerLine: {
    flex:       1,
    height:     1,
    background: colors.border.subtle,
  },
  dividerText: {
    fontSize:   font.size.sm,
    color:      colors.text.muted,
    whiteSpace: 'nowrap',
  },
  secondaryBtn: {
    width:        '100%',
    background:   'transparent',
    color:        colors.text.secondary,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.lg,
    fontFamily:   font.family,
    fontSize:     font.size.base,
    fontWeight:   font.weight.medium,
    cursor:       'pointer',
    padding:      '12px',
    transition:   transition.base,
  },
  linkBox: {
    background:    colors.bg.raised,
    border:        `1px solid ${colors.border.default}`,
    borderRadius:  radius.md,
    padding:       '12px 16px',
    marginBottom:  16,
    wordBreak:     'break-all',
  },
  linkText: {
    fontSize:   font.size.sm,
    color:      colors.text.muted,
    fontFamily: 'monospace',
    lineHeight: 1.5,
  },
  outlineBtn: {
    width:        '100%',
    background:   'transparent',
    color:        colors.text.secondary,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.lg,
    fontFamily:   font.family,
    fontSize:     font.size.base,
    fontWeight:   font.weight.medium,
    cursor:       'pointer',
    padding:      '12px',
    transition:   transition.base,
    marginBottom: 16,
    display:      'block',
  },
  hint: {
    textAlign:  'center',
    fontSize:   font.size.sm,
    color:      colors.text.muted,
  },
  footerNote: {
    textAlign:  'center',
    fontSize:   font.size.xs,
    color:      colors.text.muted,
    letterSpacing: '0.04em',
  },
};
