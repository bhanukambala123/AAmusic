const CACHE_NAME = 'aamusic-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico'
];

// Install event - Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell & core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Cache-first for static assets, network-first for pages and dynamic requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // CRITICAL: Bypass caching for audio streams (mp3, wav, etc.) or Supabase storage paths
  // caching large audio files will crash browser quotas or cause CORS/playback errors.
  if (
    event.request.method !== 'GET' ||
    requestUrl.pathname.endsWith('.mp3') || 
    requestUrl.href.includes('/storage/v1/object/public/') ||
    requestUrl.href.includes('/auth/v1') ||
    requestUrl.href.includes('supabase.co')
  ) {
    return; // Let the browser handle normally via network
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached static file
        return cachedResponse;
      }

      // Fallback to network, then cache the result if it's a static file from our domain
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cache newly loaded static assets on the fly
          const responseToCache = response.clone();
          const isStaticAsset = 
            requestUrl.pathname.includes('/_next/static/') ||
            requestUrl.pathname.endsWith('.css') ||
            requestUrl.pathname.endsWith('.js') ||
            requestUrl.pathname.endsWith('.svg') ||
            requestUrl.pathname.endsWith('.png');

          if (isStaticAsset) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // If offline and request is for a page/navigation, return the cached homepage index
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return null;
        });
    })
  );
});

// Message event - Listen for SKIP_WAITING to activate waiting worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Received SKIP_WAITING, activating new worker...');
    self.skipWaiting();
  }
});
