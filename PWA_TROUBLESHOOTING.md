# PWA Installation Troubleshooting

## ❌ **Problem:** beforeinstallprompt event nie jest wywoływany

### 🔍 **Możliwe przyczyny:**

1. **PWA już zainstalowane**
2. **Błędy w manifest.json**
3. **Service Worker nie działa**
4. **Ikony nie ładują się**
5. **Przeglądarka nie obsługuje PWA**

## 🛠️ **Kroki debugowania:**

### 1. **Sprawdź czy PWA jest już zainstalowane:**
```
Chrome: chrome://apps/
Edge: edge://apps/
```
Jeśli znajdziesz CARSWAG - usuń go.

### 2. **Sprawdź DevTools:**
```
F12 → Application tab → Manifest
- Sprawdź czy manifest się ładuje
- Sprawdź czy ikony są dostępne
- Sprawdź błędy walidacji
```

### 3. **Sprawdź Service Worker:**
```
F12 → Application tab → Service Workers
- Sprawdź czy SW jest zarejestrowany
- Sprawdź status (activated/installing)
```

### 4. **Sprawdź konsole:**
Dodałem skrypt diagnostyczny - sprawdź logi:
```
=== PWA Installation Diagnostics ===
✅/❌ Basic PWA Requirements
✅/❌ Manifest loaded
✅/❌ Icons loaded
```

### 5. **Wyczyść cache i dane:**
```javascript
// W konsoli przeglądarki:
localStorage.clear();
sessionStorage.clear();
forcePWACheck(); // Funkcja dodana do debugowania
```

### 6. **Sprawdź Network tab:**
- Czy manifest.json się ładuje (200 OK)
- Czy ikony się ładują (icon-192.png, icon-512.png)
- Czy sw.js się ładuje

## 🔧 **Naprawione problemy:**

1. **Manifest.json** - poprawione rozmiary ikon (512x512)
2. **Debugowanie** - dodane szczegółowe logi
3. **PWAInstallPrompt** - dodane logi statusu

## 🧪 **Funkcje testowe:**

```javascript
// Wymuś sprawdzenie PWA
forcePWACheck();

// Instrukcje odinstalowania
uninstallPWA();

// Sprawdź status
console.log('PWA installed:', window.matchMedia('(display-mode: standalone)').matches);
```

## 📱 **Wymagania PWA (przypomnienie):**

1. ✅ **HTTPS** (lub localhost)
2. ✅ **Manifest.json** z wymaganymi polami
3. ✅ **Service Worker** zarejestrowany
4. ✅ **Ikony** 192x192 i 512x512
5. ✅ **Responsive design**
6. ⚠️ **User interaction** (czasem wymagane)

## 🔄 **Jeśli nadal nie działa:**

1. **Restart przeglądarki**
2. **Sprawdź w trybie incognito**
3. **Sprawdź w innej przeglądarce**
4. **Sprawdź na telefonie**
5. **Sprawdź na HTTPS (nie localhost)**