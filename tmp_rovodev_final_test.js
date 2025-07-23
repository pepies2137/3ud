// Final Firebase Integration Test
console.log('🚀 Final Firebase Test Script Loaded');

window.runFinalFirebaseTest = async () => {
  console.log('🔥 Running Final Firebase Integration Test...');
  console.log('=====================================');
  
  try {
    // Step 1: Check VAPID key
    console.log('1️⃣ Checking VAPID Key...');
    const vapidValid = window.checkVAPIDKey();
    if (!vapidValid) {
      console.error('❌ VAPID key validation failed');
      return;
    }
    
    // Step 2: Debug Service Workers
    console.log('2️⃣ Debugging Service Workers...');
    await window.debugFirebaseServiceWorker();
    
    // Step 3: Test FCM Token
    console.log('3️⃣ Testing FCM Token Generation...');
    await window.testFCMToken();
    
    // Step 4: Test Firebase Manager
    console.log('4️⃣ Testing Firebase Manager...');
    if (window.firebaseNotificationManager) {
      console.log('✅ Firebase manager available');
      
      const isReady = window.firebaseNotificationManager.isReady();
      console.log('🔍 Firebase manager ready:', isReady);
      
      if (!isReady) {
        console.log('🔄 Attempting to initialize...');
        const initialized = await window.firebaseNotificationManager.initialize();
        console.log('🎯 Initialization result:', initialized);
      }
      
      // Try to get token
      const token = window.firebaseNotificationManager.getCurrentToken();
      console.log('🔑 Current token:', token ? token.substring(0, 20) + '...' : 'No token');
      
    } else {
      console.error('❌ Firebase manager not found');
    }
    
    // Step 5: Test notification
    console.log('5️⃣ Testing Notification...');
    if (window.firebaseNotificationManager && window.firebaseNotificationManager.isReady()) {
      try {
        await window.firebaseNotificationManager.showNotification(
          'Firebase Test Success! 🔥',
          {
            body: 'Firebase Cloud Messaging is working correctly!',
            icon: '/icon-192.png',
            tag: 'firebase-success-test'
          }
        );
        console.log('✅ Test notification sent via Firebase');
      } catch (notifError) {
        console.error('❌ Test notification failed:', notifError);
      }
    } else {
      console.log('⚠️ Firebase not ready, testing fallback...');
      if (window.pushManager) {
        try {
          await window.pushManager.sendNotification(
            'Fallback Test',
            'Testing fallback notification system',
            { tag: 'fallback-test' }
          );
          console.log('✅ Fallback notification sent');
        } catch (fallbackError) {
          console.error('❌ Fallback notification failed:', fallbackError);
        }
      }
    }
    
    // Step 6: Summary
    console.log('6️⃣ Test Summary:');
    console.log('================');
    console.log('🔑 VAPID Key:', vapidValid ? '✅ Valid' : '❌ Invalid');
    console.log('🔧 Service Workers:', 'serviceWorker' in navigator ? '✅ Supported' : '❌ Not supported');
    console.log('🔔 Notifications:', Notification.permission);
    console.log('🔥 Firebase Manager:', window.firebaseNotificationManager ? '✅ Available' : '❌ Missing');
    console.log('🚀 Firebase Ready:', window.firebaseNotificationManager?.isReady() ? '✅ Ready' : '❌ Not ready');
    
    console.log('');
    console.log('🎯 Next Steps:');
    if (window.firebaseNotificationManager?.isReady()) {
      console.log('✅ Firebase is working! All notifications will use Firebase Cloud Messaging');
      console.log('💡 Test by sending a broadcast notification from admin panel');
    } else {
      console.log('⚠️ Firebase not working, but fallback system is active');
      console.log('💡 Check browser console for specific error messages');
      console.log('💡 Try disabling adblocker or testing in incognito mode');
    }
    
  } catch (error) {
    console.error('❌ Final test failed:', error);
  }
};

// Auto-run after 5 seconds
setTimeout(() => {
  console.log('🚀 Auto-running final Firebase test...');
  window.runFinalFirebaseTest();
}, 5000);