// Interactive mock-driver dispatch.
//
// Purpose: let the rider flow work end-to-end WITHOUT a second human driver,
// while still behaving like the real system — it drives the SAME Firestore ride
// document through the real lifecycle (searching → accepted → driver_arriving →
// driver_arrived → in_progress → completed) and animates the driver's GPS along
// the real OSRM route. The rider still interacts (sees PIN, watches the car move,
// gets the completed screen). A real driver can still accept first; the simulator
// backs off if a human claims the ride.
//
// This is clearly a DEMO aid and is only activated when enabled in appConfig.
import { fetchRoute } from './geo';
import {
  getRideRequest,
  claimRideRequest,
  advanceRideStatus,
  setDriverLocation,
  archiveCompletedRide,
  countOnlineRealDrivers,
} from './firestore';
import { RIDE_STATUS, SIMULATED_DRIVERS, SIM, DRIVER_FRESH_MS } from '../config/appConfig';

// Pick a believable mock driver (female-eligible one for pink rides).
function pickDriver(ride) {
  const pool = ride.pinkRide
    ? SIMULATED_DRIVERS.filter((d) => d.pinkRideEligible)
    : SIMULATED_DRIVERS;
  const list = pool.length ? pool : SIMULATED_DRIVERS;
  return list[Math.floor(Math.random() * list.length)];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Interpolate a position along a polyline [[lat,lng],...] at fraction t (0..1).
function pointAlong(geometry, t) {
  if (!geometry || geometry.length === 0) return null;
  if (geometry.length === 1) return { lat: geometry[0][0], lng: geometry[0][1] };
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (geometry.length - 1);
  const i = Math.floor(idx);
  const frac = idx - i;
  const a = geometry[i];
  const b = geometry[Math.min(i + 1, geometry.length - 1)];
  return { lat: a[0] + (b[0] - a[0]) * frac, lng: a[1] + (b[1] - a[1]) * frac };
}

// Animate the mock driver's location field over `durationMs` along geometry.
async function animateAlong(driverUid, geometry, durationMs, shouldStop) {
  const steps = Math.max(4, Math.round(durationMs / SIM.tickMs));
  for (let s = 0; s <= steps; s += 1) {
    if (shouldStop()) return;
    const pos = pointAlong(geometry, s / steps);
    if (pos) {
      try {
        await setDriverLocation(driverUid, pos.lat, pos.lng);
      } catch {
        /* ignore transient write errors */
      }
    }
    await sleep(SIM.tickMs);
  }
}

// Run the full simulated trip for one ride. Returns a cancel() function.
// It re-reads the ride between phases so a real human taking over, or a rider
// cancelling, cleanly stops the bot.
export function runSimulatedTrip(rideId) {
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  const stopped = () => cancelled;

  (async () => {
    try {
      // 0) If a REAL driver is online, DON'T auto-accept — let the human accept
      //    through the normal dispatch. The simulator is only a fallback for
      //    when nobody is online, so the "driver accepts" demo works for real.
      try {
        const onlineReal = await countOnlineRealDrivers(DRIVER_FRESH_MS);
        if (onlineReal > 0) return;
      } catch {
        /* if the check fails, fall through to the normal delayed fallback */
      }

      // 1) Wait so a REAL driver can claim first. Re-check online + status after
      //    the wait; if a human came online or took it, bail out.
      await sleep(SIM.acceptDelayMs);
      if (cancelled) return;

      try {
        const onlineReal = await countOnlineRealDrivers(DRIVER_FRESH_MS);
        if (onlineReal > 0) return;
      } catch {
        /* ignore and continue as fallback */
      }

      let ride = await getRideRequest(rideId);
      if (!ride || ride.status !== RIDE_STATUS.SEARCHING) return; // taken/cancelled

      const bot = pickDriver(ride);

      // 2) Atomically claim the ride as the mock driver.
      try {
        await claimRideRequest(rideId, {
          uid: bot.uid,
          name: bot.name,
          phone: bot.phone,
          vehicleType: ride.vehicleType || bot.vehicleType,
          vehicleModel: bot.vehicleModel,
          vehicleNumber: bot.vehicleNumber,
          rating: bot.rating,
          usn: bot.usn,
        });
      } catch {
        return; // a real driver won the race — let them handle it
      }
      if (cancelled) return;

      // Seed the driver near pickup, then compute an approach route.
      const pickup = ride.pickupCoords;
      const dest = ride.destinationCoords;
      const startApproach = {
        lat: pickup.lat + 0.012,
        lng: pickup.lng + 0.012,
      };
      await setDriverLocation(bot.uid, startApproach.lat, startApproach.lng);

      // 3) En route to pickup.
      await advanceRideStatus(rideId, RIDE_STATUS.ACCEPTED, RIDE_STATUS.DRIVER_ARRIVING);
      let approach;
      try {
        approach = await fetchRoute(startApproach, pickup);
      } catch {
        approach = { geometry: [[startApproach.lat, startApproach.lng], [pickup.lat, pickup.lng]] };
      }
      await animateAlong(bot.uid, approach.geometry, SIM.toPickupMs, stopped);
      if (cancelled) return;

      // 4) Arrived at pickup.
      ride = await getRideRequest(rideId);
      if (!ride || ride.status !== RIDE_STATUS.DRIVER_ARRIVING) return;
      await advanceRideStatus(rideId, RIDE_STATUS.DRIVER_ARRIVING, RIDE_STATUS.DRIVER_ARRIVED);
      await setDriverLocation(bot.uid, pickup.lat, pickup.lng);

      // 5) Wait for OTP. The rider can let the bot auto-verify after a short
      //    wait, OR a human driver flow would verify. We poll the ride: if it
      //    becomes in_progress (someone verified), we continue; otherwise after
      //    otpWaitMs we auto-verify using the ride's own OTP (demo behaviour).
      const otpDeadline = Date.now() + SIM.otpWaitMs;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelled) return;
        ride = await getRideRequest(rideId);
        if (!ride) return;
        if (ride.status === RIDE_STATUS.IN_PROGRESS) break; // verified elsewhere
        if (ride.status !== RIDE_STATUS.DRIVER_ARRIVED) return; // cancelled etc.
        if (Date.now() > otpDeadline) {
          // Auto-verify with the real OTP stored on the ride (demo convenience).
          await advanceRideStatus(rideId, RIDE_STATUS.DRIVER_ARRIVED, RIDE_STATUS.IN_PROGRESS, {
            otpVerified: true,
          });
          break;
        }
        await sleep(1000);
      }
      if (cancelled) return;

      // 6) Drive pickup → destination along the real route.
      let trip;
      try {
        trip = await fetchRoute(pickup, dest);
      } catch {
        trip = { geometry: [[pickup.lat, pickup.lng], [dest.lat, dest.lng]] };
      }
      await animateAlong(bot.uid, trip.geometry, SIM.toDropMs, stopped);
      if (cancelled) return;

      // 7) Complete the ride + archive to history.
      ride = await getRideRequest(rideId);
      if (!ride || ride.status !== RIDE_STATUS.IN_PROGRESS) return;
      await setDriverLocation(bot.uid, dest.lat, dest.lng);
      await archiveCompletedRide(ride);
      await advanceRideStatus(rideId, RIDE_STATUS.IN_PROGRESS, RIDE_STATUS.COMPLETED, {
        completedAt: new Date(),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[CampusRide] simulated trip ended:', err?.message);
    }
  })();

  return cancel;
}
