import { useEffect, useState } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { sanitizeLguId } from '../utils/helpers';

const EMPTY_DIRECTORY = {
  municipalities: [],
  barangays: [],
};

const sortByLabel = (a, b) => a.label.localeCompare(b.label);

export function usePublicDirectory(enabled = true) {
  const [directory, setDirectory] = useState(EMPTY_DIRECTORY);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setDirectory(EMPTY_DIRECTORY);
      setLoading(false);
      return undefined;
    }

    let ignore = false;

    const loadDirectory = async () => {
      setLoading(true);
      try {
        const [settingsSnap, barangaysSnap] = await Promise.all([
          getDocs(collectionGroup(db, 'settings')),
          getDocs(collectionGroup(db, 'barangays')),
        ]);

        if (ignore) return;

        const municipalities = settingsSnap.docs
          .map((entry) => {
            const lguId = sanitizeLguId(entry.ref.parent?.parent?.id || '');
            const payload = entry.data() || {};
            const municipality = String(payload.municipality || '').trim();
            const province = String(payload.province || '').trim();
            const orgName = String(payload.orgName || '').trim();
            const label = municipality
              ? [municipality, province].filter(Boolean).join(', ')
              : orgName || lguId;

            return lguId
              ? {
                id: lguId,
                lguId,
                label,
                municipality,
                province,
                orgName,
              }
              : null;
          })
          .filter(Boolean)
          .sort(sortByLabel);

        const barangays = barangaysSnap.docs
          .map((entry) => {
            const lguId = sanitizeLguId(entry.ref.parent?.parent?.id || '');
            const payload = entry.data() || {};
            const barangayId = sanitizeLguId(payload.code || entry.id);
            const label = String(payload.name || payload.code || entry.id || '').trim();

            return lguId && barangayId && label
              ? {
                id: `${lguId}:${barangayId}`,
                lguId,
                barangayId,
                label,
                captain: String(payload.captain || '').trim(),
              }
              : null;
          })
          .filter(Boolean)
          .sort(sortByLabel);

        setDirectory({ municipalities, barangays });
        setLoading(false);
      } catch (error) {
        console.error('[usePublicDirectory]', error);
        if (!ignore) {
          setDirectory(EMPTY_DIRECTORY);
          setLoading(false);
        }
      }
    };

    loadDirectory();

    return () => {
      ignore = true;
    };
  }, [enabled]);

  return { ...directory, loading };
}
