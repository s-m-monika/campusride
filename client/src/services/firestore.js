// Centralised Firestore data access for CampusRide.
// Every collection read/write/listener lives here so screens stay thin and the
// schema is documented in one place. Realtime uses onSnapshot; callers must
// unsubscribe (returned function) when components unmount.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as qlimit,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, DEMO_MODE } from './firebase';
import {
  RIDE_STATUS,
  RIDE_TRANSITIONS,
  VERIFICATION_STATUS,
  ACCOUNT_STATUS,
  ROLES,
} from '../config/appConfig';

// Collection names (documented schema) --------------------------------------
export const COL = {
  users: 'users',
  driverProfiles: 'driverProfiles',
  verifications: 'verificationApplications',
  rideRequests: 'rideRequests',
  rides: 'rides',
  reports: 'reports',
};

export { serverTimestamp };
const useMock = () => DEMO_MODE || Boolean(sessionStorage.getItem('campusride_demo_user'));

const mock = {
  users: new Map(),
  drivers: new Map([['demo-driver', {
    uid: 'demo-driver', name: 'Demo Captain', phone: '9000000000',
    vehicleType: 'Bike', vehicleModel: 'Demo Bike', vehicleNumber: 'DEMO-001',
    rating: 5, pinkRideEligible: true, availability: 'offline',
  }]]),
  rides: new Map(),
  history: new Map(),
  verifications: new Map(),
  listeners: new Map(),
};
function mockEmit(key, value) {
  (mock.listeners.get(key) || []).forEach((cb) => cb(value));
  if (key.startsWith('rider:') || key.startsWith('driverRide:')) {
    (mock.listeners.get('open:*') || []).forEach((cb) => cb([...mock.rides.values()].filter((ride) => ride.status === RIDE_STATUS.SEARCHING)));
  }
  persistMockState();
}
function mockListen(key, cb, value) {
  const list = mock.listeners.get(key) || [];
  mock.listeners.set(key, [...list, cb]);
  cb(value);
  return () => mock.listeners.set(key, (mock.listeners.get(key) || []).filter((item) => item !== cb));
}
function mockNow() { return { toMillis: () => Date.now() }; }
function mockRide(ride) { return { ...ride, createdAt: ride.createdAt || mockNow(), updatedAt: mockNow() }; }
// Completed-ride history for a given participant, newest first.
function mockHistoryFor(uid, roleField) {
  return [...mock.history.values()]
    .filter((r) => r[roleField] === uid && r.status === RIDE_STATUS.COMPLETED)
    .sort((a, b) => (b.completedAt?.toMillis?.() || 0) - (a.completedAt?.toMillis?.() || 0));
}

function persistMockState() {
  if (!useMock()) return;
  localStorage.setItem('campusride_demo_state', JSON.stringify({
    drivers: [...mock.drivers.entries()],
    rides: [...mock.rides.entries()],
    history: [...mock.history.entries()],
  }));
}

function restoreMockState() {
  try {
    const saved = JSON.parse(localStorage.getItem('campusride_demo_state') || 'null');
    if (!saved) return;
    (saved.drivers || []).forEach(([id, value]) => mock.drivers.set(id, value));
    (saved.rides || []).forEach(([id, value]) => mock.rides.set(id, value));
    (saved.history || []).forEach(([id, value]) => mock.history.set(id, value));
  } catch {
    // Ignore malformed local demo state; a fresh local demo can continue.
  }
}

restoreMockState();
window.addEventListener('storage', (event) => {
  if (event.key !== 'campusride_demo_state') return;
  restoreMockState();
  mock.listeners.forEach((callbacks, key) => {
    if (key.startsWith('rider:')) {
      const uid = key.slice(6);
      const ride = [...mock.rides.values()].find((item) => item.riderId === uid && ACTIVE_STATUSES.includes(item.status)) || null;
      callbacks.forEach((cb) => cb(ride));
    } else if (key.startsWith('driverRide:')) {
      const uid = key.slice(11);
      const ride = [...mock.rides.values()].find((item) => item.driverId === uid && ![RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED].includes(item.status)) || null;
      callbacks.forEach((cb) => cb(ride));
    } else if (key === 'open:*') {
      callbacks.forEach((cb) => cb([...mock.rides.values()].filter((ride) => ride.status === RIDE_STATUS.SEARCHING)));
    }
  });
});

// ---- Users ----------------------------------------------------------------
export async function getUser(uid) {
  if (useMock()) return mock.users.get(uid) || null;
  const snap = await getDoc(doc(db, COL.users, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createUserProfile(uid, data) {
  if (useMock()) {
    const profile = { id: uid, uid, ...data, role: data.role || ROLES.RIDER, accountStatus: ACCOUNT_STATUS.ACTIVE, verificationStatus: VERIFICATION_STATUS.APPROVED };
    mock.users.set(uid, profile);
    return profile;
  }
  // Never overwrite an existing profile (prevents duplicate profile creation).
  const ref = doc(db, COL.users, uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return { id: existing.id, ...existing.data() };
  const payload = {
    uid,
    name: data.name || '',
    email: data.email || '',
    role: data.role === ROLES.DRIVER ? ROLES.DRIVER : ROLES.RIDER, // admin never self-assigned
    phone: data.phone || '',
    college: data.college || '',
    course: data.course || '',
    graduationYear: data.graduationYear || '',
    gender: data.gender || '',
    usn: data.usn || '',
    verificationStatus: VERIFICATION_STATUS.UNSUBMITTED,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return { id: uid, ...payload };
}

export async function updateUser(uid, patch) {
  // Guard: callers must never push role/accountStatus/verificationStatus here;
  // those are admin-only and enforced by security rules too.
  const safe = { ...patch };
  delete safe.role;
  delete safe.accountStatus;
  delete safe.verificationStatus;
  await updateDoc(doc(db, COL.users, uid), { ...safe, updatedAt: serverTimestamp() });
}

export function listenUser(uid, cb) {
  if (useMock()) return mockListen(`user:${uid}`, cb, mock.users.get(uid) || null);
  return onSnapshot(doc(db, COL.users, uid), (s) =>
    cb(s.exists() ? { id: s.id, ...s.data() } : null)
  );
}

export async function listUsers() {
  const snap = await getDocs(query(collection(db, COL.users), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---- Driver profiles ------------------------------------------------------
export async function upsertDriverProfile(uid, data) {
  if (useMock()) {
    const next = {
      ...(mock.drivers.get(uid) || { uid, completedRides: 0, rating: 0, ratingCount: 0 }),
      ...data,
      uid,
      updatedAt: mockNow(),
    };
    mock.drivers.set(uid, next);
    mockEmit(`driver:${uid}`, next);
    persistMockState();
    return next;
  }
  const ref = doc(db, COL.driverProfiles, uid);
  const existing = await getDoc(ref);
  const base = existing.exists() ? {} : { createdAt: serverTimestamp(), completedRides: 0, rating: 0, ratingCount: 0 };
  await setDoc(
    ref,
    {
      uid,
      ...base,
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  const after = await getDoc(ref);
  return { id: after.id, ...after.data() };
}

export async function getDriverProfile(uid) {
  if (useMock()) return mock.drivers.get(uid) || null;
  const snap = await getDoc(doc(db, COL.driverProfiles, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function listenDriverProfile(uid, cb) {
  if (useMock()) return mockListen(`driver:${uid}`, cb, mock.drivers.get(uid) || null);
  return onSnapshot(doc(db, COL.driverProfiles, uid), (s) =>
    cb(s.exists() ? { id: s.id, ...s.data() } : null)
  );
}

// setDoc+merge (not updateDoc) so these work even if the driver skipped the
// setup form and has no driverProfiles doc yet — updateDoc would throw
// "No document to update" and the driver could never go online.
export async function setDriverAvailability(uid, available) {
  if (useMock()) {
    const next = { ...(mock.drivers.get(uid) || { uid }), availability: available ? 'available' : 'offline', lastSeen: mockNow() };
    mock.drivers.set(uid, next);
    mockEmit(`driver:${uid}`, next);
    return;
  }
  await setDoc(
    doc(db, COL.driverProfiles, uid),
    {
      uid,
      availability: available ? 'available' : 'offline',
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function setDriverLocation(uid, lat, lng) {
  if (useMock()) {
    const next = { ...(mock.drivers.get(uid) || { uid }), location: { lat, lng }, locationUpdatedAt: mockNow(), lastSeen: mockNow() };
    mock.drivers.set(uid, next);
    mockEmit(`driver:${uid}`, next);
    return;
  }
  await setDoc(
    doc(db, COL.driverProfiles, uid),
    {
      uid,
      location: { lat, lng },
      locationUpdatedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function listDriverProfiles() {
  const snap = await getDocs(collection(db, COL.driverProfiles));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Count real (non-simulated) drivers currently online & recently seen. Used to
// decide whether the demo simulator should step in.
export async function countOnlineRealDrivers(freshMs = 60000) {
  if (useMock()) {
    const now = Date.now();
    return [...mock.drivers.values()].filter((driver) => {
      if (driver.uid?.startsWith('sim_driver_') || driver.availability !== 'available') return false;
      const lastSeen = driver.lastSeen?.toMillis?.() || driver.lastSeen || 0;
      return !lastSeen || now - lastSeen <= freshMs;
    }).length;
  }
  const snap = await getDocs(
    query(collection(db, COL.driverProfiles), where('availability', '==', 'available'))
  );
  const now = Date.now();
  return snap.docs.filter((d) => {
    const data = d.data();
    if ((data.uid || d.id).startsWith('sim_driver_')) return false; // ignore bots
    const t = data.lastSeen?.toMillis ? data.lastSeen.toMillis() : 0;
    return now - t < freshMs;
  }).length;
}

// ---- Verification applications --------------------------------------------
export async function submitVerification(application) {
  // One pending application per user: reuse a stable id = `${uid}_${type}`.
  const id = `${application.uid}_${application.type}`;
  if (useMock()) {
    const stored = {
      ...application,
      id,
      status: VERIFICATION_STATUS.PENDING,
      createdAt: mockNow(),
      updatedAt: mockNow(),
      reviewedAt: null,
      reviewedBy: null,
      reviewReason: null,
    };
    mock.verifications.set(id, stored);
    if (application.type === 'college_id') {
      const u = mock.users.get(application.uid);
      if (u) mock.users.set(application.uid, { ...u, verificationStatus: VERIFICATION_STATUS.PENDING });
    }
    return stored;
  }
  const ref = doc(db, COL.verifications, id);
  await setDoc(ref, {
    ...application,
    status: VERIFICATION_STATUS.PENDING,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    reviewReason: null,
  });
  // Reflect pending state on the user profile for quick UI badges.
  if (application.type === 'college_id') {
    await updateDoc(doc(db, COL.users, application.uid), {
      verificationStatus: VERIFICATION_STATUS.PENDING,
      updatedAt: serverTimestamp(),
    });
  }
  return { id, ...application };
}

export function listenPendingVerifications(cb) {
  // Single-field query + in-memory sort (no composite index needed).
  const q = query(
    collection(db, COL.verifications),
    where('status', '==', VERIFICATION_STATUS.PENDING)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      cb(items);
    },
    onSnapErr('pendingVerifications')
  );
}

export function listenAllVerifications(cb) {
  const q = query(collection(db, COL.verifications), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function getUserVerification(uid, type = 'college_id') {
  if (useMock()) return mock.verifications.get(`${uid}_${type}`) || null;
  const snap = await getDoc(doc(db, COL.verifications, `${uid}_${type}`));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function listenUserVerifications(uid, cb) {
  const q = query(collection(db, COL.verifications), where('uid', '==', uid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

// Admin-only: approve/reject an application (admin check enforced by rules).
export async function reviewVerification(appId, adminUid, approve, reason = '') {
  const appRef = doc(db, COL.verifications, appId);
  const appSnap = await getDoc(appRef);
  if (!appSnap.exists()) throw new Error('Application not found');
  const application = appSnap.data();
  const newStatus = approve ? VERIFICATION_STATUS.APPROVED : VERIFICATION_STATUS.REJECTED;

  await updateDoc(appRef, {
    status: newStatus,
    reviewedBy: adminUid,
    reviewReason: reason || null,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (application.type === 'college_id') {
    await updateDoc(doc(db, COL.users, application.uid), {
      verificationStatus: newStatus,
      updatedAt: serverTimestamp(),
    });
  } else if (application.type === 'driver') {
    await updateDoc(doc(db, COL.driverProfiles, application.uid), {
      verificationStatus: newStatus,
      updatedAt: serverTimestamp(),
    });
  }
  return newStatus;
}

// ---- Admin user actions ---------------------------------------------------
export async function setAccountStatus(uid, status) {
  await updateDoc(doc(db, COL.users, uid), {
    accountStatus: status,
    updatedAt: serverTimestamp(),
  });
}

// ---- Ride requests (active lifecycle) -------------------------------------
export async function createRideRequest(data) {
  if (useMock()) {
    const id = `demo-ride-${Date.now()}`;
    const ride = mockRide({
      id, ...data, status: RIDE_STATUS.SEARCHING, driverId: null, driverInfo: null,
      statusHistory: [{ status: RIDE_STATUS.SEARCHING, at: mockNow() }],
    });
    mock.rides.set(id, ride);
    mockEmit(`rider:${data.riderId}`, ride);
    return id;
  }
  const ref = await addDoc(collection(db, COL.rideRequests), {
    ...data,
    status: RIDE_STATUS.SEARCHING,
    driverId: null,
    driverInfo: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    acceptedAt: null,
    statusHistory: [{ status: RIDE_STATUS.SEARCHING, at: Timestamp.now() }],
  });
  return ref.id;
}

export function listenRideRequest(rideId, cb) {
  return onSnapshot(doc(db, COL.rideRequests, rideId), (s) =>
    cb(s.exists() ? { id: s.id, ...s.data() } : null)
  );
}

export async function getRideRequest(rideId) {
  if (useMock()) return mock.rides.get(rideId) || null;
  const snap = await getDoc(doc(db, COL.rideRequests, rideId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Statuses considered "active" (an ongoing ride, not finished/cancelled).
const ACTIVE_STATUSES = [
  RIDE_STATUS.SEARCHING,
  RIDE_STATUS.ACCEPTED,
  RIDE_STATUS.DRIVER_ARRIVING,
  RIDE_STATUS.DRIVER_ARRIVED,
  RIDE_STATUS.IN_PROGRESS,
];

// Shared snapshot error handler so query failures are NEVER silent.
function onSnapErr(where) {
  return (err) => {
    // eslint-disable-next-line no-console
    console.error(`[CampusRide] Firestore listener failed (${where}):`, err.code, err.message);
  };
}

// Rider's current active request. Single-field query (riderId) + in-memory
// status filter → avoids composite indexes that fail silently.
export function listenActiveRideForRider(uid, cb) {
  if (useMock()) {
    const current = [...mock.rides.values()].find((ride) => ride.riderId === uid && ACTIVE_STATUSES.includes(ride.status)) || null;
    return mockListen(`rider:${uid}`, cb, current);
  }
  const q = query(collection(db, COL.rideRequests), where('riderId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => ACTIVE_STATUSES.includes(r.status));
      // Prefer the most recently created active ride.
      items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      cb(items[0] || null);
    },
    onSnapErr('activeRideForRider')
  );
}

// Open requests a driver could serve. Single-field query (status) + in-memory
// filter. No composite index required. `opts` = { uid, pinkEligible }.
export function listenOpenRequestsForDriver(opts, cb, onError) {
  if (useMock()) return mockListen('open:*', cb, [...mock.rides.values()].filter((ride) => ride.status === RIDE_STATUS.SEARCHING));
  const q = query(collection(db, COL.rideRequests), where('status', '==', RIDE_STATUS.SEARCHING));
  return onSnapshot(
    q,
    (snap) => {
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      cb(items);
    },
    (err) => {
      onSnapErr('openRequestsForDriver')(err);
      onError?.(err);
    }
  );
}

// One-shot fetch of the open requests a driver could serve. Used as a
// resilience fallback alongside the realtime listener: mobile browsers throttle
// or suspend the realtime websocket while the app is backgrounded, so we re-sync
// immediately whenever the driver brings the app back to the foreground.
export async function getOpenRequests() {
  if (useMock()) {
    return [...mock.rides.values()].filter((ride) => ride.status === RIDE_STATUS.SEARCHING);
  }
  const snap = await getDocs(
    query(collection(db, COL.rideRequests), where('status', '==', RIDE_STATUS.SEARCHING))
  );
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return items;
}

// Driver's current active (claimed) ride. Single-field query (driverId) +
// in-memory status filter.
export function listenActiveRideForDriver(uid, cb) {
  if (useMock()) {
    const current = [...mock.rides.values()].find((ride) => ride.driverId === uid && ![RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED].includes(ride.status)) || null;
    return mockListen(`driverRide:${uid}`, cb, current);
  }
  const q = query(collection(db, COL.rideRequests), where('driverId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) =>
          [
            RIDE_STATUS.ACCEPTED,
            RIDE_STATUS.DRIVER_ARRIVING,
            RIDE_STATUS.DRIVER_ARRIVED,
            RIDE_STATUS.IN_PROGRESS,
          ].includes(r.status)
        );
      items.sort((a, b) => (b.acceptedAt?.toMillis?.() || 0) - (a.acceptedAt?.toMillis?.() || 0));
      cb(items[0] || null);
    },
    onSnapErr('activeRideForDriver')
  );
}

// CRITICAL: atomic single-claim. Only one driver can win a `searching` request.
// Uses a Firestore transaction so a concurrent accept fails cleanly.
export async function claimRideRequest(rideId, driver) {
  if (useMock()) {
    const ride = mock.rides.get(rideId);
    if (!ride || ride.status !== RIDE_STATUS.SEARCHING) throw new Error('This ride has already been taken');
    const next = mockRide({ ...ride, status: RIDE_STATUS.ACCEPTED, driverId: driver.uid, driverInfo: driver, acceptedAt: mockNow(), statusHistory: [...ride.statusHistory, { status: RIDE_STATUS.ACCEPTED, at: mockNow() }] });
    mock.rides.set(rideId, next);
    mockEmit(`rider:${ride.riderId}`, next);
    mockEmit(`driverRide:${driver.uid}`, next);
    return next;
  }
  const ref = doc(db, COL.rideRequests, rideId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Ride request no longer exists');
    const ride = snap.data();
    if (ride.status !== RIDE_STATUS.SEARCHING) {
      throw new Error('This ride has already been taken');
    }
    if (ride.riderId === driver.uid) {
      throw new Error('You cannot accept your own ride');
    }
    tx.update(ref, {
      status: RIDE_STATUS.ACCEPTED,
      driverId: driver.uid,
      driverInfo: {
        uid: driver.uid,
        name: driver.name,
        phone: driver.phone || '',
        vehicleType: driver.vehicleType || '',
        vehicleModel: driver.vehicleModel || '',
        vehicleNumber: driver.vehicleNumber || '',
        rating: driver.rating || 0,
        usn: driver.usn || '',
      },
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      statusHistory: [...(ride.statusHistory || []), { status: RIDE_STATUS.ACCEPTED, at: Timestamp.now() }],
    });
    return { id: rideId, ...ride, status: RIDE_STATUS.ACCEPTED };
  });
}

// Validated status transition for the active ride.
export async function advanceRideStatus(rideId, from, to, extra = {}) {
  if (useMock()) {
    const ride = mock.rides.get(rideId);
    if (!ride || ride.status !== from) throw new Error(`Ride is no longer ${from}`);
    const next = mockRide({ ...ride, ...extra, status: to, statusHistory: [...ride.statusHistory, { status: to, at: mockNow() }] });
    mock.rides.set(rideId, next);
    mockEmit(`rider:${ride.riderId}`, next);
    if (next.driverId) mockEmit(`driverRide:${next.driverId}`, next);
    return;
  }
  const allowed = RIDE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Illegal status change ${from} → ${to}`);
  }
  const ref = doc(db, COL.rideRequests, rideId);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data() : {};
  await updateDoc(ref, {
    status: to,
    updatedAt: serverTimestamp(),
    statusHistory: [...(prev.statusHistory || []), { status: to, at: Timestamp.now() }],
    ...extra,
  });
}

export async function updateRideRequest(rideId, patch) {
  if (useMock()) {
    const ride = mock.rides.get(rideId);
    if (!ride) throw new Error('Ride not found');
    const next = mockRide({ ...ride, ...patch });
    mock.rides.set(rideId, next);
    mockEmit(`rider:${ride.riderId}`, next);
    if (next.driverId) mockEmit(`driverRide:${next.driverId}`, next);
    return;
  }
  await updateDoc(doc(db, COL.rideRequests, rideId), { ...patch, updatedAt: serverTimestamp() });
}

export function listenAllRideRequests(cb) {
  const q = query(collection(db, COL.rideRequests), orderBy('createdAt', 'desc'), qlimit(200));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

// ---- Completed rides (history) --------------------------------------------
// On completion we copy the ride into `rides` for durable history and feedback.
export async function archiveCompletedRide(ride, extra = {}) {
  if (useMock()) {
    const history = { ...ride, ...extra, id: ride.id, requestId: ride.id, status: RIDE_STATUS.COMPLETED, completedAt: mockNow() };
    mock.history.set(ride.id, history);
    mockEmit(`history:riderId:${ride.riderId}`, mockHistoryFor(ride.riderId, 'riderId'));
    if (ride.driverId) mockEmit(`history:driverId:${ride.driverId}`, mockHistoryFor(ride.driverId, 'driverId'));
    persistMockState();
    return ride.id;
  }
  // Use the request id as the history id. Completion can be retried after a
  // network timeout, so an auto-generated id would create duplicate history.
  const ref = doc(db, COL.rides, ride.id);
  await setDoc(ref, {
    requestId: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    pickup: ride.pickup,
    destination: ride.destination,
    pickupCoords: ride.pickupCoords,
    destinationCoords: ride.destinationCoords,
    distanceKm: ride.distanceKm,
    durationMin: ride.durationMin,
    fare: ride.fare,
    vehicleType: ride.vehicleType,
    pinkRide: ride.pinkRide || false,
    status: RIDE_STATUS.COMPLETED,
    completedAt: serverTimestamp(),
    createdAt: ride.createdAt || serverTimestamp(),
    ...extra,
  });
  return ref.id;
}

// Find the archived history doc for a given ride request (used when the rider
// rates a ride the driver already archived on completion).
export async function findArchivedRideByRequest(requestId) {
  if (useMock()) return mock.history.get(requestId) || null;
  // The history doc reuses the ride-request id as its document id (see
  // archiveCompletedRide), so a direct get works. A `where('requestId', '==')`
  // query is NOT usable here: Firestore rules are not filters, and the rides
  // read rule only permits docs where riderId/driverId == the caller, so any
  // query without that constraint is rejected with "insufficient permissions".
  const snap = await getDoc(doc(db, COL.rides, requestId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function listenRidesForUser(uid, roleField, cb) {
  // roleField is 'riderId' or 'driverId'. Single-field query + in-memory sort
  // avoids a composite index.
  if (useMock()) {
    return mockListen(`history:${roleField}:${uid}`, cb, mockHistoryFor(uid, roleField));
  }
  const q = query(collection(db, COL.rides), where(roleField, '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.completedAt?.toMillis?.() || 0) - (a.completedAt?.toMillis?.() || 0));
      cb(items);
    },
    onSnapErr('ridesForUser')
  );
}

export function listenAllRides(cb) {
  const q = query(collection(db, COL.rides), orderBy('completedAt', 'desc'), qlimit(200));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onSnapErr('allRides'));
}

export async function submitRideFeedback(rideDocId, driverUid, rating, comment) {
  // Store feedback on the ride and update driver's Bayesian-ish average.
  if (useMock()) {
    const h = mock.history.get(rideDocId);
    if (h) {
      mock.history.set(rideDocId, { ...h, rating, comment: comment || '', ratedAt: mockNow() });
      mockEmit(`history:riderId:${h.riderId}`, mockHistoryFor(h.riderId, 'riderId'));
      if (h.driverId) mockEmit(`history:driverId:${h.driverId}`, mockHistoryFor(h.driverId, 'driverId'));
    }
    if (driverUid && mock.drivers.has(driverUid)) {
      const d = mock.drivers.get(driverUid);
      const count = (d.ratingCount || 0) + 1;
      const avg = ((d.rating || 0) * (d.ratingCount || 0) + rating) / count;
      const next = {
        ...d,
        rating: Math.round(avg * 100) / 100,
        ratingCount: count,
        completedRides: (d.completedRides || 0) + 1,
      };
      mock.drivers.set(driverUid, next);
      mockEmit(`driver:${driverUid}`, next);
    }
    persistMockState();
    return;
  }
  await updateDoc(doc(db, COL.rides, rideDocId), {
    rating,
    comment: comment || '',
    ratedAt: serverTimestamp(),
  });
  if (driverUid) {
    const dref = doc(db, COL.driverProfiles, driverUid);
    const dsnap = await getDoc(dref);
    if (dsnap.exists()) {
      const d = dsnap.data();
      const count = (d.ratingCount || 0) + 1;
      const avg = ((d.rating || 0) * (d.ratingCount || 0) + rating) / count;
      await updateDoc(dref, {
        rating: Math.round(avg * 100) / 100,
        ratingCount: count,
        completedRides: (d.completedRides || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    }
  }
}

// ---- Reports --------------------------------------------------------------
export async function createReport(report) {
  const ref = await addDoc(collection(db, COL.reports), {
    ...report,
    status: 'open',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function listenAllReports(cb) {
  const q = query(collection(db, COL.reports), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
