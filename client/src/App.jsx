import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatBot         from './components/ChatBot';
import Home            from './pages/Home';
import CreateSession   from './pages/CreateSession';
import JoinSession     from './pages/JoinSession';
import PreferenceForm  from './pages/PreferenceForm';
import RestaurantPicker from './pages/RestaurantPicker';
import MenuView        from './pages/MenuView';
import CartView        from './pages/CartView';
import FinalReview     from './pages/FinalReview';
import TrackingPage    from './pages/TrackingPage';
import AdminPanel      from './pages/AdminPanel';
import { colors, font } from './design-system/tokens';

// ── Inject global styles & font ───────────────────────────────────────────────
const globalStyle = document.createElement('style');
globalStyle.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
  }

  html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
  }

  body {
    background:  ${colors.bg.base};
    color:       ${colors.text.primary};
    font-family: ${font.family};
    font-size:   ${font.size.base};
    line-height: 1.55;
    -webkit-font-smoothing:  antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    font-feature-settings: 'cv11', 'ss01';
  }

  ::selection {
    background: rgba(240,165,0,0.28);
    color: #fff;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

  input::placeholder  { color: ${colors.text.muted}; }
  textarea::placeholder { color: ${colors.text.muted}; }
  button { font-family: ${font.family}; }

  /* ── Core keyframes ─────────────────────────────────────────────────────── */

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes spinSlow {
    to { transform: rotate(360deg); }
  }

  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.93); }
    to   { opacity: 1; transform: scale(1); }
  }

  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.96) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  @keyframes slideLeft {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }

  @keyframes pulseSoft {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.7; transform: scale(0.97); }
  }

  @keyframes goldGlow {
    0%,100% { box-shadow: 0 0 20px rgba(240,165,0,0.12), 0 4px 20px rgba(0,0,0,0.5); }
    50%      { box-shadow: 0 0 48px rgba(240,165,0,0.3),  0 4px 20px rgba(0,0,0,0.5); }
  }

  @keyframes float {
    0%,100% { transform: translateY(0);    }
    50%     { transform: translateY(-10px); }
  }

  @keyframes floatSlow {
    0%,100% { transform: translateY(0) rotate(0deg); }
    33%     { transform: translateY(-8px) rotate(1deg); }
    66%     { transform: translateY(-4px) rotate(-1deg); }
  }

  @keyframes breathe {
    0%,100% { transform: scale(1); }
    50%     { transform: scale(1.04); }
  }

  @keyframes blobPulse {
    0%,100% { transform: scale(1) translate(0,0); opacity: 0.6; }
    33%     { transform: scale(1.08) translate(10px,-5px); opacity: 0.8; }
    66%     { transform: scale(0.94) translate(-6px,8px); opacity: 0.5; }
  }

  @keyframes countUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes heroTextReveal {
    from { opacity: 0; transform: translateY(32px) skewY(1deg); }
    to   { opacity: 1; transform: translateY(0) skewY(0); }
  }

  @keyframes borderGlow {
    0%,100% { border-color: rgba(240,165,0,0.2); }
    50%      { border-color: rgba(240,165,0,0.5); }
  }

  @keyframes scanLine {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(400%); }
  }

  @keyframes ripple {
    0%   { transform: scale(0); opacity: 0.5; }
    100% { transform: scale(4); opacity: 0; }
  }

  @keyframes checkPop {
    0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
    60%  { transform: scale(1.2) rotate(3deg);  opacity: 1; }
    100% { transform: scale(1) rotate(0deg);    opacity: 1; }
  }

  @keyframes progressFill {
    from { width: 0%; }
  }

  @keyframes dotBounce {
    0%,80%,100% { transform: scale(0.85); opacity: 0.4; }
    40%         { transform: scale(1.1); opacity: 1; }
  }

  @keyframes tagFadeIn {
    from { opacity: 0; transform: scale(0.8) translateY(4px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes gradient-x {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }

  /* ── Utility animation classes ──────────────────────────────────────────── */

  .animate-fade-up    { animation: fadeUp     0.48s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-fade-down  { animation: fadeDown   0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-fade-in    { animation: fadeIn     0.32s ease forwards; }
  .animate-scale-in   { animation: scaleIn    0.32s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-scale-up   { animation: scaleUp    0.42s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-slide-left { animation: slideLeft  0.4s cubic-bezier(0.22,1,0.36,1) forwards; }

  /* Staggered children — add class to parent */
  .stagger-children > * { opacity: 0; animation: fadeUp 0.48s cubic-bezier(0.22,1,0.36,1) forwards; }
  .stagger-children > *:nth-child(1)  { animation-delay: 0.04s; }
  .stagger-children > *:nth-child(2)  { animation-delay: 0.10s; }
  .stagger-children > *:nth-child(3)  { animation-delay: 0.16s; }
  .stagger-children > *:nth-child(4)  { animation-delay: 0.22s; }
  .stagger-children > *:nth-child(5)  { animation-delay: 0.28s; }
  .stagger-children > *:nth-child(6)  { animation-delay: 0.34s; }

  /* ── Skeleton / shimmer ─────────────────────────────────────────────────── */
  .skeleton {
    background: linear-gradient(
      90deg,
      ${colors.bg.raised} 25%,
      ${colors.bg.overlay} 50%,
      ${colors.bg.raised} 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease infinite;
    border-radius: 8px;
  }

  /* ── Hover lift utilities ───────────────────────────────────────────────── */
  .lift {
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  }

  /* ── Card glow on hover ─────────────────────────────────────────────────── */
  .card-glow {
    transition: border-color 0.22s ease, box-shadow 0.22s ease;
  }
  .card-glow:hover {
    border-color: rgba(240,165,0,0.2) !important;
    box-shadow: 0 0 0 1px rgba(240,165,0,0.1), 0 8px 32px rgba(0,0,0,0.6) !important;
  }

  /* ── Gold button glow ───────────────────────────────────────────────────── */
  .btn-gold {
    transition: all 0.22s ease;
  }
  .btn-gold:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 32px rgba(240,165,0,0.42) !important;
  }
  .btn-gold:active:not(:disabled) {
    transform: translateY(0px);
  }

  /* ── Focus ring ─────────────────────────────────────────────────────────── */
  .focus-ring:focus-visible {
    outline: 2px solid rgba(240,165,0,0.6);
    outline-offset: 2px;
  }

  /* ── Gradient text ──────────────────────────────────────────────────────── */
  .text-gradient-gold {
    background: linear-gradient(135deg, #f0a500 0%, #fbbf24 60%, #fcd34d 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .text-gradient-white {
    background: linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.75) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ── Noise texture overlay ──────────────────────────────────────────────── */
  .noise::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
    border-radius: inherit;
  }

  /* ── Responsive helpers ─────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .hide-mobile { display: none !important; }
  }

  @media (min-width: 641px) {
    .show-mobile-only { display: none !important; }
  }
`;
document.head.appendChild(globalStyle);

export default function App() {
  return (
    <Router>
      <ChatBot />
      <Routes>
        <Route path="/"                                    element={<Home />} />
        <Route path="/create"                              element={<CreateSession />} />
        <Route path="/session/:sessionId"                  element={<JoinSession />} />
        <Route path="/session/:sessionId/preferences"     element={<PreferenceForm />} />
        <Route path="/session/:sessionId/pick-restaurant" element={<RestaurantPicker />} />
        <Route path="/session/:sessionId/menu"            element={<MenuView />} />
        <Route path="/session/:sessionId/cart"            element={<CartView />} />
        <Route path="/session/:sessionId/review"          element={<FinalReview />} />
        <Route path="/session/:sessionId/tracking"        element={<TrackingPage />} />
        <Route path="/admin"                              element={<AdminPanel />} />
        <Route path="*" element={
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
            background: colors.bg.base,
          }}>
            <span style={{ fontSize: 64, animation: 'float 3s ease infinite' }}>🍽️</span>
            <p style={{ fontSize: 64, fontWeight: 900, color: colors.text.primary, letterSpacing: '-0.04em' }}>404</p>
            <p style={{ color: colors.text.secondary, fontSize: 15 }}>This page doesn't exist</p>
            <a href="/" style={{
              marginTop: 8,
              padding: '11px 24px',
              borderRadius: '12px',
              background: 'rgba(240,165,0,0.1)',
              color: colors.gold.base,
              border: '1px solid rgba(240,165,0,0.2)',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}>← Back to Home</a>
          </div>
        } />
      </Routes>
    </Router>
  );
}
