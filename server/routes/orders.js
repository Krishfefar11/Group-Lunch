const express = require('express');
const router  = express.Router();
const { Session, Restaurant, MenuItem, Order, OrderItem } = require('../models/index');
const requireOrganizer = require('../middleware/requireOrganizer');

// ── GET /api/sessions/:sessionId/menu ─────────────────────────────────────
// Returns the session's selected restaurant + its full menu
router.get('/:sessionId/menu', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ where: { sessionUuid: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (!session.selectedRestaurantId) {
      return res.status(400).json({ success: false, message: 'No restaurant selected yet' });
    }

    const restaurant = await Restaurant.findByPk(session.selectedRestaurantId, {
      include: [{ model: MenuItem, as: 'menuItems', order: [['category', 'ASC'], ['name', 'ASC']] }],
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Group menu items by category
    const menu = {};
    (restaurant.menuItems || []).forEach((item) => {
      const cat = item.category || 'Other';
      if (!menu[cat]) menu[cat] = [];
      menu[cat].push({
        id:           item.id,
        itemCode:     item.itemCode,
        name:         item.name,
        description:  item.description,
        price:        item.price,
        veg:          item.veg,
        jainFriendly: item.jainFriendly,
        tags:         item.tags || [],
        category:     item.category,
      });
    });

    res.json({
      success: true,
      data: {
        restaurant: {
          id:              restaurant.id,
          name:            restaurant.name,
          cuisines:        restaurant.cuisines,
          rating:          restaurant.rating,
          deliveryTimeMin: restaurant.deliveryTimeMin,
          pricePerPerson:  restaurant.pricePerPerson,
          vegFriendly:     restaurant.vegFriendly,
          jainFriendly:    restaurant.jainFriendly,
          imageEmoji:      restaurant.imageEmoji,
          area:            restaurant.area,
        },
        menu,
        sessionStatus: session.status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/sessions/:sessionId/orders ──────────────────────────────────
// Member submits / updates their order for the session
// Body: { memberId, memberName, items: [{ itemCode, name, price, qty, veg }] }
router.post('/:sessionId/orders', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { memberId, memberName, items } = req.body;

    if (!memberId || !memberName) {
      return res.status(400).json({ success: false, message: 'memberId and memberName are required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array is required and must not be empty' });
    }

    const session = await Session.findOne({ where: { sessionUuid: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (!session.selectedRestaurantId) {
      return res.status(400).json({ success: false, message: 'No restaurant selected yet' });
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    // Find or create the Order row for this member in this session
    let order = await Order.findOne({ where: { sessionUuid: sessionId, memberId } });

    if (order) {
      // Delete old items and replace
      await OrderItem.destroy({ where: { orderId: order.id } });
      await order.update({ memberName, subtotal, confirmed: false });
    } else {
      order = await Order.create({
        sessionUuid: sessionId,
        memberId,
        memberName,
        restaurantId: session.selectedRestaurantId,
        subtotal,
        confirmed: false,
      });
    }

    // Insert new order items (notes trimmed & capped at 120 chars for safety)
    const orderItems = items.map((i) => ({
      orderId:  order.id,
      itemCode: i.itemCode,
      name:     i.name,
      price:    i.price,
      qty:      i.qty,
      veg:      i.veg ?? true,
      notes:    i.notes ? String(i.notes).trim().slice(0, 120) : null,
    }));
    await OrderItem.bulkCreate(orderItems);

    // Notify other members
    if (req.io) {
      req.io.to(sessionId).emit('order_updated', { memberId, memberName, subtotal });
    }

    res.status(201).json({
      success: true,
      message: `Order saved for ${memberName}`,
      data: {
        orderId:  order.id,
        subtotal,
        itemCount: items.reduce((s, i) => s + i.qty, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/sessions/:sessionId/orders ───────────────────────────────────
// Returns all orders for the session (for cart view in Stage 7)
router.get('/:sessionId/orders', async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { sessionUuid: req.params.sessionId },
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'ASC']],
    });
    const total = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
    res.json({ success: true, count: orders.length, total: Math.round(total), data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/sessions/:sessionId/place-order ─────────────────────────────
// Organizer finalises the group order.
// Body: { deliveryAddress }
// Sets session status → 'order_placed', broadcasts 'order_placed' socket event.
// The organiser then uses the Zomato / Swiggy deep-link to actually place the order.
router.post('/:sessionId/place-order', requireOrganizer, async (req, res) => {
  try {
    const { sessionId }      = req.params;
    const { deliveryAddress } = req.body;

    const session = await Session.findOne({ where: { sessionUuid: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.status === 'order_placed' || session.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Order has already been placed.' });
    }
    if (!session.selectedRestaurantId) {
      return res.status(400).json({ success: false, message: 'No restaurant selected yet.' });
    }

    // Fetch orders + restaurant for the confirmation payload
    const [orders, restaurant] = await Promise.all([
      Order.findAll({
        where:   { sessionUuid: sessionId },
        include: [{ model: OrderItem, as: 'items' }],
      }),
      Restaurant.findByPk(session.selectedRestaurantId),
    ]);

    if (orders.length === 0) {
      return res.status(400).json({ success: false, message: 'No orders to place.' });
    }

    const grandTotal  = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
    const savings     = session.couponSavings || 0;
    const finalTotal  = Math.round(grandTotal - savings);
    const placedAt    = new Date();
    const deliveryMin = restaurant?.deliveryTimeMin || 40;

    // Persist to DB
    await session.update({
      status:          'order_placed',
      deliveryAddress: deliveryAddress || 'Office',
      placedAt,
    });

    // Mark all member orders as confirmed
    await Order.update({ confirmed: true }, { where: { sessionUuid: sessionId } });

    // Broadcast immediately to all session members so they navigate to summary
    if (req.io) {
      req.io.to(sessionId).emit('order_placed', {
        restaurantName:  restaurant?.name,
        deliveryAddress: deliveryAddress || 'Office',
        finalTotal,
        placedAt,
        deliveryTimeMin: restaurant?.deliveryTimeMin || 40,
      });
    }

    res.json({
      success: true,
      message: `Order placed at ${restaurant?.name}! Estimated delivery: ${deliveryMin} min.`,
      data: {
        sessionId,
        restaurantName:  restaurant?.name,
        deliveryAddress: deliveryAddress || 'Office',
        grandTotal:      Math.round(grandTotal),
        couponSavings:   Math.round(savings),
        finalTotal,
        orderCount:      orders.length,
        placedAt,
        deliveryTimeMin: deliveryMin,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
