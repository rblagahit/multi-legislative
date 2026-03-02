import { TYPE_GRADIENT, TYPE_GRADIENT_DEFAULT } from '../../utils/constants';

/**
 * Single document card shown in the public grid.
 * onViewDetails — called with the doc object when "View Details" is clicked.
 */
export default function DocumentCard({ doc, members, onViewDetails }) {
  const typeGradient = TYPE_GRADIENT[doc.type] || TYPE_GRADIENT_DEFAULT;
  const sponsor = members?.find(m => m.id === doc.authorId);
  const sponsorImg = sponsor?.image
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.authorName || 'SB')}&background=2563eb&color=fff&bold=true`;

  const date = doc.timestamp?.toDate
    ? new Date(doc.timestamp.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  return (
    <div className="doc-card bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 flex flex-col">
      {/* Type badge */}
      <div className={`bg-gradient-to-r ${typeGradient} px-6 pt-6 pb-4`}>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest bg-white/20 text-white">
          <i className="fas fa-file-alt text-xs" />{doc.type}
        </span>
      </div>

      <div className="p-6 flex flex-col flex-1">
        {/* Title */}
        <h3 className="font-black text-slate-900 text-base leading-snug mb-2 line-clamp-3">
          {doc.title}
        </h3>
        <p className="text-xs text-slate-400 font-bold mb-4">{doc.docId} · {date}</p>

        {/* Tags */}
        {(doc.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {doc.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
          </div>
        )}

        {/* Sponsor */}
        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
          <img
            src={sponsorImg}
            alt={doc.authorName}
            className="w-8 h-8 rounded-lg object-cover bg-slate-100"
            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.authorName || 'SB')}&background=2563eb&color=fff&bold=true`; }}
          />
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-700 truncate">{doc.authorName || 'SB Member'}</p>
            <p className="text-[10px] text-slate-400 truncate">{doc.authorRole || ''}</p>
          </div>
          <span className="ml-auto view-badge">
            <i className="fas fa-eye mr-1" />{doc.views || 0}
          </span>
        </div>

        {/* Action */}
        <button
          className="mt-4 w-full py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm transition-all"
          onClick={() => onViewDetails(doc)}
        >
          View Details
        </button>
      </div>
    </div>
  );
}
