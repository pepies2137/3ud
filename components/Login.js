function Login({ onLogin }) {
  try {
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [appLogo, setAppLogo] = React.useState(null);
    const [loginAttempts, setLoginAttempts] = React.useState(() => {
      return parseInt(localStorage.getItem('loginAttempts') || '0');
    });
    const [isBlocked, setIsBlocked] = React.useState(false);
    const [blockTimeLeft, setBlockTimeLeft] = React.useState(0);

    React.useEffect(() => {
      fetchAppLogo();
      checkLoginBlock();
    }, []);

    React.useEffect(() => {
      let interval;
      if (isBlocked && blockTimeLeft > 0) {
        interval = setInterval(() => {
          setBlockTimeLeft(prev => {
            if (prev <= 1) {
              setIsBlocked(false);
              localStorage.removeItem('loginBlockUntil');
              localStorage.removeItem('loginAttempts');
              setLoginAttempts(0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      return () => clearInterval(interval);
    }, [isBlocked, blockTimeLeft]);

    const checkLoginBlock = () => {
      const blockUntil = localStorage.getItem('loginBlockUntil');
      if (blockUntil) {
        const blockTime = new Date(blockUntil);
        const now = new Date();
        if (now < blockTime) {
          setIsBlocked(true);
          setBlockTimeLeft(Math.ceil((blockTime - now) / 1000));
        } else {
          localStorage.removeItem('loginBlockUntil');
          localStorage.removeItem('loginAttempts');
          setLoginAttempts(0);
        }
      }
    };

    const fetchAppLogo = async () => {
      try {
        const settings = await supabase.getAppSettings();
        setAppLogo(settings.logo_url);
      } catch (error) {
        console.error('Fetch app logo error:', error);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (isBlocked) {
        setError(`Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za ${Math.ceil(blockTimeLeft / 60)} minut.`);
        return;
      }
      
      if (!name.trim() || !email.trim()) {
        setError('Proszę wypełnić wszystkie pola');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const user = await loginUser(name.trim(), email.trim());
        // Reset attempts on successful login
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('loginBlockUntil');
        setLoginAttempts(0);
        onLogin(user);
      } catch (err) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('loginAttempts', newAttempts.toString());
        
        if (newAttempts >= 5) {
          // Block for 15 minutes
          const blockUntil = new Date(Date.now() + 15 * 60 * 1000);
          localStorage.setItem('loginBlockUntil', blockUntil.toISOString());
          setIsBlocked(true);
          setBlockTimeLeft(15 * 60);
          setError('Zbyt wiele nieudanych prób logowania. Konto zablokowane na 15 minut.');
        } else {
          setError(`Błąd logowania. Pozostało prób: ${5 - newAttempts}`);
        }
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4" data-name="login" data-file="components/Login.js">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 max-w-md w-full" style={{animation: 'fadeInUp 0.6s ease-out'}}>
          <style>{`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(30px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
          <div className="text-center mb-6">
            {appLogo ? (
              <div className="flex items-center justify-center mb-4">
                <img 
                  src={appLogo} 
                  alt="Logo" 
                  className="h-16 object-contain"
                />
              </div>
            ) : (
              <div className="icon-car text-6xl text-red-500 mb-4"></div>
            )}
            <h1 className="text-3xl font-bold text-white text-shadow">
              Drift & Time Attack
            </h1>
            <p className="text-gray-300 mt-2">Zaloguj się, aby głosować</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Imię i nazwisko
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                placeholder="Jan Kowalski"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                placeholder="jan@example.com"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm mt-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || isBlocked}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="icon-loader-2 animate-spin mr-2"></div>
                  Logowanie...
                </span>
              ) : (
                'Zaloguj się'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Login component error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Błąd ładowania komponentu logowania</div>
      </div>
    );
  }
}