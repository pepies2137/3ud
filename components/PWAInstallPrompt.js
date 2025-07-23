function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isAndroid, setIsAndroid] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);

  React.useEffect(() => {
    // Detect device type and browser
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    
    setIsIOS(iOS);
    setIsAndroid(android);
    
    // Log browser detection for debugging
    console.log('PWA Browser Detection:', {
      iOS,
      android,
      isSafari,
      isChrome,
      userAgent: navigator.userAgent
    });

    // Check if already installed
    const isInPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone === true;
    setIsInstalled(isInPWA);
    
    console.log('🔍 PWA Install Check:', {
      isInPWA,
      standalone: window.navigator.standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches,
      userAgent: navigator.userAgent
    });

    // Check dismissal status
    const dismissed = localStorage.getItem('pwa-dismissed');
    const isDismissed = dismissed === 'installed' || 
                       (dismissed && new Date(dismissed) > new Date());
    
    console.log('📝 PWA Dismissal Status:', { dismissed, isDismissed });

    // Show prompt if not installed and not dismissed
    if (!isInPWA && !isDismissed) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event received!', e);
      e.preventDefault();
      setDeferredPrompt(e);
      
      if (!isInPWA && !isDismissed) {
        console.log('Showing PWA install prompt in 2 seconds...');
        setTimeout(() => setShowPrompt(true), 2000);
      } else {
        console.log('PWA prompt not shown:', { isInPWA, isDismissed });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem('pwa-dismissed', 'installed');
        setIsInstalled(true);
      } else {
        // Show again in 1 day if declined
        const dismissUntil = new Date();
        dismissUntil.setDate(dismissUntil.getDate() + 1);
        localStorage.setItem('pwa-dismissed', dismissUntil.toISOString());
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      // Manual installation instructions
      if (isIOS) {
        alert('Aby zainstalować aplikację na iOS:\n\n⚠️ UWAGA: PWA można instalować TYLKO w przeglądarce Safari!\n\n1. Otwórz tę stronę w Safari (nie w Chrome/Firefox)\n2. Naciśnij przycisk Udostępnij (⎙) na dole ekranu\n3. Przewiń w dół i wybierz "Dodaj do ekranu głównego"\n4. Potwierdź instalację\n\nJeśli nie widzisz opcji "Dodaj do ekranu głównego", upewnij się że używasz Safari.');
      } else if (isAndroid) {
        alert('Aby zainstalować aplikację:\n1. Otwórz menu przeglądarki (⋮)\n2. Wybierz "Zainstaluj aplikację" lub "Dodaj do ekranu głównego"\n3. Potwierdź instalację\n\nJeśli nie widzisz opcji instalacji, spróbuj w Chrome lub Firefox.');
      }
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    // Dismiss for 1 day only
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 1);
    localStorage.setItem('pwa-dismissed', dismissUntil.toISOString());
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-xl shadow-lg z-50"
      style={{
        animation: 'slideUp 0.5s ease-out'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📱</div>
          <div>
            <div className="font-bold text-sm">Zainstaluj CARSWAG</div>
            <div className="text-xs opacity-90">
              🔔 Otrzymuj powiadomienia push na telefon!
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleInstall}
            className="bg-white text-red-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
          >
            Zainstaluj
          </button>
          <button
            onClick={handleDismiss}
            className="border border-white text-white px-3 py-2 rounded-lg text-xs hover:bg-white hover:text-red-600 transition-all duration-300 transform hover:scale-105"
          >
            Później
          </button>
        </div>
      </div>
      
      
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}