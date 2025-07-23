# PWA Installation Guide & HTTPS Configuration

## Konfiguracja HTTPS na serwerze

### ⚠️ KRYTYCZNE: Wymuszenie HTTPS

Aplikacja **MUSI** działać na HTTPS aby PWA działało poprawnie. Plik `.htaccess` zawiera:

```apache
# WYMUSZENIE HTTPS - przekieruj wszystkie żądania HTTP na HTTPS
RewriteCond %{HTTPS} off
RewriteCond %{HTTP:X-Forwarded-Proto} !https
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Alternatywna reguła dla serwerów z proxy (CloudFlare, etc.)
RewriteCond %{HTTP:CF-Visitor} '"scheme":"http"'
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### Wymagania serwera:
1. **Certyfikat SSL** - Let's Encrypt lub płatny
2. **Moduł mod_rewrite** - włączony w Apache/LiteSpeed
3. **Moduł mod_headers** - dla security headers

### Sprawdzenie HTTPS:
- Otwórz konsolę deweloperską (F12)
- Sprawdź czy `location.protocol === 'https:'`
- Sprawdź czy `window.isSecureContext === true`
- Sprawdź Network tab czy brak błędów mixed content

## Wymagania PWA

Aby aplikacja była instalowalna jako PWA, musi spełniać następujące wymagania:

### 1. Bezpieczne połączenie
- **HTTPS** w produkcji (WYMAGANE!)
- **localhost** dozwolony w developmencie

### 2. Manifest Web App
- Plik `manifest.json` z wymaganymi polami
- Ikony w rozmiarach 192x192 i 512x512
- `start_url`, `name`, `display: standalone`

### 3. Service Worker
- Zarejestrowany Service Worker
- Obsługa podstawowych żądań

### 4. Responsywność
- Meta tag viewport
- Responsywny design

## Instrukcje instalacji

### iOS (tylko Safari!)
⚠️ **WAŻNE**: PWA można instalować TYLKO w przeglądarce Safari!

1. Otwórz stronę w **Safari** (nie Chrome/Firefox)
2. Naciśnij przycisk **Udostępnij** (⎙) na dole ekranu
3. Przewiń w dół i wybierz **"Dodaj do ekranu głównego"**
4. Potwierdź instalację

### Android
1. Otwórz stronę w Chrome lub Firefox
2. Naciśnij menu przeglądarki (⋮)
3. Wybierz **"Zainstaluj aplikację"** lub **"Dodaj do ekranu głównego"**
4. Potwierdź instalację

### Desktop (Chrome/Edge)
1. Kliknij ikonę instalacji w pasku adresu
2. Lub użyj menu → "Zainstaluj aplikację"
3. Potwierdź instalację

## Debugowanie PWA

Sprawdź w konsoli deweloperskiej:
- Czy Service Worker jest zarejestrowany
- Czy event `beforeinstallprompt` jest wywoływany
- Czy manifest jest poprawnie załadowany
- Czy wszystkie ikony są dostępne

### Chrome DevTools
1. F12 → Application tab
2. Sprawdź sekcję "Manifest"
3. Sprawdź sekcję "Service Workers"
4. Użyj Lighthouse do audytu PWA