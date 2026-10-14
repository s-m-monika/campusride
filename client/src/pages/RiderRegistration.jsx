import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { upsertDriverProfile, submitVerification, getUserVerification } from '../services/firestore';
import { VERIFICATION_STATUS } from '../config/appConfig';
import { Bike, Car, ShieldCheck, ArrowRight, Loader2, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

// Driver profile setup + driver verification submission.
// Collects licence / vehicle / insurance details and submits them for MANUAL
// admin review (status: pending). We never claim text proves document validity.
const RiderRegistration = () => {
  const navigate = useNavigate();
  const { uid, user, refreshDriverProfile } = useAuth();

  const [form, setForm] = useState({
    vehicleType: 'Bike',
    vehicleModel: 'TVS Jupiter',
    vehicleNumber: '',
    licenceNumber: '',
    insuranceExpiry: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    if (!uid) return;
    getUserVerification(uid, 'driver').then(setExisting).catch(() => {});
  }, [uid]);

  const onChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    if (!form.vehicleNumber.trim() || !form.licenceNumber.trim()) {
      setError('Vehicle registration number and licence number are required.');
      return;
    }
    setSubmitting(true);
    try {
      // 1) Create/merge the driver's operational profile (starts unverified).
      await upsertDriverProfile(uid, {
        name: user?.name || '',
        usn: user?.usn || '',
        phone: user?.phone || '',
        vehicleType: form.vehicleType,
        vehicleModel: form.vehicleModel.trim(),
        vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
        availability: 'offline',
        verificationStatus: VERIFICATION_STATUS.PENDING,
        pinkRideEligible: (user?.gender || '').toLowerCase() === 'female',
      });

      // 2) Submit the driver verification application for manual admin review.
      await submitVerification({
        uid,
        type: 'driver',
        name: user?.name || '',
        usn: user?.usn || '',
        email: user?.email || '',
        vehicleType: form.vehicleType,
        vehicleModel: form.vehicleModel.trim(),
        vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
        licenceNumber: form.licenceNumber.trim().toUpperCase(),
        insuranceExpiry: form.insuranceExpiry,
      });

      await refreshDriverProfile();
      const updated = await getUserVerification(uid, 'driver');
      setExisting(updated);
    } catch (err) {
      setError(err.message || 'Could not submit driver details.');
    } finally {
      setSubmitting(false);
    }
  };

  const pending = existing?.status === VERIFICATION_STATUS.PENDING;
  const approved = existing?.status === VERIFICATION_STATUS.APPROVED;
  const rejected = existing?.status === VERIFICATION_STATUS.REJECTED;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header title="Driver Setup" showBack onBack={() => navigate('/role')} showHelp />

      <div className="flex-1 px-6 pt-4 pb-8 overflow-y-auto">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Driver verification</h2>
        <p className="text-xs text-gray-400 mt-1">Campus safety &amp; driver onboarding</p>

        {/* Status banner */}
        {existing && (
          <div
            className={`mt-4 p-4 rounded-2xl border flex items-start space-x-2 text-sm ${
              approved
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : rejected
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {approved ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
            <div>
              <p className="font-black capitalize">{existing.status.replace(/_/g, ' ')}</p>
              <p className="text-xs mt-0.5">
                {approved
                  ? 'You are an approved driver. Head to your dashboard to go online.'
                  : rejected
                  ? `Rejected${existing.reviewReason ? `: ${existing.reviewReason}` : ''}. You can edit and resubmit.`
                  : 'Your details are pending manual review by an admin.'}
              </p>
            </div>
          </div>
        )}

        {/* Document checklist (informational) */}
        <div className="mt-5 p-5 bg-[#EDF9EE] rounded-3xl border border-[#D5F2D8] space-y-4">
          {['Valid Driving Licence', 'Vehicle Registration (RC)', 'Valid Insurance'].map((t) => (
            <div key={t} className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-full bg-[#4CAF50] text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="font-bold text-sm text-gray-900">{t}</p>
            </div>
          ))}
          <p className="text-[11px] text-emerald-800/80">
            An admin manually reviews these details. Entering a number does not by itself prove a
            document is legally valid.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
          <div>
            <label className="block text-[11px] font-black text-gray-700 uppercase mb-1.5">Vehicle type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, vehicleType: 'Bike', vehicleModel: 'TVS Jupiter' }))}
                className={`p-3 rounded-2xl border-2 flex items-center justify-center space-x-2 font-bold text-xs transition-all ${
                  form.vehicleType === 'Bike' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                <Bike className="w-4 h-4" /> <span>Bike</span>
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, vehicleType: 'Car', vehicleModel: 'Maruti Swift' }))}
                className={`p-3 rounded-2xl border-2 flex items-center justify-center space-x-2 font-bold text-xs transition-all ${
                  form.vehicleType === 'Car' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                <Car className="w-4 h-4" /> <span>Car</span>
              </button>
            </div>
          </div>

          <Input label="Vehicle registration number" name="vehicleNumber" value={form.vehicleNumber} onChange={onChange} placeholder="KA02AB1234" mono />
          <Input label="Vehicle model" name="vehicleModel" value={form.vehicleModel} onChange={onChange} placeholder="TVS Jupiter" />
          <Input label="Driving licence number" name="licenceNumber" value={form.licenceNumber} onChange={onChange} placeholder="KA0220230001234" mono />
          <div>
            <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">Insurance expiry</label>
            <input
              type="date"
              name="insuranceExpiry"
              value={form.insuranceExpiry}
              onChange={onChange}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!approved && (
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-[#EA5858] hover:bg-[#dc4848] text-white font-extrabold text-base rounded-full shadow-lg shadow-red-200 flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              <span>{submitting ? 'Submitting…' : pending ? 'Resubmit details' : 'Submit for verification'}</span>
            </button>
          )}

          {approved && (
            <button
              type="button"
              onClick={() => navigate('/driver')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base rounded-full flex items-center justify-center space-x-2"
            >
              <span>Go to Driver Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

function Input({ label, name, value, onChange, placeholder, mono }) {
  return (
    <div>
      <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400 ${
          mono ? 'font-mono uppercase tracking-wider' : ''
        }`}
      />
    </div>
  );
}

export default RiderRegistration;
