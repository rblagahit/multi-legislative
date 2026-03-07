import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, query, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { syncPublicMemberIndex } from '../../hooks/useMembers';

function asDate(value) {
  if (!value) return null;
  const dateValue = typeof value?.toDate === 'function'
    ? value.toDate()
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : new Date(value);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function formatDate(value) {
  const dateValue = asDate(value);
  if (!dateValue) return 'Not set';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateValue);
}

export default function PlatformStickyProfilesTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: 'pending' });
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'stickyProfileRequests'), limit(200)),
      (snapshot) => {
        setRows(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      },
      (error) => {
        console.error('[PlatformStickyProfilesTab]', error);
        showToast('Unable to load sticky profile requests.', 'error');
      },
    );

    return unsubscribe;
  }, [showToast]);

  const filteredRows = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return [...rows]
      .filter((row) => filters.status === 'all' || (row.status || 'pending') === filters.status)
      .filter((row) => {
        if (!term) return true;
        const haystack = [row.memberName, row.lguId, row.requesterEmail, row.transactionNumber]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [filters, rows]);

  const updateRequest = async (row, status) => {
    setSavingId(row.id);
    try {
      const stickyExpiresAt = new Date();
      stickyExpiresAt.setMonth(stickyExpiresAt.getMonth() + Number(row.months || 1));

      await setDoc(doc(db, 'stickyProfileRequests', row.id), {
        status,
        stickyActive: status === 'approved',
        stickyExpiresAt: status === 'approved' ? stickyExpiresAt : null,
        approvedAt: status === 'approved' ? serverTimestamp() : null,
        rejectedAt: status === 'rejected' ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (status === 'approved' && row.lguId && row.memberId) {
        const memberPayload = {
          stickyActive: true,
          stickyMonths: Number(row.months || 1),
          stickyRequestId: row.id,
          stickyApprovedAt: serverTimestamp(),
          stickyExpiresAt,
        };
        await setDoc(doc(db, 'lgus', row.lguId, 'members', row.memberId), memberPayload, { merge: true });
        await syncPublicMemberIndex(row.memberId, memberPayload, row.lguId);
      }

      showToast(`Sticky request ${status}.`, 'success');
    } catch (error) {
      console.error('[PlatformStickyProfilesTab.updateRequest]', error);
      showToast('Unable to update sticky request.', 'error');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_220px]">
        <input
          type="text"
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          placeholder="Search member, LGU, or transaction..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
        />
        <select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All statuses</option>
        </select>
      </div>

      <div className="space-y-4">
        {!filteredRows.length ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <i className="fas fa-thumbtack text-3xl text-slate-300" />
            <p className="mt-4 text-sm font-semibold text-slate-500">No sticky profile requests match the current filter.</p>
          </div>
        ) : filteredRows.map((row) => (
          <div key={row.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-slate-900">{row.memberName || 'Member request'}</p>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                    row.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : row.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {row.status || 'pending'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{row.lguId || 'No LGU'} · {row.requesterEmail || 'No requester email'}</p>
                <p className="mt-2 text-sm text-slate-500">Transaction: {row.transactionNumber || 'Not set'} · Duration: {row.months || 1} month(s)</p>
                <p className="mt-2 text-sm text-slate-500">Created: {formatDate(row.createdAt)}</p>
                {row.stickyExpiresAt ? <p className="mt-1 text-sm text-emerald-700">Sticky until {formatDate(row.stickyExpiresAt)}</p> : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {row.status !== 'approved' ? (
                  <button type="button" onClick={() => updateRequest(row, 'approved')} disabled={savingId === row.id}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70">
                    <i className={`fas ${savingId === row.id ? 'fa-spinner fa-spin' : 'fa-check'} mr-2 text-xs`} />
                    Approve
                  </button>
                ) : null}
                {row.status !== 'rejected' ? (
                  <button type="button" onClick={() => updateRequest(row, 'rejected')} disabled={savingId === row.id}
                    className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70">
                    <i className={`fas ${savingId === row.id ? 'fa-spinner fa-spin' : 'fa-ban'} mr-2 text-xs`} />
                    Reject
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
