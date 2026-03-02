/**
 * Site footer.
 * TODO (Phase 3): Fully port footer HTML from index.html (~lines 2800–2947).
 * Social links, sitemap, developer credit, copyright.
 */
export default function Footer({ settings, navigateTo }) {
  const { socialFacebook, socialTwitter, socialEmail, orgName } = settings || {};

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Social links */}
        <div className="flex gap-4 mb-8">
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

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {orgName || 'Sangguniang Bayan of Argao'}. All rights reserved. | Republic Act 7160
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1">
            Built with <i className="fas fa-heart text-red-500 mx-1" /> for transparent government
          </p>
        </div>

      </div>
    </footer>
  );
}
