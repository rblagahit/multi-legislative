import { useCallback, useEffect, useState } from 'react';
import {
  collection, collectionGroup, count, getAggregateFromServer, getDocs, query, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, increment, serverTimestamp, startAfter, sum, where,
} from 'firebase/firestore';
import { db, DEFAULT_LGU_ID } from '../firebase';
import { sanitizeLguId } from '../utils/helpers';

const colRef = (lguId) => collection(db, 'lgus', lguId, 'legislations');
const importsColRef = (lguId) => collection(db, 'lgus', lguId, 'legislationImports');
const globalColRef = () => collectionGroup(db, 'legislations');
const ADMIN_DOCUMENT_LIMIT = 200;
const IMPORTS_LIMIT = 100;
const PUBLIC_DOCUMENT_PAGE_SIZE = 24;
const EMPTY_DOC_STATS = {
  totalDocs: 0,
  ordinanceCount: 0,
  resolutionCount: 0,
  totalViews: 0,
};

const documentsQuery = (lguId) => query(colRef(lguId), orderBy('timestamp', 'desc'), limit(ADMIN_DOCUMENT_LIMIT));
const documentImportsQuery = (lguId) => query(importsColRef(lguId), orderBy('createdAt', 'desc'), limit(IMPORTS_LIMIT));
const scopedPublicDocumentsPageQuery = (lguId, cursor = null) => (
  cursor
    ? query(colRef(lguId), orderBy('timestamp', 'desc'), startAfter(cursor), limit(PUBLIC_DOCUMENT_PAGE_SIZE))
    : query(colRef(lguId), orderBy('timestamp', 'desc'), limit(PUBLIC_DOCUMENT_PAGE_SIZE))
);
const globalPublicDocumentsPageQuery = (cursor = null) => (
  cursor
    ? query(globalColRef(), orderBy('timestamp', 'desc'), startAfter(cursor), limit(PUBLIC_DOCUMENT_PAGE_SIZE))
    : query(globalColRef(), orderBy('timestamp', 'desc'), limit(PUBLIC_DOCUMENT_PAGE_SIZE))
);
const mapDocuments = (snap) => snap.docs.map((entry) => ({
  id: entry.id,
  ...entry.data(),
  lguId: sanitizeLguId(entry.ref.parent?.parent?.id || entry.data()?.lguId || ''),
}));
const mapImports = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

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
  const globalScope = Boolean(options.global);

  useEffect(() => {
    if (!enabled || (!globalScope && !lguId)) {
      setDocuments([]);
      setStats(EMPTY_DOC_STATS);
      setHasMore(false);
      setLastVisible(null);
      setLoading(false);
      return undefined;
    }

    let ignore = false;

    const loadDocuments = async () => {
      setLoading(true);
      try {
        const scopedDocumentsRef = globalScope ? globalColRef() : colRef(lguId);
        const firstPageQuery = globalScope
          ? globalPublicDocumentsPageQuery()
          : scopedPublicDocumentsPageQuery(lguId);
        const [pageSnap, aggregateResults] = await Promise.all([
          getDocs(firstPageQuery),
          Promise.allSettled([
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
          ]),
        ]);
        if (!ignore) {
          const nextDocuments = mapDocuments(pageSnap);
          const pageStatsFallback = {
            totalDocs: nextDocuments.length,
            ordinanceCount: nextDocuments.filter(doc => doc.type === 'Ordinance').length,
            resolutionCount: nextDocuments.filter(doc => doc.type === 'Resolution').length,
            totalViews: nextDocuments.reduce((acc, doc) => acc + Number(doc.views || 0), 0),
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
          setHasMore(pageSnap.docs.length === PUBLIC_DOCUMENT_PAGE_SIZE);
          setLastVisible(pageSnap.docs.at(-1) || null);
          setStats({
            totalDocs: aggregateStats?.totalDocs || pageStatsFallback.totalDocs,
            ordinanceCount: ordinanceStats?.total || pageStatsFallback.ordinanceCount,
            resolutionCount: resolutionStats?.total || pageStatsFallback.resolutionCount,
            totalViews: Number(aggregateStats?.totalViews || pageStatsFallback.totalViews),
          });
          setLoading(false);
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
    if (!enabled || (!globalScope && !lguId) || !lastVisible || loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPageQuery = globalScope
        ? globalPublicDocumentsPageQuery(lastVisible)
        : scopedPublicDocumentsPageQuery(lguId, lastVisible);
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

  return { documents, loading, loadingMore, hasMore, loadMore, stats };
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

export const addDocument = (payload, lguId = DEFAULT_LGU_ID) =>
  addDoc(colRef(lguId), { ...payload, views: 0, timestamp: serverTimestamp() });

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

export const updateDocument = (id, payload, lguId = DEFAULT_LGU_ID) =>
  updateDoc(doc(db, 'lgus', lguId, 'legislations', id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });

export const deleteDocument = (id, lguId = DEFAULT_LGU_ID) =>
  deleteDoc(doc(db, 'lgus', lguId, 'legislations', id));

export const deleteDocumentImport = (id, lguId = DEFAULT_LGU_ID) =>
  deleteDoc(doc(db, 'lgus', lguId, 'legislationImports', id));

export const incrementView = (id, lguId = DEFAULT_LGU_ID) =>
  updateDoc(doc(db, 'lgus', lguId, 'legislations', id), {
    views: increment(1),
  });
