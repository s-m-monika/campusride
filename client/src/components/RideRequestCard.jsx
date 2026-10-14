import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Clock, IndianRupee } from 'lucide-react';
import { CURRENCY } from '../config/appConfig';

// Uber-style incoming-request card with a countdown timer, progress bar, and a
// one-time beep. When the timer expires it calls onExpire (auto-decline), so the
// request stays available for other drivers.
const ACCEPT_WINDOW_S = 20; // 20-second acceptance window

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available / blocked — ignore */
  }
}

const RideRequestCard = ({ ride, onAccept, onDecline, onExpire, busy }) => {
  const [remaining, setRemaining] = useState(ACCEPT_WINDOW_S);
  const beeped = useRef(false);

  useEffect(() => {
    if (!beeped.current) {
      beeped.current = true;
      beep();
    }
  }, []);

  useEffect(() => {
    setRemaining(ACCEPT_WINDOW_S);
    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(id);
          onExpire?.(ride);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride.id]);

  const pct = (remaining / ACCEPT_WINDOW_S) * 100;

  return (
    <div className="p-4 bg-white border-2 border-blue-400 rounded-2xl shadow-xl animate-slide-down">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
          <span className="font-black text-blue-950 text-sm">New ride request</span>
        </div>
        <span className="text-sm font-black text-blue-700 flex items-center">
          <IndianRupee className="w-3.5 h-3.5" />
          {ride.fare}
        </span>
      </div>

      {/* Countdown bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            remaining <= 5 ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="text-xs space-y-1 bg-blue-50/60 p-3 rounded-xl border border-blue-100 mb-3">
        <p className="flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate font-bold text-gray-800">{ride.pickup}</span>
        </p>
        <p className="flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span className="truncate font-bold text-gray-800">{ride.destination}</span>
        </p>
        <p className="text-gray-500 pt-1 border-t border-gray-100 flex items-center justify-between">
          <span>{ride.distanceKm} km · ~{ride.durationMin} min · {ride.vehicleType}</span>
          {ride.pinkRide && <span className="text-pink-600 font-bold">Pink</span>}
        </p>
        {ride.riderInfo?.name && (
          <p className="text-gray-500">Rider: {ride.riderInfo.name}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onDecline?.(ride)}
          disabled={busy}
          className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
        >
          Decline
        </button>
        <button
          onClick={() => onAccept(ride)}
          disabled={busy || remaining === 0}
          className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm disabled:opacity-60 flex items-center justify-center space-x-2"
        >
          <Clock className="w-4 h-4" />
          <span>{busy ? 'Accepting…' : `Accept (${remaining}s)`}</span>
        </button>
      </div>
    </div>
  );
};

export default RideRequestCard;
