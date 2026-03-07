import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_PLATFORM_SETTINGS = {
  navTitle: '',
  logoUrl: '',
  seoSiteName: '',
  seoDefaultDescription: '',
  seoDefaultKeywords: '',
  seoOgImage: '',
  seoCanonicalBaseUrl: '',
  globalHeadHtml: '',
  adsEnabled: false,
  adsenseHeadHtml: '',
  adsDisableForAuthenticated: true,
  adsExcludePublic: false,
  adsExcludeInsights: true,
  adsExcludeContact: true,
  adsExcludeLogin: true,
  adsExcludeAdmin: true,
  adsExcludePlatform: true,
  stickyQrUrl: '',
  stickyFee1: 1500,
  stickyFee2: 2800,
  stickyFee3: 3900,
};

export function usePlatformSettings(enabled = true) {
  const [platformSettings, setPlatformSettings] = useState(DEFAULT_PLATFORM_SETTINGS);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let ignore = false;

    const loadPlatformSettings = async () => {
      setLoading(true);
      try {
        const snapshot = await getDoc(doc(db, 'setup', 'bootstrapped'));
        if (!ignore) {
          setPlatformSettings({
            ...DEFAULT_PLATFORM_SETTINGS,
            ...(snapshot.exists() ? snapshot.data()?.platformSettings || {} : {}),
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('[usePlatformSettings]', error);
        if (!ignore) setLoading(false);
      }
    };

    loadPlatformSettings();

    return () => {
      ignore = true;
    };
  }, [enabled]);

  return { platformSettings, loading };
}
