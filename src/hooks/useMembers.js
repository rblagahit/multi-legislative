import { useCallback, useEffect, useState } from 'react';
import {
  collection, getDoc, getDocs, query, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, setDoc, startAfter,
} from 'firebase/firestore';
import { db, DEFAULT_LGU_ID } from '../firebase';
import { sanitizeLguId } from '../utils/helpers';

const colRef = (lguId) => collection(db, 'lgus', lguId, 'members');
const settingsDocRef = (lguId) => doc(db, 'lgus', lguId, 'settings', 'general');
const publicMembersColRef = () => collection(db, 'publicMembers');
const publicMemberRef = (id) => doc(db, 'publicMembers', id);
const ADMIN_MEMBER_LIMIT = 50;
const PUBLIC_MEMBER_PAGE_SIZE = 24;
const membersQuery = (lguId) => query(colRef(lguId), orderBy('name'), limit(ADMIN_MEMBER_LIMIT));
const publicMembersIndexRecentQuery = () => query(publicMembersColRef(), orderBy('timestamp', 'desc'), limit(PUBLIC_MEMBER_PAGE_SIZE));
const scopedPublicMembersPageQuery = (lguId, cursor = null) => (
  cursor
    ? query(colRef(lguId), orderBy('timestamp', 'desc'), startAfter(cursor), limit(PUBLIC_MEMBER_PAGE_SIZE))
    : query(colRef(lguId), orderBy('timestamp', 'desc'), limit(PUBLIC_MEMBER_PAGE_SIZE))
);
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
async function buildPublicMemberPayload(id, payload, lguId, existing = null) {
  const settingsSnap = await getDoc(settingsDocRef(lguId)).catch(() => null);
  const settings = settingsSnap?.exists() ? settingsSnap.data() : {};
  const merged = { ...(existing || {}), ...(payload || {}) };

  return {
    name: merged.name || '',
    role: merged.role || '',
    image: merged.image || '',
    termStart: merged.termStart || '',
    termEnd: merged.termEnd || '',
    committees: Array.isArray(merged.committees) ? merged.committees : [],
    bio: merged.bio || '',
    additionalInfo: merged.additionalInfo || '',
    contactEmail: merged.contactEmail || '',
    facebook: merged.facebook || '',
    instagram: merged.instagram || '',
    x: merged.x || '',
    socialFacebook: merged.socialFacebook || '',
    socialTwitter: merged.socialTwitter || '',
    socialEmail: merged.socialEmail || '',
    barangayId: merged.barangayId || '',
    barangayName: merged.barangayName || merged._barangayName || '',
    lguId,
    municipality: merged.municipality || settings.municipality || '',
    province: merged.province || settings.province || '',
    orgName: merged.orgName || settings.orgName || '',
    isArchived: Boolean(merged.isArchived),
    stickyActive: Boolean(merged.stickyActive),
    stickyMonths: Number(merged.stickyMonths || 0) || 0,
    stickyRequestId: merged.stickyRequestId || '',
    stickyExpiresAt: merged.stickyExpiresAt || null,
    profileViews: Number.isFinite(Number(merged.profileViews)) ? Number(merged.profileViews) : 0,
    timestamp: merged.timestamp || merged.updatedAt || merged.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    sourceMemberId: id,
  };
}

async function resolveExistingMember(id, lguId, existing = null) {
  if (existing) return existing;
  const snapshot = await getDoc(doc(db, 'lgus', lguId, 'members', id)).catch(() => null);
  return snapshot?.exists() ? snapshot.data() : null;
}

export async function syncPublicMemberIndex(id, payload, lguId, existing = null) {
  const existingPayload = await resolveExistingMember(id, lguId, existing);
  const publicPayload = await buildPublicMemberPayload(id, payload, lguId, existingPayload);
  await setDoc(publicMemberRef(id), publicPayload, { merge: true });
}

export async function removePublicMemberIndex(id) {
  await deleteDoc(publicMemberRef(id)).catch(() => {});
}

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
        const snap = globalScope
          ? await getDocs(publicMembersIndexRecentQuery())
          : await getDocs(scopedPublicMembersPageQuery(lguId));
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

export const addMember = async (payload, lguId = DEFAULT_LGU_ID) => {
  const memberPayload = { ...payload, isArchived: false, timestamp: serverTimestamp() };
  const createdRef = await addDoc(colRef(lguId), memberPayload);
  await syncPublicMemberIndex(createdRef.id, memberPayload, lguId);
  return createdRef;
};

export const updateMember = async (id, payload, lguId = DEFAULT_LGU_ID) => {
  const targetRef = doc(db, 'lgus', lguId, 'members', id);
  const existingSnap = await getDoc(targetRef).catch(() => null);
  const existingPayload = existingSnap?.exists() ? existingSnap.data() : null;

  await updateDoc(targetRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
  await syncPublicMemberIndex(id, payload, lguId, existingPayload);
};

export const deleteMember = async (id, lguId = DEFAULT_LGU_ID) => {
  await deleteDoc(doc(db, 'lgus', lguId, 'members', id));
  await removePublicMemberIndex(id);
};

export const archiveMember = async (id, isArchived, lguId = DEFAULT_LGU_ID) => {
  const targetRef = doc(db, 'lgus', lguId, 'members', id);
  const existingSnap = await getDoc(targetRef).catch(() => null);
  const existingPayload = existingSnap?.exists() ? existingSnap.data() : null;

  await updateDoc(targetRef, {
    isArchived,
    updatedAt: serverTimestamp(),
  });
  await syncPublicMemberIndex(id, { isArchived }, lguId, existingPayload);
};
