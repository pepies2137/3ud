function FlagManager({ user }) {
  try {
    const [currentSession, setCurrentSession] = React.useState(null);
    const [drivers, setDrivers] = React.useState([]);
    const [selectedDriver, setSelectedDriver] = React.useState('');
    const [warningReason, setWarningReason] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [warningsHistory, setWarningsHistory] = React.useState([]);
    const [showWarningsHistory, setShowWarningsHistory] = React.useState(false);
    const [sessionDuration, setSessionDuration] = React.useState(15);
    const [showDurationSelector, setShowDurationSelector] = React.useState(false);

    React.useEffect(() => {
      fetchData();
    }, []);

    const fetchData = async () => {
      try {
        // Check for running sessions first
        const runningSessions = await supabase.query('sessions', { 
          select: '*', 
          eq: { status: 'running' }, 
          order: 'created_at.desc',
          limit: 1 
        });
        
        // Then check for paused sessions
        const pausedSessions = await supabase.query('sessions', { 
          select: '*', 
          eq: { status: 'paused' }, 
          order: 'created_at.desc',
          limit: 1 
        });
        
        const allDrivers = await supabase.query('users', { 
          select: 'id,name', 
          eq: { role: 'driver' } 
        });
        
        // Get cars for each driver
        const driversWithCars = await Promise.all(
          allDrivers.map(async (driver) => {
            try {
              const cars = await supabase.query('cars', {
                select: 'brand,model,registration_number',
                eq: { driver_id: driver.id },
                limit: 1
              });
              return { ...driver, cars: cars };
            } catch (error) {
              console.error('Error fetching cars for driver:', driver.id, error);
              return { ...driver, cars: [] };
            }
          })
        );

        // Fetch warnings history
        const warnings = await supabase.query('warnings', {
          select: '*, users!warnings_driver_id_fkey(name)',
          order: 'timestamp.desc',
          limit: 50
        });
        
        if (runningSessions.length > 0) {
          setCurrentSession(runningSessions[0]);
        } else if (pausedSessions.length > 0) {
          setCurrentSession(pausedSessions[0]);
        } else {
          setCurrentSession(null);
        }
        
        setDrivers(driversWithCars);
        setWarningsHistory(warnings);
      } catch (error) {
        console.error('Fetch flag manager data error:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleStartSession = async (group) => {
      try {
        const newSession = {
          group_name: group,
          start_time: new Date().toISOString(),
          status: 'running',
          duration_minutes: sessionDuration,
          total_pause_duration: 0 // Reset pause duration for new session
        };
        
        await supabase.insert('sessions', newSession);
        
        // Notify drivers about upcoming session
        await notifyUpcomingSession(group);
        
        // Trigger session update event
        window.dispatchEvent(new CustomEvent('sessionUpdated'));
        
        alert(`Tura ${group} została uruchomiona (${sessionDuration} minut)`);
        setShowDurationSelector(false);
        fetchData();
      } catch (error) {
        console.error('Start session error:', error);
        alert('Błąd podczas uruchamiania tury');
      }
    };

    const notifyUpcomingSession = async (currentGroup) => {
      try {
        const nextGroupMap = {
          basic: 'medium',
          medium: 'advanced', 
          advanced: 'basic'
        };
        
        const nextGroup = nextGroupMap[currentGroup];
        
        // Get drivers from the next group
        const nextGroupDrivers = await supabase.query('users', {
          select: 'id,name',
          eq: { role: 'driver', skill_level: nextGroup }
        });
        
        // Send notifications
        const notifications = nextGroupDrivers.map(driver => ({
          user_id: driver.id,
          type: 'upcoming_session',
          message: `Twoja tura już niedługo! Następna sesja to ${nextGroup === 'basic' ? 'Podstawowa' : nextGroup === 'medium' ? 'Średnia' : 'PRO'}. Przygotuj się!`,
          is_read: false
        }));
        
        if (notifications.length > 0) {
          await supabase.insert('notifications', notifications);
        }
      } catch (error) {
        console.error('Notify upcoming session error:', error);
      }
    };

    const handlePauseSession = async () => {
      if (!currentSession) return;
      
      try {
        await supabase.update('sessions', 
          { status: 'paused', pause_start: new Date().toISOString() }, 
          { id: currentSession.id }
        );
        
        // Trigger session update event
        window.dispatchEvent(new CustomEvent('sessionUpdated'));
        
        alert('Tura została wstrzymana');
        fetchData();
      } catch (error) {
        console.error('Pause session error:', error);
        alert('Błąd podczas wstrzymywania tury');
      }
    };

    const handleEndSession = async () => {
      if (!currentSession) return;
      
      try {
        await supabase.update('sessions', 
          { status: 'completed', end_time: new Date().toISOString() }, 
          { id: currentSession.id }
        );
        
        // Trigger session update event
        window.dispatchEvent(new CustomEvent('sessionUpdated'));
        
        alert('Tura została zakończona');
        fetchData();
      } catch (error) {
        console.error('End session error:', error);
        alert('Błąd podczas kończenia tury');
      }
    };

    const handleIssueWarning = async () => {
      if (!selectedDriver || !warningReason) {
        alert('Wybierz kierowcę i podaj powód ostrzeżenia');
        return;
      }
      
      // Sprawdź czy ostrzeżenie nie składa się tylko z białych znaków i ma minimum 5 znaków
      const trimmedReason = warningReason.trim();
      if (trimmedReason.length < 5) {
        alert('Ostrzeżenie musi mieć minimum 5 znaków i nie może składać się tylko z białych znaków');
        return;
      }
      
      try {
        const warning = {
          driver_id: selectedDriver,
          reason: trimmedReason,
          timestamp: new Date().toISOString(),
          is_read: false
        };
        
        await supabase.insert('warnings', warning);
        
        // Send notification to driver
        const notification = {
          user_id: selectedDriver,
          type: 'warning',
          message: `Otrzymałeś ostrzeżenie: ${trimmedReason}`,
          is_read: false
        };
        
        await supabase.insert('notifications', notification);
        
        // Trigger immediate notification update with warning type for auto-switch
        window.dispatchEvent(new CustomEvent('newNotification', { 
          detail: { type: 'warning' } 
        }));
        
        setSelectedDriver('');
        setWarningReason('');
        alert('Ostrzeżenie zostało wystawione i wysłane do kierowcy');
        fetchData(); // Refresh warnings history
      } catch (error) {
        console.error('Issue warning error:', error);
        alert('Błąd podczas wystawiania ostrzeżenia');
      }
    };

    if (loading) {
      return (
        <div className="flex justify-center items-center py-12" data-name="flag-manager-loading" data-file="components/FlagManager.js">
          <div className="icon-loader-2 text-4xl animate-spin text-white"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6" data-name="flag-manager" data-file="components/FlagManager.js">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Kierownik Flagowych</h1>
          <p className="text-gray-300">Zarządzaj turami i wystawiaj ostrzeżenia</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Kontrola tur</h2>
          
          {currentSession ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg text-white mb-2">
                  Aktywna tura: <span className="text-red-400">{currentSession.group_name}</span>
                </div>
                <div className="text-sm text-gray-300">
                  Status: {currentSession.status}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {currentSession.status === 'running' && (
                  <button onClick={handlePauseSession} className="btn-secondary">
                    <div className="icon-pause inline mr-2"></div>
                    Wstrzymaj
                  </button>
                )}
                {currentSession.status === 'paused' && (
                  <button 
                    onClick={async () => {
                      try {
                        const pauseEnd = new Date();
                        const pauseStart = new Date(currentSession.pause_start);
                        const currentPauseDuration = pauseEnd - pauseStart;
                        
                        // Add current pause duration to total (only if pause_start exists)
                        // Ensure total_pause_duration is treated as number, not string
                        const existingPauseDuration = parseInt(currentSession.total_pause_duration || 0);
                        const totalPauseDuration = existingPauseDuration + currentPauseDuration;
                        
                        
                        await supabase.update('sessions', { 
                          status: 'running', 
                          pause_end: pauseEnd.toISOString(),
                          pause_start: null, // Clear pause_start
                          total_pause_duration: totalPauseDuration
                        }, { id: currentSession.id });
                        
                        // Trigger session update event
                        window.dispatchEvent(new CustomEvent('sessionUpdated'));
                        
                        alert('Tura została wznowiona');
                        fetchData();
                      } catch (error) {
                        console.error('Resume session error:', error);
                        alert('Błąd podczas wznawiania tury');
                      }
                    }}
                    className="btn-primary"
                  >
                    <div className="icon-play inline mr-2"></div>
                    Wznów
                  </button>
                )}
                <button onClick={handleEndSession} className="btn-primary">
                  <div className="icon-stop-circle inline mr-2"></div>
                  Zakończ turę
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center text-gray-300 mb-4">Brak aktywnej tury</div>
              
              {!showDurationSelector ? (
                <div className="text-center mb-4">
                  <button
                    onClick={() => setShowDurationSelector(true)}
                    className="btn-secondary text-sm"
                  >
                    <div className="icon-clock inline mr-2"></div>
                    Czas trwania: {sessionDuration} minut
                  </button>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 mb-4">
                  <h4 className="text-white font-medium mb-3">Wybierz czas trwania sesji</h4>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {[10, 15, 20, 25, 30].map(duration => (
                      <button
                        key={duration}
                        onClick={() => setSessionDuration(duration)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          sessionDuration === duration 
                            ? 'bg-red-600 text-white' 
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {duration}min
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowDurationSelector(false)}
                    className="btn-secondary text-sm w-full"
                  >
                    Zatwierdź
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                  onClick={() => handleStartSession('basic')}
                  className="btn-primary text-sm py-2"
                >
                  <div className="icon-play inline mr-1"></div>
                  Podstawowa
                </button>
                <button 
                  onClick={() => handleStartSession('medium')}
                  className="btn-primary text-sm py-2"
                >
                  <div className="icon-play inline mr-1"></div>
                  Średnia
                </button>
                <button 
                  onClick={() => handleStartSession('advanced')}
                  className="btn-primary text-sm py-2"
                >
                  <div className="icon-play inline mr-1"></div>
                  PRO
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Wystawianie ostrzeżeń</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wybierz kierowcę
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value="">Wybierz kierowcę</option>
                {drivers
                  .sort((a, b) => {
                    const aReg = a.cars?.[0]?.registration_number || '';
                    const bReg = b.cars?.[0]?.registration_number || '';
                    return aReg.localeCompare(bReg);
                  })
                  .map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.cars?.[0]?.registration_number || 'Brak auta'} - {driver.name} ({driver.cars?.[0]?.brand} {driver.cars?.[0]?.model})
                    </option>
                  ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Powód ostrzeżenia
              </label>
              <input
                type="text"
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                placeholder="Wpisz powód ostrzeżenia"
              />
            </div>
            
            <button
              onClick={handleIssueWarning}
              disabled={!selectedDriver || !warningReason}
              className="btn-primary disabled:opacity-50"
            >
              <div className="icon-alert-triangle inline mr-2"></div>
              Wystaw ostrzeżenie
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Statystyki sesji</h2>
            <div className="max-h-60 overflow-y-auto">
              <SessionStatistics />
            </div>
          </div>
          
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Historia ostrzeżeń</h2>
              <button
                onClick={() => setShowWarningsHistory(!showWarningsHistory)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {showWarningsHistory ? 'Ukryj' : 'Pokaż wszystkie'}
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {warningsHistory.slice(0, showWarningsHistory ? warningsHistory.length : 5).map(warning => (
                <div key={warning.id} className="bg-white/5 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-white font-medium">
                      {warning.users?.name || 'Nieznany kierowca'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(warning.timestamp).toLocaleString('pl-PL')}
                    </span>
                  </div>
                  <p className="text-gray-300">{warning.reason}</p>
                </div>
              ))}
              
              {warningsHistory.length === 0 && (
                <div className="text-gray-400 text-center py-4">
                  Brak ostrzeżeń
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('FlagManager component error:', error);
    return null;
  }
}