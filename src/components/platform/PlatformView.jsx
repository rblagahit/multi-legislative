import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import PanelTabNav from '../layout/PanelTabNav';
import PlatformAppAnalyticsTab from './PlatformAppAnalyticsTab';
import PlatformBarangaysTab from './PlatformBarangaysTab';
import PlatformLgusTab from './PlatformLgusTab';
import PlatformMembersTab from './PlatformMembersTab';
import { StatBarChart } from './PlatformCharts';
import PlatformPriorityRequestsTab from './PlatformPriorityRequestsTab';
import PlatformPremiumOpsTab from './PlatformPremiumOpsTab';
import PlatformSettingsTab from './PlatformSettingsTab';
import PlatformStickyProfilesTab from './PlatformStickyProfilesTab';
import PlatformSubscriptionsTab from './PlatformSubscriptionsTab';
import PlatformUsersTab from './PlatformUsersTab';
import { buildFeatureRequestKey, groupFeatureRequests } from '../../utils/featureRequests';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'fa-chart-line', group: 'operations' },
  { id: 'requests', label: 'Requests', icon: 'fa-bell', group: 'operations' },
  { id: 'priorities', label: 'Top Priorities', icon: 'fa-ranking-star', group: 'operations' },
  { id: 'app-analytics', label: 'App Analytics', icon: 'fa-magnifying-glass-chart', group: 'operations' },
  { id: 'lgus', label: 'LGUs', icon: 'fa-city', group: 'directory' },
  { id: 'members', label: 'Members', icon: 'fa-user-tie', group: 'directory' },
  { id: 'barangays', label: 'Barangays', icon: 'fa-map-marker-alt', group: 'directory' },
  { id: 'users', label: 'Users', icon: 'fa-users-cog', group: 'directory' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'fa-tags', group: 'commercial' },
  { id: 'sticky-profiles', label: 'Sticky Profiles', icon: 'fa-thumbtack', group: 'commercial' },
  { id: 'premium-ops', label: 'Premium Ops', icon: 'fa-gem', group: 'commercial' },
  { id: 'settings', label: 'Settings', icon: 'fa-sliders-h', group: 'configuration' },
];

const TAB_GROUPS = [
  { id: 'operations', label: 'Operations', icon: 'fa-wave-square', description: 'Overview, queue visibility, and app-level signals.' },
  { id: 'directory', label: 'Directory', icon: 'fa-building-shield', description: 'Tenant, barangay, and user directories for the platform.' },
  { id: 'commercial', label: 'Premium & Billing', icon: 'fa-coins', description: 'Subscriptions, sticky profiles, and premium workflows.' },
  { id: 'configuration', label: 'Configuration', icon: 'fa-sliders', description: 'Global settings that shape the shared platform shell.' },
];

const TIER_LABELS = {
  starter: 'Starter',
  standard: 'Standard',
  premium: 'Premium',
};

const TIER_BADGES = {
  starter: 'bg-slate-100 text-slate-700',
  standard: 'bg-blue-100 text-blue-700',
  premium: 'bg-purple-100 text-purple-700',
};

const ROLE_BADGES = {
  superadmin: 'bg-amber-100 text-amber-700',
  admin: 'bg-blue-100 text-blue-700',
  editor: 'bg-emerald-100 text-emerald-700',
  barangay_portal: 'bg-violet-100 text-violet-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const DEFAULT_PLATFORM_STATE = {
  loading: false,
  users: [],
  lguRegistry: [],
  featureRequests: [],
  setupSettings: {},
  loaded: {
    users: false,
    lguRegistry: false,
    featureRequests: false,
    setupSettings: false,
  },
};

const TAB_RESOURCE_MAP = {
  overview: ['users', 'lguRegistry', 'featureRequests'],
  requests: ['featureRequests', 'lguRegistry'],
  priorities: ['featureRequests', 'lguRegistry'],
  'app-analytics': [],
  lgus: ['lguRegistry'],
  members: [],
  barangays: [],
  users: ['users', 'lguRegistry'],
  subscriptions: ['lguRegistry', 'setupSettings'],
  'sticky-profiles': [],
  'premium-ops': [],
  settings: ['setupSettings'],
};

const FEATURE_REQUEST_LIMIT = 200;

function formatDate(value) {
  if (!value) return 'Not set';
  const dateValue = typeof value?.toDate === 'function'
    ? value.toDate()
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : new Date(value);

  if (Number.isNaN(dateValue.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateValue);
}

function normalizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function buildLguLabel(id, record = {}) {
  return normalizeText(
    record.displayName
      || record.lguName
      || record.orgName
      || record.municipality
      || record.name,
    id || 'Unassigned',
  );
}

function isPendingUser(user = {}) {
  const role = normalizeText(user.role, '').toLowerCase();
  const status = normalizeText(user.status, '').toLowerCase();
  return role === 'pending' || status === 'pending' || user.approved === false;
}

function cardTone(tone = 'slate') {
  const tones = {
    blue: 'from-blue-600 to-blue-700 text-blue-700 bg-blue-50 border-blue-100',
    emerald: 'from-emerald-600 to-emerald-700 text-emerald-700 bg-emerald-50 border-emerald-100',
    amber: 'from-amber-500 to-amber-600 text-amber-700 bg-amber-50 border-amber-100',
    violet: 'from-violet-600 to-violet-700 text-violet-700 bg-violet-50 border-violet-100',
  };
  return tones[tone] || 'from-slate-700 to-slate-800 text-slate-700 bg-slate-50 border-slate-100';
}

function StatCard({ icon, label, value, helper, tone }) {
  const toneClasses = cardTone(tone);
  const [gradientFrom, gradientTo, textTone, bgTone, borderTone] = toneClasses.split(' ');

  return (
    <div className={`rounded-3xl border ${borderTone} ${bgTone} p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
          {helper ? <p className={`mt-2 text-sm font-semibold ${textTone}`}>{helper}</p> : null}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white shadow-lg`}>
          <i className={`fas ${icon}`} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <i className={`fas ${icon} text-3xl text-slate-300`} />
      <h4 className="mt-4 text-base font-black text-slate-900">{title}</h4>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </div>
  );
}

function TierBadge({ tier }) {
  const safeTier = normalizeText(tier, 'starter').toLowerCase();
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${TIER_BADGES[safeTier] || TIER_BADGES.starter}`}>
      {TIER_LABELS[safeTier] || safeTier}
    </span>
  );
}

function RoleBadge({ role }) {
  const safeRole = normalizeText(role, 'unknown').toLowerCase();
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${ROLE_BADGES[safeRole] || 'bg-slate-100 text-slate-700'}`}>
      {safeRole.replaceAll('_', ' ')}
    </span>
  );
}

export default function PlatformView({ user, navigateTo, showToast }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeGroup, setActiveGroup] = useState('operations');
  const [search, setSearch] = useState({ requests: '' });
  const [platformState, setPlatformState] = useState(DEFAULT_PLATFORM_STATE);

  const registryMap = useMemo(
    () => new Map(platformState.lguRegistry.map(entry => [entry.id, entry])),
    [platformState.lguRegistry],
  );

  const pendingUsers = useMemo(
    () => platformState.users.filter(isPendingUser),
    [platformState.users],
  );

  const pendingRequests = useMemo(
    () => platformState.featureRequests.filter(request => normalizeText(request.status, 'pending').toLowerCase() === 'pending'),
    [platformState.featureRequests],
  );
  const pendingRequestGroups = useMemo(
    () => groupFeatureRequests(pendingRequests),
    [pendingRequests],
  );
  const requestGroupMap = useMemo(
    () => new Map(pendingRequestGroups.map((group) => [group.requestKey, group])),
    [pendingRequestGroups],
  );
  const visibleGroups = useMemo(
    () => TAB_GROUPS.filter(group => TABS.some(tab => tab.group === group.id)),
    [],
  );
  const visibleTabsForGroup = useMemo(
    () => TABS.filter(tab => tab.group === activeGroup),
    [activeGroup],
  );

  useEffect(() => {
    if (!visibleGroups.some(group => group.id === activeGroup)) {
      setActiveGroup(visibleGroups[0]?.id || 'operations');
    }
  }, [activeGroup, visibleGroups]);

  useEffect(() => {
    const currentTab = TABS.find(tab => tab.id === activeTab);
    if (currentTab?.group === activeGroup) return;

    const nextTab = TABS.find(tab => tab.group === activeGroup);
    if (nextTab) setActiveTab(nextTab.id);
  }, [activeGroup, activeTab]);

  const activeTabResources = useMemo(
    () => TAB_RESOURCE_MAP[activeTab] || [],
    [activeTab],
  );

  const loadPlatformResources = async (resources, options = {}) => {
    const { force = false, withToast = false } = options;
    const requested = [...new Set(resources || [])];
    const pendingResources = requested.filter((resource) => force || !platformState.loaded[resource]);

    if (!pendingResources.length) {
      if (withToast) showToast('Platform data refreshed.', 'success');
      return;
    }

    setPlatformState((current) => ({ ...current, loading: true }));

    try {
      const results = await Promise.all(pendingResources.map(async (resource) => {
        switch (resource) {
          case 'users': {
            const snap = await getDocs(collection(db, 'users'));
            return [resource, snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))];
          }
          case 'lguRegistry': {
            const snap = await getDocs(collection(db, 'lguRegistry'));
            return [resource, snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))];
          }
          case 'featureRequests': {
            const snap = await getDocs(
              query(
                collection(db, 'featureRequests'),
                orderBy('createdAt', 'desc'),
                limit(FEATURE_REQUEST_LIMIT),
              ),
            );
            return [resource, snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))];
          }
          case 'setupSettings': {
            const snap = await getDoc(doc(db, 'setup', 'bootstrapped'));
            return [resource, snap.exists() ? (snap.data() || {}) : {}];
          }
          default:
            return [resource, null];
        }
      }));

      setPlatformState((current) => {
        const nextState = {
          ...current,
          loading: false,
          loaded: { ...current.loaded },
        };

        results.forEach(([resource, value]) => {
          nextState.loaded[resource] = true;
          if (resource === 'setupSettings') {
            nextState.setupSettings = value || {};
          } else {
            nextState[resource] = value || [];
          }
        });

        return nextState;
      });

      if (withToast) showToast('Platform data refreshed.', 'success');
    } catch (error) {
      console.error('[PlatformView.loadPlatformResources]', error);
      setPlatformState((current) => ({ ...current, loading: false }));
      showToast('Unable to load platform data.', 'error');
    }
  };

  useEffect(() => {
    loadPlatformResources(activeTabResources);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const tierCounts = useMemo(() => (
    platformState.lguRegistry.reduce((acc, entry) => {
      const tier = normalizeText(entry.tier, 'starter').toLowerCase();
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, { starter: 0, standard: 0, premium: 0 })
  ), [platformState.lguRegistry]);

  const expiringSoonCount = useMemo(() => (
    platformState.lguRegistry.filter(entry => {
      const expiry = entry.subscriptionExpiry?.seconds
        ? entry.subscriptionExpiry.seconds * 1000
        : null;
      if (!expiry) return false;
      const diffDays = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length
  ), [platformState.lguRegistry]);

  const roleChartItems = useMemo(() => {
    const roleColors = {
      superadmin: '#f59e0b',
      admin: '#2563eb',
      editor: '#10b981',
      barangay_portal: '#8b5cf6',
      pending: '#fb923c',
    };
    const roleCounts = platformState.users.reduce((acc, entry) => {
      const role = normalizeText(entry.role || entry.status, 'pending').toLowerCase();
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([role, value]) => ({
        label: role.replaceAll('_', ' '),
        shortLabel: role === 'barangay_portal' ? 'barangay' : role,
        value,
        color: roleColors[role] || '#64748b',
      }));
  }, [platformState.users]);

  const tierChartItems = useMemo(() => ([
    { label: 'Starter', shortLabel: 'starter', value: tierCounts.starter || 0, color: '#94a3b8' },
    { label: 'Standard', shortLabel: 'standard', value: tierCounts.standard || 0, color: '#2563eb' },
    { label: 'Premium', shortLabel: 'premium', value: tierCounts.premium || 0, color: '#8b5cf6' },
  ]), [tierCounts]);

  const filteredRequests = useMemo(() => {
    const term = search.requests.trim().toLowerCase();
    const entries = [...pendingRequests].sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    if (!term) return entries;
    return entries.filter(entry => {
      const haystack = [
        entry.lguId,
        entry.requestType,
        entry.feature,
        entry.requestedByEmail,
        entry.notes,
      ].map(value => normalizeText(value, '').toLowerCase()).join(' ');
      return haystack.includes(term);
    });
  }, [pendingRequests, search.requests]);

  const updateFeatureRequestStatus = async (requestIds, status) => {
    try {
      await Promise.all(
        requestIds.map((requestId) => updateDoc(doc(db, 'featureRequests', requestId), {
          status,
          updatedAt: serverTimestamp(),
          [`${status}At`]: serverTimestamp(),
        })),
      );
      showToast(`Request${requestIds.length === 1 ? '' : 's'} marked as ${status}.`, 'success');
      await refreshPlatformData(false);
    } catch (error) {
      console.error('[PlatformView.updateFeatureRequestStatus]', error);
      showToast(`Unable to mark request${requestIds.length === 1 ? '' : 's'} as ${status}.`, 'error');
    }
  };

  const refreshPlatformData = async (withToast = true) => {
    await loadPlatformResources(activeTabResources, { force: true, withToast });
  };

  const isActiveTabReady = activeTabResources.every((resource) => platformState.loaded[resource]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigateTo('public')}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-800"
          >
            <i className="fas fa-arrow-left text-sm" />
          </button>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Platform Administration</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Superadmin Access Panel</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Review global tenants, users, and pending requests from the React app again.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Signed in as</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{normalizeText(user?.email, 'Superadmin')}</p>
          </div>
          <button
            type="button"
            onClick={refreshPlatformData}
            disabled={platformState.loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <i className={`fas ${platformState.loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'} text-xs`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="fa-city"
          label="Registered LGUs"
          value={platformState.loaded.lguRegistry ? platformState.lguRegistry.length : '...'}
          helper={platformState.loaded.lguRegistry ? `${tierCounts.premium} premium / ${tierCounts.standard} standard` : 'Load LGU data to view totals'}
          tone="blue"
        />
        <StatCard
          icon="fa-users"
          label="Total Users"
          value={platformState.loaded.users ? platformState.users.length : '...'}
          helper={platformState.loaded.users ? `${pendingUsers.length} pending approval` : 'Load user data to view totals'}
          tone="emerald"
        />
        <StatCard
          icon="fa-bell"
          label="Feature Requests"
          value={platformState.loaded.featureRequests ? pendingRequests.length : '...'}
          helper={
            platformState.loaded.featureRequests
              ? `Pending review from the latest ${FEATURE_REQUEST_LIMIT} request records`
              : 'Load request data to view totals'
          }
          tone="amber"
        />
        <StatCard
          icon="fa-hourglass-half"
          label="Expiring Soon"
          value={platformState.loaded.lguRegistry ? expiringSoonCount : '...'}
          helper={platformState.loaded.lguRegistry ? 'Subscriptions due within 30 days' : 'Load LGU data to view totals'}
          tone="violet"
        />
      </div>

      <PanelTabNav
        title="Platform Section"
        description="Move across platform groups first, then drill into the child tabs for that area."
        groups={visibleGroups}
        tabs={visibleTabsForGroup}
        allTabs={TABS}
        activeGroup={activeGroup}
        activeTab={activeTab}
        onGroupChange={setActiveGroup}
        onTabChange={setActiveTab}
      />

      <div className="mt-8">
        {platformState.loading && !isActiveTabReady ? (
          <div className="rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
            <i className="fas fa-spinner fa-spin text-3xl text-slate-400" />
            <p className="mt-4 text-sm font-semibold text-slate-500">Loading platform data…</p>
          </div>
        ) : null}

        {isActiveTabReady && activeTab === 'overview' ? (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <StatBarChart
              title="Tier Distribution"
              subtitle="Current tenant mix from `lguRegistry`."
              items={tierChartItems}
            />

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-900">Pending Approvals</h3>
              <p className="text-sm text-slate-500">Accounts still waiting on review.</p>
              <div className="mt-5 space-y-3">
                {pendingUsers.slice(0, 6).map(entry => (
                  <div key={entry.id} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{normalizeText(entry.name, entry.email || entry.id)}</p>
                        <p className="text-sm text-slate-500">{normalizeText(entry.email, 'No email')}</p>
                      </div>
                      <RoleBadge role={entry.role || entry.status || 'pending'} />
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {buildLguLabel(entry.lguId, registryMap.get(entry.lguId))}
                    </p>
                  </div>
                ))}
                {!pendingUsers.length ? (
                  <EmptyState
                    icon="fa-circle-check"
                    title="No pending users"
                    body="All visible user records are already assigned or approved."
                  />
                ) : null}
              </div>
            </div>

            <div className="xl:col-span-2">
              <StatBarChart
                title="Users by Role"
                subtitle="Current platform account distribution across visible roles."
                items={roleChartItems}
              />
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
              <h3 className="text-lg font-black text-slate-900">Pending Feature Requests</h3>
              <p className="text-sm text-slate-500">Recent requests queued for platform review from the latest {FEATURE_REQUEST_LIMIT} request records.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pendingRequestGroups.slice(0, 6).map(group => (
                  <div key={group.requestKey} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <TierBadge tier={registryMap.get(group.supporterIds[0])?.tier || 'starter'} />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {formatDate(group.latestAt)}
                      </span>
                    </div>
                    <h4 className="mt-3 font-black text-slate-900">{normalizeText(group.title, 'Feature request')}</h4>
                    <p className="mt-2 text-sm text-slate-500">{group.supportCount} LGU support{group.supportCount === 1 ? '' : 's'}</p>
                    <p className="mt-3 text-sm text-slate-600">{normalizeText(group.notes, 'No notes attached.')}</p>
                  </div>
                ))}
                {!pendingRequestGroups.length ? (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EmptyState
                      icon="fa-inbox"
                      title="No pending requests"
                      body="There are no outstanding feature requests in the queue."
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {isActiveTabReady && activeTab === 'lgus' ? (
          <PlatformLgusTab
            lguRegistry={platformState.lguRegistry}
            user={user}
            showToast={showToast}
            refreshPlatformData={refreshPlatformData}
          />
        ) : null}

        {!platformState.loading && activeTab === 'members' ? (
          <PlatformMembersTab showToast={showToast} />
        ) : null}

        {!platformState.loading && activeTab === 'barangays' ? (
          <PlatformBarangaysTab showToast={showToast} />
        ) : null}

        {isActiveTabReady && activeTab === 'users' ? (
          <PlatformUsersTab
            users={platformState.users}
            registryMap={registryMap}
            showToast={showToast}
            refreshPlatformData={refreshPlatformData}
          />
        ) : null}

        {isActiveTabReady && activeTab === 'subscriptions' ? (
          <PlatformSubscriptionsTab
            lguRegistry={platformState.lguRegistry}
            setupSettings={platformState.setupSettings}
            refreshPlatformData={refreshPlatformData}
            showToast={showToast}
            user={user}
          />
        ) : null}

        {!platformState.loading && activeTab === 'app-analytics' ? (
          <PlatformAppAnalyticsTab showToast={showToast} />
        ) : null}

        {isActiveTabReady && activeTab === 'priorities' ? (
          <PlatformPriorityRequestsTab
            requests={platformState.featureRequests}
            registryMap={registryMap}
            refreshPlatformData={refreshPlatformData}
            showToast={showToast}
          />
        ) : null}

        {!platformState.loading && activeTab === 'sticky-profiles' ? (
          <PlatformStickyProfilesTab showToast={showToast} />
        ) : null}

        {!platformState.loading && activeTab === 'premium-ops' ? (
          <PlatformPremiumOpsTab showToast={showToast} />
        ) : null}

        {isActiveTabReady && activeTab === 'settings' ? (
          <PlatformSettingsTab setupSettings={platformState.setupSettings} showToast={showToast} user={user} />
        ) : null}

        {isActiveTabReady && activeTab === 'requests' ? (
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm text-slate-500">Showing pending requests from the latest {FEATURE_REQUEST_LIMIT} request records.</p>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <input
                  type="text"
                  value={search.requests}
                  onChange={event => setSearch(current => ({ ...current, requests: event.target.value }))}
                  placeholder="Search request, LGU, or requester…"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  {filteredRequests.length} pending request{filteredRequests.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            {filteredRequests.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredRequests.map(entry => (
                  <article key={entry.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-black text-slate-900">
                        {normalizeText(entry.feature || entry.requestType, 'Feature request')}
                      </h3>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-700">
                        Pending
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{buildLguLabel(entry.lguId, registryMap.get(entry.lguId))}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {(requestGroupMap.get(normalizeText(entry.requestKey, buildFeatureRequestKey(entry.requestType, entry.title || entry.feature || entry.requestType)))?.supportCount) || 1}
                      {' '}LGU support
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Requested By</p>
                        <p className="mt-2 font-semibold text-slate-900">{normalizeText(entry.requestedByEmail, 'Unknown')}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Created</p>
                        <p className="mt-2 font-semibold text-slate-900">{formatDate(entry.createdAt)}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Notes</p>
                      <p className="mt-2 text-sm text-slate-600">{normalizeText(entry.notes, 'No notes attached.')}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateFeatureRequestStatus([entry.id], 'approved')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition-all hover:bg-emerald-700"
                      >
                        <i className="fas fa-check text-xs" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFeatureRequestStatus([entry.id], 'denied')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition-all hover:bg-rose-100"
                      >
                        <i className="fas fa-ban text-xs" />
                        Deny
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="fa-bell-slash"
                title="No pending requests"
                body="The feature request queue is currently clear."
              />
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
