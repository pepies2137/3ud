function SessionStatistics() {
  try {
    const [sessions, setSessions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      fetchSessionStats();
      
      // Listen for session updates from FlagManager
      const handleSessionUpdate = () => {
        fetchSessionStats();
      };
      
      window.addEventListener('sessionUpdated', handleSessionUpdate);
      
      return () => {
        window.removeEventListener('sessionUpdated', handleSessionUpdate);
      };
    }, []);

    const fetchSessionStats = async () => {
      try {
        const allSessions = await supabase.query('sessions', {
          select: '*',
          order: 'created_at.desc',
          limit: 10
        });
        setSessions(allSessions);
      } catch (error) {
        console.error('Fetch session stats error:', error);
      } finally {
        setLoading(false);
      }
    };

    const formatDuration = (start, end) => {
      if (!start || !end) return 'N/A';
      const duration = new Date(end) - new Date(start);
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatPauseDuration = (session) => {
      // Use total_pause_duration if available, otherwise calculate from pause_start/pause_end
      let duration = 0;
      
      if (session.total_pause_duration && session.total_pause_duration > 0) {
        duration = parseInt(session.total_pause_duration);
      } else if (session.pause_start && session.pause_end) {
        duration = new Date(session.pause_end) - new Date(session.pause_start);
      } else {
        return null; // No pause data available
      }
      
      if (duration <= 0) return null;
      
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatTime = (timestamp) => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleTimeString('pl-PL');
    };

    if (loading) {
      return (
        <div className="text-center py-4" data-name="session-stats-loading" data-file="components/SessionStatistics.js">
          <div className="icon-loader-2 text-xl animate-spin text-white"></div>
        </div>
      );
    }

    return (
      <div className="space-y-3" data-name="session-statistics" data-file="components/SessionStatistics.js">
        {sessions.length > 0 ? (
          sessions.map(session => (
            <div key={session.id} className="bg-white/5 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-medium">
                    {session.group_name === 'basic' ? 'Podstawowa' : 
                     session.group_name === 'medium' ? 'Średnia' : 'PRO'}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Start: {formatTime(session.start_time)}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Koniec: {formatTime(session.end_time)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded text-xs ${
                    session.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                    session.status === 'running' ? 'bg-blue-500/20 text-blue-300' :
                    session.status === 'paused' ? 'bg-orange-500/20 text-orange-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {session.status}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Czas: {formatDuration(session.start_time, session.end_time)}
                  </div>
                  {formatPauseDuration(session) && (
                    <div className="text-orange-400 text-xs">
                      Wstrzymanie: {formatPauseDuration(session)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-400 text-center py-4">Brak danych o sesjach</div>
        )}
      </div>
    );
  } catch (error) {
    console.error('SessionStatistics component error:', error);
    return null;
  }
}