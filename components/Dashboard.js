function Dashboard({ user }) {
  try {
    const [currentSession, setCurrentSession] = React.useState(null);
    const [sessionTime, setSessionTime] = React.useState(null);
    const [readyDrivers, setReadyDrivers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [dailyMode, setDailyMode] = React.useState('drift');
    const [selectedDriver, setSelectedDriver] = React.useState(null);
    const [nextGroup, setNextGroup] = React.useState('');
    const [expandedCategories, setExpandedCategories] = React.useState({});
    const [sessionEndMessage, setSessionEndMessage] = React.useState('');
    const [showEndMessage, setShowEndMessage] = React.useState(false);
    const currentSessionRef = React.useRef(null);
    
    // Update ref when currentSession changes
    React.useEffect(() => {
      currentSessionRef.current = currentSession;
    }, [currentSession]);


    React.useEffect(() => {
      fetchData();
      
      // Listen for session updates
      const handleSessionUpdate = () => {
        fetchData();
      };
      
      window.addEventListener('sessionUpdated', handleSessionUpdate);
      
      // Auto-refresh data every 30 seconds (less frequent)
      const dataInterval = setInterval(() => {
        fetchData(false); // Don't update session data
      }, 30000);
      
      // Refresh session data every 15 seconds (reduced for better performance)
      const sessionDataInterval = setInterval(() => {
        fetchSessionData();
      }, 15000);
      
      // Update session time every second (independent timer) - using ref to get current value
      const sessionTimeInterval = setInterval(() => {
        if (currentSessionRef.current) {
          updateSessionTimeWithRef();
        }
      }, 1000);
      
      return () => {
        window.removeEventListener('sessionUpdated', handleSessionUpdate);
        clearInterval(dataInterval);
        clearInterval(sessionDataInterval);
        clearInterval(sessionTimeInterval);
      };
    }, []);

    React.useEffect(() => {
      // Update time immediately when session changes
      updateSessionTime();
    }, [currentSession]);

    const fetchSessionData = async () => {
      try {
        const [runningSessions, pausedSessions, completedSessions] = await Promise.all([
          supabase.query('sessions', { 
            select: '*', 
            eq: { status: 'running' }, 
            order: 'created_at.desc',
            limit: 1 
          }),
          supabase.query('sessions', { 
            select: '*', 
            eq: { status: 'paused' }, 
            order: 'created_at.desc',
            limit: 1 
          }),
          supabase.query('sessions', { 
            select: '*', 
            eq: { status: 'completed' }, 
            order: 'created_at.desc',
            limit: 1 
          })
        ]);

        const activeSession = runningSessions[0] || pausedSessions[0] || null;
        const lastCompletedSession = completedSessions[0];
        
        // Check if current session was just completed
        if (currentSession && !activeSession && lastCompletedSession && 
            currentSession.id === lastCompletedSession.id) {
          // Session was just completed - show end message
          const groupNames = {
            'basic': 'Podstawowa',
            'medium': 'Średnia', 
            'advanced': 'PRO'
          };
          
          const nextGroupNames = {
            'basic': 'Średnia',
            'medium': 'PRO',
            'advanced': 'Podstawowa'
          };
          
          const completedGroupName = groupNames[lastCompletedSession.group_name];
          const nextGroupName = nextGroupNames[lastCompletedSession.group_name];
          
          setSessionEndMessage(`Tura ${completedGroupName} zakończona, za chwilę tura ${nextGroupName}`);
          setShowEndMessage(true);
          setCurrentSession(null);
          
          // Hide message after 10 seconds
          setTimeout(() => {
            setShowEndMessage(false);
            setSessionEndMessage('');
          }, 10000);
        }
        // Only update if session actually changed to prevent timer reset
        else if (!currentSession && activeSession) {
          // New session started
          setCurrentSession(activeSession);
          setShowEndMessage(false); // Hide end message when new session starts
        } else if (currentSession && !activeSession) {
          // Session ended (but not completed - maybe deleted)
          setCurrentSession(null);
        } else if (currentSession && activeSession && currentSession.id !== activeSession.id) {
          // Different session
          setCurrentSession(activeSession);
          setShowEndMessage(false); // Hide end message when new session starts
        } else if (currentSession && activeSession && 
                   (currentSession.status !== activeSession.status || 
                    currentSession.pause_start !== activeSession.pause_start ||
                    currentSession.pause_end !== activeSession.pause_end ||
                    currentSession.pause_duration !== activeSession.pause_duration)) {
          // Same session but status/pause changed
          setCurrentSession(activeSession);
        }
        // If session is the same, don't update to prevent re-render
      } catch (error) {
        console.error('Fetch session data error:', error);
      }
    };

    const fetchData = async (includeSessionData = true) => {
      try {
        // Get daily mode from database
        const settings = await supabase.getAppSettings();
        const currentMode = settings.daily_mode || 'drift';
        setDailyMode(currentMode);
        
        let queries = [
          supabase.query('users', {
            select: 'id, name, email, skill_level, avatar_url, instagram_username',
            eq: { role: 'driver', is_ready: true }
          })
        ];

        if (includeSessionData) {
          queries.unshift(
            supabase.query('sessions', { 
              select: '*', 
              eq: { status: 'running' }, 
              order: 'created_at.desc',
              limit: 1 
            }),
            supabase.query('sessions', { 
              select: '*', 
              eq: { status: 'paused' }, 
              order: 'created_at.desc',
              limit: 1 
            })
          );
        }

        const results = await Promise.all(queries);
        
        let runningSessions = [], pausedSessions = [], allDrivers;
        
        if (includeSessionData) {
          [runningSessions, pausedSessions, allDrivers] = results;
        } else {
          [allDrivers] = results;
        }

        // Filter drivers by daily mode category
        const driversWithCars = await Promise.all(
          allDrivers.map(async (driver) => {
            const cars = await supabase.query('cars', {
              select: '*',
              eq: { driver_id: driver.id, category: currentMode }
            });
            return cars.length > 0 ? { ...driver, cars } : null;
          })
        );
        
        const drivers = driversWithCars.filter(driver => driver !== null);
        
        if (includeSessionData) {
          if (runningSessions.length > 0) {
            setCurrentSession(runningSessions[0]);
          } else if (pausedSessions.length > 0) {
            setCurrentSession(pausedSessions[0]);
          } else {
            setCurrentSession(null);
          }
        }
        
        setReadyDrivers(drivers);
      } catch (error) {
        console.error('Fetch dashboard data error:', error);
      } finally {
        setLoading(false);
      }
    };

    const updateSessionTimeWithRef = () => {
      const session = currentSessionRef.current;
      if (!session || !session.start_time) {
        setSessionTime(null);
        setNextGroup('');
        return;
      }

      // Set next group based on current group
      const nextGroupMap = {
        'basic': 'Średnia',
        'medium': 'PRO', 
        'advanced': 'Podstawowa'
      };
      setNextGroup(nextGroupMap[session.group_name] || '');

      // Get session duration from session data or default to 15 minutes
      const sessionDuration = (session.duration_minutes || 15) * 60 * 1000;

      // WAŻNE: Jeśli sesja jest wstrzymana, nie aktualizuj timera
      if (session.status === 'paused') {
        // Calculate time at pause moment - freeze the timer
        const startTime = new Date(session.start_time);
        const pauseStart = session.pause_start ? new Date(session.pause_start) : new Date();
        
        // Calculate elapsed time up to pause moment, subtract previous pauses
        let elapsedAtPause = pauseStart - startTime;
        
        // Subtract total pause duration from previous pauses (not current one)
        if (session.total_pause_duration) {
          elapsedAtPause -= parseInt(session.total_pause_duration);
        }
        
        const remainingTime = Math.max(0, sessionDuration - elapsedAtPause);
        const minutes = Math.floor(remainingTime / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        
        setSessionTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return; // STOP - nie kontynuuj dalej gdy sesja jest wstrzymana
      }

      const startTime = new Date(session.start_time);
      const now = new Date();
      
      // Calculate total elapsed time minus total pause time
      let totalElapsed = now - startTime;
      
      // Subtract total pause duration
      if (session.total_pause_duration) {
        totalElapsed -= parseInt(session.total_pause_duration);
      }

      const remainingTime = Math.max(0, sessionDuration - totalElapsed);
      const minutes = Math.floor(remainingTime / (1000 * 60));
      const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

      // Wibracja i powiadomienie na ostatnią minutę
      if (minutes === 0 && seconds === 60) {
        if (navigator.vibrate) {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }
        if (typeof pushManager !== 'undefined') {
          // Sprawdź ustawienia użytkownika dla powiadomień o ostatniej minucie
          const userSettings = localStorage.getItem(`notification_settings_${user.id}`);
          const settings = userSettings ? JSON.parse(userSettings) : { lastMinute: true };
          
          if (settings.lastMinute) {
            pushManager.sendNotification(
              'OSTATNIA MINUTA!',
              'Sesja kończy się za minutę!',
              { 
                tag: 'last-minute',
                vibrate: [500, 200, 500, 200, 500],
                requireInteraction: true
              }
            );
          }
        }
      }

      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setSessionTime(timeString);
    };

    const updateSessionTime = () => {
      if (!currentSession || !currentSession.start_time) {
        setSessionTime(null);
        setNextGroup('');
        return;
      }

      // Set next group based on current group
      const nextGroupMap = {
        'basic': 'Średnia',
        'medium': 'PRO', 
        'advanced': 'Podstawowa'
      };
      setNextGroup(nextGroupMap[currentSession.group_name] || '');

      // Get session duration from session data or default to 15 minutes
      const sessionDuration = (currentSession.duration_minutes || 15) * 60 * 1000;

      // If session is paused, don't update the timer
      if (currentSession.status === 'paused') {
        // Calculate time at pause moment
        const startTime = new Date(currentSession.start_time);
        const pauseStart = currentSession.pause_start ? new Date(currentSession.pause_start) : new Date();
        
        // Calculate time from start to pause, minus previous pause durations
        let totalElapsed = pauseStart - startTime;
        
        // Subtract total pause duration from previous pauses
        if (currentSession.total_pause_duration) {
          totalElapsed -= parseInt(currentSession.total_pause_duration);
        }
        
        const remainingTime = Math.max(0, sessionDuration - totalElapsed);
        const minutes = Math.floor(remainingTime / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        
        setSessionTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return;
      }

      const now = new Date();
      const startTime = new Date(currentSession.start_time);
      
      // Calculate total time from start minus pause durations
      let totalElapsed = now - startTime;
      
      // Subtract total pause duration
      if (currentSession.total_pause_duration) {
        totalElapsed -= parseInt(currentSession.total_pause_duration);
      }

      const remainingTime = Math.max(0, sessionDuration - totalElapsed);
      const minutes = Math.floor(remainingTime / (1000 * 60));
      const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

      // Wibracja i powiadomienie na ostatnią minutę
      if (minutes === 0 && seconds === 60) {
        if (navigator.vibrate) {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }
        if (typeof pushManager !== 'undefined') {
          // Sprawdź ustawienia użytkownika dla powiadomień o ostatniej minucie
          const userSettings = localStorage.getItem(`notification_settings_${user.id}`);
          const settings = userSettings ? JSON.parse(userSettings) : { lastMinute: true };
          
          if (settings.lastMinute) {
            pushManager.sendNotification(
              'OSTATNIA MINUTA!',
              'Sesja kończy się za minutę!',
              { 
                tag: 'last-minute',
                vibrate: [500, 200, 500, 200, 500],
                requireInteraction: true
              }
            );
          }
        }
      }

      setSessionTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="icon-loader-2 text-4xl animate-spin text-white"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6" data-name="dashboard" data-file="components/Dashboard.js">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-300">Witaj, {user.name}!</p>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            {dailyMode === 'drift' ? (
              <>
                <div className="icon-trophy text-red-500 mr-2"></div>
                Dzień Drift
              </>
            ) : (
              <>
                <div className="icon-zap text-yellow-500 mr-2"></div>
                Dzień Time Attack
              </>
            )}
          </h3>
          <p className="text-gray-300">
            {dailyMode === 'drift' 
              ? 'Dzisiaj odbywają się zawody Drift. Głosuj na najlepsze auta - ocenia się styl, technikę i widowiskowość.'
              : 'Dzisiaj odbywają się zawody Time Attack. Głosuj na najszybsze auta - liczy się czas przejazdu i precyzja.'
            }
          </p>
        </div>

        {showEndMessage ? (
          <div className="card bg-gradient-to-r from-green-600/20 to-blue-600/20 border-2 border-green-400/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <div className="icon-check-circle text-green-400 mr-2"></div>
              Tura zakończona
            </h3>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300 mb-4 animate-pulse">
                {sessionEndMessage}
              </div>
              <div className="text-sm text-gray-300">
                Komunikat zniknie automatycznie za kilka sekund
              </div>
            </div>
          </div>
        ) : currentSession ? (
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <div className="icon-clock text-blue-400 mr-2"></div>
              Aktywna tura: {currentSession.group_name === 'basic' ? 'Podstawowa' : 
                           currentSession.group_name === 'medium' ? 'Średnia' : 
                           currentSession.group_name === 'advanced' ? 'PRO' : currentSession.group_name}
            </h3>
            <div className="text-center">
              {sessionTime ? (
                <div className={`text-6xl font-mono font-bold mb-2 ${
                  currentSession.status === 'paused' ? 'text-yellow-400' : 
                  sessionTime.startsWith('00:') && parseInt(sessionTime.split(':')[1]) <= 60 ? 'text-red-400 animate-pulse' : 
                  'text-green-400'
                }`}>
                  {sessionTime}
                </div>
              ) : (
                <div className="text-6xl font-mono font-bold mb-2 text-gray-600">
                  --:--
                </div>
              )}
              {sessionTime && sessionTime.startsWith('00:') && parseInt(sessionTime.split(':')[1]) <= 60 && (
                <div className="text-lg font-bold text-red-300 mb-2 animate-pulse">
                  ⚠️ OSTATNIA MINUTA!
                </div>
              )}
              {currentSession.status === 'paused' ? (
                <div className="text-lg font-bold text-yellow-300 mb-2">
                  SESJA WSTRZYMANA
                </div>
              ) : (
                <div className="text-sm font-medium text-green-300 mb-2">
                  W trakcie
                </div>
              )}
              {nextGroup && (
                <div className="text-lg font-bold text-red-400">
                  Następna tura: {nextGroup}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <div className="icon-clock text-gray-400 mr-2"></div>
              Status sesji
            </h3>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400 mb-2">
                Brak aktywnej sesji
              </div>
              <div className="text-sm text-gray-500">
                Oczekiwanie na rozpoczęcie jazd
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <div className="icon-users text-green-400 mr-2"></div>
            Gotowi kierowcy ({readyDrivers.length})
          </h3>
          {readyDrivers.length > 0 ? (
            <div className="space-y-4">
              {['basic', 'medium', 'advanced'].map(level => {
                const driversInLevel = readyDrivers.filter(d => d.skill_level === level);
                if (driversInLevel.length === 0) return null;
                
                const levelName = level === 'basic' ? 'Podstawowa' : 
                                 level === 'medium' ? 'Średnia' : 'PRO';
                const isExpanded = expandedCategories[level];
                
                return (
                  <div key={level} className="border border-white/10 rounded-lg">
                    <button
                      onClick={() => setExpandedCategories(prev => ({
                        ...prev,
                        [level]: !prev[level]
                      }))}
                      className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                      <span className="text-white font-medium">
                        {levelName} ({driversInLevel.length})
                      </span>
                      <div className={`icon-chevron-down transition-transform ${isExpanded ? 'rotate-180' : ''}`}></div>
                    </button>
                    
                    {isExpanded && (
                      <div className="border-t border-white/10 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {driversInLevel.map(driver => (
                            <div key={driver.id} className="bg-white/5 rounded-lg p-3 flex items-center cursor-pointer hover:bg-white/10 transition-colors"
                                 onClick={() => setSelectedDriver(driver)}>
                              {driver.avatar_url ? (
                                <img 
                                  src={driver.avatar_url} 
                                  alt={driver.name}
                                  className="w-8 h-8 rounded-full object-cover mr-3"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-3">
                                  <span className="text-white text-sm font-bold">
                                    {driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="text-white font-medium">{driver.name}</div>
                                <div className="text-gray-400 text-sm">{levelName}</div>
                                {driver.instagram_username && (
                                  <div className="mt-1">
                                    <span className="text-gray-400 text-xs">Instagram: </span>
                                    <a 
                                      href={`https://instagram.com/${driver.instagram_username}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-pink-400 hover:text-pink-300 transition-colors text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {driver.instagram_username}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-4">
              Brak gotowych kierowców
            </div>
          )}
        </div>

        {selectedDriver && (
          <DriverProfile 
            driver={selectedDriver} 
            onClose={() => setSelectedDriver(null)} 
          />
        )}
        
      </div>
    );
  } catch (error) {
    console.error('Dashboard component error:', error);
    return null;
  }
}