import { DEFAULT_DOWNLOAD_NOTICE } from '../../utils/constants';
import { incrementView } from '../../hooks/useDocuments';

/**
 * Download notice confirmation modal.
 * Shown before opening the PDF link so users understand the document
 * is for reference only and not an officially authenticated copy.
 */
export default function DocumentNoticeModal({ doc, settings, onClose }) {
  const notice = settings?.downloadNotice || DEFAULT_DOWNLOAD_NOTICE;

  const handleOpen = () => {
    incrementView(doc.id).catch(console.error);
    window.open(doc.link, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <i className="fas fa-gavel text-amber-500 text-2xl" />
          </div>
          <h3 className="text-lg font-black text-slate-900 text-center mb-4">Before You Continue</h3>
          <p className="text-sm text-slate-600 leading-relaxed text-center mb-7">{notice}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleOpen}
              className="py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-wide hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <i className="fas fa-external-link-alt" /> I Understand, Open Document
            </button>
            <button
              onClick={onClose}
              className="py-3 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
