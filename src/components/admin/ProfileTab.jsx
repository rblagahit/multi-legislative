import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Admin profile tab — name, role, contact email, photo, bio.
 * Profile is stored at users/{uid} (Phase 1+ data model).
 * Contact email is the only required field (used for document requests).
 */
export default function ProfileTab({ user, members, showToast }) {
  const [form, setForm] = useState({
    name: '', role: '', email: '', image: '', bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setForm({
            name:  d.name         || '',
            role:  d.position     || '',
            email: d.contactEmail || d.email || '',
            image: d.image        || '',
            bio:   d.bio          || '',
          });
        }
      } catch (err) {
        console.error('[ProfileTab] load error', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.email) { showToast('Contact Email is required.', 'error'); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid:          user.uid,
        name:         form.name,
        position:     form.role,
        contactEmail: form.email,
        image:        form.image,
        bio:          form.bio,
        isComplete:   true,
        updatedAt:    serverTimestamp(),
        updatedBy:    user.uid,
      }, { merge: true });
      showToast('Profile saved', 'success');
    } catch (err) {
      console.error(err);
      showToast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400"><i className="fas fa-spinner fa-spin text-2xl" /></div>;

  return (
    <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-3 mb-7">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
          <i className="fas fa-user-circle" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">Your Admin Profile</h3>
          <p className="text-sm text-slate-500">Only <strong>Contact Email</strong> is required — used for document copy requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { label: 'Full Name',      key: 'name',  placeholder: 'Your full name',          type: 'text' },
          { label: 'Position / Role',key: 'role',  placeholder: 'e.g., Mayor, Vice Mayor',  type: 'text' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder}
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
          </div>
        ))}
        <div className="lg:col-span-2">
          <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">
            Contact Email <span className="text-red-500">*</span>
          </label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="admin@example.com" required
            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
          <p className="text-[10px] text-slate-400 mt-1 ml-1">This email will receive all document requests</p>
        </div>
        <div>
          <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Profile Photo URL</label>
          <input type="url" value={form.image} onChange={set('image')} placeholder="https://… (optional)"
            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
        </div>
        <div className="lg:col-span-2">
          <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Biography</label>
          <textarea value={form.bio} onChange={set('bio')} rows={3} placeholder="Your background and qualifications…"
            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all resize-none" />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <><i className="fas fa-spinner fa-spin" /> Saving…</> : <><i className="fas fa-save" /> Save Profile</>}
        </button>
      </div>
    </div>
  );
}
