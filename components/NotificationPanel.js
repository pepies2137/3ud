function NotificationPanel({ user, onClose }) {
  try {
    const [notifications, setNotifications] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [permissionGranted, setPermissionGranted] = React.useState(false);

    React.useEffect(() => {
      fetchNotifications();
      requestNotificationPermission();
    }, []);

    const requestNotificationPermission = async () => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissionGranted(permission === 'granted');
      }
    };

    const fetchNotifications = async () => {
      try {
        // Debug PWA vs Browser mode + Android detection
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isAndroidPWA = isPWA && isAndroid;
        console.log(`🔍 NotificationPanel: Fetching notifications (PWA: ${isPWA}, Android: ${isAndroid}, AndroidPWA: ${isAndroidPWA})`);
        
        const warnings = await supabase.query('warnings', {
          select: '*',
          eq: { driver_id: user.id },
          order: 'timestamp.desc',
          limit: 10
        });
        
        const newUnread = warnings.filter(w => !w.is_read);
        if (newUnread.length > 0 && permissionGranted) {
          newUnread.forEach(warning => {
            new Notification('Nowe ostrzeżenie', {
              body: warning.reason,
              icon: '/favicon.ico'
            });
          });
        }
        
        setNotifications(warnings || []);
        console.log(`✅ NotificationPanel: Loaded ${warnings?.length || 0} warnings`);
      } catch (error) {
        console.error('❌ NotificationPanel: Fetch notifications error:', error);
        
        // In PWA, show more detailed error info
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isAndroidPWA = isPWA && isAndroid;
        if (isPWA) {
          console.log(`🔍 PWA Error Details (${isAndroid ? 'Android' : 'Other'}):`, {
            error: error.message,
            stack: error.stack,
            network: navigator.onLine ? 'Online' : 'Offline',
            protocol: location.protocol,
            hostname: location.hostname,
            userAgent: navigator.userAgent,
            isAndroidPWA
          });
        }
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    const markAsRead = async (warningId) => {
      try {
        await supabase.update('warnings', { is_read: true }, { id: warningId });
        fetchNotifications();
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 z-50" data-name="notification-panel" data-file="components/NotificationPanel.js">
        <div className="card w-full max-w-md max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Powiadomienia</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <div className="icon-x text-xl"></div>
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="icon-loader-2 text-xl animate-spin text-white"></div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-3 rounded-lg border ${
                    notification.is_read 
                      ? 'bg-white/5 border-white/10' 
                      : 'bg-red-500/20 border-red-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <div className="icon-alert-triangle text-yellow-500 mr-2"></div>
                        <span className="text-white font-medium">Ostrzeżenie</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{notification.reason}</p>
                      <div className="text-gray-400 text-xs">
                        {new Date(notification.timestamp).toLocaleString('pl-PL')}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        Oznacz jako przeczytane
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="icon-bell-off text-4xl mb-2"></div>
              <p>Brak powiadomień</p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('NotificationPanel component error:', error);
    return null;
  }
}