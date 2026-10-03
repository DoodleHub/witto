// Witto service worker: caches hashed static assets, shows an offline page when navigation fails and
// shows the daily challenge notification. Pages themselves are always fetched from the network because
// they depend on the signed-in user, so a cold launch first gets an instant splash that then loads the real page.
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

// Shown instantly when the app opens with no other Witto window, instead of a blank screen while the server responds.
// It immediately re-requests the same URL; that request finds this window open and goes to the network, and the splash
// stays painted until the real page renders.
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
  main { display: flex; flex-direction: column; align-items: center; gap: 28px; }
  .spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--track); border-top-color: var(--brand);
             animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }
</style></head>
<body><main aria-busy="true" aria-label="Loading Witto">
  <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="g" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9b7ff7"/><stop offset="1" stop-color="#6a45dc"/></linearGradient></defs>
    <path d="M12 1.5c.7 5.2 3.2 8.1 10.5 10.5-7.3 2.4-9.8 5.3-10.5 10.5C11.3 17.3 8.8 14.4 1.5 12 8.8 9.6 11.3 6.7 12 1.5z" fill="url(#g)"/>
  </svg>
  <div class="spinner"></div>
</main>
<script>location.replace(location.href)</script>
</body></html>`;

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
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) =>
        windows.length === 0
          ? new Response(SPLASH_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
          : fetch(request).catch(
              () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
            ),
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
