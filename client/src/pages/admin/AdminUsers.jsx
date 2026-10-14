import React, { useEffect, useState } from 'react';
import { listUsers, listDriverProfiles, setAccountStatus } from '../../services/firestore';
import { ACCOUNT_STATUS, ROLES } from '../../config/appConfig';
import { Search, Ban, CheckCircle2, Loader2 } from 'lucide-react';
import { LoadingState, EmptyState, Card, StatusBadge } from './adminUi';

// View users and drivers; activate or suspend accounts. Suspend/activate is an
// admin-only write (enforced by security rules too).
const AdminUsers = () => {
  const [users, setUsers] = useState(null);
  const [drivers, setDrivers] = useState({});
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { uid, name, next }

  const load = async () => {
    const [u, d] = await Promise.all([listUsers(), listDriverProfiles()]);
    setUsers(u);
    const map = {};
    d.forEach((p) => (map[p.uid] = p));
    setDrivers(map);
  };

  useEffect(() => {
    load().catch(() => setUsers([]));
  }, []);

  if (users === null) return <LoadingState label="Loading users…" />;

  const doToggle = async () => {
    if (!confirm) return;
    setBusyId(confirm.uid);
    try {
      await setAccountStatus(confirm.uid, confirm.next);
      setUsers((prev) =>
        prev.map((u) => (u.uid === confirm.uid ? { ...u, accountStatus: confirm.next } : u))
      );
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${u.name || ''} ${u.email || ''} ${u.usn || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or USN"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <option value="all">All roles</option>
          <option value={ROLES.RIDER}>Riders</option>
          <option value={ROLES.DRIVER}>Drivers</option>
          <option value={ROLES.ADMIN}>Admins</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No users match" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-black text-gray-400 uppercase border-b border-gray-100">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const suspended = u.accountStatus === ACCOUNT_STATUS.SUSPENDED;
                const dp = drivers[u.uid];
                return (
                  <tr key={u.uid} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{u.name || '—'}</p>
                      <p className="text-[11px] text-gray-500">{u.email}</p>
                      {u.usn && <p className="text-[11px] font-mono text-gray-400">{u.usn}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold capitalize text-gray-700">{u.role}</span>
                      {dp?.vehicleType && (
                        <p className="text-[11px] text-gray-400">{dp.vehicleType} · {dp.vehicleNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.verificationStatus} /></td>
                    <td className="px-4 py-3"><StatusBadge status={u.accountStatus} /></td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== ROLES.ADMIN && (
                        <button
                          onClick={() =>
                            setConfirm({
                              uid: u.uid,
                              name: u.name,
                              next: suspended ? ACCOUNT_STATUS.ACTIVE : ACCOUNT_STATUS.SUSPENDED,
                            })
                          }
                          disabled={busyId === u.uid}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                            suspended
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {busyId === u.uid ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : suspended ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                          <span>{suspended ? 'Activate' : 'Suspend'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Confirmation dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="max-w-sm w-full p-6">
            <h3 className="font-black text-gray-900 text-base">
              {confirm.next === ACCOUNT_STATUS.SUSPENDED ? 'Suspend account?' : 'Activate account?'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {confirm.next === ACCOUNT_STATUS.SUSPENDED
                ? `${confirm.name || 'This user'} will not be able to sign in or use the app.`
                : `${confirm.name || 'This user'} will regain access to the app.`}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={doToggle}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-sm ${
                  confirm.next === ACCOUNT_STATUS.SUSPENDED
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
