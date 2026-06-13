import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/api';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';
import AgentPanel from '../components/AgentPanel';

const RANK = [
  { label: 'Best Match', color: colors.gold.base,  bg: colors.gold.dim,           medal: '🥇' },
  { label: 'Runner Up',  color: '#6B7280',          bg: 'rgba(107,114,128,0.08)',  medal: '🥈' },
  { label: 'Also Great', color: '#059669',           bg: 'rgba(5,150,105,0.08)',   medal: '🥉' },
];

const INJECTED_CSS = `
  .rp-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
  .rp-card:hover { box-shadow: 0 12px 36px rgba(0,0,0,0.12) !important; transform: translateY(-2px); }
  .rp-select-btn:hover { box-shadow: 0 8px 28px rgba(240,165,0,0.45) !important; transform: translateY(-1px) !important; }
  .rp-rerun:hover { border-color: #f4520f !important; color: #f4520f !important; }
  @media (max-width: 480px) {
    .rp-wrapper { padding: 20px 12px 60px !important; }
    .rp-page-title { font-size: 20px !important; }
    .rp-card-body { padding: 14px 14px !important; }
    .rp-img-wrap { height: 160px !important; }
  }
  @media (min-width: 640px) {
    .rp-wrapper { max-width: 560px !important; }
  }
  @media (min-width: 1024px) {
    .rp-card-list { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 16px !important; align-items: start; }
    .rp-wrapper { max-width: 1060px !important; }
  }
`;

export default function RestaurantPicker() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [selecting,  setSelecting]  = useState(null);
  const [me,         setMe]         = useState(null);
  const [showAgent,  setShowAgent]  = useState(false);
  // URL modal state
  const [pendingId,  setPendingId]  = useState(null);   // restaurantId waiting for URL
  const [orderUrl,   setOrderUrl]   = useState('');
  const [urlFocused, setUrlFocused] = useState(false);
  const [urlError,   setUrlError]   = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(`member_${sessionId}`);
    if (stored) setMe(JSON.parse(stored));
    fetchRecommendations();
  }, [sessionId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.post(`/sessions/${sessionId}/recommend`);
      setResults(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 — organizer clicks "Order from X": open URL prompt
  const handleSelect = (restaurantId) => {
    if (!me?.isOrganizer) return;
    setPendingId(restaurantId);
    setOrderUrl('');
    setUrlError('');
  };

  // Step 2 — confirm with optional URL
  const handleConfirm = async () => {
    if (!pendingId) return;

    // If URL is provided, validate it's Zomato or Swiggy
    const trimmed = orderUrl.trim();
    if (trimmed && !/^https?:\/\/(www\.)?(zomato\.com|swiggy\.com)/i.test(trimmed)) {
      setUrlError('Please paste a valid Zomato or Swiggy URL, or leave it empty.');
      return;
    }

    setSelecting(pendingId);
    setPendingId(null);
    try {
      await API.patch(
        `/sessions/${sessionId}/restaurant`,
        { restaurantId: pendingId, orderUrl: trimmed || null },
        { headers: { 'x-organizer-id': me.memberId } },
      );
      navigate(`/session/${sessionId}/menu`);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not select restaurant');
      setSelecting(null);
    }
  };

  const optimiseUrl = (url, w = 400, h = 200) =>
    url ? url.replace('/upload/', `/upload/w_${w},h_${h},c_fill,q_auto,f_auto/`) : null;

  if (loading) return (
    <div style={s.center}>
      <style>{INJECTED_CSS}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>🤖</div>
        <p style={s.loadTitle}>Analysing group preferences...</p>
        <p style={s.loadSub}>Finding the perfect match for everyone</p>
        <div style={s.loadDots}>
          {[0,1,2].map((i) => <div key={i} style={{ ...s.loadDot, animationDelay: `${i * 0.22}s` }} />)}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <style>{INJECTED_CSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <p style={{ color: colors.red.text, marginBottom: 20 }}>{error}</p>
        <button style={s.outlineBtn} onClick={fetchRecommendations}>Try Again</button>
      </div>
    </div>
  );

  // The restaurant name for the currently pending selection
  const pendingName = pendingId
    ? (results.find((r) => r.restaurant?.id === pendingId)?.restaurant?.name || 'this restaurant')
    : '';

  return (
    <div style={s.page}>
      <style>{INJECTED_CSS}</style>
      <div style={s.blob} />

      {/* ── URL prompt modal ──────────────────────────────────────────────── */}
      {pendingId && (
        <div style={s.modalOverlay} onClick={() => setPendingId(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>Confirm restaurant</p>
              <button style={s.modalClose} onClick={() => setPendingId(null)}>✕</button>
            </div>

            <p style={s.modalBody}>
              Paste the <strong>Zomato or Swiggy URL</strong> for <em>{pendingName}</em> so the group can open the exact page. This is optional — skip it if you don't have the link yet.
            </p>

            <input
              style={{
                ...s.urlInput,
                borderColor: urlError ? colors.red.text : urlFocused ? colors.border.focus : colors.border.default,
                boxShadow:   urlFocused ? '0 0 0 3px rgba(240,165,0,0.12)' : 'none',
              }}
              type="url"
              placeholder="https://www.zomato.com/bangalore/..."
              value={orderUrl}
              onChange={(e) => { setOrderUrl(e.target.value); setUrlError(''); }}
              onFocus={() => setUrlFocused(true)}
              onBlur={() => setUrlFocused(false)}
              autoFocus
            />
            {urlError && <p style={s.urlError}>{urlError}</p>}

            <div style={s.modalBtns}>
              <button style={s.skipBtn} onClick={() => { setOrderUrl(''); handleConfirm(); }}>
                Skip & continue →
              </button>
              <button
                style={{ ...s.confirmBtn, opacity: orderUrl.trim() ? 1 : 0.55 }}
                onClick={handleConfirm}
                disabled={!orderUrl.trim()}
              >
                Save URL & continue →
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.wrapper} className="rp-wrapper">

        <div style={s.header} className="animate-fade-up">
          <button style={s.backBtn} onClick={() => navigate(`/session/${sessionId}`)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={s.pageTitle} className="rp-page-title">AI Recommendations</h1>
            <p style={s.pageSubtitle}>
              {results[0]?._breakdown?.source === 'llm'
                ? '🤖 Groq LLM picked these for your group'
                : results[0]?._breakdown?.source === 'topsis'
                  ? '📊 Ranked by TOPSIS fairness algorithm'
                  : results[0]?.restaurant?.source === 'static'
                    ? 'Ranked by group compatibility score'
                    : `📍 Real restaurants · ${results[0]?.restaurant?.area || ''}`}
            </p>
          </div>
          {/* Agent toggle — organizers only */}
          {me?.isOrganizer && (
            <button
              style={{
                ...s.backBtn,
                background: showAgent ? 'rgba(240,165,0,0.12)' : colors.bg.raised,
                borderColor: showAgent ? 'rgba(240,165,0,0.35)' : colors.border.default,
                color: showAgent ? colors.gold.bright : colors.text.secondary,
                fontSize: 17,
              }}
              onClick={() => setShowAgent((v) => !v)}
              title="Toggle AI agent panel"
            >
              🤖
            </button>
          )}
        </div>

        {/* ── Agent Panel (A1–A7) — organizer only ───────────────────────── */}
        {showAgent && me?.isOrganizer && (
          <div className="animate-fade-up">
            <AgentPanel sessionId={sessionId} autoRun={false} />
          </div>
        )}

        <div style={s.cardList} className="rp-card-list">
          {results.map((item, index) => {
            const r           = item.restaurant;
            const rank        = RANK[index] || RANK[2];
            const isSelecting = selecting === r.id;
            const imgUrl      = optimiseUrl(r.imageUrl);

            // Use Foursquare photo if available, else Cloudinary, else null
            const realPhoto = r.photoUrl || null;
            const cloudPhoto = optimiseUrl(r.imageUrl);
            const displayImg = realPhoto || cloudPhoto;

            return (
              <div key={r.id} style={s.card} className="rp-card animate-fade-up">
                {/* Image */}
                <div style={s.imgWrap} className="rp-img-wrap">
                  {displayImg ? (
                    <img src={displayImg} alt={r.name} style={s.cardImg} />
                  ) : (
                    <div style={s.cardImgFallback}>
                      <span style={{ fontSize: 56, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))' }}>{r.imageEmoji || '🍽️'}</span>
                    </div>
                  )}
                  <div style={s.imgOverlay} />
                  {/* Rank badge */}
                  <div style={{ ...s.rankBadge, background: rank.bg, color: rank.color, border: `1px solid ${rank.color}40`, backdropFilter: 'blur(8px)' }}>
                    {rank.medal} {rank.label}
                  </div>
                  {/* Score ring */}
                  <div style={s.scoreWrap}>
                    <span style={s.scoreNum}>{item.score}</span>
                    <span style={s.scoreLabel}>match</span>
                  </div>
                  {r.source && r.source !== 'static' && (
                    <div style={s.sourceBadge}>
                      {r.source === 'foursquare' ? '📍 Live' : '🗺️ Live'}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div style={s.cardBody} className="rp-card-body">
                  <div style={s.nameRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={s.restName}>{r.name}</h2>
                      {(r.address || r.area) && (
                        <p style={s.restArea}>
                          📍 {r.address || r.area}
                        </p>
                      )}
                    </div>
                    <div style={s.ratingPill}>
                      <span style={{ color: colors.gold.base }}>★</span>
                      <span>{r.rating}</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={s.statsRow}>
                    <div style={s.statChip}>
                      <span>🕐</span>
                      <span>{r.deliveryTimeMin} min</span>
                    </div>
                    <div style={s.statChip}>
                      <span>💰</span>
                      <span>₹{r.pricePerPerson}/person</span>
                    </div>
                    {r.vegFriendly && (
                      <div style={{ ...s.statChip, background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span>🥦</span>
                        <span>Veg-friendly</span>
                      </div>
                    )}
                  </div>

                  {/* Cuisine tags */}
                  <div style={s.tagRow}>
                    {(r.cuisines || []).map((c) => <span key={c} style={s.tag}>{c}</span>)}
                    {r.jainFriendly && <span style={{ ...s.tag, ...s.tagGreen }}>🌿 Jain</span>}
                  </div>

                  {/* AI reason box */}
                  <div style={s.reasonBox}>
                    <div style={s.reasonIconWrap}>
                      <span style={{ fontSize: 14 }}>✦</span>
                    </div>
                    <p style={s.reasonText}>{item.reason}</p>
                  </div>

                  {me?.isOrganizer ? (
                    <button
                      className="rp-select-btn"
                      style={{ ...s.selectBtn, opacity: isSelecting ? 0.7 : 1 }}
                      onClick={() => handleSelect(r.id)}
                      disabled={!!selecting}
                    >
                      {isSelecting ? <><span style={s.spinner} className="gl-spinner" /> Selecting...</> : <>Order from {r.name} →</>}
                    </button>
                  ) : (
                    <div style={s.waitNoteWrap}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s ease infinite', flexShrink: 0 }} />
                      <p style={s.waitNote}>Waiting for organizer to select...</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button style={s.rerunBtn} className="rp-rerun" onClick={fetchRecommendations}>
          ↺ Re-run AI recommendations
        </button>

      </div>
    </div>
  );
}

const s = {
  page:   { minHeight: '100vh', background: colors.bg.base, padding: '28px 16px 60px', position: 'relative', overflow: 'hidden' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  blob:   { position: 'absolute', top: '-10%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,82,15,0.06) 0%, transparent 70%)', pointerEvents: 'none' },
  wrapper:{ maxWidth: 520, margin: '0 auto', position: 'relative', zIndex: 1 },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 },
  backBtn:{ width: 36, height: 36, borderRadius: radius.md, background: colors.bg.surface, border: `1px solid ${colors.border.default}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: transition.fast },
  pageTitle:    { fontSize: font.size['2xl'], fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.025em', margin: '0 0 3px' },
  pageSubtitle: { fontSize: font.size.sm, color: colors.text.muted, margin: 0 },
  loadTitle: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text.primary, marginBottom: 6, letterSpacing: '-0.02em' },
  loadSub:   { fontSize: font.size.sm, color: colors.text.muted, marginBottom: 28 },
  loadDots:  { display: 'flex', gap: 6, justifyContent: 'center' },
  loadDot:   { width: 9, height: 9, borderRadius: '50%', background: colors.gold.base, animation: 'pulse 1.4s ease infinite' },

  // ── Card list ──────────────────────────────────────────────────────────────
  cardList:  { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 },
  card:      { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius['2xl'], overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.07)', transition: transition.base },

  // ── Image ──────────────────────────────────────────────────────────────────
  imgWrap:   { position: 'relative', height: 190, overflow: 'hidden' },
  cardImg:   { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardImgFallback: { width: '100%', height: '100%', background: `linear-gradient(135deg, #FFF5E5 0%, #FFE4BA 50%, #FFD09A 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  imgOverlay:{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,7,16,0.55) 0%, transparent 55%)' },
  rankBadge: { position: 'absolute', top: 12, left: 12, padding: '5px 12px', borderRadius: radius.full, fontSize: font.size.xs, fontWeight: font.weight.bold, backdropFilter: 'blur(10px)' },
  scoreWrap: { position: 'absolute', bottom: 12, right: 12, background: 'rgba(7,7,16,0.6)', backdropFilter: 'blur(12px)', border: `1px solid rgba(255,255,255,0.12)`, borderRadius: radius.lg, padding: '8px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  sourceBadge: { position: 'absolute', bottom: 12, left: 12, background: 'rgba(7,7,16,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: radius.full, padding: '4px 11px', fontSize: '10px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 },
  scoreNum:  { fontSize: font.size['2xl'], fontWeight: font.weight.black, color: colors.gold.base, lineHeight: 1 },
  scoreLabel:{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 },

  // ── Card body ──────────────────────────────────────────────────────────────
  cardBody:  { padding: '18px 20px' },
  nameRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  restName:  { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.025em', margin: '0 0 4px' },
  restArea:  { fontSize: font.size.xs, color: colors.text.muted, margin: 0 },
  ratingPill:{ display: 'flex', alignItems: 'center', gap: 4, background: colors.gold.dim, border: `1px solid rgba(240,165,0,0.2)`, borderRadius: radius.full, padding: '5px 11px', fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary, flexShrink: 0 },

  // Stats chips row
  statsRow:  { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  statChip:  { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: radius.full, background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, fontSize: font.size.xs, color: colors.text.secondary, fontWeight: font.weight.medium },

  // Cuisine tags
  tagRow:    { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  tag:       { padding: '4px 11px', borderRadius: radius.full, background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, fontSize: font.size.xs, color: colors.text.secondary, fontWeight: font.weight.medium },
  tagGreen:  { background: colors.green.dim, color: colors.green.text, border: `1px solid rgba(16,185,129,0.2)` },

  // Reason box
  reasonBox: { display: 'flex', alignItems: 'flex-start', gap: 10, background: `linear-gradient(135deg, ${colors.gold.dim} 0%, rgba(255,248,235,0.5) 100%)`, border: `1px solid rgba(240,165,0,0.18)`, borderRadius: radius.lg, padding: '12px 14px', marginBottom: 16 },
  reasonIconWrap: { width: 24, height: 24, borderRadius: radius.full, background: colors.gold.dim, border: `1px solid rgba(240,165,0,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: colors.gold.base, fontSize: 12 },
  reasonText:{ fontSize: font.size.sm, color: colors.text.secondary, lineHeight: 1.6, margin: 0 },

  // Select button
  selectBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: `linear-gradient(135deg, ${colors.gold.base} 0%, #f4520f 100%)`, color: '#fff', border: 'none', borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.bold, cursor: 'pointer', padding: '14px', transition: transition.base, boxShadow: '0 4px 20px rgba(240,165,0,0.3)' },
  waitNoteWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  waitNote:  { textAlign: 'center', fontSize: font.size.sm, color: colors.text.muted, margin: 0 },
  spinner:   { display: 'inline-block', width: 14, height: 14, borderRadius: '50%', flexShrink: 0 },
  rerunBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0 auto', background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, cursor: 'pointer', padding: '10px 28px', transition: transition.base },
  outlineBtn:{ background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, cursor: 'pointer', padding: '11px 24px', transition: transition.base },

  // ── URL prompt modal ───────────────────────────────────────────────────────
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal:        { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius['2xl'], padding: '26px', width: '100%', maxWidth: 440, boxShadow: shadow.lg },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle:   { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary, margin: 0 },
  modalClose:   { background: 'transparent', border: 'none', color: colors.text.muted, fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: radius.sm },
  modalBody:    { fontSize: font.size.sm, color: colors.text.secondary, lineHeight: 1.6, marginBottom: 18 },
  urlInput:     { width: '100%', background: colors.bg.raised, border: `1px solid ${colors.border.default}`, borderRadius: radius.md, color: colors.text.primary, fontFamily: font.family, fontSize: font.size.sm, padding: '12px 14px', outline: 'none', boxSizing: 'border-box', transition: transition.base, marginBottom: 6 },
  urlError:     { fontSize: font.size.xs, color: colors.red.text, marginBottom: 14 },
  modalBtns:    { display: 'flex', gap: 10, marginTop: 18 },
  skipBtn:      { flex: 1, padding: '12px', borderRadius: radius.lg, background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, cursor: 'pointer', transition: transition.base },
  confirmBtn:   { flex: 1, padding: '12px', borderRadius: radius.lg, background: `linear-gradient(135deg, ${colors.gold.base}, #f4520f)`, color: '#fff', border: 'none', fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.bold, cursor: 'pointer', transition: transition.base },
};
