'use strict';

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;
const BATCH_LIMIT = 400;

function sanitizeLguId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function resolveTimestamp(...values) {
  for (const value of values) {
    if (!value) continue;
    if (value instanceof Timestamp) return value;
    if (typeof value.toDate === 'function') {
      return Timestamp.fromDate(value.toDate());
    }
    if (typeof value.seconds === 'number') {
      return new Timestamp(value.seconds, value.nanoseconds || 0);
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return Timestamp.fromDate(parsed);
    }
  }
  return Timestamp.now();
}

async function getSettingsCache() {
  const snapshot = await db.collectionGroup('settings').get();
  const cache = new Map();

  snapshot.docs.forEach((docSnap) => {
    if (docSnap.id !== 'general') return;
    const lguId = sanitizeLguId(docSnap.ref.parent?.parent?.id || '');
    if (!lguId) return;
    cache.set(lguId, docSnap.data() || {});
  });

  return cache;
}

function buildPublicDocumentPayload(docSnap, lguId, settings) {
  const payload = docSnap.data() || {};
  return {
    title: payload.title || '',
    docId: payload.docId || '',
    type: payload.type || 'Ordinance',
    authorId: payload.authorId || '',
    authorName: payload.authorName || '',
    authorImage: payload.authorImage || '',
    authorRole: payload.authorRole || '',
    link: payload.link || '',
    tags: normalizeArray(payload.tags),
    coSponsors: normalizeArray(payload.coSponsors),
    moreInfo: payload.moreInfo || '',
    barangayId: payload.barangayId || '',
    barangayName: payload.barangayName || payload._barangayName || '',
    lguId,
    municipality: payload.municipality || settings.municipality || '',
    province: payload.province || settings.province || '',
    orgName: payload.orgName || settings.orgName || '',
    views: Number(payload.views || 0) || 0,
    timestamp: resolveTimestamp(payload.timestamp, payload.updatedAt, payload.createdAt),
    updatedAt: FieldValue.serverTimestamp(),
    sourceDocumentId: docSnap.id,
  };
}

function buildPublicMemberPayload(docSnap, lguId, settings) {
  const payload = docSnap.data() || {};
  return {
    name: payload.name || '',
    role: payload.role || '',
    image: payload.image || '',
    termStart: payload.termStart || '',
    termEnd: payload.termEnd || '',
    committees: normalizeArray(payload.committees),
    bio: payload.bio || '',
    additionalInfo: payload.additionalInfo || '',
    contactEmail: payload.contactEmail || '',
    facebook: payload.facebook || '',
    instagram: payload.instagram || '',
    x: payload.x || '',
    socialFacebook: payload.socialFacebook || '',
    socialTwitter: payload.socialTwitter || '',
    socialEmail: payload.socialEmail || '',
    barangayId: payload.barangayId || '',
    barangayName: payload.barangayName || payload._barangayName || '',
    lguId,
    municipality: payload.municipality || settings.municipality || '',
    province: payload.province || settings.province || '',
    orgName: payload.orgName || settings.orgName || '',
    isArchived: Boolean(payload.isArchived),
    stickyActive: Boolean(payload.stickyActive),
    stickyMonths: Number(payload.stickyMonths || 0) || 0,
    stickyRequestId: payload.stickyRequestId || '',
    stickyExpiresAt: payload.stickyExpiresAt || null,
    profileViews: Number(payload.profileViews || 0) || 0,
    timestamp: resolveTimestamp(payload.timestamp, payload.updatedAt, payload.createdAt),
    updatedAt: FieldValue.serverTimestamp(),
    sourceMemberId: docSnap.id,
  };
}

async function commitChunk(entries, label) {
  if (!entries.length) return;
  const batch = db.batch();
  entries.forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
  await batch.commit();
  console.log(`  ✓ ${entries.length} ${label} written`);
}

async function backfillCollection(groupName, targetCollection, buildPayload, label, settingsCache) {
  console.log(`\n[${label}] ${groupName} -> ${targetCollection}`);
  const snapshot = await db.collectionGroup(groupName).get();

  if (snapshot.empty) {
    console.log('  (empty — nothing to backfill)');
    return 0;
  }

  let chunk = [];
  let total = 0;

  for (const docSnap of snapshot.docs) {
    const lguId = sanitizeLguId(docSnap.ref.parent?.parent?.id || docSnap.data()?.lguId || '');
    if (!lguId) continue;

    const settings = settingsCache.get(lguId) || {};
    chunk.push({
      ref: db.collection(targetCollection).doc(docSnap.id),
      data: buildPayload(docSnap, lguId, settings),
    });

    if (chunk.length >= BATCH_LIMIT) {
      await commitChunk(chunk, label);
      total += chunk.length;
      chunk = [];
    }
  }

  if (chunk.length) {
    await commitChunk(chunk, label);
    total += chunk.length;
  }

  return total;
}

async function main() {
  console.log('─'.repeat(60));
  console.log('Public index backfill');
  console.log('─'.repeat(60));

  const settingsCache = await getSettingsCache();
  console.log(`Loaded settings for ${settingsCache.size} LGU(s)`);

  const documentsTotal = await backfillCollection(
    'legislations',
    'publicDocuments',
    buildPublicDocumentPayload,
    'documents',
    settingsCache,
  );

  const membersTotal = await backfillCollection(
    'members',
    'publicMembers',
    buildPublicMemberPayload,
    'members',
    settingsCache,
  );

  console.log('\n' + '─'.repeat(60));
  console.log(`Backfill complete: ${documentsTotal} documents, ${membersTotal} members`);
  console.log('─'.repeat(60));
  console.log('\nNEXT STEPS:');
  console.log('  1. Deploy the latest client code and Firestore rules');
  console.log('  2. cd scripts && npm install');
  console.log('  3. Add scripts/serviceAccountKey.json');
  console.log('  4. Run: npm run backfill:public-index');
  console.log('  5. Delete scripts/serviceAccountKey.json immediately after use');
  console.log('');
}

main()
  .catch((error) => {
    console.error('\nBackfill failed:', error);
    process.exit(1);
  })
  .finally(() => setTimeout(() => process.exit(0), 500));
