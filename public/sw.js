// Witto service worker: caches hashed static assets and shows an offline page
// when navigation fails. Pages themselves are always fetched from the network
// because they depend on the signed-in user.
const VERSION = "v1";
const STATIC_CACHE = `witto-static-${VERSION}`;
const PRECACHE = ["/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

const OFFLINE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Witto — Offline</title>
<style>
  :root { color-scheme: light dark; --bg: #fbf9f6; --ink: #17142b; --muted: #75718a; --brand: #7a5ae6; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0f0d16; --ink: #f3f1fa; --muted: #a5a1b4; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--ink);
         font: 16px/1.5 system-ui, -apple-system, sans-serif; text-align: center; padding: 16px; box-sizing: border-box; }
  h1 { font-size: 24px; margin: 16px 0 4px; } p { color: var(--muted); margin: 0 0 24px; }
  button { background: var(--brand); color: #fff; border: 0; border-radius: 999px; padding: 12px 24px; font: inherit; font-weight: 600; }
</style></head>
<body><main>
  <img src="/icon-192.png" width="72" height="72" alt="">
  <h1>You're offline</h1>
  <p>Today's puzzle will be waiting when you reconnect.</p>
  <button onclick="location.reload()">Try again</button>
</main></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
      ),
    );
    return;
  }

  // Build output under /_next/static is content-hashed, so cache-first is safe.
  if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
