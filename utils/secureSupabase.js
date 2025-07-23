// Secure Supabase Client - uses proxy API for all operations
// This replaces direct Supabase calls with secure server-side proxy

class SecureSupabaseClient {
  constructor() {
    // Use proxy endpoint instead of direct Supabase access
    this.proxyUrl = '/api/secure'; // This should point to your proxy server
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  async makeSecureRequest(table, operation, data = null, conditions = null) {
    try {
      // Get current user from session (cookies/localStorage) - server will validate
      const sessionUser = getCurrentUser();
      if (!sessionUser) {
        throw new Error('Nie jesteś zalogowany. Zaloguj się ponownie.');
      }

      const requestBody = {
        table,
        operation,
        data,
        conditions,
        // Send session info for server-side validation
        sessionUser: {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name
        }
      };

      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Secure API request failed:', error);
      throw error;
    }
  }

  async query(table, options = {}) {
    try {
      // Convert options to conditions format
      const conditions = {};
      
      if (options.select) {
        conditions.select = options.select;
      }
      
      if (options.eq) {
        conditions.eq = options.eq;
      }
      
      if (options.order) {
        conditions.order = options.order;
      }
      
      if (options.limit) {
        conditions.limit = options.limit;
      }

      return await this.makeSecureRequest(table, 'read', null, conditions);
    } catch (error) {
      console.error('Secure query error:', error);
      throw error;
    }
  }

  async insert(table, data) {
    try {
      return await this.makeSecureRequest(table, 'create', data);
    } catch (error) {
      console.error('Secure insert error:', error);
      throw error;
    }
  }

  async update(table, data, conditions) {
    try {
      return await this.makeSecureRequest(table, 'update', data, conditions);
    } catch (error) {
      console.error('Secure update error:', error);
      throw error;
    }
  }

  async delete(table, conditions) {
    try {
      return await this.makeSecureRequest(table, 'delete', null, conditions);
    } catch (error) {
      console.error('Secure delete error:', error);
      throw error;
    }
  }

  async getAppSettings() {
    try {
      const settings = await this.query('app_settings', {
        select: '*',
        limit: 1
      });
      return settings[0] || {};
    } catch (error) {
      console.error('Get app settings error:', error);
      return {};
    }
  }

  async updateAppSettings(data) {
    try {
      const existing = await this.getAppSettings();
      if (existing.id) {
        return await this.update('app_settings', data, { id: existing.id });
      } else {
        return await this.insert('app_settings', data);
      }
    } catch (error) {
      console.error('Update app settings error:', error);
      throw error;
    }
  }
}

// Create secure client instance
const secureSupabase = new SecureSupabaseClient();

// Client selection based on environment
let supabaseClient;

if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  // Development mode - use direct Supabase client
  setTimeout(() => {
    if (typeof window.supabase !== 'undefined' && window.supabase.constructor.name === 'SupabaseClient') {
      // Direct client available
    } else {
      window.supabase = secureSupabase;
    }
  }, 100);
} else {
  // Production mode - use direct Supabase client for static hosting
  setTimeout(() => {
    if (typeof window.supabase !== 'undefined' && window.supabase.constructor.name === 'SupabaseClient') {
      // Direct client available
    } else {
      console.warn('Supabase client not available');
    }
  }, 100);
}

// Export the clients
window.secureSupabase = secureSupabase;

// Connection test utility
window.testSecureConnection = async () => {
  try {
    const result = await secureSupabase.query('app_settings', { limit: 1 });
    return result;
  } catch (error) {
    console.error('Connection failed:', error);
    return null;
  }
};