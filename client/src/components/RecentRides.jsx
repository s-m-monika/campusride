import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Bike, Car, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listenRidesForUser } from '../services/firestore';
import { CURRENCY } from '../config/appConfig';
import { fmtDate } from '../pages/admin/adminUi';

// Compact "recent history" strip that is embedded on both the passenger home
// and the driver dashboard so completed rides are tracked from either side.
// `roleField` is 'riderId' for passengers, 'driverId' for captains.
const RecentRides = ({ roleField = 'riderId', title = 'Recent rides', limit = 3 }) => {
  const navigate = useNavigate();
  const { uid } = useAuth();
  const [rides, setRides] = useState(null);

  useEffect(() => {
    if (!uid) {
      setRides([]);
      return undefined;
    }
    const unsub = listenRidesForUser(uid, roleField, setRides);
    return unsub;
  }, [uid, roleField]);

  const list = (rides || []).slice(0, limit);

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">{title}</h3>
        </div>
        <button
          onClick={() => navigate('/history')}
          className="text-[11px] font-bold text-red-500 flex items-center space-x-0.5"
        >
          <span>View all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {rides === null ? (
        <div className="py-6 flex items-center justify-center text-xs text-gray-400 space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
          <span>Loading history…</span>
        </div>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-gray-400">
          No completed rides yet. Your trips will appear here.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {list.map((ride) => (
            <button
              key={ride.id}
              onClick={() => navigate('/history')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  {ride.vehicleType === 'Car' ? (
                    <Car className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Bike className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {ride.pickup} → {ride.destination}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {fmtDate(ride.completedAt)} · {ride.distanceKm} km
                    {ride.pinkRide ? ' · Pink' : ''}
                  </p>
                </div>
              </div>
              <span className="text-sm font-black text-gray-900 shrink-0 ml-2">
                {CURRENCY}
                {ride.fare}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentRides;
