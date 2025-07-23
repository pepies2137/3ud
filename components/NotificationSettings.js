function NotificationSettings({ user, onClose }) {
  const [settings, setSettings] = React.useState({
    voteReceived: false, // Domyślnie wyłączone
    voteHourlySummary: false, // Nowe ustawienie dla podsumowania co godzinę
    upcomingSession: true,
    broadcast: true, // Zawsze włączone - nie można wyłączyć
    newNotification: true,
    lastMinute: true,
    testNotifications: false
  });

  React.useEffect(() => {
    // Załaduj ustawienia z localStorage
    const savedSettings = localStorage.getItem(`notification_settings_${user.id}`);
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [user.id]);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(`notification_settings_${user.id}`, JSON.stringify(newSettings));
    
    // Zaktualizuj globalne ustawienia w pushManager
    if (window.pushManager) {
      window.pushManager.notificationSettings = newSettings;
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
         style={{ 
           paddingTop: 'max(1rem, env(safe-area-inset-top))',
           paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
         }} 
         onClick={onClose}>
      <div className="card w-full max-w-md my-auto" 
           style={{ 
             maxHeight: 'calc(100vh - 2rem)',
             overflowY: 'auto'
           }}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Ustawienia powiadomien</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <div className="icon-x text-xl"></div>
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Nowe glosy</h4>
              <p className="text-gray-400 text-sm">Powiadom gdy ktos zaglosuje na Twoje auto</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.voteReceived}
                onChange={(e) => updateSetting('voteReceived', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Podsumowanie glosow</h4>
              <p className="text-gray-400 text-sm">Podsumowanie ilosci glosow co godzine</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.voteHourlySummary}
                onChange={(e) => updateSetting('voteHourlySummary', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Nadchodzace sesje</h4>
              <p className="text-gray-400 text-sm">Powiadom o rozpoczeciu Twojej grupy</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.upcomingSession}
                onChange={(e) => updateSetting('upcomingSession', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Ogloszenia organizatora</h4>
              <p className="text-gray-400 text-sm">Wazne informacje od organizatorow (zawsze wlaczone)</p>
            </div>
            <div className="flex items-center">
              <span className="text-green-400 text-sm font-medium">ZAWSZE WŁĄCZONE</span>
              <div className="w-11 h-6 bg-green-500 rounded-full relative ml-3">
                <div className="absolute top-[2px] right-[2px] bg-white rounded-full h-5 w-5"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Nowe powiadomienia</h4>
              <p className="text-gray-400 text-sm">Powiadom o nowych wiadomosciach</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.newNotification}
                onChange={(e) => updateSetting('newNotification', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Ostatnia minuta sesji</h4>
              <p className="text-gray-400 text-sm">Powiadom gdy zostaje minuta do konca sesji</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.lastMinute}
                onChange={(e) => updateSetting('lastMinute', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>


          <div className="text-center">
            <p className="text-gray-400 text-xs">
              Ustawienia sa zapisywane lokalnie w przegladarce
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Make component globally available
window.NotificationSettings = NotificationSettings;