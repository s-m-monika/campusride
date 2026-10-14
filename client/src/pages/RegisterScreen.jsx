import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { User, Phone, Mail, Award, Lock, GraduationCap, ArrowRight, AlertCircle } from 'lucide-react';
import { COLLEGE_NAME, USN_PREFIX, ROLES } from '../config/appConfig';

const RegisterScreen = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    usn: USN_PREFIX,
    course: '',
    graduationYear: '',
    gender: 'female',
    role: ROLES.RIDER,
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.phone.replace(/\D/g, '').length !== 10) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    // Any email is allowed at signup. College eligibility is proven later via
    // the college-ID upload + admin approval, not by the email domain.

    setLoading(true);
    const res = await register({
      ...formData,
      email: formData.email.trim(),
      usn: formData.usn.toUpperCase(),
      college: COLLEGE_NAME,
    });
    setLoading(false);

    if (res?.success) {
      // New accounts should verify their college ID next.
      navigate('/verify-id');
    } else {
      setError(res?.message || 'Registration failed.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header title="Create Account" showBack onBack={() => navigate('/login')} showHelp />

      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <div className="mb-5">
          <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-wider">
            Student / Faculty Onboarding
          </span>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-2">Join CampusRide</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sign up with any email. Next, upload your {COLLEGE_NAME} ID to get verified.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Full Name" icon={User}>
            <input
              type="text"
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Meghana S"
              className={inputCls}
            />
          </Field>

          <Field label="Email" icon={Mail} hint="Any email works. You'll verify your college ID after signup.">
            <input
              type="email"
              required
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={inputCls}
            />
          </Field>

          <Field label="College USN (optional)" icon={Award} hint={`Format: ${USN_PREFIX}[YY][DEPT][XXX] — confirmed during ID verification`}>
            <input
              type="text"
              name="usn"
              value={formData.usn}
              onChange={handleChange}
              placeholder={`${USN_PREFIX}23CS001`}
              className={`${inputCls} uppercase font-mono tracking-wider`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Course / Dept" icon={GraduationCap}>
              <input
                type="text"
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder="CSE"
                className={inputCls}
              />
            </Field>
            <Field label="Grad. Year" icon={GraduationCap}>
              <input
                type="text"
                name="graduationYear"
                value={formData.graduationYear}
                onChange={handleChange}
                placeholder="2027"
                maxLength={4}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Phone Number" icon={Phone}>
            <input
              type="tel"
              required
              maxLength={10}
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210"
              className={inputCls}
            />
          </Field>

          {/* Gender */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
              Gender (for Pink Ride eligibility)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['female', 'male'].map((g) => (
                <label
                  key={g}
                  className={`flex items-center justify-center p-2.5 rounded-2xl border text-xs font-bold cursor-pointer transition-all capitalize ${
                    formData.gender === g
                      ? g === 'female'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={formData.gender === g}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  {g === 'female' ? '👩 Female' : '👨 Male'}
                </label>
              ))}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Primary Role</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: ROLES.RIDER, label: 'PASSENGER (Book rides)' },
                { v: ROLES.DRIVER, label: 'DRIVER (Offer rides)' },
              ].map((r) => (
                <label
                  key={r.v}
                  className={`flex items-center justify-center text-center p-2.5 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${
                    formData.role === r.v
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.v}
                    checked={formData.role === r.v}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Admin accounts are created manually by the system owner and cannot be self-assigned.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Password" icon={Lock}>
              <input
                type="password"
                required
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputCls}
              />
            </Field>
            <Field label="Confirm" icon={Lock}>
              <input
                type="password"
                required
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#EA5858] hover:bg-[#dc4848] text-white font-extrabold text-base rounded-full shadow-lg shadow-red-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              <span>{loading ? 'Creating Account...' : 'Register'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="text-center py-5">
          <p className="text-xs text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-red-600 font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const inputCls =
  'w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400';

function Field({ label, icon: Icon, hint, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">{label}</label>
      <div className="relative">
        <Icon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
        {children}
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default RegisterScreen;
