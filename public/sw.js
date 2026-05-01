/**
 * ClassTrack Service Worker
 *
 * Handles background notification display, notification clicks, and
 * basic caching for PWA offline support.
 */

const CACHE_NAME = 'classtrack-v1';

// ── Install ─────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old SW to finish
  event.waitUntil(self.skipWaiting());
});

// ── Activate ────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  // Take control of all open clients immediately
  event.waitUntil(self.clients.claim());
});

// ── Fetch (basic offline fallback) ──────────────────────────────────

self.addEventListener('fetch', (event) => {
  // Let the browser handle everything — we don't cache API calls
  // to avoid serving stale data
  event.respondWith(fetch(event.request).catch(() => {
    // For navigation requests, serve a basic offline page
    if (event.request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('Offline', { status: 503 });
  }));
});

// ── Message handler: show notification from app ─────────────────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data, icon } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      tag: tag || 'classtrack-notification',
      icon: icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data,
      vibrate: [200, 100, 200],
    });
  }
});

// ── Notification click: open / focus the app ────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if one is open
        for (const client of clients) {
          if ('focus' in client) {
            client.focus();
            // Navigate to the relevant page
            if (event.notification.data && event.notification.data.url) {
              client.navigate(event.notification.data.url);
            }
            return;
          }
        }
        // No window open — create a new one
        return self.clients.openWindow(targetUrl);
      })
  );
});
