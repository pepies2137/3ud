function BroadcastNotifications({ onClose, senderName, senderId, onNotificationSent }) {
  try {
    const [message, setMessage] = React.useState('');
    const [sending, setSending] = React.useState(false);

    const handleSend = async () => {
      if (!message.trim()) {
        alert('Wpisz treść powiadomienia');
        return;
      }

      setSending(true);
      try {
        // Get all users
        const users = await supabase.query('users', {
          select: 'id,name'
        });

        // Send notification to all users
        const notifications = users.map(user => ({
          user_id: user.id,
          type: 'broadcast',
          message: `${message.trim()} ~ ${senderName}`,
          sender_id: senderId,
          is_read: false
        }));

        await supabase.insert('notifications', notifications);
        
        // Send immediate push notification via Firebase or fallback
        if (window.firebaseNotificationManager && window.firebaseNotificationManager.isReady()) {
          await window.firebaseNotificationManager.sendBroadcastNotification(
            'Informacja organizatora',
            message.trim(),
            { type: 'broadcast', sender: senderName }
          );
        } else if (typeof pushManager !== 'undefined') {
          await pushManager.notifyBroadcast(message.trim());
        }
        
        // Trigger immediate notification update for all users with broadcast type
        window.dispatchEvent(new CustomEvent('newNotification', { 
          detail: { type: 'broadcast' } 
        }));
        
        alert(`Powiadomienie wysłane do ${users.length} użytkowników`);
        setMessage('');
        
        // Refresh notification history in parent component
        if (onNotificationSent) {
          onNotificationSent();
        }
        
        onClose();
      } catch (error) {
        console.error('Send broadcast error:', error);
        alert('Błąd podczas wysyłania powiadomienia');
      } finally {
        setSending(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
           style={{ 
             paddingTop: 'max(1rem, env(safe-area-inset-top))',
             paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
           }}
           data-name="broadcast-notifications" data-file="components/BroadcastNotifications.js">
        <div className="card w-full max-w-md my-auto"
             style={{ 
               maxHeight: 'calc(100vh - 2rem)',
               overflowY: 'auto'
             }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Wyślij powiadomienie</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <div className="icon-x text-xl"></div>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Treść powiadomienia
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Np. Impreza zaczyna się o 21:00..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 h-24 resize-none"
                maxLength={200}
              />
              <div className="text-xs text-gray-400 mt-1">
                {message.length}/200 znaków
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {sending ? (
                  <span className="flex items-center justify-center">
                    <div className="icon-loader-2 animate-spin mr-2"></div>
                    Wysyłanie...
                  </span>
                ) : (
                  <>
                    <div className="icon-send inline mr-2"></div>
                    Wyślij wszystkim
                  </>
                )}
              </button>
              <button onClick={onClose} className="btn-secondary flex-1">
                Anuluj
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('BroadcastNotifications component error:', error);
    return null;
  }
}