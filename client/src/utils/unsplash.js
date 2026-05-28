/**
 * Unsplash API utility
 * - SessionStorage cache so we don't re-fetch on every render
 * - Respects Unsplash guidelines (tracks downloads on use)
 */

const ACCESS_KEY = 'k0GGsYLTyDRZLJ5LTEOSA4HP-dhNmYtfmbK04sgNZmw';
const BASE       = 'https://api.unsplash.com';

// ── In-memory cache (fast, lives for the tab session) ─────────────────────
const memCache = new Map();

function cacheKey(query, perPage) { return `unsplash_${query}_${perPage}`; }

function readCache(key) {
  // Check memory first
  if (memCache.has(key)) return memCache.get(key);
  // Then sessionStorage
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memCache.set(key, parsed);
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function writeCache(key, data) {
  memCache.set(key, data);
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

// ── Search photos ─────────────────────────────────────────────────────────
export async function searchPhotos(query, perPage = 6) {
  const key = cacheKey(query, perPage);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&client_id=${ACCESS_KEY}`
    );
    if (!res.ok) throw new Error(`Unsplash ${res.status}`);
    const data = await res.json();
    const results = data.results || [];
    writeCache(key, results);
    return results;
  } catch (err) {
    console.warn('Unsplash search failed:', err.message);
    return [];
  }
}

// ── Get a single best photo for a query ───────────────────────────────────
export async function getPhoto(query) {
  const results = await searchPhotos(query, 1);
  return results[0] || null;
}

// ── Get photo URL at a given size ─────────────────────────────────────────
// sizes: raw, full, regular (1080px), small (400px), thumb (200px)
export function photoUrl(photo, size = 'small') {
  return photo?.urls?.[size] || null;
}

// ── Track download (required by Unsplash API guidelines) ─────────────────
export function trackDownload(photo) {
  if (!photo?.links?.download_location) return;
  fetch(`${photo.links.download_location}&client_id=${ACCESS_KEY}`).catch(() => {});
}

// ── Cuisine → search query map ────────────────────────────────────────────
export const CUISINE_QUERIES = {
  'North Indian':   'north indian curry food',
  'South Indian':   'south indian dosa idli food',
  'Biryani':        'biryani rice dish',
  'Chinese':        'chinese noodles food',
  'Pizza':          'pizza italian food',
  'Burgers':        'gourmet burger food',
  'Wraps':          'wrap sandwich food',
  'Continental':    'continental european food',
  'Breakfast':      'breakfast eggs toast food',
  'Any':            'restaurant food dish',
};

export function cuisineQuery(cuisines = []) {
  for (const c of cuisines) {
    if (CUISINE_QUERIES[c]) return CUISINE_QUERIES[c];
  }
  return 'indian restaurant food';
}
