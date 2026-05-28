const express   = require('express');
const router    = express.Router();
const Razorpay  = require('razorpay');
const crypto    = require('crypto');
const { Session, Order, OrderItem, Restaurant } = require('../models/index');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Shared delivery timer helper ──────────────────────────────────────────
function startDeliveryTimer(io, sessionId, deliveryMin) {
  const prepMs      = Math.min(deliveryMin * 0.3, 10) * 1000;
  const outMs       = Math.min(deliveryMin * 0.6, 20) * 1000;
  const deliveredMs = Math.min(deliveryMin * 1.0, 35) * 1000;

  setTimeout(async () => {
    io.to(sessionId).emit('status_update', { status: 'preparing', message: 'Restaurant is preparing your food 🍳' });
    await Session.update({ status: 'preparing' }, { where: { sessionUuid: sessionId } }).catch(() => {});
  }, prepMs);

  setTimeout(async () => {
    io.to(sessionId).emit('status_update', { status: 'out_for_delivery', message: 'Rider is on the way 🛵' });
    await Session.update({ status: 'out_for_delivery' }, { where: { sessionUuid: sessionId } }).catch(() => {});
  }, outMs);

  setTimeout(async () => {
    io.to(sessionId).emit('status_update', { status: 'delivered', message: 'Order delivered! Enjoy your meal 🎉' });
    await Session.update({ status: 'delivered' }, { where: { sessionUuid: sessionId } }).catch(() => {});
  }, deliveredMs);
}

// ── POST /api/sessions/:sessionId/create-payment ──────────────────────────
// Creates a Razorpay order for the session total and returns the order ID
router.post('/:sessionId/create-payment', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ where: { sessionUuid: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (!session.selectedRestaurantId) {
      return res.status(400).json({ success: false, message: 'No restaurant selected yet' });
    }

    const [orders, restaurant] = await Promise.all([
      Order.findAll({ where: { sessionUuid: sessionId } }),
      Restaurant.findByPk(session.selectedRestaurantId),
    ]);

    if (orders.length === 0) {
      return res.status(400).json({ success: false, message: 'No orders found. Ask everyone to pick their items first.' });
    }

    const grandTotal = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
    const savings    = session.couponSavings || 0;
    const finalTotal = Math.round(grandTotal - savings);

    // Razorpay amount is in paise (₹1 = 100 paise)
    const razorpayOrder = await razorpay.orders.create({
      amount:   finalTotal * 100,
      currency: 'INR',
      receipt:  `grplunch_${sessionId.slice(0, 8)}`,
      notes: {
        sessionId,
        restaurantName: restaurant?.name || '',
        memberCount:    orders.length,
      },
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount:          razorpayOrder.amount,   // in paise
        currency:        razorpayOrder.currency,
        keyId:           process.env.RAZORPAY_KEY_ID,
        finalTotal,
        restaurantName:  restaurant?.name,
        memberCount:     orders.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/sessions/:sessionId/verify-payment ──────────────────────────
// Verifies Razorpay signature, then places the order
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, deliveryAddress }
router.post('/:sessionId/verify-payment', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, deliveryAddress } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields.' });
    }

    // ── Verify HMAC signature ─────────────────────────────────────────────
    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // ── Payment is genuine — place the order ──────────────────────────────
    const session = await Session.findOne({ where: { sessionUuid: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.status === 'order_placed' || session.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Order has already been placed.' });
    }

    const [orders, restaurant] = await Promise.all([
      Order.findAll({ where: { sessionUuid: sessionId }, include: [{ model: OrderItem, as: 'items' }] }),
      Restaurant.findByPk(session.selectedRestaurantId),
    ]);

    const grandTotal = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
    const savings    = session.couponSavings || 0;
    const finalTotal = Math.round(grandTotal - savings);
    const placedAt   = new Date();

    await session.update({
      status:          'order_placed',
      deliveryAddress: deliveryAddress || 'Office',
      placedAt,
      orderId:         razorpay_payment_id, // store Razorpay payment ID as reference
    });

    await Order.update({ confirmed: true }, { where: { sessionUuid: sessionId } });

    // Broadcast to all session members
    if (req.io) {
      req.io.to(sessionId).emit('order_placed', {
        restaurantName:  restaurant?.name,
        deliveryAddress: deliveryAddress || 'Office',
        finalTotal,
        placedAt,
        deliveryTimeMin: restaurant?.deliveryTimeMin || 40,
        paymentId:       razorpay_payment_id,
      });

      startDeliveryTimer(req.io, sessionId, restaurant?.deliveryTimeMin || 40);
    }

    res.json({
      success: true,
      message: `Payment verified! Order placed at ${restaurant?.name}.`,
      data: {
        paymentId:   razorpay_payment_id,
        finalTotal,
        placedAt,
        restaurantName: restaurant?.name,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
