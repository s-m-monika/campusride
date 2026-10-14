import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRide } from '../context/RideContext';
import { listenDriverProfile } from '../services/firestore';
import Header from '../components/Header';
import MapView from '../components/MapView';
import {
  Phone,
  Star,
  MapPin,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { RIDE_STATUS, LOCATION_STALE_MS, CURRENCY } from '../config/appConfig';

// Rider's live view. Everything is driven by the Firestore ride listener in
// RideContext (activeRide) plus a listener on the assigned driver's live
// location. No simulation — if there's no GPS fix yet, we say so.
const RideTracking = () => {
  const navigate = useNavigate();
  const { activeRide, justCompleted, cancelRide, retrySearch } = useRide();

  const [driverProfile, setDriverProfile] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [driverLocAt, setDriverLocAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Tick for the "stale location" freshness indicator.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Ride just completed → go rate it. Otherwise, if there's no active ride,
  // return home.
  useEffect(() => {
    if (justCompleted) {
      navigate('/completed');
    } else if (!activeRide) {
      navigate('/home');
    }
  }, [activeRide, justCompleted, navigate]);

  // Subscribe to the assigned driver's live location once we have one.
  const driverId = activeRide?.driverId;
  useEffect(() => {
    if (!driverId) {
      setDriverLoc(null);
      return undefined;
    }
    const unsub = listenDriverProfile(driverId, (dp) => {
      setDriverProfile(dp);
      if (dp?.location) {
        setDriverLoc(dp.location);
        setDriverLocAt(dp.locationUpdatedAt?.toMillis ? dp.locationUpdatedAt.toMillis() : Date.now());
      }
    });
    return unsub;
  }, [driverId]);

  if (!activeRide) return null;

  const status = activeRide.status;
  const searching = status === RIDE_STATUS.SEARCHING;
  const noDriver = status === RIDE_STATUS.NO_DRIVER_FOUND;
  const assigned = !!activeRide.driverInfo;
  // The ride snapshot is useful as an immediate fallback, but the live
  // profile is authoritative for vehicle, rating, photo, and location data.
  const driver = { ...activeRide.driverInfo, ...driverProfile };
  const otpDigits = String(activeRide.otp || '').split('');
  const locationStale = driverLocAt && now - driverLocAt > LOCATION_STALE_MS;

  const statusText = {
    searching: 'Finding you a nearby captain…',
    accepted: 'Captain assigned — getting ready',
    driver_arriving: 'Captain is on the way',
    driver_arrived: 'Captain has arrived at pickup',
    in_progress: 'On the way to your destination',
  }[status] || 'Ride';

  const driverInitials = driver?.name
    ? driver.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CP';

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header title="" showBack={false} showSOS showHelp={false} rightElement={
        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
          Live
        </span>
      } />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-[42vh] w-full relative">
          <MapView
            center={[activeRide.pickupCoords.lat, activeRide.pickupCoords.lng]}
            zoom={14}
            pickupCoords={activeRide.pickupCoords}
            dropCoords={activeRide.destinationCoords}
            driverCoords={driverLoc}
            driverType={activeRide.vehicleType}
            showRoute={false}
            className="h-full w-full rounded-none"
          />
          <div className="absolute top-4 left-4 z-20 bg-slate-900/90 text-white px-3.5 py-1.5 rounded-2xl shadow-lg flex items-center space-x-2">
            {searching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            <span className="text-xs font-bold">{statusText}</span>
          </div>
        </div>

        <div className="flex-1 -mt-6 bg-white rounded-t-3xl shadow-2xl z-20 px-5 pt-4 pb-6 flex flex-col overflow-y-auto border-t border-gray-100">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-3" />

          {/* SEARCHING */}
          {searching && (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
                <Radio className="w-7 h-7 text-emerald-500 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-gray-900">Looking for a captain</h3>
              <p className="text-xs text-gray-500">
                We're offering your request to nearby verified drivers. This usually takes under a minute.
              </p>
            </div>
          )}

          {/* NO DRIVER FOUND */}
          {noDriver && (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-black text-gray-900">No captain available</h3>
              <p className="text-xs text-gray-500">No nearby driver accepted in time. You can try again.</p>
              <button
                onClick={retrySearch}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-2xl text-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Search again</span>
              </button>
            </div>
          )}

          {/* ASSIGNED — show driver + OTP */}
          {assigned && !searching && !noDriver && (
            <div className="space-y-4">
              {/* OTP card — visible only to the rider (this is their session) */}
              {status !== RIDE_STATUS.IN_PROGRESS && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase text-emerald-700">Pickup PIN</p>
                      <p className="text-[11px] text-emerald-800/80">Share with your captain to start</p>
                    </div>
                    <div className="flex space-x-2">
                      {otpDigits.map((d, i) => (
                        <div
                          key={i}
                          className="w-9 h-10 bg-white rounded-xl border-2 border-emerald-300 flex items-center justify-center font-black text-lg text-gray-900"
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {status === RIDE_STATUS.IN_PROGRESS && (
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-xs text-indigo-800 font-bold flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ride started. Enjoy your trip to {activeRide.destination}.</span>
                </div>
              )}

              {/* Driver card */}
              <div className="p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  {driver.vehicleNumber && (
                    <span className="inline-block px-2.5 py-0.5 bg-yellow-300 text-gray-900 font-mono font-black text-xs rounded-md border border-yellow-400 mb-1">
                      {driver.vehicleNumber}
                    </span>
                  )}
                  <p className="text-xs font-bold text-gray-700">
                    {driver.vehicleModel} · {driver.vehicleType}
                  </p>
                  <p className="text-sm font-extrabold text-blue-600 mt-0.5">{driver.name}</p>
                  {driver.phone && (
                    <a
                      href={`tel:${driver.phone}`}
                      className="inline-flex items-center space-x-1 mt-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{driver.phone}</span>
                    </a>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-black text-lg flex items-center justify-center">
                    {driverInitials}
                  </div>
                  {driver.rating > 0 && (
                    <div className="flex items-center space-x-0.5 mt-1 text-xs font-extrabold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{driver.rating}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver location freshness */}
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="flex items-center space-x-1.5 text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {driverLoc
                      ? locationStale
                        ? 'Captain location may be out of date'
                        : 'Captain location is live'
                      : 'Waiting for captain location…'}
                  </span>
                </span>
                {locationStale && <span className="text-amber-600 font-bold">stale</span>}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
                <span className="text-gray-500 font-semibold">
                  {activeRide.distanceKm} km · ~{activeRide.durationMin} min
                </span>
                <span className="font-black text-gray-900">
                  {CURRENCY}
                  {activeRide.fare}
                </span>
              </div>
            </div>
          )}

          {/* Cancel (allowed before the ride starts) */}
          {status !== RIDE_STATUS.IN_PROGRESS && (
            <button
              onClick={cancelRide}
              className="mt-4 w-full py-2 text-xs font-semibold text-gray-400 hover:text-red-500"
            >
              Cancel ride
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RideTracking;
