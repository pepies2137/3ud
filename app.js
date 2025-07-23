class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Zapisz błąd do localStorage dla debugowania
    const errorLog = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      isPWA: window.matchMedia('(display-mode: standalone)').matches
    };
    
    try {
      localStorage.setItem('lastError', JSON.stringify(errorLog));
    } catch (e) {
      console.error('Could not save error to localStorage:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
          <div className="text-white text-center max-w-md">
            <h1 className="text-2xl font-bold mb-4">Wystąpił błąd aplikacji</h1>
            <p className="text-gray-300 mb-4">Odśwież stronę lub skontaktuj się z kaczką</p>
            
            {/* Debug info for PWA */}
            <details className="mb-4 text-left">
              <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                Informacje debugowania
              </summary>
              <div className="mt-2 p-3 bg-gray-800 rounded text-xs">
                <p><strong>Błąd:</strong> {this.state.error?.message || 'Nieznany błąd'}</p>
                <p><strong>PWA:</strong> {window.matchMedia('(display-mode: standalone)').matches ? 'Tak' : 'Nie'}</p>
                <p><strong>User Agent:</strong> {navigator.userAgent}</p>
                <p><strong>Czas:</strong> {new Date().toLocaleString()}</p>
              </div>
            </details>
            
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                Odśwież stronę
              </button>
              <button 
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      registrations.forEach(registration => registration.unregister());
                    }).then(() => {
                      localStorage.clear();
                      window.location.reload();
                    });
                  } else {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
              >
                Wyczyść cache i odśwież
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  try {
    const [user, setUser] = React.useState(null);
    const [currentView, setCurrentView] = React.useState('dashboard');
    const [loading, setLoading] = React.useState(true);
    const [showAvatarUpload, setShowAvatarUpload] = React.useState(false);
    const mainRef = React.useRef(null);

    React.useEffect(() => {
      const savedUser = getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
        // checkUnreadNotifications will be called after push manager init
      }
      loadAppSettings();
      setLoading(false);
      
      // Rejestracja service workera i push notifications
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registered:', registration);
            
        // Register Firebase Messaging Service Worker with proper scope
        navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        })
          .then(registration => {
            console.log('✅ Firebase Messaging SW registered:', registration);
            // Force update to ensure latest version
            return registration.update();
          })
          .then(() => {
            console.log('✅ Firebase Messaging SW updated');
          })
          .catch(error => {
            console.error('❌ Firebase Messaging SW registration failed:', error);
          });
            
            // Nasłuchuj wiadomości z service workera
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data && event.data.action === 'navigate') {
                setCurrentView(event.data.view);
              }
            });
            
            // Rejestracja push notifications
            if ('PushManager' in window && savedUser) {
              registration.pushManager.getSubscription()
                .then(subscription => {
                  if (!subscription) {
                    // Poproś o pozwolenie na powiadomienia
                    return Notification.requestPermission()
                      .then(permission => {
                        if (permission === 'granted') {
                          console.log('Push notifications enabled');
                        }
                      });
                  }
                })
                .catch(err => console.log('Push subscription error:', err));
            }
          })
          .catch(error => {
            console.log('Service Worker registration failed:', error);
          });
      }
      
      // Initialize push notifications immediately - critical for background notifications
      if (savedUser) {
        const initPushManager = () => {
          if (window.pushManager && typeof window.pushManager.init === 'function') {
            console.log('🔔 Initializing push manager...');
            window.pushManager.init().then(() => {
              console.log('✅ Push manager initialized successfully');
              // Check for unread notifications after push manager is ready
              setTimeout(() => checkUnreadNotifications(savedUser), 500);
            }).catch(err => {
              console.log('❌ Push manager init error:', err);
              // Still check notifications even if push fails
              setTimeout(() => checkUnreadNotifications(savedUser), 500);
            });
          } else {
            console.log('⏳ Waiting for push manager to load...');
            // Wait a bit more for pushManager to load, but with timeout
            const retryCount = (initPushManager.retryCount || 0) + 1;
            initPushManager.retryCount = retryCount;
            
            if (retryCount < 10) { // Max 10 retries (2 seconds)
              setTimeout(initPushManager, 200);
            } else {
              console.warn('❌ Push manager failed to load after 10 retries, checking notifications anyway');
              setTimeout(() => checkUnreadNotifications(savedUser), 500);
            }
          }
        };
        console.log('🚀 Starting push manager initialization...');
        
        // Initialize Firebase notifications after service workers are ready
        // Android PWA needs more time for proper initialization
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        const isAndroidPWA = isPWA && isAndroid;
        const firebaseDelay = isAndroidPWA ? 3000 : 2000; // Extra time for Android PWA
        
        setTimeout(async () => {
          if (window.firebaseNotificationManager) {
            console.log(`🔥 Starting Firebase initialization (${isAndroidPWA ? 'Android PWA' : 'Standard'})...`);
            const initialized = await window.firebaseNotificationManager.initialize();
            if (initialized) {
              console.log('🔥 Firebase notifications ready');
              
              // For Android PWA, do additional verification
              if (isAndroidPWA) {
                console.log('🤖 Android PWA: Verifying Firebase setup...');
                try {
                  const token = await window.firebaseNotificationManager.getCurrentToken();
                  console.log('🤖 Android PWA: FCM token obtained:', !!token);
                } catch (error) {
                  console.warn('🤖 Android PWA: FCM token verification failed:', error);
                }
              }
            } else {
              console.warn('⚠️ Firebase initialization failed, using fallback notifications');
            }
          } else {
            console.warn('⚠️ Firebase notification manager not found');
          }
        }, firebaseDelay);
        // Start immediately, don't wait
        initPushManager();
      }
      
      // Start vote hourly summary manager - wait for it to be available
      if (savedUser) {
        const initSummaryManager = () => {
          if (window.voteHourlySummaryManager && typeof window.voteHourlySummaryManager.start === 'function') {
            window.voteHourlySummaryManager.start();
          } else {
            // Wait a bit more for summary manager to load
            setTimeout(initSummaryManager, 500);
          }
        };
        setTimeout(initSummaryManager, 200);
      }
    }, []);

    const loadAppSettings = async () => {
      try {
        const settings = await supabase.getAppSettings();
        if (settings.favicon_url) {
          updateFavicon(settings.favicon_url);
        }
      } catch (error) {
        console.error('Error loading app settings:', error);
      }
    };

    const updateFavicon = (faviconUrl) => {
      const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
      if (favicon) {
        favicon.href = faviconUrl;
      } else {
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.href = faviconUrl;
        document.head.appendChild(newFavicon);
      }

      const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
      appleTouchIcons.forEach(icon => {
        icon.href = faviconUrl;
      });
    };

    const checkUnreadNotifications = async (user) => {
      try {
        console.log('🔍 Checking unread notifications for user:', user.id);
        
        // Check regular notifications
        const notifications = await supabase.query('notifications', {
          select: 'id',
          eq: { user_id: user.id, is_read: false },
          limit: 1
        });
        
        // Also check warnings if user is a driver
        let warnings = [];
        if (user.role === 'driver') {
          console.log('🚗 User is driver, checking warnings too...');
          warnings = await supabase.query('warnings', {
            select: 'id',
            eq: { driver_id: user.id, is_read: false },
            limit: 1
          });
        }
        
        const totalUnread = notifications.length + warnings.length;
        console.log(`📊 Found ${notifications.length} unread notifications + ${warnings.length} unread warnings = ${totalUnread} total`);
        
        if (totalUnread > 0) {
          console.log('🔄 Auto-switching to notifications view');
          setCurrentView('notifications');
        }
      } catch (error) {
        console.error('Check unread notifications error:', error);
      }
    };

    // Listen for new notifications and auto-switch to notifications view (only for kaczka broadcasts)
    React.useEffect(() => {
      const handleNewNotification = (event) => {
        // Auto-switch for important notifications (broadcast from kaczkas and warnings)
        if (user && currentView !== 'notifications' && 
            (event.detail?.type === 'broadcast' || event.detail?.type === 'warning')) {
          setCurrentView('notifications');
        }
      };

      window.addEventListener('newNotification', handleNewNotification);
      
      return () => {
        window.removeEventListener('newNotification', handleNewNotification);
      };
    }, [user, currentView]);

    // Make setCurrentView available globally for push notifications
    React.useEffect(() => {
      window.setCurrentView = setCurrentView;
      return () => {
        delete window.setCurrentView;
      };
    }, []);

    const handleLogin = (userData) => {
      setUser(userData);
      setCurrentView('dashboard');
    };

    const handleLogout = () => {
      logout();
      setUser(null);
      setCurrentView('dashboard');
    };

    const handleAvatarUpdate = (avatarUrl) => {
      const updatedUser = { ...user, avatar_url: avatarUrl };
      setUser(updatedUser);
      saveUserSession(updatedUser);
    };

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="icon-loader-2 text-4xl animate-spin text-white"></div>
        </div>
      );
    }

    if (!user) {
      return <Login onLogin={handleLogin} />;
    }

    const renderCurrentView = () => {
      const pageClass = "page-transition opacity-100 transform translate-y-0";
      
      switch (currentView) {
        case 'dashboard':
          return <div className={pageClass}><Dashboard user={user} /></div>;
        case 'voting':
          return <div className={pageClass}><VotingPanel user={user} /></div>;
        case 'notifications':
          return <div className={pageClass}><NotificationCenter user={user} /></div>;
        case 'register_driver':
          return <div className={pageClass}><DriverRegistration user={user} /></div>;
        case 'driver':
          return <div className={pageClass}><DriverPanel user={user} /></div>;
        case 'flag_manager':
          return <div className={pageClass}><FlagManager user={user} /></div>;
        case 'kaczka':
          return <div className={pageClass}><KaczkaPanel user={user} /></div>;
        default:
          return <div className={pageClass}><Dashboard user={user} /></div>;
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <Navigation 
          user={user}
          currentView={currentView}
          onViewChange={(view) => {
            // Animate page transition
            if (mainRef.current && window.Animations) {
              window.Animations.animatePageTransition(mainRef.current, 'exit');
              setTimeout(() => {
                setCurrentView(view);
                window.Animations.animatePageTransition(mainRef.current, 'enter');
              }, 200);
            } else {
              setCurrentView(view);
            }
          }}
          onLogout={handleLogout}
          onAvatarClick={() => setShowAvatarUpload(true)}
        />
        
        <main ref={mainRef} className="container mx-auto px-4 py-6">
          {renderCurrentView()}
        </main>
        
        <PWAInstallPrompt />

        {showAvatarUpload && (
          <AvatarUpload 
            user={user}
            onClose={() => setShowAvatarUpload(false)}
            onAvatarUpdate={handleAvatarUpdate}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Błąd ładowania aplikacji</div>
      </div>
    );
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
