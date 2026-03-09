const CACHE_NAME = 'budget-app-v1';
const PRECACHE_URLS = ['/', '/manifest.json'];

// Install: precache app shell (새 버전 대기 - skipWaiting은 메시지로 제어)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// 클라이언트에서 SKIP_WAITING 메시지 수신 시 즉시 활성화
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API calls: network only (don't cache dynamic data)
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) {
    return;
  }

  // App shell & static assets: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetched = fetch(request).then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      });
      return cached || fetched;
    })
  );
});

// Push notification 수신
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event.data?.text());
  const data = event.data ? event.data.json() : {};
  const title = data.title || '가계부 알림';
  const options = {
    body: data.body || '',
    icon: '/app-icon-192.png',
    badge: '/app-icon-192.png',
    data: { url: '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 시 앱으로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
