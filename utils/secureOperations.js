// Secure operations wrapper - automatically uses current user ID from session
// Prevents user_id manipulation by always using authenticated user's ID

class SecureOperations {
  constructor() {
    this.supabaseClient = null;
  }

  init(supabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  getCurrentUserId() {
    const user = getCurrentUser();
    if (!user || !user.id) {
      throw new Error('Nie jesteś zalogowany. Zaloguj się ponownie.');
    }
    return user.id;
  }

  getCurrentUser() {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Nie jesteś zalogowany. Zaloguj się ponownie.');
    }
    return user;
  }

  // Secure voting operations
  async vote(carId, category) {
    const userId = this.getCurrentUserId();
    const user = this.getCurrentUser();
    
    return await this.supabaseClient.insert('votes', {
      user_id: userId, // Always use authenticated user's ID
      car_id: carId,
      category: category,
      vote_weight: user.vote_weight || 1
    });
  }

  async cancelVote(category) {
    const userId = this.getCurrentUserId();
    
    return await this.supabaseClient.delete('votes', { 
      user_id: userId, // Always use authenticated user's ID
      category: category 
    });
  }

  async insertVoteCancellation(category) {
    const userId = this.getCurrentUserId();
    
    // Check if cancellation already exists for this user and category
    const existingCancellation = await this.supabaseClient.query('vote_cancellations', {
      select: 'id',
      eq: { user_id: userId, category: category }
    });
    
    // If cancellation already exists, don't insert again
    if (existingCancellation.length > 0) {
      return existingCancellation[0];
    }
    
    return await this.supabaseClient.insert('vote_cancellations', {
      user_id: userId, // Always use authenticated user's ID
      category: category
    });
  }

  // Secure notification operations
  async getMyNotifications() {
    const userId = this.getCurrentUserId();
    
    return await this.supabaseClient.query('notifications', {
      select: '*',
      eq: { user_id: userId }, // Always use authenticated user's ID
      order: 'created_at.desc'
    });
  }

  async markNotificationAsRead(notificationId) {
    const userId = this.getCurrentUserId();
    
    // First verify the notification belongs to current user
    const notification = await this.supabaseClient.query('notifications', {
      select: 'user_id',
      eq: { id: notificationId }
    });
    
    if (!notification[0] || notification[0].user_id !== userId) {
      throw new Error('Nie masz uprawnień do tej operacji.');
    }
    
    return await this.supabaseClient.update('notifications', 
      { is_read: true }, 
      { id: notificationId, user_id: userId } // Double check user_id
    );
  }

  async deleteMyNotifications() {
    const userId = this.getCurrentUserId();
    
    return await this.supabaseClient.delete('notifications', { 
      user_id: userId // Always use authenticated user's ID
    });
  }

  // Secure user profile operations
  async updateMyProfile(data) {
    const userId = this.getCurrentUserId();
    
    // Remove sensitive fields that users shouldn't be able to change
    const allowedFields = ['name', 'email', 'instagram_username', 'avatar_url', 'is_ready'];
    const filteredData = {};
    
    for (const field of allowedFields) {
      if (data.hasOwnProperty(field)) {
        filteredData[field] = data[field];
      }
    }
    
    return await this.supabaseClient.update('users', filteredData, { 
      id: userId // Always use authenticated user's ID
    });
  }

  // Secure driver operations
  async getMyCars() {
    const userId = this.getCurrentUserId();
    
    return await this.supabaseClient.query('cars', {
      select: '*',
      eq: { driver_id: userId } // Always use authenticated user's ID
    });
  }

  async addMyCar(carData) {
    const userId = this.getCurrentUserId();
    
    return await this.supabaseClient.insert('cars', {
      ...carData,
      driver_id: userId // Always use authenticated user's ID
    });
  }

  async updateMyCar(carId, carData) {
    const userId = this.getCurrentUserId();
    
    // First verify the car belongs to current user
    const car = await this.supabaseClient.query('cars', {
      select: 'driver_id',
      eq: { id: carId }
    });
    
    if (!car[0] || car[0].driver_id !== userId) {
      throw new Error('Nie masz uprawnień do edycji tego auta.');
    }
    
    return await this.supabaseClient.update('cars', carData, { 
      id: carId, 
      driver_id: userId // Double check driver_id
    });
  }

  async getMyWarnings() {
    const userId = this.getCurrentUserId();
    
    return await this.supabaseClient.query('warnings', {
      select: '*',
      eq: { driver_id: userId }, // Always use authenticated user's ID
      order: 'timestamp.desc'
    });
  }

  async markWarningAsRead(warningId) {
    const userId = this.getCurrentUserId();
    
    // First verify the warning belongs to current user
    const warning = await this.supabaseClient.query('warnings', {
      select: 'driver_id',
      eq: { id: warningId }
    });
    
    if (!warning[0] || warning[0].driver_id !== userId) {
      throw new Error('Nie masz uprawnień do tej operacji.');
    }
    
    return await this.supabaseClient.update('warnings', 
      { is_read: true }, 
      { id: warningId, driver_id: userId } // Double check driver_id
    );
  }

  async submitDriverApplication(applicationData) {
    const userId = this.getCurrentUserId();
    
    return await this.supabaseClient.insert('driver_applications', {
      ...applicationData,
      user_id: userId // Always use authenticated user's ID
    });
  }

  async getMyDriverApplication() {
    const userId = this.getCurrentUserId();
    
    return await this.supabaseClient.query('driver_applications', {
      select: '*',
      eq: { user_id: userId }, // Always use authenticated user's ID
      order: 'created_at.desc',
      limit: 1
    });
  }

  // Check functions that use authenticated user ID
  async hasVoted(category) {
    const userId = this.getCurrentUserId();
    
    const votes = await this.supabaseClient.query('votes', {
      select: 'id',
      eq: { user_id: userId, category: category }
    });
    return votes.length > 0;
  }

  async canVote() {
    const userId = this.getCurrentUserId();
    
    // Get daily mode from database
    const settings = await this.supabaseClient.getAppSettings();
    const currentMode = settings.daily_mode || 'drift';
    const category = currentMode === 'drift' ? 'drift' : 'time_attack';
    
    const votes = await this.supabaseClient.query('votes', {
      select: 'id',
      eq: { user_id: userId, category: category }
    });
    
    return votes.length === 0;
  }

  async canCancelVote(category = null) {
    const userId = this.getCurrentUserId();
    
    // If category not provided, get from settings
    if (!category) {
      const settings = await this.supabaseClient.getAppSettings();
      const currentMode = settings.daily_mode || 'drift';
      category = currentMode === 'drift' ? 'drift' : 'time_attack';
    }
    
    // Sprawdź czy użytkownik już anulował głos dla tej kategorii
    const cancellations = await this.supabaseClient.query('vote_cancellations', {
      select: 'id',
      eq: { user_id: userId, category: category }
    });
    
    // Może anulować tylko jeśli jeszcze nie anulował (brak wpisu w vote_cancellations)
    return cancellations.length === 0;
  }

  // === FCM TOKEN MANAGEMENT ===
  
  // Zapisz lub zaktualizuj FCM token użytkownika
  async saveFCMToken(token, deviceInfo = {}) {
    const userId = this.getCurrentUserId();

    try {
      const tokenData = {
        user_id: userId,
        fcm_token: token,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timestamp: new Date().toISOString(),
          ...deviceInfo
        },
        updated_at: new Date().toISOString(),
        is_active: true
      };

      // Sprawdź czy token już istnieje
      const existing = await this.supabaseClient.query('user_fcm_tokens', {
        select: 'id',
        eq: { user_id: userId, fcm_token: token }
      });

      let result;
      if (existing && existing.length > 0) {
        // Zaktualizuj istniejący token
        result = await this.supabaseClient.update('user_fcm_tokens', 
          { 
            device_info: tokenData.device_info,
            updated_at: tokenData.updated_at,
            is_active: true
          },
          { user_id: userId, fcm_token: token }
        );
      } else {
        // Wstaw nowy token
        result = await this.supabaseClient.insert('user_fcm_tokens', tokenData);
      }

      console.log('✅ FCM token saved successfully');
      return result;
    } catch (error) {
      console.error('❌ Failed to save FCM token:', error);
      throw error;
    }
  }

  // Pobierz aktywne FCM tokeny użytkownika
  async getUserFCMTokens(userId = null) {
    const currentUser = this.getCurrentUser();
    const targetUserId = userId || currentUser.id;

    // Tylko admin może sprawdzać tokeny innych użytkowników
    if (userId && currentUser.role !== 'admin' && currentUser.id !== userId) {
      throw new Error('Brak uprawnień do sprawdzania tokenów innych użytkowników');
    }

    return await this.supabaseClient.query('user_fcm_tokens', {
      select: '*',
      eq: { user_id: targetUserId, is_active: true },
      order: 'updated_at.desc'
    });
  }

  // Dezaktywuj FCM token
  async deactivateFCMToken(token) {
    const userId = this.getCurrentUserId();

    return await this.supabaseClient.update('user_fcm_tokens', 
      { is_active: false, updated_at: new Date().toISOString() },
      { user_id: userId, fcm_token: token }
    );
  }
}

// Create global instance
const secureOps = new SecureOperations();

// Initialize when supabase client is ready
setTimeout(() => {
  if (typeof window.supabase !== 'undefined') {
    secureOps.init(window.supabase);
  }
}, 200);

// Make globally available
window.secureOps = secureOps;