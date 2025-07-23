// Debug Firebase Service Worker issues
console.log('🔍 Firebase Debug Script Loaded');

// Function to debug service worker registration
window.debugFirebaseServiceWorker = async () => {
  console.log('🔍 Debugging Firebase Service Worker...');
  
  try {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.error('❌ Service Worker not supported');
      return;
    }
    
    // Get all registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('📋 All Service Worker registrations:', registrations);
    
    registrations.forEach((reg, index) => {
      console.log(`📄 Registration ${index + 1}:`, {
        scope: reg.scope,
        scriptURL: reg.active?.scriptURL,
        state: reg.active?.state,
        installing: !!reg.installing,
        waiting: !!reg.waiting,
        active: !!reg.active
      });
    });
    
    // Check for Firebase messaging SW specifically
    const firebaseSW = registrations.find(reg => 
      reg.active?.scriptURL.includes('firebase-messaging-sw')
    );
    
    if (firebaseSW) {
      console.log('✅ Firebase messaging SW found:', firebaseSW);
    } else {
      console.warn('⚠️ Firebase messaging SW not found');
      
      // Try to register it manually
      console.log('🔄 Attempting manual registration...');
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Manual registration successful:', registration);
        
        // Wait for it to be active
        if (registration.installing) {
          console.log('⏳ Waiting for SW to install...');
          await new Promise(resolve => {
            registration.installing.addEventListener('statechange', () => {
              if (registration.installing.state === 'activated') {
                resolve();
              }
            });
          });
        }
        
        console.log('✅ Firebase SW is now active');
      } catch (error) {
        console.error('❌ Manual registration failed:', error);
      }
    }
    
    // Check if Firebase is available
    if (window.firebaseNotificationManager) {
      console.log('✅ Firebase notification manager available');
      
      // Check support
      console.log('🔍 Firebase support check:', {
        isSupported: window.firebaseNotificationManager.isSupported,
        isInitialized: window.firebaseNotificationManager.isInitialized
      });
      
      // Try to initialize
      console.log('🚀 Attempting Firebase initialization...');
      const initialized = await window.firebaseNotificationManager.initialize();
      console.log('🎯 Firebase initialization result:', initialized);
      
    } else {
      console.error('❌ Firebase notification manager not available');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
};

// Function to test FCM token generation
window.testFCMToken = async () => {
  console.log('🔍 Testing FCM Token Generation...');
  
  try {
    // Check notification permission
    console.log('🔔 Notification permission:', Notification.permission);
    
    if (Notification.permission !== 'granted') {
      console.log('📝 Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('🎯 Permission result:', permission);
      
      if (permission !== 'granted') {
        console.error('❌ Permission denied');
        return;
      }
    }
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready:', registration);
      
      // Check push manager
      if ('pushManager' in registration) {
        console.log('✅ Push Manager available');
        
        // Try to get existing subscription
        const existingSubscription = await registration.pushManager.getSubscription();
        console.log('📋 Existing subscription:', existingSubscription);
        
      } else {
        console.error('❌ Push Manager not available');
      }
    }
    
    // Try Firebase token
    if (window.firebaseNotificationManager) {
      console.log('🔥 Attempting to get Firebase token...');
      const token = await window.firebaseNotificationManager.getToken();
      console.log('🎯 Firebase token result:', token ? token.substring(0, 20) + '...' : 'No token');
    }
    
  } catch (error) {
    console.error('❌ FCM Token test failed:', error);
  }
};

// Auto-run debug on load
setTimeout(() => {
  console.log('🚀 Auto-running Firebase debug...');
  window.debugFirebaseServiceWorker();
}, 3000);