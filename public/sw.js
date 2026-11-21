const CACHE_NAME = "foliq-shell-v0-4-1";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192",
  "/icon",
  "/apple-icon",
];

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Offline | Foliq</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f6f8; color: #0f172a; }
    @media (prefers-color-scheme: dark) { body { background: #000; color: #f1f5f9; } .card { background: #111215; border-color: #272b34; } p { color: #94a3b8; } }
    .card { max-width: 360px; width: 100%; background: #fff; border: 1px solid #d8dee9; border-radius: 20px; padding: 24px; text-align: center; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: #475569; }
    button { height: 44px; padding: 0 20px; border: 0; border-radius: 12px; background: #1d4ed8; color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <main class="card">
    <h1>You are offline</h1>
    <p>Foliq requires an internet connection to sync your Neon ledger safely. Reconnect and try again.</p>
    <button type="button" onclick="location.reload()">Retry Connection</button>
  </main>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never cache private financial API responses or authenticated dynamic HTML
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(OFFLINE_HTML, {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
