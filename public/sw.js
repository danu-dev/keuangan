const CACHE_NAME = 'financevoice-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Service Worker and cache essential static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching core static files...');
      // Individually cache each static asset so a failure on one doesn't crash the whole worker
      return Promise.all(
        STATIC_ASSETS.map((url) => {
          return cache.add(url).catch(err => {
            console.warn(`[Service Worker] Failed to cache static asset: ${url}`, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clear old cache versions
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache...', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interception
self.addEventListener('fetch', (e) => {
  // Only intercept HTTP/HTTPS requests from our own origin
  if (!e.request.url.startsWith(self.location.origin)) return;

  const url = new URL(e.request.url);

  // 1. Navigation requests (HTML pages) -> Network First, falling back to Cache
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fixed promise logic to correctly resolve the fallback assets sequentially
          return caches.match(e.request).then((res) => {
            if (res) return res;
            return caches.match('/index.html').then((indexRes) => {
              if (indexRes) return indexRes;
              return caches.match('/');
            });
          });
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, images under /assets/) -> Cache First, falling back to Network
  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[Service Worker] Asset fetch failed while offline:', err);
            // Gracefully handle offline asset fetching failure
          });
      })
    );
    return;
  }

  // 3. Other requests (e.g. manifest, icons, favicon) -> Network First with cache fallback
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
