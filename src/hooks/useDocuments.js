import { useCallback, useEffect, useState } from 'react';
import {
  collection, count, getAggregateFromServer, getDoc, getDocs, query, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, increment, serverTimestamp, setDoc, startAfter, sum, where,
} from 'firebase/firestore';
import { db, DEFAULT_LGU_ID } from '../firebase';
import { sanitizeLguId } from '../utils/helpers';

const colRef = (lguId) => collection(db, 'lgus', lguId, 'legislations');
const importsColRef = (lguId) => collection(db, 'lgus', lguId, 'legislationImports');
const settingsDocRef = (lguId) => doc(db, 'lgus', lguId, 'settings', 'general');
const publicDocumentsColRef = () => collection(db, 'publicDocuments');
const publicDocumentRef = (docId) => doc(db, 'publicDocuments', docId);
const ADMIN_DOCUMENT_LIMIT = 200;
const IMPORTS_LIMIT = 100;
const PUBLIC_DOCUMENT_PAGE_SIZE = 24;
const EMPTY_DOC_STATS = {
  totalDocs: 0,
  ordinanceCount: 0,
  resolutionCount: 0,
  totalViews: 0,
};
const GLOBAL_PUBLIC_DOCUMENT_FETCH_LIMIT = 400;

const documentsQuery = (lguId) => query(colRef(lguId), orderBy('timestamp', 'desc'), limit(ADMIN_DOCUMENT_LIMIT));
const documentImportsQuery = (lguId) => query(importsColRef(lguId), orderBy('createdAt', 'desc'), limit(IMPORTS_LIMIT));
const publicDocumentsIndexRecentQuery = () => query(publicDocumentsColRef(), orderBy('timestamp', 'desc'), limit(PUBLIC_DOCUMENT_PAGE_SIZE));
const publicDocumentsIndexSeedQuery = () => query(publicDocumentsColRef(), orderBy('timestamp', 'desc'), limit(GLOBAL_PUBLIC_DOCUMENT_FETCH_LIMIT));
const scopedPublicDocumentsPageQuery = (lguId, cursor = null) => (
  cursor
    ? query(colRef(lguId), orderBy('timestamp', 'desc'), startAfter(cursor), limit(PUBLIC_DOCUMENT_PAGE_SIZE))
    : query(colRef(lguId), orderBy('timestamp', 'desc'), limit(PUBLIC_DOCUMENT_PAGE_SIZE))
);
const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};
const documentSortValue = (entry) => (
  toMillis(entry.timestamp) || toMillis(entry.updatedAt) || toMillis(entry.createdAt)
);
const sortDocumentsByRecency = (rows) => [...rows].sort((a, b) => documentSortValue(b) - documentSortValue(a));
const mapDocuments = (snap) => snap.docs.map((entry) => ({
  id: entry.id,
  ...entry.data(),
  lguId: sanitizeLguId(entry.ref.parent?.parent?.id || entry.data()?.lguId || ''),
}));
const mapImports = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const dedupeDocuments = (rows) => {
  const seen = new Set();
  return rows.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
};
const buildDirectoryOptions = (rows) => {
  const municipalities = new Map();
  const barangays = new Map();

  rows.forEach((entry) => {
    const lguId = sanitizeLguId(entry.lguId || '');
    if (lguId) {
      const municipality = String(entry.municipality || '').trim();
      const province = String(entry.province || '').trim();
      const orgName = String(entry.orgName || '').trim();
      const label = municipality
        ? [municipality, province].filter(Boolean).join(', ')
        : orgName || lguId;

      municipalities.set(lguId, {
        id: lguId,
        lguId,
        label,
        municipality,
        province,
        orgName,
      });
    }

    const barangayId = sanitizeLguId(entry.barangayId || '');
    const barangayName = String(entry.barangayName || entry._barangayName || '').trim();
    if (lguId && barangayId && barangayName) {
      barangays.set(`${lguId}:${barangayId}`, {
        id: `${lguId}:${barangayId}`,
        lguId,
        barangayId,
        label: barangayName,
      });
    }
  });

  return {
    municipalities: [...municipalities.values()].sort((a, b) => a.label.localeCompare(b.label)),
    barangays: [...barangays.values()].sort((a, b) => a.label.localeCompare(b.label)),
  };
};
const EMPTY_DIRECTORY = {
  municipalities: [],
  barangays: [],
};

async function buildPublicDocumentPayload(id, payload, lguId, existing = null) {
  const settingsSnap = await getDoc(settingsDocRef(lguId)).catch(() => null);
  const settings = settingsSnap?.exists() ? settingsSnap.data() : {};
  const merged = { ...(existing || {}), ...(payload || {}) };

  return {
    title: merged.title || '',
    docId: merged.docId || '',
    type: merged.type || 'Ordinance',
    authorId: merged.authorId || '',
    authorName: merged.authorName || '',
    authorImage: merged.authorImage || '',
    authorRole: merged.authorRole || '',
    link: merged.link || '',
    tags: Array.isArray(merged.tags) ? merged.tags : [],
    coSponsors: Array.isArray(merged.coSponsors) ? merged.coSponsors : [],
    moreInfo: merged.moreInfo || '',
    barangayId: merged.barangayId || '',
    barangayName: merged.barangayName || merged._barangayName || '',
    lguId,
    municipality: merged.municipality || settings.municipality || '',
    province: merged.province || settings.province || '',
    orgName: merged.orgName || settings.orgName || '',
    views: Number.isFinite(Number(merged.views)) ? Number(merged.views) : 0,
    timestamp: merged.timestamp || serverTimestamp(),
    updatedAt: serverTimestamp(),
    sourceDocumentId: id,
  };
}

async function upsertPublicDocumentIndex(id, payload, lguId, existing = null) {
  const publicPayload = await buildPublicDocumentPayload(id, payload, lguId, existing);
  await setDoc(publicDocumentRef(id), publicPayload, { merge: true });
}

/**
 * One-time fetch for public document browsing.
 * Public users do not need a live Firestore subscription.
 */
export function usePublicDocuments(lguId = DEFAULT_LGU_ID, enabled = true, options = {}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(Boolean(enabled));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [stats, setStats] = useState(EMPTY_DOC_STATS);
  const [directory, setDirectory] = useState(EMPTY_DIRECTORY);
  const globalScope = Boolean(options.global);

  useEffect(() => {
    if (!enabled || (!globalScope && !lguId)) {
      setDocuments([]);
      setStats(EMPTY_DOC_STATS);
      setDirectory(EMPTY_DIRECTORY);
      setHasMore(false);
      setLastVisible(null);
      setLoading(false);
      return undefined;
    }

    let ignore = false;

    const loadDocuments = async () => {
      setLoading(true);
      try {
        const scopedDocumentsRef = colRef(lguId);
        const aggregatePromise = globalScope
          ? Promise.resolve([])
          : Promise.allSettled([
            getAggregateFromServer(scopedDocumentsRef, {
              totalDocs: count(),
              totalViews: sum('views'),
            }),
            getAggregateFromServer(
              query(scopedDocumentsRef, where('type', '==', 'Ordinance')),
              { total: count() },
            ),
            getAggregateFromServer(
              query(scopedDocumentsRef, where('type', '==', 'Resolution')),
              { total: count() },
            ),
          ]);

        const [pageSnap, aggregateResults] = globalScope
          ? await Promise.all([
            getDocs(publicDocumentsIndexRecentQuery()),
            aggregatePromise,
          ])
          : await Promise.all([
            getDocs(scopedPublicDocumentsPageQuery(lguId)),
            aggregatePromise,
          ]);
        if (!ignore) {
          const loadedDocuments = mapDocuments(pageSnap);
          const nextDocuments = globalScope
            ? sortDocumentsByRecency(loadedDocuments).slice(0, PUBLIC_DOCUMENT_PAGE_SIZE)
            : loadedDocuments;
          const pageStatsFallback = {
            totalDocs: globalScope ? nextDocuments.length : loadedDocuments.length,
            ordinanceCount: (globalScope ? nextDocuments : loadedDocuments).filter(doc => doc.type === 'Ordinance').length,
            resolutionCount: (globalScope ? nextDocuments : loadedDocuments).filter(doc => doc.type === 'Resolution').length,
            totalViews: (globalScope ? nextDocuments : loadedDocuments).reduce((acc, doc) => acc + Number(doc.views || 0), 0),
          };
          const aggregateStats = aggregateResults[0]?.status === 'fulfilled'
            ? aggregateResults[0].value.data()
            : null;
          const ordinanceStats = aggregateResults[1]?.status === 'fulfilled'
            ? aggregateResults[1].value.data()
            : null;
          const resolutionStats = aggregateResults[2]?.status === 'fulfilled'
            ? aggregateResults[2].value.data()
            : null;

          setDocuments(nextDocuments);
          setDirectory(globalScope ? buildDirectoryOptions(loadedDocuments) : EMPTY_DIRECTORY);
          setHasMore(false);
          setLastVisible(globalScope ? null : pageSnap.docs.at(-1) || null);
          setStats({
            totalDocs: aggregateStats?.totalDocs || pageStatsFallback.totalDocs,
            ordinanceCount: ordinanceStats?.total || pageStatsFallback.ordinanceCount,
            resolutionCount: resolutionStats?.total || pageStatsFallback.resolutionCount,
            totalViews: Number(aggregateStats?.totalViews || pageStatsFallback.totalViews),
          });
          setLoading(false);

          if (globalScope) {
            getDocs(publicDocumentsIndexSeedQuery())
              .then((seedSnap) => {
                if (ignore) return;
                const directoryRows = dedupeDocuments([
                  ...loadedDocuments,
                  ...mapDocuments(seedSnap),
                ]);
                setDirectory(buildDirectoryOptions(directoryRows));
              })
              .catch((error) => {
                console.error('[usePublicDocuments.seedDirectory]', error);
              });
          }
        }
      } catch (err) {
        console.error('[usePublicDocuments]', err);
        if (!ignore) setLoading(false);
      }
    };

    loadDocuments();

    return () => {
      ignore = true;
    };
  }, [enabled, globalScope, lguId]);

  const loadMore = useCallback(async () => {
    if (globalScope) return;
    if (!enabled || (!globalScope && !lguId) || !lastVisible || loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPageQuery = scopedPublicDocumentsPageQuery(lguId, lastVisible);
      const snap = await getDocs(nextPageQuery);
      const nextDocs = mapDocuments(snap);
      setDocuments(current => [...current, ...nextDocs]);
      setHasMore(snap.docs.length === PUBLIC_DOCUMENT_PAGE_SIZE);
      setLastVisible(snap.docs.at(-1) || null);
    } catch (err) {
      console.error('[usePublicDocuments.loadMore]', err);
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, globalScope, hasMore, lastVisible, lguId, loading, loadingMore]);

  return { documents, loading, loadingMore, hasMore, loadMore, stats, ...directory };
}

/**
 * Real-time listener for the admin document manager.
 * Returns documents ordered by timestamp desc, capped at 200.
 */
export function useAdminDocuments(lguId = DEFAULT_LGU_ID, enabled = true) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled || !lguId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsub = onSnapshot(
      documentsQuery(lguId),
      snap => {
        setDocuments(mapDocuments(snap));
        setLoading(false);
      },
      err => { console.error('[useAdminDocuments]', err); setLoading(false); },
    );
    return unsub;
  }, [enabled, lguId]);

  return { documents, loading };
}

export function useDocumentImports(lguId = DEFAULT_LGU_ID, enabled = true) {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled || !lguId) {
      setImports([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsub = onSnapshot(
      documentImportsQuery(lguId),
      snap => {
        setImports(mapImports(snap));
        setLoading(false);
      },
      err => {
        console.error('[useDocumentImports]', err);
        setLoading(false);
      },
    );

    return unsub;
  }, [enabled, lguId]);

  return { imports, loading };
}

export const useDocuments = useAdminDocuments;

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addDocument = async (payload, lguId = DEFAULT_LGU_ID) => {
  const documentPayload = { ...payload, views: 0, timestamp: serverTimestamp() };
  const createdRef = await addDoc(colRef(lguId), documentPayload);
  await upsertPublicDocumentIndex(createdRef.id, documentPayload, lguId);
  return createdRef;
};

export const addDocumentImport = (payload, lguId = DEFAULT_LGU_ID) =>
  addDoc(importsColRef(lguId), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const updateDocumentImport = (id, payload, lguId = DEFAULT_LGU_ID) =>
  updateDoc(doc(db, 'lgus', lguId, 'legislationImports', id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });

export const updateDocument = async (id, payload, lguId = DEFAULT_LGU_ID) => {
  const targetRef = doc(db, 'lgus', lguId, 'legislations', id);
  const existingSnap = await getDoc(targetRef).catch(() => null);
  const existingPayload = existingSnap?.exists() ? existingSnap.data() : null;

  await updateDoc(targetRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
  await upsertPublicDocumentIndex(id, payload, lguId, existingPayload);
};

export const deleteDocument = async (id, lguId = DEFAULT_LGU_ID) => {
  await deleteDoc(doc(db, 'lgus', lguId, 'legislations', id));
  await deleteDoc(publicDocumentRef(id)).catch(() => {});
};

export const deleteDocumentImport = (id, lguId = DEFAULT_LGU_ID) =>
  deleteDoc(doc(db, 'lgus', lguId, 'legislationImports', id));

export const incrementView = async (id, lguId = DEFAULT_LGU_ID) => {
  await updateDoc(doc(db, 'lgus', lguId, 'legislations', id), {
    views: increment(1),
  });
  await updateDoc(publicDocumentRef(id), {
    views: increment(1),
  }).catch(() => {});
};
