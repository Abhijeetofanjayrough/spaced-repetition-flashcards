const CACHE_NAME = 'flashcard-app-v2';
const STATIC_CACHE = 'static-cache-v2';
const DYNAMIC_CACHE = 'dynamic-cache-v2';

// Assets that need to be available for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/static/css/main.chunk.css',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/static/js/0.chunk.js',
  '/serviceWorker.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install service worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[Service Worker] Pre-caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Successfully installed');
        return self.skipWaiting(); // Ensure the new service worker activates right away
      })
      .catch(error => {
        console.error('[Service Worker] Pre-caching failed', error);
      })
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(
          keyList.map(key => {
            // Delete old caches except current ones
            if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
              console.log('[Service Worker] Removing old cache', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim(); // Take control of all clients/tabs
      })
  );
  return self.clients.claim();
});

// Intercept fetch requests
self.addEventListener('fetch', event => {
  // Don't cache API calls or third-party requests
  if (event.request.url.includes('/api/') || 
      !event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('fonts.googleapis.com')) {
    return fetch(event.request);
  }

  // Cache-first strategy for static assets
  if (STATIC_ASSETS.some(asset => 
    event.request.url.endsWith(asset) || 
    event.request.url.includes(asset))) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return cached response if available
          if (response) {
            return response;
          }
          // Otherwise fetch from network
          return fetch(event.request);
        })
    );
    return;
  }

  // Network-first with cache fallback for other requests
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Skip caching if not a successful response or not a GET request
        if (!response || response.status !== 200 || response.type !== 'basic' || 
            event.request.method !== 'GET') {
          return response;
        }

        // Cache the response for future use
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE)
          .then(cache => {
            cache.put(event.request, responseToCache);
          })
          .catch(error => {
            console.error('[Service Worker] Dynamic caching failed', error);
          });

        return response;
      })
      .catch(error => {
        console.log('[Service Worker] Network request failed, trying cache', error);
        // If network fails, try to serve from cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // If it's a navigation request, return the offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }

            // If no cache match, just let the error happen
            throw error;
          });
      })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync', event.tag);
  if (event.tag === 'sync-review-data') {
    event.waitUntil(
      // Code to sync review data with server when online
      // For now just log that sync would happen here
      console.log('[Service Worker] Syncing review data')
    );
  }
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Notification received', event);

  let title = 'Study Reminder';
  let options = {
    body: 'It\'s time for your daily review session!',
    icon: '/logo192.png',
    badge: '/favicon.ico'
  };

  if (event.data) {
    const data = event.data.json();
    title = data.title || title;
    options.body = data.message || options.body;
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
}); 