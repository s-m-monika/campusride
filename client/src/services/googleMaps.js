// Google Maps JavaScript API loader.
// The browser key comes from VITE_GOOGLE_MAPS_API_KEY (see client/.env.example)
// and is injected as `GOOGLE_MAPS_API_KEY` by services/firebase.js. The script
// is loaded exactly once and cached for the lifetime of the page. If the key is
// missing OR the loader fails (e.g. the key is referrer-restricted), callers
// fall back to the Leaflet map so the app never breaks.
import { GOOGLE_MAPS_API_KEY } from './firebase';

let loaderPromise = null;

// Google calls window.gm_authFailure when the map can't load because of a key,
// billing, or API-enablement problem. We surface that so the UI can fall back
// to Leaflet instead of showing a broken Google map.
let authFailed = false;
const authFailureListeners = new Set();

export function isGoogleAuthFailed() {
  return authFailed;
}

export function onGoogleAuthFailure(cb) {
  authFailureListeners.add(cb);
  if (authFailed) cb();
  return () => authFailureListeners.delete(cb);
}

// Mark Google Maps as unusable and notify the UI so it can fall back to Leaflet.
// Safe to call more than once (only the first failure is reported).
export function reportGoogleMapsFailure(err) {
  if (authFailed) return;
  authFailed = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[CampusRide] Google Maps unavailable (billing/key/API not enabled). ' +
      'Falling back to the offline map.',
    err?.message || ''
  );
  authFailureListeners.forEach((cb) => cb());
}

function installAuthFailureHook() {
  if (typeof window === 'undefined') return;
  if (window.__campusrideGmapsAuthHook) return;
  window.__campusrideGmapsAuthHook = true;
  window.gm_authFailure = () => reportGoogleMapsFailure();
}

export function hasGoogleMapsKey() {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

export function loadGoogleMaps() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps requires a browser environment'));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!hasGoogleMapsKey()) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
  }
  if (loaderPromise) return loaderPromise;

  installAuthFailureHook();

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-campusride-gmaps]');
    const settle = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps loaded but the API is unavailable'));
    };
    if (existing) {
      existing.addEventListener('load', settle);
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY
    )}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.campusrideGmaps = 'true';
    script.addEventListener('load', settle);
    script.addEventListener('error', () => {
      loaderPromise = null; // allow a retry on a later mount
      reject(new Error('Failed to load Google Maps'));
    });
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export default loadGoogleMaps;
