function GroupButton({ group, active, onClick, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[210px] flex-1 items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-all ${
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
      }`}
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
        active ? 'bg-white/15 text-white' : 'bg-white text-slate-700 shadow-sm'
      }`}>
        <i className={`fas ${group.icon}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm font-black ${active ? 'text-white' : 'text-slate-900'}`}>{group.label}</p>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
            active ? 'bg-white/15 text-white' : 'bg-white text-slate-500'
          }`}>
            {count}
          </span>
        </div>
        {group.description ? (
          <p className={`mt-1 text-xs ${active ? 'text-slate-200' : 'text-slate-500'}`}>{group.description}</p>
        ) : null}
      </div>
    </button>
  );
}

function ChildTabButton({ tab, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
      }`}
    >
      <i className={`fas ${tab.icon} text-xs`} />
      <span>{tab.label}</span>
    </button>
  );
}

export default function PanelTabNav({
  title,
  description,
  groups,
  tabs,
  allTabs = tabs,
  activeGroup,
  activeTab,
  onGroupChange,
  onTabChange,
}) {
  const currentGroup = groups.find((group) => group.id === activeGroup) || groups[0];

  return (
    <div className="mb-8 rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((group) => (
          <GroupButton
            key={group.id}
            group={group}
            active={group.id === activeGroup}
            onClick={() => onGroupChange(group.id)}
            count={allTabs.filter((tab) => tab.group === group.id).length}
          />
        ))}
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              {title || currentGroup?.label || 'Section'}
            </p>
            <h3 className="mt-2 text-lg font-black text-slate-900">{currentGroup?.label}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {description || currentGroup?.description || 'Switch between child tabs below.'}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
            {tabs.length} tab{tabs.length === 1 ? '' : 's'} in this section
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <ChildTabButton
              key={tab.id}
              tab={tab}
              active={tab.id === activeTab}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
