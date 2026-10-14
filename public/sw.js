// PayVia service worker. Plain JavaScript served as-is: there is no build step.
//
// What it caches is deliberately narrow, because this is a payments app:
//   - build output under /_next/static (content-hashed, safe to keep forever)
//   - images and icons
//   - the offline page, shown when a page cannot be loaded
// Pages and /api responses are never cached. They carry account and payment
// state, and a stale "pending" or "paid" would be worse than an offline notice.
//
// Bump VERSION to drop every cache on the next visit.

const VERSION = "v1";
const SHELL = `payvia-shell-${VERSION}`;
const STATIC = `payvia-static-${VERSION}`;
const IMAGES = `payvia-images-${VERSION}`;
const CACHES = [SHELL, STATIC, IMAGES];

const OFFLINE_URL = "/offline";
const LIMITS = { [STATIC]: 300, [IMAGES]: 80 };

self.addEventListener("install", (event) => {
  event.waitUntil(precacheOfflinePage());
});

// The offline page has to render with no network, so its scripts, styles and
// fonts are stored alongside it. They are read from its HTML because their
// file names change with every build.
async function precacheOfflinePage() {
  const cache = await caches.open(SHELL);
  const response = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!response.ok) throw new Error(`Offline page returned ${response.status}`);
  const html = await response.clone().text();
  await cache.put(OFFLINE_URL, response);

  const assets = new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) ?? []);
  assets.add("/icons/icon-192.png");
  await Promise.all(
    [...assets].map((url) => cache.add(url).catch(() => undefined)),
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("payvia-") && !CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.registration.navigationPreload?.enable();
      await self.clients.claim();
    })(),
  );
});

// A new version waits until the page asks for it, so an update never reloads
// someone in the middle of a payment.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Horizon, wallets and the backend are always fetched live.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (
    url.pathname === "/_next/image" ||
    /^\/(images|illustrations|icons)\//.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(event));
  }
});

async function navigate(event) {
  try {
    return (await event.preloadResponse) ?? (await fetch(event.request));
  } catch {
    return (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.status === 200) await store(STATIC, request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cached = await caches.match(request);
  const fresh = fetch(request).then(async (response) => {
    if (response.status === 200) await store(IMAGES, request, response.clone());
    return response;
  });
  if (!cached) return fresh;
  event.waitUntil(fresh.catch(() => undefined));
  return cached;
}

async function store(name, request, response) {
  const cache = await caches.open(name);
  await cache.put(request, response);
  // Oldest first: keys() returns entries in the order they were added.
  const keys = await cache.keys();
  const extra = keys.length - LIMITS[name];
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}
