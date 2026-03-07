import { useState } from 'react';

/**
 * Sticky top navigation bar.
 * Shows org seal + name, nav links, admin/logout button.
 */
export default function Navbar({
  user,
  canAccessAdmin,
  canAccessPlatform,
  settings,
  platformSettings,
  navigateTo,
  navigateToSection,
  logout,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const orgName = settings?.orgName || '';
  const navTitle = platformSettings?.navTitle || orgName || 'LGU Legislative Information System';
  const navTagline = orgName && orgName !== navTitle ? orgName : 'Legislative Information System';
  const sealUrl = platformSettings?.logoUrl || settings?.sealUrl || '/argao-seal.png';
  const handleViewNavigation = (view) => {
    setMobileMenuOpen(false);
    navigateTo(view);
  };
  const handleSectionNavigation = (sectionId) => {
    setMobileMenuOpen(false);
    navigateToSection(sectionId);
  };

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
                {navTitle}
              </h1>
              <p className="text-[10px] font-semibold text-blue-600 tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse inline-block" />
                {navTagline}
              </p>
            </div>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
            <button onClick={() => navigateTo('public')}  className="hover:text-blue-600 transition-colors">Home</button>
            <button onClick={() => navigateToSection('documents')} className="hover:text-blue-600 transition-colors">Documents</button>
            <button onClick={() => navigateToSection('members-section')} className="hover:text-blue-600 transition-colors">Members</button>
            <button onClick={() => navigateTo('insights')} className="hover:text-blue-600 transition-colors">Insights</button>
            <button onClick={() => navigateTo('contact')} className="hover:text-blue-600 transition-colors">Contact</button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all hover:border-blue-300 hover:text-blue-700 md:hidden"
              aria-label="Toggle navigation menu"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-sm`} />
            </button>
            <button
              onClick={() => handleViewNavigation('barangay-login')}
              className="hidden sm:flex px-3 sm:px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-all items-center gap-2"
            >
              <i className="fas fa-building-user text-xs" />
              <span className="hidden sm:inline">Barangay Portal</span>
            </button>
            {canAccessPlatform && (
              <button
                onClick={() => handleViewNavigation('platform')}
                className="hidden sm:flex px-3 sm:px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-100 transition-all items-center gap-2"
              >
                <i className="fas fa-crown text-xs" />
                <span className="hidden sm:inline">Platform</span>
              </button>
            )}
            {canAccessAdmin && (
              <button
                onClick={() => handleViewNavigation('admin')}
                className="hidden sm:flex px-3 sm:px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all items-center gap-2"
              >
                <i className="fas fa-cog text-xs" />
                <span className="hidden sm:inline">Admin Panel</span>
              </button>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) logout();
                else navigateTo('login');
              }}
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

        {mobileMenuOpen ? (
          <div className="border-t border-slate-100 py-4 md:hidden">
            <div className="grid gap-2">
              <button onClick={() => handleViewNavigation('public')} className="rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100">Home</button>
              <button onClick={() => handleSectionNavigation('documents')} className="rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100">Documents</button>
              <button onClick={() => handleSectionNavigation('members-section')} className="rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100">Members</button>
              <button onClick={() => handleViewNavigation('insights')} className="rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100">Insights</button>
              <button onClick={() => handleViewNavigation('contact')} className="rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100">Contact</button>
              <button onClick={() => handleViewNavigation('barangay-login')} className="rounded-2xl bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100">Barangay Portal</button>
              {canAccessAdmin ? (
                <button onClick={() => handleViewNavigation('admin')} className="rounded-2xl bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100">Admin Panel</button>
              ) : null}
              {canAccessPlatform ? (
                <button onClick={() => handleViewNavigation('platform')} className="rounded-2xl bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100">Platform</button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
