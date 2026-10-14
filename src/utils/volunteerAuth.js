const TOKEN_KEY = 'proxima_volunteer_jwt_token';
const PROFILE_KEY = 'proxima_volunteer_user_profile';
const STATION_KEY = 'proxima_volunteer_selected_station';

/**
 * Retrieve stored JWT token from localStorage.
 */
export function getStoredVolunteerToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Retrieve stored volunteer profile from localStorage.
 */
export function getStoredVolunteerProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT is expired.
 */
export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    // Buffer by 5 seconds
    return Date.now() >= payload.exp * 1000 - 5000;
  } catch {
    return true;
  }
}

/**
 * Save volunteer authentication session.
 */
export function saveVolunteerSession(token, profile) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (profile.station && !localStorage.getItem(STATION_KEY)) {
      localStorage.setItem(STATION_KEY, profile.station);
    }
  } catch (err) {
    console.warn('Could not persist volunteer session:', err);
  }
}

/**
 * Clear volunteer session (logout).
 */
export function clearVolunteerSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
  } catch (err) {
    console.warn('Could not clear volunteer session:', err);
  }
}

/**
 * Get or set selected station in localStorage.
 */
export function getSelectedStation() {
  try {
    return localStorage.getItem(STATION_KEY) || 'All';
  } catch {
    return 'All';
  }
}

export function setSelectedStation(station) {
  try {
    localStorage.setItem(STATION_KEY, station);
  } catch (err) {
    console.warn('Could not persist station:', err);
  }
}
