/**
 * Bootstrap script — Phase 1, Step 3
 * ────────────────────────────────────────────────────────────────────────────
 * Sets Firebase Custom Claims and creates the users/{uid} Firestore document
 * for the initial admin account.
 *
 * Run once. Delete the service account key file immediately after.
 *
 * Prerequisites:
 *   1. Place serviceAccountKey.json in THIS directory (scripts/)
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. cd scripts && npm install
 *
 * Usage:
 *   node set-admin-claims.js
 *
 * After running:
 *   - Delete scripts/serviceAccountKey.json
 *   - Admin (rblagahit@gmail.com) must sign out and back in to refresh their JWT
 * ────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// ── Config ────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'rblagahit@gmail.com';
const ADMIN_ROLE  = 'admin';
const LGU_ID      = 'sb-argao';
// ─────────────────────────────────────────────────────────────────────────────

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function bootstrap() {
  console.log('─'.repeat(60));
  console.log('SB Argao — Phase 1 Admin Bootstrap');
  console.log('─'.repeat(60));

  // Step 1 — Resolve UID from email
  console.log(`\n[1/3] Looking up user: ${ADMIN_EMAIL}`);
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`\n  ERROR: No Firebase Auth user found for ${ADMIN_EMAIL}`);
      console.error('  Make sure this account exists in Firebase Console → Authentication.');
    } else {
      console.error('\n  ERROR fetching user:', err.message);
    }
    process.exit(1);
  }

  const uid = userRecord.uid;
  console.log(`  ✓ Found user  uid: ${uid}`);
  console.log(`  ✓ Email verified: ${userRecord.emailVerified}`);

  // Step 2 — Set Custom Claims
  console.log(`\n[2/3] Setting Custom Claims  { role: '${ADMIN_ROLE}', lguId: '${LGU_ID}' }`);
  try {
    await admin.auth().setCustomUserClaims(uid, {
      role:  ADMIN_ROLE,
      lguId: LGU_ID,
    });
    console.log('  ✓ Custom Claims set');
  } catch (err) {
    console.error('\n  ERROR setting claims:', err.message);
    process.exit(1);
  }

  // Step 3 — Create/update users/{uid} document
  console.log(`\n[3/3] Writing Firestore document  users/${uid}`);
  try {
    await db.collection('users').doc(uid).set(
      {
        email:     ADMIN_EMAIL,
        name:      userRecord.displayName || '',
        role:      ADMIN_ROLE,
        lguId:     LGU_ID,
        status:    'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'bootstrap',
        lastLogin: null,
      },
      { merge: true }  // safe to re-run; won't overwrite existing fields not listed here
    );
    console.log('  ✓ Firestore document written');
  } catch (err) {
    console.error('\n  ERROR writing Firestore document:', err.message);
    console.error('  Check that your service account has Firestore write permission.');
    process.exit(1);
  }

  // Done
  console.log('\n' + '─'.repeat(60));
  console.log('Bootstrap complete.');
  console.log('─'.repeat(60));
  console.log('\nNEXT STEPS:');
  console.log('  1. Delete scripts/serviceAccountKey.json immediately');
  console.log('  2. Verify claims are set:');
  console.log('       Firebase Console → Authentication → Users → ' + ADMIN_EMAIL);
  console.log('       Click the user → check "Custom claims" field');
  console.log(`       Expected: {"role":"${ADMIN_ROLE}","lguId":"${LGU_ID}"}`);
  console.log('  3. Admin signs out and back in to refresh their JWT');
  console.log('  4. Proceed to Step 6: verify claims in DevTools console:');
  console.log('       (await firebase.auth().currentUser.getIdTokenResult()).claims');
  console.log('');
}

bootstrap()
  .catch(err => {
    console.error('\nUnhandled error:', err);
    process.exit(1);
  })
  .finally(() => {
    // Force exit — Admin SDK keeps the process alive otherwise
    setTimeout(() => process.exit(0), 500);
  });
