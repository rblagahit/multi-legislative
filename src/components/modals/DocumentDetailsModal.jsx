import { TYPE_GRADIENT, TYPE_GRADIENT_DEFAULT } from '../../utils/constants';
import { buildPublicShareUrl, sharePublicEntity } from '../../utils/share';

/**
 * Full document details overlay.
 * Opened when user clicks "View Details" on a DocumentCard.
 * onDownload → opens DocumentNoticeModal
 * onRequest  → opens DocumentRequestModal
 */
export default function DocumentDetailsModal({ doc, onClose, onDownload, onRequest, showToast }) {
  const typeGradient = TYPE_GRADIENT[doc.type] || TYPE_GRADIENT_DEFAULT;

  const date = doc.timestamp?.toDate
    ? new Date(doc.timestamp.toDate()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : '';
  const shareUrl = buildPublicShareUrl('doc', doc.id);
  const shareTitle = `${doc.title || 'Legislative Document'} | ${doc.docId || 'Document'}`;
  const shareText = `View ${doc.title || 'this legislative document'} from the public portal.`;

  const handleShare = async (channel) => {
    await sharePublicEntity({
      channel,
      title: shareTitle,
      text: shareText,
      url: shareUrl,
      onSuccess: (message) => showToast?.(message, 'success'),
      onError: (message) => showToast?.(message, 'error'),
    });
  };

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
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
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
                className="h-16 w-16 rounded-2xl object-cover bg-slate-100 shadow-sm"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.authorName || 'SB')}&background=2563eb&color=fff&bold=true`; }}
              />
              <div>
                <p className="font-bold text-slate-800 text-base">{doc.authorName || '—'}</p>
                <p className="text-sm text-slate-400">{doc.authorRole || ''}</p>
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

          <div>
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Share This Document</p>
            <p className="text-xs text-slate-500 mb-3">Help your community discover this record.</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['facebook', 'fab fa-facebook-f', 'Facebook', 'bg-blue-50 text-blue-700 hover:bg-blue-100'],
                ['x', 'fab fa-x-twitter', 'X', 'bg-slate-100 text-slate-700 hover:bg-slate-200'],
                ['linkedin', 'fab fa-linkedin-in', 'LinkedIn', 'bg-sky-50 text-sky-700 hover:bg-sky-100'],
                ['messenger', 'fab fa-facebook-messenger', 'Messenger', 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'],
                ['email', 'fas fa-envelope', 'Email', 'bg-amber-50 text-amber-700 hover:bg-amber-100'],
                ['copy', 'fas fa-link', 'Copy', 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'],
              ].map(([channel, icon, label, tone]) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => handleShare(channel)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${tone}`}
                >
                  <i className={icon} />
                  {label}
                </button>
              ))}
            </div>
          </div>

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
