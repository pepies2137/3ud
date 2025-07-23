function DriverPanel({ user }) {
  try {
    const [car, setCar] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [editingCar, setEditingCar] = React.useState(false);
    const [isReady, setIsReady] = React.useState(user.is_ready);
    const [carForm, setCarForm] = React.useState({
      registration_number: '',
      brand: '',
      model: '',
      category: 'drift',
      description: '',
      image_url: ''
    });
    const [imageFile, setImageFile] = React.useState(null);
    const [uploading, setUploading] = React.useState(false);
    const [showImageUpload, setShowImageUpload] = React.useState(false);
    const [totalPoints, setTotalPoints] = React.useState(0);
    const [instagramUsername, setInstagramUsername] = React.useState(user.instagram_username || '');
    const [editingProfile, setEditingProfile] = React.useState(false);

    React.useEffect(() => {
      fetchData();
      
      // Synchronizuj status gotowości z aktualnym użytkownikiem
      setIsReady(user.is_ready || false);
    }, [user.is_ready]);

    const fetchData = async () => {
      try {
        const cars = await secureOps.getMyCars();
        
        if (cars[0]) {
          setCar(cars[0]);
          setTotalPoints(cars[0].total_points || 0);
          setCarForm({
            registration_number: cars[0].registration_number || '',
            brand: cars[0].brand || '',
            model: cars[0].model || '',
            category: cars[0].category || 'drift',
            description: cars[0].description || '',
            image_url: cars[0].image_url || ''
          });
          setShowImageUpload(!cars[0].image_url);
        } else {
          setShowImageUpload(true);
        }
      } catch (error) {
        console.error('Fetch driver data error:', error);
      } finally {
        setLoading(false);
      }
    };

    const compressImage = (file) => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          const maxSize = 800;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(resolve, 'image/jpeg', 0.6);
        };
        
        img.src = URL.createObjectURL(file);
      });
    };

    const handleImageUpload = async (file) => {
      if (!file) return '';
      
      setUploading(true);
      try {
        const compressedFile = await compressImage(file);
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(compressedFile);
        });
      } catch (error) {
        console.error('Image upload error:', error);
        return '';
      } finally {
        setUploading(false);
      }
    };

    const handleSubmitCar = async (e) => {
      e.preventDefault();
      
      try {
        let imageUrl = carForm.image_url;
        
        if (imageFile) {
          imageUrl = await handleImageUpload(imageFile);
        } else if (showImageUpload && !imageFile) {
          imageUrl = '';
        }
        
        const carData = { ...carForm, image_url: imageUrl };
        
        if (car) {
          await supabase.update('cars', carData, { id: car.id });
        } else {
          await secureOps.addMyCar(carData);
        }
        
        setEditingCar(false);
        setImageFile(null);
        setShowImageUpload(false);
        fetchData();
        alert('Auto zostało zapisane');
      } catch (error) {
        console.error('Save car error:', error);
        alert('Błąd podczas zapisywania auta');
      }
    };

    if (loading) {
      return (
        <div className="flex justify-center items-center py-12" data-name="driver-panel-loading" data-file="components/DriverPanel.js">
          <div className="icon-loader-2 text-4xl animate-spin text-white"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6" data-name="driver-panel" data-file="components/DriverPanel.js">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Panel Kierowcy</h1>
          <p className="text-gray-300">Zarządzaj swoim autem i statusem</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Status gotowości</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${
                isReady ? 'text-green-400' : 'text-red-400'
              }`}>
                {isReady ? 'Jesteś gotowy do jazdy' : 'Nie jesteś gotowy do jazdy'}
              </p>
              <p className="text-gray-400 text-sm">
                Tylko gotowi kierowcy są widoczni na dashboard
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const newStatus = !isReady;
                  await secureOps.updateMyProfile({ is_ready: newStatus });
                  
                  setIsReady(newStatus);
                  // Zaktualizuj użytkownika w localStorage i globalnie
                  const updatedUser = { ...user, is_ready: newStatus };
                  localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                  
                  // Zaktualizuj globalny obiekt użytkownika jeśli istnieje
                  if (window.currentUser) {
                    window.currentUser.is_ready = newStatus;
                  }
                  
                  // Wyślij event o zmianie statusu gotowości
                  window.dispatchEvent(new CustomEvent('userReadinessChanged', { 
                    detail: { userId: user.id, isReady: newStatus } 
                  }));
                  
                } catch (error) {
                  console.error('Update readiness error:', error);
                  alert('Błąd podczas aktualizacji statusu');
                }
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isReady 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isReady ? 'Nie jestem gotowy' : 'Jestem gotowy'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Wyniki głosowania</h2>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">{totalPoints}</div>
              <div className="text-gray-300">Punktów z głosowań</div>
              {car && (
                <div className="mt-3 text-sm text-gray-400">
                  {car.brand} {car.model} ({car.registration_number})
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Profil kierowcy</h2>
          
          {!editingProfile ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{user.name}</p>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                  {instagramUsername && (
                    <div className="mt-2">
                      <span className="text-gray-400">Instagram: </span>
                      <a 
                        href={`https://instagram.com/${instagramUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-400 hover:text-pink-300 transition-colors"
                      >
                        {instagramUsername}
                      </a>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setEditingProfile(true)}
                  className="btn-secondary text-sm"
                >
                  Edytuj profil
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Instagram (opcjonalnie)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">@</span>
                  </div>
                  <input
                    type="text"
                    value={instagramUsername}
                    onChange={(e) => {
                      // Usuń @ i inne niepożądane znaki
                      const cleaned = e.target.value.replace(/[@#\s]/g, '').toLowerCase();
                      setInstagramUsername(cleaned);
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                    placeholder="nazwa_uzytkownika"
                    maxLength="30"
                  />
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  Wpisz tylko nazwę użytkownika (bez @ i linków)
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      await secureOps.updateMyProfile({ 
                        instagram_username: instagramUsername || null 
                      });
                      
                      // Zaktualizuj localStorage
                      const updatedUser = { ...user, instagram_username: instagramUsername };
                      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                      
                      setEditingProfile(false);
                      alert('Profil został zaktualizowany');
                    } catch (error) {
                      console.error('Update profile error:', error);
                      alert('Błąd podczas aktualizacji profilu');
                    }
                  }}
                  className="btn-primary flex-1"
                >
                  Zapisz
                </button>
                <button
                  onClick={() => {
                    setInstagramUsername(user.instagram_username || '');
                    setEditingProfile(false);
                  }}
                  className="btn-secondary flex-1"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>

        {car && !editingCar ? (
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Twoje auto</h2>
            {car.image_url && (
              <img 
                src={car.image_url} 
                alt={`${car.brand} ${car.model}`}
                className="w-full aspect-video object-cover rounded-lg mb-4"
              />
            )}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Rejestracja:</span>
                <span className="text-white">{car.registration_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Marka:</span>
                <span className="text-white">{car.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Model:</span>
                <span className="text-white">{car.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Kategoria:</span>
                <span className="text-white">{car.category === 'drift' ? 'Drift' : 'Time Attack'}</span>
              </div>
              {car.description && (
                <div>
                  <span className="text-gray-400 block mb-1">Opis:</span>
                  <p className="text-white">{car.description}</p>
                </div>
              )}
              <button
                onClick={() => setEditingCar(true)}
                className="w-full btn-primary"
              >
                Edytuj auto
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">
              {car ? 'Edytuj auto' : 'Dodaj auto'}
            </h2>
            
            <form onSubmit={handleSubmitCar} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Numer rejestracyjny"
                  value={carForm.registration_number}
                  onChange={(e) => setCarForm({...carForm, registration_number: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  required
                />
                <select
                  value={carForm.category}
                  onChange={(e) => setCarForm({...carForm, category: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="drift">Drift</option>
                  <option value="time_attack">Time Attack</option>
                </select>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Marka"
                  value={carForm.brand}
                  onChange={(e) => setCarForm({...carForm, brand: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  required
                />
                <input
                  type="text"
                  placeholder="Model"
                  value={carForm.model}
                  onChange={(e) => setCarForm({...carForm, model: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Zdjęcie auta
                </label>
                {carForm.image_url && !showImageUpload ? (
                  <div className="space-y-3">
                    <img 
                      src={carForm.image_url} 
                      alt="Zdjęcie auta"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImageUpload(true)}
                      className="btn-secondary text-sm"
                    >
                      Usuń zdjęcie
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white"
                    />
                    {uploading && (
                      <div className="mt-2 text-blue-400 text-sm">
                        <div className="icon-loader-2 animate-spin inline mr-2"></div>
                        Przetwarzanie zdjęcia...
                      </div>
                    )}
                  </div>
                )}
              </div>

              <textarea
                placeholder="Opis auta (opcjonalnie)"
                value={carForm.description}
                onChange={(e) => setCarForm({...carForm, description: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 h-24 resize-none"
              />

              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  Zapisz auto
                </button>
                {car && (
                  <button 
                    type="button" 
                    onClick={() => setEditingCar(false)} 
                    className="btn-secondary flex-1"
                  >
                    Anuluj
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('DriverPanel component error:', error);
    return null;
  }
}