import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, increment, serverTimestamp,
} from 'firebase/firestore';
import { db, LGU_ID } from '../firebase';

const colRef = () => collection(db, 'lgus', LGU_ID, 'legislations');

/**
 * Real-time listener for the legislations collection.
 * Returns documents ordered by timestamp desc, capped at 200.
 */
export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const q    = query(colRef(), orderBy('timestamp', 'desc'), limit(200));
    const unsub = onSnapshot(
      q,
      snap => {
        setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => { console.error('[useDocuments]', err); setLoading(false); },
    );
    return unsub;
  }, []);

  return { documents, loading };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addDocument = (payload) =>
  addDoc(colRef(), { ...payload, views: 0, timestamp: serverTimestamp() });

export const updateDocument = (id, payload) =>
  updateDoc(doc(db, 'lgus', LGU_ID, 'legislations', id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });

export const deleteDocument = (id) =>
  deleteDoc(doc(db, 'lgus', LGU_ID, 'legislations', id));

export const incrementView = (id) =>
  updateDoc(doc(db, 'lgus', LGU_ID, 'legislations', id), {
    views: increment(1),
  });
