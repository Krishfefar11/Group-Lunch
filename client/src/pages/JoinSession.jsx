import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession } from '../api/api';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

const EMAILJS_SERVICE_ID  = 'service_otc1lzt';
const EMAILJS_TEMPLATE_ID = 'template_501arc9';
const EMAILJS_PUBLIC_KEY  = 'XNgoNgC1nTycBtxuz';

// ── Avatar component ──────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#f0a500','#6366f1','#10b981','#ef4444','#8b5cf6','#06b6d4'];

function Avatar({ name, size = 36, index = 0, isYou, isOrganizer }) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width:          size,
        height:         size,
        borderRadius:   radius.full,
        background:     `${bg}22`,
        border:         `2px solid ${bg}55`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       size * 0.38,
        fontWeight:     font.weight.bold,
        color:          bg,
        letterSpacing:  '-0.02em',
        boxShadow:      isYou ? `0 0 0 2px ${colors.gold.base}` : 'none',
        transition:     transition.base,
      }}>
        {name.charAt(0).toUpperCase()}
      </div>
      {isOrganizer && (
        <span style={{
          position: 'absolute', bottom: -2, right: -2,
          fontSize: 10, lineHeight: 1,
        }}>👑</span>
      )}
    </div>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  collecting:       { label: 'Collecting preferences', variant: 'amber',   dot: true },
  restaurant_picked:{ label: 'Restaurant selected',    variant: 'blue',    dot: true },
  ordering:         { label: 'Ordering in progress',   variant: 'gold',    dot: true },
  order_placed:     { label: 'Order placed',           variant: 'green',   dot: false },
  preparing:        { label: 'Preparing food 🍳',      variant: 'amber',   dot: true },
  out_for_delivery: { label: 'Out for delivery 🛵',    variant: 'gold',    dot: true },
  delivered:        { label: 'Delivered! 🎉',          variant: 'green',   dot: false },
};

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, variant: 'neutral', dot: false };
  const variantColors = {
    gold:    { bg: colors.gold.muted,   color: colors.gold.bright,  border: 'rgba(240,165,0,0.25)' },
    green:   { bg: colors.green.dim,    color: colors.green.text,   border: 'rgba(16,185,129,0.2)' },
    amber:   { bg: colors.amber.dim,    color: colors.amber.text,   border: 'rgba(245,158,11,0.2)' },
    blue:    { bg: colors.blue.dim,     color: colors.blue.text,    border: 'rgba(99,102,241,0.2)' },
    neutral: { bg: 'rgba(255,255,255,0.06)', color: colors.text.secondary, border: colors.border.default },
  };
  const vc = variantColors[cfg.variant] || variantColors.neutral;
  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           5,
      padding:       '4px 11px',
      borderRadius:  radius.full,
      fontSize:      font.size.xs,
      fontWeight:    font.weight.semibold,
      letterSpacing: '0.04em',
      background:    vc.bg,
      color:         vc.color,
      border:        `1px solid ${vc.border}`,
    }}>
      {cfg.dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: vc.color, animation: 'pulse 2s ease infinite',
        }} />
      )}
      {cfg.label}
    </span>
  );
}

export default function JoinSession() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [session,       setSession]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [me,            setMe]            = useState(null);
  const [joinName,      setJoinName]      = useState('');
  const [joining,       setJoining]       = useState(false);
  const [joinError,     setJoinError]     = useState('');
  const [copied,        setCopied]        = useState(false);
  const [showInvite,    setShowInvite]    = useState(false);
  const [inviteName,    setInviteName]    = useState('');
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteStatus,  setInviteStatus]  = useState('');
  const [inviteError,   setInviteError]   = useState('');
  const [sentList,      setSentList]      = useState([]);

  const sessionUrl = `${window.location.origin}/session/${sessionId}`;

  const fetchSession = useCallback(async () => {
    try {
      const res = await getSession(sessionId);
      setSession(res.data.data);
    } catch {
      setError('Session not found. Check the link and try again.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const stored = localStorage.getItem(`member_${sessionId}`);
    if (stored) setMe(JSON.parse(stored));
    fetchSession();
  }, [sessionId, fetchSession]);

  useEffect(() => {
    const interval = setInterval(fetchSession, 4000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinName.trim()) return setJoinError('Please enter your name');
    setJoining(true);
    setJoinError('');
    try {
      const res = await axios.post(`/api/sessions/${sessionId}/join`, { memberName: joinName.trim() });
      const { memberId, memberName } = res.data.data;
      const identity = { memberId, memberName, isOrganizer: false };
      localStorage.setItem(`member_${sessionId}`, JSON.stringify(identity));
      setMe(identity);
      fetchSession();
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Could not join session');
    } finally {
      setJoining(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) { setInviteError('Both fields are required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { setInviteError('Enter a valid email address.'); return; }
    setInviteSending(true);
    setInviteError('');
    setInviteStatus('');
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_name: inviteName.trim(), to_email: inviteEmail.trim(),
        from_name: me?.memberName || session?.organizerName || 'Someone',
        name: me?.memberName || session?.organizerName || 'Someone',
        email: '', session_link: sessionUrl,
      }, EMAILJS_PUBLIC_KEY);
      setSentList((prev) => [...prev, { name: inviteName.trim(), email: inviteEmail.trim() }]);
      setInviteStatus('sent');
      setInviteName('');
      setInviteEmail('');
    } catch {
      setInviteError('Failed to send email. Copy the link manually instead.');
      setInviteStatus('error');
    } finally {
      setInviteSending(false);
    }
  };

  const closeInvite = () => {
    setShowInvite(false); setInviteName(''); setInviteEmail('');
    setInviteStatus(''); setInviteError('');
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>🍱</div>
        <p style={{ color: colors.text.secondary, fontSize: font.size.md }}>Loading session...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{ color: colors.red.text, marginBottom: 20, fontSize: font.size.md }}>{error}</p>
        <button style={s.outlineBtn} onClick={() => navigate('/')}>← Back to Home</button>
      </div>
    </div>
  );

  const members        = session.members || [];
  const submittedCount = members.filter((m) => m.hasSubmittedPreference).length;
  const totalCount     = members.length;
  const isOrganizer    = me?.isOrganizer;
  const hasJoined      = !!me;
  const myPref         = members.find((m) => m.memberId === me?.memberId);
  const iHaveSubmitted = myPref?.hasSubmittedPreference;
  const isActive       = ['order_placed','preparing','out_for_delivery','delivered'].includes(session.status);
  const isOrdering     = session.status === 'ordering';

  return (
    <div style={s.page}>
      <div style={s.blob1} />
      <div style={s.blob2} />

      <div style={s.wrapper}>

        {/* ── Session header ───────────────────────────────────────────── */}
        <div style={s.sessionCard} className="animate-fade-up">

          {/* Top row */}
          <div style={s.headerRow}>
            <div>
              <div style={s.wordmark}>
                Group<span style={{ color: colors.gold.base }}>Lunch</span>
              </div>
              <StatusBadge status={session.status} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.iconBtn} onClick={handleCopy} title="Copy link">
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={colors.green.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke={colors.text.secondary} strokeWidth="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={colors.text.secondary} strokeWidth="1.8"/></svg>
                )}
              </button>
              {hasJoined && (
                <button style={{ ...s.iconBtn, background: 'rgba(240,165,0,0.1)', borderColor: 'rgba(240,165,0,0.2)' }} onClick={() => setShowInvite(true)} title="Invite">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={colors.gold.base} strokeWidth="1.8"/><polyline points="22,6 12,13 2,6" stroke={colors.gold.base} strokeWidth="1.8"/></svg>
                </button>
              )}
            </div>
          </div>

          <p style={s.orgNote}>Started by <strong style={{ color: colors.text.primary }}>{session.organizerName}</strong></p>

          {/* Member avatars + progress */}
          {totalCount > 0 && (
            <div style={s.membersSection}>
              <div style={s.membersMeta}>
                <div style={{ display: 'flex' }}>
                  {members.slice(0, 6).map((m, i) => (
                    <div key={m.memberId} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: members.length - i }}>
                      <Avatar
                        name={m.memberName}
                        size={34}
                        index={i}
                        isYou={m.memberId === me?.memberId}
                        isOrganizer={m.memberId === session.organizerId}
                      />
                    </div>
                  ))}
                  {totalCount > 6 && (
                    <div style={{
                      ...s.moreAvatars,
                      marginLeft: -10,
                    }}>+{totalCount - 6}</div>
                  )}
                </div>
                <div style={{ marginLeft: 12 }}>
                  <p style={s.memberCountText}>{totalCount} member{totalCount !== 1 ? 's' : ''}</p>
                  <p style={s.memberSubText}>{submittedCount}/{totalCount} preferences submitted</p>
                </div>
              </div>

              {/* Progress bar */}
              <div style={s.progressTrack}>
                <div style={{
                  ...s.progressFill,
                  width: totalCount > 0 ? `${(submittedCount / totalCount) * 100}%` : '0%',
                }} />
              </div>
            </div>
          )}

          {/* Member list (collapsed details) */}
          <div style={s.memberList}>
            {members.map((m, i) => (
              <div key={m.memberId} style={s.memberRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={m.memberName} size={28} index={i}
                    isYou={m.memberId === me?.memberId}
                    isOrganizer={m.memberId === session.organizerId} />
                  <span style={s.memberName}>
                    {m.memberName}
                    {m.memberId === me?.memberId && (
                      <span style={{ color: colors.gold.base, fontWeight: font.weight.semibold }}> · you</span>
                    )}
                  </span>
                </div>
                <span style={{
                  fontSize:   font.size.xs,
                  fontWeight: font.weight.semibold,
                  color:      m.hasSubmittedPreference ? colors.green.text : colors.text.muted,
                  letterSpacing: '0.04em',
                }}>
                  {m.hasSubmittedPreference ? '✓ Ready' : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          {/* Sent invites pills */}
          {sentList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {sentList.map((inv, i) => (
                <span key={i} style={s.sentPill}>✉ {inv.name}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── Join form (not yet joined) ────────────────────────────────── */}
        {!hasJoined && (
          <div style={s.card} className="animate-fade-up" style2={{ animationDelay: '0.1s' }}>
            <h3 style={s.sectionTitle}>Join this session</h3>
            <form onSubmit={handleJoin}>
              <input
                style={s.input}
                type="text"
                placeholder="Your name"
                value={joinName}
                onChange={(e) => { setJoinName(e.target.value); setJoinError(''); }}
                onFocus={(e) => { e.target.style.borderColor = colors.border.focus; e.target.style.boxShadow = '0 0 0 3px rgba(240,165,0,0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border.default; e.target.style.boxShadow = 'none'; }}
                autoFocus
              />
              {joinError && <p style={s.errorMsg}>{joinError}</p>}
              <button
                style={{ ...s.primaryBtn, opacity: joining ? 0.7 : 1, marginTop: 4 }}
                type="submit"
                disabled={joining}
                onMouseEnter={(e) => { if (!joining) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
                {joining ? <><span style={s.spinner} /> Joining...</> : 'Join Session →'}
              </button>
            </form>
          </div>
        )}

        {/* ── Action area (already joined) ─────────────────────────────── */}
        {hasJoined && (
          <div style={s.actionsCard} className="animate-fade-up">
            {isActive ? (
              <button
                style={s.primaryBtn}
                onClick={() => navigate(`/session/${sessionId}/tracking`)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
                {session.status === 'delivered' ? '🎉 View Delivered Order' : '📍 Track Order Live'}
              </button>
            ) : isOrdering ? (
              <>
                <button
                  style={s.primaryBtn}
                  onClick={() => navigate(`/session/${sessionId}/menu`)}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
                >
                  🍽️ Pick My Items
                </button>
                <button
                  style={s.secondaryActionBtn}
                  onClick={() => navigate(`/session/${sessionId}/cart`)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.strong; e.currentTarget.style.color = colors.text.primary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.default; e.currentTarget.style.color = colors.text.secondary; }}
                >
                  🛒 View Group Cart
                </button>
              </>
            ) : (
              <>
                {!iHaveSubmitted ? (
                  <button
                    style={s.primaryBtn}
                    onClick={() => navigate(`/session/${sessionId}/preferences`)}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
                  >
                    📝 Submit My Preferences
                  </button>
                ) : (
                  <div style={s.doneBox}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={colors.green.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>Preferences submitted</span>
                  </div>
                )}

                {isOrganizer && submittedCount >= 2 && (
                  <button
                    style={s.goldOutlineBtn}
                    onClick={() => navigate(`/session/${sessionId}/pick-restaurant`)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.gold.dim; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    🤖 Find Restaurant
                    <span style={s.readyChip}>{submittedCount}/{totalCount} ready</span>
                  </button>
                )}
                {isOrganizer && submittedCount < 2 && (
                  <p style={s.waitNote}>Waiting for at least 2 members to submit before recommending...</p>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Invite modal ─────────────────────────────────────────────────── */}
      {showInvite && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && closeInvite()}>
          <div style={s.modal} className="animate-scale-in">
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Invite to Lunch</h3>
              <button style={s.closeBtn} onClick={closeInvite}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>
            <p style={{ fontSize: font.size.sm, color: colors.text.muted, marginBottom: 20 }}>
              Send the session link directly to their inbox.
            </p>

            {inviteStatus === 'sent' && (
              <div style={s.successBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={colors.green.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: font.size.sm, color: colors.green.text, fontWeight: font.weight.semibold }}>Invite sent!</span>
              </div>
            )}

            <form onSubmit={handleSendInvite}>
              <label style={s.fieldLabel}>Their name</label>
              <input style={s.modalInput} type="text" placeholder="Priya"
                value={inviteName}
                onChange={(e) => { setInviteName(e.target.value); setInviteStatus(''); }}
                onFocus={(e) => { e.target.style.borderColor = colors.border.focus; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border.default; }}
              />
              <label style={s.fieldLabel}>Their email</label>
              <input style={s.modalInput} type="email" placeholder="priya@company.com"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteStatus(''); }}
                onFocus={(e) => { e.target.style.borderColor = colors.border.focus; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border.default; }}
              />
              {inviteError && <p style={s.errorMsg}>{inviteError}</p>}
              <button
                style={{ ...s.primaryBtn, marginTop: 8, opacity: inviteSending ? 0.7 : 1 }}
                type="submit"
                disabled={inviteSending}
                onMouseEnter={(e) => { if (!inviteSending) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
                {inviteSending ? <><span style={s.spinner} /> Sending...</> : 'Send Invite'}
              </button>
            </form>

            {sentList.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${colors.border.subtle}` }}>
                <p style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sent this session</p>
                {sentList.map((inv, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: font.size.sm, color: colors.text.primary }}>{inv.name}</span>
                    <span style={{ fontSize: font.size.sm, color: colors.text.muted }}>{inv.email}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: font.size.xs, color: colors.text.muted }}>Or copy the link</span>
              <button
                style={s.copySmallBtn}
                onClick={handleCopy}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.strong; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.default; }}
              >
                {copied ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    padding:    '32px 16px 60px',
    position:   'relative',
    overflow:   'hidden',
  },
  center: {
    minHeight:  '100vh',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob1: {
    position: 'absolute', top: '-10%', left: '-15%',
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(240,165,0,0.05) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute', bottom: '-15%', right: '-10%',
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  wrapper: {
    width:    '100%',
    maxWidth: 480,
    position: 'relative',
    zIndex:   1,
    display:  'flex',
    flexDirection: 'column',
    gap: 12,
  },
  // Session card
  sessionCard: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius['2xl'],
    padding:      '24px',
    boxShadow:    `${shadow.card}, inset 0 1px 0 rgba(255,255,255,0.06)`,
  },
  headerRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   12,
    gap:            12,
  },
  wordmark: {
    fontSize:      font.size.xl,
    fontWeight:    font.weight.bold,
    color:         colors.text.primary,
    letterSpacing: '-0.02em',
    marginBottom:  6,
  },
  iconBtn: {
    width:        34,
    height:       34,
    borderRadius: radius.md,
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.default}`,
    cursor:       'pointer',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    transition:   transition.fast,
    flexShrink:   0,
  },
  orgNote: {
    fontSize:     font.size.sm,
    color:        colors.text.muted,
    marginBottom: 16,
  },
  // Members section
  membersSection: {
    marginBottom: 16,
  },
  membersMeta: {
    display:    'flex',
    alignItems: 'center',
    marginBottom: 10,
  },
  moreAvatars: {
    width:          34,
    height:         34,
    borderRadius:   radius.full,
    background:     colors.bg.overlay,
    border:         `2px solid ${colors.border.default}`,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       font.size.xs,
    fontWeight:     font.weight.bold,
    color:          colors.text.muted,
  },
  memberCountText: {
    fontSize:   font.size.sm,
    fontWeight: font.weight.semibold,
    color:      colors.text.primary,
    margin:     '0 0 2px',
  },
  memberSubText: {
    fontSize: font.size.xs,
    color:    colors.text.muted,
    margin:   0,
  },
  progressTrack: {
    height:       3,
    background:   colors.border.subtle,
    borderRadius: radius.full,
    overflow:     'hidden',
  },
  progressFill: {
    height:       3,
    background:   `linear-gradient(90deg, ${colors.gold.soft}, ${colors.gold.bright})`,
    borderRadius: radius.full,
    transition:   'width 0.6s ease',
  },
  memberList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           4,
    marginTop:     12,
  },
  memberRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '7px 10px',
    borderRadius:   radius.md,
    background:     colors.bg.raised,
  },
  memberName: {
    fontSize:   font.size.sm,
    color:      colors.text.secondary,
    fontWeight: font.weight.medium,
  },
  sentPill: {
    fontSize:     font.size.xs,
    color:        colors.text.gold,
    background:   colors.gold.dim,
    border:       `1px solid rgba(240,165,0,0.2)`,
    borderRadius: radius.full,
    padding:      '3px 10px',
    fontWeight:   font.weight.medium,
  },
  // Cards
  card: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius['2xl'],
    padding:      '24px',
    boxShadow:    shadow.card,
  },
  actionsCard: {
    display:       'flex',
    flexDirection: 'column',
    gap:           8,
  },
  sectionTitle: {
    fontSize:     font.size.md,
    fontWeight:   font.weight.semibold,
    color:        colors.text.primary,
    marginBottom: 14,
    letterSpacing: '-0.01em',
  },
  input: {
    width:        '100%',
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color:        colors.text.primary,
    fontFamily:   font.family,
    fontSize:     font.size.md,
    padding:      '12px 16px',
    outline:      'none',
    boxSizing:    'border-box',
    transition:   transition.base,
    marginBottom: 10,
  },
  errorMsg: {
    fontSize:    font.size.xs,
    color:       colors.red.text,
    marginBottom: 8,
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
    boxShadow:      '0 4px 20px rgba(240,165,0,0.25)',
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
  secondaryActionBtn: {
    width:        '100%',
    background:   'transparent',
    color:        colors.text.secondary,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.lg,
    fontFamily:   font.family,
    fontSize:     font.size.base,
    fontWeight:   font.weight.medium,
    cursor:       'pointer',
    padding:      '13px',
    transition:   transition.base,
  },
  goldOutlineBtn: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
    width:          '100%',
    background:     'transparent',
    color:          colors.text.gold,
    border:         `1px solid ${colors.gold.muted}`,
    borderRadius:   radius.lg,
    fontFamily:     font.family,
    fontSize:       font.size.base,
    fontWeight:     font.weight.semibold,
    cursor:         'pointer',
    padding:        '13px',
    transition:     transition.base,
  },
  readyChip: {
    fontSize:     font.size.xs,
    background:   colors.gold.dim,
    color:        colors.gold.base,
    border:       `1px solid rgba(240,165,0,0.2)`,
    borderRadius: radius.full,
    padding:      '2px 8px',
    fontWeight:   font.weight.semibold,
  },
  doneBox: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    padding:        '14px',
    borderRadius:   radius.lg,
    background:     colors.green.dim,
    border:         `1px solid rgba(16,185,129,0.2)`,
    color:          colors.green.text,
    fontWeight:     font.weight.semibold,
    fontSize:       font.size.base,
  },
  waitNote: {
    textAlign:  'center',
    fontSize:   font.size.sm,
    color:      colors.text.muted,
    lineHeight: 1.5,
  },
  outlineBtn: {
    background:   'transparent',
    color:        colors.text.secondary,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.lg,
    fontFamily:   font.family,
    fontSize:     font.size.base,
    cursor:       'pointer',
    padding:      '11px 24px',
    transition:   transition.base,
  },
  // Modal
  overlay: {
    position:       'fixed',
    inset:          0,
    background:     'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(6px)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         200,
    padding:        16,
  },
  modal: {
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.strong}`,
    borderRadius: radius['2xl'],
    padding:      '28px',
    width:        '100%',
    maxWidth:     400,
    boxShadow:    shadow.xl,
    maxHeight:    '90vh',
    overflowY:    'auto',
  },
  modalHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   8,
  },
  modalTitle: {
    fontSize:     font.size.lg,
    fontWeight:   font.weight.bold,
    color:        colors.text.primary,
    letterSpacing: '-0.02em',
  },
  closeBtn: {
    width:        28,
    height:       28,
    borderRadius: radius.sm,
    background:   colors.bg.overlay,
    border:       `1px solid ${colors.border.subtle}`,
    cursor:       'pointer',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    transition:   transition.fast,
  },
  fieldLabel: {
    display:       'block',
    fontSize:      font.size.xs,
    fontWeight:    font.weight.semibold,
    color:         colors.text.secondary,
    marginBottom:  6,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
  },
  modalInput: {
    width:        '100%',
    background:   colors.bg.canvas,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color:        colors.text.primary,
    fontFamily:   font.family,
    fontSize:     font.size.base,
    padding:      '11px 14px',
    outline:      'none',
    boxSizing:    'border-box',
    marginBottom: 14,
    transition:   transition.base,
  },
  successBox: {
    display:      'flex',
    alignItems:   'center',
    gap:          8,
    background:   colors.green.dim,
    border:       `1px solid rgba(16,185,129,0.2)`,
    borderRadius: radius.md,
    padding:      '10px 14px',
    marginBottom: 16,
  },
  copySmallBtn: {
    background:   'transparent',
    color:        colors.text.secondary,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    fontFamily:   font.family,
    fontSize:     font.size.xs,
    fontWeight:   font.weight.semibold,
    cursor:       'pointer',
    padding:      '6px 12px',
    transition:   transition.fast,
    letterSpacing: '0.04em',
  },
};
