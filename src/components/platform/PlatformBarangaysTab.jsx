import { useEffect, useMemo, useState } from 'react';
import { collectionGroup, deleteDoc, doc, getDocs, limit, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function PlatformBarangaysTab({ showToast }) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [form, setForm] = useState({
    name: '',
    code: '',
    captain: '',
    secretaryName: '',
    secretaryEmail: '',
  });

  const loadBarangays = async (withLoader = true) => {
    if (withLoader) setLoading(true);
    try {
      const snapshot = await getDocs(query(collectionGroup(db, 'barangays'), limit(300)));
      setRows(snapshot.docs.map((docSnap) => {
        const path = docSnap.ref.path.split('/');
        return {
          id: docSnap.id,
          lguId: path[1] || '',
          pathKey: docSnap.ref.path,
          ...docSnap.data(),
        };
      }));
    } catch (error) {
      console.error('[PlatformBarangaysTab]', error);
      showToast('Unable to load platform barangays.', 'error');
    } finally {
      if (withLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadBarangays();
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...rows]
      .filter((row) => !term || [row.name, row.code, row.lguId, row.secretaryEmail].join(' ').toLowerCase().includes(term))
      .sort((a, b) => (a.name || a.code || a.id).localeCompare(b.name || b.code || b.id));
  }, [rows, search]);

  const beginEdit = (row) => {
    setEditingKey(row.pathKey);
    setForm({
      name: row.name || '',
      code: row.code || row.id || '',
      captain: row.captain || '',
      secretaryName: row.secretaryName || '',
      secretaryEmail: row.secretaryEmail || '',
    });
  };

  const resetEdit = () => {
    setEditingKey('');
    setSavingKey('');
    setForm({ name: '', code: '', captain: '', secretaryName: '', secretaryEmail: '' });
  };

  const setValue = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveBarangay = async (row) => {
    setSavingKey(row.pathKey);
    try {
      await setDoc(doc(db, 'lgus', row.lguId, 'barangays', row.id), {
        code: form.code.trim() || row.id,
        name: form.name.trim(),
        captain: form.captain.trim(),
        secretaryName: form.secretaryName.trim(),
        secretaryEmail: form.secretaryEmail.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast('Barangay updated.', 'success');
      resetEdit();
      await loadBarangays(false);
    } catch (error) {
      console.error('[PlatformBarangaysTab.saveBarangay]', error);
      showToast('Unable to update barangay.', 'error');
      setSavingKey('');
    }
  };

  const deleteBarangay = async (row) => {
    const confirmed = window.confirm(`Delete barangay "${row.name || row.code || row.id}" from LGU "${row.lguId}"?`);
    if (!confirmed) return;

    setSavingKey(row.pathKey);
    try {
      await deleteDoc(doc(db, 'lgus', row.lguId, 'barangays', row.id));
      showToast('Barangay deleted.', 'success');
      resetEdit();
      await loadBarangays(false);
    } catch (error) {
      console.error('[PlatformBarangaysTab.deleteBarangay]', error);
      showToast('Unable to delete barangay.', 'error');
      setSavingKey('');
    }
  };

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search barangay, LGU, or email..."
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
      />

      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center text-slate-400 shadow-sm">
          <i className="fas fa-spinner fa-spin text-2xl" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRows.map((row) => {
            const isEditing = editingKey === row.pathKey;
            const isSaving = savingKey === row.pathKey;

            return (
              <div key={row.pathKey} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Barangay Name</label>
                        <input value={form.name} onChange={setValue('name')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Code</label>
                        <input value={form.code} onChange={setValue('code')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Captain</label>
                        <input value={form.captain} onChange={setValue('captain')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Secretary Name</label>
                        <input value={form.secretaryName} onChange={setValue('secretaryName')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Secretary Email</label>
                        <input type="email" value={form.secretaryEmail} onChange={setValue('secretaryEmail')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => saveBarangay(row)} disabled={isSaving}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                        <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2 text-xs`} />
                        Save Barangay
                      </button>
                      <button type="button" onClick={resetEdit}
                        className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900">{row.name || row.code || row.id}</p>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-purple-700">{row.lguId}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Code: {row.code || row.id}</p>
                    <p className="mt-1 text-sm text-slate-500">Captain: {row.captain || 'Not set'}</p>
                    <p className="mt-1 text-sm text-slate-500">Secretary: {row.secretaryName || 'Not set'}{row.secretaryEmail ? ` · ${row.secretaryEmail}` : ''}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" onClick={() => beginEdit(row)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100">
                        <i className="fas fa-pen mr-2 text-xs" />
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteBarangay(row)} disabled={isSaving}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70">
                        <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-trash'} mr-2 text-xs`} />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {!filteredRows.length ? (
            <div className="lg:col-span-2 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <i className="fas fa-map-marker-alt text-3xl text-slate-300" />
              <p className="mt-4 text-sm font-semibold text-slate-500">No barangays match the current filter.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
