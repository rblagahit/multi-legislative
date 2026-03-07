/**
 * Site footer.
 */
export default function Footer({ settings, platformSettings, navigateTo, navigateToSection }) {
  const { socialFacebook, socialTwitter, socialEmail, orgName, municipality, province, sealUrl } = settings || {};
  const footerTitle = platformSettings?.navTitle || orgName || 'LGU Legislative Information System';
  const copyrightOwner = orgName || footerTitle;
  const footerSeal = platformSettings?.logoUrl || sealUrl || '';
  const cityProvince = [municipality, province].filter(Boolean).join(', ');

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              {footerSeal ? (
                <img src={footerSeal} alt="Organization Seal" className="h-10 w-10 object-contain" />
              ) : null}
              <div>
                <h4 className="text-xl font-black text-white">{footerTitle}</h4>
                {cityProvince ? <p className="text-[11px] text-slate-400">{cityProvince}</p> : null}
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm text-slate-400">
              Official legislative document portal for participating LGUs. Transparent access to local government ordinances and resolutions.
            </p>
            <div className="mt-5 flex gap-4">
              {socialFacebook && (
                <a href={socialFacebook} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 bg-slate-700 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-colors">
                  <i className="fab fa-facebook-f text-sm" />
                </a>
              )}
              {socialTwitter && (
                <a href={socialTwitter} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 bg-slate-700 hover:bg-sky-500 rounded-xl flex items-center justify-center transition-colors">
                  <i className="fab fa-twitter text-sm" />
                </a>
              )}
              {socialEmail && (
                <a href={`mailto:${socialEmail}`}
                  className="w-10 h-10 bg-slate-700 hover:bg-emerald-600 rounded-xl flex items-center justify-center transition-colors">
                  <i className="fas fa-envelope text-sm" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h5 className="font-black text-sm text-white mb-4 flex items-center gap-2">
              <i className="fas fa-map text-blue-500" /> Navigation
            </h5>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigateTo('public')} className="text-slate-400 hover:text-white transition-colors">Home</button></li>
              <li><button onClick={() => navigateToSection('documents')} className="text-slate-400 hover:text-white transition-colors">Documents</button></li>
              <li><button onClick={() => navigateToSection('members-section')} className="text-slate-400 hover:text-white transition-colors">Members</button></li>
              <li><button onClick={() => navigateTo('insights')} className="text-slate-400 hover:text-white transition-colors">Insights</button></li>
              <li><button onClick={() => navigateTo('contact')} className="text-slate-400 hover:text-white transition-colors">Contact Us</button></li>
              <li><button onClick={() => navigateTo('login')} className="text-slate-400 hover:text-white transition-colors">Admin Portal</button></li>
              <li><button onClick={() => navigateTo('barangay-login')} className="text-slate-400 hover:text-white transition-colors">Barangay Portal</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-black text-sm text-white mb-4 flex items-center gap-2">
              <i className="fas fa-layer-group text-blue-500" /> Categories
            </h5>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigateToSection('documents')} className="text-slate-400 hover:text-white transition-colors">Ordinances</button></li>
              <li><button onClick={() => navigateToSection('documents')} className="text-slate-400 hover:text-white transition-colors">Resolutions</button></li>
              <li><button onClick={() => navigateToSection('documents')} className="text-slate-400 hover:text-white transition-colors">Motions</button></li>
              <li><button onClick={() => navigateToSection('documents')} className="text-slate-400 hover:text-white transition-colors">Proclamations</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-black text-sm text-white mb-4 flex items-center gap-2">
              <i className="fas fa-shield text-blue-500" /> Legal
            </h5>
            <ul className="space-y-2 text-sm">
              <li><span className="text-slate-400">RA 7160</span></li>
              <li><span className="text-slate-400">Privacy</span></li>
              <li><span className="text-slate-400">Terms</span></li>
              <li><span className="text-slate-400">Accessibility</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-300 mb-1">Technical Support & Maintenance</p>
              <p className="text-xs text-slate-500">Have questions or found a bug? Contact the developer.</p>
            </div>
            <a href="mailto:rlagahit@icloud.com"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 whitespace-nowrap">
              <i className="fas fa-envelope" /> Contact Developer
            </a>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 mt-8">
          <div className="mb-8">
          <h6 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Sitemap</h6>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[11px]">
              <button onClick={() => navigateTo('public')} className="text-left text-slate-500 hover:text-blue-400 transition-colors">Home</button>
              <button onClick={() => navigateToSection('documents')} className="text-left text-slate-500 hover:text-blue-400 transition-colors">Documents</button>
              <button onClick={() => navigateToSection('members-section')} className="text-left text-slate-500 hover:text-blue-400 transition-colors">Members</button>
              <button onClick={() => navigateTo('insights')} className="text-left text-slate-500 hover:text-blue-400 transition-colors">Insights</button>
              <button onClick={() => navigateToSection('documents')} className="text-left text-slate-500 hover:text-blue-400 transition-colors">Search</button>
              <button onClick={() => navigateTo('public')} className="text-left text-slate-500 hover:text-blue-400 transition-colors">About</button>
              <button onClick={() => navigateTo('contact')} className="text-left text-slate-500 hover:text-blue-400 transition-colors">Contact</button>
              <button onClick={() => navigateTo('login')} className="text-left text-slate-500 hover:text-blue-400 transition-colors">Admin Portal</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} {copyrightOwner}. All rights reserved. | Republic Act 7160 (Local Government Code)
            </p>
            <p className="text-xs text-slate-600 flex items-center gap-1">
              Built with <i className="fas fa-heart text-red-500 mx-1" /> for transparent government
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
