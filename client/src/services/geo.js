// Real routing, geocoding and fare calculation.
// - Routing + distance/duration: OSRM public demo server (best-effort, no SLA).
// - Geocoding / place search: OpenStreetMap Nominatim (usage policy: <=1 req/s,
//   descriptive referer). We throttle and debounce to stay compliant.
// Nothing here invents a route: if a service fails we surface the error so the
// UI can show a real failure state instead of a fake success.
import {
  OSRM_BASE,
  NOMINATIM_BASE,
  NOMINATIM_MIN_INTERVAL_MS,
  FARE,
} from '../config/appConfig';

// ---- Fare -----------------------------------------------------------------
export function calculateFare(vehicleType, distanceKm) {
  const model = FARE[vehicleType] || FARE.Bike;
  const raw = model.baseFare + model.perKm * (distanceKm || 0);
  return Math.max(model.minFare, Math.round(raw));
}

// ---- OSRM routing ---------------------------------------------------------
// Returns { distanceKm, durationMin, geometry:[[lat,lng],...] } or throws.
export async function fetchRoute(pickup, destination) {
  if (!pickup || !destination) throw new Error('Pickup and destination are required');
  // OSRM expects lng,lat order.
  const coords = `${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error('Routing service unreachable. Check your connection and retry.');
  }
  if (!res.ok) throw new Error(`Routing service error (${res.status}).`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
    throw new Error('No route could be found between these points.');
  }
  const route = data.routes[0];
  const geometry = (route.geometry.coordinates || []).map(([lng, lat]) => [lat, lng]);
  return {
    distanceKm: Math.round((route.distance / 1000) * 100) / 100,
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    geometry,
  };
}

// ---- Nominatim geocoding (throttled) --------------------------------------
let lastNominatimCall = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, NOMINATIM_MIN_INTERVAL_MS - (now - lastNominatimCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();
}

// Forward search a place name → list of { name, lat, lng }.
// `signal` lets the caller cancel stale requests (debounced search box).
export async function searchPlaces(queryText, signal) {
  const q = (queryText || '').trim();
  if (q.length < 3) return [];
  await throttle();
  const url =
    `${NOMINATIM_BASE}/search?format=jsonv2&limit=6&addressdetails=1` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    signal,
    headers: { 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error('Location search failed. Please try again.');
  const data = await res.json();
  return data.map((d) => ({
    name: d.display_name,
    shortName: d.name || d.display_name.split(',')[0],
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}

// Reverse geocode coords → a human label (used for "current location").
export async function reverseGeocode(lat, lng, signal) {
  await throttle();
  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, { signal, headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    const d = await res.json();
    return d.display_name || null;
  } catch {
    return null;
  }
}
