import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listenAllVerifications } from '../../services/firestore';
import { ShieldCheck, Car, ChevronRight, Search, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { LoadingState, EmptyState, Card, StatusBadge, fmtDate } from './adminUi';

// Uber-style verification review queue: summary counts, type/status filters,
// searchable applicant cards with avatars and quick metadata.
const AdminVerifications = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = listenAllVerifications(setApps);
    return unsub;
  }, []);

  if (apps === null) return <LoadingState label="Loading verification queue…" />;

  const counts = {
    pending: apps.filter((a) => a.status === 'pending').length,
    approved: apps.filter((a) => a.status === 'approved').length,
    rejected: apps.filter((a) => a.status === 'rejected').length,
  };

  const filtered = apps.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${a.name || ''} ${a.usn || ''} ${a.email || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const initials = (n) =>
    (n || '?').split(' ').map((x) => x[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard icon={Clock} color="bg-amber-500" label="Pending" value={counts.pending} active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
        <SummaryCard icon={CheckCircle2} color="bg-emerald-600" label="Approved" value={counts.approved} active={statusFilter === 'approved'} onClick={() => setStatusFilter('approved')} />
        <SummaryCard icon={XCircle} color="bg-red-600" label="Rejected" value={counts.rejected} active={statusFilter === 'rejected'} onClick={() => setStatusFilter('rejected')} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, USN or email"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <Select value={typeFilter} onChange={setTypeFilter} options={[['all', 'All types'], ['college_id', 'College ID'], ['driver', 'Driver']]} />
        <Select value={statusFilter} onChange={setStatusFilter} options={[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All statuses']]} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No applications match" hint="Try changing the filters above." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((a) => {
            const Icon = a.type === 'driver' ? Car : ShieldCheck;
            return (
              <Card key={a.id} className="p-4 hover:shadow-md transition-shadow">
                <button onClick={() => navigate(`/admin/verifications/${a.id}`)} className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                        {initials(a.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-gray-900 truncate">{a.name || 'Unknown'}</p>
                        <p className="text-[11px] font-mono text-gray-400 truncate">{a.usn || '—'}</p>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-gray-600">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{a.type === 'driver' ? 'Driver verification' : 'College ID'}</span>
                    </span>
                    <span className="text-[11px] text-gray-400">{fmtDate(a.createdAt)}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-blue-600 font-bold">
                    <span className="truncate">{a.email || ''}</span>
                    <span className="inline-flex items-center">Review <ChevronRight className="w-3.5 h-3.5" /></span>
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

function SummaryCard({ icon: Icon, color, label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border text-left transition-all ${
        active ? 'border-slate-900 bg-white shadow-md ring-1 ring-slate-900/10' : 'border-gray-200 bg-white hover:shadow-sm'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl ${color} text-white flex items-center justify-center mb-2`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 font-semibold mt-1">{label}</p>
    </button>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export default AdminVerifications;
