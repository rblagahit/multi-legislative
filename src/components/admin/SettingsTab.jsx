import { useState } from 'react';
import { saveSettings } from '../../hooks/useSettings';

/**
 * Admin Settings tab — accordion: Branding / Notice / Social.
 * Phase 0 UX: one section expanded at a time.
 *
 * TODO (Phase 3): Add live seal preview update.
 */
export default function SettingsTab({ settings, user, showToast }) {
  const [open, setOpen] = useState('branding');

  // Local form mirrors settings; changes saved on explicit Save click
  const [branding, setBranding] = useState({
    orgName: settings?.orgName || '', municipality: settings?.municipality || '',
    province: settings?.province || '', sealUrl: settings?.sealUrl || '',
    contactPhone1: settings?.contactPhone1 || '', contactPhone2: settings?.contactPhone2 || '',
    contactEmail: settings?.contactEmail || '',
  });
  const [notice, setNotice]     = useState(settings?.downloadNotice || '');
  const [social, setSocial]     = useState({
    socialFacebook: settings?.socialFacebook || '',
    socialTwitter:  settings?.socialTwitter  || '',
    socialEmail:    settings?.socialEmail    || '',
  });

  const toggle = (id) => setOpen(v => v === id ? null : id);

  const save = async (partial) => {
    try {
      await saveSettings(user.uid, partial);
      showToast('Settings saved', 'success');
    } catch {
      showToast('Save failed', 'error');
    }
  };

  const AccordionHeader = ({ id, icon, gradient, title, sub }) => (
    <button
      onClick={() => toggle(id)}
      className="w-full flex items-center justify-between px-7 py-5 text-left hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white text-sm shadow-sm`}>
          <i className={`fas ${icon}`} />
        </div>
        <div>
          <p className="font-black text-slate-900 text-sm">{title}</p>
          <p className="text-xs text-slate-400">{sub}</p>
        </div>
      </div>
      <i className={`fas ${open === id ? 'fa-chevron-down text-blue-600' : 'fa-chevron-right text-slate-400'} text-xs transition-transform duration-200`} />
    </button>
  );

  return (
    <div>
      <h3 className="text-xl font-black text-slate-900 mb-2">Settings</h3>
      <p className="text-sm text-slate-500 mb-6">Click a section to expand and edit</p>

      <div className="space-y-3">

        {/* ── Branding ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <AccordionHeader id="branding" icon="fa-building-columns" gradient="from-emerald-500 to-teal-600"
            title="Organization Branding" sub="Name, location, seal, contact numbers" />
          {open === 'branding' && (
            <div className="px-7 pb-7 border-t border-slate-100">
              <div className="space-y-5 mt-6">
                {[
                  { label: 'Organization Name', key: 'orgName',       placeholder: 'e.g., Sangguniang Bayan of Argao', hint: 'Appears in nav bar and footer' },
                  { label: 'Seal / Logo URL',   key: 'sealUrl',       placeholder: 'https://… (direct image link)', type: 'url', hint: 'Updates nav seal, footer, and favicon' },
                  { label: 'Contact Email',     key: 'contactEmail',  placeholder: 'e.g., sbargao@lgu.gov.ph', type: 'email', hint: 'Displayed on the Contact page' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">{f.label}</label>
                    <input type={f.type || 'text'} value={branding[f.key]}
                      onChange={e => setBranding(b => ({ ...b, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
                    {f.hint && <p className="text-[10px] text-slate-400 mt-1 ml-1">{f.hint}</p>}
                  </div>
                ))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[['Municipality','municipality','e.g., Argao'],['Province','province','e.g., Cebu'],
                    ['Contact Phone 1','contactPhone1','(032) 123-4567'],['Contact Phone 2','contactPhone2','+63 9xx xxx xxxx']].map(([lbl,k,ph]) => (
                    <div key={k}>
                      <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">{lbl}</label>
                      <input value={branding[k]} onChange={e => setBranding(b => ({ ...b, [k]: e.target.value }))}
                        placeholder={ph}
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => save(branding)}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2">
                <i className="fas fa-save" /> Save Branding
              </button>
            </div>
          )}
        </div>

        {/* ── Document Notice ───────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <AccordionHeader id="notice" icon="fa-gavel" gradient="from-indigo-600 to-blue-600"
            title="Document Download Notice" sub="Text shown before users open a document" />
          {open === 'notice' && (
            <div className="px-7 pb-7 border-t border-slate-100">
              <div className="mt-6">
                <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">Notice Text</label>
                <textarea value={notice} onChange={e => setNotice(e.target.value)} rows={6}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all resize-y" />
                <p className="text-[11px] text-slate-400 mt-2">Appears in the confirmation popup before PDF redirect.</p>
              </div>
              <button onClick={() => save({ downloadNotice: notice })}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:from-indigo-700 hover:to-blue-700 transition-all flex items-center gap-2">
                <i className="fas fa-save" /> Save Notice
              </button>
            </div>
          )}
        </div>

        {/* ── Social Media ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <AccordionHeader id="social" icon="fa-share-alt" gradient="from-pink-600 to-rose-600"
            title="Social Media Links" sub="Facebook, Twitter/X, contact email — shown in footer" />
          {open === 'social' && (
            <div className="px-7 pb-7 border-t border-slate-100">
              <div className="space-y-5 mt-6">
                {[
                  { label: 'Facebook URL',  key: 'socialFacebook', placeholder: 'https://facebook.com/…', type: 'url' },
                  { label: 'Twitter / X URL',key: 'socialTwitter', placeholder: 'https://twitter.com/…', type: 'url' },
                  { label: 'Email Contact', key: 'socialEmail',    placeholder: 'contact@example.com', type: 'email' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-black uppercase text-slate-400 block mb-2 tracking-wider">{f.label}</label>
                    <input type={f.type} value={social[f.key]}
                      onChange={e => setSocial(s => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                ))}
              </div>
              <button onClick={() => save(social)}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:from-pink-700 hover:to-rose-700 transition-all flex items-center gap-2">
                <i className="fas fa-save" /> Save Social Media
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
