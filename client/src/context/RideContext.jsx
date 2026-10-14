import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  createRideRequest,
  listenActiveRideForRider,
  advanceRideStatus,
  findArchivedRideByRequest,
  archiveCompletedRide,
  submitRideFeedback,
} from '../services/firestore';
import { calculateFare } from '../services/geo';
import { runSimulatedTrip } from '../services/simulator';
import { RIDE_STATUS, OTP_LENGTH, SIMULATE_DRIVERS } from '../config/appConfig';

const RideContext = createContext();

// A small set of known campus landmarks offered as search shortcuts. These are
// real coordinates used only to seed the search box — the actual route and
// distance always come from OSRM, never from any precomputed table.
export const CAMPUS_SHORTCUTS = [
  { name: 'Sambhram Institute of Technology', desc: 'Adityanagar, Vidyaranyapura', lat: 13.0805, lng: 77.5458, isCampus: true },
  { name: 'MS Palya Circle', desc: 'Vidyaranyapura, Bengaluru', lat: 13.076, lng: 77.558 },
  { name: 'Lakshmipura Cross', desc: 'Vidyaranyapura, Bengaluru', lat: 13.09, lng: 77.538 },
  { name: 'Jalahalli Cross', desc: 'Peenya / Jalahalli, Bengaluru', lat: 13.0538, lng: 77.5255 },
  { name: '8th Mile', desc: 'T. Dasarahalli, Bengaluru', lat: 13.045, lng: 77.51 },
  { name: 'BEL Circle', desc: 'Jalahalli East, Bengaluru', lat: 13.04, lng: 77.55 },
];

function generateOtp(len = OTP_LENGTH) {
  const values = new Uint32Array(len);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < len; i += 1) values[i] = Math.floor(Math.random() * 0xffffffff);
  }
  return Array.from(values, (value) => String(value % 10)).join('');
}

export const RideProvider = ({ children }) => {
  const { uid, user } = useAuth();

  // Selected trip inputs ({ name, lat, lng } objects, not just strings).
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [vehicleType, setVehicleType] = useState('Bike');
  const [pinkRide, setPinkRide] = useState(false);

  // Computed route from OSRM.
  const [route, setRoute] = useState(null); // { distanceKm, durationMin, geometry }
  const [routeError, setRouteError] = useState('');

  // Active ride (rider's perspective) kept live by Firestore listener.
  const [activeRide, setActiveRide] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const bookingGuard = useRef(false); // prevents duplicate requests on double-click
  // Retains the last ride once it leaves the active query (status=completed) so
  // the rider can still rate it on the completed screen.
  const lastCompletedRef = useRef(null);
  const [justCompleted, setJustCompleted] = useState(null);
  // Tracks the running demo simulator so we start it once per ride and cancel
  // it if the ride ends or a real driver takes over.
  const simCancelRef = useRef(null);
  const simRideIdRef = useRef(null);

  // Subscribe to the rider's active ride.
  useEffect(() => {
    if (!uid) {
      setActiveRide(null);
      return undefined;
    }
    const unsub = listenActiveRideForRider(uid, (ride) => {
      setActiveRide((prev) => {
        // If a ride that was in progress just left the active set, treat it as
        // completed and remember it so the rider can rate it.
        if (prev && !ride && prev.status === RIDE_STATUS.IN_PROGRESS) {
          lastCompletedRef.current = prev;
          setJustCompleted(prev);
        }
        return ride;
      });
    });
    return unsub;
  }, [uid]);

  const clearJustCompleted = useCallback(() => setJustCompleted(null), []);

  // Demo simulator control: when the rider's ride enters `searching`, start a
  // mock-driver trip once. Cancel it when the ride leaves the active set.
  useEffect(() => {
    if (!SIMULATE_DRIVERS) return undefined;

    const rideId = activeRide?.id || null;
    const status = activeRide?.status || null;

    // Start the simulator exactly once per searching ride.
    if (rideId && status === RIDE_STATUS.SEARCHING && simRideIdRef.current !== rideId) {
      simRideIdRef.current = rideId;
      simCancelRef.current = runSimulatedTrip(rideId);
    }

    // If the ride is gone (completed/cancelled), stop any running simulator.
    if (!rideId && simCancelRef.current) {
      simCancelRef.current();
      simCancelRef.current = null;
      simRideIdRef.current = null;
    }
    return undefined;
  }, [activeRide?.id, activeRide?.status]);

  const fare = route ? calculateFare(vehicleType, route.distanceKm) : null;

  // Create a ride request (status: searching). Guards against duplicates.
  const requestRide = useCallback(async () => {
    if (bookingGuard.current) return { success: false, message: 'Request already in progress' };
    if (!uid) return { success: false, message: 'Please sign in first.' };
    if (!pickup || !destination) return { success: false, message: 'Choose pickup and destination.' };
    if (!route) return { success: false, message: 'Calculate the route first.' };
    if (activeRide) return { success: false, message: 'You already have an active ride.' };

    bookingGuard.current = true;
    setBookingLoading(true);
    try {
      const otp = generateOtp();
      const id = await createRideRequest({
        riderId: uid,
        riderInfo: {
          name: user?.name || 'Student',
          phone: user?.phone || '',
          usn: user?.usn || '',
        },
        pickup: pickup.name,
        destination: destination.name,
        pickupCoords: { lat: pickup.lat, lng: pickup.lng },
        destinationCoords: { lat: destination.lat, lng: destination.lng },
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        fare: calculateFare(vehicleType, route.distanceKm),
        vehicleType,
        pinkRide,
        otp, // readable only by rider + assigned driver via security rules
        otpVerified: false,
        otpAttempts: 0,
      });
      return { success: true, rideId: id };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setBookingLoading(false);
      // Release the guard shortly after so a genuine retry is possible.
      setTimeout(() => {
        bookingGuard.current = false;
      }, 1500);
    }
  }, [uid, user, pickup, destination, route, vehicleType, pinkRide, activeRide]);

  const cancelRide = useCallback(async () => {
    if (!activeRide) return;
    await advanceRideStatus(activeRide.id, activeRide.status, RIDE_STATUS.CANCELLED, {
      cancelledBy: 'rider',
    });
  }, [activeRide]);

  const retrySearch = useCallback(async () => {
    if (!activeRide) return;
    if (activeRide.status === RIDE_STATUS.NO_DRIVER_FOUND) {
      await advanceRideStatus(activeRide.id, activeRide.status, RIDE_STATUS.SEARCHING, {
        createdAt: new Date(),
      });
    }
  }, [activeRide]);

  // Rider submits a rating for a completed ride. The driver already archived the
  // ride into history on completion, so we attach the rating to that doc (or
  // archive as a fallback if it's somehow missing).
  const completeAndRate = useCallback(
    async (rating, comment) => {
      const ride = lastCompletedRef.current || activeRide;
      if (!ride) return { success: false, message: 'No ride to rate.' };
      try {
        let archived = await findArchivedRideByRequest(ride.id);
        let historyId = archived?.id;
        if (!historyId) {
          historyId = await archiveCompletedRide(ride, { rating, comment: comment || '' });
        }
        await submitRideFeedback(historyId, ride.driverId, rating, comment);
        lastCompletedRef.current = null;
        setActiveRide(null);
        return { success: true };
      } catch (err) {
        return { success: false, message: err.message };
      }
    },
    [activeRide]
  );

  return (
    <RideContext.Provider
      value={{
        pickup,
        setPickup,
        destination,
        setDestination,
        vehicleType,
        setVehicleType,
        pinkRide,
        setPinkRide,
        route,
        setRoute,
        routeError,
        setRouteError,
        fare,
        activeRide,
        justCompleted,
        clearJustCompleted,
        bookingLoading,
        requestRide,
        cancelRide,
        retrySearch,
        completeAndRate,
        campusShortcuts: CAMPUS_SHORTCUTS,
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => useContext(RideContext);
export default RideContext;
