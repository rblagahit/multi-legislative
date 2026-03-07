export function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function bucketKey(date, granularity) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  if (granularity === 'year') return String(date.getFullYear());
  if (granularity === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return date.toISOString().slice(0, 10);
}

export function groupAnalyticsRows(rows, windowDays, granularity) {
  const cutoffMs = Date.now() - (Number(windowDays) * 24 * 60 * 60 * 1000);
  const grouped = new Map();

  rows.forEach((row) => {
    const rowDate = toDate(row.date || row.updatedAt || row.createdAt || row.id);
    if (!rowDate || rowDate.getTime() < cutoffMs) return;

    const key = bucketKey(rowDate, granularity);
    if (!key) return;

    const current = grouped.get(key) || {
      visits: 0,
      searches: 0,
      views: 0,
      date: rowDate,
    };

    current.visits += Number(row.visits || row.sessions || row.pageViews || 0);
    current.searches += Number(row.searches || row.totalSearches || 0);
    current.views += Number(row.documentViews || row.views || row.docOpens || 0);
    current.date = rowDate;
    grouped.set(key, current);
  });

  return [...grouped.entries()]
    .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
    .map(([label, value]) => ({ label, ...value }));
}
