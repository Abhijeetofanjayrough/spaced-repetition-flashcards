const CACHE_NAME = 'srs-flashcards-cache-v1';
const urlsToCache = [
  '/', // Alias for index.html
  '/index.html',
  // Add paths to main CSS and JS bundles once known (e.g., /assets/index.css, /assets/index.js)
  // These paths depend on the build output.
  // For now, we'll cache common manifest files and icons if they exist.
  '/manifest.json', 
  '/favicon.ico',
  // Add any specific app icons if their paths are known and stable
  // '/icons/icon-192x192.png',
  // '/icons/icon-512x512.png'
];

// Install event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Add main assets. If any of these fail, SW install fails.
        // It's often better to cache non-critical assets separately or non-atomically.
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' }))); 
      })
      .catch(err => {
        console.error('Failed to cache urls during install:', err, urlsToCache);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of uncontrolled clients
});

// Fetch event: serve cached content when offline, or fetch from network
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // For navigation requests (HTML pages), use a network-first strategy
  // to ensure users get the latest HTML, then fallback to cache.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            // If network fails or returns an error, try the cache for navigate requests
            return caches.match(event.request).then(cachedResponse => {
                return cachedResponse || fetch(event.request); // Fallback to network again if not in cache (should be index.html)
            });
          }
          // IMPORTANT: Clone the response. A response is a stream
          // and because we want the browser to consume the response
          // as well as the cache consuming the response, we need
          // to clone it so we have two streams.
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // Network request failed, try to serve from cache
          return caches.match(event.request).then(cachedResponse => {
            // if (cachedResponse) { return cachedResponse; }
            // If index.html itself is not cached and network fails, this will fail.
            // Ensure index.html is robustly cached during install.
            return cachedResponse || caches.match('/index.html'); // Fallback for SPA offline
          });
        })
    );
    return;
  }

  // For other assets (CSS, JS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Cache hit - return response
        if (cachedResponse) {
          return cachedResponse;
        }
        // Not in cache - fetch from network, cache it, then return it
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 /*|| response.type !== 'basic'*/) {
              // Allow caching opaque responses for third-party assets if desired,
              // but be mindful of storage. For now, only cache 'basic' responses for same-origin.
              if (response.type !== 'basic') return response;
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});

// Optional: Listen for messages from clients (e.g., for skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 