import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { normalizeText, sanitizeLguId } from '../../utils/helpers';
import { AdminSurface, AdminTabHeader } from './AdminUi';

const USER_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'barangay_portal', label: 'Barangay Portal' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  role: 'editor',
  barangayId: '',
  barangayName: '',
};

function roleTone(role = '') {
  const tones = {
    admin: 'bg-blue-100 text-blue-700',
    editor: 'bg-emerald-100 text-emerald-700',
    barangay_portal: 'bg-violet-100 text-violet-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-rose-100 text-rose-700',
  };

  return tones[normalizeText(role)] || 'bg-slate-100 text-slate-700';
}

function sortByLabel(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export default function UsersTab({ tenantId, user, showToast }) {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState(EMPTY_FORM);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingUserId, setSavingUserId] = useState('');

  useEffect(() => {
    if (!tenantId) {
      setUsers([]);
      setInvites([]);
      setBarangays([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('lguId', '==', tenantId), limit(200)),
      (snapshot) => {
        setUsers(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('[UsersTab.users]', error);
        showToast('Unable to load LGU users.', 'error');
        setLoading(false);
      },
    );

    const unsubInvites = onSnapshot(
      query(collection(db, 'userInvites'), where('lguId', '==', tenantId), limit(100)),
      (snapshot) => {
        setInvites(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      },
      (error) => {
        console.error('[UsersTab.invites]', error);
      },
    );

    const unsubBarangays = onSnapshot(
      query(collection(db, 'lgus', tenantId, 'barangays'), limit(200)),
      (snapshot) => {
        setBarangays(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      },
      (error) => {
        console.error('[UsersTab.barangays]', error);
      },
    );

    return () => {
      unsubUsers();
      unsubInvites();
      unsubBarangays();
    };
  }, [showToast, tenantId]);

  const barangayOptions = useMemo(
    () => [...barangays].sort((a, b) => sortByLabel(a.name || a.code || a.id, b.name || b.code || b.id)),
    [barangays],
  );

  const sortedUsers = useMemo(() => (
    [...users].sort((a, b) => {
      const pendingDiff = Number(normalizeText(a.role) === 'pending') - Number(normalizeText(b.role) === 'pending');
      if (pendingDiff !== 0) return pendingDiff * -1;
      return sortByLabel(a.name || a.email || a.id, b.name || b.email || b.id);
    })
  ), [users]);

  const pendingInvites = useMemo(
    () => invites.filter((invite) => normalizeText(invite.status || 'pending') === 'pending')
      .sort((a, b) => sortByLabel(a.email || a.id, b.email || b.id)),
    [invites],
  );

  const setInviteValue = (key) => (event) => {
    const value = event.target.value;
    setInviteForm((current) => ({ ...current, [key]: value }));
  };

  const handleInvite = async () => {
    const emailKey = normalizeText(inviteForm.email);
    const role = normalizeText(inviteForm.role);

    if (!inviteForm.name || !emailKey) {
      showToast('Invite name and email are required.', 'error');
      return;
    }

    if (role === 'barangay_portal' && !inviteForm.barangayId) {
      showToast('Barangay Portal invites require a barangay assignment.', 'error');
      return;
    }

    setSavingInvite(true);
    try {
      await setDoc(doc(db, 'userInvites', emailKey), {
        email: emailKey,
        name: inviteForm.name.trim(),
        role,
        lguId: tenantId,
        barangayId: role === 'barangay_portal' ? sanitizeLguId(inviteForm.barangayId) : null,
        barangayName: role === 'barangay_portal' ? inviteForm.barangayName.trim() || null : null,
        status: 'pending',
        invitedAt: serverTimestamp(),
        invitedBy: user?.uid || null,
        invitedByEmail: user?.email || null,
      });
      setInviteForm(EMPTY_FORM);
      setShowInviteForm(false);
      showToast('Invite saved.', 'success');
    } catch (error) {
      console.error('[UsersTab.handleInvite]', error);
      showToast('Unable to save invite.', 'error');
    } finally {
      setSavingInvite(false);
    }
  };

  const handleUserChange = async (userId, updates) => {
    setSavingUserId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      showToast('User access updated.', 'success');
    } catch (error) {
      console.error('[UsersTab.handleUserChange]', error);
      showToast('Unable to update user access.', 'error');
    } finally {
      setSavingUserId('');
    }
  };

  const revokeInvite = async (email) => {
    if (!window.confirm(`Revoke invite for ${email}?`)) return;

    try {
      await deleteDoc(doc(db, 'userInvites', normalizeText(email)));
      showToast('Invite revoked.', 'success');
    } catch (error) {
      console.error('[UsersTab.revokeInvite]', error);
      showToast('Unable to revoke invite.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <AdminTabHeader
        icon="fa-users-cog"
        title="User Accounts"
        description="Review users, assign roles, and manage pending invites for this LGU."
        badge={`${sortedUsers.length} users`}
        action={(
          <button
            type="button"
            onClick={() => setShowInviteForm((current) => !current)}
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            <i className={`fas ${showInviteForm ? 'fa-times' : 'fa-user-plus'} text-xs`} />
            {showInviteForm ? 'Close Invite' : 'Invite User'}
          </button>
        )}
      />

      {showInviteForm ? (
        <AdminSurface>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Full Name</label>
              <input
                value={inviteForm.name}
                onChange={setInviteValue('name')}
                placeholder="Hon. Maria Santos"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Email Address</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={setInviteValue('email')}
                placeholder="user@lgu.gov.ph"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Role</label>
              <select
                value={inviteForm.role}
                onChange={setInviteValue('role')}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {USER_ROLE_OPTIONS.filter((option) => option.value !== 'pending' && option.value !== 'rejected').map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Barangay Assignment</label>
              <select
                value={inviteForm.barangayId}
                onChange={(event) => {
                  const selectedId = event.target.value;
                  const selectedBarangay = barangayOptions.find((entry) => (entry.code || entry.id) === selectedId);
                  setInviteForm((current) => ({
                    ...current,
                    barangayId: selectedId,
                    barangayName: selectedBarangay?.name || '',
                  }));
                }}
                disabled={inviteForm.role !== 'barangay_portal'}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select barangay…</option>
                {barangayOptions.map((entry) => (
                  <option key={entry.id} value={entry.code || entry.id}>{entry.name || entry.code || entry.id}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleInvite}
              disabled={savingInvite}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-all hover:from-blue-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <i className={`fas ${savingInvite ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`} />
              Save Invite
            </button>
            <button
              type="button"
              onClick={() => {
                setInviteForm(EMPTY_FORM);
                setShowInviteForm(false);
              }}
              className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </AdminSurface>
      ) : null}

      <AdminSurface>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Pending Invites</p>
            <p className="text-sm text-slate-500">Legacy invite flow backed by `userInvites`.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700">
            {pendingInvites.length} pending
          </span>
        </div>
        <div className="space-y-3">
          {!pendingInvites.length ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No pending invites for this LGU.</p>
          ) : pendingInvites.map((invite) => (
            <div key={invite.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="font-black text-slate-900">{invite.name || invite.email}</p>
                <p className="mt-1 text-sm text-slate-500">{invite.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                  <span className={`rounded-full px-2.5 py-1 font-black uppercase tracking-wider ${roleTone(invite.role)}`}>
                    {normalizeText(invite.role).replaceAll('_', ' ') || 'pending'}
                  </span>
                  {invite.barangayName ? <span>{invite.barangayName}</span> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revokeInvite(invite.email)}
                className="inline-flex items-center gap-2 self-start rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition-all hover:bg-rose-100"
              >
                <i className="fas fa-trash text-xs" />
                Revoke
              </button>
            </div>
          ))}
        </div>
      </AdminSurface>

      <AdminSurface>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Current Users</p>
            <p className="text-sm text-slate-500">Adjust access roles and barangay scope for active records.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
            {sortedUsers.length} user{sortedUsers.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <i className="fas fa-spinner fa-spin text-2xl" />
          </div>
        ) : (
          <div className="space-y-4">
            {!sortedUsers.length ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No users are assigned to this LGU yet.</p>
            ) : sortedUsers.map((entry) => {
              const selectedBarangayId = entry.barangayId || '';

              return (
                <div key={entry.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-900">{entry.name || entry.email || entry.id}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${roleTone(entry.role)}`}>
                          {normalizeText(entry.role).replaceAll('_', ' ') || 'unknown'}
                        </span>
                        {entry.id === user?.uid ? (
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-600">
                            You
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{entry.email || 'No email address'}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[180px_220px_auto]">
                      <select
                        defaultValue={entry.role || 'editor'}
                        id={`role-${entry.id}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        {USER_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <select
                        defaultValue={selectedBarangayId}
                        id={`barangay-${entry.id}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">No barangay scope</option>
                        {barangayOptions.map((barangay) => (
                          <option key={barangay.id} value={barangay.code || barangay.id}>
                            {barangay.name || barangay.code || barangay.id}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={savingUserId === entry.id}
                        onClick={() => {
                          const nextRole = document.getElementById(`role-${entry.id}`)?.value || entry.role || 'editor';
                          const nextBarangayId = sanitizeLguId(document.getElementById(`barangay-${entry.id}`)?.value || '') || null;
                          const nextBarangayName = nextBarangayId
                            ? barangayOptions.find((barangay) => (barangay.code || barangay.id) === nextBarangayId)?.name || null
                            : null;

                          if (nextRole === 'barangay_portal' && !nextBarangayId) {
                            showToast('Barangay Portal role requires a barangay assignment.', 'error');
                            return;
                          }

                          handleUserChange(entry.id, {
                            role: nextRole,
                            barangayId: nextRole === 'barangay_portal' ? nextBarangayId : null,
                            barangayName: nextRole === 'barangay_portal' ? nextBarangayName : null,
                          });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <i className={`fas ${savingUserId === entry.id ? 'fa-spinner fa-spin' : 'fa-save'} text-xs`} />
                        Save Access
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminSurface>
    </div>
  );
}
