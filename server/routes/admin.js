const express = require('express');
const router  = express.Router();
const { Session, SessionMember, Preference, Restaurant, Order, OrderItem } = require('../models/index');

const ACTIVE_STATUSES = ['collecting', 'restaurant_picked', 'ordering'];
const PAID_STATUSES   = ['order_placed', 'preparing', 'out_for_delivery', 'delivered'];

// ── GET /api/admin/dashboard ─────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const sessions = await Session.findAll({
      include: [
        { model: SessionMember, as: 'members' },
        { model: Preference,    as: 'preferences' },
        { model: Restaurant,    as: 'restaurant' },
        { model: Order,         as: 'orders', include: [{ model: OrderItem, as: 'items' }] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    const stats = {
      totalSessions:  sessions.length,
      activeSessions: sessions.filter((s) => ACTIVE_STATUSES.includes(s.status)).length,
      ordersPlaced:   sessions.filter((s) => PAID_STATUSES.includes(s.status)).length,
      totalRevenue:   sessions
        .filter((s) => PAID_STATUSES.includes(s.status))
        .reduce((sum, s) => {
          const gross = (s.orders || []).reduce((t, o) => t + (o.subtotal || 0), 0);
          return sum + gross - (s.couponSavings || 0);
        }, 0),
    };

    const data = sessions.map((s) => {
      const orderTotal = (s.orders || []).reduce((t, o) => t + (o.subtotal || 0), 0);
      return {
        id:                s.id,
        sessionUuid:       s.sessionUuid,
        organizerName:     s.organizerName,
        status:            s.status,
        createdAt:         s.createdAt,
        placedAt:          s.placedAt,
        deliveryAddress:   s.deliveryAddress || '',
        couponCode:        s.couponCode     || null,
        couponSavings:     s.couponSavings  || 0,
        orderTotal,
        finalTotal:        Math.max(0, orderTotal - (s.couponSavings || 0)),
        memberCount:       (s.members     || []).length,
        preferencesCount:  (s.preferences || []).length,
        restaurant:        s.restaurant ? {
          id:              s.restaurant.id,
          name:            s.restaurant.name,
          cuisines:        s.restaurant.cuisines,
          rating:          parseFloat(s.restaurant.rating),
          imageEmoji:      s.restaurant.imageEmoji,
          deliveryTimeMin: s.restaurant.deliveryTimeMin,
        } : null,
        members: (s.members || []).map((m) => ({
          memberId:               m.memberId,
          memberName:             m.memberName,
          hasSubmittedPreference: m.hasSubmittedPreference,
          hasConfirmedOrder:      m.hasConfirmedOrder,
        })),
        preferences: (s.preferences || []).map((p) => ({
          memberName: p.memberName,
          cuisine:    p.cuisine,
          diet:       p.diet,
          budget:     p.budget,
        })),
        orders: (s.orders || []).map((o) => ({
          memberName: o.memberName,
          subtotal:   o.subtotal,
          confirmed:  o.confirmed,
          items:      (o.items || []).map((i) => ({
            name:     i.name,
            qty:      i.qty,
            price:    i.price,
            veg:      i.veg,
          })),
        })),
      };
    });

    res.json({ success: true, stats, sessions: data });
  } catch (err) {
    console.error('Admin dashboard error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
