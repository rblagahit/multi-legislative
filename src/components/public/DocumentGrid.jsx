import DocumentCard from './DocumentCard';

/**
 * Responsive grid of document cards.
 * TODO (Phase 3): Add loading skeleton state, pass loading prop from useDocuments.
 */
export default function DocumentGrid({ documents, members, onClear, onViewDetails }) {
  return (
    <div id="documents" className="bg-slate-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-xs font-black uppercase text-blue-600 tracking-widest mb-2 flex items-center gap-2">
              <i className="fas fa-layer-group" /> Document Library
            </p>
            <h2 className="text-3xl font-black text-slate-900">All Documents</h2>
          </div>
          <button
            onClick={onClear}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-red-500 transition-colors bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm"
          >
            <i className="fas fa-times" /> Clear
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mx-auto mb-6 animate-float shadow-md">
              <i className="fas fa-search text-4xl text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">No documents found</h3>
            <p className="text-slate-500 max-w-md mx-auto">Try adjusting your search or filter.</p>
            <button
              onClick={onClear}
              className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all inline-flex items-center gap-3 shadow-lg"
            >
              <i className="fas fa-times" /> Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {documents.map(doc => (
              <DocumentCard key={doc.id} doc={doc} members={members} onViewDetails={onViewDetails} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
