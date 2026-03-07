import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSurface, AdminTabHeader } from './AdminUi';
import { buildFeatureRequestKey, groupFeatureRequests, normalizeRequestText } from '../../utils/featureRequests';

const REQUEST_TYPE_META = {
  feature: {
    label: 'Feature Request',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'fa-wand-magic-sparkles',
  },
  bug: {
    label: 'Bug Report',
    badge: 'bg-rose-100 text-rose-700',
    icon: 'fa-bug',
  },
};

function formatDate(value) {
  if (!value) return 'Just now';
  const dateValue = typeof value?.toDate === 'function'
    ? value.toDate()
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(dateValue);
}

export default function FeatureRequestsTab({ tenantId, user, showToast }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    requestType: 'feature',
    title: '',
    notes: '',
  });

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'featureRequests'), where('status', '==', 'pending')));
      setRequests(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    } catch (error) {
      console.error('[FeatureRequestsTab.loadRequests]', error);
      showToast('Unable to load the shared request queue.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const groupedRequests = useMemo(
    () => groupFeatureRequests(requests),
    [requests],
  );

  const visibleRequests = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return groupedRequests;

    return groupedRequests.filter((entry) => {
      const haystack = [
        entry.title,
        entry.requestType,
        entry.notes,
        ...entry.supporterIds,
      ].map((value) => normalizeRequestText(value, '').toLowerCase()).join(' ');
      return haystack.includes(term);
    });
  }, [filter, groupedRequests]);

  const submitRequest = async (payload, options = {}) => {
    if (!tenantId) {
      showToast('LGU context is missing.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'featureRequests'), {
        requestKey: payload.requestKey,
        requestType: payload.requestType,
        title: payload.title,
        feature: payload.title,
        notes: payload.notes,
        lguId: tenantId,
        requestedBy: user?.uid || null,
        requestedByEmail: user?.email || '',
        status: 'pending',
        sourceRequestId: options.sourceRequestId || null,
        isVote: Boolean(options.isVote),
        createdAt: serverTimestamp(),
      });

      showToast(options.isVote ? 'Support vote submitted for platform review.' : 'Request submitted for platform review.', 'success');
      setForm({ requestType: 'feature', title: '', notes: '' });
      await loadRequests();
    } catch (error) {
      console.error('[FeatureRequestsTab.submitRequest]', error);
      showToast('Unable to submit this request right now.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRequest = async (event) => {
    event.preventDefault();

    const title = form.title.trim();
    const requestType = form.requestType;
    const notes = form.notes.trim();
    if (!title) {
      showToast('Request title is required.', 'error');
      return;
    }

    const requestKey = buildFeatureRequestKey(requestType, title);
    const existingGroup = groupedRequests.find((entry) => entry.requestKey === requestKey);

    if (existingGroup?.supporterIds.includes(tenantId)) {
      showToast('Your LGU already has an active request or vote for this item.', 'error');
      return;
    }

    await submitRequest(
      {
        requestKey,
        requestType,
        title,
        notes,
      },
      existingGroup
        ? { isVote: true, sourceRequestId: existingGroup.entries[0]?.id || null }
        : {},
    );
  };

  const supportRequest = async (group) => {
    if (group.supporterIds.includes(tenantId)) {
      showToast('Your LGU already supports this request.', 'error');
      return;
    }

    await submitRequest(
      {
        requestKey: group.requestKey,
        requestType: group.requestType,
        title: group.title,
        notes: `Support vote from ${tenantId}`,
      },
      { isVote: true, sourceRequestId: group.entries[0]?.id || null },
    );
  };

  return (
    <div className="space-y-6">
      <AdminSurface>
        <AdminTabHeader
          icon="fa-bell"
          title="Feature Requests & Bug Reports"
          description="Submit a new request or support an existing one to help the platform prioritize work across LGUs."
          badge={`${groupedRequests.length} shared item${groupedRequests.length === 1 ? '' : 's'} in queue`}
        />

        <form onSubmit={handleCreateRequest} className="grid gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Type</label>
            <select
              value={form.requestType}
              onChange={(event) => setForm((current) => ({ ...current, requestType: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="feature">Feature request</option>
              <option value="bug">Bug report</option>
            </select>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Title</label>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g., Document approval workflow by committee"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`} />
                Submit Request
              </button>
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Notes</label>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
                placeholder="Describe the problem, expected behavior, or why this matters to your LGU."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>
        </form>
      </AdminSurface>

      <AdminSurface>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="text-lg font-black text-slate-900">Shared Request Queue</h4>
            <p className="mt-1 text-sm text-slate-500">Support requests already raised by other LGUs instead of duplicating them.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search feature, bug, or LGU…"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 lg:w-72"
            />
            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'} text-xs`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {visibleRequests.map((group) => {
            const meta = REQUEST_TYPE_META[group.requestType] || REQUEST_TYPE_META.feature;
            const supportedByCurrentLgu = group.supporterIds.includes(tenantId);

            return (
              <article key={group.requestKey} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${meta.badge}`}>
                        <i className={`fas ${meta.icon} text-[10px]`} />
                        {meta.label}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-500">
                        {group.supportCount} LGU support{group.supportCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <h5 className="mt-3 text-lg font-black text-slate-900">{group.title}</h5>
                    <p className="mt-2 max-w-3xl text-sm text-slate-600">{group.notes || 'No additional notes provided yet.'}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Latest activity: {formatDate(group.latestAt)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => supportRequest(group)}
                      disabled={submitting || supportedByCurrentLgu}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      <i className={`fas ${supportedByCurrentLgu ? 'fa-check-circle' : 'fa-thumbs-up'} text-xs`} />
                      {supportedByCurrentLgu ? 'Already Supported' : 'Support This'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {!loading && !visibleRequests.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <i className="fas fa-inbox text-3xl text-slate-300" />
              <h5 className="mt-4 text-base font-black text-slate-900">No shared requests found</h5>
              <p className="mt-2 text-sm text-slate-500">Be the first LGU to file a request or bug report.</p>
            </div>
          ) : null}
        </div>
      </AdminSurface>
    </div>
  );
}
