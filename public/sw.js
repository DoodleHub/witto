// Witto service worker: caches hashed static assets, shows an offline page when navigation fails and
// shows the daily challenge notification. Pages themselves are always fetched from the network because
// they depend on the signed-in user, so a cold launch first gets an instant splash that then loads the real page.
const VERSION = "v3";
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

// Shown instantly when the app opens with no other Witto window, instead of a blank screen while the server responds.
// The real page is fetched in the background meanwhile. After SPLASH_MIN_MS (so a fast load doesn't just flicker) the
// splash re-requests the same URL, which gets that background response, and stays painted until the real page renders.
const SPLASH_MIN_MS = 1000;
const SPLASH_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Witto</title>
<script>try{var t=localStorage.getItem("witto-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
<style>
  :root { color-scheme: light; --bg: #fbf9f6; --track: #ebe4fd; --brand: #7a5ae6; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --bg: #0f0d16; --track: #2c2452; --brand: #8466f0; } }
  :root[data-theme="dark"] { color-scheme: dark; --bg: #0f0d16; --track: #2c2452; --brand: #8466f0; }
  html, body { margin: 0; height: 100%; background: var(--bg); }
  body { display: grid; place-items: center; }
  main { display: flex; flex-direction: column; align-items: center; gap: 28px; animation: enter .4s ease-out both; }
  @keyframes enter { from { opacity: 0; transform: scale(.92); } }
  .spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--track); border-top-color: var(--brand);
             animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { main { animation-name: none; } .spinner { animation-duration: 2.4s; } }
</style></head>
<body><main aria-busy="true" aria-label="Loading Witto">
  <!-- Mirrors app/icon.svg. -->
  <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="g" x1="2" y1="0" x2="22" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9b7ff7"/><stop offset="1" stop-color="#5c3cc6"/></linearGradient></defs>
    <rect width="24" height="24" rx="5.5" fill="url(#g)"/>
    <polyline points="4.44,7.68 8.22,16.32 12,9.84 15.78,16.32 19.56,7.68" fill="none" stroke="#fff" stroke-width="1.84" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="#fff"><circle cx="4.44" cy="7.68" r="1.89"/><circle cx="8.22" cy="16.32" r="1.89"/><circle cx="12" cy="9.84" r="1.89"/><circle cx="15.78" cy="16.32" r="1.89"/></g>
    <circle cx="19.56" cy="7.68" r="1.89" fill="#ffd27a"/>
  </svg>
  <div class="spinner"></div>
</main>
<script>setTimeout(function(){location.replace(location.href)},${SPLASH_MIN_MS})</script>
</body></html>`;

/** The page being fetched behind the splash, handed to the splash's follow-up navigation. */
let splashFetch = null;

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
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
        if (windows.length === 0) {
          const response = fetch(request);
          splashFetch = { url: request.url, response };
          // Keep the worker alive until the background fetch settles, and drop it if the splash never claims it.
          event.waitUntil(response.then(() => {}, () => {}));
          setTimeout(() => splashFetch?.response === response && (splashFetch = null), 30_000);
          return new Response(SPLASH_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
        let response;
        if (splashFetch?.url === request.url) {
          response = splashFetch.response;
          splashFetch = null;
        } else {
          response = fetch(request);
        }
        return response.catch(
          () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
        );
      }),
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

// Daily rollover notification from the daily-challenge-push Edge Function.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Witto", {
      body: data.body || "A fresh puzzle is waiting.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "daily-challenge",
      data: { url: data.url || "/" },
    }),
  );
});

// Bring an open Witto window forward (it picks up the new day when it becomes visible), or open one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === url.origin);
      return open ? open.focus() : self.clients.openWindow(url.href);
    }),
  );
});
