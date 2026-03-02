/**
 * Data migration script — Phase 1 (path migration)
 * ────────────────────────────────────────────────────────────────────────────
 * Copies all Firestore documents from the old path structure to the new one.
 * Does NOT delete old documents — the old paths remain intact as a safety net.
 * After verifying the app works on new paths, old data can be deleted manually.
 *
 * Old structure:
 *   artifacts/sb-argao/public/data/members/{id}
 *   artifacts/sb-argao/public/data/legislations/{id}
 *   artifacts/sb-argao/public/data/settings/general
 *   artifacts/sb-argao/admin/profile            → merged into users/{uid}
 *
 * New structure:
 *   lgus/sb-argao/members/{id}
 *   lgus/sb-argao/legislations/{id}
 *   lgus/sb-argao/settings/general
 *   users/{uid}                                 → already written by set-admin-claims.js
 *
 * Prerequisites:
 *   1. Place serviceAccountKey.json in THIS directory (scripts/)
 *   2. Run set-admin-claims.js first (creates users/{uid} document)
 *   3. cd scripts && npm install (if not done already)
 *
 * Usage:
 *   node migrate-paths.js
 *
 * After verifying the app works on new paths:
 *   - Delete old data via Firebase Console or a cleanup script
 *   - Remove serviceAccountKey.json immediately after use
 * ────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// ── Config ────────────────────────────────────────────────────────────────────
const OLD_LGU_ID = 'sb-argao';   // old: artifacts/{OLD_LGU_ID}/...
const NEW_LGU_ID = 'sb-argao';   // new: lgus/{NEW_LGU_ID}/...
const ADMIN_EMAIL = 'rblagahit@gmail.com';
// ─────────────────────────────────────────────────────────────────────────────

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function copyCollection(oldPath, newPath) {
  const oldCol = db.collection(oldPath);
  const snap   = await oldCol.get();

  if (snap.empty) {
    console.log(`  (empty — skipping) ${oldPath}`);
    return 0;
  }

  const batch = db.batch();
  snap.docs.forEach(d => {
    batch.set(db.collection(newPath).doc(d.id), d.data());
  });
  await batch.commit();
  return snap.size;
}

async function copyDoc(oldDocPath, newDocPath) {
  const snap = await db.doc(oldDocPath).get();
  if (!snap.exists) {
    console.log(`  (not found — skipping) ${oldDocPath}`);
    return false;
  }
  await db.doc(newDocPath).set(snap.data(), { merge: true });
  return true;
}

// ── Migration steps ───────────────────────────────────────────────────────────

async function migrate() {
  console.log('─'.repeat(60));
  console.log('SB Argao — Firestore Path Migration');
  console.log('─'.repeat(60));

  // ── 1. Members ─────────────────────────────────────────────────────────────
  console.log('\n[1/4] Members');
  console.log(`  FROM: artifacts/${OLD_LGU_ID}/public/data/members`);
  console.log(`    TO: lgus/${NEW_LGU_ID}/members`);
  const memberCount = await copyCollection(
    `artifacts/${OLD_LGU_ID}/public/data/members`,
    `lgus/${NEW_LGU_ID}/members`,
  );
  console.log(`  ✓ ${memberCount} member(s) copied`);

  // ── 2. Legislations ────────────────────────────────────────────────────────
  console.log('\n[2/4] Legislations');
  console.log(`  FROM: artifacts/${OLD_LGU_ID}/public/data/legislations`);
  console.log(`    TO: lgus/${NEW_LGU_ID}/legislations`);
  const docCount = await copyCollection(
    `artifacts/${OLD_LGU_ID}/public/data/legislations`,
    `lgus/${NEW_LGU_ID}/legislations`,
  );
  console.log(`  ✓ ${docCount} legislation(s) copied`);

  // ── 3. Settings ────────────────────────────────────────────────────────────
  console.log('\n[3/4] Settings');
  console.log(`  FROM: artifacts/${OLD_LGU_ID}/public/data/settings/general`);
  console.log(`    TO: lgus/${NEW_LGU_ID}/settings/general`);
  const settingsCopied = await copyDoc(
    `artifacts/${OLD_LGU_ID}/public/data/settings/general`,
    `lgus/${NEW_LGU_ID}/settings/general`,
  );
  console.log(`  ${settingsCopied ? '✓ settings copied' : '✗ settings not found (will use defaults)'}`);

  // ── 4. Admin profile → users/{uid} ────────────────────────────────────────
  console.log('\n[4/4] Admin profile → users/{uid}');
  console.log(`  FROM: artifacts/${OLD_LGU_ID}/admin/profile`);
  const adminUser = await admin.auth().getUserByEmail(ADMIN_EMAIL).catch(() => null);
  if (!adminUser) {
    console.log(`  ✗ Could not find Firebase Auth user for ${ADMIN_EMAIL} — skipping`);
  } else {
    const uid      = adminUser.uid;
    const oldSnap  = await db.doc(`artifacts/${OLD_LGU_ID}/admin/profile`).get();
    if (oldSnap.exists) {
      const { name, position, contactEmail, image, bio, additionalInfo } = oldSnap.data();
      await db.doc(`users/${uid}`).set(
        { name: name || '', position: position || '', contactEmail: contactEmail || '',
          image: image || '', bio: bio || '', additionalInfo: additionalInfo || '',
          isComplete: true },
        { merge: true },
      );
      console.log(`  ✓ profile fields merged into users/${uid}`);
    } else {
      console.log(`    TO: users/${uid}`);
      console.log('  (not found — skipping; users/{uid} was created by set-admin-claims.js)');
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Migration complete. Old data is untouched.');
  console.log('─'.repeat(60));
  console.log('\nNEXT STEPS:');
  console.log('  1. Deploy updated client code and Firestore rules');
  console.log('  2. Smoke test the app on new paths');
  console.log('  3. Once confirmed working, delete old data:');
  console.log(`       artifacts/${OLD_LGU_ID}/  (via Firebase Console)`);
  console.log('  4. Delete scripts/serviceAccountKey.json immediately');
  console.log('');
}

migrate()
  .catch(err => { console.error('\nMigration failed:', err); process.exit(1); })
  .finally(() => setTimeout(() => process.exit(0), 500));
