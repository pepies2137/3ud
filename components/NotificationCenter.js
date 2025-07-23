function NotificationCenter({ user }) {
  try {
    const [notifications, setNotifications] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [touchStart, setTouchStart] = React.useState(null);
    const [touchMove, setTouchMove] = React.useState(null);
    const [swipedNotification, setSwipedNotification] = React.useState(null);
    const [lastFetch, setLastFetch] = React.useState(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [pullToRefresh, setPullToRefresh] = React.useState({ active: false, distance: 0 });

    React.useEffect(() => {
      // Enhanced loading for mobile PWA (iOS and Android)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = isPWA && isIOS;
      const isAndroidPWA = isPWA && isAndroid;
      const isMobilePWA = isPWA && (isIOS || isAndroid);
      
      console.log('🚀 NotificationCenter mounting:', { isIOS, isAndroid, isPWA, isIOSPWA, isAndroidPWA, isMobilePWA, userId: user.id });
      
      // Load from cache first, then fetch fresh data
      const cacheLoaded = loadFromCache();
      
      // For mobile PWA (iOS/Android), if cache failed, force a fresh fetch with timeout
      if (isMobilePWA && !cacheLoaded) {
        console.log(`📱 Mobile PWA (${isAndroid ? 'Android' : 'iOS'}): No cache, forcing fresh fetch with timeout`);
        setTimeout(() => {
          fetchNotifications(true);
        }, isAndroidPWA ? 200 : 100); // Android needs slightly more time
      } else {
        fetchNotifications(!cacheLoaded); // Only show loading if cache didn't load
      }
      
      // Optimized polling - longer intervals in PWA to save battery
      const pollInterval = isPWA ? 60000 : 30000; // 1min for PWA, 30s for browser
      
      const interval = setInterval(() => {
        // Only fetch if tab is visible (performance optimization)
        if (!document.hidden) {
          fetchNotifications(false); // Silent refresh
        }
      }, pollInterval);
      
      // Listen for new notifications event
      const handleNewNotification = () => {
        fetchNotifications();
      };
      
      // Listen for visibility change to refresh when tab becomes active
      const handleVisibilityChange = () => {
        if (!document.hidden && lastFetch && Date.now() - lastFetch > 30000) {
          fetchNotifications(false); // Silent refresh if last fetch was >30s ago
        }
      };
      
      window.addEventListener('newNotification', handleNewNotification);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Pull-to-refresh for PWA - works on both mobile and desktop
      let startY = 0;
      let currentY = 0;
      let pullStartTime = 0;
      let isMouseDown = false;
      const isMacOS = navigator.platform.indexOf('Mac') > -1 || navigator.userAgent.indexOf('Mac') > -1;
      
      // Touch events for mobile
      const handleTouchStart = (e) => {
        if (window.scrollY === 0) {
          startY = e.touches[0].clientY;
          pullStartTime = Date.now();
        }
      };
      
      const handleTouchMove = (e) => {
        if (startY === 0) return;
        
        currentY = e.touches[0].clientY;
        const pullDistance = Math.max(0, currentY - startY);
        
        if (pullDistance > 0 && window.scrollY === 0) {
          e.preventDefault();
          const newDistance = Math.min(pullDistance, 120);
          setPullToRefresh({ 
            active: newDistance > 80, 
            distance: newDistance 
          });
          
          // Ciągnij całą aplikację w dół jak w Instagramie
          const appContainer = document.getElementById('root');
          if (appContainer) {
            const pullOffset = Math.min(newDistance * 0.5, 60);
            appContainer.style.transform = `translateY(${pullOffset}px)`;
            appContainer.style.transition = 'none';
          }
        }
      };
      
      const handleTouchEnd = () => {
        if (pullToRefresh.distance > 80) {
          fetchNotifications(false);
        }
        setPullToRefresh({ active: false, distance: 0 });
        startY = 0;
        
        // Resetuj pozycję aplikacji
        const appContainer = document.getElementById('root');
        if (appContainer) {
          appContainer.style.transform = '';
          appContainer.style.transition = 'transform 0.3s ease-out';
          setTimeout(() => {
            appContainer.style.transition = '';
          }, 300);
        }
      };
      
      // Mouse events for desktop PWA
      const handleMouseDown = (e) => {
        if (window.scrollY === 0 && isPWA) {
          isMouseDown = true;
          startY = e.clientY;
          pullStartTime = Date.now();
          document.body.style.userSelect = 'none'; // Prevent text selection
        }
      };
      
      const handleMouseMove = (e) => {
        if (!isMouseDown || startY === 0) return;
        
        currentY = e.clientY;
        const pullDistance = Math.max(0, currentY - startY);
        
        if (pullDistance > 0 && window.scrollY === 0) {
          e.preventDefault();
          const newDistance = Math.min(pullDistance, 120);
          setPullToRefresh({ 
            active: newDistance > 80, 
            distance: newDistance 
          });
          
          // Ciągnij całą aplikację w dół jak w Instagramie
          const appContainer = document.getElementById('root');
          if (appContainer) {
            const pullOffset = Math.min(newDistance * 0.5, 60);
            appContainer.style.transform = `translateY(${pullOffset}px)`;
            appContainer.style.transition = 'none';
          }
        }
      };
      
      const handleMouseUp = () => {
        if (isMouseDown) {
          if (pullToRefresh.distance > 80) {
            fetchNotifications(false);
          }
          setPullToRefresh({ active: false, distance: 0 });
          startY = 0;
          isMouseDown = false;
          document.body.style.userSelect = ''; // Restore text selection
          
          // Resetuj pozycję aplikacji
          const appContainer = document.getElementById('root');
          if (appContainer) {
            appContainer.style.transform = '';
            appContainer.style.transition = 'transform 0.3s ease-out';
            setTimeout(() => {
              appContainer.style.transition = '';
            }, 300);
          }
        }
      };
      
      // Keyboard shortcut for desktop (Ctrl+R or F5 alternative)
      const handleKeyDown = (e) => {
        if (isPWA && (e.key === 'F5' || (e.ctrlKey && e.key === 'r'))) {
          e.preventDefault();
          fetchNotifications(false);
        }
      };
      
      // Wheel event for macOS PWA (trackpad scrolling)
      const handleWheel = (e) => {
        if (!isPWA || !isMacOS) return;
        
        if (window.scrollY === 0 && e.deltaY < 0) {
          // Scrollowanie w górę na samej górze strony
          const wheelDistance = Math.abs(e.deltaY) * 2;
          
          if (startY === 0) {
            startY = 1; // Oznacz że zaczęliśmy
          }
          
          const newDistance = Math.min((pullToRefresh.distance || 0) + wheelDistance, 120);
          setPullToRefresh({ 
            active: newDistance > 80, 
            distance: newDistance 
          });
          
          e.preventDefault();
          e.stopPropagation();
          
          // Auto-reset po 500ms bez aktywności
          clearTimeout(window.notificationWheelTimeout);
          window.notificationWheelTimeout = setTimeout(() => {
            if (pullToRefresh.distance > 80) {
              fetchNotifications(false);
            }
            setPullToRefresh({ active: false, distance: 0 });
            startY = 0;
            
            // Resetuj pozycję aplikacji
            const appContainer = document.getElementById('root');
            if (appContainer) {
              appContainer.style.transform = '';
              appContainer.style.transition = 'transform 0.3s ease-out';
              setTimeout(() => {
                appContainer.style.transition = '';
              }, 300);
            }
          }, 500);
        }
      };
      
      // Add all event listeners
      document.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keydown', handleKeyDown);
      
      // Add wheel event for macOS PWA
      if (isPWA && isMacOS) {
        document.addEventListener('wheel', handleWheel, { passive: false });
      }
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('newNotification', handleNewNotification);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
        
        // Remove wheel event for macOS PWA
        if (isPWA && isMacOS) {
          document.removeEventListener('wheel', handleWheel);
        }
      };
    }, [user.id, pullToRefresh.distance]);

    // Cache cleanup on component mount
    React.useEffect(() => {
      const cleanupCache = () => {
        try {
          const keys = Object.keys(localStorage);
          let cleaned = 0;
          
          keys.forEach(key => {
            if (key.startsWith('notifications_cache_') || key.startsWith('warnings_cache_')) {
              try {
                const data = JSON.parse(localStorage.getItem(key));
                const age = Date.now() - data.timestamp;
                
                // Remove cache older than 1 hour
                if (age > 3600000) {
                  localStorage.removeItem(key);
                  cleaned++;
                }
              } catch (error) {
                // Remove corrupted cache
                localStorage.removeItem(key);
                cleaned++;
              }
            }
          });
          
          if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} old notification cache entries`);
          }
        } catch (error) {
          console.warn('Cache cleanup failed:', error);
        }
      };
      
      // Cleanup after 2 seconds to not block initial render
      setTimeout(cleanupCache, 2000);
    }, []);

    // Cache management functions
    const getCacheKey = () => `notifications_cache_${user.id}`;
    const getWarningsCacheKey = () => `warnings_cache_${user.id}`;
    
    const loadFromCache = () => {
      try {
        const cacheKey = getCacheKey();
        const warningsCacheKey = getWarningsCacheKey();
        
        console.log('📦 Attempting to load from cache:', { cacheKey, warningsCacheKey });
        
        const cached = localStorage.getItem(cacheKey);
        const cachedWarnings = localStorage.getItem(warningsCacheKey);
        
        console.log('📦 Cache status:', { 
          hasCache: !!cached, 
          hasWarningsCache: !!cachedWarnings,
          cacheSize: cached ? cached.length : 0
        });
        
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          console.log('📦 Cache details:', { 
            dataLength: data ? data.length : 0, 
            ageMinutes: Math.round(age / 60000),
            isValid: age < 300000 
          });
          
          // Use cache if less than 5 minutes old, or for mobile PWA use longer cache
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          const isAndroid = /Android/i.test(navigator.userAgent);
          const isPWA = window.matchMedia('(display-mode: standalone)').matches;
          const isMobilePWA = isPWA && (isIOS || isAndroid);
          const useCache = age < 300000 || (isMobilePWA && age < 3600000); // 1 hour for mobile PWA
          
          if (useCache) {
            console.log('📦 Loading notifications from cache');
            
            let allNotifications = data || [];
            
            // Add cached warnings if user is driver
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.role === 'driver' && cachedWarnings) {
              try {
                const { data: warningsData, timestamp: warningsTimestamp } = JSON.parse(cachedWarnings);
                const warningsAge = Date.now() - warningsTimestamp;
                const useWarningsCache = warningsAge < 300000 || (isIOS && isPWA && warningsAge < 3600000);
                
                if (useWarningsCache && warningsData) {
                  const warningNotifications = warningsData.map(warning => ({
                    id: `warning_${warning.id}`,
                    user_id: warning.driver_id,
                    type: 'warning',
                    message: `Ostrzeżenie: ${warning.reason}`,
                    is_read: warning.is_read,
                    created_at: warning.timestamp
                  }));
                  allNotifications = [...allNotifications, ...warningNotifications];
                  console.log(`📦 Added ${warningNotifications.length} warnings from cache`);
                }
              } catch (warningsError) {
                console.warn('⚠️ Warnings cache parse failed:', warningsError);
              }
            }
            
            allNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setNotifications(allNotifications);
            setLoading(false);
            console.log(`✅ Loaded ${allNotifications.length} notifications from cache`);
            return true;
          } else {
            console.log('📦 Cache too old, skipping');
          }
        } else {
          console.log('📦 No cache found');
        }
      } catch (error) {
        console.error('❌ Cache load failed:', error);
      }
      return false;
    };
    
    const saveToCache = (notifications, warnings = null) => {
      try {
        const cacheKey = getCacheKey();
        const warningsCacheKey = getWarningsCacheKey();
        
        // Separate notifications from warnings
        const pureNotifications = notifications.filter(n => !n.id.toString().startsWith('warning_'));
        
        localStorage.setItem(cacheKey, JSON.stringify({
          data: pureNotifications,
          timestamp: Date.now()
        }));
        
        if (warnings) {
          localStorage.setItem(warningsCacheKey, JSON.stringify({
            data: warnings,
            timestamp: Date.now()
          }));
        }
        
        console.log('💾 Notifications cached successfully');
      } catch (error) {
        console.warn('Cache save failed:', error);
      }
    };

    const fetchNotifications = async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }
        
        // Debug PWA vs Browser mode + mobile detection
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOSPWA = isPWA && isIOS;
        const isAndroidPWA = isPWA && isAndroid;
        const isMobilePWA = isPWA && (isIOS || isAndroid);
        
        console.log(`🔍 NotificationCenter: Fetching notifications`, {
          isPWA,
          isIOS,
          isAndroid,
          isIOSPWA,
          isAndroidPWA,
          isMobilePWA,
          userAgent: navigator.userAgent,
          userId: user.id,
          silent: !showLoading
        });
        
        // Mobile PWA może mieć problemy z network requests - spróbuj najpierw cache
        if (isMobilePWA && !showLoading) {
          console.log(`📱 Mobile PWA (${isAndroid ? 'Android' : 'iOS'}): Trying cache first for silent refresh`);
          const cacheLoaded = loadFromCache();
          if (cacheLoaded) {
            console.log(`✅ Mobile PWA (${isAndroid ? 'Android' : 'iOS'}): Using cache for silent refresh`);
            setLoading(false);
            setIsRefreshing(false);
            return;
          }
        }
        
        // Parallel fetching for better performance
        const fetchPromises = [secureOps.getMyNotifications()];
        
        // If user is a driver, fetch warnings in parallel
        const currentUser = getCurrentUser();
        let isDriver = false;
        if (currentUser && currentUser.role === 'driver') {
          isDriver = true;
          fetchPromises.push(secureOps.getMyWarnings());
          console.log('🚗 User is driver, fetching warnings in parallel...');
        }
        
        const results = await Promise.allSettled(fetchPromises);
        
        // Handle notifications result
        let userNotifications = [];
        if (results[0].status === 'fulfilled') {
          userNotifications = results[0].value || [];
        } else {
          console.error('❌ Failed to fetch notifications:', results[0].reason);
        }
        
        // Handle warnings result (if driver)
        let warnings = [];
        if (isDriver && results[1]) {
          if (results[1].status === 'fulfilled') {
            warnings = results[1].value || [];
            // Convert warnings to notification format
            const warningNotifications = warnings.map(warning => ({
              id: `warning_${warning.id}`,
              user_id: warning.driver_id,
              type: 'warning',
              message: `Ostrzeżenie: ${warning.reason}`,
              is_read: warning.is_read,
              created_at: warning.timestamp
            }));
            
            // Merge notifications and warnings
            userNotifications = [...userNotifications, ...warningNotifications];
            console.log(`✅ Merged ${warnings.length} warnings with ${userNotifications.length - warnings.length} notifications`);
          } else {
            console.warn('⚠️ Could not fetch warnings:', results[1].reason);
          }
        }
        
        // Sort by creation date
        userNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Cache the results
        saveToCache(userNotifications, warnings);
        setLastFetch(Date.now());
        
        // Check for new unread notifications and send push notifications
        const currentUnreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        const newUnreadNotifications = userNotifications.filter(n => 
          !n.is_read && !currentUnreadIds.includes(n.id)
        );
        
        if (newUnreadNotifications.length > 0) {
          try {
            // Sprawdź ustawienia użytkownika przed wysłaniem powiadomienia
            const userSettings = localStorage.getItem(`notification_settings_${user.id}`);
            const settings = userSettings ? JSON.parse(userSettings) : { newNotification: true };
            
            if (settings.newNotification) {
              newUnreadNotifications.forEach(notification => {
                const author = notification.message.includes('~') 
                  ? notification.message.split('~').pop().trim() 
                  : 'System';
                const content = notification.message.includes('~')
                  ? notification.message.split('~')[0].trim()
                  : notification.message;
                
                // Try Firebase first, then fallback to push manager
                if (window.firebaseNotificationManager && window.firebaseNotificationManager.isReady()) {
                  window.firebaseNotificationManager.showNotification(
                    `Nowe powiadomienie od ${author}`,
                    {
                      body: content,
                      tag: 'new-notification',
                      data: { type: 'notification', author, content }
                    }
                  );
                } else if (window.pushManager && typeof window.pushManager.notifyNewNotification === 'function') {
                  window.pushManager.notifyNewNotification(content, author);
                }
              });
            }
          } catch (pushError) {
            console.warn('⚠️ Push notification failed:', pushError);
          }
        }
        
        setNotifications(userNotifications);
        console.log(`✅ NotificationCenter: Loaded ${userNotifications.length} notifications (${warnings.length} warnings)`);
      } catch (error) {
        console.error('❌ NotificationCenter: Fetch notifications error:', error);
        
        // Enhanced fallback for PWA, especially mobile
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOSPWA = isPWA && isIOS;
        const isAndroidPWA = isPWA && isAndroid;
        const isMobilePWA = isPWA && (isIOS || isAndroid);
        
        console.log('❌ Primary fetch failed:', error.message);
        
        if (isPWA) {
          console.log(`🔄 PWA Fallback (iOS: ${isIOS}, Android: ${isAndroid})...`);
          
          // Mobile PWA Strategy: Try cache first, then direct queries
          if (isMobilePWA) {
            console.log(`📱 Mobile PWA (${isAndroid ? 'Android' : 'iOS'}): Trying cache fallback first`);
            const cacheKey = getCacheKey();
            const warningsCacheKey = getWarningsCacheKey();
            const cached = localStorage.getItem(cacheKey);
            const cachedWarnings = localStorage.getItem(warningsCacheKey);
            
            if (cached) {
              try {
                const { data, timestamp } = JSON.parse(cached);
                let allNotifications = data || [];
                
                // Add warnings if available and user is driver
                const currentUser = getCurrentUser();
                if (currentUser && currentUser.role === 'driver' && cachedWarnings) {
                  const { data: warningsData } = JSON.parse(cachedWarnings);
                  const warningNotifications = (warningsData || []).map(warning => ({
                    id: `warning_${warning.id}`,
                    user_id: warning.driver_id,
                    type: 'warning',
                    message: `Ostrzeżenie: ${warning.reason}`,
                    is_read: warning.is_read,
                    created_at: warning.timestamp
                  }));
                  allNotifications = [...allNotifications, ...warningNotifications];
                }
                
                allNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setNotifications(allNotifications);
                console.log(`✅ Mobile PWA (${isAndroid ? 'Android' : 'iOS'}): Loaded ${allNotifications.length} notifications from cache`);
                return; // Exit early with cache
              } catch (cacheError) {
                console.error(`❌ Mobile PWA (${isAndroid ? 'Android' : 'iOS'}) cache failed:`, cacheError);
              }
            }
          }
          
          // Strategy 1: Try direct supabase queries
          try {
            const fallbackPromises = [
              supabase.query('notifications', {
                select: '*',
                eq: { user_id: user.id },
                order: 'created_at.desc',
                limit: 50
              })
            ];
            
            // Add warnings query if user is driver
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.role === 'driver') {
              fallbackPromises.push(
                supabase.query('warnings', {
                  select: '*',
                  eq: { driver_id: user.id },
                  order: 'timestamp.desc',
                  limit: 20
                })
              );
            }
            
            const fallbackResults = await Promise.allSettled(fallbackPromises);
            let fallbackNotifications = fallbackResults[0].status === 'fulfilled' ? fallbackResults[0].value || [] : [];
            
            if (fallbackResults[1] && fallbackResults[1].status === 'fulfilled') {
              const fallbackWarnings = fallbackResults[1].value || [];
              const warningNotifications = fallbackWarnings.map(warning => ({
                id: `warning_${warning.id}`,
                user_id: warning.driver_id,
                type: 'warning',
                message: `Ostrzeżenie: ${warning.reason}`,
                is_read: warning.is_read,
                created_at: warning.timestamp
              }));
              fallbackNotifications = [...fallbackNotifications, ...warningNotifications];
            }
            
            fallbackNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setNotifications(fallbackNotifications);
            console.log(`✅ PWA Fallback: Loaded ${fallbackNotifications.length} notifications`);
            
          } catch (fallbackError) {
            console.error('❌ PWA Fallback also failed:', fallbackError);
            
            // Strategy 2: Use stale cache if available
            const cacheKey = getCacheKey();
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              try {
                const { data } = JSON.parse(cached);
                setNotifications(data || []);
                console.log('📦 Using stale cache as last resort');
              } catch (cacheError) {
                console.error('❌ Even cache failed:', cacheError);
                setNotifications([]);
              }
            } else {
              setNotifications([]);
            }
          }
        } else {
          setNotifications([]);
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    const markAsRead = async (notificationId) => {
      try {
        // Optimistic update - update UI immediately
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        
        // Update cache immediately
        const updatedNotifications = notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        saveToCache(updatedNotifications);
        
        // Then update server
        if (notificationId.toString().startsWith('warning_')) {
          const warningId = notificationId.replace('warning_', '');
          await secureOps.markWarningAsRead(parseInt(warningId));
        } else {
          await supabase.update('notifications', 
            { is_read: true }, 
            { id: notificationId }
          );
        }
        
        // Notify navigation to update unread count
        setTimeout(() => {
          console.log('📢 NotificationCenter: Dispatching notificationMarkedAsRead event for single notification');
          window.dispatchEvent(new CustomEvent('notificationMarkedAsRead'));
        }, 100);
        
      } catch (error) {
        console.error('Mark notification as read error:', error);
        // Revert optimistic update on error
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: false } : n)
        );
      }
    };

    const markAllAsRead = async () => {
      try {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        
        if (unreadIds.length === 0) {
          return; // No unread notifications
        }
        
        for (const id of unreadIds) {
          // Check if it's a warning notification
          if (id.toString().startsWith('warning_')) {
            const warningId = id.replace('warning_', '');
            await secureOps.markWarningAsRead(parseInt(warningId));
          } else {
            await supabase.update('notifications', 
              { is_read: true }, 
              { id }
            );
          }
        }
        
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        
        // Notify navigation to update unread count - ensure this happens after DB update
        setTimeout(() => {
          console.log('📢 NotificationCenter: Dispatching notificationsMarkedAsRead event');
          window.dispatchEvent(new CustomEvent('notificationsMarkedAsRead'));
        }, 100);
        
      } catch (error) {
        console.error('Mark all notifications as read error:', error);
      }
    };

    const deleteNotification = async (notificationId) => {
      try {
        // Check if it's a warning notification
        if (notificationId.toString().startsWith('warning_')) {
          // Can't delete warnings, just mark as read
          const warningId = notificationId.replace('warning_', '');
          await secureOps.markWarningAsRead(parseInt(warningId));
        } else {
          await supabase.delete('notifications', { id: notificationId });
        }
        
        // Immediately update local state
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Update navigation counter
        window.dispatchEvent(new CustomEvent('notificationDeleted'));
      } catch (error) {
        console.error('Delete notification error:', error);
        alert('Błąd podczas usuwania powiadomienia');
      }
    };

    const clearAllNotifications = async () => {
      if (!confirm('Czy na pewno chcesz usunąć wszystkie powiadomienia? Ta akcja jest nieodwracalna.')) {
        return;
      }

      try {
        // Delete all notifications for current user in one operation
        await secureOps.deleteMyNotifications();
        
        // Immediately clear local state
        setNotifications([]);
        
        // Force refresh of navigation unread count
        window.dispatchEvent(new CustomEvent('notificationsCleared'));
      } catch (error) {
        console.error('Clear all notifications error:', error);
        alert('Błąd podczas usuwania powiadomień');
      }
    };

    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getNotificationAuthor = (message) => {
      if (message.includes('~')) {
        return message.split('~').pop().trim();
      }
      return 'System';
    };

    const getNotificationContent = (message) => {
      if (message.includes('~')) {
        return message.split('~')[0].trim();
      }
      return message;
    };

    const handleTouchStart = (e, notificationId) => {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY, id: notificationId });
    };

    const handleTouchMove = (e, notificationId) => {
      if (!touchStart || touchStart.id !== notificationId) return;
      
      const currentTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const deltaX = currentTouch.x - touchStart.x;
      const deltaY = Math.abs(currentTouch.y - touchStart.y);
      
      // Only allow horizontal swipe if vertical movement is minimal
      if (deltaY < 50 && deltaX > 50) {
        setTouchMove({ deltaX, id: notificationId });
        e.target.closest('.swipe-notification').style.transform = `translateX(${deltaX}px)`;
        e.target.closest('.swipe-notification').style.opacity = Math.max(0.3, 1 - deltaX / 200);
      }
    };

    const handleTouchEnd = (e, notificationId) => {
      if (!touchStart || !touchMove || touchMove.id !== notificationId) {
        setTouchStart(null);
        setTouchMove(null);
        return;
      }
      
      const element = e.target.closest('.swipe-notification');
      
      if (touchMove.deltaX > 100) {
        // Swipe threshold reached - delete notification
        element.classList.add('swiped');
        setTimeout(() => {
          deleteNotification(notificationId);
        }, 200);
      } else {
        // Reset position
        element.style.transform = 'translateX(0)';
        element.style.opacity = '1';
      }
      
      setTouchStart(null);
      setTouchMove(null);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
      <div className="space-y-6" data-name="notification-center" data-file="components/NotificationCenter.js">
        {/* Pull-to-refresh indicator */}
        {pullToRefresh.distance > 0 && (
          <div 
            className="fixed top-0 left-0 right-0 text-white text-center py-3 transition-all duration-200 font-bold"
            style={{ 
              zIndex: 999999,
              transform: `translateY(${Math.min(pullToRefresh.distance - 80, 0)}px)`,
              opacity: pullToRefresh.distance / 120,
              backgroundColor: pullToRefresh.active ? '#059669' : '#000000'
            }}
          >
            <div className={`icon-refresh-cw inline mr-2 ${pullToRefresh.active ? 'animate-spin' : ''}`}></div>
            {pullToRefresh.active ? 'ODŚWIEŻ' : 'PRZECIĄGNIJ W DÓŁ'}
          </div>
        )}
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Powiadomienia</h1>
          <p className="text-gray-300">Zarządzaj swoimi powiadomieniami</p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">
              Wszystkie powiadomienia ({notifications.length})
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-white text-sm rounded-full">
                  {unreadCount} nowych
                </span>
              )}
              {isRefreshing && (
                <span className="ml-2 text-blue-400 text-sm">
                  <div className="icon-refresh-cw inline animate-spin mr-1"></div>
                  Odświeżanie...
                </span>
              )}
            </h2>
            <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="btn-secondary text-sm"
                >
                  <div className="icon-check-circle inline mr-1"></div>
                  Odczytaj wszystkie
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="btn-secondary text-sm text-red-400 hover:text-red-300"
                >
                  <div className="icon-trash-2 inline mr-1"></div>
                  Usuń wszystkie
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="icon-loader-2 text-4xl animate-spin text-white mb-2"></div>
              <p className="text-gray-300">Ładowanie powiadomień...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="icon-bell-off text-6xl text-gray-500 mb-4"></div>
              <h3 className="text-xl font-bold text-gray-400 mb-2">Brak powiadomień</h3>
              <p className="text-gray-500">Nie masz jeszcze żadnych powiadomień</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors swipe-notification cursor-pointer ${
                    !notification.is_read 
                      ? 'bg-blue-500/20 border-blue-500/50' 
                      : 'bg-white/5 border-white/10'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                  onTouchStart={(e) => handleTouchStart(e, notification.id)}
                  onTouchMove={(e) => handleTouchMove(e, notification.id)}
                  onTouchEnd={(e) => handleTouchEnd(e, notification.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="icon-bell text-blue-400 mr-2"></div>
                        <span className="text-white font-medium">
                          {getNotificationAuthor(notification.message)}
                        </span>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-red-500 rounded-full ml-2"></div>
                        )}
                      </div>
                      <p className="text-gray-300 mb-2">
                        {getNotificationContent(notification.message)}
                      </p>
                      <div className="text-gray-400 text-sm">
                        {formatTime(notification.created_at)}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors min-w-8 min-h-8"
                          title="Oznacz jako przeczytane"
                        >
                          <div className="icon-check text-lg"></div>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors min-w-8 min-h-8"
                        title="Usuń powiadomienie"
                      >
                        <div className="icon-trash-2 text-lg"></div>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('NotificationCenter component error:', error);
    return null;
  }
}
