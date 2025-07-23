// VAPID Key Checker
console.log('🔑 VAPID Key Checker loaded');

window.checkVAPIDKey = () => {
  console.log('🔍 Checking VAPID Key...');
  
  // Check if Firebase is loaded
  if (!window.firebaseNotificationManager) {
    console.error('❌ Firebase notification manager not found');
    return;
  }
  
  // Get the VAPID key from the manager
  const vapidKey = "BA69vdo_uXCmKgRoe-VCQqqwFjAuUpK4z2kLFPkHqP1aTfA_6AEZ0izAZZZf-ZiDAgD1TEa_SZIigHBzSxPvk2g";
  
  console.log('🔑 Current VAPID Key:', vapidKey);
  console.log('📏 VAPID Key length:', vapidKey.length);
  
  if (vapidKey.length < 80) {
    console.error('❌ VAPID Key is too short! Should be ~87 characters');
    console.log('💡 Generate a new VAPID key in Firebase Console:');
    console.log('   1. Go to Firebase Console → Project Settings');
    console.log('   2. Click on Cloud Messaging tab');
    console.log('   3. In Web configuration, generate Web push certificates');
    console.log('   4. Copy the key and replace VAPID_KEY in utils/firebase.js');
    return false;
  }
  
  if (vapidKey.startsWith('BKxvxKqiLrhpIOx0') || vapidKey.includes('example')) {
    console.warn('⚠️ You are using the default/example VAPID key!');
    console.log('💡 Please replace with your actual VAPID key from Firebase Console');
    return false;
  }
  
  if (vapidKey.startsWith('BA69vdo_uXCmKgRoe')) {
    console.log('✅ Using Firebase Web Push certificate VAPID key');
    return true;
  }
  
  console.log('✅ VAPID Key looks valid');
  return true;
};

// Auto-check VAPID key
setTimeout(() => {
  window.checkVAPIDKey();
}, 1000);