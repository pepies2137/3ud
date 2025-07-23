let currentUser = null;

async function loginUser(name, email) {
  try {
    // Set user context for secure API calls
    const tempUser = { name, email, role: 'user' };
    if (typeof secureSupabase !== 'undefined') {
      secureSupabase.setCurrentUser(tempUser);
    }
    
    // Special kaczka login - sprawdź czy to admin
    if (name === 'Kaczka') {
      try {
        const kaczkaUsers = await supabase.query('users', {
          select: '*',
          eq: { name: 'Kaczka', role: 'admin' }
        });
        
        if (kaczkaUsers.length > 0) {
          const kaczkaUser = kaczkaUsers.find(u => u.email === email);
          if (kaczkaUser) {
            currentUser = kaczkaUser;
            // Update secure client with admin user
            if (typeof secureSupabase !== 'undefined') {
              secureSupabase.setCurrentUser(kaczkaUser);
            }
            saveUserSession(currentUser);
            return currentUser;
          } else {
            throw new Error('Nieprawidłowy email dla użytkownika Kaczka.');
          }
        } else {
          throw new Error('Użytkownik Kaczka nie istnieje lub nie ma uprawnień administratora.');
        }
      } catch (error) {
        console.error('Kaczka login error:', error);
        throw error; // Nie kontynuuj z normalnym logowaniem dla Kaczki
      }
    }
    
    // Najpierw sprawdź po nazwie
    let users = await supabase.query('users', {
      select: '*',
      eq: { name }
    });
    
    // Jeśli znaleziono użytkownika po nazwie, sprawdź email
    if (users.length > 0) {
      const userByName = users.find(u => u.email === email);
      if (userByName) {
        currentUser = userByName;
      } else {
        // Użytkownik istnieje ale z innym emailem
        throw new Error(`Użytkownik ${name} już istnieje z innym adresem email.`);
      }
    } else {
      // Sprawdź czy może istnieje z tym emailem ale inną nazwą
      const usersByEmail = await supabase.query('users', {
        select: '*',
        eq: { email }
      });
      
      if (usersByEmail.length > 0) {
        throw new Error(`Email ${email} jest już używany przez innego użytkownika.`);
      }
      
      // Utwórz nowego użytkownika
      try {
        const newUser = await supabase.insert('users', {
          name,
          email,
          role: 'user',
          vote_weight: 1
        });
        currentUser = newUser[0];
        // Update secure client with new user
        if (typeof secureSupabase !== 'undefined') {
          secureSupabase.setCurrentUser(currentUser);
        }
      } catch (insertError) {
        if (insertError.message.includes('23505')) {
          throw new Error(`Użytkownik ${name} lub email ${email} już istnieje w systemie.`);
        }
        throw insertError;
      }
    }
    
    // Update secure client with existing user
    if (typeof secureSupabase !== 'undefined') {
      secureSupabase.setCurrentUser(currentUser);
    }
    
    saveUserSession(currentUser);
    return currentUser;
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Sprawdź czy to problem z CORS lub siecią
    if (error.message.includes('CORS') || error.message.includes('fetch')) {
      throw new Error('Problem z połączeniem do bazy danych. Sprawdź połączenie internetowe.');
    }
    
    throw error;
  }
}

function getCurrentUser() {
  if (currentUser) return currentUser;
  
  currentUser = getUserSession();
  return currentUser;
}

function logout() {
  currentUser = null;
  clearUserSession();
}

async function hasUserVoted(userId) {
  try {
    // Get daily mode from database
    const settings = await supabase.getAppSettings();
    const currentMode = settings.daily_mode || 'drift';
    const category = currentMode === 'drift' ? 'drift' : 'time_attack';
    
    const votes = await supabase.query('votes', {
      select: 'id',
      eq: { user_id: userId, category: category }
    });
    return votes.length > 0;
  } catch (error) {
    console.error('Check vote error:', error);
    return false;
  }
}

// Make functions globally available
window.loginUser = loginUser;
window.getCurrentUser = getCurrentUser;
window.logout = logout;
window.hasUserVoted = hasUserVoted;