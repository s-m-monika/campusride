// Firebase initialisation. All values come from Vite env vars (VITE_ prefix),
// never hardcoded. See client/.env.example for the required variable names.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Helpful guard: if the config is missing, fail loudly in dev instead of
// silently producing confusing Firebase errors later.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !isFirebaseConfigured;
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

if (!isFirebaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    '[CampusRide] Firebase is not configured. Copy client/.env.example to ' +
      'client/.env and fill in your Firebase web config values.'
  );
}

// Without a real config, getAuth() throws `auth/invalid-api-key` and the whole
// app renders blank. Initialise with placeholders so demo mode still works;
// no Firebase calls are made while DEMO_MODE is on.
const app = initializeApp(
  isFirebaseConfigured
    ? firebaseConfig
    : { apiKey: 'demo-api-key', projectId: 'demo-campusride', appId: 'demo-app-id' }
);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
