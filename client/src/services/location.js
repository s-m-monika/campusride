// Browser Geolocation helpers. Location sharing only starts when the caller
// explicitly asks and the user grants permission. We never simulate movement:
// if GPS is unavailable or denied, callers get a real error.
import { LOCATION_WRITE_INTERVAL_MS } from '../config/appConfig';

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(mapGeoError(err)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options }
    );
  });
}

// Start watching position. Calls onUpdate at most once per interval (to limit
// Firestore writes). Returns a stop() function.
export function watchPositionThrottled(onUpdate, onError, intervalMs = LOCATION_WRITE_INTERVAL_MS) {
  if (!('geolocation' in navigator)) {
    onError?.(new Error('Geolocation is not supported by this browser.'));
    return () => {};
  }
  let lastEmit = 0;
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const now = Date.now();
      if (now - lastEmit < intervalMs) return;
      lastEmit = now;
      onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    },
    (err) => onError?.(mapGeoError(err)),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

function mapGeoError(err) {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return new Error('Location permission denied. Enable it in your browser to continue.');
    case err.POSITION_UNAVAILABLE:
      return new Error('Your location is currently unavailable.');
    case err.TIMEOUT:
      return new Error('Timed out while getting your location. Try again.');
    default:
      return new Error('Could not get your location.');
  }
}
