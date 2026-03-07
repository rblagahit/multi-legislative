import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

function pad(value) {
  return String(value).padStart(2, '0');
}

function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeSearchTerm(term) {
  return String(term || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function writeDailyAnalytics(partial = {}) {
  const dateKey = getDateKey();
  await setDoc(doc(db, 'appAnalyticsDaily', dateKey), {
    date: dateKey,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    ...partial,
  }, { merge: true });
}

export async function trackPublicVisit() {
  return writeDailyAnalytics({
    visits: increment(1),
    pageViews: increment(1),
    sessions: increment(1),
  });
}

export async function trackPublicSearch(term) {
  const normalized = normalizeSearchTerm(term);
  if (!normalized || normalized.length < 2) return;

  const dateKey = getDateKey();
  const termKey = `${dateKey}__${normalized}`;

  await Promise.all([
    writeDailyAnalytics({
      searches: increment(1),
      totalSearches: increment(1),
    }),
    setDoc(doc(db, 'appSearchTermsDaily', termKey), {
      date: dateKey,
      searchTerm: term,
      term,
      count: increment(1),
      total: increment(1),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true }),
  ]);
}

export async function trackPublicDocumentOpen() {
  return writeDailyAnalytics({
    views: increment(1),
    documentViews: increment(1),
    docOpens: increment(1),
  });
}
