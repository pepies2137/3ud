// Cookie management utilities for session persistence

function setCookie(name, value, days = 30) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      try {
        return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
      } catch (error) {
        console.error('Error parsing cookie:', error);
        return null;
      }
    }
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// Session management with cookies as primary storage and localStorage as fallback
function saveUserSession(user) {
  try {
    // Save to cookies (30 days)
    setCookie('currentUser', user, 30);
    // Also save to localStorage as fallback
    localStorage.setItem('currentUser', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user session:', error);
    // Fallback to localStorage only
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
}

function getUserSession() {
  try {
    // Try cookies first
    const cookieUser = getCookie('currentUser');
    if (cookieUser) {
      // Also update localStorage for consistency
      localStorage.setItem('currentUser', JSON.stringify(cookieUser));
      return cookieUser;
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const user = JSON.parse(stored);
      // Save to cookies for future use
      setCookie('currentUser', user, 30);
      return user;
    }
  } catch (error) {
    console.error('Error getting user session:', error);
  }
  
  return null;
}

function clearUserSession() {
  try {
    deleteCookie('currentUser');
    localStorage.removeItem('currentUser');
  } catch (error) {
    console.error('Error clearing user session:', error);
  }
}

// Make functions globally available
window.setCookie = setCookie;
window.getCookie = getCookie;
window.deleteCookie = deleteCookie;
window.saveUserSession = saveUserSession;
window.getUserSession = getUserSession;
window.clearUserSession = clearUserSession;