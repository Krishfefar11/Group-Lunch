import axios from 'axios';

// All API calls go through this base instance
const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Health ──────────────────────────────────────────────────────────────────
export const checkHealth = () => API.get('/health');

// ── Sessions (Stage 3) ──────────────────────────────────────────────────────
export const createSession   = (data)      => API.post('/sessions', data);
export const getSession      = (sessionId) => API.get(`/sessions/${sessionId}`);

// ── Preferences (Stage 4) ───────────────────────────────────────────────────
export const submitPreference = (sessionId, data) =>
  API.post(`/sessions/${sessionId}/preferences`, data);
export const getPreferences   = (sessionId) =>
  API.get(`/sessions/${sessionId}/preferences`);

// ── Restaurant Recommendation (Stage 5) ─────────────────────────────────────
export const getRecommendations = (sessionId) =>
  API.post(`/sessions/${sessionId}/recommend`);
export const selectRestaurant   = (sessionId, restaurantId) =>
  API.patch(`/sessions/${sessionId}/restaurant`, { restaurantId });

// ── Menu & Orders (Stage 6) ─────────────────────────────────────────────────
export const getRestaurantMenu = (restaurantId) =>
  API.get(`/restaurants/${restaurantId}/menu`);
export const submitOrder = (sessionId, memberId, data) =>
  API.post(`/sessions/${sessionId}/members/${memberId}/order`, data);

// ── Cart (Stage 7) ──────────────────────────────────────────────────────────
export const getCart = (sessionId) => API.get(`/sessions/${sessionId}/cart`);

// ── Coupon (Stage 8) ────────────────────────────────────────────────────────
export const applyCoupon = (sessionId) =>
  API.post(`/sessions/${sessionId}/apply-coupon`);

// ── Place Order (Stage 9) ────────────────────────────────────────────────────
export const placeOrder = (sessionId, data) =>
  API.post(`/sessions/${sessionId}/place-order`, data);

// ── Admin Dashboard ──────────────────────────────────────────────────────────
export const getAdminDashboard = () => API.get('/admin/dashboard');

// ── AI Menu Suggestions ─────────────────────────────────────────────────────
export const getMenuSuggestions = (sessionId, memberName) =>
  API.get(`/sessions/${sessionId}/menu/suggestions`, { params: { memberName } });

// ── AI Chat Bot ─────────────────────────────────────────────────────────────
export const sendChatMessage = (sessionId, payload) =>
  API.post(`/sessions/${sessionId}/chat`, payload);

export default API;
