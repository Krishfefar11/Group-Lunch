/**
 * Group Lunch — Service Worker
 *
 * Strategy:
 *  • /api/*          → Network-only  (always fresh data)
 *  • *.js | *.css    → Cache-first   (content-hashed filenames never go stale)
 *  • /               → Network-first → cache fallback (shows offline shell)
 *  • images          → Cache-first, stale-while-revalidate
 *
 * Cache is versioned so old entries are evicted on activation.
 */

const CACHE   = 'grouplunch-v4';
const SHELL   = ['/'];          // minimal pre-cache on install

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate — evict old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 2. API calls → network only, no caching
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // 3. JS / CSS / fonts → let the browser use its own HTTP cache (Vercel sets
  //    Cache-Control: immutable on content-hashed files). The SW must NOT cache
  //    these — if it does, a stale bundle can survive across deployments when the
  //    filename stays the same but content changes (e.g. env-var bake-in changes).
  if (/\.(js|css|woff2?)(\?|$)/.test(url.pathname)) {
    return; // fall through to browser native fetch + HTTP caching
  }

  // 4. Images → cache-first (stale-while-revalidate)
  if (/\.(png|jpg|jpeg|svg|webp|ico)(\?|$)/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 5. HTML navigation → network-first with offline shell fallback
  event.respondWith(networkFirstWithShellFallback(request));
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return cached response if available; otherwise fetch + cache. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

/** Try network first; on failure serve cached version or the app shell. */
async function networkFirstWithShellFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback to app shell so React Router can still render
    const shell = await caches.match('/');
    return shell || new Response('Offline — please reconnect', { status: 503 });
  }
}
