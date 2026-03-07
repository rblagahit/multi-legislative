import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { groupFeatureRequests, normalizeRequestText } from '../../utils/featureRequests';

function formatDate(value) {
  if (!value) return 'Not set';
  const dateValue = typeof value?.toDate === 'function'
    ? value.toDate()
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : typeof value === 'number'
        ? new Date(value)
        : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(dateValue);
}

const REQUEST_TONE = {
  feature: 'bg-blue-100 text-blue-700',
  bug: 'bg-rose-100 text-rose-700',
};

export default function PlatformPriorityRequestsTab({ requests, registryMap, refreshPlatformData, showToast }) {
  const topPriorities = groupFeatureRequests(
    requests.filter((entry) => normalizeRequestText(entry.status, 'pending').toLowerCase() === 'pending'),
  ).slice(0, 10);

  const updateGroupStatus = async (group, status) => {
    try {
      await Promise.all(
        group.entries.map((entry) => updateDoc(doc(db, 'featureRequests', entry.id), {
          status,
          updatedAt: serverTimestamp(),
          [`${status}At`]: serverTimestamp(),
        })),
      );
      showToast(`Marked "${group.title}" as ${status}.`, 'success');
      await refreshPlatformData(false);
    } catch (error) {
      console.error('[PlatformPriorityRequestsTab.updateGroupStatus]', error);
      showToast(`Unable to mark this request as ${status}.`, 'error');
    }
  };

  if (!topPriorities.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <i className="fas fa-ranking-star text-3xl text-slate-300" />
        <h4 className="mt-4 text-base font-black text-slate-900">No high-priority requests yet</h4>
        <p className="mt-2 text-sm text-slate-500">As LGUs submit or support requests, the highest-voted issues will surface here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topPriorities.map((group, index) => (
        <article key={group.requestKey} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-slate-900 px-3 text-xs font-black text-white">
                  #{index + 1}
                </span>
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${REQUEST_TONE[group.requestType] || 'bg-slate-100 text-slate-700'}`}>
                  {group.requestType === 'bug' ? 'Bug Report' : 'Feature Request'}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-700">
                  {group.supportCount} LGU support{group.supportCount === 1 ? '' : 's'}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-900">{group.title}</h3>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{group.notes || 'No supporting notes attached.'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.supporterIds.map((lguId) => (
                  <span key={lguId} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-600">
                    {registryMap.get(lguId)?.displayName || registryMap.get(lguId)?.lguName || lguId}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Latest activity: {formatDate(group.latestAt)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => updateGroupStatus(group, 'approved')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition-all hover:bg-emerald-700"
              >
                <i className="fas fa-check text-xs" />
                Approve Group
              </button>
              <button
                type="button"
                onClick={() => updateGroupStatus(group, 'denied')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition-all hover:bg-rose-100"
              >
                <i className="fas fa-ban text-xs" />
                Deny Group
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
