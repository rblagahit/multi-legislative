import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';

function toDate(value) {
  if (!value) return null;
  return typeof value?.toDate === 'function'
    ? value.toDate()
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : new Date(value);
}

function formatDate(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function Section({ title, icon, rows, emptyMessage }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <i className={`fas ${icon}`} />
        </div>
        <div>
          <h4 className="font-black text-slate-900">{title}</h4>
          <p className="text-sm text-slate-500">{rows.length} item{rows.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="space-y-3">
        {!rows.length ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">{emptyMessage}</p>
        ) : rows.map((row) => (
          <div key={row.id} className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="font-black text-slate-900">{row.memberName || 'Member request'}</p>
            <p className="mt-1 text-sm text-slate-500">{row.lguId || 'No LGU'} · {row.requesterEmail || 'No requester email'}</p>
            <p className="mt-2 text-sm text-slate-500">Transaction: {row.transactionNumber || 'Not set'}</p>
            {row.stickyExpiresAt ? <p className="mt-2 text-sm font-semibold text-amber-700">Expires {formatDate(row.stickyExpiresAt)}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlatformPremiumOpsTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [windowDays, setWindowDays] = useState('30');
  const [loading, setLoading] = useState(true);

  const loadRows = useCallback(async (withToast = false) => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'stickyProfileRequests'), orderBy('createdAt', 'desc'), limit(300)),
      );
      setRows(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      if (withToast) {
        showToast('Premium operations refreshed.', 'success');
      }
    } catch (error) {
      console.error('[PlatformPremiumOpsTab]', error);
      showToast('Unable to load premium operations.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!term) return true;
      const haystack = [row.memberName, row.lguId, row.transactionNumber, row.requesterEmail].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, search]);

  const now = Date.now();
  const windowMs = Number(windowDays) * 24 * 60 * 60 * 1000;

  const pendingRows = filteredRows.filter((row) => (row.status || 'pending') === 'pending');
  const activeRows = filteredRows.filter((row) => row.status === 'approved' && row.stickyActive !== false);
  const expiringRows = activeRows.filter((row) => {
    const expiry = toDate(row.stickyExpiresAt);
    return expiry && expiry.getTime() >= now && expiry.getTime() <= now + windowMs;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search member, LGU, or transaction..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
        />
        <select
          value={windowDays}
          onChange={(event) => setWindowDays(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
        >
          <option value="7">Expiring window: 7 days</option>
          <option value="15">Expiring window: 15 days</option>
          <option value="30">Expiring window: 30 days</option>
          <option value="60">Expiring window: 60 days</option>
        </select>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => loadRows(true)}
          disabled={loading}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'} mr-2 text-xs`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Pending Payments" icon="fa-hourglass-half" rows={pendingRows.slice(0, 20)} emptyMessage="No pending sticky requests." />
        <Section title="Active Stickies" icon="fa-thumbtack" rows={activeRows.slice(0, 20)} emptyMessage="No active sticky profiles." />
        <Section title={`Expiring Soon (${windowDays} days)`} icon="fa-clock" rows={expiringRows.slice(0, 20)} emptyMessage="No active sticky profiles expiring soon." />
      </div>
    </div>
  );
}
