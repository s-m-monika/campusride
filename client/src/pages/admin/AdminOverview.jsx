import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users as UsersIcon,
  ShieldCheck,
  Car,
  Radio,
  Route as RouteIcon,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import {
  listUsers,
  listDriverProfiles,
  listenPendingVerifications,
  listenAllRideRequests,
  listenAllRides,
} from '../../services/firestore';
import { DRIVER_FRESH_MS, VERIFICATION_STATUS, ACCOUNT_STATUS, CURRENCY } from '../../config/appConfig';
import { LoadingState, Card, StatusBadge, fmtDate } from './adminUi';

// Overview dashboard with live counts. Uses listeners for the realtime figures
// (pending verifications, rides) and one-shot reads for user/driver totals.
const AdminOverview = () => {
  const [users, setUsers] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [pending, setPending] = useState([]);
  const [requests, setRequests] = useState([]);
  const [rides, setRides] = useState([]);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
    listDriverProfiles().then(setDrivers).catch(() => setDrivers([]));
    const u1 = listenPendingVerifications(setPending);
    const u2 = listenAllRideRequests(setRequests);
    const u3 = listenAllRides(setRides);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  if (users === null) return <LoadingState label="Loading dashboard…" />;

  const now = Date.now();
  const approvedDrivers = drivers.filter(
    (d) => d.verificationStatus === VERIFICATION_STATUS.APPROVED
  ).length;
  const onlineDrivers = drivers.filter((d) => {
    if (d.availability !== 'available') return false;
    const t = d.lastSeen?.toMillis ? d.lastSeen.toMillis() : 0;
    return now - t < DRIVER_FRESH_MS;
  }).length;
  const activeRides = requests.filter((r) =>
    ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(r.status)
  ).length;
  const searching = requests.filter((r) => r.status === 'searching').length;
  const suspended = users.filter((u) => u.accountStatus === ACCOUNT_STATUS.SUSPENDED).length;

  const stats = [
    { icon: UsersIcon, label: 'Registered users', value: users.length, color: 'bg-slate-900' },
    { icon: ShieldCheck, label: 'Pending verifications', value: pending.length, color: 'bg-amber-500', to: '/admin/verifications' },
    { icon: Car, label: 'Approved drivers', value: approvedDrivers, color: 'bg-emerald-600' },
    { icon: Radio, label: 'Online drivers', value: onlineDrivers, color: 'bg-blue-600' },
    { icon: RouteIcon, label: 'Active rides', value: activeRides, color: 'bg-indigo-600', to: '/admin/rides' },
    { icon: CheckCircle2, label: 'Completed rides', value: rides.length, color: 'bg-emerald-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const body = (
            <Card className="p-5 h-full hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl ${s.color} text-white flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-black text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">{s.label}</p>
            </Card>
          );
          return s.to ? (
            <Link key={s.label} to={s.to}>
              {body}
            </Link>
          ) : (
            <div key={s.label}>{body}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-black text-gray-400 uppercase mb-2">Rides searching now</p>
          <p className="text-2xl font-black text-blue-600">{searching}</p>
          <p className="text-[11px] text-gray-500 mt-1">Requests waiting for a driver to accept.</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-black text-gray-400 uppercase mb-2">Suspended accounts</p>
          <p className="text-2xl font-black text-red-600">{suspended}</p>
          <p className="text-[11px] text-gray-500 mt-1">Accounts an admin has suspended.</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-black text-gray-400 uppercase mb-2">Total ride requests</p>
          <p className="text-2xl font-black text-gray-900">{requests.length}</p>
          <p className="text-[11px] text-gray-500 mt-1">All requests across every status.</p>
        </Card>
      </div>

      {/* Completed-ride history — tracked for every ride across the platform */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-gray-400 uppercase">Recent completed rides</p>
          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {rides.length} total
          </span>
        </div>
        {rides.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-gray-400">
            No completed rides yet. Finished trips will appear here.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {rides.slice(0, 6).map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-700 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{r.pickup}</span>
                    <span className="text-gray-300">→</span>
                    <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span className="truncate">{r.destination}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {fmtDate(r.completedAt)} · {r.distanceKm} km · {r.vehicleType}
                    {r.pinkRide ? ' · Pink' : ''}
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-sm font-black text-gray-900">
                    {CURRENCY}
                    {r.fare}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminOverview;
