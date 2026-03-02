import { useState } from 'react';

/**
 * Document copy request modal.
 * Builds a pre-filled mailto: link to the admin contact email
 * so the user's default email client opens with all details.
 */
export default function DocumentRequestModal({ doc, settings, onClose }) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg]     = useState('');

  const contactEmail = settings?.contactEmail || '';

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Document Request: ${doc.docId} – ${doc.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nI would like to request a certified copy of the following document:\n\n` +
      `Document: ${doc.title}\nDocument ID: ${doc.docId}\nType: ${doc.type}\n\n` +
      `Requested by: ${name}\nReturn email: ${email}\n\n` +
      (msg ? `Additional message:\n${msg}\n\n` : '') +
      `Thank you.`
    );
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-7">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <i className="fas fa-envelope text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-900">Request a Certified Copy</h3>
              <p className="text-xs text-slate-400 truncate">{doc.docId} · {doc.type}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-auto w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 transition-colors shrink-0"
            >
              <i className="fas fa-times text-xs" />
            </button>
          </div>

          {!contactEmail ? (
            <p className="text-sm text-slate-500 text-center py-6">
              Contact information has not been configured yet. Please check back later.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Your Name *</label>
                <input
                  value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Full name"
                  className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Your Email *</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Message (optional)</label>
                <textarea
                  value={msg} onChange={e => setMsg(e.target.value)} rows={3}
                  placeholder="Any additional details or purpose of request…"
                  className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all text-sm resize-none"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Clicking "Send Request" will open your email client with a pre-filled message to the SB office.
              </p>
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-wide hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <i className="fas fa-paper-plane" /> Send Request
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
