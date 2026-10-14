import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRide } from '../context/RideContext';
import Header from '../components/Header';
import confetti from 'canvas-confetti';
import { Star, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CURRENCY } from '../config/appConfig';

// Rider's post-ride screen: rate the captain and leave feedback. The ride was
// already archived to history on completion; here we attach the rating.
const RideCompleted = () => {
  const navigate = useNavigate();
  const { justCompleted, completeAndRate, clearJustCompleted } = useRide();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
    } catch {
      /* confetti is cosmetic */
    }
  }, []);

  // If someone lands here with nothing to rate, send them to history.
  useEffect(() => {
    if (!justCompleted) {
      const t = setTimeout(() => navigate('/history'), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [justCompleted, navigate]);

  const ride = justCompleted;
  const driver = ride?.driverInfo;
  const fare = ride?.fare ?? 0;
  const driverInitials = driver?.name
    ? driver.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CP';

  const submit = async () => {
    setError('');
    setSubmitting(true);
    const res = await completeAndRate(rating, comment);
    setSubmitting(false);
    if (res?.success) {
      clearJustCompleted();
      navigate('/history');
    } else {
      setError(res?.message || 'Could not submit your rating.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header title="" showBack={false} showSOS={false} showHelp={false} />

      <div className="flex-1 px-6 pt-4 pb-8 flex flex-col overflow-y-auto">
        <div className="flex items-center space-x-2 my-2">
          <div className="w-7 h-7 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Ride completed</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">You've safely reached your destination.</p>

        {driver && (
          <div className="p-4 bg-white rounded-3xl border-2 border-gray-100 shadow-sm flex items-center justify-between mb-5">
            <div>
              {driver.vehicleNumber && (
                <span className="inline-block px-2.5 py-0.5 bg-yellow-300 text-gray-900 font-mono font-black text-xs rounded-md border border-yellow-400 mb-1">
                  {driver.vehicleNumber}
                </span>
              )}
              <p className="text-xs font-bold text-gray-700">{driver.vehicleModel}</p>
              <p className="text-sm font-extrabold text-blue-600 mt-0.5">{driver.name}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white font-black text-xl flex items-center justify-center">
              {driverInitials}
            </div>
          </div>
        )}

        <div className="p-4 bg-amber-50/70 rounded-3xl border border-amber-200 mb-5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-amber-900">Total fare (estimated)</span>
          <span className="text-xl font-black text-amber-900">
            {CURRENCY}
            {fare}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 -mt-3 mb-5 text-center">
          Settle the fare with your captain directly. No in-app payment is processed.
        </p>

        <div className="py-2 text-center">
          <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">Rate your captain</p>
          <div className="flex items-center justify-center space-x-3 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)} className="p-1 active:scale-95">
                <Star
                  className={`w-9 h-9 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-100'}`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-black text-xs text-gray-900 uppercase tracking-wider mb-2">Feedback</h4>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was your campus ride?"
            className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-600 font-bold mt-3">{error}</p>}

        <div className="pt-6 mt-auto">
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full py-4 bg-[#EA5858] hover:bg-[#dc4848] text-white font-extrabold text-lg rounded-full shadow-lg shadow-red-200 flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting…</span>
              </>
            ) : (
              <>
                <span>Submit feedback</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RideCompleted;
