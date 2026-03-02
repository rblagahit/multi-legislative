/**
 * Public contact page.
 * TODO (Phase 3): Port full contact HTML from index.html (~lines 1005–1080).
 * Shows org contact details, map, social links.
 */
export default function ContactView({ settings }) {
  const {
    orgName, municipality, province,
    contactPhone1, contactPhone2, contactEmail,
    socialFacebook, socialTwitter,
  } = settings || {};

  return (
    <section className="min-h-[60vh] max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="mb-10">
        <p className="text-xs font-black uppercase text-blue-600 tracking-widest mb-2">
          <i className="fas fa-envelope mr-2" />Contact
        </p>
        <h2 className="text-3xl font-black text-slate-900">Get in Touch</h2>
        <p className="text-slate-500 mt-1">{orgName || 'Sangguniang Bayan of Argao'}</p>
      </div>

      <div className="space-y-4 text-sm text-slate-700">
        {(municipality || province) && (
          <p><i className="fas fa-map-marker-alt text-blue-600 w-5 mr-2" />{municipality}{province ? `, ${province}` : ''}</p>
        )}
        {contactPhone1 && (
          <p><i className="fas fa-phone text-blue-600 w-5 mr-2" />{contactPhone1}</p>
        )}
        {contactPhone2 && (
          <p><i className="fas fa-mobile-alt text-blue-600 w-5 mr-2" />{contactPhone2}</p>
        )}
        {contactEmail && (
          <p><i className="fas fa-envelope text-blue-600 w-5 mr-2" />
            <a href={`mailto:${contactEmail}`} className="hover:text-blue-600 underline">{contactEmail}</a>
          </p>
        )}
      </div>

      {/* TODO: full contact card with map, office hours, social links */}
    </section>
  );
}
