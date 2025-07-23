function Navigation({ user, currentView, onViewChange, onLogout, onShowNotifications, onAvatarClick }) {
  try {
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [appLogo, setAppLogo] = React.useState(null);
    const [showUserMenu, setShowUserMenu] = React.useState(false);
    const [showNotificationSettings, setShowNotificationSettings] = React.useState(false);
    const navRef = React.useRef(null);

    const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: 'home', roles: ['user', 'driver', 'flag_manager', 'admin'] },
      { id: 'voting', label: 'Głosowanie', icon: 'vote', roles: ['user', 'driver', 'admin'] },
      { id: 'notifications', label: 'Powiadomienia', icon: 'bell', roles: ['user', 'driver', 'flag_manager', 'admin'] },
      { id: 'register_driver', label: 'Zgłoś się', icon: 'user-plus', roles: ['user'] },
      { id: 'driver', label: 'Panel Kierowcy', icon: 'car', roles: ['driver'] },
      { id: 'flag_manager', label: 'Kierownik Flag', icon: 'flag', roles: ['flag_manager'] },
      { id: 'kaczka', label: 'Kaczka', icon: 'settings', roles: ['admin'] }
    ];

    // Separate useEffect for user-dependent operations
    React.useEffect(() => {
      fetchAppLogo();
      fetchUnreadCount();
      
      // Real-time notification count updates every 30 seconds (reduced server load)
      const interval = setInterval(fetchUnreadCount, 30000);
      
      return () => {
        clearInterval(interval);
      };
    }, [user.id]);

    // Separate useEffect for event listeners (no dependencies to prevent re-registration)
    React.useEffect(() => {
      // Zamknij menu przy kliknięciu poza nim
      const handleClickOutside = (event) => {
        if (showUserMenu) {
          const userMenuContainer = document.querySelector('[data-user-menu]');
          if (userMenuContainer && !userMenuContainer.contains(event.target)) {
            setShowUserMenu(false);
          }
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      // Listen for notifications cleared event
      const handleNotificationsCleared = () => {
        setUnreadCount(0);
      };
      
      // Listen for new notifications
      const handleNewNotification = () => {
        // Use a ref or callback to get current user.id
        setTimeout(() => {
          const currentUser = getCurrentUser();
          if (currentUser) {
            fetchUnreadCount();
          }
        }, 100);
      };
      
      // Listen for notification deleted event
      const handleNotificationDeleted = () => {
        setTimeout(() => {
          const currentUser = getCurrentUser();
          if (currentUser) {
            fetchUnreadCount();
          }
        }, 100);
      };
      
      // Listen for notifications marked as read event (all)
      const handleNotificationsMarkedAsRead = () => {
        console.log('📢 Navigation: Received notificationsMarkedAsRead event, setting unread count to 0');
        setUnreadCount(prev => {
          console.log(`📊 Navigation: Unread count changed from ${prev} to 0 (mark all as read)`);
          return 0;
        });
      };
      
      // Listen for single notification marked as read event
      const handleNotificationMarkedAsRead = () => {
        console.log('📢 Navigation: Received notificationMarkedAsRead event, decreasing unread count');
        setUnreadCount(prev => {
          const newCount = Math.max(0, prev - 1);
          console.log(`📊 Navigation: Unread count changed from ${prev} to ${newCount}`);
          return newCount;
        });
      };
      
      console.log('🔧 Navigation: Registering event listeners');
      window.addEventListener('notificationsCleared', handleNotificationsCleared);
      window.addEventListener('newNotification', handleNewNotification);
      window.addEventListener('notificationDeleted', handleNotificationDeleted);
      window.addEventListener('notificationsMarkedAsRead', handleNotificationsMarkedAsRead);
      window.addEventListener('notificationMarkedAsRead', handleNotificationMarkedAsRead);
      console.log('✅ Navigation: Event listeners registered');
      
      // Test event listener
      window.testNotificationEvent = () => {
        console.log('🧪 Testing notificationMarkedAsRead event...');
        window.dispatchEvent(new CustomEvent('notificationMarkedAsRead'));
      };
      
      // Check if listeners are working
      window.checkEventListeners = () => {
        console.log('🔍 Event listeners should be active');
      };
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
        window.removeEventListener('notificationsCleared', handleNotificationsCleared);
        window.removeEventListener('newNotification', handleNewNotification);
        window.removeEventListener('notificationDeleted', handleNotificationDeleted);
        window.removeEventListener('notificationsMarkedAsRead', handleNotificationsMarkedAsRead);
        window.removeEventListener('notificationMarkedAsRead', handleNotificationMarkedAsRead);
      };
    }, []);

    const fetchAppLogo = async () => {
      try {
        const settings = await supabase.getAppSettings();
        setAppLogo(settings.logo_url);
      } catch (error) {
        console.error('Fetch app logo error:', error);
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const notifications = await supabase.query('notifications', {
          select: 'id',
          eq: { user_id: user.id, is_read: false }
        });
        // Only log and update if count actually changed
        setUnreadCount(prev => {
          if (prev !== notifications.length) {
            console.log(`📊 Navigation: fetchUnreadCount changing count from ${prev} to ${notifications.length}`);
            return notifications.length;
          }
          return prev; // No change, don't re-render
        });
      } catch (error) {
        console.error('Fetch unread count error:', error);
      }
    };

    const visibleItems = navItems.filter(item => item.roles.includes(user.role));

    // Animate navigation on mount
    React.useEffect(() => {
      if (navRef.current && typeof gsap !== 'undefined') {
        // Ensure nav is visible first
        navRef.current.style.opacity = '1';
        gsap.fromTo(navRef.current, 
          { y: -30 },
          { 
            y: 0,
            duration: 0.6,
            ease: "power2.out"
          }
        );
      }
    }, []);

    const handleNavClick = (itemId) => {
      // Natychmiastowa zmiana widoku - nie blokuj UI
      onViewChange(itemId);
      
      // Dodaj tylko subtelną animację CSS bez blokowania
      const button = document.querySelector(`[data-nav-item="${itemId}"]`);
      if (button) {
        button.classList.add('nav-clicked');
        setTimeout(() => {
          button.classList.remove('nav-clicked');
        }, 150);
      }
    };

    return (
      <React.Fragment>
        <nav ref={navRef} className="bg-gray-800/50 backdrop-blur-sm border-b border-white/10 relative z-[9997]" data-name="navigation" data-file="components/Navigation.js">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              {appLogo ? (
                <div className="flex items-center space-x-2">
                  <img 
                    src={appLogo} 
                    alt="Logo" 
                    className="h-8 object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="icon-car text-2xl text-red-500"></div>
                  <span className="text-xl font-bold text-white">CARSWAG</span>
                </div>
              )}
            </div>
            
            <div className="hidden md:flex items-center space-x-1">
              {visibleItems.map(item => (
                <button
                  key={item.id}
                  data-nav-item={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 relative md:hover:text-white md:hover:bg-white/10 ${
                    currentView === item.id 
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' 
                      : 'text-gray-300'
                  }`}
                >
                  <div className={`icon-${item.icon} inline mr-2`}></div>
                  {item.label}
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 relative z-[9998]" data-user-menu>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="transition-colors duration-200 md:hover:scale-105"
                  title="Menu użytkownika"
                >
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-transparent md:hover:border-red-500 transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center border-2 border-transparent md:hover:border-red-400 transition-colors">
                      <span className="text-white text-sm font-bold">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>
                <div className="text-right">
                  <div className="text-sm text-white font-medium">{user.name}</div>
                  <div className="text-xs text-gray-400">{user.role}</div>
                </div>
                
                {/* Menu użytkownika */}
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-[9999]">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onAvatarClick();
                      }}
                      className="w-full text-left px-4 py-2 text-white md:hover:bg-gray-700 active:bg-gray-700 rounded-t-lg flex items-center space-x-2"
                    >
                      <div className="icon-user text-sm"></div>
                      <span>Zmien avatar</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowNotificationSettings(true);
                      }}
                      className="w-full text-left px-4 py-2 text-white md:hover:bg-gray-700 active:bg-gray-700 flex items-center space-x-2"
                    >
                      <div className="icon-bell text-sm"></div>
                      <span>Ustawienia powiadomien</span>
                    </button>
                    <hr className="border-gray-700" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-red-400 md:hover:bg-gray-700 active:bg-gray-700 rounded-b-lg flex items-center space-x-2"
                    >
                      <div className="icon-log-out text-sm"></div>
                      <span>Wyloguj</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  if (typeof gsap !== 'undefined') {
                    const logoutBtn = e.currentTarget;
                    gsap.to(logoutBtn, {
                      duration: 0.1,
                      scale: 0.9,
                      rotation: 5,
                      onComplete: () => {
                        gsap.to(logoutBtn, {
                          duration: 0.2,
                          scale: 1,
                          rotation: 0,
                          onComplete: onLogout
                        });
                      }
                    });
                  } else {
                    onLogout();
                  }
                }}
                className="p-2 text-gray-400 rounded-lg transition-colors duration-200 md:hover:text-white md:hover:bg-white/10"
                title="Wyloguj"
              >
                <div className="icon-log-out text-xl"></div>
              </button>
            </div>
          </div>
          
          <div className="md:hidden flex overflow-x-auto pb-2 space-x-1 mx-[-10px] px-[10px] touch-pan-x">
            {visibleItems.map(item => (
              <button
                key={item.id}
                data-nav-item={`mobile-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium transition-colors duration-200 relative ${
                  currentView === item.id 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' 
                    : 'text-gray-300'
                }`}
              >
                <div className={`icon-${item.icon} inline mr-1`}></div>
                {item.label}
                {item.id === 'notifications' && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{unreadCount > 9 ? '9' : unreadCount}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>
      
        {showNotificationSettings && (
          React.createElement(NotificationSettings, {
            user: user,
            onClose: () => setShowNotificationSettings(false)
          })
        )}
      </React.Fragment>
    );
  } catch (error) {
    console.error('Navigation component error:', error);
    return null;
  }
}