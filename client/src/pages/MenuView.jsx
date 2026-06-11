import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket/socket.js';
import { getPhoto, photoUrl, cuisineQuery } from '../utils/unsplash';
import { getMenuSuggestions } from '../api/api';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

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

  // Listen for menu_ready socket event — server emits this when background
  // menu population finishes. Replaces the old 5s polling approach.
  useEffect(() => {
    socket.connect();
    socket.emit('join_session', sessionId);
    socket.on('menu_ready', () => {
      if (Object.keys(menu).length === 0) fetchMenu();
    });
    socket.on('order_placed', () => navigate(`/session/${sessionId}/tracking`));
    return () => {
      socket.off('menu_ready');
      socket.off('order_placed');
      socket.disconnect();
    };
  }, [sessionId, fetchMenu, navigate, menu]);

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

  // Dietary filter — enforce member's own restrictions on the menu they see
  const memberIsVeg  = (me?.diet || []).includes('veg');
  const memberIsJain = (me?.diet || []).includes('jain');

  const allItems = Object.values(menu).flat().filter((item) => {
    if (memberIsJain && !item.jainFriendly) return false;
    if (memberIsVeg  && !item.veg)          return false;
    return true;
  });

  // Rebuild filtered menu (same category structure, items filtered)
  const filteredMenu = {};
  Object.entries(menu).forEach(([cat, items]) => {
    const filtered = items.filter((item) => {
      if (memberIsJain && !item.jainFriendly) return false;
      if (memberIsVeg  && !item.veg)          return false;
      return true;
    });
    if (filtered.length > 0) filteredMenu[cat] = filtered;
  });

  const cartItems  = Object.entries(cart)
    .map(([code, qty]) => { const item = allItems.find((i) => i.itemCode === code); return item ? { ...item, qty } : null; })
    .filter(Boolean);
  const subtotal   = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount  = cartItems.reduce((s, i) => s + i.qty, 0);

  const handleSubmit = async () => {
    if (!me) { alert('Identity not found. Please re-join.'); navigate(`/session/${sessionId}`); return; }
    if (cartItems.length === 0) { alert('Add at least one item.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`/api/sessions/${sessionId}/orders`, {
        memberId: me.memberId, memberName: me.memberName,
        items: cartItems.map((i) => ({ itemCode: i.itemCode, name: i.name, price: i.price, qty: i.qty, veg: i.veg })),
      });
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const CAT_ORDER = ['Starters','Main Course','Breads','Rice & Biryani','Pizzas','Pasta','Burgers','Wraps','Breakfast','Desserts','Beverages'];
  const sortedCategories = Object.keys(filteredMenu).sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1; if (ib === -1) return -1;
    return ia - ib;
  });

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>🍽️</div>
        <p style={{ color: colors.text.secondary, fontSize: font.size.md }}>Loading menu...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <p style={{ color: colors.red.text, marginBottom: 20 }}>{error}</p>
        <button style={s.outlineBtn} onClick={fetchMenu}>Try Again</button>
      </div>
    </div>
  );

  // Restaurant selected but menu still being prepared in background
  if (restaurant && Object.keys(menu).length === 0) return (
    <div style={s.center}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ fontSize: 52, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>👨‍🍳</div>
        <p style={{ fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text.primary, marginBottom: 8 }}>
          Menu being prepared…
        </p>
        <p style={{ fontSize: font.size.sm, color: colors.text.muted, marginBottom: 24 }}>
          Our AI is generating dishes for <strong>{restaurant.name}</strong>.<br/>This takes just a few seconds.
        </p>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {[0,1,2].map((i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: colors.gold.base, animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.22}s` }} />
          ))}
        </div>
      </div>
    </div>
  );

  // ── Submitted ───────────────────────────────────────────────────────────
  if (submitted) return (
    <div style={s.center}>
      <div style={s.submittedCard} className="animate-scale-in">
        <div style={s.submittedIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={colors.green.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={s.submittedTitle}>Order submitted!</h2>
        <p style={s.submittedMeta}>{itemCount} item{itemCount !== 1 ? 's' : ''} · ₹{subtotal}</p>
        <p style={s.submittedHint}>Waiting for everyone else to order...</p>
        <button style={s.goldBtn} onClick={() => navigate(`/session/${sessionId}/cart`)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}>
          View Group Cart →
        </button>
        <button style={s.ghostBtn} onClick={() => setSubmitted(false)}>Edit my order</button>
      </div>
    </div>
  );

  const heroSrc = restaurant.imageUrl
    ? restaurant.imageUrl.replace('/upload/', '/upload/w_700,h_240,c_fill,q_auto,f_auto/')
    : bannerPhoto ? photoUrl(bannerPhoto, 'regular') : null;

  return (
    <div style={s.page}>

      {/* ── Sticky cart bar ──────────────────────────────────────────────── */}
      {itemCount > 0 && (
        <div style={s.cartBar} className="animate-slide-up">
          <div style={s.cartBarLeft}>
            <div style={s.cartCount}>{itemCount}</div>
            <span style={s.cartBarText}>item{itemCount !== 1 ? 's' : ''} in cart</span>
          </div>
          <span style={s.cartTotal}>₹{subtotal}</span>
          <button
            style={{ ...s.cartBarBtn, opacity: submitting ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={submitting}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = colors.gold.soft; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = colors.gold.base; }}
          >
            {submitting ? 'Placing...' : 'Place Order →'}
          </button>
        </div>
      )}

      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <div style={s.hero}>
        {heroSrc ? (
          <>
            <img src={heroSrc} alt={restaurant.name} style={s.heroImg} />
            <div style={s.heroOverlay} />
          </>
        ) : (
          <div style={s.heroFallback}>
            <span style={{ fontSize: 64 }}>{restaurant.imageEmoji || '🍽️'}</span>
          </div>
        )}

        {/* Back button */}
        <button style={s.heroBack} onClick={() => navigate(`/session/${sessionId}/pick-restaurant`)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Restaurant info overlay */}
        <div style={s.heroContent}>
          <h1 style={s.heroName}>{restaurant.name}</h1>
          <div style={s.heroPills}>
            <span style={s.heroPill}>⭐ {restaurant.rating}</span>
            <span style={s.heroPill}>🕐 {restaurant.deliveryTimeMin} min</span>
            <span style={s.heroPill}>₹{restaurant.pricePerPerson}/person</span>
            {(restaurant.cuisines || []).slice(0, 2).map((c) => (
              <span key={c} style={s.heroPill}>{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Member greeting ──────────────────────────────────────────────── */}
      <div style={s.greeting}>
        <span style={s.greetingText}>
          Hey <strong style={{ color: colors.text.gold }}>{me?.memberName || 'there'}</strong> — pick your items below
        </span>
        <div style={s.vegLegend}>
          <span style={s.vegDot} /><span style={{ fontSize: font.size.xs, color: colors.text.muted }}>Veg</span>
          {!memberIsVeg && <><span style={{ ...s.vegDot, background: colors.nonVeg, marginLeft: 10 }} /><span style={{ fontSize: font.size.xs, color: colors.text.muted }}>Non-veg</span></>}
        </div>
      </div>

      {/* ── Dietary filter banner ────────────────────────────────────────── */}
      {(memberIsVeg || memberIsJain) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(16,185,129,0.07)', borderBottom: `1px solid rgba(16,185,129,0.15)`, fontSize: font.size.sm, color: colors.green?.text || '#059669' }}>
          <span>{memberIsJain ? '🌿' : '🥦'}</span>
          <span>
            Showing <strong>{memberIsJain ? 'Jain' : 'veg'} items only</strong> based on your preference
          </span>
        </div>
      )}

      {/* ── AI Suggestions ───────────────────────────────────────────────── */}
      {(suggestionsLoading || suggestions.length > 0) && (
        <div style={s.suggestSection}>
          <div style={s.suggestHeader}>
            <span style={s.suggestTitle}>✨ Suggested for you</span>
            <span style={s.suggestSub}>Personalised picks · AI</span>
          </div>
          <div style={s.suggestScroll}>
            {suggestionsLoading
              ? [1, 2, 3].map((n) => (
                  <div key={n} className="skeleton" style={s.suggestSkeletonCard} />
                ))
              : suggestions.map((item) => {
                  const qty = cart[item.itemCode] || 0;
                  return (
                    <div key={item.id} style={s.suggestCard}>
                      <div style={s.suggestCardTop}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ ...s.vegIndicatorSm, background: item.veg ? colors.veg : colors.nonVeg }} />
                          <span style={s.suggestItemName}>{item.name}</span>
                        </div>
                        {item.isRepeat && (
                          <span style={s.repeatBadge}>🔁 Again</span>
                        )}
                      </div>
                      <p style={s.suggestReason}>{item.reason}</p>
                      <div style={s.suggestCardBottom}>
                        <span style={s.suggestPrice}>₹{item.price}</span>
                        {qty === 0 ? (
                          <button
                            style={s.suggestAddBtn}
                            onClick={() => changeQty(item, 1)}
                            onMouseEnter={(e) => { e.currentTarget.style.background = colors.gold.base; e.currentTarget.style.color = colors.text.inverse; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.gold; }}
                          >
                            + ADD
                          </button>
                        ) : (
                          <div style={{ ...s.qtyControl, padding: '3px 7px' }}>
                            <button style={s.qtyBtn} onClick={() => changeQty(item, -1)}>−</button>
                            <span style={{ ...s.qtyNum, fontSize: font.size.sm }}>{qty}</span>
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

      {/* ── Category nav (sticky) ────────────────────────────────────────── */}
      <div style={s.catNavWrap}>
        <div style={s.catNav}>
          {sortedCategories.map((cat) => (
            <button
              key={cat}
              style={{
                ...s.catTab,
                ...(activeCategory === cat ? s.catTabActive : {}),
              }}
              onClick={() => {
                setActiveCategory(cat);
                document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Menu sections ────────────────────────────────────────────────── */}
      <div style={s.menuBody}>
        {sortedCategories.map((category) => (
          <div key={category} id={`cat-${category}`} style={s.section}>
            <h2 style={s.catTitle}>{category}</h2>
            <div style={s.itemList}>
              {filteredMenu[category].map((item) => {
                const qty      = cart[item.itemCode] || 0;
                const thumbUrl = itemPhotos[item.itemCode];
                return (
                  <div key={item.itemCode} style={s.itemCard}>
                    {/* Left: info */}
                    <div style={s.itemInfo}>
                      <div style={s.itemNameRow}>
                        <span style={{ ...s.vegIndicator, background: item.veg ? colors.veg : colors.nonVeg }} />
                        <p style={s.itemName}>{item.name}</p>
                      </div>
                      {item.description && <p style={s.itemDesc}>{item.description}</p>}
                      {(item.tags || []).length > 0 && (
                        <div style={s.itemTags}>
                          {item.tags.map((t) => <span key={t} style={s.miniTag}>{t}</span>)}
                          {item.jainFriendly && <span style={{ ...s.miniTag, color: colors.green.text }}>🌿 Jain</span>}
                        </div>
                      )}
                      <p style={s.itemPrice}>₹{item.price}</p>
                    </div>

                    {/* Right: image + cart control */}
                    <div style={s.itemRight}>
                      {thumbUrl && (
                        <div style={s.thumbWrap}>
                          <img src={thumbUrl} alt={item.name} style={s.thumb} />
                        </div>
                      )}
                      {qty === 0 ? (
                        <button
                          style={s.addBtn}
                          onClick={() => changeQty(item, 1)}
                          onMouseEnter={(e) => { e.currentTarget.style.background = colors.gold.base; e.currentTarget.style.color = colors.text.inverse; e.currentTarget.style.borderColor = colors.gold.base; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.gold; e.currentTarget.style.borderColor = colors.gold.muted; }}
                        >
                          + ADD
                        </button>
                      ) : (
                        <div style={s.qtyControl}>
                          <button style={s.qtyBtn} onClick={() => changeQty(item, -1)}>−</button>
                          <span style={s.qtyNum}>{qty}</span>
                          <button style={s.qtyBtn} onClick={() => changeQty(item, 1)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Bottom submit */}
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
          <p style={s.emptyHint}>Add items from the menu above</p>
        )}

        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}

const s = {
  page:   { minHeight: '100vh', background: colors.bg.base, paddingBottom: 0 },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Sticky cart bar
  cartBar: {
    position:      'fixed',
    bottom:        0,
    left:          0,
    right:         0,
    zIndex:        100,
    background:    colors.bg.surface,
    borderTop:     `1px solid ${colors.border.default}`,
    backdropFilter:'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'space-between',
    padding:       '12px 20px',
    boxShadow:     '0 -4px 24px rgba(0,0,0,0.08)',
  },
  cartBarLeft:{ display: 'flex', alignItems: 'center', gap: 10 },
  cartCount:  { width: 26, height: 26, borderRadius: radius.full, background: colors.gold.base, color: colors.text.inverse, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: font.size.sm, fontWeight: font.weight.bold },
  cartBarText:{ fontSize: font.size.sm, color: colors.text.secondary, fontWeight: font.weight.medium },
  cartTotal:  { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary },
  cartBarBtn: { background: colors.gold.base, color: '#FFFFFF', border: 'none', borderRadius: radius.md, padding: '9px 18px', fontSize: font.size.sm, fontWeight: font.weight.bold, cursor: 'pointer', transition: transition.base, letterSpacing: '-0.01em', boxShadow: '0 2px 8px rgba(244,82,15,0.3)' },

  // Hero
  hero:        { position: 'relative', height: 220, overflow: 'hidden' },
  heroImg:     { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,7,16,0.85) 0%, rgba(7,7,16,0.1) 60%)' },
  heroFallback:{ width: '100%', height: '100%', background: `linear-gradient(135deg, #FFF0E2 0%, #FFD9B3 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  heroBack:    { position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: radius.md, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: `1px solid rgba(255,255,255,0.15)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  heroContent: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  heroName:    { fontSize: font.size['2xl'], fontWeight: font.weight.bold, color: '#fff', letterSpacing: '-0.025em', margin: '0 0 8px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' },
  heroPills:   { display: 'flex', flexWrap: 'wrap', gap: 6 },
  heroPill:    { padding: '3px 10px', borderRadius: radius.full, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', fontSize: font.size.xs, color: 'rgba(255,255,255,0.85)', fontWeight: font.weight.medium },

  greeting:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${colors.border.subtle}` },
  greetingText:{ fontSize: font.size.sm, color: colors.text.muted },
  vegLegend:   { display: 'flex', alignItems: 'center', gap: 4 },
  vegDot:      { width: 8, height: 8, borderRadius: '50%', background: colors.veg, flexShrink: 0 },

  // Category nav
  catNavWrap: { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,248,242,0.95)', borderBottom: `1px solid ${colors.border.subtle}`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 1px 0 rgba(0,0,0,0.05)' },
  catNav:     { display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 12px' },
  catTab:     { padding: '12px 14px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '2px solid transparent', background: 'transparent', cursor: 'pointer', fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, color: colors.text.muted, whiteSpace: 'nowrap', transition: transition.base, flexShrink: 0 },
  catTabActive:{ color: colors.text.gold, borderBottom: `2px solid ${colors.gold.base}` },

  menuBody:  { maxWidth: 680, margin: '0 auto', padding: '0 16px' },
  section:   { paddingTop: 28, marginBottom: 4 },
  catTitle:  { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text.secondary, margin: '0 0 12px', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: font.size.xs },
  itemList:  { display: 'flex', flexDirection: 'column', gap: 2 },

  // Item card
  itemCard: {
    display:       'flex',
    alignItems:    'flex-start',
    justifyContent:'space-between',
    gap:           12,
    padding:       '16px 0',
    borderBottom:  `1px solid ${colors.border.subtle}`,
  },
  itemInfo:    { flex: 1, minWidth: 0 },
  itemNameRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  vegIndicator:{ width: 9, height: 9, borderRadius: '2px', flexShrink: 0, border: `1.5px solid currentColor` },
  itemName:    { fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary, margin: 0 },
  itemDesc:    { fontSize: font.size.sm, color: colors.text.muted, margin: '0 0 6px', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  itemTags:    { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  miniTag:     { fontSize: '10px', color: colors.text.muted, background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, padding: '1px 7px', borderRadius: radius.full },
  itemPrice:   { fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.text.primary, margin: 0 },

  // Right side
  itemRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  thumbWrap: { width: 72, height: 72, borderRadius: radius.lg, overflow: 'hidden', flexShrink: 0 },
  thumb:     { width: '100%', height: '100%', objectFit: 'cover' },
  addBtn:    { padding: '6px 14px', borderRadius: radius.md, background: 'transparent', color: colors.text.gold, border: `1.5px solid ${colors.gold.muted}`, fontSize: font.size.xs, fontWeight: font.weight.bold, cursor: 'pointer', letterSpacing: '0.06em', transition: transition.base, fontFamily: font.family },
  qtyControl:{ display: 'flex', alignItems: 'center', gap: 8, background: colors.gold.dim, border: `1px solid rgba(240,165,0,0.2)`, borderRadius: radius.md, padding: '4px 8px' },
  qtyBtn:    { background: 'none', border: 'none', fontSize: 18, color: colors.gold.base, cursor: 'pointer', fontWeight: font.weight.bold, lineHeight: 1, padding: '0 2px', fontFamily: font.family },
  qtyNum:    { fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.text.primary, minWidth: 18, textAlign: 'center' },

  submitBtnBottom: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          '100%',
    background:     colors.gold.base,
    color:          colors.text.inverse,
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
  emptyHint: { textAlign: 'center', fontSize: font.size.sm, color: colors.text.muted, marginTop: 48, paddingBottom: 40 },
  outlineBtn:{ background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.base, cursor: 'pointer', padding: '11px 24px', transition: transition.base },

  // ── AI Suggestions strip ────────────────────────────────────────────────────
  suggestSection: { padding: '14px 0 0', borderBottom: `1px solid ${colors.border.subtle}`, background: colors.bg.base },
  suggestHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 16px 10px' },
  suggestTitle:   { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary },
  suggestSub:     { fontSize: font.size.xs, color: colors.text.muted },
  suggestScroll:  { display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 16px 14px' },
  suggestCard: {
    flexShrink:   0,
    width:        168,
    background:   colors.bg.surface,
    border:       `1px solid rgba(240,165,0,0.15)`,
    borderRadius: radius.lg,
    padding:      '11px 12px',
    display:      'flex',
    flexDirection:'column',
    gap:          6,
  },
  suggestCardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  suggestItemName:  { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, lineHeight: 1.3 },
  repeatBadge:      { fontSize: '10px', color: colors.gold.soft, background: colors.gold.dim, border: `1px solid rgba(240,165,0,0.2)`, borderRadius: radius.full, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 },
  suggestReason:    { fontSize: '11px', color: colors.text.muted, lineHeight: 1.4, margin: 0, flex: 1 },
  suggestCardBottom:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  suggestPrice:     { fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary },
  suggestAddBtn:    { padding: '4px 10px', borderRadius: radius.sm, background: 'transparent', color: colors.text.gold, border: `1px solid ${colors.gold.muted}`, fontSize: '10px', fontWeight: font.weight.bold, cursor: 'pointer', letterSpacing: '0.04em', transition: transition.fast, fontFamily: font.family },
  suggestSkeletonCard:{ flexShrink: 0, width: 168, height: 110, borderRadius: radius.lg },
  vegIndicatorSm:   { width: 8, height: 8, borderRadius: '2px', flexShrink: 0, border: '1.5px solid currentColor' },

  // Submitted
  submittedCard: { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius['2xl'], padding: '36px 28px', textAlign: 'center', maxWidth: 360, margin: '0 16px', boxShadow: shadow.lg },
  submittedIcon: { width: 64, height: 64, borderRadius: radius.full, background: colors.green.dim, border: `1px solid rgba(16,185,129,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  submittedTitle:{ fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.02em', marginBottom: 6 },
  submittedMeta: { fontSize: font.size.base, color: colors.text.secondary, marginBottom: 4 },
  submittedHint: { fontSize: font.size.sm, color: colors.text.muted, marginBottom: 24 },
  goldBtn:       { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', background: colors.gold.base, color: colors.text.inverse, border: 'none', borderRadius: radius.lg, fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.bold, cursor: 'pointer', padding: '13px', marginBottom: 10, transition: transition.base, boxShadow: '0 4px 20px rgba(240,165,0,0.25)' },
  ghostBtn:      { background: 'transparent', border: 'none', color: colors.text.muted, fontFamily: font.family, fontSize: font.size.sm, cursor: 'pointer', padding: '8px', width: '100%', transition: transition.fast },
};
