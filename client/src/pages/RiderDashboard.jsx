import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import MapView from '../components/MapView';
import {
  setDriverAvailability,
  setDriverLocation,
  listenOpenRequestsForDriver,
  getOpenRequests,
  listenActiveRideForDriver,
  claimRideRequest,
  advanceRideStatus,
  updateRideRequest,
  archiveCompletedRide,
  getRideRequest,
} from '../services/firestore';
import { watchPositionThrottled, getCurrentPosition } from '../services/location';
import RideRequestCard from '../components/RideRequestCard';
import RecentRides from '../components/RecentRides';
import {
  RIDE_STATUS,
  VERIFICATION_STATUS,
  OTP_MAX_ATTEMPTS,
  CURRENCY,
} from '../config/appConfig';
import {
  Power,
  Star,
  MapPin,
  CheckCircle2,
  Navigation,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Bike,
} from 'lucide-react';

const RiderDashboard = () => {
  const navigate = useNavigate();
  const { uid, user, driverProfile, switchMode } = useAuth();

  const [online, setOnline] = useState(false);
  const [myLoc, setMyLoc] = useState(null);
  const [locError, setLocError] = useState('');
  const [openRequests, setOpenRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [busy, setBusy] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [listenError, setListenError] = useState('');
  // Requests this driver declined / let expire — hidden locally so the driver
  // isn't re-shown the same card (the request stays open for other drivers).
  const [dismissed, setDismissed] = useState(() => new Set());
  const stopWatchRef = useRef(null);
  const sharingRef = useRef(false);
  const prevRequestCountRef = useRef(0);
  const pinkEligible = !!driverProfile?.pinkRideEligible;

  const dismiss = (ride) => setDismissed((prev) => new Set(prev).add(ride.id));
  const visibleRequests = openRequests.filter((r) => !dismissed.has(r.id));

  // No verification gate for drivers — anyone in driver mode can operate.
  // (Verification status is still shown as a badge, but never blocks.)
  const approved = true;

  // Listen for this driver's active (claimed) ride.
  useEffect(() => {
    if (!uid) return undefined;
    const unsub = listenActiveRideForDriver(uid, setActiveRide);
    return unsub;
  }, [uid]);

  // Listen for open requests whenever online and not already on a trip.
  // Depends only on stable primitives so it doesn't churn on every auth tick.
  useEffect(() => {
    if (!online || activeRide) {
      setOpenRequests([]);
      return undefined;
    }
    setListenError('');
    const unsub = listenOpenRequestsForDriver(
      { uid, pinkEligible },
      setOpenRequests,
      (err) => setListenError(err.code === 'permission-denied'
        ? 'Permission denied reading ride requests. Publish the latest Firestore rules.'
        : `Live updates error: ${err.message}`)
    );
    return unsub;
  }, [online, activeRide?.id, uid, pinkEligible]);

  // Location sharing: starts only when the driver goes online and grants
  // permission; stops when offline or on unmount. Writes are throttled.
  const startSharing = async () => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setLocError('');
    try {
      const first = await getCurrentPosition();
      setMyLoc(first);
      await setDriverLocation(uid, first.lat, first.lng);
    } catch (e) {
      setLocError(e.message);
      sharingRef.current = false; // allow a later retry
      throw e;
    }
    stopWatchRef.current = watchPositionThrottled(
      async (pos) => {
        setMyLoc(pos);
        try {
          await setDriverLocation(uid, pos.lat, pos.lng);
        } catch {
          /* transient write error ignored; next tick retries */
        }
      },
      (err) => setLocError(err.message)
    );
  };

  const stopSharing = () => {
    sharingRef.current = false;
    if (stopWatchRef.current) {
      stopWatchRef.current();
      stopWatchRef.current = null;
    }
  };

  useEffect(() => () => stopSharing(), []);

  // Keep the driver's availability heartbeat fresh. GPS only fires when the
  // position actually changes, so a stationary driver's `lastSeen` would go
  // stale and the demo simulator would step in / other clients would treat the
  // captain as offline. A light heartbeat keeps "online" accurate. When the
  // app is closed / backgrounded the heartbeat stops, so the driver correctly
  // ages out (after DRIVER_FRESH_MS) instead of appearing online forever.
  useEffect(() => {
    if (!online || !uid) return undefined;
    setDriverAvailability(uid, true).catch(() => {});
    const id = setInterval(() => {
      setDriverAvailability(uid, true).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [online, uid]);

  // Restore the online state from Firestore after a reload / installed-app
  // relaunch. Without this the local UI can say "offline" (listener not running)
  // while Firestore still marks the captain available — then requests would be
  // offered to nobody. We only auto-resume when Firestore says "available" (we
  // never force the driver offline here, to avoid racing a manual toggle).
  useEffect(() => {
    if (driverProfile?.availability !== 'available') return;
    setOnline(true);
    startSharing().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverProfile?.availability]);

  // Alert (vibrate) when a new incoming request appears.
  useEffect(() => {
    if (visibleRequests.length > prevRequestCountRef.current && visibleRequests.length > 0) {
      navigator.vibrate?.([140, 70, 140]);
    }
    prevRequestCountRef.current = visibleRequests.length;
  }, [visibleRequests.length]);

  // Mobile resilience: mobile browsers throttle/suspend the realtime websocket
  // while the installed app is backgrounded, so a request that arrives while the
  // captain is away would otherwise not show until much later. Re-sync the open
  // request feed the moment the app returns to the foreground.
  useEffect(() => {
    if (!online || activeRide || !uid) return undefined;
    const sync = () => {
      if (document.visibilityState === 'hidden') return;
      getOpenRequests()
        .then((items) => setOpenRequests(items))
        .catch(() => {});
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, [online, activeRide, uid]);

  const toggleOnline = async () => {
    setLocError('');
    if (!online) {
      // Go online immediately so the request listener starts (and the button
      // flips to "online"). Persisting availability is done right after, and a
      // failure there is surfaced instead of silently leaving the driver stuck.
      setOnline(true);
      try {
        await setDriverAvailability(uid, true);
      } catch (e) {
        setLocError(`Could not set availability: ${e?.message || e}`);
      }
      // Location sharing is best-effort: if the user denies GPS we still stay
      // online (the rider just won't see a live dot).
      startSharing().catch(() => {
        /* locError already set; staying online is fine */
      });
    } else {
      stopSharing();
      setOnline(false);
      try {
        await setDriverAvailability(uid, false);
      } catch (e) {
        setLocError(`Could not set availability: ${e?.message || e}`);
      }
    }
  };

  const accept = async (ride) => {
    setClaimError('');
    setBusy(true);
    try {
      // Atomic single-claim transaction — only one driver can win.
      await claimRideRequest(ride.id, {
        uid,
        name: driverProfile?.name || user?.name || 'Captain',
        phone: user?.phone || '',
        vehicleType: driverProfile?.vehicleType || '',
        vehicleModel: driverProfile?.vehicleModel || '',
        vehicleNumber: driverProfile?.vehicleNumber || '',
        rating: driverProfile?.rating || 0,
        usn: driverProfile?.usn || user?.usn || '',
      });
      // Immediately move to "arriving".
      await advanceRideStatus(ride.id, RIDE_STATUS.ACCEPTED, RIDE_STATUS.DRIVER_ARRIVING);
    } catch (e) {
      setClaimError(e.message || 'Could not accept — it may have been taken.');
    } finally {
      setBusy(false);
    }
  };

  const markArrived = async () => {
    setBusy(true);
    try {
      await advanceRideStatus(activeRide.id, RIDE_STATUS.DRIVER_ARRIVING, RIDE_STATUS.DRIVER_ARRIVED);
    } finally {
      setBusy(false);
    }
  };

  // OTP verification before starting. Attempts are limited and the code is
  // invalidated on success. NOTE: this is demonstration-grade — see docs.
  const verifyAndStart = async () => {
    setPinError('');
    const fresh = await getRideRequest(activeRide.id);
    if (!fresh) return;
    if ((fresh.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      setPinError('Too many incorrect attempts. Ask the rider to re-request if needed.');
      return;
    }
    if (fresh.status !== RIDE_STATUS.DRIVER_ARRIVED) {
      setPinError('Mark that you have arrived at pickup first.');
      return;
    }
    if (enteredPin.trim() !== String(fresh.otp)) {
      await updateRideRequest(activeRide.id, { otpAttempts: (fresh.otpAttempts || 0) + 1 });
      setPinError('Incorrect PIN. Please try again.');
      return;
    }
    setBusy(true);
    try {
      await advanceRideStatus(activeRide.id, RIDE_STATUS.DRIVER_ARRIVED, RIDE_STATUS.IN_PROGRESS, {
        otpVerified: true,
        otp: null, // invalidate the code after successful verification
      });
      setEnteredPin('');
    } catch (e) {
      setPinError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const completeRide = async () => {
    setBusy(true);
    try {
      // Archive to durable history, then mark the request completed.
      await archiveCompletedRide(activeRide);
      await advanceRideStatus(activeRide.id, RIDE_STATUS.IN_PROGRESS, RIDE_STATUS.COMPLETED, {
        completedAt: new Date(),
      });
    } finally {
      setBusy(false);
    }
  };

  const driverName = driverProfile?.name || user?.name || 'Captain';
  const initials = driverName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header
        title="Captain Dashboard"
        showBack={false}
        showHelp
        rightElement={
          <button
            onClick={() => {
              switchMode('passenger');
              navigate('/home');
            }}
            className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100"
          >
            Passenger mode
          </button>
        }
      />

      <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
        {/* Optional, non-blocking verification note (does not restrict usage) */}
        {driverProfile?.verificationStatus !== VERIFICATION_STATUS.APPROVED && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-blue-900">
              <span className="font-bold">Tip:</span> submit your driver details for a verified badge.{' '}
              <button onClick={() => navigate('/driver-setup')} className="font-bold underline">
                Review driver details
              </button>
            </div>
          </div>
        )}

        {/* Online toggle */}
        <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${online ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-gray-900">{online ? 'You are online' : 'You are offline'}</h3>
              <p className="text-xs text-gray-500">
                {online ? 'Sharing location · receiving requests' : 'Go online to receive rides'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleOnline}
            className={`px-4 py-2 rounded-2xl font-black text-xs ${
              online ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-600 text-white'
            }`}
          >
            {online ? 'Go offline' : 'Go online'}
          </button>
        </div>

        {locError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{locError}</span>
          </div>
        )}

        {/* Driver identity card */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border-2 border-white/20 font-black text-lg flex items-center justify-center">
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-black">{driverName}</h2>
                <p className="text-xs text-sky-400 font-mono">{driverProfile?.usn || user?.usn || ''}</p>
                <div className="flex items-center space-x-2 mt-1 text-xs">
                  <span className="font-black text-amber-400 flex items-center">
                    <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                    {driverProfile?.rating || '—'}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300">{driverProfile?.completedRides || 0} rides</span>
                </div>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${approved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {approved ? 'Verified' : driverProfile?.verificationStatus || 'unverified'}
            </span>
          </div>
          {myLoc && (
            <p className="mt-3 pt-3 border-t border-slate-700/60 text-[11px] text-slate-300">
              Live location: {myLoc.lat.toFixed(4)}, {myLoc.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Active ride workflow */}
        {activeRide ? (
          <div className="p-5 bg-white rounded-3xl border-2 border-blue-500 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
                {activeRide.status.replace(/_/g, ' ')}
              </span>
              <span className="text-base font-black text-gray-900">
                {CURRENCY}
                {activeRide.fare}
              </span>
            </div>

            <div className="h-40 rounded-2xl overflow-hidden">
              <MapView
                center={[activeRide.pickupCoords.lat, activeRide.pickupCoords.lng]}
                pickupCoords={activeRide.pickupCoords}
                dropCoords={activeRide.destinationCoords}
                driverCoords={myLoc}
                driverType={activeRide.vehicleType}
                className="h-full w-full"
              />
            </div>

            <div className="text-xs space-y-1">
              <p className="flex items-center space-x-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" /><span className="font-bold truncate">{activeRide.pickup}</span></p>
              <p className="flex items-center space-x-1.5"><MapPin className="w-3.5 h-3.5 text-red-600" /><span className="font-bold truncate">{activeRide.destination}</span></p>
              {activeRide.riderInfo?.name && (
                <p className="text-gray-500">Rider: {activeRide.riderInfo.name}</p>
              )}
            </div>

            {/* Stepwise actions */}
            {activeRide.status === RIDE_STATUS.DRIVER_ARRIVING && (
              <button onClick={markArrived} disabled={busy} className={primaryBtn}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                <span>I've arrived at pickup</span>
              </button>
            )}

            {activeRide.status === RIDE_STATUS.DRIVER_ARRIVED && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div>
                  <h4 className="font-black text-xs uppercase text-gray-800">Enter rider's pickup PIN</h4>
                  <p className="text-[11px] text-gray-500">Ask the rider for the code shown on their screen.</p>
                </div>
                <input
                  inputMode="numeric"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="----"
                  className="w-full text-center text-2xl font-black tracking-[0.5em] py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
                {pinError && <p className="text-xs text-red-600 font-bold">{pinError}</p>}
                <button onClick={verifyAndStart} disabled={busy} className={primaryBtn}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Verify PIN &amp; start ride</span>
                </button>
              </div>
            )}

            {activeRide.status === RIDE_STATUS.IN_PROGRESS && (
              <button onClick={completeRide} disabled={busy} className={`${primaryBtn} bg-emerald-600 hover:bg-emerald-700`}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Complete ride</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Incoming requests */}
            {claimError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl">{claimError}</div>
            )}
            {listenError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl mb-2">
                {listenError}
              </div>
            )}
            {online && (
              <div>
                <p className="text-xs font-black uppercase text-gray-400 mb-2">
                  Incoming requests ({visibleRequests.length})
                </p>
                {visibleRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                    Waiting for ride requests…
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleRequests.map((r) => (
                      <RideRequestCard
                        key={r.id}
                        ride={r}
                        busy={busy}
                        onAccept={accept}
                        onDecline={dismiss}
                        onExpire={dismiss}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {!online && (
              <div className="py-10 text-center text-sm text-gray-400">
                <Bike className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Go online to start receiving campus ride requests.
              </div>
            )}
          </>
        )}

        {/* Ride history — completed trips tracked for this captain */}
        <RecentRides roleField="driverId" title="Your recent trips" />
      </div>

      <BottomNav />
    </div>
  );
};

const primaryBtn =
  'w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-sm shadow-md flex items-center justify-center space-x-2 disabled:opacity-60';

export default RiderDashboard;
