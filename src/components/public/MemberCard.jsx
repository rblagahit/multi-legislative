import { isTermExpired } from '../../utils/helpers';

/**
 * Public member profile card.
 */
export default function MemberCard({ member, relatedCount, onViewProfile }) {
  const expired  = isTermExpired(member);
  const isViceMayor = /vice\s*mayor/i.test(member.role || '');
  const avatarFb = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'M')}&background=2563eb&color=fff&bold=true&size=128`;

  return (
    <div
      className={`member-hero-card bg-white rounded-3xl overflow-hidden shadow-sm border cursor-pointer
        ${isViceMayor ? 'border-amber-200 ring-2 ring-amber-100' : 'border-slate-100'}`}
      onClick={() => onViewProfile(member)}
    >
      {/* Photo */}
      <div className="relative flex h-52 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <img
          src={member.image || avatarFb}
          alt={member.name}
          className="h-36 w-36 rounded-[2rem] object-cover shadow-xl ring-4 ring-white"
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
        {member.lguLabel || member.barangayLabel ? (
          <p className="mt-2 text-[11px] font-semibold text-slate-500">
            {[member.lguLabel, member.barangayLabel].filter(Boolean).join(' · ')}
          </p>
        ) : null}

        {(member.committees || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {member.committees.slice(0, 2).map(c => (
              <span key={c} className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full capitalize">{c}</span>
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate-400 mt-3">
          {relatedCount} document{relatedCount !== 1 ? 's' : ''}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600">
          <i className="fas fa-arrow-up-right-from-square text-[10px]" />
          View Profile
        </div>
      </div>
    </div>
  );
}
