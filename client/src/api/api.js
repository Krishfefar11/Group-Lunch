import axios from 'axios';

// All API calls go through this base instance
const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Helper: inject organizer ID into request if caller provides it ───────────
// Organizer-only routes need `x-organizer-id` header for server-side auth.
function withOrganizer(organizerId) {
  return { headers: { 'x-organizer-id': organizerId } };
}

// ── Health ──────────────────────────────────────────────────────────────────
export const checkHealth = () => API.get('/health');

// ── Sessions ────────────────────────────────────────────────────────────────
export const createSession = (data) =>
  API.post('/sessions', data);

export const getSession = (sessionId) =>
  API.get(`/sessions/${sessionId}`);

export const joinSession = (sessionId, data) =>
  API.post(`/sessions/${sessionId}/join`, data);

// ── Preferences ─────────────────────────────────────────────────────────────
export const submitPreference = (sessionId, data) =>
  API.post(`/sessions/${sessionId}/preferences`, data);

export const getPreferences = (sessionId) =>
  API.get(`/sessions/${sessionId}/preferences`);

// ── Restaurant Recommendation ────────────────────────────────────────────────
export const getRecommendations = (sessionId) =>
  API.post(`/sessions/${sessionId}/recommend`);

// organizerId required — server checks it server-side
export const selectRestaurant = (sessionId, restaurantId, organizerId) =>
  API.patch(
    `/sessions/${sessionId}/restaurant`,
    { restaurantId },
    withOrganizer(organizerId),
  );

// ── Menu & Orders ────────────────────────────────────────────────────────────
export const getMenu = (sessionId) =>
  API.get(`/sessions/${sessionId}/menu`);

export const submitOrder = (sessionId, data) =>
  API.post(`/sessions/${sessionId}/orders`, data);

export const getOrders = (sessionId) =>
  API.get(`/sessions/${sessionId}/orders`);

// ── Place Order (organizer only) ─────────────────────────────────────────────
export const placeOrder = (sessionId, organizerId, data) =>
  API.post(
    `/sessions/${sessionId}/place-order`,
    data,
    withOrganizer(organizerId),
  );

// ── Coupons ──────────────────────────────────────────────────────────────────
export const applyCoupon = (sessionId, couponCode) =>
  API.post(`/sessions/${sessionId}/apply-coupon`, { couponCode });

// ── AI Chat ──────────────────────────────────────────────────────────────────
export const sendChatMessage = (sessionId, payload) =>
  API.post(`/sessions/${sessionId}/chat`, payload);

// ── AI Menu Suggestions ─────────────────────────────────────────────────────
export const getMenuSuggestions = (sessionId, memberName) =>
  API.get(`/sessions/${sessionId}/menu/suggestions`, { params: { memberName } });

// ── Admin ────────────────────────────────────────────────────────────────────
export const getAdminDashboard = () =>
  API.get('/admin/dashboard');

export default API;
