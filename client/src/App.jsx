import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RideProvider } from './context/RideContext';
import { ROLES, VERIFICATION_STATUS } from './config/appConfig';
import InstallPrompt from './components/InstallPrompt';

// Pages
import SplashScreen from './pages/SplashScreen';
import LoginScreen from './pages/LoginScreen';
import RegisterScreen from './pages/RegisterScreen';
import RoleSelectScreen from './pages/RoleSelectScreen';
import PassengerHome from './pages/PassengerHome';
import RideConfirmation from './pages/RideConfirmation';
import RideTracking from './pages/RideTracking';
import RideCompleted from './pages/RideCompleted';
import RiderRegistration from './pages/RiderRegistration';
import RiderDashboard from './pages/RiderDashboard';
import RideHistory from './pages/RideHistory';
import AlgorithmShowcase from './pages/AlgorithmShowcase';
import ProfileScreen from './pages/ProfileScreen';
import OcrVerification from './pages/OcrVerification';

// Admin portal
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRides from './pages/admin/AdminRides';
import AdminApplicationDetail from './pages/admin/AdminApplicationDetail';

const FullScreenLoader = ({ label = 'Loading CampusRide...' }) => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white font-bold text-sm">
    <div className="flex flex-col items-center space-y-2">
      <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      <span>{label}</span>
    </div>
  </div>
);

// Role-gated protected route. Unauthenticated users are redirected to /login.
// Users without the required role are sent to their own home. The Admin portal
// is NOT accessible to non-admins — this is enforced here AND by security rules.
//
// First-run gate: a freshly created (or rejected) account is sent to the college
// ID upload screen before it can use the app. The verification screen lets the
// user skip for the current session, which sets `campusride_skip_verify`.
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Profile may still be resolving on first paint after auth.
  if (!user) return <FullScreenLoader label="Loading your profile..." />;

  if (requiredRole && user.role !== requiredRole) {
    const fallback = user.role === ROLES.ADMIN ? '/admin' : user.role === ROLES.DRIVER ? '/driver' : '/home';
    return <Navigate to={fallback} replace />;
  }

  const needsIdVerification =
    user.role !== ROLES.ADMIN &&
    (!user.verificationStatus ||
      user.verificationStatus === VERIFICATION_STATUS.UNSUBMITTED ||
      user.verificationStatus === VERIFICATION_STATUS.REJECTED);
  const skippedThisSession = sessionStorage.getItem('campusride_skip_verify') === '1';
  if (needsIdVerification && !skippedThisSession && location.pathname !== '/verify-id') {
    return <Navigate to="/verify-id" replace />;
  }

  return children;
};

function MobileShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center md:py-6">
      <div className="mobile-frame w-full max-w-md bg-white min-h-screen min-h-dvh md:min-h-[844px] md:max-h-[900px] md:rounded-[40px] md:shadow-2xl md:border-8 md:border-slate-800 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MobileShell><SplashScreen /></MobileShell>} />
      <Route path="/login" element={<MobileShell><LoginScreen /></MobileShell>} />
      <Route path="/register" element={<MobileShell><RegisterScreen /></MobileShell>} />
      <Route path="/role" element={<MobileShell><RoleSelectScreen /></MobileShell>} />

      {/* Rider / passenger flow */}
      <Route path="/home" element={<ProtectedRoute><MobileShell><PassengerHome /></MobileShell></ProtectedRoute>} />
      <Route path="/verify-id" element={<ProtectedRoute><MobileShell><OcrVerification /></MobileShell></ProtectedRoute>} />
      <Route path="/confirm" element={<ProtectedRoute><MobileShell><RideConfirmation /></MobileShell></ProtectedRoute>} />
      <Route path="/tracking" element={<ProtectedRoute><MobileShell><RideTracking /></MobileShell></ProtectedRoute>} />
      <Route path="/completed" element={<ProtectedRoute><MobileShell><RideCompleted /></MobileShell></ProtectedRoute>} />

      {/* Driver flow */}
      <Route path="/driver-setup" element={<ProtectedRoute requiredRole={ROLES.DRIVER}><MobileShell><RiderRegistration /></MobileShell></ProtectedRoute>} />
      <Route path="/driver" element={<ProtectedRoute requiredRole={ROLES.DRIVER}><MobileShell><RiderDashboard /></MobileShell></ProtectedRoute>} />

      {/* Shared */}
      <Route path="/history" element={<ProtectedRoute><MobileShell><RideHistory /></MobileShell></ProtectedRoute>} />
      <Route path="/algorithms" element={<ProtectedRoute><MobileShell><AlgorithmShowcase /></MobileShell></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><MobileShell><ProfileScreen /></MobileShell></ProtectedRoute>} />

      {/* Admin portal — responsive full-width, not inside the mobile frame */}
      <Route path="/admin" element={<ProtectedRoute requiredRole={ROLES.ADMIN}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminOverview />} />
        <Route path="verifications" element={<AdminVerifications />} />
        <Route path="verifications/:appId" element={<AdminApplicationDetail />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="rides" element={<AdminRides />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RideProvider>
          <AppRoutes />
          <InstallPrompt />
        </RideProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
