import { StatBarChart } from './PlatformCharts';

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

function normalizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

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
      {safeTier}
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

export default function PlatformOverviewTab({
  featureRequestLimit,
  overviewLguSampleLimit,
  pendingRequestGroups,
  pendingUsers,
  registryMap,
  roleChartItems,
  tierChartItems,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <StatBarChart
        title="Tier Distribution"
        subtitle={`Distribution from the current ${overviewLguSampleLimit}-LGU overview sample.`}
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
        <p className="text-sm text-slate-500">Recent requests queued for platform review from the latest {featureRequestLimit} request records.</p>
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
  );
}
