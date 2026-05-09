/* eslint-disable no-restricted-globals */
/* Service Worker for Local Commerce — handles Web Push + minimal offline shell. */

const CACHE_NAME = "lc-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.json", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Network-first for HTML to keep the SPA fresh; cache-fallback when offline. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never intercept API calls — they must hit the network always.
  if (url.pathname.startsWith("/api/")) return;

  // For navigations: network with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("/"))
        )
    );
  }
});

/* Push notification handler */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: "New order", body: event.data ? event.data.text() : "" };
  }

  const title =
    payload.type === "new_order"
      ? `New order · ${payload.short_id || ""}`.trim()
      : payload.type === "delivered"
      ? `Delivered · ${payload.short_id || ""}`.trim()
      : payload.title || "GharSip";
  const body =
    payload.type === "new_order"
      ? `${payload.customer || "Customer"} · ₹${(payload.total || 0).toLocaleString("en-IN")}`
      : payload.type === "delivered"
      ? `${payload.customer || "Customer"} · ₹${(payload.total || 0).toLocaleString("en-IN")} — proof photo received`
      : payload.body || "You have a notification";

  const options = {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.short_id || "lc-notification",
    renotify: true,
    requireInteraction: payload.type === "new_order",
    data: payload,
    vibrate: [200, 80, 200, 80, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = "/admin/orders";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
