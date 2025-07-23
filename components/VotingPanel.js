// Updated: 2024-12-15 - Fixed try/catch syntax
function VotingPanel({ user }) {
  try {
    const [driftCars, setDriftCars] = React.useState([]);
    const [timeAttackCars, setTimeAttackCars] = React.useState([]);
    const [selectedDrift, setSelectedDrift] = React.useState(null);
    const [selectedTimeAttack, setSelectedTimeAttack] = React.useState(null);
    const [hasVoted, setHasVoted] = React.useState(false);
    const [votedCar, setVotedCar] = React.useState(null);
    const [canCancelVote, setCanCancelVote] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [dailyMode, setDailyMode] = React.useState('drift');
    const [showCarDetails, setShowCarDetails] = React.useState(false);
    const [selectedCarForDetails, setSelectedCarForDetails] = React.useState(null);
    const [driverData, setDriverData] = React.useState(null);
    const [swipeStartX, setSwipeStartX] = React.useState(0);
    const [swipeCurrentX, setSwipeCurrentX] = React.useState(0);
    const [isSwiping, setIsSwiping] = React.useState(false);
    const detailsRef = React.useRef(null);
    const [isVoting, setIsVoting] = React.useState(false);

    React.useEffect(() => {
      fetchData();
    }, []);

    const fetchData = async () => {
      try {
        // Get daily mode from database
        const settings = await supabase.getAppSettings();
        const currentMode = settings.daily_mode || 'drift';
        setDailyMode(currentMode);
        
        const [drift, timeAttack, voted] = await Promise.all([
          supabase.query('cars', { 
            select: '*, users!cars_driver_id_fkey(name, instagram_username, avatar_url)', 
            eq: { category: 'drift' } 
          }),
          supabase.query('cars', { 
            select: '*, users!cars_driver_id_fkey(name, instagram_username, avatar_url)', 
            eq: { category: 'time_attack' } 
          }),
          secureOps.hasVoted(currentMode)
        ]);
        
        setDriftCars(drift);
        setTimeAttackCars(timeAttack);
        setHasVoted(voted);
        
        if (voted) {
          const userVotes = await supabase.query('votes', {
            select: 'car_id,category',
            eq: { user_id: secureOps.getCurrentUserId(), category: currentMode },
            limit: 1
          });
          
          if (userVotes.length > 0) {
            const vote = userVotes[0];
            const allCars = [...drift, ...timeAttack];
            const votedCarData = allCars.find(car => car.id === vote.car_id);
            setVotedCar(votedCarData);
            
            // Sprawdź czy może anulować głos - tylko jeśli jeszcze nie anulował
            const canCancel = await secureOps.canCancelVote(currentMode);
            setCanCancelVote(canCancel);
          }
        }
      } catch (error) {
        console.error('Fetch voting data error:', error);
      } finally {
        setLoading(false);
      }
    };

    const confirmVote = async (carToVoteFor = null) => {
      console.log('confirmVote wywołane, isVoting:', isVoting, 'submitting:', submitting);
      console.log('carToVoteFor:', carToVoteFor);
      
      // Zabezpieczenie przed wielokrotnym klikaniem
      if (isVoting || submitting) {
        console.log('Głosowanie w toku, ignoruję kolejne kliknięcie');
        return;
      }
      
      // Użyj przekazanego samochodu lub pobierz ze stanu
      const selectedCar = carToVoteFor || (dailyMode === 'drift' ? selectedDrift : selectedTimeAttack);
      console.log('selectedCar:', selectedCar);
      
      if (!selectedCar) {
        console.log('Brak wybranego samochodu - przerywam');
        return;
      }
      
      // Sprawdź czy użytkownik nie próbuje głosować na własne auto
      if (selectedCar.driver_id === secureOps.getCurrentUserId()) {
        alert('loda też sam sobie robisz? pedale?');
        setIsVoting(false);
        return;
      }
      
      // Ustaw flagę głosowania
      console.log('Ustawiam isVoting na true');
      setIsVoting(true);
      
      try {
        // Sprawdź czy użytkownik może głosować
        console.log('Sprawdzam czy użytkownik może głosować...');
        const canVote = await secureOps.canVote();
        console.log('canVote result:', canVote);
        
        if (!canVote) {
          alert('Nie możesz już głosować. Wykorzystałeś wszystkie swoje możliwości głosowania.');
          setIsVoting(false);
          return;
        }
      
        console.log('Pokazuję dialog potwierdzenia...');
        const confirmed = confirm(
          `Czy na pewno chcesz oddać głos na ${selectedCar.brand} ${selectedCar.model} (${selectedCar.registration_number})?`
        );
        console.log('Potwierdzenie:', confirmed);
        
        if (!confirmed) {
          console.log('Użytkownik anulował - resetuję isVoting');
          setIsVoting(false);
          return;
        }
        
        console.log('Ustawiam submitting na true');
        setSubmitting(true);
        
        let vote = null;
        
        // Użyj bezpiecznej operacji głosowania
        if (selectedCar) {
          const category = dailyMode === 'drift' ? 'drift' : 'time_attack';
          await secureOps.vote(selectedCar.id, category);
          vote = true; // Oznacz że głos został oddany
        }
        
        console.log('Przygotowany głos:', vote);
        
        if (vote) {
          console.log('Głos zapisany w bazie!');
          
          // Notify car owner about the vote (only if enabled in settings)
          console.log('Wysyłam powiadomienie...');
          await notifyVoteReceived(selectedCar, user);
          
          console.log('Aktualizuję stan komponentu...');
          setHasVoted(true);
          // Sprawdź czy może anulować po zagłosowaniu
          const canCancel = await secureOps.canCancelVote();
          setCanCancelVote(canCancel);
          setVotedCar(selectedCar);
          closeCarDetails();
          console.log('Głosowanie zakończone pomyślnie!');
        } else {
          console.log('BŁĄD: Nie udało się przygotować głosu!');
        }
      } catch (error) {
        console.error('Vote error:', error);
        alert('Błąd podczas głosowania');
      } finally {
        setSubmitting(false);
        setIsVoting(false);
      }
    };

    const cancelVote = async () => {
      if (!canCancelVote) {
        alert('Możesz anulować głos tylko raz!');
        return;
      }
      
      const confirmed = confirm('Czy na pewno chcesz anulować swój głos? Będziesz mógł zagłosować ponownie, ale to będzie Twoja ostatnia szansa!');
      if (!confirmed) return;
      
      try {
        // Get daily mode from database
        const settings = await supabase.getAppSettings();
        const currentMode = settings.daily_mode || 'drift';
        const category = currentMode === 'drift' ? 'drift' : 'time_attack';
        
        // Użyj bezpiecznych operacji anulowania głosu
        await secureOps.cancelVote(category);
        
        // Zapisz informację o anulowaniu (jeśli jeszcze nie istnieje)
        try {
          await secureOps.insertVoteCancellation(category);
        } catch (error) {
          // Ignoruj błąd jeśli anulowanie już istnieje
          if (!error.message.includes('23505') && !error.message.includes('duplicate key')) {
            throw error;
          }
          console.log('Anulowanie już istnieje w bazie - kontynuuję');
        }
        
        setSelectedDrift(null);
        setSelectedTimeAttack(null);
        setHasVoted(false);
        setCanCancelVote(false);
        setVotedCar(null);
        closeCarDetails();
        alert('Głos został anulowany. Możesz teraz zagłosować ponownie - to będzie Twoja ostatnia szansa!');
        
        // Odśwież dane żeby pokazać możliwość głosowania
        await fetchData();
      } catch (error) {
        console.error('Cancel vote error:', error);
        alert('Błąd podczas anulowania głosu');
      }
    };

    const notifyVoteReceived = async (car, voter) => {
      try {
        const message = `${voter.name} zagłosował na Twoje auto: ${car.brand} ${car.model} (${car.registration_number})`;
        
        const notification = {
          user_id: car.driver_id,
          type: 'vote_received',
          message: message,
          is_read: false
        };
        
        await supabase.insert('notifications', notification);
        
        // Send immediate push notification
        // Try Firebase first, then fallback to push manager
        if (window.firebaseNotificationManager && window.firebaseNotificationManager.isReady()) {
          await window.firebaseNotificationManager.showNotification(
            'Nowy głos!',
            {
              body: `${voter.name} zagłosował na Twoje auto: ${car.brand} ${car.model}`,
              tag: 'vote-received',
              data: { type: 'vote', voter: voter.name, car: `${car.brand} ${car.model}` }
            }
          );
        } else if (typeof pushManager !== 'undefined') {
          await pushManager.notifyVoteReceived(voter.name, `${car.brand} ${car.model}`);
        }
        
        // Trigger immediate notification update
        window.dispatchEvent(new CustomEvent('newNotification'));
      } catch (error) {
        console.error('Notify vote received error:', error);
      }
    };

    const closeCarDetails = () => {
      // Animacja wyjścia z GSAP
      if (detailsRef.current && typeof gsap !== 'undefined') {
        gsap.to(detailsRef.current, {
          opacity: 0,
          scale: 0.8,
          y: 30,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            setShowCarDetails(false);
            setSelectedCarForDetails(null);
            setDriverData(null);
            setIsSwiping(false);
            setSwipeStartX(0);
            setSwipeCurrentX(0);
          }
        });
      } else {
        setShowCarDetails(false);
        setSelectedCarForDetails(null);
        setDriverData(null);
        setIsSwiping(false);
        setSwipeStartX(0);
        setSwipeCurrentX(0);
      }
    };

    const handleTouchStart = (e) => {
      // Nie rozpoczynaj swipe jeśli dotyk jest na przycisku lub interaktywnym elemencie
      const target = e.target;
      if (target.tagName === 'BUTTON' || 
          target.closest('button') || 
          target.tagName === 'A' || 
          target.closest('a') ||
          target.closest('[role="button"]')) {
        return;
      }
      
      setSwipeStartX(e.touches[0].clientX);
      setSwipeCurrentX(e.touches[0].clientX);
      setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
      if (!isSwiping) return;
      
      // Zapobiegaj przewijaniu strony podczas swipe
      e.preventDefault();
      setSwipeCurrentX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e) => {
      if (!isSwiping) return;
      
      const swipeDistance = swipeCurrentX - swipeStartX;
      const swipeThreshold = 100; // Minimum 100px swipe
      
      if (Math.abs(swipeDistance) > swipeThreshold) {
        closeCarDetails();
      }
      
      setIsSwiping(false);
      setSwipeStartX(0);
      setSwipeCurrentX(0);
    };

    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-white">Ładowanie...</div>
        </div>
      );
    }

    if (hasVoted && canCancelVote) {
      return (
        <div className="text-center py-12" data-name="voted-with-cancel" data-file="components/VotingPanel.js">
          <div className="card max-w-md mx-auto">
            <div className="icon-check-circle text-6xl text-green-500 mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Dziękujemy za głos!</h2>
            <p className="text-gray-300 mb-4">Twój głos został zapisany.</p>
            {votedCar && (
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <p className="text-gray-300 text-sm mb-2">Zagłosowałeś na:</p>
                <p className="text-white font-bold">{votedCar.brand} {votedCar.model}</p>
                <p className="text-gray-400 text-sm">{votedCar.registration_number}</p>
              </div>
            )}
            <button
              onClick={cancelVote}
              className="btn-secondary"
            >
              Anuluj i zagłosuj ponownie (tylko raz)
            </button>
          </div>
        </div>
      );
    }

    if (hasVoted && !canCancelVote) {
      return (
        <div className="text-center py-12" data-name="voted-message" data-file="components/VotingPanel.js">
          <div className="card max-w-md mx-auto">
            <div className="icon-check-circle text-6xl text-green-500 mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Dziękujemy za głos!</h2>
            <p className="text-gray-300 mb-4">Twój głos został zapisany.</p>
            {votedCar && (
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <p className="text-gray-300 text-sm mb-2">Zagłosowałeś na:</p>
                <p className="text-white font-bold">{votedCar.brand} {votedCar.model}</p>
                <p className="text-gray-400 text-sm">{votedCar.registration_number}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    const currentCars = dailyMode === 'drift' ? driftCars : timeAttackCars;
    const selectedCar = dailyMode === 'drift' ? selectedDrift : selectedTimeAttack;

    return (
      <div className="space-y-6" data-name="voting-panel" data-file="components/VotingPanel.js">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Głosowanie - {dailyMode === 'drift' ? 'Drift' : 'Time Attack'}
          </h2>
          <p className="text-gray-300">Wybierz samochód i oddaj głos</p>
        </div>

        {!showCarDetails ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCars.map(car => (
              <CarCard
                key={car.id}
                car={car}
                selected={false}
                onSelect={(car) => {
                  setSelectedCarForDetails(car);
                  setDriverData(car.users);
                  setShowCarDetails(true);
                  
                  // Animacja wejścia z GSAP
                  setTimeout(() => {
                    if (detailsRef.current && typeof gsap !== 'undefined') {
                      gsap.fromTo(detailsRef.current, 
                        { 
                          opacity: 0, 
                          scale: 0.8,
                          y: 50
                        },
                        { 
                          opacity: 1, 
                          scale: 1,
                          y: 0,
                          duration: 0.4,
                          ease: "back.out(1.7)"
                        }
                      );
                    }
                  }, 10);
                }}
              />
            ))}
          </div>
        ) : null}
        
        {/* Modal renderowany przez Portal do body */}
        {showCarDetails && typeof document !== 'undefined' && ReactDOM.createPortal(
        <React.Fragment>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={closeCarDetails}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          ></div>
          
          {/* Modal content */}
          <div 
            className="fixed inset-0 flex items-start justify-center z-[10000] p-4 pt-4 pb-4 overflow-y-auto pointer-events-none"
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              minHeight: '100vh',
              paddingTop: 'max(1rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
            }}
          >
            <div 
              ref={detailsRef}
              className="card max-w-2xl w-full my-auto pointer-events-auto"
              style={{ 
                maxHeight: 'calc(100vh - 2rem)',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Szczegóły auta</h3>
                <button
                  onClick={closeCarDetails}
                  className="text-gray-400 md:hover:text-white p-2 -m-2 md:p-3 md:-m-3 transition-colors"
                  title="Zamknij (lub przesuń w bok)"
                >
                  <div className="icon-x text-xl md:text-2xl"></div>
                </button>
              </div>
              
              {/* Wskazówka swipe na mobile */}
              <div className="md:hidden text-center mb-4">
                <p className="text-gray-400 text-xs">
                  💡 Przesuń w bok aby wrócić do listy
                </p>
              </div>

              {/* Zdjęcie auta */}
              {selectedCarForDetails?.image_url && (
                <img 
                  src={selectedCarForDetails.image_url} 
                  alt={`${selectedCarForDetails.brand} ${selectedCarForDetails.model}`}
                  className="w-full aspect-video object-cover rounded-lg mb-6"
                />
              )}

              {/* Informacje o aucie */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <h4 className="text-white font-bold text-lg mb-3">
                  {selectedCarForDetails?.brand} {selectedCarForDetails?.model}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Rejestracja:</span>
                    <span className="text-white ml-2">{selectedCarForDetails?.registration_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Kategoria:</span>
                    <span className="text-white ml-2">
                      {selectedCarForDetails?.category === 'drift' ? 'Drift' : 'Time Attack'}
                    </span>
                  </div>
                </div>
                {selectedCarForDetails?.description && (
                  <div className="mt-3">
                    <span className="text-gray-400 block mb-1">Opis:</span>
                    <div className="max-h-24 overflow-y-auto bg-white/5 rounded p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                      <p className="text-white text-sm whitespace-pre-wrap">{selectedCarForDetails.description}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Profil kierowcy */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <h4 className="text-white font-medium mb-3">Kierowca</h4>
                <div className="flex items-center space-x-3">
                  {driverData?.avatar_url ? (
                    <img 
                      src={driverData.avatar_url} 
                      alt={driverData.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white font-bold">
                        {driverData?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-white font-medium">{driverData?.name}</p>
                    {driverData?.instagram_username && (
                      <div className="mt-1">
                        <span className="text-gray-400 text-sm">Instagram: </span>
                        <a 
                          href={`https://instagram.com/${driverData.instagram_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-400 hover:text-pink-300 transition-colors text-sm"
                        >
                          {driverData.instagram_username}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Przycisk głosowania */}
              <div className="text-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    if (submitting || isVoting) {
                      console.log('Przycisk zablokowany - submitting:', submitting, 'isVoting:', isVoting);
                      return;
                    }
                    
                    console.log('Przycisk głosowania kliknięty - rozpoczynam głosowanie');
                    console.log('dailyMode:', dailyMode);
                    console.log('selectedCarForDetails:', selectedCarForDetails);
                    
                    if (dailyMode === 'drift') {
                      console.log('Ustawiam selectedDrift');
                      setSelectedDrift(selectedCarForDetails);
                    } else {
                      console.log('Ustawiam selectedTimeAttack');
                      setSelectedTimeAttack(selectedCarForDetails);
                    }
                    
                    // Wywołaj confirmVote bezpośrednio z wybranym samochodem
                    console.log('Wywołuję confirmVote z selectedCarForDetails');
                    confirmVote(selectedCarForDetails);
                  }}
                  disabled={submitting || isVoting}
                  className="btn-primary w-full transform transition-transform hover:scale-105 touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                >
                  {submitting || isVoting ? 'Wysyłanie...' : 'ODDAJ GŁOS NA TO AUTO'}
                </button>
            </div>
            </div>
          </div>
        </React.Fragment>,
        document.body
        )}
      </div>
    );
  } catch (error) {
    console.error('VotingPanel component error:', error);
    return <div>Błąd komponentu głosowania</div>;
  }
}