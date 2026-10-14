import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { listenRidesForUser } from '../services/firestore';
import { ROLES, CURRENCY } from '../config/appConfig';
import { Star, Bike, Car, Calendar, Loader2 } from 'lucide-react';
import { fmtDate } from './admin/adminUi';

// Completed ride history from the durable `rides` collection, filtered to the
// current user by whichever role they played (rider or driver).
const RideHistory = () => {
  const { uid, user, mode } = useAuth();
  const [rides, setRides] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    // A driver viewing in driver mode sees rides they drove; otherwise rides taken.
    const roleField = mode === 'driver' && user?.role === ROLES.DRIVER ? 'driverId' : 'riderId';
    const unsub = listenRidesForUser(uid, roleField, setRides);
    return unsub;
  }, [uid, mode, user]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header title="Ride History" showBack={false} showHelp />

      <div className="flex-1 px-5 py-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-gray-900">Your rides</h2>
          <span className="text-xs font-bold text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200">
            {rides?.length ?? 0} trips
          </span>
        </div>

        {rides === null ? (
          <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-red-500" />
            <span>Loading history…</span>
          </div>
        ) : rides.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm font-bold">No completed rides yet.</p>
            <p className="text-xs mt-1">Your finished trips will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {rides.map((ride) => (
              <div key={ride.id} className="p-4 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">{fmtDate(ride.completedAt)}</span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Completed
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {ride.vehicleType === 'Car' ? (
                      <Car className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Bike className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="font-extrabold text-sm text-gray-900">{ride.vehicleType}</span>
                    {ride.pinkRide && (
                      <span className="text-[9px] bg-pink-100 text-pink-700 font-extrabold px-1.5 py-0.5 rounded-md">
                        Pink
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-gray-900">
                      {CURRENCY}
                      {ride.fare}
                    </span>
                    <span className="text-[10px] text-gray-400 block">{ride.distanceKm} km</span>
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-gray-700 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{ride.pickup}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-gray-700 truncate">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="truncate">{ride.destination}</span>
                  </div>
                </div>

                {ride.rating && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= ride.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-100'}`}
                        />
                      ))}
                    </div>
                    {ride.comment && (
                      <span className="text-[11px] text-gray-500 italic truncate max-w-[180px]">"{ride.comment}"</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default RideHistory;
