// Firebase configuration and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
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
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging = null;
let analytics = null;

try {
  messaging = getMessaging(app);
  console.log('✅ Firebase Messaging initialized');
} catch (error) {
  console.warn('⚠️ Firebase Messaging initialization failed:', error);
}

try {
  analytics = getAnalytics(app);
  console.log('✅ Firebase Analytics initialized');
} catch (error) {
  console.warn('⚠️ Firebase Analytics initialization failed:', error);
}

// VAPID key for FCM (you'll need to generate this in Firebase Console)
const VAPID_KEY = "BA69vdo_uXCmKgRoe-VCQqqwFjAuUpK4z2kLFPkHqP1aTfA_6AEZ0izAZZZf-ZiDAgD1TEa_SZIigHBzSxPvk2g"; // Replace with your actual VAPID key

// Validate VAPID key
if (!VAPID_KEY || VAPID_KEY.length < 80) {
  console.error('❌ Invalid VAPID key. Please update VAPID_KEY in utils/firebase.js');
} else {
  console.log('✅ VAPID key looks valid:', VAPID_KEY.substring(0, 10) + '...');
}

class FirebaseNotificationManager {
  constructor() {
    this.messaging = messaging;
    this.currentToken = null;
    this.isSupported = this.checkSupport();
    this.isInitialized = false;
  }

  checkSupport() {
    if (!messaging) {
      console.warn('🚫 Firebase Messaging not available');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('🚫 Service Worker not supported');
      return false;
    }

    if (!('PushManager' in window)) {
      console.warn('🚫 Push messaging not supported');
      return false;
    }

    if (!('Notification' in window)) {
      console.warn('🚫 Notifications not supported');
      return false;
    }

    return true;
  }

  async initialize() {
    if (!this.isSupported || this.isInitialized) {
      return false;
    }

    try {
      console.log('🚀 Initializing Firebase notifications...');

      // Wait for service workers to be registered
      if ('serviceWorker' in navigator) {
        console.log('⏳ Waiting for service workers to be ready...');
        
        // Wait for both service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('📋 Found service worker registrations:', registrations.length);
        
        // Check if Firebase messaging SW is registered
        const firebaseSW = registrations.find(reg => 
          reg.scope.includes('firebase-messaging-sw') || 
          reg.active?.scriptURL.includes('firebase-messaging-sw')
        );
        
        if (!firebaseSW) {
          console.log('🔄 Registering Firebase messaging service worker...');
          try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('✅ Firebase messaging SW registered:', registration);
            await registration.update(); // Force update
          } catch (swError) {
            console.error('❌ Failed to register Firebase messaging SW:', swError);
            return false;
          }
        } else {
          console.log('✅ Firebase messaging SW already registered');
        }
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('✅ Service workers are ready');
      }

      // Request notification permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('⚠️ Notification permission not granted');
        return false;
      }

      // Get FCM token
      try {
        await this.getToken();
      } catch (tokenError) {
        console.error('❌ Failed to get FCM token:', tokenError);
        // Continue initialization even if token fails
        console.log('⚠️ Continuing without FCM token - will use fallback notifications');
      }

      // Set up foreground message handler
      this.setupForegroundHandler();

      this.isInitialized = true;
      console.log('✅ Firebase notifications initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Firebase notification initialization failed:', error);
      return false;
    }
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return 'denied';
    }
  }

  async getToken() {
    if (!this.messaging) return null;

    try {
      // Ensure service worker is ready before getting token
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker is ready for FCM token');
      }

      // Get registration token
      const currentToken = await getToken(this.messaging, { 
        vapidKey: VAPID_KEY 
      });

      if (currentToken) {
        console.log('✅ FCM Token obtained:', currentToken.substring(0, 20) + '...');
        this.currentToken = currentToken;
        
        // Store token in localStorage for server-side use
        localStorage.setItem('fcm_token', currentToken);
        
        // Send token to your server
        await this.sendTokenToServer(currentToken);
        
        return currentToken;
      } else {
        console.warn('⚠️ No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  async sendTokenToServer(token) {
    try {
      const user = getCurrentUser();
      if (!user) return;

      // Use secure operations to store FCM token
      if (window.secureOps && typeof window.secureOps.saveFCMToken === 'function') {
        await window.secureOps.saveFCMToken(token, {
          source: 'firebase_web',
          browser: this.getBrowserInfo()
        });
      } else {
        // Fallback to direct supabase call
        try {
          // Try to update existing token first
          const existing = await supabase.query('user_fcm_tokens', {
            select: 'id',
            eq: { user_id: user.id, fcm_token: token }
          });

          if (existing && existing.length > 0) {
            await supabase.update('user_fcm_tokens', {
              updated_at: new Date().toISOString(),
              is_active: true
            }, {
              user_id: user.id,
              fcm_token: token
            });
          } else {
            await supabase.insert('user_fcm_tokens', {
              user_id: user.id,
              fcm_token: token,
              device_info: {},
              updated_at: new Date().toISOString(),
              is_active: true
            });
          }
        } catch (fallbackError) {
          console.warn('⚠️ Fallback token save also failed:', fallbackError);
          // Continue anyway - token saving is not critical for functionality
        }
      }

      console.log('✅ FCM token sent to server');
    } catch (error) {
      console.error('❌ Failed to send token to server:', error);
    }
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    return {
      name: browser,
      version: ua,
      platform: navigator.platform,
      language: navigator.language
    };
  }

  setupForegroundHandler() {
    if (!this.messaging) return;

    // Handle incoming messages while app is in foreground
    onMessage(this.messaging, (payload) => {
      console.log('📨 Foreground message received:', payload);

      const { notification, data } = payload;
      
      // Show notification using browser API
      if (notification) {
        this.showNotification(notification.title, {
          body: notification.body,
          icon: notification.icon || '/icon-192.png',
          badge: '/favicon.ico',
          tag: data?.tag || 'fcm-notification',
          data: data || {},
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'Zobacz',
              icon: '/favicon.ico'
            },
            {
              action: 'dismiss',
              title: 'Zamknij',
              icon: '/favicon.ico'
            }
          ]
        });
      }

      // Trigger app notification update
      window.dispatchEvent(new CustomEvent('newNotification', {
        detail: { 
          type: 'fcm',
          payload: payload
        }
      }));
    });
  }

  async showNotification(title, options = {}) {
    try {
      console.log('🔥 Firebase showNotification called:', { title, options });
      
      // Check if we have permission
      if (Notification.permission !== 'granted') {
        console.warn('⚠️ No notification permission');
        return false;
      }

      // Use service worker registration if available
      if ('serviceWorker' in navigator) {
        console.log('🔥 Using service worker for Firebase notification');
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          tag: 'carswag-fcm',
          ...options
        });
        console.log('✅ Firebase service worker notification displayed');
        return true;
      } else {
        // Fallback to basic notification
        console.log('🔥 Using basic notification for Firebase');
        new Notification(title, {
          icon: '/icon-192.png',
          badge: '/favicon.ico',
          ...options
        });
        console.log('✅ Firebase basic notification displayed');
        return true;
      }
    } catch (error) {
      console.error('❌ Firebase show notification failed:', error);
      return false;
    }
  }

  // Send notification to specific user
  async sendNotificationToUser(userId, title, body, data = {}) {
    try {
      // This would typically be done on your server
      // Here's the client-side structure for reference
      const payload = {
        to: userId, // FCM token or topic
        notification: {
          title: title,
          body: body,
          icon: '/icon-192.png',
          badge: '/favicon.ico',
          click_action: window.location.origin + '/?view=notifications'
        },
        data: {
          ...data,
          timestamp: Date.now().toString()
        }
      };

      console.log('📤 Would send FCM notification:', payload);
      // In production, send this to your server endpoint that calls FCM API
      
    } catch (error) {
      console.error('❌ Send notification failed:', error);
    }
  }

  // Send broadcast notification
  async sendBroadcastNotification(title, body, data = {}) {
    try {
      const payload = {
        to: '/topics/all_users', // FCM topic for all users
        notification: {
          title: title,
          body: body,
          icon: '/icon-192.png',
          badge: '/favicon.ico',
          click_action: window.location.origin + '/?view=notifications'
        },
        data: {
          ...data,
          type: 'broadcast',
          timestamp: Date.now().toString()
        }
      };

      console.log('📢 Would send broadcast FCM notification:', payload);
      // In production, send this to your server endpoint that calls FCM API
      
    } catch (error) {
      console.error('❌ Send broadcast notification failed:', error);
    }
  }

  // Get current token
  getCurrentToken() {
    return this.currentToken;
  }

  // Check if initialized
  isReady() {
    return this.isInitialized && this.isSupported;
  }
}

// Create global instance
const firebaseNotificationManager = new FirebaseNotificationManager();

// Export for use in other modules
window.firebaseNotificationManager = firebaseNotificationManager;

export { firebaseNotificationManager, app, messaging, analytics };