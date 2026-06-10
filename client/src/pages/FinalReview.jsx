import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

const AVATAR_COLORS = ['#f0a500','#6366f1','#10b981','#ef4444','#8b5cf6','#06b6d4'];

export default function FinalReview() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [orders,        setOrders]        = useState([]);
  const [session,       setSession]       = useState(null);
  const [bestCoupon,    setBestCoupon]    = useState(null);
  const [applied,       setApplied]       = useState(null);
  const [manualCode,    setManualCode]    = useState('');
  const [allEligible,   setAllEligible]   = useState([]);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [applying,      setApplying]      = useState(false);
  const [couponError,   setCouponError]   = useState('');
  const [me,            setMe]            = useState(null);
  const [placingOrder,  setPlacingOrder]  = useState(false);
  const [placeError,    setPlaceError]    = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addrFocused,   setAddrFocused]   = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`member_${sessionId}`);
    if (stored) setMe(JSON.parse(stored));
  }, [sessionId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, bestRes, sessionRes] = await Promise.all([
        axios.get(`/api/sessions/${sessionId}/orders`),
        axios.get(`/api/sessions/${sessionId}/coupons/best`),
        axios.get(`/api/sessions/${sessionId}`),
      ]);
      setOrders(ordersRes.data.data || []);
      setOriginalTotal(bestRes.data.total || 0);
      setSession(sessionRes.data.data || null);
      if (bestRes.data.best) {
        setBestCoupon(bestRes.data.best);
        setAllEligible(bestRes.data.allEligible || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const applyCoupon = async (code) => {
    if (!code || applying) return;
    setApplying(true); setCouponError('');
    try {
      const res = await axios.post(`/api/sessions/${sessionId}/coupon`, { code });
      setApplied(res.data.data); setManualCode('');
    } catch (err) { setCouponError(err.response?.data?.message || 'Could not apply coupon'); }
    finally { setApplying(false); }
  };

  const removeCoupon = async () => {
    setApplying(true); setCouponError('');
    try { await axios.post(`/api/sessions/${sessionId}/coupon`, { code: '' }); setApplied(null); }
    catch { /* ignore */ } finally { setApplying(false); }
  };

  // ── Confirm & lock the order ───────────────────────────────────────────────
  const handleFinalise = async () => {
    setPlacingOrder(true); setPlaceError('');
    try {
      await axios.post(
        `/api/sessions/${sessionId}/place-order`,
        { deliveryAddress: deliveryAddress.trim() || 'Office' },
        { headers: { 'x-organizer-id': me?.memberId } },
      );
      // Navigate to tracking/summary — all members get the socket event too
      navigate(`/session/${sessionId}/tracking`);
    } catch (err) {
      setPlaceError(err.response?.data?.message || 'Could not confirm order.');
      setPlacingOrder(false);
    }
  };

  const savings    = applied?.savings    ?? 0;
  const finalTotal = applied?.finalTotal ?? originalTotal;

  if (loading) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>🎟️</div>
        <p style={{ color: colors.text.secondary }}>Loading order details...</p>
      </div>
    </div>
  );

  if (!me?.isOrganizer) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <p style={{ color: colors.text.secondary, marginBottom: 20 }}>Waiting for organizer to place the order...</p>
        <button style={s.outlineBtn} onClick={() => navigate(`/session/${sessionId}/cart`)}>← Back to Cart</button>
      </div>
    </div>
  );

  const restaurant = session?.restaurant;

  return (
    <div style={s.page}>
      <div style={s.blob1} />
      <div style={s.wrapper}>

        {/* Header */}
        <div style={s.header} className="animate-fade-up">
          <button style={s.backBtn} onClick={() => navigate(`/session/${sessionId}/cart`)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 style={s.pageTitle}>Confirm Order</h1>
            <p style={s.pageSub}>
              {restaurant?.name
                ? `${orders.length} orders · ${restaurant.name}`
                : `${orders.length} orders · ₹${originalTotal} subtotal`}
            </p>
          </div>
        </div>

        {/* ── Restaurant info ────────────────────────────────────────────── */}
        {restaurant && (
          <div style={s.restCard} className="animate-fade-up">
            <span style={{ fontSize: 28 }}>{restaurant.imageEmoji || '🍽️'}</span>
            <div style={{ flex: 1 }}>
              <p style={s.restName}>{restaurant.name}</p>
              <p style={s.restMeta}>
                {[restaurant.area, session?.deliveryCity].filter(Boolean).join(' · ')}
                {restaurant.deliveryTimeMin ? ` · ~${restaurant.deliveryTimeMin} min` : ''}
              </p>
            </div>
            <div style={s.ratingPill}>
              <span style={{ color: colors.gold.base }}>★</span>
              <span>{restaurant.rating}</span>
            </div>
          </div>
        )}

        {/* ── Order summary ──────────────────────────────────────────────── */}
        <div style={s.section} className="animate-fade-up">
          <p style={s.sectionLabel}>Order Summary</p>
          <div style={s.orderList}>
            {orders.map((order, idx) => {
              const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              return (
                <div key={order.id} style={s.orderRow}>
                  <div style={{ ...s.miniAvatar, background: `${avatarColor}22`, color: avatarColor }}>
                    {order.memberName.charAt(0).toUpperCase()}
                  </div>
                  <span style={s.orderName}>{order.memberName}</span>
                  <span style={s.orderAmt}>₹{Math.round(order.subtotal)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Auto-suggested coupon ──────────────────────────────────────── */}
        {bestCoupon && !applied && (
          <div style={s.couponSuggest} className="animate-fade-up">
            <div style={s.couponSuggestTop}>
              <div style={s.starIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={colors.gold.base}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={s.couponTitle}>Best coupon for your group</p>
                <p style={s.couponDesc}>{bestCoupon.description}</p>
              </div>
              <span style={s.savingsChip}>−₹{bestCoupon.savings}</span>
            </div>
            <button
              style={{ ...s.applyBtn, opacity: applying ? 0.7 : 1 }}
              onClick={() => applyCoupon(bestCoupon.code)}
              disabled={applying}
            >
              {applying ? 'Applying...' : `Apply ${bestCoupon.code}`}
            </button>
            {allEligible.length > 1 && (
              <div style={s.otherCoupons}>
                <p style={s.otherLabel}>Other eligible:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allEligible.slice(1).map((c) => (
                    <button key={c.code} style={s.couponChip} onClick={() => applyCoupon(c.code)} disabled={applying}>
                      {c.code} <span style={{ color: colors.green.text }}>−₹{c.savings}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Applied coupon ────────────────────────────────────────────── */}
        {applied && (
          <div style={s.appliedBanner} className="animate-fade-up">
            <div style={s.appliedLeft}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={colors.green.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div>
                <p style={s.appliedTitle}>{applied.code} applied</p>
                <p style={s.appliedDesc}>{applied.description}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={s.appliedSavings}>−₹{applied.savings}</span>
              <button style={s.removeBtn} onClick={removeCoupon} disabled={applying}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke={colors.text.muted} strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Manual coupon ─────────────────────────────────────────────── */}
        {!applied && (
          <div style={s.manualSection}>
            <p style={s.sectionLabel}>Have a code?</p>
            <div style={s.manualRow}>
              <input
                style={s.manualInput}
                type="text"
                placeholder="COUPONCODE"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && applyCoupon(manualCode)}
                onFocus={(e) => { e.target.style.borderColor = colors.border.focus; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border.default; }}
              />
              <button
                style={{ ...s.manualApplyBtn, opacity: applying ? 0.7 : 1 }}
                onClick={() => applyCoupon(manualCode)}
                disabled={applying || !manualCode.trim()}
              >
                Apply
              </button>
            </div>
            {couponError && <p style={s.fieldError}>{couponError}</p>}
          </div>
        )}

        {/* ── Price card ────────────────────────────────────────────────── */}
        <div style={s.priceCard} className="animate-fade-up">
          <div style={s.priceRow}>
            <span style={s.priceLabel}>Subtotal</span>
            <span style={s.priceVal}>₹{originalTotal}</span>
          </div>
          {savings > 0 && (
            <div style={s.priceRow}>
              <span style={{ ...s.priceLabel, color: colors.green.text }}>Coupon ({applied?.code})</span>
              <span style={{ ...s.priceVal, color: colors.green.text }}>−₹{savings}</span>
            </div>
          )}
          <div style={s.priceDivider} />
          <div style={s.priceRow}>
            <span style={s.totalLabel}>Total</span>
            <span style={s.totalVal}>₹{finalTotal}</span>
          </div>
          {savings > 0 && (
            <div style={s.savingsBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={colors.green.text}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Saving ₹{savings} on this order!
            </div>
          )}
        </div>

        {/* ── Delivery address ──────────────────────────────────────────── */}
        <div style={s.section} className="animate-fade-up">
          <p style={s.sectionLabel}>Delivery Address</p>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>📍</span>
            <input
              style={{
                ...s.addressInput,
                borderColor: addrFocused ? colors.border.focus : colors.border.default,
                boxShadow:   addrFocused ? '0 0 0 3px rgba(240,165,0,0.12)' : 'none',
              }}
              type="text"
              placeholder="e.g. 3rd Floor, Tower B, Tech Park"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              onFocus={() => setAddrFocused(true)}
              onBlur={() => setAddrFocused(false)}
            />
          </div>
        </div>

        {/* ── Info box ──────────────────────────────────────────────────── */}
        <div style={s.infoBox}>
          <span style={{ fontSize: 16 }}>💡</span>
          <p style={s.infoText}>
            Confirming locks the order for all members. You'll then get a direct link to open on Zomato / Swiggy and a WhatsApp message to share with the group.
          </p>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {placeError && (
          <div style={s.errorBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={colors.red.text} strokeWidth="1.5"/><path d="M12 7v5M12 16v1" stroke={colors.red.text} strokeWidth="1.5" strokeLinecap="round"/></svg>
            {placeError}
          </div>
        )}

        {/* ── Confirm button ────────────────────────────────────────────── */}
        <button
          style={{ ...s.confirmBtn, opacity: placingOrder ? 0.7 : 1 }}
          onClick={handleFinalise}
          disabled={placingOrder}
          onMouseEnter={(e) => { if (!placingOrder) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(240,165,0,0.45)'; }}}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(240,165,0,0.28)'; }}
          className="animate-fade-up"
        >
          {placingOrder ? (
            <><span style={s.spinner} className="gl-spinner" /> Confirming order...</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Confirm Group Order →
            </>
          )}
        </button>

        <div style={{ height: 48 }} />
      </div>
    </div>
  );
}

const s = {
  page:   { minHeight: '100vh', background: colors.bg.base, position: 'relative', overflow: 'hidden' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  blob1:  { position: 'absolute', top: '-15%', right: '-15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,165,0,0.05) 0%, transparent 70%)', pointerEvents: 'none' },
  wrapper:{ maxWidth: 520, margin: '0 auto', padding: '28px 16px 0', position: 'relative', zIndex: 1 },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 },
  backBtn:{ width: 34, height: 34, borderRadius: radius.md, background: colors.bg.surface, border: `1px solid ${colors.border.default}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: transition.fast },
  pageTitle:{ fontSize: font.size['2xl'], fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.025em', margin: '0 0 2px' },
  pageSub:  { fontSize: font.size.sm, color: colors.text.muted, margin: 0 },

  // Restaurant card
  restCard: { display: 'flex', alignItems: 'center', gap: 14, background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, padding: '14px 18px', marginBottom: 16, boxShadow: shadow.sm },
  restName: { fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.text.primary, margin: '0 0 3px' },
  restMeta: { fontSize: font.size.xs, color: colors.text.muted, margin: 0 },
  ratingPill: { display: 'flex', alignItems: 'center', gap: 4, background: colors.gold.dim, border: `1px solid rgba(240,165,0,0.2)`, borderRadius: radius.full, padding: '4px 10px', fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary, flexShrink: 0 },

  section:     { marginBottom: 16 },
  sectionLabel:{ fontSize: font.size.xs, fontWeight: font.weight.semibold, color: colors.text.muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 },

  orderList:{ background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, overflow: 'hidden' },
  orderRow: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${colors.border.subtle}`, gap: 10 },
  miniAvatar:{ width: 30, height: 30, borderRadius: radius.full, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: font.size.sm, fontWeight: font.weight.bold, flexShrink: 0 },
  orderName:{ flex: 1, fontSize: font.size.base, color: colors.text.secondary, fontWeight: font.weight.medium },
  orderAmt: { fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.text.primary },

  // Coupon suggest
  couponSuggest:   { background: colors.green.dim, border: `1px solid rgba(16,185,129,0.2)`, borderRadius: radius.xl, padding: '16px', marginBottom: 12 },
  couponSuggestTop:{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  starIcon:        { width: 28, height: 28, borderRadius: radius.md, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  couponTitle:     { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.green.text, margin: '0 0 2px' },
  couponDesc:      { fontSize: font.size.xs, color: colors.text.secondary, margin: 0 },
  savingsChip:     { background: colors.green.base, color: '#fff', borderRadius: radius.full, padding: '4px 12px', fontSize: font.size.sm, fontWeight: font.weight.bold, flexShrink: 0 },
  applyBtn:        { width: '100%', padding: '11px', borderRadius: radius.lg, background: 'rgba(16,185,129,0.2)', color: colors.green.text, border: `1px solid rgba(16,185,129,0.3)`, fontFamily: font.family, fontSize: font.size.base, fontWeight: font.weight.bold, cursor: 'pointer', transition: transition.base },
  otherCoupons:    { marginTop: 12 },
  otherLabel:      { fontSize: font.size.xs, color: colors.text.muted, marginBottom: 6 },
  couponChip:      { padding: '5px 12px', borderRadius: radius.full, background: colors.bg.raised, border: `1px solid ${colors.border.default}`, fontFamily: font.family, fontSize: font.size.xs, fontWeight: font.weight.semibold, color: colors.text.secondary, cursor: 'pointer', transition: transition.fast },

  // Applied
  appliedBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.green.dim, border: `1px solid rgba(16,185,129,0.2)`, borderRadius: radius.xl, padding: '14px 16px', marginBottom: 12 },
  appliedLeft:   { display: 'flex', alignItems: 'flex-start', gap: 10 },
  appliedTitle:  { fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.green.text, margin: '0 0 2px' },
  appliedDesc:   { fontSize: font.size.xs, color: colors.text.secondary, margin: 0 },
  appliedSavings:{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.green.text },
  removeBtn:     { width: 24, height: 24, borderRadius: radius.full, background: colors.bg.raised, border: `1px solid ${colors.border.default}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: transition.fast },

  // Manual
  manualSection:{ marginBottom: 16 },
  manualRow:    { display: 'flex', gap: 8 },
  manualInput:  { flex: 1, background: colors.bg.raised, border: `1px solid ${colors.border.default}`, borderRadius: radius.md, color: colors.text.primary, fontFamily: 'monospace', fontSize: font.size.base, padding: '11px 14px', outline: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', transition: transition.base },
  manualApplyBtn:{ padding: '11px 20px', borderRadius: radius.md, background: 'transparent', color: colors.text.gold, border: `1px solid ${colors.gold.muted}`, fontFamily: font.family, fontSize: font.size.base, fontWeight: font.weight.semibold, cursor: 'pointer', transition: transition.base, whiteSpace: 'nowrap' },
  fieldError:   { fontSize: font.size.xs, color: colors.red.text, marginTop: 6 },

  // Price card
  priceCard:    { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, padding: '18px 20px', marginBottom: 16, boxShadow: shadow.sm },
  priceRow:     { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  priceLabel:   { fontSize: font.size.base, color: colors.text.secondary },
  priceVal:     { fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary },
  priceDivider: { borderTop: `1px dashed ${colors.border.default}`, margin: '10px 0' },
  totalLabel:   { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text.primary },
  totalVal:     { fontSize: font.size['2xl'], fontWeight: font.weight.black, color: colors.text.primary, letterSpacing: '-0.03em' },
  savingsBadge: { display: 'flex', alignItems: 'center', gap: 6, fontSize: font.size.sm, color: colors.green.text, fontWeight: font.weight.semibold, marginTop: 10, justifyContent: 'center' },

  addressInput: { width: '100%', background: colors.bg.raised, border: `1px solid ${colors.border.default}`, borderRadius: radius.md, color: colors.text.primary, fontFamily: font.family, fontSize: font.size.base, padding: '12px 16px 12px 40px', outline: 'none', boxSizing: 'border-box', transition: transition.base },

  // Info box
  infoBox: { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: radius.lg, padding: '12px 16px', marginBottom: 16 },
  infoText: { fontSize: font.size.sm, color: colors.text.secondary, lineHeight: 1.55, margin: 0 },

  errorBox: { display: 'flex', alignItems: 'flex-start', gap: 8, background: colors.red.dim, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: radius.lg, padding: '12px 16px', marginBottom: 12, fontSize: font.size.sm, color: colors.red.text },

  confirmBtn: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
    width:          '100%',
    background:     colors.gold.base,
    color:          colors.text.inverse,
    border:         'none',
    borderRadius:   radius.xl,
    fontFamily:     font.family,
    fontSize:       font.size.lg,
    fontWeight:     font.weight.bold,
    cursor:         'pointer',
    padding:        '17px',
    marginBottom:   12,
    transition:     transition.base,
    boxShadow:      '0 4px 20px rgba(240,165,0,0.28)',
    letterSpacing:  '-0.01em',
  },
  spinner:     { display: 'inline-block', width: 16, height: 16, borderRadius: '50%', flexShrink: 0 },
  outlineBtn:  { background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, cursor: 'pointer', padding: '11px 24px', transition: transition.base },
};
