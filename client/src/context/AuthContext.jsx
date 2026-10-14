import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, DEMO_MODE } from '../services/firebase';
import {
  getUser,
  createUserProfile,
  listenUser,
  updateUser as fsUpdateUser,
  getDriverProfile,
  listenDriverProfile,
  upsertDriverProfile,
} from '../services/firestore';
import { ROLES, ACCOUNT_STATUS } from '../config/appConfig';

const AuthContext = createContext();
const DEMO_USER_KEY = 'campusride_demo_user';
const useDemoMode = () => DEMO_MODE || Boolean(sessionStorage.getItem(DEMO_USER_KEY));

// Translate Firebase auth error codes into friendly, non-leaky messages.
function friendlyAuthError(err) {
  const code = err?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Try signing in instead.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return err?.message || 'Authentication failed. Please try again.';
  }
}

// Normalise a role value read from Firestore (guards against stray whitespace
// or casing entered manually in the console, e.g. "admin ").
function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : role;
}

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null); // Firestore profile
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // `mode` lets a user who is both allowed to drive toggle the UI; it never
  // grants privileges — role in Firestore is the source of truth.
  const [mode, setMode] = useState(localStorage.getItem('campusride_mode') || 'passenger');

  // Watch Firebase auth session (handles restoration on refresh).
  useEffect(() => {
    if (useDemoMode()) {
      const saved = sessionStorage.getItem(DEMO_USER_KEY);
      if (saved) {
        const demo = JSON.parse(saved);
        setFirebaseUser({ uid: demo.uid, email: demo.email, displayName: demo.name });
        setUser(demo);
        if (demo.role === ROLES.DRIVER) {
          getDriverProfile(demo.uid).then(setDriverProfile);
          setMode('driver');
        }
      }
      setLoading(false);
      return undefined;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setDriverProfile(null);
        setLoading(false);
        return;
      }
      // Ensure a profile exists (covers accounts created outside the app).
      let profile = await getUser(fbUser.uid);
      if (!profile) {
        profile = await createUserProfile(fbUser.uid, {
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Student',
          email: fbUser.email || '',
          role: ROLES.RIDER,
        });
      }
      profile = { ...profile, role: normalizeRole(profile.role) };
      setUser(profile);
      if (profile.role === ROLES.DRIVER) {
        const dp = await getDriverProfile(fbUser.uid);
        setDriverProfile(dp);
        setMode('driver');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Keep profile live via Firestore listener once we know the uid.
  useEffect(() => {
    if (!firebaseUser || useDemoMode()) return undefined;
    const unsubUser = listenUser(firebaseUser.uid, (p) => p && setUser({ ...p, role: normalizeRole(p.role) }));
    const unsubDriver = listenDriverProfile(firebaseUser.uid, (dp) => setDriverProfile(dp));
    return () => {
      unsubUser();
      unsubDriver();
    };
  }, [firebaseUser]);

  const register = useCallback(async (form) => {
    try {
      // Password confirmation + basic validation handled in the screen; we
      // double-check the essentials here.
      if (!form.email || !form.password) {
        return { success: false, message: 'Email and password are required.' };
      }
      // Any email is allowed. College eligibility is proven via the college-ID
      // upload + admin approval, not the email domain.
      // Normal users can only be rider or driver — never admin.
      const safeRole = form.role === ROLES.DRIVER ? ROLES.DRIVER : ROLES.RIDER;

      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      let profile;
      try {
        // Persist the account's basic info in Firestore immediately. This is the
        // canonical record the admin portal, matching, and profile screens read.
        profile = await createUserProfile(cred.user.uid, {
          name: form.name,
          email: form.email.trim(),
          role: safeRole,
          phone: form.phone,
          college: form.college || '',
          course: form.course || '',
          graduationYear: form.graduationYear || '',
          gender: form.gender || '',
          usn: form.usn || '',
        });
        // Drivers also get a driverProfiles doc up-front (basic info only, still
        // unverified) so they exist in the datastore before vehicle setup.
        if (safeRole === ROLES.DRIVER) {
          await upsertDriverProfile(cred.user.uid, {
            name: form.name || '',
            email: form.email.trim(),
            phone: form.phone || '',
            usn: form.usn || '',
            availability: 'offline',
          });
        }
      } catch (writeErr) {
        // Do not leave an orphaned auth account with no profile: delete it so
        // the user can retry cleanly.
        try {
          await cred.user.delete();
        } catch {
          /* ignore — surface the original write error below */
        }
        // eslint-disable-next-line no-console
        console.error('[CampusRide] Failed to save account to Firestore:', writeErr?.code, writeErr?.message);
        return {
          success: false,
          message:
            'Could not save your details to the database. Please check your connection and try again.',
        };
      }
      setUser(profile);
      setMode(safeRole === ROLES.DRIVER ? 'driver' : 'passenger');
      localStorage.setItem('campusride_mode', safeRole === ROLES.DRIVER ? 'driver' : 'passenger');
      return { success: true, profile };
    } catch (err) {
      return { success: false, message: friendlyAuthError(err) };
    }
  }, []);

  const login = useCallback(async (email, password, options = {}) => {
    try {
      // Only an explicit demo action uses demo mode. A leftover demo session must
      // NEVER hijack a normal sign-in (that leaked demo data into real accounts).
      if (options.demo) {
        const normalized = email.trim().toLowerCase();
        const role = normalized.includes('driver')
          ? ROLES.DRIVER
          : normalized.includes('admin')
            ? ROLES.ADMIN
            : ROLES.RIDER;
        const demo = {
          id: role === ROLES.DRIVER ? 'demo-driver' : role === ROLES.ADMIN ? 'demo-admin' : 'demo-rider',
          uid: role === ROLES.DRIVER ? 'demo-driver' : role === ROLES.ADMIN ? 'demo-admin' : 'demo-rider',
          name: role === ROLES.DRIVER ? 'Demo Captain' : role === ROLES.ADMIN ? 'Demo Admin' : 'Demo Passenger',
          email: normalized,
          role,
          phone: '9000000000',
          verificationStatus: 'approved',
          accountStatus: ACCOUNT_STATUS.ACTIVE,
        };
        sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
        setFirebaseUser({ uid: demo.uid, email: demo.email, displayName: demo.name });
        setUser(demo);
        if (role === ROLES.DRIVER) {
          const dp = await getDriverProfile(demo.uid);
          setDriverProfile(dp || { uid: demo.uid, name: demo.name, vehicleType: 'Bike', vehicleModel: 'Demo Bike', vehicleNumber: 'DEMO-001', rating: 5, pinkRideEligible: true });
          setMode('driver');
        } else {
          setMode('passenger');
        }
        return { success: true, profile: demo };
      }
      // Real sign-in: purge any demo session + cached demo data so the real
      // account starts clean and the mock data layer is never used.
      sessionStorage.removeItem(DEMO_USER_KEY);
      localStorage.removeItem('campusride_demo_state');
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      let profile = await getUser(cred.user.uid);
      if (profile) profile = { ...profile, role: normalizeRole(profile.role) };
      if (profile?.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
        await signOut(auth);
        return { success: false, message: 'This account has been suspended. Contact the admin.' };
      }
      if (profile) {
        setUser(profile);
        setMode(profile.role === ROLES.DRIVER ? 'driver' : 'passenger');
        localStorage.setItem('campusride_mode', profile.role === ROLES.DRIVER ? 'driver' : 'passenger');
      }
      return { success: true, profile };
    } catch (err) {
      return { success: false, message: friendlyAuthError(err) };
    }
  }, []);

  const logout = useCallback(async () => {
    if (useDemoMode()) {
      sessionStorage.removeItem(DEMO_USER_KEY);
      setFirebaseUser(null);
      setUser(null);
      setDriverProfile(null);
      setMode('passenger');
      return;
    }
    await signOut(auth);
    localStorage.removeItem('campusride_mode');
    setUser(null);
    setDriverProfile(null);
    setMode('passenger');
  }, []);

  const switchMode = useCallback(
    (newMode) => {
      // Only a user whose role is driver may enter driver mode.
      if (newMode === 'driver' && user?.role !== ROLES.DRIVER) return;
      setMode(newMode);
      localStorage.setItem('campusride_mode', newMode);
    },
    [user]
  );

  const updateProfile = useCallback(
    async (patch) => {
      if (!firebaseUser) return { success: false, message: 'Not signed in' };
      try {
        await fsUpdateUser(firebaseUser.uid, patch);
        return { success: true };
      } catch (err) {
        return { success: false, message: err.message };
      }
    },
    [firebaseUser]
  );

  const refreshDriverProfile = useCallback(async () => {
    if (!firebaseUser) return;
    const dp = await getDriverProfile(firebaseUser.uid);
    setDriverProfile(dp);
  }, [firebaseUser]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        uid: firebaseUser?.uid || null,
        driverProfile,
        setDriverProfile,
        mode,
        loading,
        isAuthenticated: !!firebaseUser,
        isAdmin: user?.role === ROLES.ADMIN,
        register,
        login,
        logout,
        switchMode,
        updateProfile,
        refreshDriverProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
