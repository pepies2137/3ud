// ⚠️ DEPRECATED: This client exposes API credentials
// Use secure proxy client for production environments

// Client configuration based on environment

const SUPABASE_URL = 'https://bncsuwksjdxfjzeqyqud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuY3N1d2tzamR4Zmp6ZXF5cXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MjQ5NTksImV4cCI6MjA2ODQwMDk1OX0.avePl5wWJy9vnsqvZ3sYzh3D_xM9BSJgbDOG8QBg_5c';

class SupabaseClient {
  constructor() {
    this.url = SUPABASE_URL;
    this.key = SUPABASE_ANON_KEY;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`
    };
  }

  async query(table, options = {}) {
    try {
      let url = `${this.url}/rest/v1/${table}`;
      const params = new URLSearchParams();
      
      if (options.select) {
        params.append('select', options.select);
      } else {
        params.append('select', '*');
      }
      
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          params.append(key, `eq.${value}`);
        });
      }
      
      if (options.order) {
        params.append('order', options.order);
      }
      
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      
      url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
  }

  async insert(table, data) {
    try {
      const response = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase insert error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseText = await response.text();
      return responseText ? JSON.parse(responseText) : [];
    } catch (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
  }

  async update(table, data, conditions) {
    try {
      let url = `${this.url}/rest/v1/${table}`;
      const params = new URLSearchParams();
      
      Object.entries(conditions).forEach(([key, value]) => {
        params.append(key, `eq.${value}`);
      });
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...this.headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase update error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Supabase update error:', error);
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

  async delete(table, conditions) {
    try {
      let url = `${this.url}/rest/v1/${table}`;
      const params = new URLSearchParams();
      
      Object.entries(conditions).forEach(([key, value]) => {
        params.append(key, `eq.${value}`);
      });
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...this.headers,
          'Prefer': 'return=representation'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase delete error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Supabase delete error:', error);
      throw error;
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

const supabase = new SupabaseClient();

// Connection test utility
window.testSupabaseConnection = async () => {
  try {
    const result = await supabase.query('users', { limit: 1 });
    return result;
  } catch (error) {
    console.error('Connection failed:', error);
    return null;
  }
};