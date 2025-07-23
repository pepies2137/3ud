// Service Worker for CARSWAG PWA with Firebase integration
const CACHE_NAME = 'carswag-v2'; // Zwiększ wersję aby wymusić aktualizację
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://resource.trickle.so/vendor_lib/unpkg/react@18/umd/react.production.min.js',
  'https://resource.trickle.so/vendor_lib/unpkg/react-dom@18/umd/react-dom.production.min.js',
  'https://resource.trickle.so/vendor_lib/unpkg/@babel/standalone/babel.min.js',
  'https://resource.trickle.so/vendor_lib/unpkg/lucide-static@0.516.0/font/lucide.css'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Cache files individually to handle failures gracefully
        return Promise.allSettled(
          urlsToCache.map(url => {
            return cache.add(url).catch(error => {
              console.warn('Failed to cache:', url, error);
              return null;
            });
          })
        );
      })
      .catch(error => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  // Skip caching for Supabase API calls and external APIs
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('api.') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(error => {
          console.warn('Fetch failed for:', event.request.url, error);
          // Return a basic fallback for failed requests
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
          return new Response('Network error', { status: 503 });
        });
      })
      .catch(error => {
        console.error('Cache match failed:', error);
        return fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push notification event (handles both Firebase and native push)
self.addEventListener('push', event => {
  console.log('[SW] Push event received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('[SW] Push data parsed:', notificationData);
    } catch (e) {
      notificationData = { body: event.data.text() };
      console.log('[SW] Push data as text:', notificationData);
    }
  }

  // Handle Firebase FCM format
  if (notificationData.notification) {
    const fcmNotification = notificationData.notification;
    const fcmData = notificationData.data || {};
    
    notificationData = {
      title: fcmNotification.title,
      body: fcmNotification.body,
      icon: fcmNotification.icon,
      tag: fcmData.tag || 'carswag-fcm',
      url: fcmData.click_action || fcmNotification.click_action,
      ...fcmData
    };
    console.log('[SW] Firebase FCM notification processed:', notificationData);
  }

  const options = {
    body: notificationData.body || 'Nowe powiadomienie',
    icon: notificationData.icon || '/icon-192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    // Dodatkowe opcje dla lepszej obsługi w tle
    renotify: true,
    sticky: true,
    timestamp: Date.now(),
    tag: notificationData.tag || 'carswag-notification',
    data: {
      dateOfArrival: Date.now(),
      url: notificationData.url || '/?view=notifications',
      source: notificationData.notification ? 'fcm' : 'native',
      ...notificationData
    },
    actions: [
      {
        action: 'explore',
        title: 'Zobacz powiadomienie',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Zamknij',
        icon: '/favicon.ico'
      }
    ]
  };

  console.log('[SW] Showing notification with options:', options);

  event.waitUntil(
    self.registration.showNotification(notificationData.title || 'CARSWAG', options)
  );
});

// Obsługa wiadomości z aplikacji
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { payload } = event.data;
    
    const options = {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/favicon.ico',
      vibrate: payload.vibrate || [200, 100, 200],
      requireInteraction: payload.requireInteraction || true,
      tag: payload.tag || 'carswag-notification',
      data: {
        dateOfArrival: Date.now(),
        url: '/?view=notifications',
        ...payload
      },
      actions: [
        {
          action: 'explore',
          title: 'Zobacz powiadomienie',
          icon: '/favicon.ico'
        }
      ]
    };

    self.registration.showNotification(payload.title || 'CARSWAG', options);
  }
});

// Notification click event - przekierowanie do powiadomień
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Sprawdź czy aplikacja jest już otwarta
        for (let client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            // Przekieruj do powiadomień i fokusuj okno
            client.postMessage({ action: 'navigate', view: 'notifications' });
            return client.focus();
          }
        }
        // Jeśli aplikacja nie jest otwarta, otwórz z widokiem powiadomień
        return clients.openWindow('/?view=notifications');
      })
    );
  }
});