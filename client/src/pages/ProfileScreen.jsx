import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Phone, Mail, Award, ShieldCheck, ArrowRightLeft, LogOut, CheckCircle2, ChevronRight, Smartphone } from 'lucide-react';
import { COLLEGE_NAME, VERIFICATION_STATUS } from '../config/appConfig';

const VERIFY_BADGE = {
  approved: { text: 'Verified', cls: 'bg-emerald-100 text-emerald-800' },
  pending: { text: 'Pending', cls: 'bg-amber-100 text-amber-800' },
  rejected: { text: 'Rejected', cls: 'bg-red-100 text-red-800' },
  unsubmitted: { text: 'Unverified', cls: 'bg-gray-100 text-gray-500' },
};

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { user, driverProfile, mode, switchMode, logout } = useAuth();

  const canDrive = user?.role === 'driver';

  const handleToggleMode = () => {
    const nextMode = mode === 'passenger' ? 'driver' : 'passenger';
    if (nextMode === 'driver' && !canDrive) return;
    switchMode(nextMode);
    navigate(nextMode === 'driver' ? '/driver' : '/home');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userName = user?.name || 'Student';
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const vb = VERIFY_BADGE[user?.verificationStatus] || VERIFY_BADGE.unsubmitted;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header title="My Profile" showBack={false} showHelp={true} />

      <div className="flex-1 px-5 py-6 space-y-4 overflow-y-auto">
        {/* User Card (Clean Initials, No Cartoon Avatars) */}
        <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {initials}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-gray-900">{userName}</h2>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${vb.cls}`}>
                {vb.text}
              </span>
            </div>
            {user?.usn && <p className="text-xs font-mono font-bold text-red-600 mt-0.5">{user.usn}</p>}
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{user?.role} · {COLLEGE_NAME}</p>
          </div>
        </div>

        {/* Mode Switch Card — only for driver accounts */}
        {canDrive && (
          <div className="p-5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-3xl shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-red-100 block">
                Current Active Mode
              </span>
              <h3 className="text-lg font-black capitalize mt-0.5">
                {mode === 'driver' ? 'Captain (Driver)' : 'Passenger (Rider)'}
              </h3>
            </div>
            <button
              onClick={handleToggleMode}
              className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 font-extrabold text-xs rounded-2xl shadow-sm flex items-center space-x-1.5 active:scale-95"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Switch</span>
            </button>
          </div>
        )}

        {/* College ID verification link */}
        <div
          onClick={() => navigate('/verify-id')}
          className="p-4 bg-emerald-50 rounded-3xl border border-emerald-200 cursor-pointer hover:bg-emerald-100/70 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-gray-900">College ID verification</h4>
              <p className="text-[11px] text-emerald-800">Status: {vb.text}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-700" />
        </div>

        {/* Driver setup link (driver accounts only) */}
        {canDrive && (
          <div
            onClick={() => navigate('/driver-setup')}
            className="p-4 bg-blue-50 rounded-3xl border border-blue-200 cursor-pointer hover:bg-blue-100/70 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-gray-900">Driver verification</h4>
                <p className="text-[11px] text-blue-800">
                  Status: {driverProfile?.verificationStatus || 'not submitted'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-700" />
          </div>
        )}

        {/* Account Details */}
        <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-3.5 text-xs">
          <h4 className="font-black text-xs uppercase text-gray-400 tracking-wider mb-2">
            Campus Identity Details
          </h4>

          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500 flex items-center"><Award className="w-4 h-4 mr-2 text-gray-400" /> College USN</span>
            <span className="font-mono font-bold text-gray-900">{user?.usn || '—'}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500 flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-400" /> Phone</span>
            <span className="font-bold text-gray-900">{user?.phone ? `+91 ${user.phone}` : '—'}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500 flex items-center"><Mail className="w-4 h-4 mr-2 text-gray-400" /> Email</span>
            <span className="font-bold text-gray-900 truncate max-w-[180px]">{user?.email || '—'}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-gray-500 flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-gray-400" /> Institution</span>
            <span className="font-bold text-gray-900 text-right">{user?.college || COLLEGE_NAME}</span>
          </div>
        </div>

        {/* Vehicle Information */}
        {driverProfile && (
          <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs uppercase text-gray-400 tracking-wider">
                Registered Vehicle
              </h4>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {driverProfile.vehicleType}
              </span>
            </div>
            <p className="font-extrabold text-sm text-gray-900">
              {driverProfile.vehicleNumber} ({driverProfile.vehicleModel})
            </p>
          </div>
        )}

        {/* Install app */}
        <div
          onClick={() => window.dispatchEvent(new Event('campusride:install'))}
          className="p-4 bg-slate-900 text-white rounded-3xl cursor-pointer hover:bg-slate-800 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm">Install CampusRide</h4>
              <p className="text-[11px] text-slate-300">Add to your home screen for one-tap access</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>

        {/* Logout */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 bg-gray-100 hover:bg-red-50 text-red-600 font-extrabold text-xs rounded-2xl transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out from CampusRide</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfileScreen;
