import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket/socket.js';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

const AVATAR_COLORS = ['#f0a500','#6366f1','#10b981','#ef4444','#8b5cf6','#06b6d4'];

// ── Bill constants (editable by user in UI) ───────────────────────────────────
const DEFAULT_DELIVERY_FEE = 40;
const PLATFORM_FEE         = 5;
const GST_RATE             = 0.05;   // 5% GST on food

// ── UPI deep link builder ─────────────────────────────────────────────────────
function buildUpiLink(upiId, payeeName, amount, note) {
  const params = new URLSearchParams({
    pa:  upiId,
    pn:  payeeName,
    am:  amount.toFixed(2),
    cu:  'INR',
    tn:  note,
  });
  return `upi://pay?${params.toString()}`;
}

export default function CartView() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [orders,       setOrders]       = useState([]);
  const [session,      setSession]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [me,           setMe]           = useState(null);
  const [splitOpen,    setSplitOpen]    = useState(false);
  const [deliveryFee,  setDeliveryFee]  = useState(DEFAULT_DELIVERY_FEE);
  const [copied,       setCopied]       = useState(null); // memberId that was copied

  useEffect(() => {
    const stored = localStorage.getItem(`member_${sessionId}`);
    if (stored) setMe(JSON.parse(stored));
  }, [sessionId]);

  const fetchCart = useCallback(async () => {
    try {
      const [ordersRes, sessionRes] = await Promise.all([
        axios.get(`/api/sessions/${sessionId}/orders`),
        axios.get(`/api/sessions/${sessionId}`),
      ]);
      setOrders(ordersRes.data.data || []);
      setSession(sessionRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load cart.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  // Replace polling with WebSocket push — server emits 'order_updated'
  // whenever any member saves their order. Zero wasted requests.
  useEffect(() => {
    socket.connect();
    socket.emit('join_session', sessionId);
    socket.on('order_updated', () => fetchCart());
    socket.on('order_placed',  () => navigate(`/session/${sessionId}/tracking`));
    socket.on('status_update', () => navigate(`/session/${sessionId}/tracking`));
    return () => {
      socket.off('order_updated');
      socket.off('order_placed');
      socket.off('status_update');
      socket.disconnect();
    };
  }, [sessionId, navigate, fetchCart]);

  useEffect(() => {
    if (session?.status && !['collecting','restaurant_picked','ordering'].includes(session.status)) {
      navigate(`/session/${sessionId}/tracking`);
    }
  }, [session?.status, sessionId, navigate]);

  // ── Bill calculations ───────────────────────────────────────────────────────
  const foodTotal     = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
  const gst           = Math.round(foodTotal * GST_RATE);
  const grandTotal    = Math.round(foodTotal + deliveryFee + gst + PLATFORM_FEE);
  const totalItems    = orders.reduce((s, o) => s + (o.items || []).reduce((si, i) => si + i.qty, 0), 0);
  const sessionMembers = session?.members || [];
  const orderedIds    = new Set(orders.map((o) => o.memberId));
  const pendingMembers = sessionMembers.filter((m) => !orderedIds.has(m.memberId));
  const memberCount   = Math.max(orders.length, 1);

  // Per-member extra charges (delivery + platform fee split equally; GST proportional)
  const perMemberDelivery = Math.round(deliveryFee / memberCount);
  const perMemberPlatform = Math.round(PLATFORM_FEE / memberCount);

  function memberTotal(order) {
    const food        = parseFloat(order.subtotal || 0);
    const memberGst   = Math.round(food * GST_RATE);
    return Math.round(food + memberGst + perMemberDelivery + perMemberPlatform);
  }

  // UPI details from session
  const organizerUpi  = session?.upiId        || null;
  const organizerName = session?.organizerName || 'Organizer';

  function handleCopyUpi(order) {
    const amt  = memberTotal(order);
    const link = buildUpiLink(organizerUpi, organizerName, amt, `Group Lunch share for ${order.memberName}`);
    navigator.clipboard.writeText(link).then(() => {
      setCopied(order.memberId);
      setTimeout(() => setCopied(null), 2200);
    });
  }

  function handleUpiPay(order) {
    const amt  = memberTotal(order);
    const link = buildUpiLink(organizerUpi, organizerName, amt, `Group Lunch share for ${order.memberName}`);
    window.location.href = link;
  }

  if (loading) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>🛒</div>
        <p style={{ color: colors.text.secondary }}>Loading group cart...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <p style={{ color: colors.red.text, marginBottom: 20 }}>{error}</p>
        <button style={s.outlineBtn} onClick={fetchCart}>Retry</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.blob} />
      <div style={s.wrapper}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={s.header} className="animate-fade-up">
          <button style={s.backBtn} onClick={() => navigate(`/session/${sessionId}/menu`)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 style={s.pageTitle}>Group Cart</h1>
            <p style={s.pageSub}>{orders.length} member{orders.length !== 1 ? 's' : ''} · {totalItems} items</p>
          </div>
        </div>

        {/* ── Grand total banner ───────────────────────────────────────────── */}
        <div style={s.totalCard} className="animate-fade-up">
          <div>
            <p style={s.totalLabel}>Group Total</p>
            <p style={s.totalNum}>₹{grandTotal}</p>
          </div>
          <div style={s.totalRight}>
            <div style={s.totalStat}>
              <span style={s.totalStatNum}>{orders.length}</span>
              <span style={s.totalStatLabel}>orders</span>
            </div>
            <div style={s.totalDivider} />
            <div style={s.totalStat}>
              <span style={s.totalStatNum}>{totalItems}</span>
              <span style={s.totalStatLabel}>items</span>
            </div>
            {orders.length > 1 && (
              <>
                <div style={s.totalDivider} />
                <div style={s.totalStat}>
                  <span style={s.totalStatNum}>₹{Math.round(grandTotal / memberCount)}</span>
                  <span style={s.totalStatLabel}>avg/person</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Pending members ──────────────────────────────────────────────── */}
        {pendingMembers.length > 0 && (
          <div style={s.pendingBox}>
            <div style={s.pendingDot} />
            <div>
              <p style={s.pendingTitle}>Still ordering:</p>
              <p style={s.pendingNames}>{pendingMembers.map((m) => m.memberName).join(', ')}</p>
            </div>
          </div>
        )}

        {/* ── Split Bill Panel ─────────────────────────────────────────────── */}
        {orders.length > 0 && (
          <div style={s.splitWrap} className="animate-fade-up">

            {/* Toggle header */}
            <button style={s.splitToggle} onClick={() => setSplitOpen((p) => !p)}>
              <div style={s.splitToggleLeft}>
                <span style={s.splitIcon}>💸</span>
                <div>
                  <p style={s.splitToggleTitle}>Split Bill</p>
                  <p style={s.splitToggleSub}>See what each person owes</p>
                </div>
              </div>
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                style={{ transform: splitOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: transition.base, flexShrink: 0 }}
              >
                <path d="M6 9l6 6 6-6" stroke={colors.text.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Expanded content */}
            {splitOpen && (
              <div style={s.splitBody}>

                {/* ── Charges breakdown ── */}
                <div style={s.chargesBox}>
                  <p style={s.chargesTitle}>Bill Breakdown</p>

                  <div style={s.chargeRow}>
                    <span style={s.chargeLabel}>Food subtotal</span>
                    <span style={s.chargeVal}>₹{Math.round(foodTotal)}</span>
                  </div>

                  {/* Editable delivery fee */}
                  <div style={s.chargeRow}>
                    <span style={s.chargeLabel}>Delivery fee</span>
                    <div style={s.deliveryEdit}>
                      <button style={s.feeBtn} onClick={() => setDeliveryFee((f) => Math.max(0, f - 10))}>−</button>
                      <span style={s.chargeVal}>₹{deliveryFee}</span>
                      <button style={s.feeBtn} onClick={() => setDeliveryFee((f) => f + 10)}>+</button>
                    </div>
                  </div>

                  <div style={s.chargeRow}>
                    <span style={s.chargeLabel}>GST (5%)</span>
                    <span style={s.chargeVal}>₹{gst}</span>
                  </div>

                  <div style={s.chargeRow}>
                    <span style={s.chargeLabel}>Platform fee</span>
                    <span style={s.chargeVal}>₹{PLATFORM_FEE}</span>
                  </div>

                  <div style={{ ...s.chargeRow, borderTop: `1px solid ${colors.border.default}`, paddingTop: 10, marginTop: 4 }}>
                    <span style={{ ...s.chargeLabel, color: colors.text.primary, fontWeight: font.weight.bold }}>Grand Total</span>
                    <span style={{ ...s.chargeVal, color: colors.gold.base, fontWeight: font.weight.black, fontSize: font.size.lg }}>₹{grandTotal}</span>
                  </div>

                  {!organizerUpi && (
                    <p style={s.noUpiNote}>
                      💡 The organizer didn't add a UPI ID — share amounts manually
                    </p>
                  )}
                </div>

                {/* ── Per-member rows ── */}
                <p style={s.perMemberTitle}>Each person owes</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {orders.map((order, idx) => {
                    const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                    const food        = parseFloat(order.subtotal || 0);
                    const memberGst   = Math.round(food * GST_RATE);
                    const total       = memberTotal(order);
                    const isMe        = order.memberId === me?.memberId;
                    const wasCopied   = copied === order.memberId;

                    return (
                      <div key={order.memberId} style={{ ...s.memberBillCard, ...(isMe ? s.memberBillCardMe : {}) }}>
                        <div style={s.memberBillTop}>
                          {/* Avatar + name */}
                          <div style={{ ...s.avatar, background: `${avatarColor}22`, border: `2px solid ${avatarColor}55`, color: avatarColor }}>
                            {order.memberName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={s.memberBillName}>
                              {order.memberName}
                              {isMe && <span style={{ color: colors.gold.base }}> · you</span>}
                            </p>
                            <p style={s.memberBillSub}>Food ₹{Math.round(food)} + GST ₹{memberGst} + delivery ₹{perMemberDelivery}</p>
                          </div>
                          {/* Owes total */}
                          <div style={s.memberOwe}>
                            <span style={s.memberOweLabel}>owes</span>
                            <span style={s.memberOweAmt}>₹{total}</span>
                          </div>
                        </div>

                        {/* UPI buttons — show to non-organizer members or when viewing own bill */}
                        {organizerUpi && !me?.isOrganizer && isMe && (
                          <div style={s.upiRow}>
                            <button
                              style={s.upiPayBtn}
                              onClick={() => handleUpiPay(order)}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(240,165,0,0.35)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 3px 12px rgba(240,165,0,0.2)'; }}
                            >
                              Pay ₹{total} via UPI →
                            </button>
                            <button
                              style={s.upiCopyBtn}
                              onClick={() => handleCopyUpi(order)}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.strong; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.default; }}
                            >
                              {wasCopied ? '✓ Copied' : '🔗 Copy link'}
                            </button>
                          </div>
                        )}

                        {/* Organizer sees all members' UPI links to share */}
                        {organizerUpi && me?.isOrganizer && (
                          <div style={s.upiRow}>
                            <button
                              style={{ ...s.upiCopyBtn, flex: 1 }}
                              onClick={() => handleCopyUpi(order)}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.strong; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.default; }}
                            >
                              {wasCopied ? '✓ Copied!' : `🔗 Copy ${order.memberName}'s UPI link`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p style={s.splitNote}>
                  Delivery fee split equally · GST calculated at 5% of each person's food total
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {orders.length === 0 && (
          <div style={s.emptyBox}>
            <span style={{ fontSize: 36, marginBottom: 12, display: 'block' }}>🍽️</span>
            <p style={s.emptyText}>No orders yet. Everyone needs to pick items from the menu.</p>
            <button style={s.goldBtn} onClick={() => navigate(`/session/${sessionId}/menu`)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
            >Go to Menu →</button>
          </div>
        )}

        {/* ── Per-member order cards ───────────────────────────────────────── */}
        {orders.map((order, idx) => {
          const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          const orderQty    = (order.items || []).reduce((s, i) => s + i.qty, 0);
          return (
            <div key={order.id} style={s.orderCard} className="animate-fade-up">
              <div style={s.orderHeader}>
                <div style={{ ...s.avatar, background: `${avatarColor}22`, border: `2px solid ${avatarColor}55`, color: avatarColor }}>
                  {order.memberName.charAt(0).toUpperCase()}
                </div>
                <div style={s.orderMeta}>
                  <p style={s.orderName}>
                    {order.memberName}
                    {order.memberId === me?.memberId && (
                      <span style={{ color: colors.gold.base, fontWeight: font.weight.semibold }}> · you</span>
                    )}
                  </p>
                  <p style={s.orderQtyText}>{orderQty} item{orderQty !== 1 ? 's' : ''}</p>
                </div>
                <span style={s.orderSubtotal}>₹{Math.round(order.subtotal)}</span>
              </div>

              <div style={s.itemList}>
                {(order.items || []).map((item, i) => (
                  <div key={i} style={s.itemRow}>
                    <span style={{ ...s.vegDot, background: item.veg ? colors.veg : colors.nonVeg }} />
                    <span style={s.itemName}>{item.name}</span>
                    <span style={s.itemQty}>×{item.qty}</span>
                    <span style={s.itemPrice}>₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>

              {order.memberId === me?.memberId && (
                <button style={s.editBtn}
                  onClick={() => navigate(`/session/${sessionId}/menu`)}
                  onMouseEnter={(e) => { e.currentTarget.style.color = colors.gold.base; e.currentTarget.style.borderColor = colors.gold.muted; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = colors.text.muted; e.currentTarget.style.borderColor = colors.border.default; }}
                >
                  Edit my order
                </button>
              )}
            </div>
          );
        })}

        {/* ── Organizer CTA ────────────────────────────────────────────────── */}
        {me?.isOrganizer && orders.length > 0 && (
          <button style={s.proceedBtn}
            onClick={() => navigate(`/session/${sessionId}/review`)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(240,165,0,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(240,165,0,0.25)'; }}
          >
            Apply Coupon & Pay →
          </button>
        )}

        {!me?.isOrganizer && (
          <div style={s.waitNote}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={colors.text.muted} strokeWidth="1.5"/><polyline points="12 6 12 12 16 14" stroke={colors.text.muted} strokeWidth="1.5" strokeLinecap="round"/></svg>
            Waiting for organizer to place the final order...
          </div>
        )}

        <p style={s.autoRefresh}>Refreshes automatically every 5 seconds</p>
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}

const s = {
  page:    { minHeight: '100vh', background: colors.bg.base, position: 'relative', overflow: 'hidden' },
  center:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  blob:    { position: 'absolute', bottom: '-10%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none' },
  wrapper: { maxWidth: 540, margin: '0 auto', padding: '28px 16px 0', position: 'relative', zIndex: 1 },
  header:  { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 },
  backBtn: { width: 34, height: 34, borderRadius: radius.md, background: colors.bg.surface, border: `1px solid ${colors.border.default}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: transition.fast },
  pageTitle: { fontSize: font.size['2xl'], fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.025em', margin: '0 0 2px' },
  pageSub:   { fontSize: font.size.sm, color: colors.text.muted, margin: 0 },

  // Grand total card
  totalCard:     { background: `linear-gradient(135deg, ${colors.bg.raised} 0%, ${colors.bg.overlay} 100%)`, border: `1px solid ${colors.gold.muted}`, borderRadius: radius['2xl'], padding: '20px 24px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: shadow.card },
  totalLabel:    { fontSize: font.size.xs, color: colors.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 },
  totalNum:      { fontSize: font.size['3xl'], fontWeight: font.weight.black, color: colors.text.primary, letterSpacing: '-0.03em' },
  totalRight:    { display: 'flex', gap: 16, alignItems: 'center' },
  totalStat:     { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  totalStatNum:  { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary, lineHeight: 1.1 },
  totalStatLabel:{ fontSize: font.size.xs, color: colors.text.muted, letterSpacing: '0.04em' },
  totalDivider:  { width: 1, height: 28, background: colors.border.subtle },

  // Pending
  pendingBox:   { display: 'flex', alignItems: 'flex-start', gap: 12, background: colors.amber?.dim || 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: radius.lg, padding: '12px 16px', marginBottom: 16 },
  pendingDot:   { width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginTop: 5, flexShrink: 0, animation: 'pulse 2s ease infinite' },
  pendingTitle: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: '#f59e0b', margin: '0 0 2px' },
  pendingNames: { fontSize: font.size.sm, color: colors.text.secondary, margin: 0 },

  // ── Split Bill ──────────────────────────────────────────────────────────────
  splitWrap:   { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, marginBottom: 14, overflow: 'hidden', boxShadow: shadow.sm },
  splitToggle: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'transparent', border: 'none', cursor: 'pointer', gap: 12, textAlign: 'left' },
  splitToggleLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  splitIcon:   { fontSize: 22, lineHeight: 1 },
  splitToggleTitle: { fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary, margin: '0 0 2px' },
  splitToggleSub:   { fontSize: font.size.xs, color: colors.text.muted, margin: 0 },

  splitBody:   { padding: '0 18px 18px', borderTop: `1px solid ${colors.border.subtle}` },

  chargesBox:  { background: colors.bg.raised, borderRadius: radius.lg, padding: '14px 16px', margin: '14px 0' },
  chargesTitle:{ fontSize: font.size.xs, fontWeight: font.weight.bold, color: colors.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 },
  chargeRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chargeLabel: { fontSize: font.size.sm, color: colors.text.secondary },
  chargeVal:   { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary },
  deliveryEdit:{ display: 'flex', alignItems: 'center', gap: 10 },
  feeBtn:      { width: 24, height: 24, borderRadius: radius.md, background: colors.bg.overlay, border: `1px solid ${colors.border.default}`, color: colors.text.primary, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, fontFamily: font.family },
  noUpiNote:   { fontSize: font.size.xs, color: colors.text.muted, marginTop: 10, padding: '8px 12px', background: colors.bg.overlay, borderRadius: radius.md, lineHeight: 1.5 },

  perMemberTitle: { fontSize: font.size.xs, fontWeight: font.weight.bold, color: colors.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 },

  memberBillCard:   { background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, padding: '14px 14px 10px', },
  memberBillCardMe: { border: `1px solid ${colors.gold.muted}`, background: colors.gold.dim },
  memberBillTop:    { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar:           { width: 36, height: 36, borderRadius: radius.full, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: font.size.sm, fontWeight: font.weight.bold, flexShrink: 0 },
  memberBillName:   { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, margin: '0 0 2px' },
  memberBillSub:    { fontSize: '11px', color: colors.text.muted, margin: 0 },
  memberOwe:        { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 },
  memberOweLabel:   { fontSize: '10px', color: colors.text.muted, letterSpacing: '0.06em', textTransform: 'uppercase' },
  memberOweAmt:     { fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.gold.base, lineHeight: 1.1 },

  upiRow:    { display: 'flex', gap: 8, marginTop: 8 },
  upiPayBtn: { flex: 1, padding: '10px 14px', background: colors.gold.base, color: colors.text.inverse, border: 'none', borderRadius: radius.md, fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.bold, cursor: 'pointer', transition: transition.base, boxShadow: '0 3px 12px rgba(240,165,0,0.2)' },
  upiCopyBtn:{ padding: '10px 14px', background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.md, fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, cursor: 'pointer', transition: transition.base, whiteSpace: 'nowrap' },

  splitNote: { fontSize: '11px', color: colors.text.muted, textAlign: 'center', marginTop: 14, lineHeight: 1.5 },

  // Order cards
  emptyBox:    { textAlign: 'center', padding: '40px 0' },
  emptyText:   { fontSize: font.size.sm, color: colors.text.muted, marginBottom: 20, lineHeight: 1.6 },
  orderCard:   { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, padding: '16px', marginBottom: 10, boxShadow: shadow.sm },
  orderHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  orderMeta:   { flex: 1 },
  orderName:   { fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary, margin: '0 0 2px' },
  orderQtyText:{ fontSize: font.size.xs, color: colors.text.muted, margin: 0 },
  orderSubtotal:{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary },

  itemList:  { borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  itemRow:   { display: 'flex', alignItems: 'center', gap: 8 },
  vegDot:    { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  itemName:  { flex: 1, fontSize: font.size.sm, color: colors.text.secondary },
  itemQty:   { fontSize: font.size.sm, color: colors.text.muted, minWidth: 28, textAlign: 'right' },
  itemPrice: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, minWidth: 52, textAlign: 'right' },

  editBtn:    { marginTop: 14, width: '100%', padding: '8px', borderRadius: radius.md, background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.muted, fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, cursor: 'pointer', transition: transition.base },

  proceedBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', background: colors.gold.base, color: colors.text.inverse, border: 'none', borderRadius: radius.xl, fontFamily: font.family, fontSize: font.size.lg, fontWeight: font.weight.bold, cursor: 'pointer', padding: '16px', marginTop: 20, marginBottom: 12, transition: transition.base, boxShadow: '0 4px 20px rgba(240,165,0,0.25)', letterSpacing: '-0.01em' },
  waitNote:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', fontSize: font.size.sm, color: colors.text.muted, marginTop: 20 },
  autoRefresh:{ textAlign: 'center', fontSize: font.size.xs, color: colors.text.muted, marginTop: 12, letterSpacing: '0.02em' },
  outlineBtn: { background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, cursor: 'pointer', padding: '11px 24px', transition: transition.base },
  goldBtn:    { display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.gold.base, color: colors.text.inverse, border: 'none', borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, fontWeight: font.weight.bold, cursor: 'pointer', padding: '12px 28px', transition: transition.base, boxShadow: '0 4px 20px rgba(240,165,0,0.25)', margin: '0 auto' },
};
