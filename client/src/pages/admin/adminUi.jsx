import React from 'react';
import { Loader2, Inbox, AlertCircle } from 'lucide-react';

// Small shared building blocks so every admin screen has consistent
// loading / empty / error states.

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="py-16 flex items-center justify-center text-sm text-gray-500 space-x-2">
      <Loader2 className="w-5 h-5 animate-spin text-red-500" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', hint }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center text-gray-400">
      <Inbox className="w-10 h-10 mb-2" />
      <p className="text-sm font-bold text-gray-500">{title}</p>
      {hint && <p className="text-xs mt-1">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="py-6 px-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-2 text-sm text-red-700">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    approved: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-emerald-100 text-emerald-800',
    active: 'bg-emerald-100 text-emerald-800',
    available: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    searching: 'bg-blue-100 text-blue-800',
    accepted: 'bg-blue-100 text-blue-800',
    driver_arriving: 'bg-blue-100 text-blue-800',
    driver_arrived: 'bg-indigo-100 text-indigo-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-200 text-gray-700',
    no_driver_found: 'bg-gray-200 text-gray-700',
    offline: 'bg-gray-200 text-gray-600',
    unsubmitted: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${
        map[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {(status || '—').replace(/_/g, ' ')}
    </span>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
