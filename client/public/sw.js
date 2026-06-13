/**
 * Group Lunch — Service Worker v5
 *
 * Strategy:
 *  • /api/*     → network-only  (never cache API responses)
 *  • *.js|*.css → browser HTTP cache only — SW does NOT intercept these.
 *                 Vercel sets Cache-Control: immutable on content-hashed files.
 *                 Letting the browser own JS caching prevents stale-bundle bugs.
 *  • images     → cache-first (safe, content doesn't change)
 *  • HTML nav   → network-first → offline shell fallback
 *
 * On EVERY SW update: old caches are evicted and all open tabs are reloaded
 * so users always get the latest JS bundle immediately.
 */

const CACHE = 'grouplunch-v5';
const SHELL = ['/'];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting(); // activate immediately, don't wait for tabs to close
});

// ── Activate — evict old caches, then reload every open tab ──────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() =>
        // Force-reload all open tabs so they load fresh JS (not the old in-memory bundle)
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      )
      .then((clients) => {
        clients.forEach((client) => {
          // Only reload if the tab is on our origin
          if (client.url.startsWith(self.location.origin)) {
            client.navigate(client.url);
          }
        });
      })
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET and cross-origin (API calls go directly to Render)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 2. API + socket.io → never intercept
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // 3. JS / CSS / fonts → DO NOT intercept; let browser HTTP-cache handle it.
  //    Vercel marks content-hashed assets as immutable so the browser caches
  //    them forever — a new deployment = new filename = browser fetches fresh.
  if (/\.(js|css|woff2?)(\?|$)/.test(url.pathname)) return;

  // 4. Images → cache-first (safe; image filenames are also content-hashed)
  if (/\.(png|jpg|jpeg|svg|webp|ico)(\?|$)/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 5. HTML navigation → network-first, fall back to offline shell
  event.respondWith(networkFirstWithShellFallback(request));
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithShellFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request) || await caches.match('/');
    return cached || new Response('Offline — please reconnect', { status: 503 });
  }
}
