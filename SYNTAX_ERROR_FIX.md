# Syntax Error Fix - isPWA Declaration

## ❌ **Problem:**
```
Uncaught SyntaxError: Identifier 'isPWA' has already been declared. (44:12)
```

## 🔍 **Przyczyna:**
W `NotificationCenter.js` zmienna `isPWA` była zadeklarowana dwukrotnie w tym samym scope (React.useEffect):

```javascript
// Linia 17
const isPWA = window.matchMedia('(display-mode: standalone)').matches;

// Linia 43 (DUPLIKAT)
const isPWA = window.matchMedia('(display-mode: standalone)').matches;
```

## ✅ **Rozwiązanie:**
Usunięto duplikat deklaracji w linii 43, pozostawiając tylko jedną deklarację w linii 17.

### **PRZED:**
```javascript
React.useEffect(() => {
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  // ... kod ...
  
  // Pull-to-refresh for PWA
  const isPWA = window.matchMedia('(display-mode: standalone)').matches; // ❌ DUPLIKAT
  if (isPWA) {
    // ...
  }
}, []);
```

### **PO:**
```javascript
React.useEffect(() => {
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  // ... kod ...
  
  // Pull-to-refresh for PWA (reuse isPWA from above)
  if (isPWA) { // ✅ Używa zmiennej z linii 17
    // ...
  }
}, []);
```

## 📍 **Inne deklaracje isPWA:**
W pliku są jeszcze dwie inne deklaracje `isPWA`, ale są w różnych scope'ach (różne funkcje), więc nie powodują konfliktu:

- Linia 221: w funkcji `fetchNotifications()`
- Linia 307: w bloku catch funkcji `fetchNotifications()`

## 🧪 **Test:**
Aplikacja powinna się teraz ładować bez błędów składniowych.

## 🔮 **Zapobieganie:**
W przyszłości można użyć:
1. **ESLint** - wykryje duplikaty zmiennych
2. **TypeScript** - lepsze sprawdzanie typów
3. **Unique naming** - `isPWAForPolling`, `isPWAForPullRefresh`, etc.