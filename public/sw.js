/**
 * Minimal, deliberately conservative service worker.
 *
 * This app is data-heavy and dynamic (auth state, live job listings,
 * matching scores) — a service worker that caches pages or API responses
 * would risk showing a signed-out user's dashboard, stale match scores, or
 * outdated job listings while claiming to be "up to date". So this worker
 * does exactly one thing: cache-first for same-origin static assets
 * (JS/CSS build chunks, icons, fonts) so a repeat visit loads faster and
 * the app shell can install as a PWA. Everything else — every navigation,
 * every /api/* call — always goes to the network. There is no offline
 * fallback page: if you're offline, API calls fail normally and the UI
 * shows its existing error states, which is more honest than pretending
 * to work offline for an app whose entire value is live server data.
 */

const CACHE_NAME = "jobmatch-static-v1";
const STATIC_ASSET_RE = /\.(?:js|css|woff2?|png|svg|ico)$/;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache API responses
  if (!STATIC_ASSET_RE.test(url.pathname)) return; // never cache pages/navigations

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
