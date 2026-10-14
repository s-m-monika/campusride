import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { validateImageFile, runOcr, extractHints } from '../services/ocr';
import { submitVerification, getUserVerification } from '../services/firestore';
import { USN_PREFIX, VERIFICATION_STATUS, COLLEGE_NAME } from '../config/appConfig';
import {
  Upload,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Info,
  ArrowRight,
} from 'lucide-react';

// College ID OCR + verification submission.
// The image is processed locally in the browser (Tesseract.js). We DO NOT upload
// the image anywhere and we DO NOT store image data in Firestore — only the
// extracted/confirmed text fields are saved. See the disclosure banner below.
const OcrVerification = () => {
  const navigate = useNavigate();
  const { user, uid } = useAuth();

  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState(null);

  const [fields, setFields] = useState({
    name: user?.name || '',
    college: user?.college || '',
    course: user?.course || '',
    graduationYear: user?.graduationYear || '',
    usn: user?.usn || '',
  });

  // Load any existing application to show its current status.
  useEffect(() => {
    if (!uid) return;
    getUserVerification(uid, 'college_id').then(setExisting).catch(() => {});
  }, [uid]);

  // Release the preview object URL when it changes / unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onPickFile = (e) => {
    setError('');
    const f = e.target.files?.[0];
    if (!f) return;
    const vErr = validateImageFile(f);
    if (vErr) {
      setError(vErr);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setOcrText('');
    setProgress(0);
  };

  const onScan = async () => {
    if (!file) {
      setError('Choose a college ID image first.');
      return;
    }
    setError('');
    setScanning(true);
    setProgress(0);
    try {
      const text = await runOcr(file, setProgress);
      setOcrText(text);
      // Offer hints the user can accept/correct — never auto-filled as truth.
      const hints = extractHints(text, USN_PREFIX);
      setFields((prev) => ({
        ...prev,
        usn: prev.usn || hints.usn || '',
        graduationYear: prev.graduationYear || hints.graduationYear || '',
      }));
      if (!text) setError('No readable text found. Try a clearer, well-lit photo.');
    } catch (e) {
      setError('OCR failed to run. Try a different image or reload the page.');
    } finally {
      setScanning(false);
    }
  };

  const onField = (e) => setFields((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async () => {
    setError('');
    if (!fields.name.trim() || !fields.usn.trim()) {
      setError('Name and USN are required.');
      return;
    }
    if (!ocrText) {
      setError('Run OCR on your ID before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await submitVerification({
        uid,
        type: 'college_id',
        name: fields.name.trim(),
        college: fields.college.trim(),
        course: fields.course.trim(),
        graduationYear: fields.graduationYear.trim(),
        usn: fields.usn.trim().toUpperCase(),
        ocrText, // extracted text only — no image bytes
        email: user?.email || '',
      });
      // Release the image now that we're done; it never leaves the browser.
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFile(null);
      const updated = await getUserVerification(uid, 'college_id');
      setExisting(updated);
    } catch (e) {
      setError(e.message || 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = () => {
    const s = existing?.status;
    if (s === VERIFICATION_STATUS.APPROVED)
      return <StatusPill color="emerald" text="Approved" />;
    if (s === VERIFICATION_STATUS.REJECTED)
      return <StatusPill color="red" text="Rejected" />;
    if (s === VERIFICATION_STATUS.PENDING)
      return <StatusPill color="amber" text="Pending review" />;
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header title="College ID Verification" showBack onBack={() => navigate(-1)} showHelp />

      <div className="flex-1 px-5 py-4 overflow-y-auto space-y-4">
        {/* Disclosure */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start space-x-2 text-[11px] text-blue-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            This step confirms you're a {COLLEGE_NAME} student. Upload your college ID — it's read{' '}
            <strong>only in this browser</strong> and never uploaded or stored. We save just the
            extracted text and the details you confirm, which an <strong>admin reviews and approves</strong>.
            OCR reads text; it does not by itself prove a document is genuine.
          </p>
        </div>

        {existing && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-gray-800">Current application</p>
              {existing.reviewReason && (
                <p className="text-[11px] text-gray-500 mt-0.5">Reason: {existing.reviewReason}</p>
              )}
            </div>
            {statusBadge()}
          </div>
        )}

        {/* Step 1: choose image */}
        <section className="space-y-2">
          <StepTitle n={1} text="Select or capture your college ID" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={onPickFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl text-xs font-bold text-gray-700 flex items-center justify-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>{file ? 'Choose a different image' : 'Choose image (JPG/PNG/WEBP, max 5MB)'}</span>
          </button>

          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-slate-50">
              <img src={previewUrl} alt="College ID preview" className="w-full max-h-56 object-contain" />
            </div>
          )}
        </section>

        {/* Step 2: run OCR */}
        {previewUrl && (
          <section className="space-y-2">
            <StepTitle n={2} text="Scan the ID (runs locally)" />
            <button
              onClick={onScan}
              disabled={scanning}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-2xl flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
              <span>{scanning ? `Scanning… ${progress}%` : 'Run OCR scan'}</span>
            </button>
            {scanning && (
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </section>
        )}

        {/* Step 3: extracted text (editable) */}
        {ocrText !== '' && (
          <section className="space-y-2">
            <StepTitle n={3} text="Review & correct extracted text" />
            <textarea
              rows={4}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </section>
        )}

        {/* Step 4: confirm fields */}
        {ocrText !== '' && (
          <section className="space-y-2">
            <StepTitle n={4} text="Confirm your details" />
            <div className="grid grid-cols-2 gap-2">
              <LabeledInput label="Full name" name="name" value={fields.name} onChange={onField} />
              <LabeledInput label="USN" name="usn" value={fields.usn} onChange={onField} mono />
              <LabeledInput label="College" name="college" value={fields.college} onChange={onField} />
              <LabeledInput label="Course" name="course" value={fields.course} onChange={onField} />
              <LabeledInput
                label="Graduation year"
                name="graduationYear"
                value={fields.graduationYear}
                onChange={onField}
              />
            </div>
          </section>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {ocrText !== '' && (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full py-4 bg-[#EA5858] hover:bg-[#dc4848] text-white font-extrabold text-base rounded-full shadow-lg shadow-red-200 flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            <span>{submitting ? 'Submitting…' : 'Submit for verification'}</span>
          </button>
        )}

        <button
          onClick={() => {
            sessionStorage.setItem('campusride_skip_verify', '1');
            navigate(user?.role === 'driver' ? '/driver-setup' : '/home');
          }}
          className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-700 flex items-center justify-center space-x-1"
        >
          <span>Skip for now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

function StepTitle({ n, text }) {
  return (
    <div className="flex items-center space-x-2">
      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
        {n}
      </span>
      <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide">{text}</h3>
    </div>
  );
}

function LabeledInput({ label, name, value, onChange, mono }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400 ${
          mono ? 'font-mono uppercase' : ''
        }`}
      />
    </div>
  );
}

function StatusPill({ color, text }) {
  const map = {
    emerald: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
  };
  return (
    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${map[color]}`}>
      {text}
    </span>
  );
}

export default OcrVerification;
