import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket/socket.js';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

const AVATAR_COLORS = ['#f0a500','#6366f1','#10b981','#ef4444','#8b5cf6','#06b6d4'];

// ── Build WhatsApp message from order data ────────────────────────────────────
function buildWhatsAppText({ restaurant, deliveryCity, deliveryAddress, orders, finalTotal, savings, couponCode }) {
  const lines = [
    `🍱 *Group Lunch Order*`,
    ``,
    `📍 *${restaurant?.name || 'Restaurant'}*${deliveryCity ? `, ${deliveryCity}` : ''}`,
    deliveryAddress && deliveryAddress !== 'Office' ? `🏢 Deliver to: ${deliveryAddress}` : null,
    ``,
    `👥 *Orders:*`,
    ...orders.map((o) => {
      const items = (o.items || []).map((i) => `${i.name} ×${i.qty}`).join(', ');
      return `• *${o.memberName}*: ${items} — ₹${Math.round(o.subtotal)}`;
    }),
    ``,
    savings > 0 ? `Subtotal: ₹${Math.round(orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0))}` : null,
    savings > 0 ? `Coupon${couponCode ? ` (${couponCode})` : ''}: −₹${savings}` : null,
    `💰 *Total: ₹${finalTotal}*`,
    orders.length > 1 ? `Each person owes ~₹${Math.round(finalTotal / orders.length)}` : null,
  ].filter(Boolean).join('\n');

  return lines;
}

function buildZomatoLink(name, city) {
  const q = encodeURIComponent(name || '');
  const l = city ? `&l=${encodeURIComponent(city + ' India')}` : '';
  return `https://www.zomato.com/search?q=${q}${l}`;
}

function buildSwiggyLink(name) {
  return `https://www.swiggy.com/search?query=${encodeURIComponent(name || '')}`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function MemberAvatar({ name, index = 0, size = 36 }) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
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
      flexShrink:     0,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [me,          setMe]          = useState(null);
  const [expanded,    setExpanded]    = useState({});
  const [copied,      setCopied]      = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`member_${sessionId}`);
    if (stored) setMe(JSON.parse(stored));
  }, [sessionId]);

  const loadData = useCallback(async () => {
    try {
      const [sessionRes, ordersRes] = await Promise.all([
        axios.get(`/api/sessions/${sessionId}`),
        axios.get(`/api/sessions/${sessionId}/orders`),
      ]);
      setSessionData(sessionRes.data.data);
      setOrders(ordersRes.data.data || []);
    } catch {
      setError('Could not load order details.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Listen for order_placed in case a member navigates here before the event
  useEffect(() => {
    socket.connect();
    socket.emit('join_session', sessionId);
    socket.on('order_placed', () => loadData());
    return () => { socket.off('order_placed'); socket.disconnect(); };
  }, [sessionId, loadData]);

  // ── Derived values ────────────────────────────────────────────────────────
  const restaurant  = sessionData?.restaurant;
  const grandTotal  = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
  const savings     = sessionData?.couponSavings || 0;
  const finalTotal  = Math.round(grandTotal - savings);
  const city        = sessionData?.deliveryCity || '';
  const address     = sessionData?.deliveryAddress || '';

  // Prefer the organizer-saved direct URL, fall back to search
  const savedUrl   = sessionData?.orderUrl || null;
  const isZomato   = savedUrl && /zomato\.com/i.test(savedUrl);
  const isSwiggy   = savedUrl && /swiggy\.com/i.test(savedUrl);

  const zomatoLink = isZomato  ? savedUrl : buildZomatoLink(restaurant?.name, city);
  const swiggyLink = isSwiggy  ? savedUrl : buildSwiggyLink(restaurant?.name);
  const waText     = buildWhatsAppText({
    restaurant, deliveryCity: city, deliveryAddress: address,
    orders, finalTotal, savings, couponCode: sessionData?.couponCode,
  });
  const waLink = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(waText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 20, animation: 'float 2.5s ease infinite' }}>🍱</div>
        <p style={{ color: colors.text.secondary, fontSize: font.size.md, fontWeight: font.weight.medium }}>
          Loading order summary...
        </p>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: colors.red.text, marginBottom: 20, fontSize: font.size.base }}>{error}</p>
        <button style={s.outlineBtn} onClick={() => navigate(`/session/${sessionId}`)}>← Back to Session</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.blob} />
      <div style={s.wrapper}>

        {/* ── Hero confirmation card ────────────────────────────────────── */}
        <div style={s.heroCard} className="animate-scale-up">
          <div style={s.heroTop}>
            <div style={s.checkCircle}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 style={s.heroTitle}>Order Confirmed!</h1>
              <p style={s.heroSub}>
                {restaurant?.name
                  ? `Ready to order at ${restaurant.name}`
                  : 'Your group order is locked in'}
              </p>
            </div>
          </div>

          {/* Meta pills */}
          <div style={s.metaRow}>
            {restaurant?.name && (
              <div style={s.metaPill}>
                <span>{restaurant.imageEmoji || '🍽️'}</span>
                <span>{restaurant.name}</span>
              </div>
            )}
            {address && address !== 'Office' && (
              <div style={s.metaPill}>
                <span>📍</span>
                <span>{address}</span>
              </div>
            )}
            <div style={s.metaPill}>
              <span>👥</span>
              <span>{orders.length} {orders.length === 1 ? 'person' : 'people'}</span>
            </div>
          </div>
        </div>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div style={s.actionsCard} className="animate-fade-up">
          <p style={s.actionsTitle}>
            {savedUrl ? 'Direct link saved — open and order 👇' : 'Now place the order on your platform'}
          </p>

          <div style={s.btnRow}>
            {/* Zomato */}
            <a
              href={zomatoLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...s.zomatoBtn, ...(isZomato ? s.directLinkHighlight : {}) }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(226,60,46,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isZomato ? '0 4px 20px rgba(226,60,46,0.5)' : '0 3px 14px rgba(226,60,46,0.25)'; }}
            >
              🛵 {isZomato ? 'Open Zomato ✓' : 'Open Zomato'}
            </a>

            {/* Swiggy */}
            <a
              href={swiggyLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...s.swiggyBtn, ...(isSwiggy ? s.directLinkHighlight : {}) }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(252,128,25,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isSwiggy ? '0 4px 20px rgba(252,128,25,0.5)' : '0 3px 14px rgba(252,128,25,0.25)'; }}
            >
              🧡 {isSwiggy ? 'Open Swiggy ✓' : 'Open Swiggy'}
            </a>
          </div>

          {/* WhatsApp */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            style={s.waBtn}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,211,102,0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 3px 14px rgba(37,211,102,0.18)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C8.8 3 3 8.8 3 16c0 2.4.7 4.7 1.9 6.7L3 29l6.5-1.9C11.4 28.3 13.6 29 16 29c7.2 0 13-5.8 13-13S23.2 3 16 3zm6.8 18.2c-.3.8-1.4 1.5-2.4 1.7-.6.1-1.4.2-4.1-.9-3.5-1.3-5.7-4.9-5.9-5.1-.2-.2-1.4-1.9-1.4-3.6s.9-2.5 1.3-2.9c.3-.3.7-.4 1-.4h.7c.3 0 .5.1.8.6l1.1 2.7c.1.3.1.6 0 .8l-.6.9-.2.4c.3.5 1.1 1.7 2.1 2.5 1.2 1 2.2 1.3 2.6 1.4.3.1.6 0 .8-.2l.7-.9c.2-.3.5-.4.8-.2l2.6 1.2c.3.1.5.3.5.6v.9c0 .2 0 .5-.4.5z"/></svg>
            Share via WhatsApp
          </a>

          {/* Copy summary */}
          <button
            style={{ ...s.copyBtn, color: copied ? colors.green.text : colors.text.secondary }}
            onClick={handleCopySummary}
          >
            {copied
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={colors.green.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Copied!</>
              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5"/></svg> Copy order text</>
            }
          </button>
        </div>

        {/* ── Bill summary ──────────────────────────────────────────────── */}
        <div style={s.billCard} className="animate-fade-up">
          <div style={s.billHeader}>
            <p style={s.sectionLabel}>Bill Summary</p>
            <div style={s.billTotal}>
              <span style={{ fontSize: font.size.xs, color: colors.text.muted, letterSpacing: '0.06em' }}>TOTAL</span>
              <span style={{ fontSize: font.size['2xl'], fontWeight: font.weight.extrabold, color: colors.text.primary, letterSpacing: '-0.03em' }}>
                ₹{finalTotal}
              </span>
            </div>
          </div>

          <div style={s.billRows}>
            <div style={s.billRow}>
              <span style={s.billLabel}>Subtotal</span>
              <span style={s.billVal}>₹{Math.round(grandTotal)}</span>
            </div>
            {savings > 0 && (
              <div style={s.billRow}>
                <span style={{ ...s.billLabel, color: colors.green.text }}>
                  Coupon {sessionData?.couponCode ? `(${sessionData.couponCode})` : ''}
                </span>
                <span style={{ ...s.billVal, color: colors.green.text }}>−₹{savings}</span>
              </div>
            )}
          </div>

          {orders.length > 1 && (
            <div style={s.splitBadge}>
              <span style={{ fontSize: 13 }}>💡</span>
              <span>Each person owes ~<strong style={{ color: colors.text.primary }}>₹{Math.round(finalTotal / orders.length)}</strong></span>
            </div>
          )}
        </div>

        {/* ── Per-member orders ─────────────────────────────────────────── */}
        <div style={s.ordersSection} className="animate-fade-up">
          <p style={s.sectionLabel}>Group Orders</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map((order, idx) => {
              const isExpanded = expanded[order.id];
              const orderQty   = (order.items || []).reduce((s, i) => s + i.qty, 0);
              const isMe       = order.memberId === me?.memberId;

              return (
                <div key={order.id} style={{
                  background:   colors.bg.surface,
                  border:       `1px solid ${isMe ? 'rgba(240,165,0,0.18)' : colors.border.default}`,
                  borderRadius: radius.xl,
                  overflow:     'hidden',
                }}>
                  <button
                    style={s.orderHeaderBtn}
                    onClick={() => setExpanded((p) => ({ ...p, [order.id]: !p[order.id] }))}
                  >
                    <MemberAvatar name={order.memberName} index={idx} size={36} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary }}>
                        {order.memberName}
                        {isMe && (
                          <span style={{ marginLeft: 8, fontSize: font.size.xs, fontWeight: font.weight.bold, color: colors.gold.base, background: colors.gold.dim, border: '1px solid rgba(240,165,0,0.2)', borderRadius: radius.full, padding: '1px 8px' }}>you</span>
                        )}
                      </div>
                      <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginTop: 2 }}>
                        {orderQty} item{orderQty !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text.primary }}>₹{Math.round(order.subtotal)}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>
                        <path d="M5 9l7 7 7-7" stroke={colors.text.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${colors.border.subtle}`, padding: '12px 16px', background: colors.bg.raised }}>
                      {(order.items || []).map((item, i) => (
                        <div key={i} style={s.itemRow}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.veg ? colors.veg : colors.nonVeg, flexShrink: 0 }} />
                          <span style={s.itemName}>{item.name}</span>
                          <span style={s.itemQty}>×{item.qty}</span>
                          <span style={s.itemPrice}>₹{item.price * item.qty}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Back ──────────────────────────────────────────────────────── */}
        <button
          style={s.homeBtn}
          onClick={() => navigate(`/session/${sessionId}`)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.strong; e.currentTarget.style.color = colors.text.primary; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.default; e.currentTarget.style.color = colors.text.secondary; }}
        >
          ← Back to Session
        </button>

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:    { minHeight: '100vh', background: colors.bg.base, padding: '24px 0 0', position: 'relative', overflow: 'hidden' },
  center:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg.base },
  blob:    { position: 'absolute', top: '-10%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)', pointerEvents: 'none' },
  wrapper: { maxWidth: 560, margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 },

  // Hero
  heroCard:   { background: `linear-gradient(135deg, ${colors.bg.surface} 0%, rgba(16,185,129,0.06) 100%)`, border: `1px solid rgba(16,185,129,0.2)`, borderRadius: radius['2xl'], padding: '22px', boxShadow: shadow.lg },
  heroTop:    { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 },
  checkCircle:{ width: 52, height: 52, borderRadius: radius.full, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(16,185,129,0.4)' },
  heroTitle:  { fontSize: font.size.xl, fontWeight: font.weight.extrabold, color: colors.text.primary, margin: '0 0 4px', letterSpacing: '-0.025em' },
  heroSub:    { fontSize: font.size.sm, color: colors.text.secondary, margin: 0 },
  metaRow:    { display: 'flex', flexWrap: 'wrap', gap: 6 },
  metaPill:   { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: radius.full, background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, fontSize: font.size.xs, color: colors.text.secondary, fontWeight: font.weight.medium },

  // Actions card
  actionsCard:  { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius['2xl'], padding: '20px', boxShadow: shadow.card },
  actionsTitle: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.muted, letterSpacing: '0.03em', marginBottom: 14, textAlign: 'center' },
  btnRow:       { display: 'flex', gap: 10, marginBottom: 10 },

  zomatoBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '13px', borderRadius: radius.lg,
    background: '#e23c2e', color: '#fff',
    textDecoration: 'none', fontFamily: font.family,
    fontSize: font.size.base, fontWeight: font.weight.bold,
    cursor: 'pointer', transition: transition.base,
    boxShadow: '0 3px 14px rgba(226,60,46,0.25)',
  },
  swiggyBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '13px', borderRadius: radius.lg,
    background: '#fc8019', color: '#fff',
    textDecoration: 'none', fontFamily: font.family,
    fontSize: font.size.base, fontWeight: font.weight.bold,
    cursor: 'pointer', transition: transition.base,
    boxShadow: '0 3px 14px rgba(252,128,25,0.25)',
  },
  waBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', padding: '13px', borderRadius: radius.lg,
    background: '#25d366', color: '#fff',
    textDecoration: 'none', fontFamily: font.family,
    fontSize: font.size.base, fontWeight: font.weight.bold,
    cursor: 'pointer', transition: transition.base,
    boxShadow: '0 3px 14px rgba(37,211,102,0.18)',
    marginBottom: 10,
  },
  directLinkHighlight: { boxShadow: '0 4px 20px rgba(255,255,255,0.25)', outline: '2px solid rgba(255,255,255,0.4)', outlineOffset: 2 },
  copyBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    width: '100%', padding: '10px', borderRadius: radius.md,
    background: 'transparent', border: `1px solid ${colors.border.default}`,
    fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium,
    cursor: 'pointer', transition: transition.fast,
  },

  // Bill
  billCard:   { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius['2xl'], padding: '20px', boxShadow: shadow.card },
  billHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  billTotal:  { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  billRows:   { display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14, borderBottom: `1px dashed ${colors.border.subtle}`, marginBottom: 12 },
  billRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  billLabel:  { fontSize: font.size.sm, color: colors.text.secondary },
  billVal:    { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary },
  splitBadge: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: radius.lg, padding: '10px 14px', fontSize: font.size.sm, color: colors.text.secondary },

  // Section label
  sectionLabel: { fontSize: font.size.xs, fontWeight: font.weight.bold, color: colors.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14, margin: '0 0 14px' },

  // Orders
  ordersSection: { display: 'flex', flexDirection: 'column' },
  orderHeaderBtn: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: transition.base },
  itemRow:   { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' },
  itemName:  { flex: 1, fontSize: font.size.sm, color: colors.text.secondary },
  itemQty:   { fontSize: font.size.sm, color: colors.text.muted, minWidth: 28, textAlign: 'right' },
  itemPrice: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, minWidth: 52, textAlign: 'right' },

  // Back
  homeBtn:   { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '13px', borderRadius: radius.xl, background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, fontSize: font.size.base, fontWeight: font.weight.medium, cursor: 'pointer', transition: transition.base, marginTop: 4 },
  outlineBtn:{ background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, cursor: 'pointer', padding: '11px 24px', transition: transition.base },
};
