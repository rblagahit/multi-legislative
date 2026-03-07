import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAdminDocuments, usePublicDocuments } from './hooks/useDocuments';
import { useAdminMembers, usePublicMembers } from './hooks/useMembers';
import { useAdminSettings, usePublicSettings } from './hooks/useSettings';
import { usePlatformSettings } from './hooks/usePlatformSettings';
import { useSeo } from './hooks/useSeo';
import { useTenant } from './hooks/useTenant';
import { ADMIN_PANEL_ROLES, PLATFORM_PANEL_ROLES } from './utils/constants';
import { buildAppPath, resolveAppLocation } from './utils/publicRoutes';

import Navbar   from './components/layout/Navbar';
import Footer   from './components/layout/Footer';
import Toast    from './components/layout/Toast';

import PublicView from './components/public/PublicView';

const LoginView = lazy(() => import('./components/auth/LoginView'));
const AdminView = lazy(() => import('./components/admin/AdminView'));
const ContactView = lazy(() => import('./components/contact/ContactView'));
const InsightsView = lazy(() => import('./components/insights/InsightsView'));
const PlatformView = lazy(() => import('./components/platform/PlatformView'));

// ─── Navigation views ─────────────────────────────────────────────────────────
const VIEWS = /** @type {const} */ (['public', 'insights', 'login', 'barangay-login', 'admin', 'platform', 'contact']);

function ViewFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-16 text-slate-400">
      <div className="flex items-center gap-3 text-sm font-semibold">
        <i className="fas fa-spinner fa-spin text-lg" />
        <span>Loading view…</span>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView]   = useState(() => resolveAppLocation(window.location.pathname).view);
  const [toast, setToast] = useState(null); // { message, type }
  const deniedAccessRef   = useRef(false);

  const { user, userRole, userLguId, loading: authLoading, logout } = useAuth();
  const { tenantId, publicPortalUrl } = useTenant(userLguId);
  const { platformSettings } = usePlatformSettings();

  const navigateTo = useCallback((v, options = {}) => {
    if (!VIEWS.includes(v)) return;
    const nextPath = buildAppPath(v);
    const nextUrl = `${window.location.origin}${nextPath}${window.location.hash || ''}`;

    if (options.replace) {
      window.history.replaceState(null, '', nextUrl);
    } else if (`${window.location.pathname}${window.location.hash}` !== `${nextPath}${window.location.hash || ''}`) {
      window.history.pushState(null, '', nextUrl);
    }

    setView(v);
    if (options.scroll !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const navigateToSection = useCallback((sectionId) => {
    navigateTo('public', { scroll: false });

    let attempts = 0;
    const tryScroll = () => {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (attempts < 8) {
        attempts += 1;
        window.setTimeout(tryScroll, 120);
      }
    };

    window.setTimeout(tryScroll, 0);
  }, [navigateTo]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const canAccessAdmin = Boolean(user && userRole && ADMIN_PANEL_ROLES.includes(userRole));
  const canAccessPlatform = Boolean(user && userRole && PLATFORM_PANEL_ROLES.includes(userRole));
  const isAdminMode = view === 'admin' && canAccessAdmin;
  const shouldLoadPublicData = !isAdminMode;
  const publicDocsState = usePublicDocuments(tenantId, shouldLoadPublicData);
  const adminDocsState = useAdminDocuments(tenantId, isAdminMode);
  const publicMembersState = usePublicMembers(tenantId, shouldLoadPublicData);
  const adminMembersState = useAdminMembers(tenantId, isAdminMode);
  const publicSettingsState = usePublicSettings(tenantId, shouldLoadPublicData);
  const adminSettingsState = useAdminSettings(tenantId, isAdminMode);

  const documents = isAdminMode ? adminDocsState.documents : publicDocsState.documents;
  const members = isAdminMode ? adminMembersState.members : publicMembersState.members;
  const settings = isAdminMode ? adminSettingsState.settings : publicSettingsState.settings;
  useSeo(view, settings, platformSettings, null, { user, userRole });

  useEffect(() => {
    const handlePopState = () => {
      setView(resolveAppLocation(window.location.pathname).view);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const appLoading = authLoading
    || (isAdminMode ? adminDocsState.loading : publicDocsState.loading)
    || (isAdminMode ? adminMembersState.loading : publicMembersState.loading)
    || (isAdminMode ? adminSettingsState.loading : publicSettingsState.loading);

  useEffect(() => {
    if (authLoading || view !== 'admin') return;

    if (!user) {
      deniedAccessRef.current = false;
      navigateTo('public', { replace: true, scroll: false });
      return;
    }

    if (!canAccessAdmin) {
      if (!deniedAccessRef.current) {
        showToast('This account does not have dashboard access.', 'error');
        deniedAccessRef.current = true;
      }
      navigateTo('public', { replace: true, scroll: false });
      return;
    }

    deniedAccessRef.current = false;
  }, [authLoading, canAccessAdmin, navigateTo, showToast, user, view]);

  useEffect(() => {
    if (authLoading || view !== 'platform') return;

    if (!user) {
      deniedAccessRef.current = false;
      navigateTo('public', { replace: true, scroll: false });
      return;
    }

    if (!canAccessPlatform) {
      if (!deniedAccessRef.current) {
        showToast('Platform access requires superadmin role.', 'error');
        deniedAccessRef.current = true;
      }
      navigateTo('public', { replace: true, scroll: false });
      return;
    }

    deniedAccessRef.current = false;
  }, [authLoading, canAccessPlatform, navigateTo, showToast, user, view]);

  const sharedProps = {
    navigateTo,
    showToast,
    user,
    userRole,
    tenantId,
    publicPortalUrl,
    documents,
    documentStats: publicDocsState.stats,
    hasMoreDocuments: !isAdminMode && publicDocsState.hasMore,
    loadingMoreDocuments: !isAdminMode && publicDocsState.loadingMore,
    loadMoreDocuments: publicDocsState.loadMore,
    members,
    hasMoreMembers: !isAdminMode && publicMembersState.hasMore,
    loadingMoreMembers: !isAdminMode && publicMembersState.loadingMore,
    loadMoreMembers: publicMembersState.loadMore,
    settings,
    platformSettings,
    loading: appLoading,
  };

  return (
    <>
      <Navbar
        user={user}
        canAccessAdmin={canAccessAdmin}
        canAccessPlatform={canAccessPlatform}
        settings={settings}
        platformSettings={platformSettings}
        navigateTo={navigateTo}
        navigateToSection={navigateToSection}
        logout={logout}
      />

      <main className="flex-1">
        {view === 'public'  && <PublicView  {...sharedProps} />}
        {view === 'login'   && (
          <Suspense fallback={<ViewFallback />}>
            <LoginView navigateTo={navigateTo} showToast={showToast} />
          </Suspense>
        )}
        {view === 'barangay-login' && (
          <Suspense fallback={<ViewFallback />}>
            <LoginView navigateTo={navigateTo} showToast={showToast} portalMode="barangay" />
          </Suspense>
        )}
        {view === 'insights' && (
          <Suspense fallback={<ViewFallback />}>
            <InsightsView {...sharedProps} />
          </Suspense>
        )}
        {view === 'admin'   && canAccessAdmin && (
          <Suspense fallback={<ViewFallback />}>
            <AdminView {...sharedProps} />
          </Suspense>
        )}
        {view === 'platform' && canAccessPlatform && (
          <Suspense fallback={<ViewFallback />}>
            <PlatformView {...sharedProps} />
          </Suspense>
        )}
        {view === 'contact' && (
          <Suspense fallback={<ViewFallback />}>
            <ContactView settings={settings} />
          </Suspense>
        )}
      </main>

      <Footer
        settings={settings}
        platformSettings={platformSettings}
        navigateTo={navigateTo}
        navigateToSection={navigateToSection}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}
