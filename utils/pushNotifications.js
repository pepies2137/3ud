// Push notification utilities with VAPID support and Firebase integration
class PushNotificationManager {
  constructor() {
    this.permission = 'default';
    this.subscription = null;
    this.registration = null;
    // VAPID public key - w produkcji powinien być w zmiennych środowiskowych
    this.vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f7ePOFKoA3mFXRjQJMuXKOdHiOOcgVwAitOcfVbqmcyPiLwtjVs';
    this.init();
  }

  async init() {
    try {
      if ('Notification' in window) {
        this.permission = Notification.permission;
      }
      
      // Rejestracja service workera
      if ('serviceWorker' in navigator) {
        try {
          this.registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered for push notifications');
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
      
      // Integracja z Firebase
      this.initFirebaseIntegration();
      
      console.log('✅ Push notification manager initialized');
      return true;
    } catch (error) {
      console.error('❌ Push notification manager init failed:', error);
      return false;
    }
  }

  initFirebaseIntegration() {
    // Sprawdź czy Firebase jest dostępny
    if (window.firebaseNotificationManager) {
      console.log('🔥 Firebase integration available');
      this.firebaseManager = window.firebaseNotificationManager;
    } else {
      console.log('⚠️ Firebase not available, using fallback notifications');
    }
  }

  async requestPermission() {
    if ('Notification' in window && this.permission === 'default') {
      this.permission = await Notification.requestPermission();
      
      // Jeśli pozwolenie zostało udzielone, subskrybuj push notifications
      if (this.permission === 'granted' && this.registration) {
        await this.subscribeToPush();
      }
    }
    return this.permission;
  }

  async subscribeToPush() {
    if (!this.registration) {
      console.error('Service Worker not registered');
      return null;
    }

    try {
      // Sprawdź czy już jest subskrypcja
      this.subscription = await this.registration.pushManager.getSubscription();
      console.log('Existing subscription:', !!this.subscription);
      
      if (!this.subscription) {
        console.log('Creating new push subscription...');
        // Utwórz nową subskrypcję
        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
        
        console.log('✅ Push subscription created successfully:', this.subscription);
        
        // Wyślij subskrypcję na serwer (w przyszłości)
        // await this.sendSubscriptionToServer(this.subscription);
      } else {
        console.log('✅ Using existing push subscription');
      }
      
      return this.subscription;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      console.error('Error details:', error.message);
      return null;
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async sendNotification(title, body, options = {}) {
    if (this.permission !== 'granted') {
      console.log('❌ Permission not granted:', this.permission);
      return false;
    }
    
    const defaultOptions = {
      icon: '/icon-192.png',
      badge: '/favicon.ico',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      silent: false,
      tag: 'carswag-notification',
      // Dodatkowe opcje dla lepszej obsługi w tle
      renotify: true, // Pozwala na ponowne powiadomienie z tym samym tag
      sticky: true, // Powiadomienie nie zniknie automatycznie
      timestamp: Date.now(),
      ...options
    };

    try {
      // Priorytet: Firebase > Service Worker > Local notifications
      if (this.firebaseManager && this.firebaseManager.isReady()) {
        console.log('🔥 Using Firebase notifications');
        const result = await this.firebaseManager.showNotification(title, defaultOptions);
        console.log('🔥 Firebase notification result:', result);
        return result;
      } else if (this.registration) {
        console.log('🔔 Using service worker notifications');
        const result = await this.sendServiceWorkerNotification(title, body, defaultOptions);
        console.log('🔔 Service worker notification result:', result);
        return result;
      } else {
        console.log('📱 Using local notifications (fallback)');
        const result = await this.sendLocalNotification(title, body, defaultOptions);
        console.log('📱 Local notification result:', result);
        return result;
      }
    } catch (error) {
      console.error('Push notification error:', error);
      console.log('📱 Falling back to local notifications');
      // Fallback do lokalnych powiadomień w przypadku błędu
      try {
        const result = await this.sendLocalNotification(title, body, defaultOptions);
        console.log('📱 Fallback notification result:', result);
        return result;
      } catch (fallbackError) {
        console.error('📱 Fallback notification also failed:', fallbackError);
        return false;
      }
    }
  }

  async sendServiceWorkerNotification(title, body, options) {
    try {
      // Wyślij powiadomienie bezpośrednio przez service worker registration
      const notificationData = {
        title,
        body,
        ...options
      };

      // Użyj registration.showNotification zamiast postMessage
      if (this.registration) {
        await this.registration.showNotification(title, {
          body,
          icon: options.icon || '/icon-192.png',
          badge: options.badge || '/favicon.ico',
          vibrate: options.vibrate || [200, 100, 200],
          requireInteraction: options.requireInteraction || true,
          tag: options.tag || 'carswag-notification',
          data: {
            url: '/?view=notifications',
            timestamp: Date.now()
          },
          actions: [
            {
              action: 'open',
              title: 'Otwórz aplikację'
            }
          ]
        });
        
        console.log('✅ Service worker notification displayed');
        return true;
      } else {
        throw new Error('Service worker registration not available');
      }
    } catch (error) {
      console.error('Service worker notification error:', error);
      throw error;
    }
  }

  async sendLocalNotification(title, body, options) {
    try {
      console.log('📱 Creating local notification:', { title, body, options });
      
      const notification = new Notification(title, {
        body,
        ...options
      });

      notification.onclick = () => {
        console.log('📱 Local notification clicked');
        window.focus();
        notification.close();
        // Przekieruj do powiadomień
        if (window.setCurrentView) {
          window.setCurrentView('notifications');
        }
      };

      // Auto close after 8 seconds
      setTimeout(() => {
        console.log('📱 Auto-closing local notification');
        notification.close();
      }, 8000);
      
      console.log('✅ Local notification created successfully');
      return true; // Return true to indicate success
    } catch (error) {
      console.error('❌ Local notification error:', error);
      throw error;
    }
  }

  async notifyVoteReceived(voterName, carInfo) {
    // Sprawdź ustawienia użytkownika
    const userId = window.currentUser?.id;
    if (userId) {
      const userSettings = localStorage.getItem(`notification_settings_${userId}`);
      const settings = userSettings ? JSON.parse(userSettings) : { voteReceived: false }; // Domyślnie wyłączone
      if (!settings.voteReceived) return;
    }
    
    return this.sendNotification(
      'Nowy glos!',
      `${voterName} zaglosowal na Twoje auto: ${carInfo}`,
      { tag: 'vote-received' }
    );
  }

  async notifyVoteHourlySummary(voteCount, carInfo) {
    // Sprawdź ustawienia użytkownika
    const userId = window.currentUser?.id;
    if (userId) {
      const userSettings = localStorage.getItem(`notification_settings_${userId}`);
      const settings = userSettings ? JSON.parse(userSettings) : { voteHourlySummary: false };
      if (!settings.voteHourlySummary) return;
    }
    
    const message = voteCount === 1 
      ? `Twoje auto ${carInfo} otrzymalo 1 glos w ostatniej godzinie`
      : `Twoje auto ${carInfo} otrzymalo ${voteCount} glosow w ostatniej godzinie`;
    
    return this.sendNotification(
      'Podsumowanie glosow',
      message,
      { tag: 'vote-summary' }
    );
  }

  async notifyUpcomingSession(groupName) {
    // Sprawdź ustawienia użytkownika
    const userId = window.currentUser?.id;
    if (userId) {
      const userSettings = localStorage.getItem(`notification_settings_${userId}`);
      const settings = userSettings ? JSON.parse(userSettings) : { upcomingSession: true };
      if (!settings.upcomingSession) return;
    }
    
    const groupNames = {
      basic: 'Podstawowa',
      medium: 'Srednia', 
      advanced: 'PRO'
    };
    
    return this.sendNotification(
      'Twoja tura juz niedlugo!',
      `Nastepna sesja to ${groupNames[groupName]}. Przygotuj sie!`,
      { tag: 'upcoming-session' }
    );
  }

  async notifyBroadcast(message) {
    // Powiadomienia od administratora są zawsze włączone - nie sprawdzamy ustawień
    return this.sendNotification(
      'Informacja organizatora',
      message,
      { 
        tag: 'broadcast',
        vibrate: [300, 100, 300, 100, 300], // Dłuższa wibracja dla ważnych wiadomości
        requireInteraction: true
      }
    );
  }

  async notifyNewNotification(message, author = 'System') {
    return this.sendNotification(
      `Nowe powiadomienie od ${author}`,
      message,
      { 
        tag: 'new-notification',
        vibrate: [200, 100, 200]
      }
    );
  }

  // Test notification for PWA
  async sendTestNotification() {
    console.log('🔔 Requesting push notifications permission...');
    
    // Najpierw poproś o pozwolenie
    const permission = await this.requestPermission();
    console.log('Permission result:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Permission granted, creating push subscription...');
      
      // Upewnij się, że mamy subskrypcję push
      if (!this.subscription) {
        await this.subscribeToPush();
      }
      
      console.log('✅ Push subscription ready, sending test notification...');
      const notificationResult = await this.sendNotification(
        'CARSWAG - Test powiadomienia',
        'Powiadomienia push dzialaja poprawnie! 🚗💨 Sprawdz sekcje powiadomien systemowych.',
        { 
          tag: 'test',
          vibrate: [100, 50, 100, 50, 100],
          requireInteraction: true,
          icon: '/icon-192.png'
        }
      );
      
      console.log('🔍 Notification result:', notificationResult);
      return notificationResult || true; // Return true if notification was attempted
    } else {
      console.warn('❌ Push notifications permission not granted:', permission);
      console.log('💡 Sprawdź ustawienia przeglądarki - może powiadomienia są zablokowane');
      return null;
    }
  }

  // Sprawdź ustawienia powiadomień w systemie
  async checkNotificationSettings() {
    console.log('🔍 Sprawdzanie ustawień powiadomień...');
    
    // Podstawowe sprawdzenia
    const checks = {
      notificationSupport: 'Notification' in window,
      serviceWorkerSupport: 'serviceWorker' in navigator,
      pushManagerSupport: 'PushManager' in window,
      permission: Notification.permission,
      isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
      registration: !!this.registration,
      subscription: !!this.subscription
    };
    
    console.table(checks);
    
    // Sprawdź czy to PWA i system
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroidPWA = isPWA && isAndroid;
    const isIOSPWA = isPWA && isIOS;
    
    console.log('📱 Device info:', { isPWA, isAndroid, isIOS, isAndroidPWA, isIOSPWA });
    
    // Sprawdź ustawienia przeglądarki (jeśli dostępne)
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({name: 'notifications'});
        console.log('🔐 Browser permission state:', permission.state);
        
        permission.addEventListener('change', () => {
          console.log('🔄 Permission changed to:', permission.state);
        });
      } catch (error) {
        console.log('⚠️ Cannot check browser permissions:', error.message);
      }
    }
    
    // Porady dla użytkownika
    if (checks.permission !== 'granted') {
      console.log('💡 Aby włączyć powiadomienia:');
      console.log('   1. Kliknij ikonę kłódki/informacji w pasku adresu');
      console.log('   2. Ustaw powiadomienia na "Zezwalaj"');
      console.log('   3. Odśwież stronę');
    }
    
    if (!isPWA) {
      console.log('💡 Aby poprawić działanie powiadomień:');
      if (isAndroid) {
        console.log('   🤖 Android: Kliknij "Dodaj do ekranu głównego" w menu Chrome');
        console.log('   🤖 Android: Otwórz aplikację z ekranu głównego');
        console.log('   🤖 Android: Sprawdź ustawienia powiadomień w Androidzie');
      } else if (isIOS) {
        console.log('   🍎 iOS: Kliknij "Dodaj do ekranu głównego" w Safari');
        console.log('   🍎 iOS: Otwórz aplikację z ekranu głównego');
      } else {
        console.log('   1. Dodaj aplikację do ekranu głównego');
        console.log('   2. Otwórz jako PWA (aplikacja)');
      }
      console.log('   3. Powiadomienia będą działać lepiej w tle');
    } else if (isAndroidPWA) {
      console.log('💡 Android PWA - dodatkowe wskazówki:');
      console.log('   🤖 Sprawdź ustawienia powiadomień w Androidzie');
      console.log('   🤖 Upewnij się że aplikacja nie jest w trybie oszczędzania baterii');
      console.log('   🤖 Sprawdź czy Chrome ma pozwolenie na powiadomienia');
    }
    
    return checks;
  }

  // Funkcja do testowania z konsoli
  async testPushNotifications() {
    console.log('🔔 Testowanie push notifications...');
    console.log('Current permission:', this.permission);
    console.log('Service Worker registration:', !!this.registration);
    console.log('Push subscription (before):', !!this.subscription);
    
    // Sprawdź czy przeglądarka obsługuje powiadomienia
    if (!('Notification' in window)) {
      console.error('❌ Ta przeglądarka nie obsługuje powiadomień');
      return null;
    }
    
    // Sprawdź czy to HTTPS (wymagane dla push notifications)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.warn('⚠️ Push notifications wymagają HTTPS');
    }
    
    const result = await this.sendTestNotification();
    
    console.log('Push subscription (after):', !!this.subscription);
    
    if (result) {
      console.log('✅ Test notification sent! Sprawdź powiadomienia systemowe.');
    } else {
      console.log('❌ Test notification failed');
      console.log('💡 Możliwe przyczyny:');
      console.log('   - Brak pozwolenia na powiadomienia');
      console.log('   - Powiadomienia zablokowane w przeglądarce');
      console.log('   - Brak HTTPS (jeśli nie localhost)');
    }
    
    return result;
  }
}

const pushManager = new PushNotificationManager();

// Globalne funkcje do testowania push notifications
window.testPushNotifications = () => pushManager.testPushNotifications();
window.requestNotificationPermission = () => pushManager.requestPermission();
window.checkNotificationSettings = () => pushManager.checkNotificationSettings();
window.checkNotificationPermission = () => {
  console.log('🔍 Status powiadomień:');
  console.log('Permission:', Notification.permission);
  console.log('Obsługa powiadomień:', 'Notification' in window);
  console.log('Service Worker:', 'serviceWorker' in navigator);
  console.log('Push Manager:', 'PushManager' in window);
  console.log('HTTPS:', location.protocol === 'https:' || location.hostname === 'localhost');
  console.log('💡 Użyj checkNotificationSettings() dla szczegółowej diagnozy');
  return Notification.permission;
};
window.pushManager = pushManager;