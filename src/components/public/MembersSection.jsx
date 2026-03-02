import { useState } from 'react';
import { normalizeText } from '../../utils/helpers';
import MemberCard from './MemberCard';

/**
 * Public members directory section.
 * TODO (Phase 3): Port member profile modal logic.
 */
export default function MembersSection({ members, documents }) {
  const [search, setSearch] = useState('');

  const activeMembers = members.filter(m => !m.isArchived);

  const filtered = activeMembers.filter(m => {
    if (!search) return true;
    const q = normalizeText(search);
    return (
      normalizeText(m.name).includes(q) ||
      normalizeText(m.role).includes(q) ||
      (m.committees || []).some(c => normalizeText(c).includes(q))
    );
  });

  return (
    <div id="members-section" className="bg-white py-16 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="text-xs font-black uppercase text-blue-600 tracking-widest mb-2 flex items-center gap-2">
            <i className="fas fa-users" /> Legislative Officers
          </p>
          <h2 className="text-3xl font-black text-slate-900">Meet the Members</h2>
        </div>

        <div className="mb-8">
          <div className="hero-search max-w-2xl">
            <div className="flex-1 flex items-center gap-3 pl-5">
              <i className="fas fa-search text-slate-400 text-base flex-shrink-0" />
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, role, or committee…"
                className="flex-1 py-4 bg-transparent outline-none font-medium text-slate-800 placeholder-slate-400 text-base min-w-0"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              relatedDocs={documents.filter(d => d.authorId === member.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
