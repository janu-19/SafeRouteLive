let watchId = null;

/**
 * Get current position once
 * @param {object} options - Geolocation options
 * @returns {Promise<object>} Location data
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        });
      },
      (error) => {
        // Preserve error code for better error handling
        const err = new Error(`Geolocation error: ${error.message}`);
        err.code = error.code;
        err.name = error.name || 'GeolocationError';
        reject(err);
      },
      { ...defaultOptions, ...options }
    );
  });
}

/**
 * Watch position changes
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @param {object} options - Geolocation options
 * @returns {Function} Cleanup function
 */
export function watchPosition(onSuccess, onError, options = {}) {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by this browser'));
    return () => {};
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000
  };

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp
      });
    },
    (error) => {
      // Pass the error object directly (includes code property)
      onError(error);
    },
    { ...defaultOptions, ...options }
  );

  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };
}

/**
 * Stop watching position
 */
export function stopWatchingPosition() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/**
 * Check if geolocation is supported
 * @returns {boolean}
 */
export function isGeolocationSupported() {
  return 'geolocation' in navigator;
}

/**
 * Request geolocation permission
 * @returns {Promise<boolean>}
 */
export async function requestGeolocationPermission() {
  if (!navigator.permissions) {
    return true;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state !== 'denied';
  } catch (error) {
    console.error('Permission query error:', error);
    return true;
  }
}