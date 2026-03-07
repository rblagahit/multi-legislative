import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

let authRuntimePromise = null;
const AUTH_SESSION_HINT_KEY = 'erp-legislative-auth-session';

function readAuthSessionHint() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeAuthSessionHint(isAuthenticated) {
  if (typeof window === 'undefined') return;
  try {
    if (isAuthenticated) {
      window.localStorage.setItem(AUTH_SESSION_HINT_KEY, '1');
    } else {
      window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
    }
  } catch {
    // Ignore storage errors so auth state can still function.
  }
}

function loadAuthRuntime() {
  if (!authRuntimePromise) {
    authRuntimePromise = Promise.all([
      import('../firebaseAuth'),
      import('firebase/auth'),
    ]).then(([firebaseAuthModule, authModule]) => ({
      auth: firebaseAuthModule.auth,
      onAuthStateChanged: authModule.onAuthStateChanged,
      signOut: authModule.signOut,
    }));
  }

  return authRuntimePromise;
}

/**
 * Tracks Firebase auth state and exposes helpers.
 * Role and lguId are read from users/{uid} in Firestore (not Custom Claims).
 * When disabled, auth does not bootstrap until an auth-required route enables it.
 * @returns {{ user, userRole, userLguId, loading, logout, isAuthenticated }}
 */
export function useAuth(enabled = true) {
  const [user, setUser]           = useState(null);
  const [userRole, setUserRole]   = useState(null);
  const [userLguId, setUserLguId] = useState(null);
  const [loading, setLoading]     = useState(Boolean(enabled));
  const [isAuthenticatedHint, setIsAuthenticatedHint] = useState(() => readAuthSessionHint());
  const hasBootstrappedRef = useRef(false);
  const unsubscribeRef = useRef(() => {});

  useEffect(() => {
    let isActive = true;
    const shouldBootstrap = enabled || isAuthenticatedHint;

    if (!shouldBootstrap && !hasBootstrappedRef.current) {
      setLoading(false);
      return () => {};
    }

    if (hasBootstrappedRef.current || !shouldBootstrap) {
      return () => {};
    }

    setLoading(true);
    hasBootstrappedRef.current = true;

    loadAuthRuntime()
      .then(({ auth, onAuthStateChanged }) => {
        if (!isActive) return;

        unsubscribeRef.current = onAuthStateChanged(auth, async u => {
          setUser(u);
          setIsAuthenticatedHint(Boolean(u));
          writeAuthSessionHint(Boolean(u));

          if (u) {
            try {
              const snap = await getDoc(doc(db, 'users', u.uid));
              if (snap.exists()) {
                const d = snap.data();
                setUserRole(d.role || null);
                setUserLguId(d.lguId || null);
              } else {
                setUserRole(null);
                setUserLguId(null);
              }
            } catch {
              setUserRole(null);
              setUserLguId(null);
            }
          } else {
            setUserRole(null);
            setUserLguId(null);
          }

          setLoading(false);
        });
      })
      .catch((error) => {
        console.error('[useAuth.loadAuthRuntime]', error);
        if (!isActive) return;
        setUser(null);
        setUserRole(null);
        setUserLguId(null);
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [enabled, isAuthenticatedHint]);

  useEffect(() => () => {
    unsubscribeRef.current();
  }, []);

  const logout = async () => {
    try {
      const { auth, signOut } = await loadAuthRuntime();
      await signOut(auth);
      setIsAuthenticatedHint(false);
      writeAuthSessionHint(false);
    } catch (err) {
      console.error('[auth] logout error:', err);
    }
  };

  return {
    user,
    userRole,
    userLguId,
    loading,
    logout,
    isAuthenticated: Boolean(user) || isAuthenticatedHint,
  };
}

/**
 * Checks whether the admin profile document exists and is complete at users/{uid}.
 */
export async function checkAdminProfileComplete(user) {
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    return snap.exists() && snap.data().isComplete === true;
  } catch {
    return false;
  }
}
