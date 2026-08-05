/**
 * GPS Location Hook — Always-on location tracking for KrishiMitra-AI
 * 
 * Provides real-time GPS coordinates that are automatically sent
 * with every API request for location-aware agricultural advice.
 * 
 * Features:
 * - Always-on GPS tracking via watchPosition
 * - Caches last known location in localStorage for offline/startup
 * - Falls back gracefully if GPS is unavailable
 */

let currentPosition = null;
let watchId = null;
let locationListeners = [];
let statusListeners = [];
let locationStatus = 'loading'; // 'loading' | 'active' | 'denied' | 'unavailable' | 'timeout' | 'unsupported'
let locationError = null;

// Cache key for localStorage
const LOCATION_CACHE_KEY = 'krishimitraai_last_location';

function notifyStatusListeners(status, error = null) {
  locationStatus = status;
  locationError = error;
  statusListeners.forEach(fn => fn({ status, error }));
}

/**
 * Subscribe to location status updates.
 */
export function onStatusUpdate(callback) {
  statusListeners.push(callback);
  // Immediately call back with current status
  callback({ status: locationStatus, error: locationError });
  return () => {
    statusListeners = statusListeners.filter(fn => fn !== callback);
  };
}

/**
 * Get current location status.
 */
export function getLocationStatus() {
  return { status: locationStatus, error: locationError };
}

/**
 * Get cached location from localStorage (for instant startup)
 */
function getCachedLocation() {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

/**
 * Save location to localStorage for offline use
 */
function cacheLocation(position) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Start always-on GPS tracking.
 * Call this once at app startup.
 */
export function startLocationTracking() {
  if (!navigator.geolocation) {
    console.warn('[GPS] Geolocation not supported by this browser');
    currentPosition = getCachedLocation();
    notifyStatusListeners('unsupported', 'Geolocation not supported by this browser');
    return;
  }

  // Load cached position immediately for instant availability
  currentPosition = getCachedLocation();

  notifyStatusListeners('loading');

  // Start watching position (always-on)
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      currentPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: Date.now(),
      };
      cacheLocation(currentPosition);
      notifyStatusListeners('active');

      // Notify all listeners
      locationListeners.forEach(fn => fn(currentPosition));
    },
    (err) => {
      console.warn('[GPS] Location error:', err.message);
      let status = 'error';
      if (err.code === err.PERMISSION_DENIED) {
        status = 'denied';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        status = 'unavailable';
      } else if (err.code === err.TIMEOUT) {
        status = 'timeout';
      }
      notifyStatusListeners(status, err.message);
      
      // Keep using cached location
      if (!currentPosition) {
        currentPosition = getCachedLocation();
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,       // Require reasonably fresh positions
      timeout: 10000,          // Wait up to 10s for a position
    }
  );

  console.log('[GPS] Always-on location tracking started');
}

/**
 * Force retry/request location.
 */
export function retryLocationTracking() {
  if (!navigator.geolocation) {
    notifyStatusListeners('unsupported', 'Geolocation not supported by this browser');
    return;
  }

  notifyStatusListeners('loading');

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: Date.now(),
      };
      cacheLocation(currentPosition);
      notifyStatusListeners('active');
      locationListeners.forEach(fn => fn(currentPosition));

      // Re-enable always-on tracking watch
      startLocationTracking();
    },
    (err) => {
      console.warn('[GPS] Retry Location error:', err.message);
      let status = 'error';
      if (err.code === err.PERMISSION_DENIED) {
        status = 'denied';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        status = 'unavailable';
      } else if (err.code === err.TIMEOUT) {
        status = 'timeout';
      }
      notifyStatusListeners(status, err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0, // Force fresh coordinates
      timeout: 10000,
    }
  );
}

/**
 * Stop GPS tracking (call on app unmount if needed)
 */
export function stopLocationTracking() {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    console.log('[GPS] Location tracking stopped');
  }
}

/**
 * Get current GPS coordinates.
 * Returns { latitude, longitude, accuracy, timestamp } or null.
 */
export function getCurrentLocation() {
  if (currentPosition && currentPosition.latitude && currentPosition.longitude) {
    return currentPosition;
  }
  try {
    const profileSaved = localStorage.getItem('krishimitraai_profile');
    if (profileSaved) {
      const prof = JSON.parse(profileSaved);
      if (prof && prof.lat && prof.lng) {
        return {
          latitude: parseFloat(prof.lat),
          longitude: parseFloat(prof.lng),
          accuracy: 0,
          timestamp: Date.now()
        };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Subscribe to location updates.
 * Returns unsubscribe function.
 */
export function onLocationUpdate(callback) {
  locationListeners.push(callback);
  // Immediately call with current position if available
  if (currentPosition) {
    callback(currentPosition);
  }
  return () => {
    locationListeners = locationListeners.filter(fn => fn !== callback);
  };
}

/**
 * Get GPS headers to attach to API requests.
 * Returns an object with X-Latitude and X-Longitude headers.
 */
export function getLocationHeaders() {
  const pos = getCurrentLocation();
  if (pos && pos.latitude && pos.longitude) {
    return {
      'X-Latitude': String(pos.latitude),
      'X-Longitude': String(pos.longitude),
    };
  }
  return {};
}

/**
 * Get GPS body params to include in POST request bodies.
 * Returns { latitude, longitude } or empty object.
 */
export function getLocationBody() {
  const pos = getCurrentLocation();
  if (pos && pos.latitude && pos.longitude) {
    return {
      latitude: pos.latitude,
      longitude: pos.longitude,
    };
  }
  return {};
}
