import { useEffect, useState, useCallback } from 'react';
import axios from 'axios'; // Cloudinary upload only — do NOT use for backend calls
import API, { getAdminDashboard } from '../api/api';
import { searchPhotos, photoUrl, trackDownload } from '../utils/unsplash';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_CFG = {
  collecting:        { label: 'Collecting',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  dot: true  },
  restaurant_picked: { label: 'Restaurant ✓',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)', dot: true  },
  ordering:          { label: 'Ordering',        color: '#6366f1', bg: 'rgba(99,102,241,0.12)', dot: true  },
  order_placed:      { label: 'Placed ✓',        color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: false },
  preparing:         { label: 'Preparing 🍳',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: true  },
  out_for_delivery:  { label: 'On the way 🛵',   color: '#f0a500', bg: 'rgba(240,165,0,0.12)',  dot: true  },
  delivered:         { label: 'Delivered 🎉',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: false },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: colors.text.muted, bg: colors.bg.raised, dot: false };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: radius.full, background: cfg.bg, border: `1px solid ${cfg.color}28`, fontSize: font.size.xs, fontWeight: font.weight.semibold, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0, animation: 'pulse 2s ease infinite' }} />}
      {cfg.label}
    </span>
  );
}

const BUDGET_LABEL = { under200: '< ₹200', '200to400': '₹200–400', any: 'Any' };

// ── Cloudinary upload (for Restaurants tab) ───────────────────────────────────
const CLOUD_NAME    = 'dopc26kti';
const UPLOAD_PRESET = 'group_lunch_preset';

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'group_lunch/restaurants');
  const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data.secure_url;
}
function optimiseUrl(url, w = 400, h = 300) {
  if (!url) return null;
  return url.replace('/upload/', `/upload/w_${w},h_${h},c_fill,q_auto,f_auto/`);
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, live }) {
  return (
    <div style={{ background: colors.bg.surface, border: `1px solid ${accent || colors.border.default}22`, borderRadius: radius.xl, padding: '18px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {live && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: font.size['2xs'], color: colors.green.text, fontWeight: font.weight.semibold, letterSpacing: '0.06em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.green.base, animation: 'pulse 1.5s ease infinite' }} />
            LIVE
          </span>
        )}
      </div>
      <p style={{ fontSize: font.size['3xl'], fontWeight: font.weight.black, color: accent || colors.text.primary, margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>{value ?? '—'}</p>
      <p style={{ fontSize: font.size.xs, color: colors.text.muted, margin: '4px 0 0', fontWeight: font.weight.medium }}>{label}</p>
    </div>
  );
}

// ── Expanded session detail ───────────────────────────────────────────────────
function SessionDetail({ session }) {
  const allMembers = session.members || [];
  const orderMap   = {};
  (session.orders || []).forEach((o) => { orderMap[o.memberName] = o; });
  const prefMap    = {};
  (session.preferences || []).forEach((p) => { prefMap[p.memberName] = p; });

  return (
    <div style={d.wrap}>
      {/* Restaurant bar */}
      {session.restaurant ? (
        <div style={d.restBar}>
          <span style={{ fontSize: 28 }}>{session.restaurant.imageEmoji}</span>
          <div>
            <p style={d.restName}>{session.restaurant.name}</p>
            <p style={d.restMeta}>⭐ {session.restaurant.rating} · 🕐 {session.restaurant.deliveryTimeMin} min · {session.restaurant.cuisines?.join(', ')}</p>
          </div>
          {session.orderTotal > 0 && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <p style={{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.text.gold, margin: 0 }}>₹{session.finalTotal}</p>
              {session.couponSavings > 0 && <p style={{ fontSize: font.size.xs, color: colors.green.text, margin: 0 }}>- ₹{session.couponSavings} coupon ({session.couponCode})</p>}
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: font.size.sm, color: colors.text.muted, padding: '12px 0 4px' }}>No restaurant selected yet</p>
      )}

      {/* Members table */}
      <div style={d.table}>
        {/* Header */}
        <div style={d.tableHead}>
          <span style={{ flex: '0 0 140px' }}>Member</span>
          <span style={{ flex: '0 0 130px' }}>Preferences</span>
          <span style={{ flex: 1 }}>Ordered Items</span>
          <span style={{ flex: '0 0 70px', textAlign: 'right' }}>Total</span>
        </div>

        {allMembers.map((m, i) => {
          const order = orderMap[m.memberName];
          const pref  = prefMap[m.memberName];
          return (
            <div key={m.memberId} style={{ ...d.tableRow, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
              {/* Member name */}
              <div style={{ flex: '0 0 140px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={d.avatar}>{m.memberName.charAt(0).toUpperCase()}</div>
                <div>
                  <p style={d.memberName}>{m.memberName}</p>
                  {session.organizerName === m.memberName && <span style={d.organizerBadge}>organizer</span>}
                </div>
              </div>

              {/* Preferences */}
              <div style={{ flex: '0 0 130px' }}>
                {pref ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {(pref.diet || []).filter(d => d !== 'none').map((d) => (
                      <span key={d} style={d2.prefChip}>{d === 'veg' ? '🥦 veg' : d === 'jain' ? '🌿 jain' : d === 'no-spicy' ? '🌶 no spicy' : d === 'no-peanuts' ? '🥜 no peanuts' : d}</span>
                    ))}
                    <span style={{ ...d2.prefChip, color: colors.blue.text, borderColor: 'rgba(99,102,241,0.2)' }}>{BUDGET_LABEL[pref.budget] || pref.budget}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: font.size.xs, color: colors.text.muted }}>Not submitted</span>
                )}
              </div>

              {/* Order items */}
              <div style={{ flex: 1 }}>
                {order?.items?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {order.items.map((item, j) => (
                      <span key={j} style={d2.itemChip}>
                        <span style={{ width: 7, height: 7, borderRadius: '1.5px', background: item.veg ? colors.veg : colors.nonVeg, flexShrink: 0, display: 'inline-block' }} />
                        {item.qty > 1 && <strong>{item.qty}×</strong>} {item.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: font.size.xs, color: colors.text.muted }}>{session.status === 'collecting' || session.status === 'restaurant_picked' ? '—' : 'No order'}</span>
                )}
              </div>

              {/* Subtotal */}
              <div style={{ flex: '0 0 70px', textAlign: 'right' }}>
                {order ? (
                  <span style={{ fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary }}>₹{order.subtotal}</span>
                ) : (
                  <span style={{ fontSize: font.size.xs, color: colors.text.muted }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      {session.deliveryAddress && (
        <p style={{ fontSize: font.size.xs, color: colors.text.muted, marginTop: 10 }}>
          📍 {session.deliveryAddress} {session.placedAt && `· Placed at ${fmtTime(session.placedAt)}`}
        </p>
      )}
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [tab,           setTab]           = useState('dashboard');
  const [stats,         setStats]         = useState(null);
  const [sessions,      setSessions]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [expanded,      setExpanded]      = useState({});
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');

  // Restaurants tab state (existing image manager)
  const [restaurants,     setRestaurants]     = useState([]);
  const [restLoading,     setRestLoading]     = useState(false);
  const [uploading,       setUploading]       = useState({});
  const [uploadSuccess,   setUploadSuccess]   = useState({});
  const [unsplashOpen,    setUnsplashOpen]    = useState({});
  const [unsplashQuery,   setUnsplashQuery]   = useState({});
  const [unsplashResults, setUnsplashResults] = useState({});
  const [unsplashLoading, setUnsplashLoading] = useState({});
  const [savingUnsplash,  setSavingUnsplash]  = useState({});

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await getAdminDashboard();
      setStats(res.data.stats);
      setSessions(res.data.sessions || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => fetchDashboard(true), 20000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Load restaurants when switching to that tab
  useEffect(() => {
    if (tab !== 'restaurants' || restaurants.length > 0) return;
    setRestLoading(true);
    API.get('/restaurants')
      .then((res) => setRestaurants(res.data.data || []))
      .finally(() => setRestLoading(false));
  }, [tab]);

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filtered = sessions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.organizerName.toLowerCase().includes(q) ||
        s.sessionUuid.includes(q) ||
        (s.restaurant?.name?.toLowerCase().includes(q)) ||
        (s.members || []).some((m) => m.memberName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const STATUS_FILTERS = ['all', 'collecting', 'ordering', 'order_placed', 'preparing', 'out_for_delivery', 'delivered'];

  // ── Restaurant image manager handlers ────────────────────────────────────
  const handleFileChange = async (e, id) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Max 5 MB'); return; }
    setUploading((p) => ({ ...p, [id]: true }));
    try {
      const url = await uploadToCloudinary(file);
      await API.patch(`/restaurants/${id}/image`, { imageUrl: url });
      setRestaurants((p) => p.map((r) => r.id === id ? { ...r, imageUrl: url } : r));
      setUploadSuccess((p) => ({ ...p, [id]: true }));
      setTimeout(() => setUploadSuccess((p) => ({ ...p, [id]: false })), 3000);
    } catch (err) { alert('Upload failed: ' + err.message); }
    finally { setUploading((p) => ({ ...p, [id]: false })); e.target.value = ''; }
  };

  const openUnsplash = async (r) => {
    const { id } = r;
    const query = r.name + ' restaurant food';
    setUnsplashOpen((p) => ({ ...p, [id]: true }));
    setUnsplashQuery((p) => ({ ...p, [id]: query }));
    setUnsplashLoading((p) => ({ ...p, [id]: true }));
    const photos = await searchPhotos(query, 9);
    setUnsplashResults((p) => ({ ...p, [id]: photos }));
    setUnsplashLoading((p) => ({ ...p, [id]: false }));
  };

  const runUnsplashSearch = async (id) => {
    setUnsplashLoading((p) => ({ ...p, [id]: true }));
    const photos = await searchPhotos(unsplashQuery[id] || '', 9);
    setUnsplashResults((p) => ({ ...p, [id]: photos }));
    setUnsplashLoading((p) => ({ ...p, [id]: false }));
  };

  const useUnsplashPhoto = async (id, photo) => {
    const url = photoUrl(photo, 'regular');
    setSavingUnsplash((p) => ({ ...p, [id]: true }));
    try {
      await API.patch(`/restaurants/${id}/image`, { imageUrl: url });
      trackDownload(photo);
      setRestaurants((p) => p.map((r) => r.id === id ? { ...r, imageUrl: url } : r));
      setUnsplashOpen((p) => ({ ...p, [id]: false }));
    } catch (err) { alert('Could not save: ' + err.message); }
    finally { setSavingUnsplash((p) => ({ ...p, [id]: false })); }
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: colors.bg.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 16, animation: 'float 2.5s ease infinite' }}>📊</div>
        <p style={{ color: colors.text.secondary, fontSize: font.size.md }}>Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div style={s.page}>

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <span style={{ fontSize: 22 }}>🍱</span>
          <span style={s.topTitle}>Group Lunch Admin</span>
          {refreshing && <span style={s.refreshing}>↻ refreshing</span>}
        </div>
        <div style={s.topRight}>
          {lastRefresh && (
            <span style={s.lastRefreshText}>Updated {timeAgo(lastRefresh)}</span>
          )}
          <button style={s.refreshBtn} onClick={() => fetchDashboard(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7A5 5 0 1 1 7 2M7 2l2.5 2.5M7 2L4.5 4.5" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Refresh
          </button>
          {/* Tab switcher */}
          <div style={s.tabSwitcher}>
            {['dashboard', 'restaurants'].map((t) => (
              <button key={t} style={{ ...s.tabBtn, ...(tab === t ? s.tabBtnActive : {}) }} onClick={() => setTab(t)}>
                {t === 'dashboard' ? '📊 Dashboard' : '🖼️ Restaurants'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={s.body}>

        {/* ══════════════ DASHBOARD TAB ══════════════ */}
        {tab === 'dashboard' && (
          <>
            {/* Stats row */}
            <div style={s.statsRow}>
              <StatCard icon="📋" label="Total Sessions"  value={stats?.totalSessions}  />
              <StatCard icon="🟢" label="Active Now"       value={stats?.activeSessions}  accent={colors.green.base} live />
              <StatCard icon="📦" label="Orders Placed"   value={stats?.ordersPlaced}    accent={colors.blue.base} />
              <StatCard icon="💰" label="Total Revenue"   value={stats?.totalRevenue > 0 ? `₹${stats.totalRevenue.toLocaleString('en-IN')}` : '₹0'} accent={colors.gold.base} />
            </div>

            {/* Filters */}
            <div style={s.filtersRow}>
              <div style={s.searchWrap}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="6" cy="6" r="4.5" stroke={colors.text.muted} strokeWidth="1.4"/>
                  <path d="M9.5 9.5l2.5 2.5" stroke={colors.text.muted} strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  style={s.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by organizer, member, restaurant…"
                />
              </div>
              <div style={s.statusPills}>
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f}
                    style={{ ...s.filterPill, ...(statusFilter === f ? s.filterPillActive : {}) }}
                    onClick={() => setStatusFilter(f)}
                  >
                    {f === 'all' ? 'All' : (STATUS_CFG[f]?.label || f)}
                  </button>
                ))}
              </div>
            </div>

            {/* Session count */}
            <div style={s.countRow}>
              <span style={s.countText}>{filtered.length} session{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Sessions list */}
            {filtered.length === 0 ? (
              <div style={s.empty}>
                <span style={{ fontSize: 44, marginBottom: 12, display: 'block' }}>🍽️</span>
                <p style={{ color: colors.text.secondary, margin: 0 }}>No sessions found</p>
              </div>
            ) : (
              <div style={s.sessionList}>
                {filtered.map((session) => {
                  const isOpen = expanded[session.sessionUuid];
                  return (
                    <div
                      key={session.sessionUuid}
                      style={{ ...s.sessionCard, ...(isOpen ? s.sessionCardOpen : {}) }}
                    >
                      {/* ── Row ── */}
                      <div
                        style={s.sessionRow}
                        onClick={() => setExpanded((p) => ({ ...p, [session.sessionUuid]: !p[session.sessionUuid] }))}
                      >
                        {/* Organizer */}
                        <div style={s.col1}>
                          <div style={s.orgAvatar}>{session.organizerName.charAt(0).toUpperCase()}</div>
                          <div>
                            <p style={s.orgName}>{session.organizerName}</p>
                            <p style={s.sessionId}>{session.sessionUuid.slice(0, 8)}…</p>
                          </div>
                        </div>

                        {/* Restaurant */}
                        <div style={s.col2}>
                          {session.restaurant ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 20 }}>{session.restaurant.imageEmoji}</span>
                              <div>
                                <p style={s.restNameSm}>{session.restaurant.name}</p>
                                <p style={s.restMetaSm}>{session.restaurant.cuisines?.slice(0,2).join(', ')}</p>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: font.size.xs, color: colors.text.muted }}>No restaurant yet</span>
                          )}
                        </div>

                        {/* Members */}
                        <div style={s.col3}>
                          <div style={s.memberPill}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="4.5" cy="3.5" r="2" stroke={colors.text.secondary} strokeWidth="1.2"/><path d="M1 10c0-2 1.6-3.5 3.5-3.5S8 8 8 10" stroke={colors.text.secondary} strokeWidth="1.2" strokeLinecap="round"/><circle cx="9" cy="4" r="1.5" stroke={colors.text.secondary} strokeWidth="1.2"/><path d="M9.5 7.5c.9.3 1.5 1 1.5 2" stroke={colors.text.secondary} strokeWidth="1.2" strokeLinecap="round"/></svg>
                            {session.memberCount}
                          </div>
                          <div style={s.prefPill}>{session.preferencesCount}/{session.memberCount} prefs</div>
                        </div>

                        {/* Status + total + time */}
                        <div style={s.col4}>
                          <StatusBadge status={session.status} />
                          {session.orderTotal > 0 && (
                            <span style={s.totalChip}>₹{session.finalTotal.toLocaleString('en-IN')}</span>
                          )}
                        </div>

                        <div style={s.col5}>
                          <span style={s.timeAgo}>{timeAgo(session.createdAt)}</span>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transition: transition.base, transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                            <path d="M3 5l4 4 4-4" stroke={colors.text.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>

                      {/* ── Expanded detail ── */}
                      {isOpen && <SessionDetail session={session} />}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════ RESTAURANTS TAB ══════════════ */}
        {tab === 'restaurants' && (
          <div style={{ maxWidth: 900 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text.primary, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Restaurant Image Manager</h2>
              <p style={{ fontSize: font.size.sm, color: colors.text.muted, margin: 0 }}>Upload photos or pick from Unsplash. Stored on Cloudinary, auto-optimised across the app.</p>
            </div>

            {restLoading ? (
              <p style={{ color: colors.text.muted }}>Loading restaurants…</p>
            ) : (
              <div style={rs.grid}>
                {restaurants.map((r) => (
                  <div key={r.id} style={rs.card}>
                    <div style={rs.imgWrap}>
                      {r.imageUrl ? (
                        <img src={optimiseUrl(r.imageUrl, 400, 240)} alt={r.name} style={rs.img} />
                      ) : (
                        <div style={rs.placeholder}>
                          <span style={{ fontSize: 48 }}>{r.imageEmoji || '🍽️'}</span>
                          <span style={{ fontSize: font.size.xs, color: colors.text.muted }}>No image</span>
                        </div>
                      )}
                      {uploading[r.id] && (
                        <div style={rs.overlay}><div style={rs.spin} className="gl-spinner" /><span style={{ color: '#fff', fontSize: font.size.xs }}>Uploading…</span></div>
                      )}
                      {uploadSuccess[r.id] && (
                        <div style={{ ...rs.overlay, background: 'rgba(16,185,129,0.8)' }}><span style={{ color: '#fff', fontWeight: 700 }}>✅ Saved!</span></div>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px 14px' }}>
                      <p style={{ fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.text.primary, margin: '0 0 2px' }}>{r.name}</p>
                      <p style={{ fontSize: font.size.xs, color: colors.text.muted, margin: '0 0 10px' }}>{r.area} · ⭐{r.rating}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <label style={rs.uploadBtn}>
                          📷 Upload
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, r.id)} disabled={uploading[r.id]} />
                        </label>
                        <button style={rs.unsplashBtn} onClick={() => unsplashOpen[r.id] ? setUnsplashOpen((p) => ({ ...p, [r.id]: false })) : openUnsplash(r)}>
                          {unsplashOpen[r.id] ? '✕ Close' : '🔍 Unsplash'}
                        </button>
                      </div>
                      {unsplashOpen[r.id] && (
                        <div style={{ marginTop: 10, borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 10 }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                            <input
                              style={rs.searchInput}
                              value={unsplashQuery[r.id] || ''}
                              onChange={(e) => setUnsplashQuery((p) => ({ ...p, [r.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && runUnsplashSearch(r.id)}
                              placeholder="Search Unsplash…"
                            />
                            <button style={rs.searchBtn} onClick={() => runUnsplashSearch(r.id)} disabled={unsplashLoading[r.id]}>
                              {unsplashLoading[r.id] ? '…' : '🔍'}
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                            {(unsplashResults[r.id] || []).map((photo) => (
                              <div key={photo.id} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', aspectRatio: '4/3' }} onClick={() => useUnsplashPhoto(r.id, photo)}>
                                <img src={photoUrl(photo, 'thumb')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                {savingUnsplash[r.id] && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⏳</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Dashboard styles ──────────────────────────────────────────────────────────
const s = {
  page: { minHeight: '100vh', background: colors.bg.base, paddingBottom: 60 },

  topBar: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '14px 24px',
    background:      colors.bg.canvas,
    borderBottom:    `1px solid ${colors.border.subtle}`,
    position:        'sticky',
    top:             0,
    zIndex:          100,
    backdropFilter:  'blur(12px)',
    gap:             16,
    flexWrap:        'wrap',
  },
  topLeft:  { display: 'flex', alignItems: 'center', gap: 10 },
  topTitle: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text.primary, letterSpacing: '-0.01em' },
  refreshing:{ fontSize: font.size.xs, color: colors.text.muted, animation: 'pulse 1.5s ease infinite' },

  topRight:       { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  lastRefreshText:{ fontSize: font.size.xs, color: colors.text.muted },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: radius.md,
    background: colors.bg.raised, border: `1px solid ${colors.border.default}`,
    color: colors.text.secondary, fontSize: font.size.xs, fontWeight: font.weight.medium,
    cursor: 'pointer', fontFamily: font.family, transition: transition.fast,
  },
  tabSwitcher: { display: 'flex', background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, overflow: 'hidden' },
  tabBtn:      { padding: '7px 14px', background: 'transparent', border: 'none', color: colors.text.muted, fontSize: font.size.xs, fontWeight: font.weight.semibold, cursor: 'pointer', fontFamily: font.family, transition: transition.fast, whiteSpace: 'nowrap' },
  tabBtnActive:{ background: colors.bg.overlay, color: colors.text.primary },

  body: { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' },

  statsRow: { display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' },

  filtersRow: { display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  searchWrap: { position: 'relative', flex: 1, minWidth: 220 },
  searchInput:{
    width: '100%', boxSizing: 'border-box',
    background: colors.bg.surface, border: `1px solid ${colors.border.default}`,
    borderRadius: radius.lg, color: colors.text.primary, fontFamily: font.family,
    fontSize: font.size.sm, padding: '9px 14px 9px 34px', outline: 'none',
  },
  statusPills: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  filterPill: {
    padding: '6px 12px', borderRadius: radius.full,
    background: colors.bg.surface, border: `1px solid ${colors.border.default}`,
    color: colors.text.muted, fontSize: font.size.xs, fontWeight: font.weight.medium,
    cursor: 'pointer', fontFamily: font.family, transition: transition.fast, whiteSpace: 'nowrap',
  },
  filterPillActive: { background: colors.bg.overlay, color: colors.text.primary, borderColor: colors.border.strong },

  countRow: { marginBottom: 10 },
  countText: { fontSize: font.size.xs, color: colors.text.muted, fontWeight: font.weight.medium, letterSpacing: '0.04em' },

  sessionList: { display: 'flex', flexDirection: 'column', gap: 6 },

  sessionCard: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.subtle}`,
    borderRadius: radius.xl,
    overflow:     'hidden',
    transition:   transition.base,
  },
  sessionCardOpen: { border: `1px solid ${colors.border.default}`, boxShadow: shadow.md },

  sessionRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
    padding:    '14px 16px',
    cursor:     'pointer',
    flexWrap:   'wrap',
  },

  col1: { display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 180px', minWidth: 0 },
  col2: { flex: '0 0 170px', minWidth: 0 },
  col3: { display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 120px' },
  col4: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  col5: { display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 },

  orgAvatar: {
    width: 34, height: 34, borderRadius: radius.full,
    background: 'rgba(240,165,0,0.12)', border: '1.5px solid rgba(240,165,0,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.gold.base,
    flexShrink: 0,
  },
  orgName:   { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, margin: 0, lineHeight: 1.3 },
  sessionId: { fontSize: font.size.xs, color: colors.text.muted, margin: 0, fontFamily: 'monospace' },

  restNameSm: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, margin: 0, lineHeight: 1.3 },
  restMetaSm: { fontSize: font.size.xs, color: colors.text.muted, margin: 0 },

  memberPill: { display: 'flex', alignItems: 'center', gap: 4, fontSize: font.size.xs, color: colors.text.secondary, background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.full, padding: '3px 9px' },
  prefPill:   { fontSize: font.size.xs, color: colors.text.muted },
  totalChip:  { fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.gold },
  timeAgo:    { fontSize: font.size.xs, color: colors.text.muted, whiteSpace: 'nowrap' },

  empty: { textAlign: 'center', padding: '60px 0', color: colors.text.muted },
};

// ── Session detail styles ─────────────────────────────────────────────────────
const d = {
  wrap:      { padding: '0 16px 16px', borderTop: `1px solid ${colors.border.subtle}` },
  restBar:   { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0 12px', borderBottom: `1px solid ${colors.border.subtle}`, marginBottom: 12 },
  restName:  { fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.text.primary, margin: 0 },
  restMeta:  { fontSize: font.size.xs, color: colors.text.muted, margin: 0 },
  table:     { display: 'flex', flexDirection: 'column', gap: 0 },
  tableHead: { display: 'flex', gap: 12, padding: '6px 0', fontSize: font.size.xs, color: colors.text.muted, fontWeight: font.weight.semibold, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${colors.border.subtle}`, marginBottom: 4 },
  tableRow:  { display: 'flex', gap: 12, padding: '10px 6px', alignItems: 'flex-start', borderRadius: radius.md },
  avatar:    { width: 28, height: 28, borderRadius: radius.full, background: colors.bg.overlay, border: `1px solid ${colors.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: font.size.xs, fontWeight: font.weight.bold, color: colors.text.secondary, flexShrink: 0 },
  memberName:{ fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary, margin: 0, lineHeight: 1.3 },
  organizerBadge: { fontSize: '10px', color: colors.gold.soft, background: colors.gold.dim, border: '1px solid rgba(240,165,0,0.2)', borderRadius: radius.full, padding: '1px 6px' },
};

const d2 = {
  prefChip: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '10px', color: colors.green.text, background: colors.green.dim, border: '1px solid rgba(16,185,129,0.2)', borderRadius: radius.full, padding: '2px 7px' },
  itemChip: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: font.size.xs, color: colors.text.secondary, background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.full, padding: '2px 8px' },
};

// ── Restaurants tab styles ────────────────────────────────────────────────────
const rs = {
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 16 },
  card:      { background: colors.bg.surface, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl, overflow: 'hidden' },
  imgWrap:   { position: 'relative', height: 160, background: colors.bg.raised },
  img:       { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  placeholder:{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 },
  overlay:   { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 },
  spin:      { width: 28, height: 28, borderRadius: '50%' },
  uploadBtn: { flex: 1, display: 'block', padding: '8px', borderRadius: radius.md, background: colors.gold.base, color: colors.text.inverse, fontSize: font.size.xs, fontWeight: font.weight.bold, textAlign: 'center', cursor: 'pointer', border: 'none', fontFamily: font.family },
  unsplashBtn:{ flex: 1, padding: '8px 10px', borderRadius: radius.md, background: colors.bg.overlay, color: colors.text.secondary, fontSize: font.size.xs, fontWeight: font.weight.semibold, cursor: 'pointer', border: `1px solid ${colors.border.default}`, fontFamily: font.family },
  searchInput:{ flex: 1, padding: '6px 10px', borderRadius: radius.sm, background: colors.bg.raised, border: `1px solid ${colors.border.default}`, color: colors.text.primary, fontFamily: font.family, fontSize: font.size.xs, outline: 'none' },
  searchBtn:  { padding: '6px 10px', borderRadius: radius.sm, background: colors.blue.base, color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: font.family },
};
