import { useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { sanitizeLguId } from '../../utils/helpers';

let authActionPromise = null;

function loadAuthActions() {
  if (!authActionPromise) {
    authActionPromise = Promise.all([
      import('../../firebaseAuth'),
      import('firebase/auth'),
    ]).then(([firebaseAuthModule, authModule]) => ({
      auth: firebaseAuthModule.auth,
      signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
      createUserWithEmailAndPassword: authModule.createUserWithEmailAndPassword,
    }));
  }

  return authActionPromise;
}

/**
 * Admin login screen.
 * Handles email/password auth and maps Firebase error codes to readable messages.
 */
export default function LoginView({ navigateTo, showToast, portalMode = 'admin' }) {
  const [authTab, setAuthTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    orgName: '',
    lguSlug: '',
    position: '',
    phone: '',
  });
  const isBarangayPortal = portalMode === 'barangay';

  const ERROR_MAP = {
    'auth/invalid-email':      'Invalid email format.',
    'auth/user-not-found':     'Invalid email or password.',
    'auth/wrong-password':     'Invalid email or password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests':  'Too many attempts. Try later.',
  };

  useEffect(() => {
    if (isBarangayPortal) setAuthTab('signin');
  }, [isBarangayPortal]);

  useEffect(() => {
    let ignore = false;

    const loadSetup = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'setup', 'bootstrapped'));
        if (!ignore) setBootstrapped(snapshot.exists());
      } catch {
        if (!ignore) setBootstrapped(true);
      }
    };

    loadSetup();
    return () => {
      ignore = true;
    };
  }, []);

  const setRegisterValue = (key) => (event) => {
    const value = event.target.value;
    setRegisterForm((current) => ({
      ...current,
      [key]: key === 'lguSlug' ? sanitizeLguId(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }
    setLoading(true);
    try {
      const { auth, signInWithEmailAndPassword } = await loadAuthActions();
      await signInWithEmailAndPassword(auth, email, password);
      showToast(isBarangayPortal ? 'Welcome, Barangay Portal User' : 'Welcome, Admin', 'success');
      navigateTo('admin');
    } catch (err) {
      showToast('Login failed. ' + (ERROR_MAP[err.code] || 'Check your credentials.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (isBarangayPortal) {
      showToast('Barangay Portal registration is invite-only.', 'error');
      return;
    }

    const safeEmail = registerForm.email.trim().toLowerCase();
    const safeSlug = sanitizeLguId(registerForm.lguSlug);

    if (!safeEmail || !registerForm.password || !registerForm.name) {
      showToast('Please complete the required registration fields.', 'error');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (registerForm.password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }

    setRegistering(true);
    try {
      const { auth, createUserWithEmailAndPassword } = await loadAuthActions();
      const credential = await createUserWithEmailAndPassword(auth, safeEmail, registerForm.password);
      const inviteRef = doc(db, 'userInvites', safeEmail);
      const inviteSnap = await getDoc(inviteRef).catch(() => null);
      const inviteData = inviteSnap?.exists() ? inviteSnap.data() : null;

      const role = !bootstrapped
        ? 'superadmin'
        : inviteData?.status === 'pending'
          ? inviteData.role
          : 'pending';

      const lguId = role === 'pending' || role === 'superadmin' ? null : inviteData?.lguId || null;
      const barangayId = role === 'barangay_portal' ? inviteData?.barangayId || null : null;
      const barangayName = role === 'barangay_portal' ? inviteData?.barangayName || null : null;

      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email: safeEmail,
        name: registerForm.name.trim(),
        orgName: registerForm.orgName.trim() || null,
        requestedLguSlug: safeSlug || null,
        position: registerForm.position.trim() || null,
        contactEmail: safeEmail,
        contactPhone: registerForm.phone.trim() || null,
        role,
        status: role === 'pending' ? 'pending' : 'active',
        lguId,
        barangayId,
        barangayName,
        isComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (!bootstrapped) {
        await setDoc(doc(db, 'setup', 'bootstrapped'), {
          by: credential.user.uid,
          createdAt: serverTimestamp(),
        }, { merge: true });
      }

      if (inviteData?.status === 'pending') {
        await setDoc(inviteRef, {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          acceptedBy: credential.user.uid,
        }, { merge: true });
      }

      showToast(
        role === 'superadmin'
          ? 'Platform superadmin account created.'
          : role === 'pending'
            ? 'Account created. Awaiting role assignment.'
            : 'Account created and linked to your invite.',
        'success',
      );

      if (role === 'superadmin') navigateTo('platform');
      else if (role === 'pending') navigateTo('public');
      else navigateTo('admin');
    } catch (err) {
      console.error('[LoginView.handleRegister]', err);
      showToast('Registration failed. ' + (ERROR_MAP[err.code] || 'Please try again.'), 'error');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-float" />
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-float" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative">
        <div className="gradient-border">
          <div className="gradient-border-content p-10">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-lg">
                <i className={`fas ${isBarangayPortal ? 'fa-building-user' : 'fa-shield-alt'}`} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">{isBarangayPortal ? 'Barangay Portal' : 'Admin Portal'}</h3>
              <p className="text-slate-500 text-sm">
                {isBarangayPortal
                  ? 'Invite-only access for barangay-scoped documents and members'
                  : 'Sign in to manage documents &amp; members'}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                {isBarangayPortal
                  ? 'Use your invited barangay email. Contact your LGU admin if you need access or a reset.'
                  : 'Admins can also manage invited barangay portal users from the Users tab.'}
              </p>
            </div>

            <div className="mb-6 flex gap-1 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAuthTab('signin')}
                className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                  authTab === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => !isBarangayPortal && setAuthTab('register')}
                disabled={isBarangayPortal}
                className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                  authTab === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                } ${isBarangayPortal ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {isBarangayPortal ? 'Invite Only' : 'Create Account'}
              </button>
            </div>

            {authTab === 'signin' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                  <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={isBarangayPortal ? 'Barangay Registered Email' : 'Admin Email'} required
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div className="relative group">
                  <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" required
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl font-black shadow-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {loading
                    ? <><i className="fas fa-spinner fa-spin" /> Signing in…</>
                    : <><span>{isBarangayPortal ? 'Access Barangay Portal' : 'Access Dashboard'}</span><i className="fas fa-arrow-right" /></>
                  }
                </button>
                <button
                  type="button" onClick={() => navigateTo('public')}
                  className="w-full py-3 text-slate-400 font-bold hover:text-blue-600 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <i className="fas fa-arrow-left" /> Back to Public View
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative group">
                    <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                      type="text"
                      value={registerForm.name}
                      onChange={setRegisterValue('name')}
                      placeholder="Full Name"
                      required
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div className="relative group">
                    <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={setRegisterValue('email')}
                      placeholder="Email Address"
                      required
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative group">
                    <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={setRegisterValue('password')}
                      placeholder="Password"
                      required
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div className="relative group">
                    <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={setRegisterValue('confirmPassword')}
                      placeholder="Confirm Password"
                      required
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={registerForm.orgName}
                    onChange={setRegisterValue('orgName')}
                    placeholder="Organization / LGU Name"
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                  <input
                    type="text"
                    value={registerForm.lguSlug}
                    onChange={setRegisterValue('lguSlug')}
                    placeholder="Portal ID / LGU Slug"
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={registerForm.position}
                    onChange={setRegisterValue('position')}
                    placeholder="Position / Role"
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                  <input
                    type="tel"
                    value={registerForm.phone}
                    onChange={setRegisterValue('phone')}
                    placeholder="Contact Number"
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                <p className={`text-xs text-center ${bootstrapped ? 'text-slate-400' : 'text-amber-600 font-semibold'}`}>
                  {bootstrapped
                    ? 'New accounts are pending role assignment by the Super Admin unless matched to an invite.'
                    : 'No admin exists yet. Creating this account will bootstrap the Super Admin.'}
                </p>
                <button
                  type="submit"
                  disabled={registering}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {registering
                    ? <><i className="fas fa-spinner fa-spin" /> Creating account…</>
                    : <><span>Create Account</span><i className="fas fa-user-plus" /></>
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
