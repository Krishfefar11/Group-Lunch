import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket/socket.js';
import useSocketReconnect from '../hooks/useSocketReconnect';
import { getPhoto, photoUrl, cuisineQuery } from '../utils/unsplash';
import { getMenuSuggestions } from '../api/api';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

// ── Tag colour map ──────────────────────────────────────────────────────────
const TAG_COLORS = {
  bestseller:     { bg: 'rgba(245,158,11,0.12)', color: '#d97706', border: 'rgba(245,158,11,0.35)' },
  'must-try':     { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', border: 'rgba(99,102,241,0.3)'  },
  spicy:          { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', border: 'rgba(239,68,68,0.3)'   },
  healthy:        { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.3)'  },
  'chef-special': { bg: 'rgba(139,92,246,0.1)',  color: '#7c3aed', border: 'rgba(139,92,246,0.3)'  },
  popular:        { bg: 'rgba(59,130,246,0.1)',  color: '#2563eb', border: 'rgba(59,130,246,0.3)'  },
  sharing:        { bg: 'rgba(236,72,153,0.1)',  color: '#db2777', border: 'rgba(236,72,153,0.3)'  },
  light:          { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.3)'  },
};

// ── Category emoji map ──────────────────────────────────────────────────────
const CAT_EMOJI = {
  'Starters': '🥗', 'Main Course': '🍛', 'Breads': '🫓',
  'Rice & Biryani': '🍚', 'Biryani': '🍚', 'Pizzas': '🍕', 'Pizza': '🍕',
  'Pasta': '🍝', 'Burgers': '🍔', 'Wraps': '🌯', 'Breakfast': '🍳',
  'Desserts': '🍰', 'Beverages': '🥤', 'Soups': '🍜',
  'Dosa': '🥞', 'Bowls': '🥣', 'Pancakes': '🥞', 'Combo': '🍱',
};

// ── Item emoji fallback by category ────────────────────────────────────────
const ITEM_EMO = {
  'Starters': '🥗', 'Main Course': '🍛', 'Breads': '🫓',
  'Rice & Biryani': '🍚', 'Biryani': '🍚', 'Pizzas': '🍕',
  'Pasta': '🍝', 'Burgers': '🍔', 'Wraps': '🌯', 'Breakfast': '🍳',
  'Desserts': '🍰', 'Beverages': '🥤', 'Soups': '🍜',
  'Dosa': '🥞', 'Bowls': '🥣', 'Combo': '🍱',
};

// ── Injected responsive CSS ─────────────────────────────────────────────────
const INJECTED_CSS = `
  .mv-item-card { transition: box-shadow 0.18s ease, transform 0.18s ease; cursor: default; }
  .mv-item-card:hover { box-shadow: 0 6px 18px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
  .mv-add-btn:hover { background: #f4520f !important; color: #fff !important; border-color: #f4520f !important; }
  .mv-suggest-add:hover { background: #f4520f !important; color: #fff !important; border-color: #f4520f !important; }
  .mv-cat-nav::-webkit-scrollbar { display: none; }
  .mv-suggest-scroll::-webkit-scrollbar { display: none; }
  .mv-cat-tab:hover { color: #f4520f !important; }
  @media (max-width: 480px) {
    .mv-hero { height: 200px !important; }
    .mv-hero-name { font-size: 18px !important; }
    .mv-item-name { font-size: 13px !important; }
    .mv-thumb-wrap { width: 64px !important; height: 64px !important; }
    .mv-menu-body { padding: 0 10px !important; }
    .mv-cart-bar { padding: 10px 14px !important; }
    .mv-suggest-card { width: 148px !important; }
    .mv-hero-name { font-size: 17px !important; }
  }
  @media (min-width: 768px) {
    .mv-items-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .mv-menu-body { max-width: 860px !important; padding: 0 28px !important; }
    .mv-section { padding-top: 32px !important; }
    .mv-hero { height: 280px !important; }
  }
  @media (min-width: 1024px) {
    .mv-menu-body { max-width: 1000px !important; }
  }
`;

export default function MenuView() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [restaurant,  setRestaurant]  = useState(null);
  const [menu,        setMenu]        = useState({});
  const [cart,        setCart]        = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [me,          setMe]          = useState(null);
  const [bannerPhoto,       setBannerPhoto]       = useState(null);
  const [itemPhotos,        setItemPhotos]        = useState({});
  const [activeCategory,    setActiveCategory]    = useState(null);
  const [suggestions,       setSuggestions]       = useState([]);
  const [suggestionsLoading,setSuggestionsLoading] = useState(false);
  const [itemNotes,         setItemNotes]          = useState({});   // itemCode → note string
  const [onlineMembers,     setOnlineMembers]      = useState([]);   // live presence list

  useEffect(() => {
    const stored = localStorage.getItem(`member_${sessionId}`);
    if (stored) setMe(JSON.parse(stored));
  }, [sessionId]);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/sessions/${sessionId}/menu`);
      setRestaurant(res.data.data.restaurant);
      setMenu(res.data.data.menu);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load menu.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  // Unsplash banner
  useEffect(() => {
    if (!restaurant) return;
    if (restaurant.imageUrl) return;
    const query = cuisineQuery(restaurant.cuisines || []);
    getPhoto(query).then((photo) => { if (photo) setBannerPhoto(photo); });
  }, [restaurant]);

  // Unsplash item thumbnails
  useEffect(() => {
    const items = Object.values(menu).flat();
    if (items.length === 0) return;
    Promise.all(
      items.slice(0, 10).map(async (item) => {
        const photo = await getPhoto(`${item.name} food dish`);
        return [item.itemCode, photo ? photoUrl(photo, 'thumb') : null];
      })
    ).then((pairs) => {
      const map = {};
      pairs.forEach(([code, url]) => { if (url) map[code] = url; });
      setItemPhotos(map);
    });
  }, [menu]);

  // Set first category as active after load
  useEffect(() => {
    const cats = Object.keys(menu);
    if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0]);
  }, [menu]);

  // Listen for socket events + broadcast presence
  useEffect(() => {
    socket.connect();
    socket.emit('join_session', sessionId);
    socket.on('menu_ready', () => {
      if (Object.keys(menu).length === 0) fetchMenu();
    });
    socket.on('order_placed', () => navigate(`/session/${sessionId}/tracking`));
    socket.on('presence_update', ({ online }) => setOnlineMembers(online || []));
    return () => {
      socket.off('menu_ready');
      socket.off('order_placed');
      socket.off('presence_update');
      socket.disconnect();
    };
  }, [sessionId, fetchMenu, navigate, menu]);

  // Announce presence once identity is known
  useEffect(() => {
    if (!me?.memberId) return;
    if (socket.connected) {
      socket.emit('presence_join', { sessionId, memberId: me.memberId, memberName: me.memberName });
    }
    // Also re-announce on reconnect (handled via 'connect' event)
    const handleConnect = () => {
      socket.emit('presence_join', { sessionId, memberId: me.memberId, memberName: me.memberName });
    };
    socket.on('connect', handleConnect);
    return () => socket.off('connect', handleConnect);
  }, [me?.memberId, sessionId]);

  // Reconnect guard — re-join session room and re-fetch menu on socket reconnect
  const { online } = useSocketReconnect(sessionId, fetchMenu);

  // Fetch AI suggestions once menu + member identity are known
  useEffect(() => {
    if (!restaurant || !me?.memberName) return;
    setSuggestionsLoading(true);
    getMenuSuggestions(sessionId, me.memberName)
      .then((res) => setSuggestions(res.data.data || []))
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [restaurant, me?.memberName]);

  // Cart helpers
  const changeQty = (item, delta) => {
    setCart((prev) => {
      const cur  = prev[item.itemCode] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) { const { [item.itemCode]: _, ...rest } = prev; return rest; }
      return { ...prev, [item.itemCode]: next };
    });
  };

  // Dietary filter
  const memberIsVeg  = (me?.diet || []).includes('veg');
  const memberIsJain = (me?.diet || []).includes('jain');

  const allItems = Object.values(menu).flat().filter((item) => {
    if (memberIsJain && !item.jainFriendly) return false;
    if (memberIsVeg  && !item.veg)          return false;
    return true;
  });

  const filteredMenu = {};
  Object.entries(menu).forEach(([cat, items]) => {
    const filtered = items.filter((item) => {
      if (memberIsJain && !item.jainFriendly) return false;
      if (memberIsVeg  && !item.veg)          return false;
      return true;
    });
    if (filtered.length > 0) filteredMenu[cat] = filtered;
  });

  const cartItems = Object.entries(cart)
    .map(([code, qty]) => {
      const item = allItems.find((i) => i.itemCode === code);
      return item ? { ...item, qty, notes: itemNotes[code] || null } : null;
    })
    .filter(Boolean);
  const subtotal  = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const handleSubmit = async () => {
    if (!me) { alert('Identity not found. Please re-join.'); navigate(`/session/${sessionId}`); return; }
    if (cartItems.length === 0) { alert('Add at least one item.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`/api/sessions/${sessionId}/orders`, {
        memberId: me.memberId, memberName: me.memberName,
        items: cartItems.map((i) => ({ itemCode: i.itemCode, name: i.name, price: i.price, qty: i.qty, veg: i.veg, notes: i.notes || null })),
      });
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const CAT_ORDER = ['Starters','Main Course','Breads','Rice & Biryani','Biryani','Pizzas','Pizza','Pasta','Burgers','Wraps','Breakfast','Desserts','Beverages','Soups','Dosa','Bowls'];
  const sortedCategories = Object.keys(filteredMenu).sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1; if (ib === -1) return -1;
    return ia - ib;
  });

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.center}>
      <style>{INJECTED_CSS}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>🍽️</div>
        <p style={{ color: colors.text.secondary, fontSize: font.size.md }}>Loading menu...</p>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
          {[0,1,2].map((i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: colors.gold.base, animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.22}s` }} />)}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <style>{INJECTED_CSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <p style={{ color: colors.red.text, marginBottom: 20 }}>{error}</p>
        <button style={s.outlineBtn} onClick={fetchMenu}>Try Again</button>
      </div>
    </div>
  );

  // Menu still being prepared
  if (restaurant && Object.keys(menu).length === 0) return (
    <div style={s.center}>
      <style>{INJECTED_CSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ fontSize: 56, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>👨‍🍳</div>
        <p style={{ fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text.primary, marginBottom: 8 }}>
          Menu being prepared…
        </p>
        <p style={{ fontSize: font.size.sm, color: colors.text.muted, marginBottom: 24, lineHeight: 1.6 }}>
          Our AI is generating dishes for <strong>{restaurant.name}</strong>.<br/>This takes just a few seconds.
        </p>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {[0,1,2].map((i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: colors.gold.base, animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.22}s` }} />
          ))}
        </div>
      </div>
    </div>
  );

  // ── Submitted ───────────────────────────────────────────────────────────────
  if (submitted) return (
    <div style={s.center}>
      <style>{INJECTED_CSS}</style>
      <div style={s.submittedCard} className="animate-scale-in">
        <div style={s.submittedIcon}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke={colors.green.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={s.submittedTitle}>Order submitted!</h2>
        <p style={s.submittedMeta}>{itemCount} item{itemCount !== 1 ? 's' : ''} · <span style={{ color: colors.text.gold, fontWeight: font.weight.bold }}>₹{subtotal}</span></p>
        <p style={s.submittedHint}>Waiting for everyone else to order...</p>
        <button style={s.goldBtn} onClick={() => navigate(`/session/${sessionId}/cart`)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(240,165,0,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(240,165,0,0.25)'; }}>
          View Group Cart →
        </button>
        <button style={s.ghostBtn} onClick={() => setSubmitted(false)}>Edit my order</button>
      </div>
    </div>
  );

  const heroSrc = restaurant.imageUrl
    ? restaurant.imageUrl.replace('/upload/', '/upload/w_800,h_320,c_fill,q_auto,f_auto/')
    : bannerPhoto ? photoUrl(bannerPhoto, 'regular') : null;

  return (
    <div style={s.page}>
      <style>{INJECTED_CSS}</style>

      {/* ── Offline banner ──────────────────────────────────────────────────── */}
      {!online && (
        <div style={s.offlineBanner}>
          <span style={s.offlineDot} />
          Connection lost · Reconnecting…
        </div>
      )}

      {/* ── Sticky cart bar ─────────────────────────────────────────────────── */}
      {itemCount > 0 && (
        <div style={s.cartBar} className="mv-cart-bar animate-slide-up">
          <div style={s.cartBarLeft}>
            <div style={s.cartCount}>{itemCount}</div>
            <div>
              <div style={s.cartBarText}>item{itemCount !== 1 ? 's' : ''} in cart</div>
              <div style={s.cartBarHint}>{cartItems.slice(0,2).map(i=>i.name).join(', ')}{cartItems.length > 2 ? ` +${cartItems.length-2}` : ''}</div>
            </div>
          </div>
          <div style={s.cartBarRight}>
            <span style={s.cartTotal}>₹{subtotal}</span>
            <button
              style={{ ...s.cartBarBtn, opacity: submitting ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={submitting}
              onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(244,82,15,0.5)'; }}}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 3px 12px rgba(244,82,15,0.35)'; }}
            >
              {submitting ? 'Placing...' : 'Place Order →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <div style={s.hero} className="mv-hero">
        {heroSrc ? (
          <>
            <img src={heroSrc} alt={restaurant.name} style={s.heroImg} />
            <div style={s.heroOverlay} />
          </>
        ) : (
          <div style={s.heroFallback}>
            <span style={{ fontSize: 72, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}>{restaurant.imageEmoji || '🍽️'}</span>
          </div>
        )}

        {/* Back button */}
        <button style={s.heroBack} onClick={() => navigate(`/session/${sessionId}/pick-restaurant`)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Source badge top-right */}
        {restaurant.source && restaurant.source !== 'static' && (
          <div style={s.heroSourceBadge}>
            {restaurant.source === 'foursquare' ? '📍 Live' : '🗺️ Live'}
          </div>
        )}

        {/* Restaurant info overlay */}
        <div style={s.heroContent}>
          <h1 style={s.heroName} className="mv-hero-name">{restaurant.name}</h1>
          <div style={s.heroPills}>
            <span style={s.heroPill}>⭐ {restaurant.rating}</span>
            <span style={s.heroPill}>🕐 {restaurant.deliveryTimeMin} min</span>
            <span style={s.heroPill}>₹{restaurant.pricePerPerson}/person</span>
            {restaurant.vegFriendly && <span style={{ ...s.heroPill, background: 'rgba(16,185,129,0.35)', border: '1px solid rgba(16,185,129,0.4)' }}>🥦 Veg-friendly</span>}
            {(restaurant.cuisines || []).slice(0, 2).map((c) => (
              <span key={c} style={s.heroPill}>{c}</span>
            ))}
            {/* Live presence pill */}
            {onlineMembers.length > 0 && (
              <span style={s.presencePill}>
                <span style={s.presenceDot} />
                {onlineMembers.length} picking now
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Member greeting ─────────────────────────────────────────────────── */}
      <div style={s.greeting}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <span style={s.greetingText}>
            Hey <strong style={{ color: colors.text.gold }}>{me?.memberName || 'there'}</strong> — pick your items below
          </span>
          {/* Active member avatars */}
          {onlineMembers.length > 0 && (
            <div style={s.presenceRow}>
              {onlineMembers.slice(0, 4).map((m, i) => (
                <div key={m.memberId} style={{ ...s.presenceAvatar, marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i, background: `${['#f0a500','#6366f1','#10b981','#ef4444'][i % 4]}22`, borderColor: `${['#f0a500','#6366f1','#10b981','#ef4444'][i % 4]}66` }}>
                  {m.memberName.charAt(0).toUpperCase()}
                </div>
              ))}
              {onlineMembers.length > 4 && (
                <div style={{ ...s.presenceAvatar, marginLeft: -8, background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: colors.text.muted, fontSize: 9 }}>+{onlineMembers.length - 4}</div>
              )}
              <span style={s.presenceLabel}>{onlineMembers.length} active</span>
            </div>
          )}
        </div>
        <div style={s.vegLegend}>
          <div style={s.vegLegendItem}>
            <span style={{ ...s.vegDot, background: colors.veg }} />
            <span style={s.vegLegendLabel}>Veg</span>
          </div>
          {!memberIsVeg && (
            <div style={s.vegLegendItem}>
              <span style={{ ...s.vegDot, background: colors.nonVeg }} />
              <span style={s.vegLegendLabel}>Non-veg</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Dietary filter banner ────────────────────────────────────────────── */}
      {(memberIsVeg || memberIsJain) && (
        <div style={s.dietBanner}>
          <span style={{ fontSize: 16 }}>{memberIsJain ? '🌿' : '🥦'}</span>
          <span>
            Showing <strong>{memberIsJain ? 'Jain' : 'vegetarian'} items only</strong> based on your preference
          </span>
        </div>
      )}

      {/* ── AI Suggestions ──────────────────────────────────────────────────── */}
      {(suggestionsLoading || suggestions.length > 0) && (
        <div style={s.suggestSection}>
          <div style={s.suggestHeader}>
            <div>
              <span style={s.suggestTitle}>✨ Suggested for you</span>
              <span style={s.suggestSub}> · AI-personalised picks</span>
            </div>
            <span style={s.suggestPill}>AI</span>
          </div>
          <div style={s.suggestScroll} className="mv-suggest-scroll">
            {suggestionsLoading
              ? [1,2,3].map((n) => <div key={n} className="skeleton" style={s.suggestSkeletonCard} />)
              : suggestions.map((item) => {
                  const qty = cart[item.itemCode] || 0;
                  return (
                    <div key={item.id} style={s.suggestCard} className="mv-suggest-card mv-item-card">
                      <div style={s.suggestCardTop}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '2px', background: item.veg ? colors.veg : colors.nonVeg, flexShrink: 0, border: `1.5px solid ${item.veg ? colors.veg : colors.nonVeg}` }} />
                          <span style={s.suggestItemName}>{item.name}</span>
                        </div>
                        {item.isRepeat && <span style={s.repeatBadge}>🔁</span>}
                      </div>
                      <p style={s.suggestReason}>{item.reason}</p>
                      <div style={s.suggestCardBottom}>
                        <span style={s.suggestPrice}>₹{item.price}</span>
                        {qty === 0 ? (
                          <button className="mv-suggest-add" style={s.suggestAddBtn} onClick={() => changeQty(item, 1)}>+ ADD</button>
                        ) : (
                          <div style={s.qtyControl}>
                            <button style={s.qtyBtn} onClick={() => changeQty(item, -1)}>−</button>
                            <span style={{ ...s.qtyNum, fontSize: font.size.xs }}>{qty}</span>
                            <button style={s.qtyBtn} onClick={() => changeQty(item, 1)}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* ── Category nav (sticky) ───────────────────────────────────────────── */}
      <div style={s.catNavWrap}>
        <div style={s.catNav} className="mv-cat-nav">
          {sortedCategories.map((cat) => (
            <button
              key={cat}
              className="mv-cat-tab"
              style={{ ...s.catTab, ...(activeCategory === cat ? s.catTabActive : {}) }}
              onClick={() => {
                setActiveCategory(cat);
                document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span style={{ marginRight: 5 }}>{CAT_EMOJI[cat] || '🍴'}</span>
              {cat}
              <span style={{ ...s.catCount, ...(activeCategory === cat ? s.catCountActive : {}) }}>
                {filteredMenu[cat]?.length || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Menu sections ───────────────────────────────────────────────────── */}
      <div style={s.menuBody} className="mv-menu-body">
        {sortedCategories.map((category) => (
          <div key={category} id={`cat-${category}`} style={s.section} className="mv-section">
            {/* Category header */}
            <div style={s.catHeader}>
              <span style={s.catEmoji}>{CAT_EMOJI[category] || '🍴'}</span>
              <h2 style={s.catTitle}>{category}</h2>
              <span style={s.catItemCount}>{filteredMenu[category].length} items</span>
            </div>

            {/* Items grid (1-col mobile, 2-col desktop via CSS) */}
            <div style={s.itemList} className="mv-items-grid">
              {filteredMenu[category].map((item) => {
                const qty      = cart[item.itemCode] || 0;
                const thumbUrl = itemPhotos[item.itemCode];
                const fallbackEmoji = ITEM_EMO[category] || '🍽️';
                const inCart   = qty > 0;

                return (
                  <div key={item.itemCode}
                    style={{ ...s.itemCard, ...(inCart ? s.itemCardInCart : {}) }}
                    className="mv-item-card"
                  >
                    {/* Left: info */}
                    <div style={s.itemInfo}>
                      {/* Veg indicator + name */}
                      <div style={s.itemNameRow}>
                        <span style={{ ...s.vegIndicator, background: item.veg ? colors.veg : colors.nonVeg, borderColor: item.veg ? colors.veg : colors.nonVeg }} />
                        <p style={s.itemName} className="mv-item-name">{item.name}</p>
                        {item.tags?.includes('bestseller') && (
                          <span style={s.bestsellerBadge}>🔥 Bestseller</span>
                        )}
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p style={s.itemDesc}>{item.description}</p>
                      )}

                      {/* Tags */}
                      {(item.tags || []).filter(t => t !== 'bestseller').length > 0 && (
                        <div style={s.itemTags}>
                          {item.tags.filter(t => t !== 'bestseller').map((t) => {
                            const tc = TAG_COLORS[t];
                            return (
                              <span key={t} style={tc
                                ? { ...s.miniTag, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }
                                : s.miniTag
                              }>
                                {t}
                              </span>
                            );
                          })}
                          {item.jainFriendly && (
                            <span style={{ ...s.miniTag, background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}>🌿 Jain</span>
                          )}
                        </div>
                      )}

                      {/* Price + ADD on same row (mobile-friendly) */}
                      <div style={s.priceRow}>
                        <p style={s.itemPrice}>₹{item.price}</p>
                        {/* Qty control for mobile (shows below price when no image) */}
                        {!thumbUrl && (
                          <div style={s.mobileQty}>
                            {qty === 0 ? (
                              <button className="mv-add-btn" style={s.addBtn} onClick={() => changeQty(item, 1)}>+ ADD</button>
                            ) : (
                              <div style={s.qtyControl}>
                                <button style={s.qtyBtn} onClick={() => changeQty(item, -1)}>−</button>
                                <span style={s.qtyNum}>{qty}</span>
                                <button style={s.qtyBtn} onClick={() => changeQty(item, 1)}>+</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: image + cart control */}
                    <div style={s.itemRight}>
                      {/* Image (real or emoji fallback) */}
                      <div style={s.thumbWrap} className="mv-thumb-wrap">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={item.name} style={s.thumb} />
                        ) : (
                          <div style={s.thumbFallback}>
                            <span style={{ fontSize: 28, lineHeight: 1 }}>{fallbackEmoji}</span>
                          </div>
                        )}
                      </div>
                      {/* ADD / qty control aligned below image */}
                      {qty === 0 ? (
                        <button className="mv-add-btn" style={s.addBtn} onClick={() => changeQty(item, 1)}>+ ADD</button>
                      ) : (
                        <div style={s.qtyControl}>
                          <button style={s.qtyBtn} onClick={() => changeQty(item, -1)}>−</button>
                          <span style={s.qtyNum}>{qty}</span>
                          <button style={s.qtyBtn} onClick={() => changeQty(item, 1)}>+</button>
                        </div>
                      )}
                    </div>
                  {/* Notes input — visible only when item is in cart */}
                  {qty > 0 && (
                    <div style={s.notesWrap}>
                      <input
                        style={s.notesInput}
                        type="text"
                        maxLength={120}
                        placeholder='Special instructions (e.g. "no onions", "extra spicy")'
                        value={itemNotes[item.itemCode] || ''}
                        onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.itemCode]: e.target.value }))}
                      />
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Bottom submit button */}
        {itemCount > 0 && (
          <button
            style={{ ...s.submitBtnBottom, opacity: submitting ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={submitting}
            onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(240,165,0,0.4)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(240,165,0,0.25)'; }}
          >
            {submitting ? 'Placing order...' : `Place My Order · ₹${subtotal} →`}
          </button>
        )}

        {itemCount === 0 && (
          <p style={s.emptyHint}>Browse the menu and tap <strong>+ ADD</strong> to build your order</p>
        )}

        <div style={{ height: 100 }} />
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page:   { minHeight: '100vh', background: colors.bg.base, paddingBottom: 0 },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // ── Sticky cart bar ────────────────────────────────────────────────────────
  cartBar: {
    position:      'fixed',
    bottom:        0,
    left:          0,
    right:         0,
    zIndex:        200,
    background:    colors.bg.surface,
    borderTop:     `1px solid ${colors.border.default}`,
    backdropFilter:'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'space-between',
    padding:       '12px 20px',
    boxShadow:     '0 -4px 24px rgba(0,0,0,0.12)',
  },
  cartBarLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  cartBarRight:{ display: 'flex', alignItems: 'center', gap: 14 },
  cartCount:   { width: 30, height: 30, borderRadius: radius.full, background: `linear-gradient(135deg, ${colors.gold.base}, #f4520f)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: font.size.sm, fontWeight: font.weight.bold, flexShrink: 0, boxShadow: '0 2px 8px rgba(244,82,15,0.4)' },
  cartBarText: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary },
  cartBarHint: { fontSize: '10px', color: colors.text.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cartTotal:   { fontSize: font.size.lg, fontWeight: font.weight.black, color: colors.text.primary, letterSpacing: '-0.02em' },
  cartBarBtn:  { background: `linear-gradient(135deg, ${colors.gold.base} 0%, #f4520f 100%)`, color: '#fff', border: 'none', borderRadius: radius.lg, padding: '10px 20px', fontSize: font.size.sm, fontWeight: font.weight.bold, cursor: 'pointer', transition: transition.base, letterSpacing: '-0.01em', boxShadow: '0 3px 12px rgba(244,82,15,0.35)', fontFamily: font.family, whiteSpace: 'nowrap' },

  // ── Hero ───────────────────────────────────────────────────────────────────
  hero:          { position: 'relative', height: 250, overflow: 'hidden' },
  heroImg:       { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  heroOverlay:   { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,7,16,0.9) 0%, rgba(7,7,16,0.3) 50%, rgba(7,7,16,0.05) 100%)' },
  heroFallback:  { width: '100%', height: '100%', background: `linear-gradient(135deg, #FFF0E2 0%, #FFE0BA 50%, #FFD09A 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  heroBack:      { position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: radius.md, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', border: `1px solid rgba(255,255,255,0.18)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: transition.fast },
  heroSourceBadge: { position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: radius.full, padding: '4px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 },
  heroContent:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 18px' },
  heroName:      { fontSize: font.size['2xl'], fontWeight: font.weight.black, color: '#fff', letterSpacing: '-0.025em', margin: '0 0 10px', textShadow: '0 2px 12px rgba(0,0,0,0.6)' },
  heroPills:     { display: 'flex', flexWrap: 'wrap', gap: 6 },
  heroPill:      { padding: '4px 11px', borderRadius: radius.full, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', fontSize: font.size.xs, color: 'rgba(255,255,255,0.92)', fontWeight: font.weight.semibold },

  // ── Greeting bar ──────────────────────────────────────────────────────────
  greeting:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${colors.border.subtle}`, background: colors.bg.surface },
  greetingText: { fontSize: font.size.sm, color: colors.text.secondary },

  // Presence
  presencePill:   { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: radius.full, background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.35)', fontSize: font.size.xs, fontWeight: font.weight.semibold, color: '#34d399', letterSpacing: '0.02em', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' },
  presenceDot:    { width: 6, height: 6, borderRadius: '50%', background: '#34d399', flexShrink: 0, animation: 'pulse 2s ease infinite' },
  presenceRow:    { display: 'flex', alignItems: 'center', gap: 5 },
  presenceAvatar: { width: 22, height: 22, borderRadius: radius.full, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: font.weight.bold, border: `1.5px solid`, flexShrink: 0, color: colors.text.secondary },
  presenceLabel:  { fontSize: font.size.xs, color: colors.green.text, fontWeight: font.weight.semibold, letterSpacing: '0.02em', marginLeft: 4 },
  vegLegend:    { display: 'flex', alignItems: 'center', gap: 12 },
  vegLegendItem:{ display: 'flex', alignItems: 'center', gap: 4 },
  vegDot:       { width: 10, height: 10, borderRadius: '2px', flexShrink: 0 },
  vegLegendLabel:{ fontSize: font.size.xs, color: colors.text.muted },

  // ── Diet banner ───────────────────────────────────────────────────────────
  dietBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(16,185,129,0.07)', borderBottom: `1px solid rgba(16,185,129,0.15)`, fontSize: font.size.sm, color: '#059669', fontWeight: font.weight.medium },

  // ── AI Suggestions ────────────────────────────────────────────────────────
  suggestSection: { padding: '16px 0 0', borderBottom: `1px solid ${colors.border.subtle}`, background: colors.bg.base },
  suggestHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 12px' },
  suggestTitle:   { fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary },
  suggestSub:     { fontSize: font.size.xs, color: colors.text.muted },
  suggestPill:    { fontSize: '10px', fontWeight: font.weight.bold, background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', borderRadius: radius.full, padding: '2px 8px', letterSpacing: '0.04em' },
  suggestScroll:  { display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 16px 16px' },
  suggestCard: {
    flexShrink:   0,
    width:        172,
    background:   colors.bg.surface,
    border:       `1px solid rgba(240,165,0,0.2)`,
    borderRadius: radius.xl,
    padding:      '12px 13px',
    display:      'flex',
    flexDirection:'column',
    gap:          6,
    boxShadow:    '0 2px 8px rgba(0,0,0,0.04)',
  },
  suggestCardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  suggestItemName:  { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  repeatBadge:      { fontSize: '11px', color: colors.gold.soft, background: colors.gold.dim, border: `1px solid rgba(240,165,0,0.2)`, borderRadius: radius.full, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 },
  suggestReason:    { fontSize: '11px', color: colors.text.muted, lineHeight: 1.45, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  suggestCardBottom:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  suggestPrice:     { fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary },
  suggestAddBtn:    { padding: '5px 11px', borderRadius: radius.sm, background: 'transparent', color: colors.text.gold, border: `1.5px solid ${colors.gold.muted}`, fontSize: '10px', fontWeight: font.weight.bold, cursor: 'pointer', letterSpacing: '0.04em', transition: transition.fast, fontFamily: font.family },
  suggestSkeletonCard:{ flexShrink: 0, width: 172, height: 120, borderRadius: radius.xl },

  // ── Category nav ──────────────────────────────────────────────────────────
  catNavWrap: { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,248,242,0.97)', borderBottom: `1px solid ${colors.border.subtle}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' },
  catNav:     { display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 8px' },
  catTab:     {
    padding:     '12px 14px',
    border:      'none',
    borderBottom:'3px solid transparent',
    background:  'transparent',
    cursor:      'pointer',
    fontFamily:  font.family,
    fontSize:    font.size.sm,
    fontWeight:  font.weight.medium,
    color:       colors.text.muted,
    whiteSpace:  'nowrap',
    transition:  transition.base,
    flexShrink:  0,
    display:     'flex',
    alignItems:  'center',
    gap:         2,
  },
  catTabActive:{ color: colors.text.gold, borderBottom: `3px solid ${colors.gold.base}`, fontWeight: font.weight.bold },
  catCount:    { marginLeft: 5, fontSize: '10px', fontWeight: font.weight.bold, background: colors.bg.raised, color: colors.text.muted, borderRadius: radius.full, padding: '1px 6px', minWidth: 18, textAlign: 'center' },
  catCountActive:{ background: colors.gold.dim, color: colors.gold.base },

  // ── Menu body ─────────────────────────────────────────────────────────────
  menuBody: { maxWidth: 720, margin: '0 auto', padding: '0 16px' },
  section:  { paddingTop: 28, marginBottom: 4 },

  catHeader:   { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  catEmoji:    { fontSize: 18, lineHeight: 1 },
  catTitle:    { fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary, margin: 0, flex: 1, letterSpacing: '0.01em' },
  catItemCount:{ fontSize: '10px', color: colors.text.muted, background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.full, padding: '2px 8px', fontWeight: font.weight.medium },

  itemList: { display: 'flex', flexDirection: 'column', gap: 0 },

  // ── Item card ─────────────────────────────────────────────────────────────
  itemCard: {
    display:        'flex',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            12,
    padding:        '14px 12px',
    background:     colors.bg.surface,
    borderRadius:   radius.xl,
    border:         `1px solid ${colors.border.subtle}`,
    marginBottom:   8,
    boxShadow:      '0 1px 4px rgba(0,0,0,0.04)',
  },
  itemCardInCart: {
    border:     `1px solid ${colors.gold.muted}`,
    background: colors.gold.dim,
    boxShadow:  '0 2px 8px rgba(240,165,0,0.1)',
  },
  itemInfo:     { flex: 1, minWidth: 0 },
  itemNameRow:  { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' },
  vegIndicator: { width: 10, height: 10, borderRadius: '2px', flexShrink: 0, border: '1.5px solid' },
  itemName:     { fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary, margin: 0, flex: 1 },
  bestsellerBadge: { fontSize: '10px', fontWeight: font.weight.bold, color: '#d97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: radius.full, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 },
  itemDesc:     { fontSize: font.size.sm, color: colors.text.muted, margin: '0 0 8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  itemTags:     { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  miniTag:      { fontSize: '10px', color: colors.text.muted, background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, padding: '2px 8px', borderRadius: radius.full, fontWeight: font.weight.medium },
  priceRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemPrice:    { fontSize: font.size.base, fontWeight: font.weight.black, color: colors.text.primary, margin: 0, letterSpacing: '-0.01em' },
  mobileQty:    { display: 'none' },  // hidden by default — CSS shows on mobile when no image

  // ── Item right (image + qty) ──────────────────────────────────────────────
  itemRight:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 },
  thumbWrap:    { width: 80, height: 80, borderRadius: radius.xl, overflow: 'hidden', flexShrink: 0, border: `1px solid ${colors.border.subtle}` },
  thumb:        { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbFallback:{ width: '100%', height: '100%', background: `linear-gradient(135deg, #FFF5E5 0%, #FFE4BA 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addBtn:       { padding: '7px 14px', borderRadius: radius.md, background: 'transparent', color: colors.text.gold, border: `1.5px solid ${colors.gold.muted}`, fontSize: font.size.xs, fontWeight: font.weight.bold, cursor: 'pointer', letterSpacing: '0.06em', transition: transition.base, fontFamily: font.family, whiteSpace: 'nowrap' },
  qtyControl:   { display: 'flex', alignItems: 'center', gap: 6, background: colors.gold.dim, border: `1.5px solid rgba(240,165,0,0.3)`, borderRadius: radius.md, padding: '4px 8px' },
  qtyBtn:       { background: 'none', border: 'none', fontSize: 16, color: colors.gold.base, cursor: 'pointer', fontWeight: font.weight.black, lineHeight: 1, padding: '0 2px', fontFamily: font.family },
  qtyNum:       { fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary, minWidth: 18, textAlign: 'center' },

  // ── Bottom submit ─────────────────────────────────────────────────────────
  submitBtnBottom: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          '100%',
    background:     `linear-gradient(135deg, ${colors.gold.base} 0%, #f4520f 100%)`,
    color:          '#fff',
    border:         'none',
    borderRadius:   radius.xl,
    fontFamily:     font.family,
    fontSize:       font.size.md,
    fontWeight:     font.weight.bold,
    cursor:         'pointer',
    padding:        '16px',
    marginTop:      28,
    transition:     transition.base,
    boxShadow:      '0 4px 20px rgba(240,165,0,0.25)',
    letterSpacing:  '-0.01em',
  },
  emptyHint: { textAlign: 'center', fontSize: font.size.sm, color: colors.text.muted, marginTop: 48, paddingBottom: 40, lineHeight: 1.6 },
  outlineBtn:{ background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, cursor: 'pointer', padding: '11px 24px', transition: transition.base },

  // ── Item notes ────────────────────────────────────────────────────────────
  notesWrap:  { padding: '8px 12px 10px', borderTop: `1px dashed ${colors.border.subtle}`, marginTop: 4 },
  notesInput: {
    width:        '100%',
    background:   colors.bg.raised,
    border:       `1px solid ${colors.border.subtle}`,
    borderRadius: radius.md,
    color:        colors.text.primary,
    fontFamily:   font.family,
    fontSize:     font.size.xs,
    padding:      '7px 10px',
    outline:      'none',
    boxSizing:    'border-box',
    transition:   transition.fast,
  },

  // ── Submitted state ───────────────────────────────────────────────────────
  submittedCard:  { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius['2xl'], padding: '40px 28px', textAlign: 'center', maxWidth: 360, margin: '0 16px', boxShadow: shadow.lg },
  submittedIcon:  { width: 72, height: 72, borderRadius: radius.full, background: colors.green.dim, border: `1px solid rgba(16,185,129,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' },
  submittedTitle: { fontSize: font.size['2xl'], fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.025em', marginBottom: 8 },
  submittedMeta:  { fontSize: font.size.base, color: colors.text.secondary, marginBottom: 6 },
  submittedHint:  { fontSize: font.size.sm, color: colors.text.muted, marginBottom: 28, lineHeight: 1.5 },
  goldBtn:        { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', background: `linear-gradient(135deg, ${colors.gold.base}, #f4520f)`, color: '#fff', border: 'none', borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.bold, cursor: 'pointer', padding: '14px', marginBottom: 10, transition: transition.base, boxShadow: '0 4px 20px rgba(240,165,0,0.25)' },
  ghostBtn:       { background: 'transparent', border: 'none', color: colors.text.muted, fontFamily: font.family, fontSize: font.size.sm, cursor: 'pointer', padding: '8px', width: '100%', transition: transition.fast },

  // ── Offline banner ────────────────────────────────────────────────────────
  offlineBanner:  { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, background: 'rgba(220,38,38,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: font.size.sm, fontWeight: font.weight.semibold, fontFamily: font.family, letterSpacing: '0.01em', animation: 'slideInUp 0.3s ease' },
  offlineDot:     { width: 8, height: 8, borderRadius: '50%', background: '#fff', flexShrink: 0, animation: 'pulse 1.5s ease infinite' },
};
