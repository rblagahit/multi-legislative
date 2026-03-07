import { Suspense, lazy, useState } from 'react';
import { addDocument, deleteDocument } from '../../hooks/useDocuments';
import { parseTags } from '../../utils/helpers';
import { DOCUMENT_TYPES } from '../../utils/constants';
import { AdminSurface, AdminTabHeader } from './AdminUi';

const EditDocumentModal = lazy(() => import('../modals/EditDocumentModal'));

const CSV_COLUMNS = [
  'Title',
  'Document ID',
  'Type',
  'Sponsor ID',
  'PDF URL',
  'Tags',
  'Co-Sponsors',
  'More Information',
  'Barangay ID',
  'Barangay Name',
];

function splitBatchValue(raw = '') {
  return String(raw || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsvText(text = '') {
  const rows = [];
  let current = '';
  let row = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    row.push(current.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  return rows;
}

function parseBatchRows(text, members) {
  const rows = parseCsvText(text);
  if (rows.length <= 1) {
    return { parsedRows: [], errors: ['No data rows found in the CSV file.'] };
  }

  const memberMap = new Map(members.map((member) => [String(member.id), member]));
  const parsedRows = rows.slice(1).map((cells, index) => {
    const sponsorId = cells[3] || '';
    const sponsor = memberMap.get(String(sponsorId));
    const type = cells[2] || 'Ordinance';
    const values = {
      title: cells[0] || '',
      docId: cells[1] || '',
      type,
      sponsorId,
      sponsorName: sponsor?.name || '',
      link: cells[4] || '',
      tags: splitBatchValue(cells[5]),
      coSponsors: splitBatchValue(cells[6]),
      moreInfo: (cells[7] || '').slice(0, 400),
      barangayId: cells[8] || '',
      barangayName: cells[9] || '',
    };

    const errors = [];
    if (!values.title) errors.push('Missing title');
    if (!values.docId) errors.push('Missing document ID');
    if (!values.link) errors.push('Missing PDF URL');
    if (!values.sponsorId) errors.push('Missing sponsor ID');
    if (values.sponsorId && !sponsor) errors.push('Sponsor ID not found');
    if (!DOCUMENT_TYPES.some((option) => option.value === type)) errors.push('Invalid document type');

    return {
      ...values,
      rowNumber: index + 2,
      sponsor,
      errors,
      valid: errors.length === 0,
    };
  });

  return {
    parsedRows,
    errors: parsedRows.filter((row) => !row.valid).slice(0, 8).map((row) => `Row ${row.rowNumber}: ${row.errors.join(', ')}`),
  };
}

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
export default function DocumentsTab({ documents, members, tenantId, showToast }) {
  const [uploadMode, setUploadMode] = useState('manual');
  const [showForm, setShowForm]     = useState(false);
  const [showOptional, setOptional] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [docSearch, setDocSearch]   = useState('');
  const [batchRows, setBatchRows]   = useState([]);
  const [batchErrors, setBatchErrors] = useState([]);
  const [batchFileName, setBatchFileName] = useState('');
  const [importingBatch, setImportingBatch] = useState(false);

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
      }, tenantId);
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
      await deleteDocument(id, tenantId);
      showToast('Document deleted', 'success');
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const filteredDocs = documents.filter(d => {
    const q = docSearch.toLowerCase();
    return !q || d.title?.toLowerCase().includes(q) || d.docId?.toLowerCase().includes(q);
  });

  const validBatchRows = batchRows.filter((row) => row.valid);

  const resetBatchState = () => {
    setBatchRows([]);
    setBatchErrors([]);
    setBatchFileName('');
  };

  const handleBatchFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please upload a .csv file.', 'error');
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseBatchRows(text, members);
      setBatchRows(parsed.parsedRows);
      setBatchErrors(parsed.errors);
      setBatchFileName(file.name);
      if (!parsed.parsedRows.length) {
        showToast('No valid records found in the CSV file.', 'error');
      } else {
        showToast(`Loaded ${parsed.parsedRows.length} batch row(s).`, 'success');
      }
    } catch (error) {
      console.error('[DocumentsTab.handleBatchFileChange]', error);
      showToast('Unable to read the CSV file.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const submitBatchUpload = async () => {
    if (!validBatchRows.length) {
      showToast('No valid rows to import.', 'error');
      return;
    }

    setImportingBatch(true);
    let imported = 0;
    let failed = 0;

    for (const row of batchRows) {
      if (!row.valid) {
        failed += 1;
        continue;
      }

      try {
        await addDocument({
          title: row.title,
          docId: row.docId,
          type: row.type,
          authorId: row.sponsorId,
          authorName: row.sponsor?.name || '',
          authorImage: row.sponsor?.image || '',
          authorRole: row.sponsor?.role || '',
          link: row.link,
          tags: row.tags,
          coSponsors: row.coSponsors,
          moreInfo: row.moreInfo,
          barangayId: row.barangayId || '',
          barangayName: row.barangayName || '',
        }, tenantId);
        imported += 1;
      } catch (error) {
        console.error('[DocumentsTab.submitBatchUpload]', row, error);
        failed += 1;
      }
    }

    setImportingBatch(false);
    showToast(`Batch import complete: ${imported} imported${failed ? `, ${failed} skipped` : ''}.`, failed ? 'info' : 'success');
    resetBatchState();
    setUploadMode('manual');
  };

  return (
    <div>
      <AdminTabHeader
        icon="fa-file-lines"
        title="Documents"
        description="Manage legislative documents, sponsors, and published links."
        badge={`${documents.length} total`}
        action={(
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setUploadMode('manual')}
                className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  uploadMode === 'manual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('csv')}
                className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  uploadMode === 'csv'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Batch Upload (CSV)
              </button>
            </div>
            {uploadMode === 'manual' ? (
              <button
                onClick={() => setShowForm(v => !v)}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-sm font-bold text-white transition-all shadow-md hover:from-blue-700 hover:to-purple-700"
              >
                <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'} text-xs`} />
                {showForm ? 'Close Form' : 'Add Document'}
              </button>
            ) : null}
          </div>
        )}
      />

      {/* Collapsible add form */}
      {uploadMode === 'manual' && showForm && (
        <AdminSurface className="mb-8">
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
        </AdminSurface>
      )}

      {uploadMode === 'csv' ? (
        <AdminSurface className="mb-8">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">CSV Import</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Batch Upload Documents</h3>
              <p className="mt-2 text-sm text-slate-500">
                Restore the legacy CSV workflow for bulk document uploads. The sponsor must use an existing Member ID.
              </p>

              <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5">
                <label className="mb-3 block text-xs font-black uppercase tracking-wider text-slate-400">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBatchFileChange}
                  className="block w-full text-sm font-semibold text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-blue-600 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white hover:file:bg-blue-700"
                />
                <p className="mt-3 text-[11px] text-slate-400">Supported columns: {CSV_COLUMNS.join(', ')}</p>
                {batchFileName ? (
                  <p className="mt-2 text-sm font-semibold text-blue-700">
                    Loaded: {batchFileName}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Required Format</p>
                <p className="mt-3 text-sm text-slate-600">
                  `Title, Document ID, Type, Sponsor ID, PDF URL, Tags, Co-Sponsors, More Information, Barangay ID, Barangay Name`
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  Use semicolons for `Tags` and `Co-Sponsors`. Supported document types: {DOCUMENT_TYPES.map((item) => item.value).join(', ')}.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={submitBatchUpload}
                  disabled={importingBatch || !validBatchRows.length}
                  className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition-all hover:from-blue-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i className={`fas ${importingBatch ? 'fa-spinner fa-spin' : 'fa-file-import'} mr-2 text-xs`} />
                  {importingBatch ? 'Importing…' : `Import ${validBatchRows.length} Row${validBatchRows.length === 1 ? '' : 's'}`}
                </button>
                <button
                  type="button"
                  onClick={resetBatchState}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
                >
                  Clear Preview
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Preview</p>
                    <p className="mt-1 text-sm text-slate-500">Showing the first rows detected in the uploaded CSV.</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                    {validBatchRows.length} valid / {batchRows.length} total
                  </div>
                </div>

                {!batchRows.length ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                    Upload a CSV file to preview the import rows.
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-slate-200 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-3 py-3">Row</th>
                          <th className="px-3 py-3">Title</th>
                          <th className="px-3 py-3">Doc ID</th>
                          <th className="px-3 py-3">Sponsor</th>
                          <th className="px-3 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchRows.slice(0, 8).map((row) => (
                          <tr key={`${row.rowNumber}-${row.docId}`}>
                            <td className="px-3 py-3 font-bold text-slate-500">{row.rowNumber}</td>
                            <td className="px-3 py-3 text-slate-800">{row.title || 'Untitled'}</td>
                            <td className="px-3 py-3 text-slate-500">{row.docId || 'Missing'}</td>
                            <td className="px-3 py-3 text-slate-500">{row.sponsor?.name || row.sponsorId || 'Missing'}</td>
                            <td className="px-3 py-3">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${
                                row.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {row.valid ? 'Ready' : 'Needs Fix'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {batchErrors.length ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-700">Validation Notes</p>
                  <div className="mt-3 space-y-2 text-sm text-amber-900">
                    {batchErrors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </AdminSurface>
      ) : null}

      <AdminSurface>
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Current Library</p>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
            {filteredDocs.length} visible
          </span>
        </div>
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
      </AdminSurface>

      {/* Edit modal */}
      {editDoc && (
        <Suspense fallback={null}>
          <EditDocumentModal
            doc={editDoc}
            members={members}
            tenantId={tenantId}
            showToast={showToast}
            onClose={() => setEditDoc(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
