/**
 * Sticky top navigation bar.
 * Shows org seal + name, nav links, admin/logout button.
 *
 * TODO (Phase 3): Pull dynamic orgName & sealUrl from `settings` prop.
 */
export default function Navbar({ user, settings, currentView, navigateTo, logout }) {
  const orgName = settings?.orgName || 'Sangguniang Bayan of Argao';
  const sealUrl = settings?.sealUrl  || '/argao-seal.png';

  return (
    <nav className="glass-effect sticky top-0 z-50 border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* Logo */}
          <button
            onClick={() => navigateTo('public')}
            className="flex items-center gap-3 group"
          >
            <img
              src={sealUrl}
              alt="Organization Seal"
              className="w-11 h-11 object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <div className="text-left">
              <h1 className="font-black text-base sm:text-lg leading-tight text-slate-900">
                {orgName}
              </h1>
              <p className="text-[10px] font-semibold text-blue-600 tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse inline-block" />
                Legislative Information System
              </p>
            </div>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
            <button onClick={() => navigateTo('public')}  className="hover:text-blue-600 transition-colors">Home</button>
            <a href="#documents"        className="hover:text-blue-600 transition-colors">Documents</a>
            <a href="#members-section"  className="hover:text-blue-600 transition-colors">Members</a>
            <button onClick={() => navigateTo('contact')} className="hover:text-blue-600 transition-colors">Contact</button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => navigateTo('admin')}
                className="hidden md:flex px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all items-center gap-2"
              >
                <i className="fas fa-cog text-xs" />
                <span>Admin Panel</span>
              </button>
            )}
            <button
              onClick={user ? logout : () => navigateTo('login')}
              className="relative group overflow-hidden px-5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all duration-300 flex items-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                <i className={`fas ${user ? 'fa-sign-out-alt' : 'fa-lock'} text-xs`} />
                <span className="hidden sm:inline">{user ? 'Logout' : 'Admin'}</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
