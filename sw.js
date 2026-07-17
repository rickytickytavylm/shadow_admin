/* Service worker для PWA «TENI · Админ».
   Приоритет — свежесть данных: код и страницы всегда тянем из сети,
   кэш используем только как офлайн-фолбэк. API (другой домен) не трогаем. */
const CACHE = "teni-admin-v15";
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(CORE.map((url) => cache.add(url).catch(() => null)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API/сторонние домены — мимо

  // Навигации — network-first с фолбэком на кэш/главную.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match("./index.html")) || Response.error();
        }
      })()
    );
    return;
  }

  // Код и стили — network-first, кэш только офлайн-фолбэк.
  if (req.destination === "script" || req.destination === "style") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.status === 200 && fresh.type === "basic") {
            const cache = await caches.open(CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // API/сторонние домены и прочее — stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })()
  );
});

// ── Push-уведомления ──
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || "Новое сообщение";
  const options = {
    body: data.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || "./index.html" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "./index.html";
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        c.postMessage({ type: "teni-refresh" });
        if ("focus" in c) return c.focus();
      }
      if (clients.openWindow) {
        const win = await clients.openWindow(target);
        if (win) win.postMessage({ type: "teni-refresh" });
        return win;
      }
    })()
  );
});
