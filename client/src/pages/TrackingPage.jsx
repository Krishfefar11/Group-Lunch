import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket/socket.js';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

// ── Status config ────────────────────────────────────────────────────────────
const STATUSES = [
  {
    key:   'order_placed',
    label: 'Order Placed',
    emoji: '✅',
    desc:  'Your order has been confirmed!',
    color: colors.green.base,
    dim:   colors.green.dim,
    text:  colors.green.text,
  },
  {
    key:   'preparing',
    label: 'Preparing',
    emoji: '🍳',
    desc:  'Restaurant is cooking your food',
    color: colors.gold.base,
    dim:   colors.gold.dim,
    text:  colors.gold.base,
  },
  {
    key:   'out_for_delivery',
    label: 'Out for Delivery',
    emoji: '🛵',
    desc:  'Rider is on the way to you',
    color: colors.blue.base,
    dim:   colors.blue.dim,
    text:  colors.blue.text,
  },
  {
    key:   'delivered',
    label: 'Delivered!',
    emoji: '🎉',
    desc:  'Enjoy your meal!',
    color: colors.green.base,
    dim:   colors.green.dim,
    text:  colors.green.text,
  },
];

function statusIndex(key) {
  const idx = STATUSES.findIndex((s) => s.key === key);
  return idx === -1 ? 0 : idx;
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return (
    <div className="skeleton" style={{
      width, height, borderRadius: radius.sm, ...style,
    }} />
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#f0a500','#6366f1','#10b981','#ef4444','#8b5cf6','#06b6d4'];
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [sessionData,   setSessionData]   = useState(null);
  const [orders,        setOrders]        = useState([]);
  const [currentStatus, setCurrentStatus] = useState('order_placed');
  const [statusMsg,     setStatusMsg]     = useState('');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [me,            setMe]            = useState(null);
  const [placedAt,      setPlacedAt]      = useState(null);
  const [deliveryMin,   setDeliveryMin]   = useState(40);
  const [expanded,      setExpanded]      = useState({});

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
      const sess = sessionRes.data.data;
      setSessionData(sess);
      setOrders(ordersRes.data.data || []);
      if (sess.status) setCurrentStatus(sess.status);
      if (sess.placedAt) setPlacedAt(new Date(sess.placedAt));
      if (sess.restaurant?.deliveryTimeMin) setDeliveryMin(sess.restaurant.deliveryTimeMin);
    } catch {
      setError('Could not load order details.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    socket.connect();
    socket.emit('join_session', sessionId);

    socket.on('order_placed', (data) => {
      setCurrentStatus('order_placed');
      setStatusMsg(data.message || 'Order confirmed!');
      if (data.placedAt) setPlacedAt(new Date(data.placedAt));
      if (data.deliveryTimeMin) setDeliveryMin(data.deliveryTimeMin);
    });

    socket.on('status_update', (data) => {
      setCurrentStatus(data.status);
      setStatusMsg(data.message || '');
    });

    return () => {
      socket.off('order_placed');
      socket.off('status_update');
      socket.disconnect();
    };
  }, [sessionId]);

  const getETA = () => {
    if (!placedAt) return null;
    const eta = new Date(placedAt.getTime() + deliveryMin * 60 * 1000);
    return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const grandTotal  = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
  const savings     = sessionData?.couponSavings || 0;
  const finalTotal  = Math.round(grandTotal - savings);
  const curIdx      = statusIndex(currentStatus);
  const isDelivered = currentStatus === 'delivered';
  const curStatus   = STATUSES[curIdx];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.center}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 20, animation: 'float 2.5s ease infinite' }}>🛵</div>
          <p style={{ color: colors.text.secondary, fontSize: font.size.md, fontWeight: font.weight.medium }}>
            Loading order status...
          </p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: colors.gold.base,
                animation: `dotBounce 1.3s ease infinite`,
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.center}>
        <div style={{ textAlign: 'center', maxWidth: 300 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <p style={{ color: colors.red.text, marginBottom: 20, fontSize: font.size.base }}>{error}</p>
          <button style={s.outlineBtn} onClick={() => navigate(`/session/${sessionId}`)}>← Back to Session</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute',
        top: '-10%', left: '-10%',
        width: 500, height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${isDelivered ? 'rgba(16,185,129,0.07)' : 'rgba(240,165,0,0.07)'} 0%, transparent 70%)`,
        pointerEvents: 'none',
        transition: 'background 0.6s ease',
      }} />

      <div style={s.wrapper}>

        {/* ── Hero status card ──────────────────────────────────────────── */}
        <div style={s.heroCard} className="animate-scale-up">
          {/* Restaurant banner image */}
          {sessionData?.restaurant?.imageUrl && (
            <div style={s.bannerWrap}>
              <img
                src={sessionData.restaurant.imageUrl.replace('/upload/', '/upload/w_700,h_180,c_fill,q_auto,f_auto/')}
                alt={sessionData.restaurant?.name}
                style={s.bannerImg}
              />
              <div style={s.bannerOverlay} />
            </div>
          )}

          <div style={s.heroBody}>
            {/* Big status emoji */}
            <div style={{
              ...s.statusEmoji,
              background: `${curStatus.color}18`,
              border: `1px solid ${curStatus.color}40`,
            }}>
              {curStatus.emoji}
            </div>

            <div style={s.heroText}>
              <h1 style={{ ...s.heroLabel, color: isDelivered ? colors.green.text : colors.text.primary }}>
                {curStatus.label}
              </h1>
              <p style={s.heroDesc}>{statusMsg || curStatus.desc}</p>
            </div>

            {/* ETA & address row */}
            <div style={s.heroMeta}>
              {!isDelivered && getETA() && (
                <div style={s.metaPill}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke={colors.text.muted} strokeWidth="1.8"/>
                    <polyline points="12 6 12 12 16 14" stroke={colors.text.muted} strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <span>ETA {getETA()}</span>
                </div>
              )}
              {isDelivered && (
                <div style={{ ...s.metaPill, background: colors.green.dim, borderColor: 'rgba(16,185,129,0.2)', color: colors.green.text }}>
                  🎊 Delivered at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {sessionData?.deliveryAddress && (
                <div style={s.metaPill}>
                  <span>📍</span>
                  <span>{sessionData.deliveryAddress}</span>
                </div>
              )}
              {sessionData?.restaurant?.name && (
                <div style={s.metaPill}>
                  <span>🍽️</span>
                  <span>{sessionData.restaurant.name}</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div style={s.progressBar}>
              <div style={{
                ...s.progressFill,
                width: `${((curIdx + 1) / STATUSES.length) * 100}%`,
                background: isDelivered
                  ? `linear-gradient(90deg, ${colors.green.base}, #34d399)`
                  : `linear-gradient(90deg, ${colors.gold.soft}, ${colors.gold.bright})`,
                boxShadow: isDelivered
                  ? `0 0 10px ${colors.green.base}60`
                  : `0 0 10px ${colors.gold.base}60`,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: colors.text.muted }}>Order placed</span>
              <span style={{ fontSize: 10, color: curStatus.text, fontWeight: 600 }}>{curStatus.label}</span>
            </div>
          </div>
        </div>

        {/* ── Status timeline ───────────────────────────────────────────── */}
        <div style={s.timelineCard} className="animate-fade-up" style2={{ animationDelay: '0.1s' }}>
          <p style={s.sectionLabel}>Order Progress</p>

          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{
              position:   'absolute',
              left:       18,
              top:        20,
              bottom:     24,
              width:      2,
              background: `linear-gradient(to bottom, ${colors.gold.base}60, ${colors.border.subtle})`,
              borderRadius: 2,
            }} />

            {STATUSES.map((step, idx) => {
              const done   = idx <= curIdx;
              const active = idx === curIdx;

              return (
                <div key={step.key} style={s.timelineStep}>
                  {/* Dot */}
                  <div style={{
                    ...s.timelineDot,
                    background:   done ? step.color : colors.bg.overlay,
                    border:       `2px solid ${done ? step.color : colors.border.default}`,
                    transform:    active ? 'scale(1.2)' : 'scale(1)',
                    boxShadow:    active ? `0 0 0 4px ${step.color}22` : 'none',
                    zIndex:       1,
                  }}>
                    {done ? (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : null}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingLeft: 2 }}>
                    <p style={{
                      ...s.timelineTitle,
                      color: done ? colors.text.primary : colors.text.muted,
                      fontWeight: active ? font.weight.bold : font.weight.medium,
                    }}>
                      {step.emoji} {step.label}
                    </p>
                    {active && (
                      <p style={s.timelineDesc}>
                        {statusMsg || step.desc}
                      </p>
                    )}
                  </div>

                  {active && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: step.color,
                      animation: 'pulse 1.5s ease infinite',
                      flexShrink: 0,
                      alignSelf: 'center',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bill summary ──────────────────────────────────────────────── */}
        <div style={s.billCard} className="animate-fade-up" style2={{ animationDelay: '0.15s' }}>
          <div style={s.billHeader}>
            <p style={s.sectionLabel}>Bill Summary</p>
            <div style={s.billTotal}>
              <span style={{ fontSize: font.size.xs, color: colors.text.muted, letterSpacing: '0.06em' }}>TOTAL PAID</span>
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
              <span>Each person pays ~<strong style={{ color: colors.text.primary }}>₹{Math.round(finalTotal / orders.length)}</strong></span>
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
                  transition:   transition.base,
                }}>
                  {/* Header — always visible */}
                  <button
                    style={s.orderHeaderBtn}
                    onClick={() => setExpanded(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                  >
                    <MemberAvatar name={order.memberName} index={idx} size={36} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary }}>
                        {order.memberName}
                        {isMe && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: font.size.xs,
                            fontWeight: font.weight.bold,
                            color: colors.gold.base,
                            background: colors.gold.dim,
                            border: '1px solid rgba(240,165,0,0.2)',
                            borderRadius: radius.full,
                            padding: '1px 8px',
                          }}>you</span>
                        )}
                      </div>
                      <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginTop: 2 }}>
                        {orderQty} item{orderQty !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text.primary }}>
                        ₹{Math.round(order.subtotal)}
                      </span>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}
                      >
                        <path d="M5 9l7 7 7-7" stroke={colors.text.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div style={{
                      borderTop: `1px solid ${colors.border.subtle}`,
                      padding:   '12px 16px',
                      background: colors.bg.raised,
                    }}>
                      {(order.items || []).map((item, i) => (
                        <div key={i} style={s.itemRow}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: item.veg ? colors.veg : colors.nonVeg,
                            flexShrink: 0,
                          }} />
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

        {/* ── Back button ───────────────────────────────────────────────── */}
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
  page:    {
    minHeight:  '100vh',
    background: colors.bg.base,
    padding:    '24px 0 0',
    position:   'relative',
    overflow:   'hidden',
  },
  center:  {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     colors.bg.base,
  },
  wrapper: {
    maxWidth: 560,
    margin:   '0 auto',
    padding:  '0 16px',
    position: 'relative',
    zIndex:   1,
    display:  'flex',
    flexDirection: 'column',
    gap:      12,
  },

  // Hero card
  heroCard: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius['2xl'],
    overflow:     'hidden',
    boxShadow:    shadow.lg,
  },
  bannerWrap: {
    position: 'relative',
    height:   160,
    overflow: 'hidden',
  },
  bannerImg: {
    width:      '100%',
    height:     '100%',
    objectFit:  'cover',
    display:    'block',
  },
  bannerOverlay: {
    position: 'absolute',
    inset:    0,
    background: 'linear-gradient(to bottom, rgba(8,8,16,0.2) 0%, rgba(8,8,16,0.8) 100%)',
  },
  heroBody: {
    padding: '20px',
  },
  statusEmoji: {
    width:          48,
    height:         48,
    borderRadius:   radius.lg,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       22,
    marginBottom:   14,
    transition:     transition.slow,
  },
  heroText: {
    marginBottom: 16,
  },
  heroLabel: {
    fontSize:      font.size.xl,
    fontWeight:    font.weight.extrabold,
    letterSpacing: '-0.025em',
    marginBottom:  6,
    transition:    transition.slow,
  },
  heroDesc: {
    fontSize:   font.size.sm,
    color:      colors.text.secondary,
    lineHeight: 1.55,
    margin:     0,
  },
  heroMeta: {
    display:  'flex',
    flexWrap: 'wrap',
    gap:      6,
    marginBottom: 16,
  },
  metaPill: {
    display:      'flex',
    alignItems:   'center',
    gap:          5,
    padding:      '5px 10px',
    borderRadius: radius.full,
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.subtle}`,
    fontSize:     font.size.xs,
    color:        colors.text.secondary,
    fontWeight:   font.weight.medium,
  },
  progressBar: {
    height:       4,
    background:   colors.bg.overlay,
    borderRadius: radius.full,
    overflow:     'hidden',
  },
  progressFill: {
    height:       '100%',
    borderRadius: radius.full,
    transition:   'width 0.8s cubic-bezier(0.22,1,0.36,1)',
  },

  // Timeline
  timelineCard: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius['2xl'],
    padding:      '20px',
    boxShadow:    shadow.card,
  },
  timelineStep: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        14,
    padding:    '10px 0',
    position:   'relative',
  },
  timelineDot: {
    width:          38,
    height:         38,
    borderRadius:   radius.full,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    transition:     'all 0.4s cubic-bezier(0.22,1,0.36,1)',
    marginTop:      1,
  },
  timelineTitle: {
    fontSize:   font.size.base,
    margin:     '0 0 3px',
    letterSpacing: '-0.01em',
    transition: 'color 0.3s',
  },
  timelineDesc: {
    fontSize:   font.size.sm,
    color:      colors.text.muted,
    margin:     0,
    fontStyle:  'italic',
  },

  // Bill
  billCard: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius['2xl'],
    padding:      '20px',
    boxShadow:    shadow.card,
  },
  billHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   16,
  },
  billTotal: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'flex-end',
    gap:           2,
  },
  billRows: {
    display:       'flex',
    flexDirection: 'column',
    gap:           10,
    paddingBottom: 14,
    borderBottom:  `1px dashed ${colors.border.subtle}`,
    marginBottom:  12,
  },
  billRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  billLabel:   { fontSize: font.size.sm, color: colors.text.secondary },
  billVal:     { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary },
  splitBadge: {
    display:      'flex',
    alignItems:   'center',
    gap:          8,
    background:   'rgba(245,158,11,0.07)',
    border:       '1px solid rgba(245,158,11,0.18)',
    borderRadius: radius.lg,
    padding:      '10px 14px',
    fontSize:     font.size.sm,
    color:        colors.text.secondary,
  },

  // Section label
  sectionLabel: {
    fontSize:      font.size.xs,
    fontWeight:    font.weight.bold,
    color:         colors.text.muted,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom:  14,
    margin:        '0 0 14px',
  },

  // Orders section
  ordersSection: {
    display:       'flex',
    flexDirection: 'column',
  },
  orderHeaderBtn: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
    width:      '100%',
    padding:    '14px 16px',
    background: 'transparent',
    border:     'none',
    cursor:     'pointer',
    textAlign:  'left',
    transition: transition.base,
  },

  // Items
  itemRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
    padding:    '5px 0',
  },
  itemName:  { flex: 1, fontSize: font.size.sm, color: colors.text.secondary },
  itemQty:   { fontSize: font.size.sm, color: colors.text.muted, minWidth: 28, textAlign: 'right' },
  itemPrice: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, minWidth: 52, textAlign: 'right' },

  // Back button
  homeBtn: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          '100%',
    padding:        '13px',
    borderRadius:   radius.xl,
    background:     'transparent',
    color:          colors.text.secondary,
    border:         `1px solid ${colors.border.default}`,
    fontSize:       font.size.base,
    fontWeight:     font.weight.medium,
    cursor:         'pointer',
    transition:     transition.base,
    marginTop:      4,
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
};
