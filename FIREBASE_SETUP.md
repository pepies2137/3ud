# Firebase Cloud Messaging - Instrukcja konfiguracji

## 🔥 Co zostało dodane:

### 1. Pliki Firebase:
- `utils/firebase.js` - główna konfiguracja Firebase i FCM
- `firebase-messaging-sw.js` - Service Worker dla FCM (musi być w root)
- `schema_firebase.sql` - tabele bazy danych dla tokenów FCM

### 2. Zmodyfikowane pliki:
- `index.html` - dodano import Firebase SDK
- `app.js` - dodano inicjalizację Firebase
- `sw.js` - obsługa powiadomień Firebase i natywnych
- `utils/pushNotifications.js` - integracja z Firebase
- `components/BroadcastNotifications.js` - wysyłanie przez Firebase

## 🚀 Następne kroki:

### 1. Wygeneruj VAPID Key w Firebase Console:
1. Idź do Firebase Console: https://console.firebase.google.com/
2. Wybierz projekt "udant-95f62"
3. Idź do Project Settings > Cloud Messaging
4. W sekcji "Web configuration" wygeneruj Web push certificates
5. Skopiuj VAPID key i zamień w `utils/firebase.js` linię:
   ```javascript
   const VAPID_KEY = "BKxvxKqiLrhpIOx0ZrqzQpNl8Zr8gKqiLrhpIOx0ZrqzQpNl8Zr8gKqiLrhpIOx0ZrqzQpNl8Zr8g";
   ```

### 2. Dodaj tabele do bazy danych:
Wykonaj SQL z pliku `schema_firebase.sql` w swojej bazie Supabase.

### 3. Utwórz serwer endpoint dla wysyłania FCM:
Potrzebujesz backend endpoint który będzie wysyłał powiadomienia FCM. Przykład:

```javascript
// Backend endpoint (Node.js/Express)
const admin = require('firebase-admin');

// Inicjalizacja Firebase Admin SDK
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Endpoint do wysyłania powiadomień
app.post('/send-notification', async (req, res) => {
  const { tokens, title, body, data } = req.body;
  
  const message = {
    notification: { title, body },
    data: data || {},
    tokens: tokens // array of FCM tokens
  };
  
  try {
    const response = await admin.messaging().sendMulticast(message);
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Konfiguracja domeny w Firebase:
1. W Firebase Console idź do Project Settings > General
2. W sekcji "Your apps" znajdź swoją web app
3. Dodaj swoją domenę do "Authorized domains"

## 🔧 Jak to działa:

### Przepływ powiadomień:
1. **Rejestracja**: Użytkownik daje zgodę, app otrzymuje FCM token
2. **Przechowywanie**: Token zapisywany w tabeli `user_fcm_tokens`
3. **Wysyłanie**: Backend używa FCM API do wysłania powiadomienia
4. **Odbiór**: 
   - App w foreground: `onMessage` handler
   - App w background: `firebase-messaging-sw.js`
   - App zamknięta: system pokazuje powiadomienie

### Priorytet powiadomień:
1. **Firebase FCM** (najlepsze dla background)
2. **Service Worker** (fallback)
3. **Local Notifications** (ostateczny fallback)

## 🧪 Testowanie:

### W konsoli przeglądarki:
```javascript
// Sprawdź status Firebase
window.firebaseNotificationManager.isReady()

// Test powiadomienia
window.testPushNotifications()

// Sprawdź token FCM
window.firebaseNotificationManager.getCurrentToken()
```

### Debugowanie:
- Otwórz DevTools > Application > Service Workers
- Sprawdź czy oba SW są zarejestrowane
- W Console sprawdź logi Firebase

## ⚠️ Ważne uwagi:

1. **HTTPS wymagane**: FCM działa tylko na HTTPS (lub localhost)
2. **Service Worker**: `firebase-messaging-sw.js` MUSI być w root directory
3. **Permissions**: Użytkownik musi dać zgodę na powiadomienia
4. **Tokeny**: FCM tokeny mogą się zmieniać, trzeba je aktualizować
5. **Limity**: Firebase ma limity na ilość powiadomień

## 🔍 Rozwiązywanie problemów:

### Powiadomienia nie działają:
1. Sprawdź czy VAPID key jest poprawny
2. Sprawdź czy domeny są autoryzowane w Firebase
3. Sprawdź czy użytkownik dał zgodę na powiadomienia
4. Sprawdź logi w DevTools Console

### Service Worker nie rejestruje się:
1. Sprawdź czy plik jest w root directory
2. Sprawdź czy nie ma błędów składni
3. Sprawdź czy HTTPS jest włączone

### Tokeny nie zapisują się:
1. Sprawdź czy tabele zostały utworzone
2. Sprawdź połączenie z Supabase
3. Sprawdź uprawnienia użytkownika

## 📱 Testowanie na urządzeniach:

### Desktop PWA:
- Chrome/Edge: Bardzo dobre wsparcie
- Firefox: Ograniczone wsparcie FCM
- Safari: Brak wsparcia FCM (używa fallback)

### Mobile PWA:
- Android Chrome: Pełne wsparcie FCM
- iOS Safari: Ograniczone (iOS 16.4+)
- iOS Chrome: Używa Safari engine

## 🎯 Następne ulepszenia:

1. **Personalizacja**: Różne typy powiadomień dla różnych użytkowników
2. **Scheduling**: Zaplanowane powiadomienia
3. **Analytics**: Śledzenie otwarć i kliknięć
4. **A/B Testing**: Testowanie różnych treści
5. **Rich Notifications**: Obrazki, przyciski, akcje