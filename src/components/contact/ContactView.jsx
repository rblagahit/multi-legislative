/**
 * Public contact page with office details and online channels.
 */
export default function ContactView({ settings }) {
  const {
    orgName, municipality, province,
    contactPhone1, contactPhone2, contactEmail,
    socialFacebook, socialTwitter, socialEmail,
  } = settings || {};
  const location = [municipality, province].filter(Boolean).join(', ');

  return (
    <section className="min-h-[70vh] bg-gradient-to-br from-white via-blue-50/30 to-emerald-50/20 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">
            Contact
          </p>
          <h2 className="mt-3 text-4xl font-black text-slate-900">Get in Touch</h2>
          <p className="mt-3 text-base text-slate-500">
            Reach {orgName || 'your local legislative office'} for certified copies, public inquiries, and official coordination.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Office Details</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Office</p>
                <p className="mt-2 font-bold text-slate-900">{orgName || 'Sangguniang Bayan of Argao'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Location</p>
                <p className="mt-2 font-bold text-slate-900">{location || 'Argao, Cebu'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Primary Phone</p>
                <p className="mt-2 font-bold text-slate-900">{contactPhone1 || 'Not provided'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Secondary Phone</p>
                <p className="mt-2 font-bold text-slate-900">{contactPhone2 || 'Not provided'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5 sm:col-span-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Email</p>
                <p className="mt-2 font-bold text-slate-900">
                  {contactEmail ? <a href={`mailto:${contactEmail}`} className="hover:text-blue-600">{contactEmail}</a> : 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Online Channels</h3>
            <p className="mt-2 text-sm text-slate-500">Use the official channels below when available.</p>
            <div className="mt-6 space-y-3">
              {socialFacebook ? (
                <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 transition-all hover:border-blue-200 hover:text-blue-700">
                  <i className="fab fa-facebook-f w-5 text-blue-600" />
                  <span>Facebook Page</span>
                </a>
              ) : null}
              {socialTwitter ? (
                <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 transition-all hover:border-sky-200 hover:text-sky-700">
                  <i className="fab fa-twitter w-5 text-sky-500" />
                  <span>Twitter / X</span>
                </a>
              ) : null}
              {(socialEmail || contactEmail) ? (
                <a href={`mailto:${socialEmail || contactEmail}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 transition-all hover:border-emerald-200 hover:text-emerald-700">
                  <i className="fas fa-envelope w-5 text-emerald-600" />
                  <span>Email Support</span>
                </a>
              ) : null}
              {!socialFacebook && !socialTwitter && !socialEmail && !contactEmail ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Online contact channels have not been configured yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
