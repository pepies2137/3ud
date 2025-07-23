function DriverRegistration({ user }) {
  try {
    const [formData, setFormData] = React.useState({
      registration_number: '',
      brand: '',
      model: '',
      category: 'drift',
      description: '',
      skill_level: 'basic'
    });
    const [imageFile, setImageFile] = React.useState(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [success, setSuccess] = React.useState(false);
    const [hasExistingApplication, setHasExistingApplication] = React.useState(false);
    const [applicationStatus, setApplicationStatus] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      checkExistingApplication();
    }, []);

    const checkExistingApplication = async () => {
      try {
        // Check if user is already a driver
        if (user.role === 'driver') {
          window.location.reload();
          return;
        }

        const applications = await supabase.query('driver_applications', {
          select: '*',
          eq: { user_id: user.id },
          order: 'created_at.desc',
          limit: 1
        });
        
        if (applications.length > 0) {
          const app = applications[0];
          setApplicationStatus(app.status);
          
          if (app.status === 'approved') {
            // User was approved, show success message and logout
            alert('Gratulacje! Twoje zgłoszenie zostało zatwierdzone. Zostaniesz teraz wylogowany. Zaloguj się ponownie aby uzyskać dostęp do panelu kierowcy.');
            setTimeout(() => {
              logout();
              window.location.reload();
            }, 2000);
            return;
          } else if (app.status === 'pending') {
            setHasExistingApplication(true);
          }
        }
      } catch (error) {
        console.error('Check application error:', error);
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

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        let imageUrl = '';
        if (imageFile) {
          imageUrl = await handleImageUpload(imageFile);
        }

        const applicationData = {
          user_id: user.id,
          registration_number: formData.registration_number,
          brand: formData.brand,
          model: formData.model,
          category: formData.category,
          description: formData.description,
          skill_level: formData.skill_level,
          image_url: imageUrl,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        await supabase.insert('driver_applications', applicationData);
        setSuccess(true);
      } catch (error) {
        console.error('Submit application error:', error);
        alert('Błąd podczas wysyłania zgłoszenia');
      } finally {
        setSubmitting(false);
      }
    };

    if (loading) {
      return (
        <div className="flex justify-center items-center py-12" data-name="registration-loading" data-file="components/DriverRegistration.js">
          <div className="icon-loader-2 text-4xl animate-spin text-white"></div>
        </div>
      );
    }

    if (applicationStatus === 'rejected') {
      return (
        <div className="text-center py-12" data-name="registration-rejected" data-file="components/DriverRegistration.js">
          <div className="card max-w-md mx-auto">
            <div className="icon-x text-6xl text-red-500 mb-4"></div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">ZGŁOSZENIE ODRZUCONE</h2>
            <p className="text-gray-300 mb-4">Twoje zgłoszenie zostało odrzucone, tego auta nie było w zaakceptowanych na 3udan't.</p>
            <p className="text-red-300 font-bold">Nie kombinuj.</p>
          </div>
        </div>
      );
    }

    if (hasExistingApplication || success) {
      return (
        <div className="text-center py-12" data-name="registration-success" data-file="components/DriverRegistration.js">
          <div className="card max-w-md mx-auto">
            <div className="icon-clock text-6xl text-yellow-500 mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">JUŻ SIĘ ZGŁOSIŁEŚ</h2>
            <p className="text-gray-300">Twoja aplikacja jest w trakcie weryfikacji przez kaczkę.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6" data-name="driver-registration" data-file="components/DriverRegistration.js">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Zgłoś się jako kierowca</h1>
          <p className="text-gray-300">Wypełnij formularz, aby dołączyć do zawodów</p>
        </div>

        <div className="card max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Numer rejestracyjny"
                value={formData.registration_number}
                onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                required
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
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
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                required
              />
              <input
                type="text"
                placeholder="Model"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Poziom zaawansowania
                <button
                  type="button"
                  className="ml-2 text-blue-400 hover:text-blue-300"
                  title="Kliknij aby zobaczyć opis poziomów"
                  onClick={() => {
                    const tooltip = document.getElementById('skill-tooltip');
                    tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
                  }}
                >
                  <div className="icon-info text-sm"></div>
                </button>
              </label>
              <div 
                id="skill-tooltip" 
                className="hidden bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 mb-3 text-sm text-blue-100"
                style={{display: 'none'}}
              >
                <p className="font-medium mb-2">Oceń swoje umiejętności:</p>
                <ul className="space-y-1">
                  <li><strong>Podstawowa:</strong> Dla ludzi, którzy zaczynają z driftem</li>
                  <li><strong>Średnia:</strong> Dla ludzi, którzy już coś nie coś potrafią</li>
                  <li><strong>PRO:</strong> Jeśli czujesz, że 'ogarniasz' i klejenie par oraz leadowanie nie stanowi dla Ciebie problemu</li>
                </ul>
              </div>
              <select
                value={formData.skill_level}
                onChange={(e) => setFormData({...formData, skill_level: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value="basic">Podstawowa</option>
                <option value="medium">Średnia</option>
                <option value="advanced">PRO</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Zdjęcie auta
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white"
                required
              />
              {uploading && (
                <div className="mt-2 text-blue-400 text-sm">
                  <div className="icon-loader-2 animate-spin inline mr-2"></div>
                  Przetwarzanie zdjęcia...
                </div>
              )}
            </div>

            <textarea
              placeholder="Opis auta (opcjonalnie)"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 h-24 resize-none"
            />

            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {submitting ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
            </button>
          </form>
        </div>
      </div>
    );
  } catch (error) {
    console.error('DriverRegistration component error:', error);
    return null;
  }
}