import { useState } from 'react';
import { addDocument, deleteDocument } from '../../hooks/useDocuments';
import { parseTags } from '../../utils/helpers';
import { DOCUMENT_TYPES } from '../../utils/constants';
import EditDocumentModal from '../modals/EditDocumentModal';

/**
 * Admin Documents tab — list + collapsible Add form + EditDocumentModal.
 *
 * Phase 0 UX patterns already implemented:
 *   - Form hidden behind "+ Add Document" toggle
 *   - Optional fields (co-sponsors, tags, notes) collapsed by default
 *   - List is the default view
 *
 * TODO (Phase 3):
 *   - Replace form panel with Drawer component
 *   - Add CSV batch import
 */
export default function DocumentsTab({ documents, members, showToast }) {
  const [showForm, setShowForm]     = useState(false);
  const [showOptional, setOptional] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [docSearch, setDocSearch]   = useState('');

  // Edit modal state
  const [editDoc, setEditDoc] = useState(null);

  // Add form state
  const [form, setForm] = useState({
    title: '', docId: '', type: 'Ordinance', authorId: '', link: '',
    coSponsors: '', tags: '', moreInfo: '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.docId || !form.authorId || !form.link) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    const sponsor = members.find(m => m.id === form.authorId);
    setSaving(true);
    try {
      await addDocument({
        title:       form.title,
        docId:       form.docId,
        type:        form.type,
        authorId:    form.authorId,
        authorName:  sponsor?.name  || '',
        authorImage: sponsor?.image || '',
        authorRole:  sponsor?.role  || '',
        link:        form.link,
        tags:        parseTags(form.tags),
        coSponsors:  parseTags(form.coSponsors),
        moreInfo:    form.moreInfo.slice(0, 400),
      });
      showToast('Document published successfully', 'success');
      setForm({ title: '', docId: '', type: 'Ordinance', authorId: '', link: '', coSponsors: '', tags: '', moreInfo: '' });
      setShowForm(false);
      setOptional(false);
    } catch (err) {
      console.error(err);
      showToast('Publish error. Check permissions.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await deleteDocument(id);
      showToast('Document deleted', 'success');
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const filteredDocs = documents.filter(d => {
    const q = docSearch.toLowerCase();
    return !q || d.title?.toLowerCase().includes(q) || d.docId?.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black text-slate-900">Documents</h3>
          <p className="text-sm text-slate-500">Manage legislative documents</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'} text-xs`} />
          {showForm ? 'Cancel' : 'Add Document'}
        </button>
      </div>

      {/* Collapsible add form */}
      {showForm && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 mb-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Title *</label>
              <input value={form.title} onChange={set('title')} required placeholder="e.g., An Ordinance Establishing…"
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Document ID *</label>
              <input value={form.docId} onChange={set('docId')} required placeholder="ORD-2024-001"
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Document Type *</label>
              <select value={form.type} onChange={set('type')}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all">
                {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Primary Sponsor *</label>
              <select value={form.authorId} onChange={set('authorId')} required
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all">
                <option value="">Select sponsor…</option>
                {members.filter(m => !m.isArchived).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">PDF URL *</label>
              <input type="url" value={form.link} onChange={set('link')} required placeholder="https://…"
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>

            {/* Optional fields toggle */}
            <div className="md:col-span-2">
              <button type="button" onClick={() => setOptional(v => !v)}
                className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">
                <i className={`fas fa-chevron-right text-xs transition-transform duration-200 ${showOptional ? 'rotate-90' : ''}`} />
                <span>Optional fields</span>
                <span className="text-xs font-normal text-slate-400">co-sponsors · tags · notes</span>
              </button>
            </div>
            {showOptional && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Co-Sponsors</label>
                  <input value={form.coSponsors} onChange={set('coSponsors')} placeholder="Hon. Santos, Hon. Reyes"
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">Separate with commas</p>
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Tags</label>
                  <input value={form.tags} onChange={set('tags')} placeholder="health, infrastructure, budget"
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">Separate with commas</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">
                    More Information <span className="normal-case font-normal">(optional, max 400 chars)</span>
                  </label>
                  <textarea value={form.moreInfo} onChange={set('moreInfo')} rows={3} maxLength={400}
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                    placeholder="Additional details visible to the public…" />
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">{form.moreInfo.length}/400</p>
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all flex items-center justify-center gap-3 disabled:opacity-60">
                {saving ? <><i className="fas fa-spinner fa-spin" /> Publishing…</> : <><span>Publish Document</span><i className="fas fa-paper-plane" /></>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Document list */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="mb-5">
          <input
            type="text" value={docSearch}
            onChange={e => setDocSearch(e.target.value)}
            placeholder="Search by title or document ID…"
            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {filteredDocs.length === 0 && (
            <p className="text-center text-slate-400 py-12 text-sm">No documents found.</p>
          )}
          {filteredDocs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{doc.title}</p>
                <p className="text-xs text-slate-400">{doc.docId} · {doc.type}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditDoc(doc)}
                  className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit document"
                >
                  <i className="fas fa-pen text-xs" />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete document"
                >
                  <i className="fas fa-trash text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editDoc && (
        <EditDocumentModal
          doc={editDoc}
          members={members}
          showToast={showToast}
          onClose={() => setEditDoc(null)}
        />
      )}
    </div>
  );
}
