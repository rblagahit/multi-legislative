import { useMemo, useState } from 'react';
import { deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const ROLE_OPTIONS = ['superadmin', 'admin', 'editor', 'barangay_portal', 'pending', 'rejected'];

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

function roleTone(role = '') {
  const tones = {
    superadmin: 'bg-amber-100 text-amber-700',
    admin: 'bg-blue-100 text-blue-700',
    editor: 'bg-emerald-100 text-emerald-700',
    barangay_portal: 'bg-violet-100 text-violet-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-rose-100 text-rose-700',
  };
  return tones[normalizeText(role).toLowerCase()] || 'bg-slate-100 text-slate-700';
}

const EMPTY_FORM = {
  name: '',
  email: '',
  role: 'editor',
  lguId: '',
  barangayId: '',
  barangayName: '',
};

export default function PlatformUsersTab({
  users,
  registryMap,
  showToast,
  refreshPlatformData,
}) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState('');
  const [savingId, setSavingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const entries = [...users].sort((a, b) => normalizeText(a.name, a.email || a.id).localeCompare(normalizeText(b.name, b.email || b.id)));

    if (!term) return entries;
    return entries.filter((entry) => {
      const lguLabel = buildLguLabel(entry.lguId, registryMap.get(entry.lguId));
      const haystack = [
        entry.name,
        entry.email,
        entry.role,
        entry.status,
        entry.lguId,
        lguLabel,
        entry.barangayId,
        entry.barangayName,
      ].map((value) => normalizeText(value, '').toLowerCase()).join(' ');
      return haystack.includes(term);
    });
  }, [registryMap, search, users]);

  const beginEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      name: entry.name || '',
      email: entry.email || '',
      role: entry.role || 'editor',
      lguId: entry.lguId || '',
      barangayId: entry.barangayId || '',
      barangayName: entry.barangayName || '',
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

  const saveUser = async (userId) => {
    setSavingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        status: form.role === 'pending' || form.role === 'rejected' ? form.role : 'active',
        lguId: form.lguId.trim() || null,
        barangayId: form.role === 'barangay_portal' ? form.barangayId.trim() || null : null,
        barangayName: form.role === 'barangay_portal' ? form.barangayName.trim() || null : null,
        updatedAt: serverTimestamp(),
      });
      showToast('User updated.', 'success');
      resetEdit();
      await refreshPlatformData(false);
    } catch (error) {
      console.error('[PlatformUsersTab.saveUser]', error);
      showToast('Unable to update user.', 'error');
      setSavingId('');
    }
  };

  const deleteUser = async (entry) => {
    const confirmed = window.confirm(
      `Delete user "${normalizeText(entry.name, entry.email || entry.id)}"?\n\nThis permanently removes the Firestore user profile document.`,
    );
    if (!confirmed) return;

    setSavingId(entry.id);
    try {
      await deleteDoc(doc(db, 'users', entry.id));
      showToast('User deleted.', 'success');
      resetEdit();
      await refreshPlatformData(false);
    } catch (error) {
      console.error('[PlatformUsersTab.deleteUser]', error);
      showToast('Unable to delete user.', 'error');
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
            placeholder="Search user, role, LGU, or barangay…"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
            {filteredRows.length} user{filteredRows.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRows.map((entry) => {
          const isEditing = editingId === entry.id;
          const isSaving = savingId === entry.id;
          const lguLabel = buildLguLabel(entry.lguId, registryMap.get(entry.lguId));

          return (
            <div key={entry.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Name</label>
                      <input value={form.name} onChange={setValue('name')}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Email</label>
                      <input type="email" value={form.email} onChange={setValue('email')}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Role</label>
                      <select value={form.role} onChange={setValue('role')}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">LGU ID</label>
                      <input value={form.lguId} onChange={setValue('lguId')}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                    </div>
                    {form.role === 'barangay_portal' ? (
                      <>
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Barangay ID</label>
                          <input value={form.barangayId} onChange={setValue('barangayId')}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Barangay Name</label>
                          <input value={form.barangayName} onChange={setValue('barangayName')}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => saveUser(entry.id)} disabled={isSaving}
                      className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                      <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2 text-xs`} />
                      Save User
                    </button>
                    <button type="button" onClick={resetEdit}
                      className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900">{normalizeText(entry.name, entry.email || entry.id)}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${roleTone(entry.role || entry.status)}`}>
                        {normalizeText(entry.role || entry.status, 'unknown').replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{normalizeText(entry.email, 'No email')}</p>
                    <p className="mt-1 text-sm text-slate-500">{lguLabel}</p>
                    {entry.barangayId ? (
                      <p className="mt-1 text-sm text-slate-500">
                        Barangay: {entry.barangayName || entry.barangayId}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => beginEdit(entry)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100">
                      <i className="fas fa-pen mr-2 text-xs" />
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteUser(entry)} disabled={isSaving}
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70">
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
            <i className="fas fa-users text-3xl text-slate-300" />
            <p className="mt-4 text-sm font-semibold text-slate-500">No users match your filter.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
