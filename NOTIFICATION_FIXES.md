# Notification System Fixes

## ❌ **Problemy które naprawiono:**

### 1. **Auto-switch do powiadomień nie działał po logowaniu**
**Problem:** `checkUnreadNotifications` było wywoływane przed inicjalizacją push manager
**Rozwiązanie:** Przeniesiono wywołanie do callback'a po inicjalizacji push manager

### 2. **Push notifications nie działały w tle**
**Problem:** Push manager nie był inicjalizowany natychmiast
**Rozwiązanie:** Usunięto opóźnienie, push manager startuje od razu

### 3. **Kierowcy nie widzieli ostrzeżeń**
**Problem:** `checkUnreadNotifications` sprawdzało tylko tabele `notifications`
**Rozwiązanie:** Dodano sprawdzanie tabeli `warnings` dla kierowców

## ✅ **Zmiany w app.js:**

### **PRZED:**
```javascript
// Duplikowane wywołania
setUser(savedUser);
checkUnreadNotifications(savedUser); // ❌ Za wcześnie

// Push manager z opóźnieniem
setTimeout(initPushManager, 100); // ❌ Opóźnienie

// Tylko notifications
const notifications = await supabase.query('notifications', ...);
```

### **PO:**
```javascript
// Pojedyncze wywołanie po inicjalizacji
setUser(savedUser);
// checkUnreadNotifications będzie wywołane po push manager init

// Push manager natychmiast
initPushManager(); // ✅ Bez opóźnienia

// Notifications + warnings dla kierowców
const notifications = await supabase.query('notifications', ...);
let warnings = [];
if (user.role === 'driver') {
  warnings = await supabase.query('warnings', ...);
}
const totalUnread = notifications.length + warnings.length;
```

## 🔧 **Nowa logika:**

1. **Logowanie użytkownika** → `setUser()`
2. **Natychmiastowa inicjalizacja push manager** → `initPushManager()`
3. **Po sukcesie/błędzie push manager** → `checkUnreadNotifications()`
4. **Sprawdzenie notifications + warnings** → auto-switch jeśli są nieprzeczytane
5. **Fallback** → jeśli push manager nie załaduje się w 2s, sprawdź powiadomienia anyway

## 📱 **Oczekiwane rezultaty:**

- ✅ **Po logowaniu** - natychmiastowe przełączenie na powiadomienia jeśli są nieprzeczytane
- ✅ **Push notifications** - działają od razu w tle
- ✅ **Kierowcy** - widzą ostrzeżenia z tabeli `warnings`
- ✅ **Fallback** - działa nawet jeśli push manager się nie załaduje

## 🧪 **Testowanie:**

1. **Zaloguj się** - sprawdź czy auto-switch działa
2. **Wyślij powiadomienie** - sprawdź czy push działa w tle
3. **Kierowca + ostrzeżenie** - sprawdź czy auto-switch działa
4. **Konsola** - sprawdź logi inicjalizacji