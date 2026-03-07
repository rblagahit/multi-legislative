import { useEffect, useState } from 'react';
import { DEFAULT_LGU_ID } from '../firebase';
import { sanitizeLguId } from '../utils/helpers';

const readHashTenantId = () => {
  if (typeof window === 'undefined') return '';
  return sanitizeLguId(window.location.hash.slice(1));
};

export function useTenant(userLguId) {
  const [hashTenantId, setHashTenantId] = useState(readHashTenantId);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleHashChange = () => {
      setHashTenantId(readHashTenantId());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const accountTenantId = sanitizeLguId(userLguId);
  const tenantId = accountTenantId || hashTenantId || DEFAULT_LGU_ID;

  return {
    tenantId,
    hashTenantId,
    accountTenantId,
    isAccountScoped: Boolean(accountTenantId),
    publicPortalUrl: typeof window === 'undefined'
      ? ''
      : `${window.location.origin}${window.location.pathname}${tenantId === DEFAULT_LGU_ID ? '' : `#${tenantId}`}`,
  };
}
