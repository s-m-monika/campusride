import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { COL, reviewVerification, getUser, getDriverProfile } from '../../services/firestore';
import { ArrowLeft, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react';
import { LoadingState, ErrorState, Card, StatusBadge, fmtDate } from './adminUi';

// Full application detail: shows submitted fields + OCR-extracted text and lets
// the admin approve or reject with a required reason on rejection.
const AdminApplicationDetail = () => {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { uid } = useAuth();

  const [app, setApp] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, COL.verifications, appId));
        if (!snap.exists()) {
          setError('Application not found.');
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setApp(data);
        if (data.uid) {
          setApplicant(await getUser(data.uid));
          if (data.type === 'driver') setDriver(await getDriverProfile(data.uid));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [appId]);

  const review = async (approve) => {
    setError('');
    if (!approve && !reason.trim()) {
      setError('A reason is required when rejecting an application.');
      return;
    }
    setWorking(true);
    try {
      const newStatus = await reviewVerification(appId, uid, approve, reason.trim());
      setApp((prev) => ({ ...prev, status: newStatus, reviewReason: reason.trim() }));
    } catch (e) {
      setError(e.message || 'Could not update the application.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <LoadingState label="Loading application…" />;
  if (error && !app) return <ErrorState message={error} />;

  const decided = app.status === 'approved' || app.status === 'rejected';

  return (
    <div className="max-w-3xl space-y-5">
      <button
        onClick={() => navigate('/admin/verifications')}
        className="flex items-center space-x-1.5 text-sm font-bold text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to queue</span>
      </button>

      {/* Applicant header card */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-black text-lg flex items-center justify-center shrink-0">
              {(app.name || '?').split(' ').map((x) => x[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-gray-900 truncate">{app.name || 'Application'}</h2>
              <p className="text-xs text-gray-500">
                {app.type === 'driver' ? 'Driver verification' : 'College ID verification'} · {fmtDate(app.createdAt)}
              </p>
              {applicant && (
                <p className="text-[11px] mt-0.5 text-gray-400">
                  Account: <span className="capitalize font-semibold">{applicant.accountStatus}</span> ·
                  Role: <span className="capitalize font-semibold">{applicant.role}</span>
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </Card>

      <Card className="p-5 grid grid-cols-2 gap-4 text-sm">
        <Detail label="Full name" value={app.name} />
        <Detail label="USN" value={app.usn} mono />
        <Detail label="Email" value={app.email || applicant?.email} />
        <Detail label="College" value={app.college} />
        <Detail label="Course" value={app.course} />
        <Detail label="Graduation year" value={app.graduationYear} />
        {app.type === 'driver' && (
          <>
            <Detail label="Licence no." value={app.licenceNumber} mono />
            <Detail label="Vehicle reg." value={app.vehicleNumber} mono />
            <Detail label="Vehicle type" value={app.vehicleType} />
            <Detail label="Vehicle model" value={app.vehicleModel} />
            <Detail label="Insurance expiry" value={app.insuranceExpiry} />
          </>
        )}
      </Card>

      {app.type === 'college_id' && (
        <Card className="p-5">
          <p className="text-xs font-black text-gray-400 uppercase mb-2">OCR-extracted text</p>
          <pre className="whitespace-pre-wrap text-[11px] font-mono text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-56 overflow-y-auto">
            {app.ocrText || '(no text captured)'}
          </pre>
          <div className="mt-3 flex items-start space-x-2 text-[11px] text-blue-900 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              The original ID image is not available here — it was processed in the applicant's
              browser and never uploaded (free Spark plan, no Firebase Storage). Review the extracted
              text and confirmed fields. OCR does not establish document authenticity.
            </p>
          </div>
        </Card>
      )}

      {error && <ErrorState message={error} />}

      {!decided ? (
        <Card className="p-5 space-y-3">
          <label className="block text-xs font-black text-gray-500 uppercase">
            Reason (required to reject)
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. USN on ID does not match entered details"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-3">
            <button
              onClick={() => review(true)}
              disabled={working}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Approve</span>
            </button>
            <button
              onClick={() => review(false)}
              disabled={working}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-sm flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="text-sm font-bold text-gray-800">
            This application was {app.status}.
          </p>
          {app.reviewReason && (
            <p className="text-xs text-gray-500 mt-1">Reason: {app.reviewReason}</p>
          )}
        </Card>
      )}
    </div>
  );
};

function Detail({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase">{label}</p>
      <p className={`text-sm font-bold text-gray-900 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}

export default AdminApplicationDetail;
