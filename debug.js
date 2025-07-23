// Debug utilities for PWA
window.debugPWA = {
  // Check PWA status
  checkPWAStatus() {
    console.log('=== PWA DEBUG INFO ===');
    console.log('Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'PWA' : 'Browser');
    console.log('User Agent:', navigator.userAgent);
    console.log('Service Worker support:', 'serviceWorker' in navigator);
    console.log('Current URL:', window.location.href);
    console.log('Protocol:', window.location.protocol);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('Service Worker registrations:', registrations.length);
        registrations.forEach((reg, index) => {
          console.log(`SW ${index}:`, reg.scope, reg.active?.state);
        });
      });
    }
  },

  // Check last error
  checkLastError() {
    const lastError = localStorage.getItem('lastError');
    if (lastError) {
      console.log('=== LAST ERROR ===');
      console.log(JSON.parse(lastError));
    } else {
      console.log('No previous errors found');
    }
  },

  // Clear all data
  clearAll() {
    console.log('Clearing all PWA data...');
    localStorage.clear();
    sessionStorage.clear();
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          console.log('Unregistering SW:', registration.scope);
          registration.unregister();
        });
      });
    }
    
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log('Deleting cache:', name);
          caches.delete(name);
        });
      });
    }
    
    console.log('All data cleared. Reload the page.');
  },

  // Test basic functionality
  testBasics() {
    console.log('=== TESTING BASICS ===');
    
    // Test React
    console.log('React:', typeof React !== 'undefined' ? 'OK' : 'MISSING');
    console.log('ReactDOM:', typeof ReactDOM !== 'undefined' ? 'OK' : 'MISSING');
    
    // Test Supabase
    console.log('Supabase:', typeof window.supabase !== 'undefined' ? 'OK' : 'MISSING');
    
    // Test localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      console.log('localStorage: OK');
    } catch (e) {
      console.log('localStorage: ERROR', e);
    }
    
    // Test current user
    const currentUser = localStorage.getItem('currentUser');
    console.log('Current user:', currentUser ? 'EXISTS' : 'MISSING');
    
    console.log('=== TEST COMPLETE ===');
  }
};

// Auto-run debug on PWA
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('🔍 PWA detected - running debug check');
  setTimeout(() => {
    window.debugPWA.checkPWAStatus();
    window.debugPWA.checkLastError();
  }, 1000);
}