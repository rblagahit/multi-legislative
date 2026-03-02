import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// ─── Config from environment variables ───────────────────────────────────────
// Values live in .env (never committed). See .env.example for the template.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth   = getAuth(app);
export const db     = getFirestore(app);

// LGU identifier used in Firestore paths: lgus/{LGU_ID}/...
export const LGU_ID = import.meta.env.VITE_LGU_ID || 'sb-argao';

// ─── Firebase App Check ───────────────────────────────────────────────────────
// Prevents unauthorized API calls from outside your web app.
//
// Setup steps:
//   1. Go to Firebase Console → App Check → Apps → Register your web app
//   2. Choose reCAPTCHA v3 as provider
//   3. Register your domain at https://www.google.com/recaptcha/admin/create
//   4. Copy the site key into VITE_RECAPTCHA_SITE_KEY in .env
//
// In development: a debug token is auto-generated. Open DevTools console,
// copy the token, then add it in Firebase Console → App Check → Apps →
// Manage debug tokens.

if (import.meta.env.PROD) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (siteKey && siteKey !== 'your-recaptcha-v3-site-key') {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    console.warn('[AppCheck] VITE_RECAPTCHA_SITE_KEY not set — App Check disabled in production.');
  }
} else {
  // Development: enable debug mode so App Check tokens can be generated locally.
  // eslint-disable-next-line no-restricted-globals
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('debug'),
    isTokenAutoRefreshEnabled: true,
  });
}
