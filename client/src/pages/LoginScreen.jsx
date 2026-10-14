import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { Mail, Lock, ArrowRight, AlertCircle, Building2, User, Car, ShieldCheck } from 'lucide-react';
import { COLLEGE_NAME, COLLEGE_SHORT, ROLES, ADMIN_EMAILS } from '../config/appConfig';

// Login with a User / Driver / Admin selector. The selector routes the user
// after sign-in and guards the Admin tab. Real admin authority comes from the
// Firestore role field — we re-check it after login and reject mismatches.
const TABS = [
  { key: ROLES.RIDER, label: 'User', icon: User },
  { key: ROLES.DRIVER, label: 'Driver', icon: Car },
  { key: ROLES.ADMIN, label: 'Admin', icon: ShieldCheck },
];

const LoginScreen = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [tab, setTab] = useState(ROLES.RIDER);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Enter your email and password.');
      return;
    }
    // Admin tab: only the authorized admin email may attempt this path.
    if (tab === ROLES.ADMIN && !ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
      setErrorMsg('This email is not an authorized admin account.');
      return;
    }

    setLoading(true);
    const res = await login(email, password, { demo: demoMode });
    setLoading(false);

    if (!res?.success) {
      setErrorMsg(res?.message || 'Sign in failed.');
      return;
    }

    const role = res.profile?.role;

    // If the Admin tab was used, the account's real role MUST be admin.
    if (tab === ROLES.ADMIN && role !== ROLES.ADMIN) {
      await logout();
      setErrorMsg('This account does not have admin access.');
      return;
    }

    // Route by the account's real role (source of truth).
    if (role === ROLES.ADMIN) navigate('/admin');
    else if (role === ROLES.DRIVER) navigate('/driver');
    else navigate('/home');
  };

  const isAdminTab = tab === ROLES.ADMIN;
  const demoLogin = (role) => {
    setTab(role);
    setDemoMode(true);
    setEmail(role === ROLES.DRIVER ? 'driver@demo.local' : 'passenger@demo.local');
    setPassword('demo123');
    setErrorMsg('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <Header title="" showBack onBack={() => navigate('/')} showHelp />

      <div className="flex-1 px-5 py-6 overflow-y-auto flex flex-col">
        <div className="mb-5 text-center">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-50 border border-red-200 rounded-full mb-2">
            <Building2 className="w-3.5 h-3.5 text-red-600" />
            <span className="text-[11px] font-black text-red-600 uppercase tracking-wider">
              {COLLEGE_NAME} ({COLLEGE_SHORT})
            </span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome back</h2>
          <p className="text-xs text-gray-500">Sign in to CampusRide</p>
        </div>

        {/* Role selector */}
        <div className="flex bg-gray-200/70 p-1 rounded-2xl mb-4 text-xs font-extrabold">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setErrorMsg('');
                }}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {isAdminTab && (
          <div className="mb-3 p-3 bg-slate-900 text-slate-200 rounded-2xl text-[11px] flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>Admin access is restricted to the authorized college administrator account.</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4 bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (demoMode) setDemoMode(false);
                }}
                placeholder={isAdminTab ? ADMIN_EMAILS[0] : 'you@example.com'}
                className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (demoMode) setDemoMode(false);
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#EA5858] hover:bg-[#dc4848] active:scale-98 text-white font-extrabold text-base rounded-full shadow-lg shadow-red-200 flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            <span>{loading ? 'Signing in...' : `Sign in${isAdminTab ? ' as Admin' : ''}`}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <p className="text-[11px] font-black text-blue-900 uppercase">Local demo mode</p>
          <p className="text-[11px] text-blue-800 mt-1">Firebase credentials are not configured, so this uses the real ride screens with a local simulated driver.</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button type="button" onClick={() => demoLogin(ROLES.RIDER)} className="py-2 rounded-xl bg-white border border-blue-200 text-xs font-bold text-blue-800">Demo passenger</button>
            <button type="button" onClick={() => demoLogin(ROLES.DRIVER)} className="py-2 rounded-xl bg-white border border-blue-200 text-xs font-bold text-blue-800">Demo driver</button>
          </div>
        </div>

        {!isAdminTab && (
          <div className="text-center py-5">
            <p className="text-xs text-gray-500">
              New to CampusRide?{' '}
              <Link to="/register" className="text-red-600 font-bold hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        )}

        <div className="mt-auto text-center text-[11px] text-gray-400 font-medium">
          {COLLEGE_NAME} • Adityanagar, Vidyaranyapura
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
