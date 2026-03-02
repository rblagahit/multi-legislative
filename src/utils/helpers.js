// ─── String / HTML utilities ──────────────────────────────────────────────────

export const escapeHtml = (str = '') =>
  str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const parseTags = (raw = '') =>
  raw.split(',').map(s => s.trim()).filter(Boolean);

// ─── Name / text normalization ────────────────────────────────────────────────

export const normalizeText = (val = '') => val.toLowerCase().trim();

// Strips "Hon." prefix for matching (e.g. "Hon. Santos" → "santos")
export const normalizeName = (name = '') =>
  normalizeText(name.replace(/^hon\.?\s+/i, ''));

export const normalizeTag = (tag = '') => normalizeText(tag);

// ─── Date utilities ───────────────────────────────────────────────────────────

export const formatDate = (dateStr = '') => {
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  return Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const isTermExpired = (member = {}) => {
  if (!member.termEnd) return false;
  const end = new Date(member.termEnd);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
};

// ─── Member–document relationship ────────────────────────────────────────────

/**
 * Returns all documents related to a member by:
 *   1. Primary authorship (authorId or name match)
 *   2. Co-sponsorship (name match)
 *   3. Committee assignment (tag match)
 */
export const getMemberRelatedDocuments = (member, allDocs) => {
  const memberNameNorm = normalizeName(member.name || '');
  const committeeTags  = (member.committees || []).map(normalizeTag).filter(Boolean);

  return allDocs.filter(docData => {
    const authorNameNorm  = normalizeName(docData.authorName || '');
    const coSponsorsNorm  = (docData.coSponsors || []).map(normalizeName);
    const docTags         = (docData.tags || []).map(normalizeTag);

    const isAuthor     = docData.authorId === member.id || (!!memberNameNorm && authorNameNorm === memberNameNorm);
    const isCoSponsor  = !!memberNameNorm && coSponsorsNorm.includes(memberNameNorm);
    const isCommittee  = committeeTags.length > 0 && committeeTags.some(c => docTags.includes(c));

    return isAuthor || isCoSponsor || isCommittee;
  });
};
