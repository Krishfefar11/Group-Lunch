import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API, { updateDeliveryStatus } from '../api/api';
import socket from '../socket/socket.js';
import useSocketReconnect from '../hooks/useSocketReconnect';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';
import { DEFAULT_DELIVERY_FEE, PLATFORM_FEE, GST_RATE } from '../utils/billing';

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

// ── Status-aware hero content ─────────────────────────────────────────────────
const STATUS_HERO = {
  order_placed:     { title: 'Order Placed! ✓',   icon: '✓',  iconBg: 'linear-gradient(135deg,#10b981,#059669)', cardBg: 'rgba(16,185,129,0.06)', cardBorder: 'rgba(16,185,129,0.2)',  sub: (r) => r ? `Order sent to ${r.name} — awaiting confirmation` : 'Your group order is locked in' },
  preparing:        { title: 'Being Prepared 🍳', icon: '🍳', iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)', cardBg: 'rgba(245,158,11,0.06)', cardBorder: 'rgba(245,158,11,0.2)',  sub: (r) => r ? `${r.name} is cooking your food` : 'The restaurant is preparing your order' },
  out_for_delivery: { title: 'On the Way! 🛵',    icon: '🛵', iconBg: 'linear-gradient(135deg,#6366f1,#4f46e5)', cardBg: 'rgba(99,102,241,0.06)', cardBorder: 'rgba(99,102,241,0.2)',  sub: (r) => r ? `Food is leaving ${r.name}` : 'Your food is on the way'              },
  delivered:        { title: 'Delivered! 🎉',      icon: '🎉', iconBg: 'linear-gradient(135deg,#10b981,#059669)', cardBg: 'rgba(16,185,129,0.08)', cardBorder: 'rgba(16,185,129,0.25)', sub: ()  => 'Enjoy your meal! 🍽️'                                                   },
};

// ── Order Status Stepper ──────────────────────────────────────────────────────
const STEP_DEFS = [
  { label: 'Order Placed', icon: '✓'  },
  { label: 'Preparing',    icon: '🍳' },
  { label: 'On the Way',   icon: '🛵' },
  { label: 'Delivered',    icon: '🎉' },
];

function OrderStepper({ status }) {
  // Map backend enum values → 0-indexed step position
  const currentStep =
    status === 'delivered'        ? 3 :
    status === 'out_for_delivery' ? 2 :
    status === 'preparing'        ? 1 :
    0; // order_placed (or any earlier status) = "Group Ready"
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
      {STEP_DEFS.map((step, i) => {
        const done    = i <= currentStep;
        const current = i === currentStep;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{
                position: 'absolute', top: 13, left: '-50%', right: '50%', height: 2,
                background: i <= currentStep ? '#10b981' : 'rgba(0,0,0,0.08)',
                transition: 'background 0.4s ease',
              }} />
            )}
            <div style={{
              width: 26, height: 26, borderRadius: '50%', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: current ? 12 : 11,
              background: current
                ? 'linear-gradient(135deg,#10b981,#059669)'
                : done ? 'rgba(16,185,129,0.18)' : 'rgba(0,0,0,0.05)',
              border: done ? `1.5px solid ${done ? 'transparent' : 'rgba(0,0,0,0.1)'}` : '1.5px solid rgba(0,0,0,0.1)',
              color: done ? (current ? '#fff' : '#059669') : colors.text.muted,
              boxShadow: current ? '0 0 0 4px rgba(16,185,129,0.18)' : 'none',
              transition: 'all 0.3s ease', fontWeight: 700,
            }}>
              {done && !current
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : step.icon
              }
            </div>
            <p style={{
              fontSize: '10px', fontWeight: current ? 700 : 500, marginTop: 5,
              textAlign: 'center', lineHeight: 1.2,
              color: current ? colors.green.text : done ? colors.text.secondary : colors.text.muted,
              transition: 'all 0.3s ease',
            }}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
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
  const [expanded,       setExpanded]       = useState({});
  const [copied,         setCopied]         = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`member_${sessionId}`);
    if (stored) setMe(JSON.parse(stored));
  }, [sessionId]);

  const loadData = useCallback(async () => {
    try {
      const [sessionRes, ordersRes] = await Promise.all([
        API.get(`/sessions/${sessionId}`),
        API.get(`/sessions/${sessionId}/orders`),
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

  // Listen for order_placed + status_updated events
  useEffect(() => {
    socket.connect();
    socket.emit('join_session', sessionId);
    socket.on('order_placed', () => loadData());
    socket.on('status_updated', ({ status }) => {
      setSessionData((prev) => prev ? { ...prev, status } : prev);
    });
    return () => {
      socket.off('order_placed');
      socket.off('status_updated');
      socket.disconnect();
    };
  }, [sessionId, loadData]);

  // Reconnect guard — re-join session room and re-fetch order data on reconnect
  const { online } = useSocketReconnect(sessionId, loadData);

  // ── Derived values ────────────────────────────────────────────────────────
  const restaurant  = sessionData?.restaurant;
  const foodTotal   = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
  const savings     = sessionData?.couponSavings || 0;
  const discounted  = Math.round(foodTotal - savings);  // food after coupon
  const deliveryFee = DEFAULT_DELIVERY_FEE;
  const platformFee = PLATFORM_FEE;
  const gst         = Math.round(discounted * GST_RATE);
  const finalTotal  = discounted + deliveryFee + gst + platformFee;
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

  // Hero content changes with delivery status
  const heroContent = STATUS_HERO[sessionData?.status] || STATUS_HERO.order_placed;

  // ETA — only show when not yet delivered
  const etaPill = (() => {
    const status    = sessionData?.status;
    const placedAt  = sessionData?.placedAt;
    const delivMins = restaurant?.deliveryTimeMin;
    if (!delivMins || status === 'delivered' || !placedAt) return null;
    const eta = new Date(new Date(placedAt).getTime() + delivMins * 60000);
    const diffMs = eta - Date.now();
    if (diffMs < 0) {
      return status === 'out_for_delivery' ? 'Arriving soon' : null;
    }
    const diffMins = Math.ceil(diffMs / 60000);
    return `~${diffMins} min`;
  })();

  // Delivery status controls — organizer only
  const NEXT_STATUS = {
    order_placed:     { next: 'preparing',        label: 'Mark as Preparing',         icon: '👨‍🍳', color: '#6366f1' },
    preparing:        { next: 'out_for_delivery',  label: 'Mark as Out for Delivery',  icon: '🛵',  color: '#f59e0b' },
    out_for_delivery: { next: 'delivered',         label: 'Mark as Delivered',         icon: '🎉',  color: '#10b981' },
  };
  const nextStatusDef = NEXT_STATUS[sessionData?.status] || null;
  const isOrganizer   = me?.isOrganizer || me?.memberId === sessionData?.organizerId;

  const handleAdvanceStatus = async () => {
    if (!nextStatusDef || !isOrganizer) return;
    setStatusUpdating(true);
    try {
      await updateDeliveryStatus(sessionId, nextStatusDef.next, me.memberId);
      setSessionData((prev) => prev ? { ...prev, status: nextStatusDef.next } : prev);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update status');
    } finally {
      setStatusUpdating(false);
    }
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

      {/* ── Offline banner ────────────────────────────────────────────────── */}
      {!online && (
        <div style={s.offlineBanner}>
          <span style={s.offlineDot} />
          Connection lost · Reconnecting…
        </div>
      )}

      <div style={s.wrapper}>

        {/* ── Hero confirmation card ────────────────────────────────────── */}
        <div style={{
          ...s.heroCard,
          background: `linear-gradient(135deg, ${colors.bg.surface} 0%, ${heroContent.cardBg} 100%)`,
          border:     `1px solid ${heroContent.cardBorder}`,
        }} className="animate-scale-up">
          <div style={s.heroTop}>
            <div style={{ ...s.checkCircle, background: heroContent.iconBg }}>
              {heroContent.icon === '✓' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <span style={{ fontSize: 24, lineHeight: 1 }}>{heroContent.icon}</span>
              )}
            </div>
            <div>
              <h1 style={s.heroTitle}>{heroContent.title}</h1>
              <p style={s.heroSub}>{heroContent.sub(restaurant)}</p>
            </div>
          </div>

          {/* Meta pills */}
          <div style={s.metaRow}>
            {restaurant?.name && (
              <div style={{ ...s.metaPill, padding: restaurant.imageUrl ? '3px 10px 3px 3px' : '5px 10px' }}>
                {restaurant.imageUrl ? (
                  <img src={restaurant.imageUrl} alt={restaurant.name} style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                ) : (
                  <span>{restaurant.imageEmoji || '🍽️'}</span>
                )}
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
            {etaPill && (
              <div style={{ ...s.metaPill, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#6366f1' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><polyline points="12 7 12 12 15 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <span>{etaPill}</span>
              </div>
            )}
          </div>

          {/* Order status stepper */}
          <div style={s.stepperWrap}>
            <OrderStepper status={sessionData?.status} />
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

        {/* ── Organizer delivery controls ───────────────────────────────── */}
        {isOrganizer && nextStatusDef && (
          <div style={s.statusCard} className="animate-fade-up">
            <p style={s.statusCardTitle}>🔔 Update delivery status</p>
            <p style={s.statusCardSub}>Let the group know where their food is</p>
            <button
              style={{
                ...s.statusBtn,
                background: `linear-gradient(135deg, ${nextStatusDef.color} 0%, ${nextStatusDef.color}cc 100%)`,
                opacity: statusUpdating ? 0.7 : 1,
              }}
              onClick={handleAdvanceStatus}
              disabled={statusUpdating}
              onMouseEnter={(e) => { if (!statusUpdating) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
            >
              <span style={{ fontSize: 16 }}>{nextStatusDef.icon}</span>
              {statusUpdating ? 'Updating...' : nextStatusDef.label}
            </button>
          </div>
        )}
        {isOrganizer && !nextStatusDef && sessionData?.status === 'delivered' && (
          <div style={{ ...s.statusCard, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }} className="animate-fade-up">
            <p style={{ textAlign: 'center', fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.green.text, margin: 0 }}>
              🎉 Delivered! The group has been notified.
            </p>
          </div>
        )}

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
              <span style={s.billLabel}>Food subtotal</span>
              <span style={s.billVal}>₹{Math.round(foodTotal)}</span>
            </div>
            {savings > 0 && (
              <div style={s.billRow}>
                <span style={{ ...s.billLabel, color: colors.green.text }}>
                  Coupon {sessionData?.couponCode ? `(${sessionData.couponCode})` : ''}
                </span>
                <span style={{ ...s.billVal, color: colors.green.text }}>−₹{savings}</span>
              </div>
            )}
            <div style={s.billRow}>
              <span style={s.billLabel}>Delivery fee</span>
              <span style={s.billVal}>₹{deliveryFee}</span>
            </div>
            <div style={s.billRow}>
              <span style={s.billLabel}>GST (5%)</span>
              <span style={s.billVal}>₹{gst}</span>
            </div>
            <div style={s.billRow}>
              <span style={s.billLabel}>Platform fee</span>
              <span style={s.billVal}>₹{platformFee}</span>
            </div>
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
                    <div style={{ borderTop: `1px solid ${colors.border.subtle}`, padding: '12px 16px', background: colors.bg.raised, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(order.items || []).map((item, i) => (
                        <div key={i} style={s.itemRow}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} style={s.itemThumb} />
                          ) : null}
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.veg ? colors.veg : colors.nonVeg, flexShrink: 0 }} />
                            <span style={s.itemName}>{item.name}</span>
                          </div>
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
  stepperWrap:{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${colors.border.subtle}` },

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
  itemRow:   { display: 'flex', alignItems: 'center', gap: 8 },
  itemThumb: { width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: `1px solid ${colors.border.subtle}` },
  itemName:  { flex: 1, fontSize: font.size.sm, color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemQty:   { fontSize: font.size.sm, color: colors.text.muted, minWidth: 28, textAlign: 'right', flexShrink: 0 },
  itemPrice: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, minWidth: 52, textAlign: 'right', flexShrink: 0 },

  // Delivery status card (organizer only)
  statusCard:     { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius['2xl'], padding: '18px 20px', boxShadow: shadow.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  statusCardTitle:{ fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.text.primary, margin: 0 },
  statusCardSub:  { fontSize: font.size.xs, color: colors.text.muted, margin: '0 0 6px' },
  statusBtn:      { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px', borderRadius: radius.lg, color: '#fff', border: 'none', fontFamily: font.family, fontSize: font.size.base, fontWeight: font.weight.bold, cursor: 'pointer', transition: transition.base, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },

  // Back
  homeBtn:   { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '13px', borderRadius: radius.xl, background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, fontSize: font.size.base, fontWeight: font.weight.medium, cursor: 'pointer', transition: transition.base, marginTop: 4 },
  outlineBtn:{ background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, cursor: 'pointer', padding: '11px 24px', transition: transition.base },

  offlineBanner: { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, background: 'rgba(220,38,38,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: font.size.sm, fontWeight: font.weight.semibold, fontFamily: font.family, letterSpacing: '0.01em' },
  offlineDot:    { width: 8, height: 8, borderRadius: '50%', background: '#fff', flexShrink: 0, animation: 'pulse 1.5s ease infinite' },
};
