function DriverProfile({ driver, onClose }) {
  try {
    const [car, setCar] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [driverData, setDriverData] = React.useState(driver);

    React.useEffect(() => {
      fetchDriverData();
    }, [driver.id]);

    const fetchDriverData = async () => {
      try {
        // Fetch complete driver data including avatar
        const users = await supabase.query('users', {
          select: 'id, name, email, skill_level, avatar_url, instagram_username',
          eq: { id: driver.id },
          limit: 1
        });
        
        if (users.length > 0) {
          setDriverData(users[0]);
        }

        const cars = await supabase.query('cars', {
          select: '*',
          eq: { driver_id: driver.id },
          limit: 1
        });
        setCar(cars[0] || null);
      } catch (error) {
        console.error('Fetch driver data error:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" 
           onClick={onClose}
           style={{ 
             paddingTop: 'max(1rem, env(safe-area-inset-top))',
             paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
           }}
           data-name="driver-profile" data-file="components/DriverProfile.js">
        <div className="card w-full max-w-lg my-auto" 
             style={{ 
               maxHeight: 'calc(100vh - 2rem)',
               overflowY: 'auto'
             }}
             onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Profil Kierowcy</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <div className="icon-x text-xl"></div>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="text-center">
              {driverData.avatar_url ? (
                <img 
                  src={driverData.avatar_url} 
                  alt={driverData.name}
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-2"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-2">
                  <span className="text-white text-xl font-bold">
                    {driverData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              )}
              <h4 className="text-white font-bold text-lg">{driverData.name}</h4>
              <p className="text-gray-400 text-sm">
                Poziom: {driverData.skill_level === 'basic' ? 'Podstawowa' : 
                         driverData.skill_level === 'medium' ? 'Średnia' : 
                         driverData.skill_level === 'advanced' ? 'PRO' : 'Nie określono'}
              </p>
              {driverData.instagram_username ? (
                <div className="mt-2">
                  <span className="text-gray-400">Instagram: </span>
                  <a 
                    href={`https://instagram.com/${driverData.instagram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    {driverData.instagram_username}
                  </a>
                </div>
              ) : (
                <div className="mt-2">
                  <span className="text-gray-400 text-sm">Instagram: brak</span>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="icon-loader-2 text-xl animate-spin text-white"></div>
              </div>
            ) : car ? (
              <div className="bg-white/5 rounded-lg p-4">
                <h5 className="text-white font-medium mb-3">Auto kierowcy</h5>
                {car.image_url && (
                  <img 
                    src={car.image_url} 
                    alt={`${car.brand} ${car.model}`}
                    className="w-full aspect-video object-cover rounded-lg mb-3"
                  />
                )}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Marka:</span>
                    <span className="text-white">{car.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model:</span>
                    <span className="text-white">{car.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rejestracja:</span>
                    <span className="text-white">{car.registration_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Kategoria:</span>
                    <span className="text-white">
                      {car.category === 'drift' ? 'Drift' : 'Time Attack'}
                    </span>
                  </div>
                  {car.description && (
                    <div className="mt-3">
                      <span className="text-gray-400 block mb-1">Opis:</span>
                      <div className="max-h-24 overflow-y-auto bg-white/5 rounded p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                        <p className="text-white text-sm whitespace-pre-wrap">{car.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                <div className="icon-car text-4xl mb-2"></div>
                <p>Kierowca nie zgłosił jeszcze auta</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('DriverProfile component error:', error);
    return null;
  }
}