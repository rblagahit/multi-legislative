import { useState } from 'react';
import { updateDocument } from '../../hooks/useDocuments';
import { parseTags } from '../../utils/helpers';
import { DOCUMENT_TYPES } from '../../utils/constants';

/**
 * Edit existing document modal — used in the admin Documents tab.
 * Pre-fills all fields from the current document data.
 */
export default function EditDocumentModal({ doc, members, showToast, onClose }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title:      doc.title      || '',
    docId:      doc.docId      || '',
    type:       doc.type       || 'Ordinance',
    authorId:   doc.authorId   || '',
    link:       doc.link       || '',
    coSponsors: (doc.coSponsors || []).join(', '),
    tags:       (doc.tags      || []).join(', '),
    moreInfo:   doc.moreInfo   || '',
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
      await updateDocument(doc.id, {
        title:       form.title,
        docId:       form.docId,
        type:        form.type,
        authorId:    form.authorId,
        authorName:  sponsor?.name  || doc.authorName  || '',
        authorImage: sponsor?.image || doc.authorImage || '',
        authorRole:  sponsor?.role  || doc.authorRole  || '',
        link:        form.link,
        tags:        parseTags(form.tags),
        coSponsors:  parseTags(form.coSponsors),
        moreInfo:    form.moreInfo.slice(0, 400),
      });
      showToast('Document updated', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mb-12"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900">Edit Document</h3>
            <p className="text-sm text-slate-400 mt-0.5">{doc.docId}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 transition-colors"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Title *</label>
            <input value={form.title} onChange={set('title')} required
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
          </div>
          <div>
            <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Document ID *</label>
            <input value={form.docId} onChange={set('docId')} required
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
          </div>
          <div>
            <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Document Type</label>
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
            <input type="url" value={form.link} onChange={set('link')} required
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
          </div>
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
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all resize-none" />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">{form.moreInfo.length}/400</p>
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button type="button" onClick={onClose}
              className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3 disabled:opacity-60">
              {saving
                ? <><i className="fas fa-spinner fa-spin" /> Saving…</>
                : <><i className="fas fa-save" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
