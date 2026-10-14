// CampusRide central configuration.
// All tunable project constants live here so no values are invented or hardcoded
// deep inside components. Edit these to adapt the app to another college/city.

// ---- College eligibility -------------------------------------------------
// The permitted college email domain. This is a BASIC eligibility check only
// (proves the email ends with this domain) — it is NOT proof of enrollment.
// Make it empty string ('') to disable the domain check entirely.
// Email domain gate is DISABLED by default: users/drivers may register with any
// email. College eligibility is proven later via the college-ID upload + OCR +
// admin approval, not by the email domain. Set a domain here only if you want to
// re-enable the signup-time email check.
export const COLLEGE_EMAIL_DOMAIN = import.meta.env.VITE_COLLEGE_EMAIL_DOMAIN || '';

// Authorized admin email(s). Admins sign in only (never self-register). Real
// admin authority comes from the Firestore users/{uid}.role == 'admin' field
// (set manually in the console) + security rules; this list is a UX guard.
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || 'm1@sambhram.org')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
export const COLLEGE_NAME =
  import.meta.env.VITE_COLLEGE_NAME || 'Sambhram Institute of Technology';
export const COLLEGE_SHORT = 'SAIT';

// USN (college unique id) prefix. Validation is format-only, not authenticity.
export const USN_PREFIX = import.meta.env.VITE_USN_PREFIX || '1ST';

// ---- Fare model (transparent, estimated only, no real payments) ----------
// Fare = max(minFare, baseFare + perKm * distanceKm), rounded to the rupee.
// Affordable campus pricing: ₹5/km for every ride type.
export const FARE = {
  Bike: { baseFare: 10, perKm: 5, minFare: 10 },
  Car: { baseFare: 10, perKm: 5, minFare: 10 },
};
export const CURRENCY = '₹';

// ---- Matching / lifecycle timeouts --------------------------------------
// How long (ms) a ride request stays in `searching` before it becomes
// `no_driver_found` (rider may retry). Also how many top drivers get offered.
export const SEARCH_TIMEOUT_MS = 60_000;
export const MAX_OFFER_DRIVERS = 5;

// Driver is considered "online/recent" only if their location/heartbeat is
// newer than this. Older → treated as stale.
export const DRIVER_FRESH_MS = 60_000;

// ---- Location tracking ---------------------------------------------------
// Minimum gap between Firestore location writes to avoid excessive writes.
export const LOCATION_WRITE_INTERVAL_MS = 5_000;
// A driver/ride location older than this shows a "stale location" warning.
export const LOCATION_STALE_MS = 20_000;

// ---- OTP (demonstration-grade — see docs) --------------------------------
export const OTP_LENGTH = 6; // six-digit pickup code
export const OTP_TTL_MS = 15 * 60_000; // 15 minutes
export const OTP_MAX_ATTEMPTS = 3;

// ---- Public map/routing services (best-effort, rate-limited) -------------
export const OSRM_BASE = 'https://router.project-osrm.org';
export const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
// Nominatim usage policy: max 1 req/sec and a descriptive identifier.
export const NOMINATIM_MIN_INTERVAL_MS = 1100;

// Map default view (campus centre).
export const MAP_CENTER = { lat: 13.0805, lng: 77.5458 };
export const MAP_DEFAULT_ZOOM = 14;

// ---- Roles ---------------------------------------------------------------
export const ROLES = { RIDER: 'rider', DRIVER: 'driver', ADMIN: 'admin' };

// ---- Ride lifecycle statuses --------------------------------------------
export const RIDE_STATUS = {
  SEARCHING: 'searching',
  ACCEPTED: 'accepted',
  DRIVER_ARRIVING: 'driver_arriving',
  DRIVER_ARRIVED: 'driver_arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_DRIVER_FOUND: 'no_driver_found',
};

// Allowed forward transitions (validated client-side and in security rules).
export const RIDE_TRANSITIONS = {
  searching: ['accepted', 'cancelled', 'no_driver_found'],
  accepted: ['driver_arriving', 'cancelled'],
  driver_arriving: ['driver_arrived', 'cancelled'],
  driver_arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_driver_found: ['searching', 'cancelled'],
};

export const VERIFICATION_STATUS = {
  UNSUBMITTED: 'unsubmitted',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const ACCOUNT_STATUS = { ACTIVE: 'active', SUSPENDED: 'suspended' };

// ---- Demo simulator -------------------------------------------------------
// When enabled, a rider's request is auto-accepted by a believable mock driver
// that then drives the real ride lifecycle (and animates GPS along the route),
// so the full flow works without a second human. A REAL driver can still accept
// first — the simulator backs off. Set VITE_SIMULATE_DRIVERS=false to disable.
export const SIMULATE_DRIVERS =
  (import.meta.env.VITE_SIMULATE_DRIVERS ?? 'true').toString() !== 'false';

export const SIM = {
  acceptDelayMs: 6000, // wait before a bot accepts (gives real drivers a chance)
  toPickupMs: 8000, // animation time: approach → pickup
  otpWaitMs: 12000, // how long the bot waits for OTP before auto-verifying
  toDropMs: 12000, // animation time: pickup → destination
  tickMs: 900, // GPS update cadence during animation
};

export const SIMULATED_DRIVERS = [
  { uid: 'sim_driver_ananya', name: 'Ananya R', phone: '9000000001', vehicleType: 'Bike', vehicleModel: 'Honda Activa 6G', vehicleNumber: 'KA04EN4567', rating: 4.9, usn: '1ST23AI018', pinkRideEligible: true },
  { uid: 'sim_driver_ajay', name: 'Ajay Kumar', phone: '9000000002', vehicleType: 'Bike', vehicleModel: 'TVS Jupiter', vehicleNumber: 'KA02AB1234', rating: 4.7, usn: '1ST23CS042', pinkRideEligible: false },
  { uid: 'sim_driver_kiran', name: 'Kiran S', phone: '9000000003', vehicleType: 'Car', vehicleModel: 'Maruti Swift', vehicleNumber: 'KA03XY5678', rating: 4.6, usn: '1ST23EC055', pinkRideEligible: false },
  { uid: 'sim_driver_sneha', name: 'Sneha M', phone: '9000000004', vehicleType: 'Bike', vehicleModel: 'Jupiter 125', vehicleNumber: 'KA04EF9876', rating: 4.8, usn: '1ST23IS033', pinkRideEligible: true },
];

export function isCollegeEmail(email) {
  if (!COLLEGE_EMAIL_DOMAIN) return true;
  return typeof email === 'string' && email.toLowerCase().endsWith('@' + COLLEGE_EMAIL_DOMAIN.toLowerCase());
}
