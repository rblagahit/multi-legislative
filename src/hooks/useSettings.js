import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, LGU_ID } from '../firebase';
import { DEFAULT_DOWNLOAD_NOTICE } from '../utils/constants';

const settingsRef = () =>
  doc(db, 'lgus', LGU_ID, 'settings', 'general');

const DEFAULTS = {
  downloadNotice: DEFAULT_DOWNLOAD_NOTICE,
  socialFacebook: '',
  socialTwitter:  '',
  socialEmail:    '',
  orgName:        '',
  municipality:   '',
  province:       '',
  sealUrl:        '',
  contactPhone1:  '',
  contactPhone2:  '',
  contactEmail:   '',
};

/**
 * Real-time listener for the settings document.
 * Returns current settings merged with defaults.
 */
export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      settingsRef(),
      snap => {
        setSettings(snap.exists() ? { ...DEFAULTS, ...snap.data() } : DEFAULTS);
        setLoading(false);
      },
      err => { console.error('[useSettings]', err); setLoading(false); },
    );
    return unsub;
  }, []);

  return { settings, loading };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export const saveSettings = (uid, partial) =>
  setDoc(settingsRef(), { ...partial, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true });
