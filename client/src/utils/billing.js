// ── Shared billing constants ───────────────────────────────────────────────────
// Kept in one place so CartView and TrackingPage always agree.

export const DEFAULT_DELIVERY_FEE = 40;   // ₹
export const PLATFORM_FEE         = 5;    // ₹
export const GST_RATE             = 0.05; // 5%

/**
 * Compute the full bill for a group order.
 *
 * @param {number} foodTotal     Sum of all member order subtotals
 * @param {number} savings       Coupon savings (0 if none)
 * @param {number} deliveryFee   Delivery fee (defaults to DEFAULT_DELIVERY_FEE)
 * @returns {{ discounted, gst, platformFee, deliveryFee, finalTotal }}
 */
export function computeBill(foodTotal, savings = 0, deliveryFee = DEFAULT_DELIVERY_FEE) {
  const discounted  = Math.round(foodTotal - savings);
  const gst         = Math.round(discounted * GST_RATE);
  const finalTotal  = discounted + deliveryFee + gst + PLATFORM_FEE;
  return { discounted, gst, platformFee: PLATFORM_FEE, deliveryFee, finalTotal };
}
