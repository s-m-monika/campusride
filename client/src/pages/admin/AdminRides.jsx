import React, { useEffect, useState } from 'react';
import { listenAllRideRequests, listenAllRides } from '../../services/firestore';
import { Search, MapPin } from 'lucide-react';
import { LoadingState, EmptyState, Card, StatusBadge, fmtDate } from './adminUi';
import { CURRENCY } from '../../config/appConfig';

// All ride requests (active + terminal) and completed/archived rides, with
// status and text filters. Two tabs keep the view readable.
const AdminRides = () => {
  const [requests, setRequests] = useState(null);
  const [rides, setRides] = useState([]);
  const [tab, setTab] = useState('requests');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const u1 = listenAllRideRequests(setRequests);
    const u2 = listenAllRides(setRides);
    return () => {
      u1();
      u2();
    };
  }, []);

  if (requests === null) return <LoadingState label="Loading rides…" />;

  const source = tab === 'requests' ? requests : rides;
  const filtered = source.filter((r) => {
    if (tab === 'requests' && statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${r.pickup || ''} ${r.destination || ''} ${r.riderId || ''} ${r.driverId || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit text-sm font-bold">
        {[
          ['requests', `Ride requests (${requests.length})`],
          ['completed', `Completed (${rides.length})`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              tab === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pickup, destination, user id"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        {tab === 'requests' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="all">All statuses</option>
            {['searching', 'accepted', 'driver_arriving', 'driver_arrived', 'in_progress', 'completed', 'cancelled', 'no_driver_found'].map(
              (s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              )
            )}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No rides match" />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{fmtDate(r.completedAt || r.createdAt)}</span>
                  {r.pinkRide && (
                    <span className="text-[9px] bg-pink-100 text-pink-700 font-black px-1.5 py-0.5 rounded">
                      Pink
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-gray-900">
                    {CURRENCY}
                    {r.fare}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-1.5 text-gray-700 truncate">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{r.pickup}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-gray-700 truncate">
                  <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="truncate">{r.destination}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>{r.distanceKm} km · {r.durationMin} min · {r.vehicleType}</span>
                <span className="font-mono">
                  rider {String(r.riderId).slice(0, 6)} · driver {r.driverId ? String(r.driverId).slice(0, 6) : '—'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRides;
