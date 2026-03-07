import { useEffect, useMemo, useState } from 'react';
import {
  collectionGroup,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { removePublicMemberIndex, syncPublicMemberIndex } from '../../hooks/useMembers';
import { parseTags } from '../../utils/helpers';

const PLATFORM_MEMBER_PAGE_SIZE = 100;

const EMPTY_FORM = {
  name: '',
  role: '',
  image: '',
  termStart: '',
  termEnd: '',
  committees: '',
  bio: '',
};

function normalizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

const mapMembers = (snapshot) => snapshot.docs.map((docSnap) => {
  const path = docSnap.ref.path.split('/');
  return {
    id: docSnap.id,
    lguId: path[1] || '',
    pathKey: docSnap.ref.path,
    ...docSnap.data(),
  };
});

const membersPageQuery = (cursor = null) => (
  cursor
    ? query(collectionGroup(db, 'members'), orderBy(documentId()), startAfter(cursor), limit(PLATFORM_MEMBER_PAGE_SIZE))
    : query(collectionGroup(db, 'members'), orderBy(documentId()), limit(PLATFORM_MEMBER_PAGE_SIZE))
);

export default function PlatformMembersTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [editingKey, setEditingKey] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const loadMembers = async ({ withLoader = true, append = false } = {}) => {
    if (withLoader) setLoading(true);
    if (append) setLoadingMore(true);

    try {
      const snapshot = await getDocs(membersPageQuery(append ? lastVisible : null));
      const nextRows = mapMembers(snapshot);

      setRows((current) => {
        if (!append) return nextRows;
        const seen = new Set(current.map((entry) => entry.pathKey));
        return [...current, ...nextRows.filter((entry) => !seen.has(entry.pathKey))];
      });
      setLastVisible(snapshot.docs.at(-1) || null);
      setHasMore(snapshot.docs.length === PLATFORM_MEMBER_PAGE_SIZE);
    } catch (error) {
      console.error('[PlatformMembersTab.loadMembers]', error);
      showToast('Unable to load platform members.', 'error');
    } finally {
      if (withLoader) setLoading(false);
      if (append) setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMembers();
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...rows]
      .filter((row) => !term || [
        row.name,
        row.role,
        row.lguId,
        ...(row.committees || []),
      ].join(' ').toLowerCase().includes(term))
      .sort((a, b) => normalizeText(a.name, a.id).localeCompare(normalizeText(b.name, b.id)));
  }, [rows, search]);

  const beginEdit = (row) => {
    setEditingKey(row.pathKey);
    setForm({
      name: row.name || '',
      role: row.role || '',
      image: row.image || '',
      termStart: row.termStart || '',
      termEnd: row.termEnd || '',
      committees: (row.committees || []).join(', '),
      bio: row.bio || '',
    });
  };

  const resetEdit = () => {
    setEditingKey('');
    setSavingKey('');
    setForm(EMPTY_FORM);
  };

  const setValue = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveMember = async (row) => {
    setSavingKey(row.pathKey);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        image: form.image.trim(),
        termStart: form.termStart || '',
        termEnd: form.termEnd || '',
        committees: parseTags(form.committees),
        bio: form.bio.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'lgus', row.lguId, 'members', row.id), payload);
      await syncPublicMemberIndex(row.id, payload, row.lguId, row);

      setRows((current) => current.map((entry) => (
        entry.pathKey === row.pathKey
          ? { ...entry, ...payload, committees: payload.committees }
          : entry
      )));
      showToast('Member updated.', 'success');
      resetEdit();
    } catch (error) {
      console.error('[PlatformMembersTab.saveMember]', error);
      showToast('Unable to update member.', 'error');
      setSavingKey('');
    }
  };

  const deleteMember = async (row) => {
    const confirmed = window.confirm(
      `Delete member "${normalizeText(row.name, row.id)}" from LGU "${row.lguId}"?`,
    );
    if (!confirmed) return;

    setSavingKey(row.pathKey);
    try {
      await deleteDoc(doc(db, 'lgus', row.lguId, 'members', row.id));
      await removePublicMemberIndex(row.id);
      setRows((current) => current.filter((entry) => entry.pathKey !== row.pathKey));
      showToast('Member deleted.', 'success');
      resetEdit();
    } catch (error) {
      console.error('[PlatformMembersTab.deleteMember]', error);
      showToast('Unable to delete member.', 'error');
      setSavingKey('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search member, role, committee, or LGU..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
        />
        <p className="text-xs font-semibold text-slate-400">
          Search applies to the members loaded so far. Load more to search deeper into the platform directory.
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center text-slate-400 shadow-sm">
          <i className="fas fa-spinner fa-spin text-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRows.map((row) => {
            const isEditing = editingKey === row.pathKey;
            const isSaving = savingKey === row.pathKey;

            return (
              <div key={row.pathKey} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Name</label>
                        <input value={form.name} onChange={setValue('name')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Role</label>
                        <input value={form.role} onChange={setValue('role')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Image URL</label>
                        <input value={form.image} onChange={setValue('image')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Committees</label>
                        <input value={form.committees} onChange={setValue('committees')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Term Start</label>
                        <input type="date" value={form.termStart} onChange={setValue('termStart')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Term End</label>
                        <input type="date" value={form.termEnd} onChange={setValue('termEnd')}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Bio</label>
                        <textarea value={form.bio} onChange={setValue('bio')} rows={3}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => saveMember(row)} disabled={isSaving}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                        <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2 text-xs`} />
                        Save Member
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
                        <p className="font-black text-slate-900">{row.name || row.id}</p>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-700">
                          {row.lguId}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{row.role || 'No role set'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {(row.committees || []).length ? `Committees: ${(row.committees || []).join(', ')}` : 'No committees recorded'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => beginEdit(row)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100">
                        <i className="fas fa-pen mr-2 text-xs" />
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteMember(row)} disabled={isSaving}
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
              <i className="fas fa-user-tie text-3xl text-slate-300" />
              <p className="mt-4 text-sm font-semibold text-slate-500">No members match the current filter.</p>
            </div>
          ) : null}

          {hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => loadMembers({ withLoader: false, append: true })}
                disabled={loadingMore}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <i className={`fas ${loadingMore ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'} mr-2 text-xs`} />
                {loadingMore ? 'Loading more…' : 'Load More Members'}
              </button>
            </div>
          ) : rows.length ? (
            <p className="text-center text-xs font-semibold text-slate-400">
              All loaded members are currently shown.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
