// System podsumowań głosów co godzinę
class VoteHourlySummaryManager {
  constructor() {
    this.intervalId = null;
    this.lastSummaryTime = new Date();
  }

  start() {
    // Sprawdzaj co 5 minut czy minęła godzina
    this.intervalId = setInterval(() => {
      this.checkAndSendSummaries();
    }, 5 * 60 * 1000); // 5 minut
    
    console.log('✅ Vote hourly summary manager started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Vote hourly summary manager stopped');
    }
  }

  async checkAndSendSummaries() {
    try {
      const now = new Date();
      const hoursSinceLastSummary = (now - this.lastSummaryTime) / (1000 * 60 * 60);
      
      // Jeśli minęła godzina, wyślij podsumowania
      if (hoursSinceLastSummary >= 1) {
        await this.sendHourlySummaries();
        this.lastSummaryTime = now;
      }
    } catch (error) {
      console.error('Error checking hourly summaries:', error);
    }
  }

  async sendHourlySummaries() {
    try {
      console.log('📊 Sending hourly vote summaries...');
      
      // Pobierz wszystkie samochody z głosami z ostatniej godziny
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const recentVotes = await supabase.query('votes', {
        select: 'car_id, vote_weight',
        gte: { created_at: oneHourAgo }
      });
      
      if (recentVotes.length === 0) {
        console.log('📊 No votes in the last hour');
        return;
      }
      
      // Grupuj głosy według car_id
      const votesByCarId = {};
      recentVotes.forEach(vote => {
        if (!votesByCarId[vote.car_id]) {
          votesByCarId[vote.car_id] = 0;
        }
        votesByCarId[vote.car_id] += vote.vote_weight || 1;
      });
      
      // Wyślij podsumowanie dla każdego samochodu
      for (const [carId, voteCount] of Object.entries(votesByCarId)) {
        await this.sendSummaryForCar(parseInt(carId), voteCount);
      }
      
      console.log(`📊 Sent summaries for ${Object.keys(votesByCarId).length} cars`);
    } catch (error) {
      console.error('Error sending hourly summaries:', error);
    }
  }

  async sendSummaryForCar(carId, voteCount) {
    try {
      // Pobierz dane samochodu
      const cars = await supabase.query('cars', {
        select: '*',
        eq: { id: carId },
        limit: 1
      });
      
      if (cars.length === 0) return;
      
      const car = cars[0];
      const carInfo = `${car.brand} ${car.model} (${car.registration_number})`;
      
      // Wyślij powiadomienie do właściciela samochodu
      if (window.pushManager) {
        // Ustaw tymczasowo currentUser dla sprawdzenia ustawień
        const originalUser = window.currentUser;
        window.currentUser = { id: car.driver_id };
        
        await window.pushManager.notifyVoteHourlySummary(voteCount, carInfo);
        
        // Przywróć oryginalnego użytkownika
        window.currentUser = originalUser;
      }
      
      // Dodaj powiadomienie do bazy danych
      const message = voteCount === 1 
        ? `Twoje auto ${carInfo} otrzymało 1 głos w ostatniej godzinie`
        : `Twoje auto ${carInfo} otrzymało ${voteCount} głosów w ostatniej godzinie`;
      
      const notification = {
        user_id: car.driver_id,
        type: 'vote_summary',
        message: message,
        is_read: false
      };
      
      await supabase.insert('notifications', notification);
      
    } catch (error) {
      console.error('Error sending summary for car:', carId, error);
    }
  }
}

// Globalna instancja managera
const voteHourlySummaryManager = new VoteHourlySummaryManager();

// Eksportuj dla użycia w innych plikach
window.voteHourlySummaryManager = voteHourlySummaryManager;