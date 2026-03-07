function formatCompact(value) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: numericValue >= 1000 ? 1 : 0,
  }).format(numericValue);
}

export function StatBarChart({
  title,
  subtitle,
  items,
  height = 220,
}) {
  const safeItems = Array.isArray(items) ? items.filter((item) => Number(item?.value || 0) >= 0) : [];
  const maxValue = Math.max(...safeItems.map((item) => Number(item.value || 0)), 1);
  const chartHeight = Math.max(120, height - 56);
  const baseY = chartHeight - 12;
  const barWidth = safeItems.length ? Math.min(56, Math.max(24, Math.floor(260 / safeItems.length))) : 40;
  const gap = safeItems.length > 1 ? Math.max(18, Math.floor((320 - (safeItems.length * barWidth)) / (safeItems.length - 1))) : 0;
  const chartWidth = safeItems.length
    ? safeItems.length * barWidth + Math.max(0, safeItems.length - 1) * gap + 36
    : 360;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h4 className="text-lg font-black text-slate-900">{title}</h4>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>

      {!safeItems.length ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          No chart data available yet.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${height}`}
              className="h-[220px] min-w-[320px] w-full"
              role="img"
              aria-label={title}
            >
              {[0, 1, 2, 3].map((step) => {
                const y = 18 + ((chartHeight - 30) / 3) * step;
                return (
                  <line
                    key={step}
                    x1="18"
                    y1={y}
                    x2={chartWidth - 10}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 6"
                  />
                );
              })}
              {safeItems.map((item, index) => {
                const value = Number(item.value || 0);
                const barHeight = Math.max(8, ((chartHeight - 40) * value) / maxValue);
                const x = 18 + index * (barWidth + gap);
                const y = baseY - barHeight;
                return (
                  <g key={item.label}>
                    <text
                      x={x + (barWidth / 2)}
                      y={Math.max(18, y - 8)}
                      textAnchor="middle"
                      className="fill-slate-500 text-[10px] font-black"
                    >
                      {formatCompact(value)}
                    </text>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="10"
                      fill={item.color || '#2563eb'}
                    />
                    <text
                      x={x + (barWidth / 2)}
                      y={height - 10}
                      textAnchor="middle"
                      className="fill-slate-500 text-[10px] font-black uppercase tracking-wider"
                    >
                      {item.shortLabel || item.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {safeItems.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color || '#2563eb' }} />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">{item.label}</p>
                </div>
                <p className="mt-2 text-xl font-black text-slate-900">{Number(item.value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MultiLineChart({
  title,
  subtitle,
  labels,
  series,
  height = 320,
}) {
  const safeLabels = Array.isArray(labels) ? labels : [];
  const safeSeries = Array.isArray(series)
    ? series.filter((entry) => Array.isArray(entry?.data) && entry.data.length)
    : [];
  const maxValue = Math.max(
    ...safeSeries.flatMap((entry) => entry.data.map((value) => Number(value || 0))),
    1,
  );
  const width = Math.max(520, safeLabels.length * 42);
  const plotLeft = 40;
  const plotRight = width - 20;
  const plotTop = 18;
  const plotBottom = height - 54;
  const plotWidth = Math.max(1, plotRight - plotLeft);
  const plotHeight = Math.max(1, plotBottom - plotTop);

  const makePoint = (value, index, total) => {
    const x = total <= 1 ? plotLeft + (plotWidth / 2) : plotLeft + ((plotWidth * index) / (total - 1));
    const y = plotBottom - ((Number(value || 0) / maxValue) * plotHeight);
    return [x, y];
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h4 className="text-lg font-black text-slate-900">{title}</h4>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>

      {!safeLabels.length || !safeSeries.length ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          No analytics points in the selected window.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-[320px] min-w-[520px] w-full"
              role="img"
              aria-label={title}
            >
              {[0, 1, 2, 3, 4].map((step) => {
                const y = plotTop + ((plotHeight / 4) * step);
                return (
                  <line
                    key={step}
                    x1={plotLeft}
                    y1={y}
                    x2={plotRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 6"
                  />
                );
              })}

              {safeSeries.map((entry) => {
                const points = entry.data
                  .map((value, index) => makePoint(value, index, safeLabels.length))
                  .map(([x, y]) => `${x},${y}`)
                  .join(' ');
                return (
                  <g key={entry.label}>
                    <polyline
                      fill="none"
                      stroke={entry.color || '#2563eb'}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={points}
                    />
                    {entry.data.map((value, index) => {
                      const [x, y] = makePoint(value, index, safeLabels.length);
                      return (
                        <circle
                          key={`${entry.label}-${safeLabels[index]}`}
                          cx={x}
                          cy={y}
                          r="4"
                          fill={entry.color || '#2563eb'}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {safeLabels.map((label, index) => {
                const [x] = makePoint(0, index, safeLabels.length);
                return (
                  <text
                    key={label}
                    x={x}
                    y={height - 18}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] font-bold"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap gap-2">
            {safeSeries.map((entry) => (
              <span
                key={entry.label}
                className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-700"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || '#2563eb' }} />
                {entry.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
