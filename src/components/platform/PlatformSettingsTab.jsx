import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const DEFAULT_SETTINGS = {
  navTitle: '',
  logoUrl: '',
  seoSiteName: '',
  seoDefaultDescription: '',
  seoDefaultKeywords: '',
  seoOgImage: '',
  seoCanonicalBaseUrl: '',
  globalHeadHtml: '',
  adsEnabled: false,
  adsenseHeadHtml: '',
  adsDisableForAuthenticated: true,
  adsExcludePublic: false,
  adsExcludeInsights: true,
  adsExcludeContact: true,
  adsExcludeLogin: true,
  adsExcludeAdmin: true,
  adsExcludePlatform: true,
  stickyQrUrl: '',
  stickyFee1: 1500,
  stickyFee2: 2800,
  stickyFee3: 3900,
};

export default function PlatformSettingsTab({ setupSettings, showToast, user }) {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      ...DEFAULT_SETTINGS,
      ...(setupSettings?.platformSettings || {}),
    });
  }, [setupSettings]);

  const setValue = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({
      ...current,
      [key]: key.startsWith('stickyFee') ? Number(value) : value,
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'setup', 'bootstrapped'), {
        platformSettings: form,
        platformSettingsUpdatedAt: serverTimestamp(),
        platformSettingsUpdatedBy: user?.uid || null,
      }, { merge: true });
      showToast('Platform settings saved.', 'success');
    } catch (error) {
      console.error('[PlatformSettingsTab.saveSettings]', error);
      showToast('Unable to save platform settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-slate-900">Platform Settings</h3>
        <p className="text-sm text-slate-500">Global branding and SEO defaults for all tenant portals.</p>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Navbar Main Title</label>
            <input value={form.navTitle} onChange={setValue('navTitle')} placeholder="e.g., legistrackr.com"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Platform Logo URL</label>
            <input type="url" value={form.logoUrl} onChange={setValue('logoUrl')} placeholder="https://.../logo.png"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">SEO Site Name</label>
              <input value={form.seoSiteName} onChange={setValue('seoSiteName')} placeholder="Multi-Legislative Portal"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Canonical Base URL</label>
              <input type="url" value={form.seoCanonicalBaseUrl} onChange={setValue('seoCanonicalBaseUrl')} placeholder="https://domain.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">SEO Default Description</label>
            <textarea value={form.seoDefaultDescription} onChange={setValue('seoDefaultDescription')} rows={4} placeholder="Default meta description for public pages"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">SEO Base Keywords</label>
            <input value={form.seoDefaultKeywords} onChange={setValue('seoDefaultKeywords')} placeholder="lgu, ordinances, resolutions"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">SEO OG Image URL</label>
            <input type="url" value={form.seoOgImage} onChange={setValue('seoOgImage')} placeholder="https://.../og-image.png"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Global Head HTML</label>
            <textarea
              value={form.globalHeadHtml}
              onChange={setValue('globalHeadHtml')}
              rows={5}
              placeholder={`<meta name="google-adsense-account" content="ca-pub-xxxxxxxxxxxxxxxx">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-xxxxxxxxxxxxxxxx" crossorigin="anonymous"></script>`}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
            />
            <p className="mt-2 text-xs text-slate-400">
              Injected into the global <code>&lt;head&gt;</code>. Intended for AdSense meta/script tags and other verified head snippets.
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">AdSense Controls</p>
                <h4 className="mt-2 text-lg font-black text-slate-900">Safe Ad Delivery Defaults</h4>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                  These settings keep ads away from admin/superadmin sessions and non-revenue pages by default.
                </p>
              </div>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form.adsEnabled)}
                  onChange={setValue('adsEnabled')}
                  className="h-4 w-4 accent-amber-600"
                />
                Enable AdSense
              </label>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">AdSense Head HTML</label>
                <textarea
                  value={form.adsenseHeadHtml}
                  onChange={setValue('adsenseHeadHtml')}
                  rows={5}
                  placeholder={`<meta name="google-adsense-account" content="ca-pub-xxxxxxxxxxxxxxxx">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-xxxxxxxxxxxxxxxx" crossorigin="anonymous"></script>`}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition-all focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Only loaded when AdSense is enabled and the current page is not excluded.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  ['adsDisableForAuthenticated', 'Disable when signed in', 'Recommended to prevent accidental self-clicks while using admin or staff accounts.'],
                  ['adsExcludePublic', 'Exclude landing page', 'Turn off ads on the public homepage and public document/member routes.'],
                  ['adsExcludeInsights', 'Exclude insights', 'Keep analytics pages ad-free by default.'],
                  ['adsExcludeContact', 'Exclude contact', 'Avoid ads on low-intent support/contact pages.'],
                  ['adsExcludeLogin', 'Exclude login pages', 'Hide ads on admin and barangay sign-in pages.'],
                  ['adsExcludeAdmin', 'Exclude admin views', 'Never load ads inside the LGU management panel.'],
                  ['adsExcludePlatform', 'Exclude platform views', 'Never load ads inside the superadmin dashboard.'],
                ].map(([key, label, help]) => (
                  <label key={key} className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(form[key])}
                        onChange={setValue(key)}
                        className="mt-1 h-4 w-4 accent-amber-600"
                      />
                      <div>
                        <p className="text-sm font-black text-slate-900">{label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{help}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Sticky Profile Premium</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Payment QR URL</label>
                <input type="url" value={form.stickyQrUrl} onChange={setValue('stickyQrUrl')} placeholder="https://.../qr.png"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Fee (1 month)</label>
                  <input type="number" min="0" value={form.stickyFee1} onChange={setValue('stickyFee1')}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Fee (2 months)</label>
                  <input type="number" min="0" value={form.stickyFee2} onChange={setValue('stickyFee2')}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Fee (3 months)</label>
                  <input type="number" min="0" value={form.stickyFee3} onChange={setValue('stickyFee3')}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100" />
                </div>
              </div>
            </div>
          </div>

          <button type="button" onClick={saveSettings} disabled={saving}
            className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70">
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2 text-xs`} />
            Save Platform Settings
          </button>
        </div>
      </div>
    </div>
  );
}
