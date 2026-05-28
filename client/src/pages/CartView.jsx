import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket/socket.js';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

const AVATAR_COLORS = ['#f0a500','#6366f1','#10b981','#ef4444','#8b5cf6','#06b6d4'];

export default function CartView() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [orders,   setOrders]   = useState([]);
  const [session,  setSession]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [me,       setMe]       = useState(null);

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
  useEffect(() => {
    const interval = setInterval(fetchCart, 5000);
    return () => clearInterval(interval);
  }, [fetchCart]);

  useEffect(() => {
    socket.connect();
    socket.emit('join_session', sessionId);
    socket.on('order_placed', () => navigate(`/session/${sessionId}/tracking`));
    socket.on('status_update', () => navigate(`/session/${sessionId}/tracking`));
    return () => { socket.off('order_placed'); socket.off('status_update'); socket.disconnect(); };
  }, [sessionId, navigate]);

  useEffect(() => {
    if (session?.status && !['collecting','restaurant_picked','ordering'].includes(session.status)) {
      navigate(`/session/${sessionId}/tracking`);
    }
  }, [session?.status, sessionId, navigate]);

  const grandTotal    = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
  const totalItems    = orders.reduce((s, o) => s + (o.items || []).reduce((si, i) => si + i.qty, 0), 0);
  const sessionMembers = session?.members || [];
  const orderedIds    = new Set(orders.map((o) => o.memberId));
  const pendingMembers = sessionMembers.filter((m) => !orderedIds.has(m.memberId));

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

        {/* ── Header ────────────────────────────────────────────────────── */}
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

        {/* ── Grand total banner ────────────────────────────────────────── */}
        <div style={s.totalCard} className="animate-fade-up">
          <div>
            <p style={s.totalLabel}>Group Total</p>
            <p style={s.totalNum}>₹{Math.round(grandTotal)}</p>
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
                  <span style={s.totalStatNum}>₹{Math.round(grandTotal / orders.length)}</span>
                  <span style={s.totalStatLabel}>each</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Pending members ───────────────────────────────────────────── */}
        {pendingMembers.length > 0 && (
          <div style={s.pendingBox}>
            <div style={s.pendingDot} />
            <div>
              <p style={s.pendingTitle}>Still ordering:</p>
              <p style={s.pendingNames}>{pendingMembers.map((m) => m.memberName).join(', ')}</p>
            </div>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {orders.length === 0 && (
          <div style={s.emptyBox}>
            <span style={{ fontSize: 36, marginBottom: 12, display: 'block' }}>🍽️</span>
            <p style={s.emptyText}>No orders yet. Everyone needs to pick items from the menu.</p>
            <button style={s.goldBtn} onClick={() => navigate(`/session/${sessionId}/menu`)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
            >
              Go to Menu →
            </button>
          </div>
        )}

        {/* ── Per-member order cards ────────────────────────────────────── */}
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
                  onMouseEnter={(e) => { e.currentTarget.style.color = colors.text.gold; e.currentTarget.style.borderColor = colors.gold.muted; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = colors.text.muted; e.currentTarget.style.borderColor = colors.border.default; }}
                >
                  Edit my order
                </button>
              )}
            </div>
          );
        })}

        {/* ── Organizer CTA ────────────────────────────────────────────── */}
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
  page:   { minHeight: '100vh', background: colors.bg.base, position: 'relative', overflow: 'hidden' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  blob:   { position: 'absolute', bottom: '-10%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none' },
  wrapper:{ maxWidth: 540, margin: '0 auto', padding: '28px 16px 0', position: 'relative', zIndex: 1 },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 },
  backBtn:{ width: 34, height: 34, borderRadius: radius.md, background: colors.bg.surface, border: `1px solid ${colors.border.default}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: transition.fast },
  pageTitle:{ fontSize: font.size['2xl'], fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.025em', margin: '0 0 2px' },
  pageSub:  { fontSize: font.size.sm, color: colors.text.muted, margin: 0 },

  // Total card
  totalCard: {
    background:   `linear-gradient(135deg, ${colors.bg.raised} 0%, ${colors.bg.overlay} 100%)`,
    border:       `1px solid ${colors.gold.muted}`,
    borderRadius: radius['2xl'],
    padding:      '20px 24px',
    marginBottom: 16,
    display:      'flex',
    justifyContent: 'space-between',
    alignItems:   'center',
    boxShadow:    `${shadow.card}, ${colors.gold.glow}`,
  },
  totalLabel:   { fontSize: font.size.xs, color: colors.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 },
  totalNum:     { fontSize: font.size['3xl'], fontWeight: font.weight.black, color: colors.text.primary, letterSpacing: '-0.03em' },
  totalRight:   { display: 'flex', gap: 16, alignItems: 'center' },
  totalStat:    { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  totalStatNum: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary, lineHeight: 1.1 },
  totalStatLabel:{ fontSize: font.size.xs, color: colors.text.muted, letterSpacing: '0.04em' },
  totalDivider: { width: 1, height: 28, background: colors.border.subtle },

  // Pending
  pendingBox:   { display: 'flex', alignItems: 'flex-start', gap: 12, background: colors.amber.dim, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: radius.lg, padding: '12px 16px', marginBottom: 16 },
  pendingDot:   { width: 8, height: 8, borderRadius: '50%', background: colors.amber.base, marginTop: 5, flexShrink: 0, animation: 'pulse 2s ease infinite' },
  pendingTitle: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.amber.text, margin: '0 0 2px' },
  pendingNames: { fontSize: font.size.sm, color: colors.text.secondary, margin: 0 },

  emptyBox: { textAlign: 'center', padding: '40px 0' },
  emptyText:{ fontSize: font.size.sm, color: colors.text.muted, marginBottom: 20, lineHeight: 1.6 },

  // Order cards
  orderCard:  { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, padding: '16px', marginBottom: 10, boxShadow: shadow.sm },
  orderHeader:{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar:     { width: 38, height: 38, borderRadius: radius.full, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: font.size.md, fontWeight: font.weight.bold, flexShrink: 0 },
  orderMeta:  { flex: 1 },
  orderName:  { fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary, margin: '0 0 2px' },
  orderQtyText:{ fontSize: font.size.xs, color: colors.text.muted, margin: 0 },
  orderSubtotal:{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary },

  itemList:  { borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  itemRow:   { display: 'flex', alignItems: 'center', gap: 8 },
  vegDot:    { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  itemName:  { flex: 1, fontSize: font.size.sm, color: colors.text.secondary },
  itemQty:   { fontSize: font.size.sm, color: colors.text.muted, minWidth: 28, textAlign: 'right' },
  itemPrice: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, minWidth: 52, textAlign: 'right' },

  editBtn: { marginTop: 14, width: '100%', padding: '8px', borderRadius: radius.md, background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.muted, fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, cursor: 'pointer', transition: transition.base },

  proceedBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', background: colors.gold.base, color: colors.text.inverse, border: 'none', borderRadius: radius.xl, fontFamily: font.family, fontSize: font.size.lg, fontWeight: font.weight.bold, cursor: 'pointer', padding: '16px', marginTop: 20, marginBottom: 12, transition: transition.base, boxShadow: '0 4px 20px rgba(240,165,0,0.25)', letterSpacing: '-0.01em' },
  waitNote:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', fontSize: font.size.sm, color: colors.text.muted, marginTop: 20 },
  autoRefresh:{ textAlign: 'center', fontSize: font.size.xs, color: colors.text.muted, marginTop: 12, letterSpacing: '0.02em' },
  outlineBtn: { background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, cursor: 'pointer', padding: '11px 24px', transition: transition.base },
  goldBtn:    { display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.gold.base, color: colors.text.inverse, border: 'none', borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, fontWeight: font.weight.bold, cursor: 'pointer', padding: '12px 28px', transition: transition.base, boxShadow: '0 4px 20px rgba(240,165,0,0.25)', margin: '0 auto' },
};
