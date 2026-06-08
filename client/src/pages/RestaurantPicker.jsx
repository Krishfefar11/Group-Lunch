import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

const RANK = [
  { label: 'Best Match', color: colors.gold.base,  bg: colors.gold.dim },
  { label: 'Runner Up',  color: '#6B7280',          bg: 'rgba(107,114,128,0.1)' },
  { label: 'Also Great', color: '#059669',           bg: 'rgba(5,150,105,0.1)' },
];

export default function RestaurantPicker() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [selecting,  setSelecting]  = useState(null);
  const [me,         setMe]         = useState(null);
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
      const res = await axios.post(`/api/sessions/${sessionId}/recommend`);
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
      await axios.patch(
        `/api/sessions/${sessionId}/restaurant`,
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
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>🤖</div>
        <p style={s.loadTitle}>Analysing group preferences...</p>
        <p style={s.loadSub}>Finding the perfect match</p>
        <div style={s.loadDots}>
          {[0,1,2].map((i) => <div key={i} style={{ ...s.loadDot, animationDelay: `${i * 0.22}s` }} />)}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
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

      <div style={s.wrapper}>

        <div style={s.header} className="animate-fade-up">
          <button style={s.backBtn} onClick={() => navigate(`/session/${sessionId}`)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 style={s.pageTitle}>AI Recommendations</h1>
            <p style={s.pageSubtitle}>
              {results[0]?.restaurant?.source === 'static'
                ? 'Ranked by group compatibility score'
                : `Real restaurants · ${results[0]?.restaurant?.area || ''}`}
            </p>
          </div>
        </div>

        <div style={s.cardList}>
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
              <div key={r.id} style={s.card} className="animate-fade-up">
                {/* Image */}
                <div style={s.imgWrap}>
                  {displayImg ? (
                    <img src={displayImg} alt={r.name} style={s.cardImg} />
                  ) : (
                    <div style={s.cardImgFallback}>
                      <span style={{ fontSize: 48 }}>{r.imageEmoji || '🍽️'}</span>
                    </div>
                  )}
                  <div style={s.imgOverlay} />
                  <div style={{ ...s.rankBadge, background: rank.bg, color: rank.color, border: `1px solid ${rank.color}44` }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {rank.label}
                  </div>
                  <div style={s.scoreWrap}>
                    <span style={s.scoreNum}>{item.score}</span>
                    <span style={s.scoreLabel}>score</span>
                  </div>
                  {r.source && r.source !== 'static' && (
                    <div style={s.sourceBadge}>
                      {r.source === 'foursquare' ? '📍 Foursquare' : '🗺️ OpenStreetMap'}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div style={s.cardBody}>
                  <div style={s.nameRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={s.restName}>{r.name}</h2>
                      <p style={s.restArea}>
                        {r.address || r.area || ''}
                      </p>
                    </div>
                    <div style={s.ratingPill}>
                      <span style={{ color: colors.gold.base }}>★</span>
                      <span>{r.rating}</span>
                    </div>
                  </div>

                  <div style={s.tagRow}>
                    {(r.cuisines || []).map((c) => <span key={c} style={s.tag}>{c}</span>)}
                    {r.vegFriendly  && <span style={{ ...s.tag, ...s.tagGreen }}>🥦 Veg</span>}
                    {r.jainFriendly && <span style={{ ...s.tag, ...s.tagGreen }}>🌿 Jain</span>}
                  </div>

                  <div style={s.statsRow}>
                    <span style={s.stat}>🕐 ~{r.deliveryTimeMin} min</span>
                    <span style={s.statDivider}>·</span>
                    <span style={s.stat}>₹{r.pricePerPerson}/person</span>
                  </div>

                  <div style={s.reasonBox}>
                    <span style={s.reasonStar}>✦</span>
                    <p style={s.reasonText}>{item.reason}</p>
                  </div>

                  {me?.isOrganizer ? (
                    <button
                      style={{ ...s.selectBtn, opacity: isSelecting ? 0.7 : 1 }}
                      onClick={() => handleSelect(r.id)}
                      disabled={!!selecting}
                      onMouseEnter={(e) => { if (!selecting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(240,165,0,0.4)'; }}}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(240,165,0,0.25)'; }}
                    >
                      {isSelecting ? <><span style={s.spinner} /> Selecting...</> : <>Order from {r.name} →</>}
                    </button>
                  ) : (
                    <p style={s.waitNote}>Waiting for organizer to select...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button style={s.rerunBtn} onClick={fetchRecommendations}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.strong; e.currentTarget.style.color = colors.text.primary; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.default; e.currentTarget.style.color = colors.text.secondary; }}
        >
          ↺ Re-run AI
        </button>

      </div>
    </div>
  );
}

const s = {
  page:   { minHeight: '100vh', background: colors.bg.base, padding: '28px 16px 60px', position: 'relative', overflow: 'hidden' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  blob:   { position: 'absolute', top: '-10%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,82,15,0.07) 0%, transparent 70%)', pointerEvents: 'none' },
  wrapper:{ maxWidth: 520, margin: '0 auto', position: 'relative', zIndex: 1 },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 },
  backBtn:{ width: 34, height: 34, borderRadius: radius.md, background: colors.bg.surface, border: `1px solid ${colors.border.default}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: transition.fast },
  pageTitle:    { fontSize: font.size['2xl'], fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.025em', margin: '0 0 2px' },
  pageSubtitle: { fontSize: font.size.sm, color: colors.text.muted, margin: 0 },
  loadTitle: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text.primary, marginBottom: 6, letterSpacing: '-0.02em' },
  loadSub:   { fontSize: font.size.sm, color: colors.text.muted, marginBottom: 24 },
  loadDots:  { display: 'flex', gap: 6, justifyContent: 'center' },
  loadDot:   { width: 8, height: 8, borderRadius: '50%', background: colors.gold.base, animation: 'pulse 1.4s ease infinite' },
  cardList:  { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 },
  card:      { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius['2xl'], overflow: 'hidden', boxShadow: shadow.card, transition: transition.base },
  imgWrap:   { position: 'relative', height: 180, overflow: 'hidden' },
  cardImg:   { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardImgFallback: { width: '100%', height: '100%', background: `linear-gradient(135deg, #FFF0E2 0%, #FFD9B3 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  imgOverlay:{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,7,16,0.6) 0%, transparent 60%)' },
  rankBadge: { position: 'absolute', top: 12, left: 12, padding: '4px 11px', borderRadius: radius.full, fontSize: font.size.xs, fontWeight: font.weight.bold, backdropFilter: 'blur(8px)' },
  scoreWrap:   { position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: radius.md, padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  sourceBadge: { position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: radius.full, padding: '3px 10px', fontSize: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 },
  scoreNum:  { fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.gold.base, lineHeight: 1 },
  scoreLabel:{ fontSize: '10px', color: colors.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 },
  cardBody:  { padding: '18px 20px' },
  nameRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  restName:  { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.02em', margin: '0 0 3px' },
  restArea:  { fontSize: font.size.sm, color: colors.text.muted, margin: 0 },
  ratingPill:{ display: 'flex', alignItems: 'center', gap: 4, background: colors.gold.dim, border: `1px solid rgba(240,165,0,0.2)`, borderRadius: radius.full, padding: '4px 10px', fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary, flexShrink: 0 },
  tagRow:    { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag:       { padding: '3px 10px', borderRadius: radius.full, background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, fontSize: font.size.xs, color: colors.text.secondary, fontWeight: font.weight.medium },
  tagGreen:  { background: colors.green.dim, color: colors.green.text, border: `1px solid rgba(16,185,129,0.2)` },
  statsRow:  { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 },
  stat:      { fontSize: font.size.sm, color: colors.text.secondary },
  statDivider:{ color: colors.text.muted, fontSize: font.size.sm },
  reasonBox: { display: 'flex', alignItems: 'flex-start', gap: 10, background: colors.gold.dim, border: `1px solid rgba(240,165,0,0.15)`, borderRadius: radius.lg, padding: '12px 14px', marginBottom: 16 },
  reasonStar:{ color: colors.gold.base, fontSize: 14, flexShrink: 0, marginTop: 1 },
  reasonText:{ fontSize: font.size.sm, color: colors.text.secondary, lineHeight: 1.55, margin: 0 },
  selectBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: colors.gold.base, color: colors.text.inverse, border: 'none', borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.bold, cursor: 'pointer', padding: '13px', transition: transition.base, boxShadow: '0 4px 20px rgba(240,165,0,0.25)' },
  waitNote:  { textAlign: 'center', fontSize: font.size.sm, color: colors.text.muted },
  spinner:   { display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: colors.text.inverse, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 },
  rerunBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0 auto', background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, cursor: 'pointer', padding: '9px 24px', transition: transition.base },
  outlineBtn:{ background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, cursor: 'pointer', padding: '11px 24px', transition: transition.base },

  // ── URL prompt modal ───────────────────────────────────────────────────────
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal:        { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius['2xl'], padding: '24px', width: '100%', maxWidth: 440, boxShadow: shadow.lg },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle:   { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary, margin: 0 },
  modalClose:   { background: 'transparent', border: 'none', color: colors.text.muted, fontSize: 16, cursor: 'pointer', padding: '4px 8px', borderRadius: radius.sm },
  modalBody:    { fontSize: font.size.sm, color: colors.text.secondary, lineHeight: 1.6, marginBottom: 18 },
  urlInput:     { width: '100%', background: colors.bg.raised, border: `1px solid ${colors.border.default}`, borderRadius: radius.md, color: colors.text.primary, fontFamily: font.family, fontSize: font.size.sm, padding: '12px 14px', outline: 'none', boxSizing: 'border-box', transition: transition.base, marginBottom: 6 },
  urlError:     { fontSize: font.size.xs, color: colors.red.text, marginBottom: 14 },
  modalBtns:    { display: 'flex', gap: 10, marginTop: 18 },
  skipBtn:      { flex: 1, padding: '12px', borderRadius: radius.lg, background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, cursor: 'pointer', transition: transition.base },
  confirmBtn:   { flex: 1, padding: '12px', borderRadius: radius.lg, background: colors.gold.base, color: colors.text.inverse, border: 'none', fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.bold, cursor: 'pointer', transition: transition.base },
};
