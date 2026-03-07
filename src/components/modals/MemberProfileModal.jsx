import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDate, isTermExpired, normalizeName } from '../../utils/helpers';
import { buildPublicShareUrl, sharePublicEntity } from '../../utils/share';

const STICKY_REQUEST_ROLES = ['admin', 'editor', 'barangay_portal'];

function buildAvatar(member) {
  return member.image
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'SB')}&background=1d4ed8&color=fff&bold=true&size=256`;
}

function isPrimarySponsor(member, doc) {
  return doc.authorId === member.id
    || normalizeName(doc.authorName || '') === normalizeName(member.name || '');
}

export default function MemberProfileModal({
  member,
  documents,
  platformSettings,
  user,
  userRole,
  userLguId,
  onClose,
  onOpenDocument,
  showToast,
}) {
  const [stickyForm, setStickyForm] = useState({ months: '1', transactionNumber: '' });
  const [stickySubmitting, setStickySubmitting] = useState(false);
  const avatar = buildAvatar(member);
  const expired = isTermExpired(member);
  const recentSponsoredOrdinances = [...documents]
    .filter((doc) => doc.type === 'Ordinance' && isPrimarySponsor(member, doc))
    .sort((a, b) => {
      const aTime = a.timestamp?.seconds || a.updatedAt?.seconds || 0;
      const bTime = b.timestamp?.seconds || b.updatedAt?.seconds || 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  const shareUrl = buildPublicShareUrl('member', member);
  const shareTitle = `${member.name || 'SB Member'} | Member Profile`;
  const shareText = `View the public legislative profile for ${member.name || 'this member'}.`;
  const stickyOptions = useMemo(() => ([
    { months: 1, fee: Number(platformSettings?.stickyFee1 || 1500) || 1500 },
    { months: 2, fee: Number(platformSettings?.stickyFee2 || 2800) || 2800 },
    { months: 3, fee: Number(platformSettings?.stickyFee3 || 3900) || 3900 },
  ]), [platformSettings?.stickyFee1, platformSettings?.stickyFee2, platformSettings?.stickyFee3]);
  const selectedStickyOption = stickyOptions.find((entry) => String(entry.months) === String(stickyForm.months)) || stickyOptions[0];
  const canRequestSticky = Boolean(
    user?.uid
    && STICKY_REQUEST_ROLES.includes(String(userRole || '').toLowerCase())
    && userLguId
    && member.lguId
    && userLguId === member.lguId,
  );

  const handleShare = async (channel) => {
    await sharePublicEntity({
      channel,
      title: shareTitle,
      text: shareText,
      url: shareUrl,
      onSuccess: (message) => showToast?.(message, 'success'),
      onError: (message) => showToast?.(message, 'error'),
    });
  };

  const submitStickyRequest = async () => {
    const transactionNumber = stickyForm.transactionNumber.trim();
    if (transactionNumber.length < 4) {
      showToast?.('Enter a valid payment or transaction reference first.', 'error');
      return;
    }

    setStickySubmitting(true);
    try {
      await addDoc(collection(db, 'stickyProfileRequests'), {
        status: 'pending',
        months: selectedStickyOption.months,
        fee: selectedStickyOption.fee,
        transactionNumber,
        memberScopeId: `${member.lguId || 'public'}:${member.id}`,
        memberId: member.id,
        lguId: member.lguId || 'public',
        memberName: member.name || '',
        memberRole: member.role || '',
        memberImage: member.image || '',
        sourceHost: window.location.hostname,
        requesterUid: user.uid,
        requesterEmail: user.email || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setStickyForm({ months: '1', transactionNumber: '' });
      showToast?.('Sticky profile request submitted for review.', 'success');
    } catch (error) {
      console.error('[MemberProfileModal.submitStickyRequest]', error);
      showToast?.('Unable to submit sticky profile request.', 'error');
    } finally {
      setStickySubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-slate-100 px-8 pb-8 pt-10 text-center">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-700"
          >
            <i className="fas fa-times text-sm" />
          </button>

          <img
            src={avatar}
            alt={member.name}
            className="mx-auto h-40 w-40 rounded-[2.25rem] border-4 border-white object-cover shadow-xl sm:h-44 sm:w-44"
            onError={(event) => {
              event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'SB')}&background=1d4ed8&color=fff&bold=true&size=256`;
            }}
          />
          <h2 className="mt-5 text-3xl font-black text-slate-900">{member.name}</h2>
          <p className="mt-2 text-sm font-black uppercase tracking-[0.28em] text-blue-600">{member.role || 'SB Member'}</p>
          {(member.termStart || member.termEnd) ? (
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Term: {formatDate(member.termStart) || 'N/A'}{member.termEnd ? ` - ${formatDate(member.termEnd)}` : ''}
            </p>
          ) : null}
          {expired ? (
            <p className="mx-auto mt-4 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              This recorded term has ended.
            </p>
          ) : null}
          {(member.committees || []).length ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {member.committees.map((committee) => (
                <span key={committee} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {committee}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-8 px-8 py-8">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Biography</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {member.bio || 'No biography available for this member yet.'}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-600">Sticky Profile Premium</p>
                <p className="mt-2 text-sm text-slate-600">
                  Requests must be filed by a registered user from this LGU. LGU requests are then queued for superadmin review.
                </p>
                {platformSettings?.stickyQrUrl ? (
                  <a
                    href={platformSettings.stickyQrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800"
                  >
                    <i className="fas fa-qrcode text-xs" />
                    Open payment QR / instructions
                  </a>
                ) : null}
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700 shadow-sm">
                LGU-routed request
              </span>
            </div>

            {canRequestSticky ? (
              <div className="mt-5 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                <label className="rounded-2xl border border-amber-200 bg-white px-4 py-3 shadow-sm">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Duration</span>
                  <select
                    value={stickyForm.months}
                    onChange={(event) => setStickyForm((current) => ({ ...current, months: event.target.value }))}
                    className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                  >
                    {stickyOptions.map((entry) => (
                      <option key={entry.months} value={entry.months}>
                        {entry.months} month{entry.months > 1 ? 's' : ''} · PHP {entry.fee.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-amber-200 bg-white px-4 py-3 shadow-sm">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Transaction Reference</span>
                  <input
                    type="text"
                    value={stickyForm.transactionNumber}
                    onChange={(event) => setStickyForm((current) => ({ ...current, transactionNumber: event.target.value }))}
                    placeholder="GCash / transfer / receipt reference"
                    className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={submitStickyRequest}
                  disabled={stickySubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-4 text-sm font-black text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <i className={`fas ${stickySubmitting ? 'fa-spinner fa-spin' : 'fa-thumbtack'} text-xs`} />
                  Request Sticky
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-white/80 px-4 py-4 text-sm font-semibold text-slate-600">
                Sticky requests are available only to signed-in LGU users from this municipality.
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Share This Profile</p>
            <p className="mt-2 text-sm text-slate-500">Help your community discover this member profile.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ['facebook', 'fab fa-facebook-f', 'Facebook', 'bg-blue-50 text-blue-700 hover:bg-blue-100'],
                ['x', 'fab fa-x-twitter', 'X', 'bg-slate-100 text-slate-700 hover:bg-slate-200'],
                ['linkedin', 'fab fa-linkedin-in', 'LinkedIn', 'bg-sky-50 text-sky-700 hover:bg-sky-100'],
                ['messenger', 'fab fa-facebook-messenger', 'Messenger', 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'],
                ['email', 'fas fa-envelope', 'Email', 'bg-amber-50 text-amber-700 hover:bg-amber-100'],
                ['copy', 'fas fa-link', 'Copy', 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'],
              ].map(([channel, icon, label, tone]) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => handleShare(channel)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${tone}`}
                >
                  <i className={icon} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Sponsored Ordinances</p>
                <p className="mt-2 text-sm text-slate-500">Showing the latest 5 ordinances where this member is the primary sponsor.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
                {recentSponsoredOrdinances.length} found
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {recentSponsoredOrdinances.length ? recentSponsoredOrdinances.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onOpenDocument(doc)}
                  className="block w-full rounded-2xl border border-slate-200 p-4 text-left transition-all hover:border-blue-300 hover:bg-slate-50"
                >
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{doc.type || 'Document'}</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{doc.title || 'Untitled'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {doc.docId || 'No document ID'}{doc.timestamp?.toDate ? ` · ${doc.timestamp.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}
                  </p>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No sponsored ordinances found for this member yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
