import { slugifyFilePart } from './helpers';

export function normalizeRequestText(value = '', fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function buildFeatureRequestKey(requestType = 'feature', title = '') {
  return slugifyFilePart(`${normalizeRequestText(requestType, 'feature')}-${normalizeRequestText(title, 'request')}`) || 'feature-request';
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value?.seconds) return value.seconds * 1000;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function groupFeatureRequests(entries = []) {
  const groups = new Map();

  entries.forEach((entry) => {
    const requestType = normalizeRequestText(entry.requestType || entry.type, 'feature').toLowerCase();
    const title = normalizeRequestText(entry.title || entry.feature || entry.requestType, 'Feature request');
    const requestKey = normalizeRequestText(entry.requestKey, buildFeatureRequestKey(requestType, title));
    const nextTime = toMillis(entry.createdAt || entry.requestedAt);
    const existing = groups.get(requestKey);

    if (!existing) {
      groups.set(requestKey, {
        id: requestKey,
        requestKey,
        title,
        requestType,
        notes: normalizeRequestText(entry.notes, ''),
        entries: [entry],
        supporterIds: new Set(entry.lguId ? [entry.lguId] : []),
        latestAt: nextTime,
      });
      return;
    }

    existing.entries.push(entry);
    if (entry.lguId) existing.supporterIds.add(entry.lguId);
    if (!existing.notes && entry.notes) existing.notes = entry.notes;
    if (nextTime > existing.latestAt) existing.latestAt = nextTime;
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      supportCount: group.supporterIds.size,
      supporterIds: Array.from(group.supporterIds),
    }))
    .sort((a, b) => (
      (b.supportCount - a.supportCount)
      || (b.latestAt - a.latestAt)
      || a.title.localeCompare(b.title)
    ));
}
