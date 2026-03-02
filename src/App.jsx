import { useState, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useDocuments } from './hooks/useDocuments';
import { useMembers } from './hooks/useMembers';
import { useSettings } from './hooks/useSettings';

import Navbar   from './components/layout/Navbar';
import Footer   from './components/layout/Footer';
import Toast    from './components/layout/Toast';

import PublicView  from './components/public/PublicView';
import LoginView   from './components/auth/LoginView';
import AdminView   from './components/admin/AdminView';
import ContactView from './components/contact/ContactView';

// ─── Navigation views ─────────────────────────────────────────────────────────
const VIEWS = /** @type {const} */ (['public', 'login', 'admin', 'contact']);

export default function App() {
  const [view, setView]   = useState('public');
  const [toast, setToast] = useState(null); // { message, type }

  const { user, loading: authLoading, logout } = useAuth();
  const { documents, loading: docsLoading }    = useDocuments();
  const { members,   loading: membersLoading } = useMembers();
  const { settings,  loading: settLoading }    = useSettings();

  const navigateTo = useCallback((v) => {
    if (VIEWS.includes(v)) setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  // Redirect away from admin panel when logged out
  if (!authLoading && !user && view === 'admin') navigateTo('public');

  const sharedProps = { navigateTo, showToast, user, documents, members, settings };

  return (
    <>
      <Navbar
        user={user}
        settings={settings}
        currentView={view}
        navigateTo={navigateTo}
        logout={logout}
      />

      <main className="flex-1">
        {view === 'public'  && <PublicView  {...sharedProps} />}
        {view === 'login'   && <LoginView   navigateTo={navigateTo} showToast={showToast} />}
        {view === 'admin'   && user && <AdminView {...sharedProps} />}
        {view === 'contact' && <ContactView settings={settings} />}
      </main>

      <Footer settings={settings} navigateTo={navigateTo} />

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
