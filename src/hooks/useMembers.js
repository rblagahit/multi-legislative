import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from 'firebase/firestore';
import { db, LGU_ID } from '../firebase';

const colRef = () => collection(db, 'lgus', LGU_ID, 'members');

/**
 * Real-time listener for the members collection.
 * Returns members ordered by name, capped at 50.
 */
export function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q    = query(colRef(), orderBy('name'), limit(50));
    const unsub = onSnapshot(
      q,
      snap => {
        setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => { console.error('[useMembers]', err); setLoading(false); },
    );
    return unsub;
  }, []);

  return { members, loading };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addMember = (payload) =>
  addDoc(colRef(), { ...payload, isArchived: false, timestamp: serverTimestamp() });

export const updateMember = (id, payload) =>
  updateDoc(doc(db, 'lgus', LGU_ID, 'members', id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });

export const deleteMember = (id) =>
  deleteDoc(doc(db, 'lgus', LGU_ID, 'members', id));

export const archiveMember = (id, isArchived) =>
  updateDoc(doc(db, 'lgus', LGU_ID, 'members', id), {
    isArchived,
    updatedAt: serverTimestamp(),
  });
