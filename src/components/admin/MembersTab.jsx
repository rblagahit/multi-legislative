import { useState } from 'react';
import { addMember, updateMember, deleteMember, archiveMember } from '../../hooks/useMembers';
import { parseTags, isTermExpired } from '../../utils/helpers';
import { AdminSurface, AdminTabHeader } from './AdminUi';

/**
 * Admin Members tab — list + collapsible Add/Edit form.
 * Phase 0 UX: form hidden by default, full-width list always visible.
 *
 * TODO (Phase 3): Replace form panel with shared Drawer component.
 */
export default function MembersTab({ members, tenantId, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  const [form, setForm] = useState({
    name: '', role: '', image: '', termStart: '', termEnd: '', committees: '', bio: '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openAdd = () => {
    setEditId(null);
    setForm({ name: '', role: '', image: '', termStart: '', termEnd: '', committees: '', bio: '' });
    setShowForm(true);
  };

  const openEdit = (member) => {
    setEditId(member.id);
    setForm({
      name:        member.name        || '',
      role:        member.role        || '',
      image:       member.image       || '',
      termStart:   member.termStart   || '',
      termEnd:     member.termEnd     || '',
      committees:  (member.committees || []).join(', '),
      bio:         member.bio         || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => { setShowForm(false); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.role) { showToast('Name and role are required.', 'error'); return; }
    setSaving(true);
    const payload = {
      name:        form.name,
      role:        form.role,
      image:       form.image,
      termStart:   form.termStart,
      termEnd:     form.termEnd,
      committees:  parseTags(form.committees),
      bio:         form.bio,
    };
    try {
      if (editId) {
        await updateMember(editId, payload, tenantId);
        showToast('Member updated', 'success');
      } else {
        await addMember(payload, tenantId);
        showToast('Member added', 'success');
      }
      handleCancel();
    } catch (err) {
      console.error(err);
      showToast('Error saving member', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this member?')) return;
    try { await deleteMember(id, tenantId); showToast('Member deleted', 'success'); }
    catch { showToast('Delete failed', 'error'); }
  };

  const handleArchive = async (id, current) => {
    try { await archiveMember(id, !current, tenantId); showToast(!current ? 'Member archived' : 'Member reactivated', 'success'); }
    catch { showToast('Error updating member', 'error'); }
  };

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name?.toLowerCase().includes(q) || m.role?.toLowerCase().includes(q);
  });

  return (
    <div>
      <AdminTabHeader
        icon="fa-users"
        title="Members"
        description="Legislative officers, profiles, and archive status."
        badge={`${members.filter(m => !m.isArchived).length} active`}
        action={(
          <button
            onClick={showForm ? handleCancel : openAdd}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-teal-600 px-5 py-3 text-sm font-bold text-white transition-all shadow-md hover:from-green-700 hover:to-teal-700"
          >
            <i className={`fas ${showForm ? 'fa-times' : 'fa-user-plus'} text-xs`} />
            {showForm ? 'Close Form' : 'Add Member'}
          </button>
        )}
      />

      {/* Collapsible form */}
      {showForm && (
        <AdminSurface className="mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Full Name *</label>
              <input value={form.name} onChange={set('name')} required placeholder="e.g., Hon. Juan dela Cruz"
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Position / Role *</label>
              <input value={form.role} onChange={set('role')} required placeholder="e.g., Vice Mayor, Councilor"
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Profile Photo URL</label>
              <input type="url" value={form.image} onChange={set('image')} placeholder="https://… (optional)"
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Committees</label>
              <input value={form.committees} onChange={set('committees')} placeholder="health, budget, education"
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
              <p className="text-[10px] text-slate-400 mt-1 ml-1">Separate with commas</p>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Term Start</label>
              <input type="date" value={form.termStart} onChange={set('termStart')}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Term End</label>
              <input type="date" value={form.termEnd} onChange={set('termEnd')}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Biography</label>
              <textarea value={form.bio} onChange={set('bio')} rows={3}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                placeholder="Brief background and committee assignments…" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="button" onClick={handleCancel}
                className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg hover:from-green-700 hover:to-teal-700 transition-all flex items-center justify-center gap-3 disabled:opacity-60">
                {saving
                  ? <><i className="fas fa-spinner fa-spin" /> Saving…</>
                  : <><i className={`fas ${editId ? 'fa-save' : 'fa-plus'}`} />{editId ? 'Update Member' : 'Add Member'}</>}
              </button>
            </div>
          </form>
        </AdminSurface>
      )}

      {/* Member list */}
      <AdminSurface>
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <i className="fas fa-users text-blue-600" /> Current Members
          </p>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {members.filter(m => !m.isArchived).length}
          </span>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or role…"
          className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 mb-4 text-sm transition-all"
        />
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {filtered.length === 0 && (
            <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">No members match the current filter.</p>
          )}
          {filtered.map(m => (
            <div key={m.id}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-colors
                ${m.isArchived ? 'bg-slate-50 opacity-60' : 'bg-slate-50 hover:bg-slate-100'}`}>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                {m.name?.[0] || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 text-sm truncate">{m.name}</p>
                <p className="text-xs text-slate-400">{m.role}</p>
              </div>
              {isTermExpired(m) && (
                <span className="text-[9px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 px-2 py-1 rounded-full shrink-0">
                  Expired
                </span>
              )}
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(m)}
                  className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">
                  <i className="fas fa-pen text-xs" />
                </button>
                <button onClick={() => handleArchive(m.id, m.isArchived)}
                  className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors"
                  title={m.isArchived ? 'Reactivate' : 'Archive'}>
                  <i className={`fas ${m.isArchived ? 'fa-undo' : 'fa-archive'} text-xs`} />
                </button>
                <button onClick={() => handleDelete(m.id)}
                  className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors">
                  <i className="fas fa-trash text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </AdminSurface>
    </div>
  );
}
