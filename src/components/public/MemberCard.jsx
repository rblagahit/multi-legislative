import { isTermExpired } from '../../utils/helpers';

/**
 * Public member profile card.
 * TODO (Phase 3): Wire up member profile modal.
 */
export default function MemberCard({ member, relatedDocs }) {
  const expired  = isTermExpired(member);
  const isViceMayor = /vice\s*mayor/i.test(member.role || '');
  const avatarFb = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'M')}&background=2563eb&color=fff&bold=true&size=128`;

  return (
    <div
      className={`member-hero-card bg-white rounded-3xl overflow-hidden shadow-sm border cursor-pointer
        ${isViceMayor ? 'border-amber-200 ring-2 ring-amber-100' : 'border-slate-100'}`}
      onClick={() => { /* TODO: open member profile modal */ }}
    >
      {/* Photo */}
      <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <img
          src={member.image || avatarFb}
          alt={member.name}
          className="w-20 h-20 rounded-2xl object-cover shadow-md"
          onError={e => { e.target.src = avatarFb; }}
        />
        {expired && (
          <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 px-2 py-1 rounded-full">
            Term Ended
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="font-black text-slate-900 text-sm leading-snug">{member.name}</h3>
        <p className="text-xs text-blue-600 font-bold mt-1">{member.role}</p>

        {(member.committees || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {member.committees.slice(0, 2).map(c => (
              <span key={c} className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full capitalize">{c}</span>
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate-400 mt-3">
          {relatedDocs.length} document{relatedDocs.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
