const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { Session, Order, Coupon } = require('../models/index');

// ── Shared helper: calculate savings for a coupon against a total ─────────
function calcSavings(coupon, total) {
  if (total < coupon.minOrderValue) return 0;
  let savings = coupon.discountType === 'flat'
    ? coupon.value
    : Math.round((total * coupon.value) / 100);
  if (coupon.maxDiscount) savings = Math.min(savings, coupon.maxDiscount);
  return Math.min(savings, total); // can't save more than total
}

// ── GET /api/sessions/:sessionId/coupons/best ─────────────────────────────
// Auto-picks the coupon that saves the most for this session's cart total
router.get('/:sessionId/coupons/best', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Sum up all confirmed orders for this session
    const orders = await Order.findAll({ where: { sessionUuid: sessionId } });
    const total  = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);

    if (total === 0) {
      return res.status(400).json({ success: false, message: 'No orders found for this session.' });
    }

    // Fetch all active, non-expired coupons
    const now = new Date();
    const coupons = await Coupon.findAll({
      where: {
        active: true,
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: now } }],
      },
    });

    if (coupons.length === 0) {
      return res.json({ success: true, best: null, total: Math.round(total), message: 'No coupons available.' });
    }

    // Score every eligible coupon and pick the one with max savings
    const scored = coupons
      .map((c) => ({ coupon: c, savings: calcSavings(c, total) }))
      .filter((x) => x.savings > 0)
      .sort((a, b) => b.savings - a.savings);

    if (scored.length === 0) {
      return res.json({
        success: true,
        best: null,
        total: Math.round(total),
        message: `No coupon applies to an order of ₹${Math.round(total)}.`,
      });
    }

    const { coupon, savings } = scored[0];
    res.json({
      success: true,
      total:    Math.round(total),
      best: {
        code:         coupon.code,
        description:  coupon.description,
        discountType: coupon.discountType,
        value:        coupon.value,
        minOrderValue:coupon.minOrderValue,
        maxDiscount:  coupon.maxDiscount,
        savings:      Math.round(savings),
        finalTotal:   Math.round(total - savings),
      },
      allEligible: scored.slice(0, 5).map((x) => ({
        code:    x.coupon.code,
        savings: Math.round(x.savings),
        description: x.coupon.description,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/sessions/:sessionId/coupon ──────────────────────────────────
// Applies (or removes) a coupon to the session
// Body: { code } — pass code: "" or code: null to remove coupon
router.post('/:sessionId/coupon', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code }      = req.body;

    const session = await Session.findOne({ where: { sessionUuid: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Remove coupon
    if (!code || code.trim() === '') {
      await session.update({
        couponCode: null, couponDiscountType: null,
        couponDiscountValue: null, couponSavings: null,
      });
      return res.json({ success: true, message: 'Coupon removed', data: { savings: 0, finalTotal: null } });
    }

    // Validate coupon
    const now = new Date();
    const coupon = await Coupon.findOne({
      where: {
        code: code.trim().toUpperCase(),
        active: true,
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: now } }],
      },
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: `Coupon "${code}" is invalid or expired.` });
    }

    // Get cart total
    const orders = await Order.findAll({ where: { sessionUuid: sessionId } });
    const total  = orders.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);

    if (total < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `This coupon requires a minimum order of ₹${coupon.minOrderValue}. Your total is ₹${Math.round(total)}.`,
      });
    }

    const savings    = calcSavings(coupon, total);
    const finalTotal = Math.round(total - savings);

    await session.update({
      couponCode:          coupon.code,
      couponDiscountType:  coupon.discountType,
      couponDiscountValue: coupon.value,
      couponSavings:       Math.round(savings),
    });

    res.json({
      success: true,
      message: `Coupon ${coupon.code} applied! You save ₹${Math.round(savings)}.`,
      data: {
        code:         coupon.code,
        description:  coupon.description,
        discountType: coupon.discountType,
        value:        coupon.value,
        savings:      Math.round(savings),
        originalTotal:Math.round(total),
        finalTotal,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
