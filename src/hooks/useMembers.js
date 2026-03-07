import { useCallback, useEffect, useState } from 'react';
import {
  collection, collectionGroup, getDocs, query, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, startAfter,
} from 'firebase/firestore';
import { db, DEFAULT_LGU_ID } from '../firebase';
import { sanitizeLguId } from '../utils/helpers';

const colRef = (lguId) => collection(db, 'lgus', lguId, 'members');
const globalColRef = () => collectionGroup(db, 'members');
const ADMIN_MEMBER_LIMIT = 50;
const PUBLIC_MEMBER_PAGE_SIZE = 24;
const GLOBAL_PUBLIC_MEMBER_FETCH_LIMIT = 300;

const membersQuery = (lguId) => query(colRef(lguId), orderBy('name'), limit(ADMIN_MEMBER_LIMIT));
const scopedPublicMembersPageQuery = (lguId, cursor = null) => (
  cursor
    ? query(colRef(lguId), orderBy('timestamp', 'desc'), startAfter(cursor), limit(PUBLIC_MEMBER_PAGE_SIZE))
    : query(colRef(lguId), orderBy('timestamp', 'desc'), limit(PUBLIC_MEMBER_PAGE_SIZE))
);
const globalPublicMembersSeedQuery = () => query(globalColRef(), limit(GLOBAL_PUBLIC_MEMBER_FETCH_LIMIT));
const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};
const memberSortValue = (entry) => (
  toMillis(entry.timestamp) || toMillis(entry.updatedAt) || toMillis(entry.createdAt)
);
const sortMembersByRecency = (rows) => [...rows].sort((a, b) => memberSortValue(b) - memberSortValue(a));
const mapMembers = (snap) => snap.docs.map((entry) => ({
  id: entry.id,
  ...entry.data(),
  lguId: sanitizeLguId(entry.ref.parent?.parent?.id || entry.data()?.lguId || ''),
}));

/**
 * One-time fetch for public member browsing.
 */
export function usePublicMembers(lguId = DEFAULT_LGU_ID, enabled = true, options = {}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const globalScope = Boolean(options.global);

  useEffect(() => {
    if (!enabled || (!globalScope && !lguId)) {
      setMembers([]);
      setHasMore(false);
      setLastVisible(null);
      setLoading(false);
      return undefined;
    }

    let ignore = false;

    const loadMembers = async () => {
      setLoading(true);
      try {
        const firstPageQuery = globalScope
          ? globalPublicMembersSeedQuery()
          : scopedPublicMembersPageQuery(lguId);
        const snap = await getDocs(firstPageQuery);
        if (!ignore) {
          const loadedMembers = mapMembers(snap);
          const nextMembers = globalScope
            ? sortMembersByRecency(loadedMembers).slice(0, PUBLIC_MEMBER_PAGE_SIZE)
            : loadedMembers;
          setMembers(nextMembers);
          setHasMore(false);
          setLastVisible(globalScope ? null : snap.docs.at(-1) || null);
          setLoading(false);
        }
      } catch (err) {
        console.error('[usePublicMembers]', err);
        if (!ignore) setLoading(false);
      }
    };

    loadMembers();

    return () => {
      ignore = true;
    };
  }, [enabled, globalScope, lguId]);

  const loadMore = useCallback(async () => {
    if (globalScope) return;
    if (!enabled || (!globalScope && !lguId) || !lastVisible || loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPageQuery = scopedPublicMembersPageQuery(lguId, lastVisible);
      const snap = await getDocs(nextPageQuery);
      const nextMembers = mapMembers(snap);
      setMembers(current => [...current, ...nextMembers]);
      setHasMore(snap.docs.length === PUBLIC_MEMBER_PAGE_SIZE);
      setLastVisible(snap.docs.at(-1) || null);
    } catch (err) {
      console.error('[usePublicMembers.loadMore]', err);
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, globalScope, hasMore, lastVisible, lguId, loading, loadingMore]);

  return { members, loading, loadingMore, hasMore, loadMore };
}

/**
 * Real-time listener for the admin members collection.
 * Returns members ordered by name, capped at 50.
 */
export function useAdminMembers(lguId = DEFAULT_LGU_ID, enabled = true) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled || !lguId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsub = onSnapshot(
      membersQuery(lguId),
      snap => {
        setMembers(mapMembers(snap));
        setLoading(false);
      },
      err => { console.error('[useAdminMembers]', err); setLoading(false); },
    );
    return unsub;
  }, [enabled, lguId]);

  return { members, loading };
}

export const useMembers = useAdminMembers;

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addMember = (payload, lguId = DEFAULT_LGU_ID) =>
  addDoc(colRef(lguId), { ...payload, isArchived: false, timestamp: serverTimestamp() });

export const updateMember = (id, payload, lguId = DEFAULT_LGU_ID) =>
  updateDoc(doc(db, 'lgus', lguId, 'members', id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });

export const deleteMember = (id, lguId = DEFAULT_LGU_ID) =>
  deleteDoc(doc(db, 'lgus', lguId, 'members', id));

export const archiveMember = (id, isArchived, lguId = DEFAULT_LGU_ID) =>
  updateDoc(doc(db, 'lgus', lguId, 'members', id), {
    isArchived,
    updatedAt: serverTimestamp(),
  });
