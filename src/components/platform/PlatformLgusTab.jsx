import { useMemo, useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

function normalizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function buildLguLabel(id, record = {}) {
  return normalizeText(
    record.displayName
      || record.lguName
      || record.orgName
      || record.municipality
      || record.name,
    id || 'Unassigned',
  );
}

const EMPTY_FORM = {
  displayName: '',
  municipality: '',
  province: '',
  adminEmail: '',
};

export default function PlatformLgusTab({
  lguRegistry,
  user,
  showToast,
  refreshPlatformData,
}) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState('');
  const [savingId, setSavingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const entries = [...lguRegistry].sort((a, b) => buildLguLabel(a.id, a).localeCompare(buildLguLabel(b.id, b)));

    if (!term) return entries;
    return entries.filter((entry) => {
      const haystack = [
        entry.id,
        buildLguLabel(entry.id, entry),
        entry.adminEmail,
        entry.municipality,
        entry.province,
      ].map((value) => normalizeText(value, '').toLowerCase()).join(' ');
      return haystack.includes(term);
    });
  }, [lguRegistry, search]);

  const beginEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      displayName: entry.displayName || entry.lguName || entry.orgName || '',
      municipality: entry.municipality || '',
      province: entry.province || '',
      adminEmail: entry.adminEmail || '',
    });
  };

  const resetEdit = () => {
    setEditingId('');
    setSavingId('');
    setForm(EMPTY_FORM);
  };

  const setValue = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveLgu = async (entryId) => {
    setSavingId(entryId);
    try {
      await setDoc(doc(db, 'lguRegistry', entryId), {
        displayName: form.displayName.trim(),
        municipality: form.municipality.trim(),
        province: form.province.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      }, { merge: true });
      showToast(`LGU updated: ${entryId}`, 'success');
      resetEdit();
      await refreshPlatformData(false);
    } catch (error) {
      console.error('[PlatformLgusTab.saveLgu]', error);
      showToast('Unable to update LGU.', 'error');
      setSavingId('');
    }
  };

  const deleteLgu = async (entry) => {
    const label = buildLguLabel(entry.id, entry);
    const confirmed = window.confirm(
      `Delete LGU registry entry for "${label}"?\n\nThis removes the tenant from the platform directory and subscription registry, but does not recursively purge nested LGU documents.`,
    );
    if (!confirmed) return;

    setSavingId(entry.id);
    try {
      await deleteDoc(doc(db, 'lguRegistry', entry.id));
      showToast(`LGU registry removed: ${entry.id}`, 'success');
      resetEdit();
      await refreshPlatformData(false);
    } catch (error) {
      console.error('[PlatformLgusTab.deleteLgu]', error);
      showToast('Unable to delete LGU registry entry.', 'error');
      setSavingId('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search LGU, province, or admin email…"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
            {filteredRows.length} LGU{filteredRows.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRows.map((entry) => {
          const isEditing = editingId === entry.id;
          const isSaving = savingId === entry.id;

          return (
            <div key={entry.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Display Name</label>
                      <input
                        value={form.displayName}
                        onChange={setValue('displayName')}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Admin Email</label>
                      <input
                        type="email"
                        value={form.adminEmail}
                        onChange={setValue('adminEmail')}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Municipality</label>
                      <input
                        value={form.municipality}
                        onChange={setValue('municipality')}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Province</label>
                      <input
                        value={form.province}
                        onChange={setValue('province')}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => saveLgu(entry.id)}
                      disabled={isSaving}
                      className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2 text-xs`} />
                      Save LGU
                    </button>
                    <button
                      type="button"
                      onClick={resetEdit}
                      className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900">{buildLguLabel(entry.id, entry)}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-700">
                        {entry.id}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {[entry.municipality, entry.province].filter(Boolean).join(', ') || 'Location not set'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{entry.adminEmail || 'No admin email recorded'}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => beginEdit(entry)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100"
                    >
                      <i className="fas fa-pen mr-2 text-xs" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLgu(entry)}
                      disabled={isSaving}
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-trash'} mr-2 text-xs`} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!filteredRows.length ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <i className="fas fa-city text-3xl text-slate-300" />
            <p className="mt-4 text-sm font-semibold text-slate-500">No LGUs match your filter.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
