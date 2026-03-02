import { TYPE_GRADIENT, TYPE_GRADIENT_DEFAULT } from '../../utils/constants';

/**
 * Full document details overlay.
 * Opened when user clicks "View Details" on a DocumentCard.
 * onDownload → opens DocumentNoticeModal
 * onRequest  → opens DocumentRequestModal
 */
export default function DocumentDetailsModal({ doc, onClose, onDownload, onRequest }) {
  const typeGradient = TYPE_GRADIENT[doc.type] || TYPE_GRADIENT_DEFAULT;

  const date = doc.timestamp?.toDate
    ? new Date(doc.timestamp.toDate()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className={`bg-gradient-to-r ${typeGradient} p-7 rounded-t-3xl`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest bg-white/20 text-white mb-3">
                <i className="fas fa-file-alt text-xs" />{doc.type}
              </span>
              <h2 className="text-white font-black text-xl leading-snug">{doc.title}</h2>
              <p className="text-white/70 text-sm mt-1">{doc.docId}{date && ` · ${date}`}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white shrink-0 transition-colors"
            >
              <i className="fas fa-times text-sm" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-7 space-y-5">
          {/* Primary Sponsor */}
          <div>
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Primary Sponsor</p>
            <div className="flex items-center gap-3">
              <img
                src={doc.authorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.authorName || 'SB')}&background=2563eb&color=fff&bold=true`}
                alt={doc.authorName}
                className="w-10 h-10 rounded-xl object-cover bg-slate-100"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.authorName || 'SB')}&background=2563eb&color=fff&bold=true`; }}
              />
              <div>
                <p className="font-bold text-slate-800 text-sm">{doc.authorName || '—'}</p>
                <p className="text-xs text-slate-400">{doc.authorRole || ''}</p>
              </div>
            </div>
          </div>

          {/* Co-Sponsors */}
          {(doc.coSponsors || []).length > 0 && (
            <div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Co-Sponsors</p>
              <div className="flex flex-wrap gap-2">
                {doc.coSponsors.map(s => (
                  <span key={s} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {(doc.tags || []).length > 0 && (
            <div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {doc.tags.map(t => (
                  <span key={t} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-bold">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* More Info */}
          {doc.moreInfo && (
            <div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">More Information</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl">{doc.moreInfo}</p>
            </div>
          )}

          {/* Views */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-slate-100">
            <i className="fas fa-eye" />{doc.views || 0} views
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-7 pb-7 flex gap-3">
          <button
            onClick={onRequest}
            className="flex-1 py-3.5 border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-envelope" /> Request Copy
          </button>
          <button
            onClick={onDownload}
            className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-sm hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <i className="fas fa-file-pdf" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
