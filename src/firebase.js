import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// ─── Config from environment variables ───────────────────────────────────────
// Values live in .env (never committed). See .env.example for the template.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    || (import.meta.env.VITE_FIREBASE_PROJECT_ID
      ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`
      : undefined),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

export const db     = getFirestore(app);

// LGU identifier used in Firestore paths: lgus/{LGU_ID}/...
export const DEFAULT_LGU_ID = import.meta.env.VITE_LGU_ID || 'sb-argao';

// ─── Firebase App Check ───────────────────────────────────────────────────────
// Prevents unauthorized API calls from outside your web app.
//
// Setup steps:
//   1. Go to Firebase Console → App Check → Apps → Register your web app
//   2. Choose reCAPTCHA v3 as provider
//   3. Register your domain at https://www.google.com/recaptcha/admin/create
//   4. Copy the site key into VITE_RECAPTCHA_SITE_KEY in .env
//
// In development: set VITE_RECAPTCHA_SITE_KEY in .env and set
// FIREBASE_APPCHECK_DEBUG_TOKEN=true in .env (or hard-code a debug UUID here).
// Open DevTools console to see the generated debug token, then register it in
// Firebase Console → App Check → Apps → Manage debug tokens.

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (siteKey) {
  if (!import.meta.env.PROD) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else {
  console.warn('[AppCheck] VITE_RECAPTCHA_SITE_KEY not set — App Check disabled.');
}
