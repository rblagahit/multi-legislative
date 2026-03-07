export function AdminTabHeader({ icon, title, description, badge, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg shadow-slate-900/10">
            <i className={`fas ${icon}`} />
          </div>
        ) : null}
        <div>
          <h3 className="text-xl font-black text-slate-900">{title}</h3>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {badge ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
            {badge}
          </div>
        ) : null}
        {action}
      </div>
    </div>
  );
}

export function AdminSurface({ children, className = '' }) {
  return (
    <div className={`rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm md:p-8 ${className}`.trim()}>
      {children}
    </div>
  );
}
