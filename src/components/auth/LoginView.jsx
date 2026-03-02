import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

/**
 * Admin login screen.
 * Handles email/password auth and maps Firebase error codes to readable messages.
 */
export default function LoginView({ navigateTo, showToast }) {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const ERROR_MAP = {
    'auth/invalid-email':      'Invalid email format.',
    'auth/user-not-found':     'Invalid email or password.',
    'auth/wrong-password':     'Invalid email or password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests':  'Too many attempts. Try later.',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Welcome, Admin', 'success');
      navigateTo('admin');
    } catch (err) {
      showToast('Login failed. ' + (ERROR_MAP[err.code] || 'Check your credentials.'), 'error');
    } finally {
      setLoading(false);
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
                <i className="fas fa-shield-alt" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">Admin Portal</h3>
              <p className="text-slate-500 text-sm">Sign in to manage documents &amp; members</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Admin Email" required
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
                  : <><span>Access Dashboard</span><i className="fas fa-arrow-right" /></>
                }
              </button>
              <button
                type="button" onClick={() => navigateTo('public')}
                className="w-full py-3 text-slate-400 font-bold hover:text-blue-600 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <i className="fas fa-arrow-left" /> Back to Public View
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
