function KaczkaPanel({ user }) {
  try {
    const [activeTab, setActiveTab] = React.useState('broadcast');
    const [topDrift, setTopDrift] = React.useState([]);
    const [topTimeAttack, setTopTimeAttack] = React.useState([]);
    const [users, setUsers] = React.useState([]);
    const [applications, setApplications] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [csvFile, setCsvFile] = React.useState(null);
    const [importing, setImporting] = React.useState(false);
    const [importResult, setImportResult] = React.useState('');
    const [logoFile, setLogoFile] = React.useState(null);
    const [uploadingLogo, setUploadingLogo] = React.useState(false);
    const [swipeStates, setSwipeStates] = React.useState({});
    const [selectedApplication, setSelectedApplication] = React.useState(null);
    const [showBroadcast, setShowBroadcast] = React.useState(false);
    const [userStats, setUserStats] = React.useState({ total: 0, voted: 0 });
    const [editingUser, setEditingUser] = React.useState(null);
    const [currentDailyMode, setCurrentDailyMode] = React.useState('drift');
    const [faviconFile, setFaviconFile] = React.useState(null);
    const [uploadingFavicon, setUploadingFavicon] = React.useState(false);
    const [notificationHistory, setNotificationHistory] = React.useState([]);
    const [usersWithVotes, setUsersWithVotes] = React.useState([]);
    const [filteredUsers, setFilteredUsers] = React.useState([]);
    const [userSearchTerm, setUserSearchTerm] = React.useState('');
    const [userForm, setUserForm] = React.useState({
      name: '',
      email: '',
      role: 'user',
      vote_weight: 1
    });
    const [showUserEditModal, setShowUserEditModal] = React.useState(false);
    const [uploadingCsv, setUploadingCsv] = React.useState(false);

    React.useEffect(() => {
      fetchData();
    }, []);

    const handleEditUser = (user) => {
      setEditingUser(user);
      setUserForm({
        name: user.name,
        email: user.email,
        role: user.role,
        vote_weight: user.vote_weight || 1
      });
      setShowUserEditModal(true);
    };

    const handleSaveUser = async () => {
      if (!editingUser) return;
      
      try {
        await supabase.update('users', {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          vote_weight: parseInt(userForm.vote_weight)
        }, { id: editingUser.id });
        
        setShowUserEditModal(false);
        setEditingUser(null);
        setUserForm({ name: '', email: '', role: 'user', vote_weight: 1 });
        fetchData();
        alert('Użytkownik został zaktualizowany');
      } catch (error) {
        console.error('Update user error:', error);
        alert('Błąd podczas aktualizacji użytkownika');
      }
    };

    const handleCancelEdit = () => {
      setShowUserEditModal(false);
      setEditingUser(null);
      setUserForm({ name: '', email: '', role: 'user', vote_weight: 1 });
    };

    // Filter users based on search term
    React.useEffect(() => {
      if (!userSearchTerm.trim()) {
        setFilteredUsers(usersWithVotes);
      } else {
        const filtered = usersWithVotes.filter(user => 
          user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(userSearchTerm.toLowerCase())
        );
        setFilteredUsers(filtered);
      }
    }, [userSearchTerm, usersWithVotes]);

    const handleDeleteUser = async (userId) => {
      if (!confirm('Czy na pewno chcesz usunąć tego użytkownika? Ta akcja jest nieodwracalna.')) {
        return;
      }

      try {
        await supabase.delete('users', { id: userId });
        fetchData();
        alert('Użytkownik został usunięty');
      } catch (error) {
        console.error('Delete user error:', error);
        alert('Błąd podczas usuwania użytkownika');
      }
    };

    const handleApplicationAction = async (applicationId, action) => {
      try {
        const application = applications.find(app => app.id === applicationId);
        if (!application) return;

        // Update application status
        await supabase.update('driver_applications', {
          status: action
        }, { id: applicationId });

        if (action === 'approved') {
          // Update user role to driver and set skill level
          await supabase.update('users', {
            role: 'driver',
            skill_level: application.skill_level,
            is_ready: true
          }, { id: application.user_id });

          // Create car entry
          await supabase.insert('cars', {
            registration_number: application.registration_number,
            brand: application.brand,
            model: application.model,
            category: application.category,
            description: application.description,
            image_url: application.image_url,
            driver_id: application.user_id,
            votes_count: 0,
            total_points: 0
          });

          // Send approval notification
          await supabase.insert('notifications', {
            user_id: application.user_id,
            type: 'application_approved',
            message: `Twoje zgłoszenie ${application.brand} ${application.model} zostało zatwierdzone! Możesz teraz korzystać z panelu kierowcy.`,
            is_read: false
          });

          alert('Zgłoszenie zostało zatwierdzone. Kierowca otrzymał powiadomienie.');
        } else if (action === 'rejected') {
          // Send rejection notification
          await supabase.insert('notifications', {
            user_id: application.user_id,
            type: 'application_rejected',
            message: `Twoje zgłoszenie ${application.brand} ${application.model} zostało odrzucone.`,
            is_read: false
          });

          alert('Zgłoszenie zostało odrzucone. Kierowca otrzymał powiadomienie.');
        }

        // Refresh data
        fetchData();
      } catch (error) {
        console.error('Application action error:', error);
        alert('Błąd podczas przetwarzania zgłoszenia');
      }
    };

    const fetchData = async () => {
      try {
        const [driftCars, timeAttackCars, allUsers, driverApplications, votes, settings] = await Promise.all([
          supabase.query('cars', { select: '*', eq: { category: 'drift' }, order: 'votes_count.desc', limit: 10 }).catch(err => { console.error('Drift cars error:', err); return []; }),
          supabase.query('cars', { select: '*', eq: { category: 'time_attack' }, order: 'votes_count.desc', limit: 10 }).catch(err => { console.error('Time attack cars error:', err); return []; }),
          supabase.query('users', { select: '*' }).catch(err => { console.error('Users error:', err); return []; }),
          supabase.query('driver_applications', { select: '*', order: 'created_at.desc' }).catch(err => { console.error('Applications error:', err); return []; }),
          supabase.query('votes', { select: 'user_id' }).catch(err => { console.error('Votes error:', err); return []; }),
          supabase.getAppSettings().catch(err => { console.error('Settings error:', err); return {}; })
        ]);
        
        // Enrich applications with user names
        const applicationsWithUsers = await Promise.all(
          driverApplications.map(async (app) => {
            try {
              const users = await supabase.query('users', {
                select: 'name, email',
                eq: { id: app.user_id },
                limit: 1
              });
              return {
                ...app,
                userName: users.length > 0 ? users[0].name : 'Nieznany użytkownik',
                userEmail: users.length > 0 ? users[0].email : ''
              };
            } catch (error) {
              console.error('Error fetching user for application:', app.id, error);
              return {
                ...app,
                userName: 'Nieznany użytkownik',
                userEmail: ''
              };
            }
          })
        );
        
        // Get broadcast notifications separately with sender names
        let broadcastNotifications = [];
        try {
          const notifications = await supabase.query('notifications', { 
            select: '*', 
            eq: { type: 'broadcast' }, 
            order: 'created_at.desc',
            limit: 50
          });
          
          // Get sender names separately
          const notificationsWithSenders = await Promise.all(
            notifications.map(async (notification) => {
              if (notification.sender_id) {
                try {
                  const senders = await supabase.query('users', {
                    select: 'name',
                    eq: { id: notification.sender_id },
                    limit: 1
                  });
                  return {
                    ...notification,
                    senderName: senders.length > 0 ? senders[0].name : 'Nieznana kaczka'
                  };
                } catch (error) {
                  console.error('Error fetching sender for notification:', notification.id, error);
                  return {
                    ...notification,
                    senderName: 'Nieznana kaczka'
                  };
                }
              }
              return {
                ...notification,
                senderName: 'Nieznana kaczka'
              };
            })
          );
          
          broadcastNotifications = notificationsWithSenders;
        } catch (error) {
          console.error('Broadcast notifications error:', error);
        }
        
        setTopDrift(driftCars);
        setTopTimeAttack(timeAttackCars);
        setUsers(allUsers);
        setApplications(applicationsWithUsers);
        setCurrentDailyMode(settings.daily_mode || 'drift');
        setNotificationHistory(broadcastNotifications);
        
        // Get voting status for each user
        let usersWithVotingStatus = allUsers.map(user => ({
          ...user,
          hasVotedDrift: false,
          hasVotedTimeAttack: false
        }));
        
        try {
          usersWithVotingStatus = await Promise.all(
            allUsers.map(async (user) => {
              try {
                const [driftVotes, timeAttackVotes] = await Promise.all([
                  supabase.query('votes', {
                    select: 'id',
                    eq: { user_id: user.id, category: 'drift' },
                    limit: 1
                  }).catch(() => []),
                  supabase.query('votes', {
                    select: 'id',
                    eq: { user_id: user.id, category: 'time_attack' },
                    limit: 1
                  }).catch(() => [])
                ]);
                
                return {
                  ...user,
                  hasVotedDrift: driftVotes.length > 0,
                  hasVotedTimeAttack: timeAttackVotes.length > 0
                };
              } catch (error) {
                console.error('Error fetching votes for user:', user.id, error);
                return {
                  ...user,
                  hasVotedDrift: false,
                  hasVotedTimeAttack: false
                };
              }
            })
          );
        } catch (error) {
          console.error('Error loading voting status:', error);
        }
        
        setUsersWithVotes(usersWithVotingStatus);
        setFilteredUsers(usersWithVotingStatus);
        
        const uniqueVoters = [...new Set(votes.map(v => v.user_id))];
        setUserStats({
          total: allUsers.length,
          voted: uniqueVoters.length
        });
      } catch (error) {
        console.error('KaczkaPanel: Fetch data error:', error);
        alert('Błąd podczas ładowania danych kaczki. Sprawdź konsolę.');
      } finally {
        setLoading(false);
      }
    };

    const downloadSampleCsv = () => {
      const csvContent = `name,email,role,vote_weight,skill_level,is_ready,avatar_url
Jan Kowalski,jan.kowalski@example.com,user,1,,,
Anna Nowak,anna.nowak@example.com,driver,5,basic,true,
Piotr Wiśniewski,piotr.wisniewski@example.com,driver,5,medium,false,
Maria Kowalczyk,maria.kowalczyk@example.com,user,1,,,
Tomasz Zieliński,tomasz.zielinski@example.com,driver,5,advanced,true,
Katarzyna Woźniak,katarzyna.wozniak@example.com,flag_manager,1,,,
Michał Kamiński,michal.kaminski@example.com,kaczka,1,,,
Agnieszka Lewandowska,agnieszka.lewandowska@example.com,driver,5,basic,false,
Paweł Dąbrowski,pawel.dabrowski@example.com,user,1,,,
Magdalena Kozłowska,magdalena.kozlowska@example.com,driver,5,medium,true,`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'przyklad_uzytkownicy.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    };

    const handleFaviconUpload = async () => {
      if (!faviconFile) {
        alert('Wybierz plik favicon');
        return;
      }

      // Validate file type
      const validTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/jpeg', 'image/gif'];
      if (!validTypes.includes(faviconFile.type)) {
        alert('Nieprawidłowy format pliku. Wybierz plik .ico, .png, .jpg lub .gif');
        return;
      }

      // Validate file size (max 1MB)
      if (faviconFile.size > 1024 * 1024) {
        alert('Plik jest za duży. Maksymalny rozmiar to 1MB');
        return;
      }

      setUploadingFavicon(true);
      try {
        // Convert file to base64
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64Data = e.target.result;
            
            // Save favicon URL to database
            await supabase.updateAppSettings({ favicon_url: base64Data });
            
            // Update favicon in document
            updateFavicon(base64Data);
            
            alert('Favicon został zaktualizowany');
            setFaviconFile(null);
          } catch (error) {
            console.error('Error saving favicon:', error);
            alert('Błąd podczas zapisywania favicon');
          } finally {
            setUploadingFavicon(false);
          }
        };
        reader.readAsDataURL(faviconFile);
      } catch (error) {
        console.error('Error uploading favicon:', error);
        alert('Błąd podczas przesyłania favicon');
        setUploadingFavicon(false);
      }
    };

    const updateFavicon = (faviconUrl) => {
      // Update favicon in document head
      const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
      if (favicon) {
        favicon.href = faviconUrl;
      } else {
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.href = faviconUrl;
        document.head.appendChild(newFavicon);
      }

      // Update apple touch icons
      const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
      appleTouchIcons.forEach(icon => {
        icon.href = faviconUrl;
      });
    };

    const handleCsvUpload = async () => {
      if (!csvFile) {
        alert('Wybierz plik CSV');
        return;
      }

      if (!csvFile.name.toLowerCase().endsWith('.csv')) {
        alert('Nieprawidłowy format pliku. Wybierz plik .csv');
        return;
      }

      setUploadingCsv(true);
      try {
        const text = await csvFile.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Validate headers
        const requiredHeaders = ['name', 'email', 'role'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          alert(`Brakuje wymaganych kolumn: ${missingHeaders.join(', ')}`);
          return;
        }

        const users = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= 3) {
            const user = {
              name: values[headers.indexOf('name')],
              email: values[headers.indexOf('email')],
              role: values[headers.indexOf('role')] || 'user',
              vote_weight: parseInt(values[headers.indexOf('vote_weight')]) || 1,
              skill_level: values[headers.indexOf('skill_level')] || null,
              is_ready: values[headers.indexOf('is_ready')] === 'true' || false,
              avatar_url: values[headers.indexOf('avatar_url')] || null
            };
            users.push(user);
          }
        }

        if (users.length === 0) {
          alert('Nie znaleziono prawidłowych danych użytkowników w pliku CSV');
          return;
        }

        // Import users to database
        await supabase.insert('users', users);
        
        alert(`Pomyślnie zaimportowano ${users.length} użytkowników`);
        setCsvFile(null);
        fetchData();
      } catch (error) {
        console.error('CSV import error:', error);
        alert('Błąd podczas importu CSV: ' + error.message);
      } finally {
        setUploadingCsv(false);
      }
    };

    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="icon-loader-2 text-4xl animate-spin text-white"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6" data-name="kaczka-panel" data-file="components/KaczkaPanel.js">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Panel Administratora</h1>
          <p className="text-gray-300">Zarządzaj aplikacją i użytkownikami</p>
        </div>

        <div className="flex justify-center space-x-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm ${
              activeTab === 'broadcast' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            Powiadomienia
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm ${
              activeTab === 'applications' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            Zgłoszenia
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm ${
              activeTab === 'stats' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            Statystyki
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm ${
              activeTab === 'results' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            Wyniki
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm ${
              activeTab === 'users' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            Użytkownicy
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm ${
              activeTab === 'settings' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            Ustawienia
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm ${
              activeTab === 'history' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            Historia
          </button>
        </div>

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-3">Użytkownicy</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{userStats.total}</div>
                  <div className="text-gray-300 text-sm">Wszystkich użytkowników</div>
                </div>
              </div>
              
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-3">Głosujący</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{userStats.voted}</div>
                  <div className="text-gray-300 text-sm">Oddało głos</div>
                </div>
              </div>
              
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-3">Aktywność</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {userStats.total > 0 ? Math.round((userStats.voted / userStats.total) * 100) : 0}%
                  </div>
                  <div className="text-gray-300 text-sm">Frekwencja głosowania</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-4">Top Drift</h3>
                <div className="space-y-3">
                  {topDrift.map((car, index) => (
                    <div key={car.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-medium">{car.brand} {car.model}</div>
                          <div className="text-gray-400 text-sm">{car.registration_number}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold">{car.total_points || 0} pkt</div>
                        <div className="text-gray-400 text-sm">{car.votes_count || 0} głosów</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-4">Top Time Attack</h3>
                <div className="space-y-3">
                  {topTimeAttack.map((car, index) => (
                    <div key={car.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-medium">{car.brand} {car.model}</div>
                          <div className="text-gray-400 text-sm">{car.registration_number}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold">{car.total_points || 0} pkt</div>
                        <div className="text-gray-400 text-sm">{car.votes_count || 0} głosów</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Zgłoszenia kierowców</h2>
            <div className="space-y-4">
              {applications.length > 0 ? applications.map(app => (
                <div key={app.id} className="bg-white/5 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-colors"
                     onClick={() => setSelectedApplication(app)}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-medium">{app.brand} {app.model}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          app.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                          app.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {app.status === 'pending' ? 'Oczekuje' : 
                           app.status === 'approved' ? 'Zatwierdzone' : 'Odrzucone'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">{app.registration_number}</p>
                      <p className="text-gray-400 text-sm mb-1">
                        Kategoria: {app.category === 'drift' ? 'Drift' : 'Time Attack'} • 
                        Poziom: {app.skill_level === 'basic' ? 'Podstawowy' : 
                                 app.skill_level === 'medium' ? 'Średni' : 'Zaawansowany'}
                      </p>
                      {app.description && (
                        <p className="text-gray-300 text-sm mt-2 line-clamp-3">
                          {app.description.length > 150 ? 
                            app.description.substring(0, 150) + '...' : 
                            app.description}
                        </p>
                      )}
                      <div className="text-gray-500 text-xs mt-2">
                        Zgłoszono: {new Date(app.created_at).toLocaleString('pl-PL')}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      {app.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApplicationAction(app.id, 'approved')}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Zatwierdź
                          </button>
                          <button 
                            onClick={() => handleApplicationAction(app.id, 'rejected')}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Odrzuć
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-gray-400 text-center py-8">Brak zgłoszeń</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Zarządzanie użytkownikami</h2>
            
            {/* Search bar */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="icon-search text-gray-400"></div>
                </div>
                <input
                  type="text"
                  placeholder="Szukaj użytkowników (imię, email, rola)..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Znaleziono: {filteredUsers.length} z {usersWithVotes.length} użytkowników
              </div>
            </div>
            
            <div className="space-y-3">
              {filteredUsers.map(userItem => (
                <div key={userItem.id} className="bg-white/5 rounded-lg p-4">
                  {/* Mobile-first layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* User info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-white font-medium">{userItem.name}</div>
                        <div className="flex gap-1">
                          <div 
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              userItem.hasVotedDrift ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-400'
                            }`}
                            title={userItem.hasVotedDrift ? 'Zagłosował na Drift' : 'Nie zagłosował na Drift'}
                          >
                            D
                          </div>
                          <div 
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              userItem.hasVotedTimeAttack ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-400'
                            }`}
                            title={userItem.hasVotedTimeAttack ? 'Zagłosował na Time Attack' : 'Nie zagłosował na Time Attack'}
                          >
                            T
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-400 text-sm mb-2 sm:mb-0">{userItem.email}</div>
                      
                      {/* Role and weight on mobile */}
                      <div className="flex items-center gap-2 sm:hidden">
                        <span className={`px-2 py-1 rounded text-xs ${
                          userItem.role === 'kaczka' ? 'bg-purple-500/20 text-purple-300' :
                          userItem.role === 'driver' ? 'bg-blue-500/20 text-blue-300' :
                          userItem.role === 'flag_manager' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {userItem.role}
                        </span>
                        <span className="text-gray-400 text-sm">Waga: {userItem.vote_weight}</span>
                      </div>
                    </div>
                    
                    {/* Desktop info and actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {/* Role and weight on desktop */}
                      <div className="hidden sm:flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          userItem.role === 'kaczka' ? 'bg-purple-500/20 text-purple-300' :
                          userItem.role === 'driver' ? 'bg-blue-500/20 text-blue-300' :
                          userItem.role === 'flag_manager' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {userItem.role}
                        </span>
                        <span className="text-gray-400 text-sm">Waga: {userItem.vote_weight}</span>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(userItem)}
                          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-3 rounded-lg transition-colors min-w-[52px] min-h-[52px] flex items-center justify-center touch-manipulation"
                          title="Edytuj użytkownika"
                        >
                          <div className="icon-edit text-xl"></div>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userItem.id)}
                          className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white p-3 rounded-lg transition-colors min-w-[52px] min-h-[52px] flex items-center justify-center touch-manipulation"
                          title="Usuń użytkownika"
                        >
                          <div className="icon-trash-2 text-xl"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Ustawienia aplikacji</h2>
              <div className="space-y-6">
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                  <h3 className="text-yellow-200 font-bold mb-3 text-lg flex items-center">
                    <div className="icon-calendar mr-2"></div>
                    Tryb dnia (WAŻNE!)
                  </h3>
                  <p className="text-yellow-100 text-sm mb-4">
                    Wybierz jaki typ zawodów odbywa się dzisiaj. To ustawienie wpływa na to, które samochody są wyświetlane w głosowaniu.
                  </p>
                  <select
                    value={currentDailyMode}
                    onChange={async (e) => {
                      try {
                        // Save to database
                        await supabase.updateAppSettings({ daily_mode: e.target.value });
                        
                        // Update local state for immediate feedback
                        setCurrentDailyMode(e.target.value);
                        
                        alert(`Tryb dnia został zmieniony na: ${e.target.value === 'drift' ? 'DRIFT' : 'TIME ATTACK'}`);
                      } catch (error) {
                        console.error('Error updating daily mode:', error);
                        alert('Błąd podczas zmiany trybu dnia');
                      }
                    }}
                    className="w-full px-4 py-3 bg-yellow-600/20 border border-yellow-500/50 rounded-lg text-white text-lg font-bold"
                  >
                    <option value="drift">🏁 DRIFT - Dzień Drift</option>
                    <option value="time_attack">⚡ TIME ATTACK - Dzień Time Attack</option>
                  </select>
                  <div className="mt-2 text-yellow-200 text-sm">
                    Aktualny tryb: <strong>{currentDailyMode === 'time_attack' ? 'TIME ATTACK' : 'DRIFT'}</strong>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Logo aplikacji
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files[0])}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white"
                  />
                  <button 
                    disabled={!logoFile || uploadingLogo}
                    className="mt-2 btn-primary disabled:opacity-50"
                  >
                    {uploadingLogo ? 'Przesyłanie...' : 'Zmień logo'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Favicon / Ikona aplikacji
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Ikona wyświetlana w zakładce przeglądarki i jako ikona PWA. Zalecane formaty: .ico, .png (32x32 lub 64x64 px)
                  </p>
                  <input
                    type="file"
                    accept=".ico,.png,.jpg,.jpeg,.gif"
                    onChange={(e) => setFaviconFile(e.target.files[0])}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white"
                  />
                  <button 
                    onClick={handleFaviconUpload}
                    disabled={!faviconFile || uploadingFavicon}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {uploadingFavicon ? 'Przesyłanie...' : 'Zmień favicon'}
                  </button>
                  {faviconFile && (
                    <div className="mt-2 text-sm text-gray-300">
                      Wybrany plik: {faviconFile.name} ({Math.round(faviconFile.size / 1024)}KB)
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Import użytkowników z CSV
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Importuj wielu użytkowników jednocześnie z pliku CSV. Wymagane kolumny: name, email, role
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-600 file:text-white mb-2"
                  />
                  <div className="flex gap-2 mb-2">
                    <button 
                      onClick={handleCsvUpload}
                      disabled={!csvFile || uploadingCsv}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      {uploadingCsv ? 'Importowanie...' : 'Importuj CSV'}
                    </button>
                    <button 
                      onClick={downloadSampleCsv}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Pobierz przykład CSV
                    </button>
                  </div>
                  {csvFile && (
                    <div className="text-sm text-gray-300">
                      Wybrany plik: {csvFile.name} ({Math.round(csvFile.size / 1024)}KB)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Historia powiadomień</h2>
            
            <div className="space-y-3">
              {notificationHistory.length > 0 ? (
                notificationHistory.map(notification => (
                  <div key={notification.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div className="icon-send text-blue-400 mr-2"></div>
                        <span className="text-white font-medium">
                          {notification.senderName || 'Nieznana kaczka'}
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {new Date(notification.created_at).toLocaleString('pl-PL')}
                      </span>
                    </div>
                    <div className="bg-white/5 rounded p-3 mb-2">
                      <p className="text-gray-300">
                        {notification.message.includes('~') 
                          ? notification.message.split('~')[0].trim()
                          : notification.message
                        }
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      Wysłano do wszystkich użytkowników • ID: {notification.id}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="icon-inbox text-4xl mb-2"></div>
                  <p>Brak wysłanych powiadomień</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'broadcast' && (
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Powiadomienia push</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                <h3 className="text-blue-200 font-medium mb-2">Wyślij powiadomienie wszystkim</h3>
                <p className="text-blue-100 text-sm mb-3">
                  Powiadomienie zostanie wysłane do wszystkich zarejestrowanych użytkowników
                </p>
                <button 
                  onClick={() => setShowBroadcast(true)}
                  className="btn-primary"
                >
                  <div className="icon-send inline mr-2"></div>
                  Napisz powiadomienie
                </button>
              </div>
            </div>
          </div>
        )}

        {showBroadcast && (
          <BroadcastNotifications 
            onClose={() => setShowBroadcast(false)} 
            senderName={user.name.split(' ')[0]}
            senderId={user.id}
            onNotificationSent={fetchData}
          />
        )}

        {showUserEditModal && editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[9999] p-4 overflow-y-auto"
               style={{ 
                 paddingTop: 'max(1rem, env(safe-area-inset-top))',
                 paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
               }}>
            <div className="card w-full max-w-md my-auto"
                 style={{ 
                   maxHeight: 'calc(100vh - 2rem)',
                   overflowY: 'auto'
                 }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Edytuj użytkownika</h3>
                <button onClick={handleCancelEdit} className="text-gray-400 hover:text-white">
                  <div className="icon-x text-xl"></div>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Imię i nazwisko</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rola</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="user">Użytkownik</option>
                    <option value="driver">Kierowca</option>
                    <option value="flag_manager">Kierownik Flag</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Waga głosu</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={userForm.vote_weight}
                    onChange={(e) => setUserForm({...userForm, vote_weight: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button onClick={handleSaveUser} className="btn-primary flex-1">
                    Zapisz zmiany
                  </button>
                  <button onClick={() => setEditingUser(null)} className="btn-secondary flex-1">
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedApplication && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[9999] p-4 overflow-y-auto"
               style={{ 
                 paddingTop: 'max(1rem, env(safe-area-inset-top))',
                 paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
               }}>
            <div className="card w-full max-w-2xl my-auto"
                 style={{ 
                   maxHeight: 'calc(100vh - 2rem)',
                   overflowY: 'auto'
                 }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Szczegóły zgłoszenia</h3>
                <button onClick={() => setSelectedApplication(null)} className="text-gray-400 hover:text-white">
                  <div className="icon-x text-xl"></div>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Car Image */}
                {selectedApplication.image_url && (
                  <div className="w-full">
                    <img 
                      src={selectedApplication.image_url} 
                      alt={`${selectedApplication.brand} ${selectedApplication.model}`}
                      className="w-full aspect-video object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* User Info */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-blue-200 font-medium mb-2">Informacje o zgłaszającym</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Imię i nazwisko</label>
                      <p className="text-white">{selectedApplication.userName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                      <p className="text-white">{selectedApplication.userEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Car Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Marka i model</label>
                      <p className="text-white text-lg font-semibold">{selectedApplication.brand} {selectedApplication.model}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Numer rejestracyjny</label>
                      <p className="text-white">{selectedApplication.registration_number}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Kategoria</label>
                      <p className="text-white">{selectedApplication.category === 'drift' ? 'Drift' : 'Time Attack'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Poziom umiejętności</label>
                      <p className="text-white">
                        {selectedApplication.skill_level === 'basic' ? 'Podstawowy' : 
                         selectedApplication.skill_level === 'medium' ? 'Średni' : 'Zaawansowany'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                      <span className={`inline-block px-3 py-1 rounded text-sm ${
                        selectedApplication.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                        selectedApplication.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {selectedApplication.status === 'pending' ? 'Oczekuje na decyzję' : 
                         selectedApplication.status === 'approved' ? 'Zatwierdzone' : 'Odrzucone'}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Data zgłoszenia</label>
                      <p className="text-white">{new Date(selectedApplication.created_at).toLocaleString('pl-PL')}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedApplication.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Opis pojazdu</label>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap">{selectedApplication.description}</p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {selectedApplication.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-white/10">
                    <button 
                      onClick={() => {
                        handleApplicationAction(selectedApplication.id, 'approved');
                        setSelectedApplication(null);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex-1"
                    >
                      <div className="icon-check inline mr-2"></div>
                      Zatwierdź zgłoszenie
                    </button>
                    <button 
                      onClick={() => {
                        handleApplicationAction(selectedApplication.id, 'rejected');
                        setSelectedApplication(null);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex-1"
                    >
                      <div className="icon-x inline mr-2"></div>
                      Odrzuć zgłoszenie
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('KaczkaPanel component error:', error);
    return null;
  }
}