import { useEffect, useMemo, useState } from 'react';
import { collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { sanitizeLguId } from '../../utils/helpers';
import { AdminSurface, AdminTabHeader } from './AdminUi';

const EMPTY_FORM = {
  name: '',
  code: '',
  captain: '',
  secretaryName: '',
  secretaryEmail: '',
};

export default function BarangaysTab({ tenantId, showToast }) {
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!tenantId) {
      setBarangays([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query(collection(db, 'lgus', tenantId, 'barangays'), limit(200)),
      (snapshot) => {
        setBarangays(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('[BarangaysTab]', error);
        showToast('Unable to load barangays.', 'error');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [showToast, tenantId]);

  const sortedBarangays = useMemo(
    () => [...barangays].sort((a, b) => (a.name || a.code || a.id).localeCompare(b.name || b.code || b.id)),
    [barangays],
  );

  const setValue = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'name' && !editingId && !current.code ? { code: sanitizeLguId(value) } : {}),
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId('');
    setShowForm(false);
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      name: entry.name || '',
      code: entry.code || entry.id || '',
      captain: entry.captain || '',
      secretaryName: entry.secretaryName || '',
      secretaryEmail: entry.secretaryEmail || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const code = sanitizeLguId(form.code || form.name);
    if (!form.name || !code) {
      showToast('Barangay name and code are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'lgus', tenantId, 'barangays', code), {
        code,
        name: form.name.trim(),
        captain: form.captain.trim(),
        secretaryName: form.secretaryName.trim(),
        secretaryEmail: form.secretaryEmail.trim(),
        updatedAt: serverTimestamp(),
        createdAt: editingId ? undefined : serverTimestamp(),
      }, { merge: true });
      showToast(editingId ? 'Barangay updated.' : 'Barangay saved.', 'success');
      resetForm();
    } catch (error) {
      console.error('[BarangaysTab.handleSave]', error);
      showToast('Unable to save barangay.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTabHeader
        icon="fa-map-marker-alt"
        title="Barangays"
        description="Maintain the barangay registry used by the portal and invite flows."
        badge={`${sortedBarangays.length} barangays`}
        action={(
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                resetForm();
                return;
              }
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-teal-700"
          >
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'} text-xs`} />
            {showForm ? 'Close Form' : 'Add Barangay'}
          </button>
        )}
      />

      {showForm ? (
        <AdminSurface>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Barangay Name</label>
              <input
                value={form.name}
                onChange={setValue('name')}
                placeholder="Barangay San Antonio"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Barangay Code / ID</label>
              <input
                value={form.code}
                onChange={setValue('code')}
                placeholder="brgy-san-antonio"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Barangay Captain</label>
              <input
                value={form.captain}
                onChange={setValue('captain')}
                placeholder="Hon. Juan Dela Cruz"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Barangay Secretary</label>
              <input
                value={form.secretaryName}
                onChange={setValue('secretaryName')}
                placeholder="Maria Santos"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Secretary Email</label>
              <input
                type="email"
                value={form.secretaryEmail}
                onChange={setValue('secretaryEmail')}
                placeholder="barangay@lgu.gov.ph"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-all hover:from-teal-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'} text-xs`} />
              {editingId ? 'Update Barangay' : 'Save Barangay'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </AdminSurface>
      ) : null}

      <AdminSurface>
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <i className="fas fa-spinner fa-spin text-2xl" />
          </div>
        ) : !sortedBarangays.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <i className="fas fa-map-marker-alt text-2xl text-slate-300" />
            <p className="mt-4 text-sm font-semibold text-slate-500">No barangays registered yet.</p>
            <p className="mt-2 text-sm text-slate-400">Use the form above to start rebuilding the barangay registry from the legacy dashboard.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedBarangays.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-900">{entry.name || entry.code || entry.id}</p>
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-teal-700">
                      {entry.code || entry.id}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.captain ? `Captain: ${entry.captain}` : 'No barangay captain recorded'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.secretaryEmail || entry.secretaryName
                      ? `Secretary: ${entry.secretaryName || 'Unassigned'}${entry.secretaryEmail ? ` · ${entry.secretaryEmail}` : ''}`
                      : 'No secretary details recorded'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEdit(entry)}
                  className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100"
                >
                  <i className="fas fa-pen text-xs" />
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminSurface>
    </div>
  );
}
