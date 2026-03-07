import { formatDate, isTermExpired, normalizeName } from '../../utils/helpers';
import { buildPublicShareUrl, sharePublicEntity } from '../../utils/share';

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
  onClose,
  onOpenDocument,
  showToast,
}) {
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
