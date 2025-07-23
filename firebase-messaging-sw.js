// Firebase Cloud Messaging Service Worker
// This file must be in the root directory and named exactly "firebase-messaging-sw.js"

console.log('[firebase-messaging-sw.js] Loading Firebase scripts...');

try {
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
  console.log('[firebase-messaging-sw.js] Firebase scripts loaded successfully');
} catch (error) {
  console.error('[firebase-messaging-sw.js] Failed to load Firebase scripts:', error);
}

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArMKy5GNIDLaBKqjQw5Zs49aDZsoIpfHQ",
  authDomain: "udant-95f62.firebaseapp.com",
  projectId: "udant-95f62",
  storageBucket: "udant-95f62.firebasestorage.app",
  messagingSenderId: "505043025948",
  appId: "1:505043025948:web:3c94ced3b44456c9d89fd9",
  measurementId: "G-5VMH402MR8"
};

// Initialize Firebase
console.log('[firebase-messaging-sw.js] Initializing Firebase...');
try {
  firebase.initializeApp(firebaseConfig);
  console.log('[firebase-messaging-sw.js] Firebase initialized successfully');
} catch (error) {
  console.error('[firebase-messaging-sw.js] Firebase initialization failed:', error);
}

// Retrieve Firebase Messaging object
console.log('[firebase-messaging-sw.js] Getting messaging object...');
let messaging;
try {
  messaging = firebase.messaging();
  console.log('[firebase-messaging-sw.js] Messaging object created successfully');
} catch (error) {
  console.error('[firebase-messaging-sw.js] Failed to create messaging object:', error);
}

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const { notification, data } = payload;
  
  // Customize notification here
  const notificationTitle = notification?.title || 'CARSWAG';
  const notificationOptions = {
    body: notification?.body || 'Nowe powiadomienie',
    icon: notification?.icon || '/icon-192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    renotify: true,
    tag: data?.tag || 'carswag-fcm',
    timestamp: Date.now(),
    data: {
      dateOfArrival: Date.now(),
      url: data?.click_action || '/?view=notifications',
      ...data
    },
    actions: [
      {
        action: 'view',
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

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  event.notification.close();

  if (event.action === 'view' || !event.action) {
    // Open or focus the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        const url = event.notification.data?.url || '/?view=notifications';
        
        // Check if app is already open
        for (let client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            // Navigate to notifications and focus
            client.postMessage({ 
              action: 'navigate', 
              view: 'notifications',
              source: 'fcm'
            });
            return client.focus();
          }
        }
        
        // If app is not open, open it
        return clients.openWindow(url);
      })
    );
  }
  // 'dismiss' action just closes the notification (default behavior)
});

// Handle push event (fallback)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw.js] Push payload:', payload);
      
      // This will be handled by onBackgroundMessage, but keeping as fallback
      if (!payload.notification) {
        const notificationTitle = 'CARSWAG';
        const notificationOptions = {
          body: payload.body || 'Nowe powiadomienie',
          icon: '/icon-192.png',
          badge: '/favicon.ico',
          tag: 'carswag-push-fallback'
        };
        
        event.waitUntil(
          self.registration.showNotification(notificationTitle, notificationOptions)
        );
      }
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
    }
  }
});

console.log('[firebase-messaging-sw.js] Firebase Messaging Service Worker loaded');