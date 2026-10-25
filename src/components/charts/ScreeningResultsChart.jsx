import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatNumber } from '../../utils/formatters';
import EmptyState from '../ui/EmptyState';

function TooltipContent({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const percentage = total ? Math.round((item.value / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-riskora-950">{item.name}</p>
      <p className="mt-1 text-muted">{formatNumber(item.value)} klaim ({percentage}%)</p>
    </div>
  );
}

export default function ScreeningResultsChart({ data = [] }) {
  if (!data.length) return <EmptyState title="Belum ada hasil screening" />;
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  return (
    <div className="flex min-h-[260px] flex-col items-center gap-5 pt-3 sm:flex-row">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={57} outerRadius={78} paddingAngle={1} stroke="none" isAnimationActive={false}>
              {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<TooltipContent total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading text-xl font-bold tabular-nums text-riskora-950">{formatNumber(total)}</span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Total klaim</span>
        </div>
      </div>
      <div className="w-full space-y-2.5">
        {data.map((item) => {
          const percentage = total ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-[#FAFCFB] px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-xs font-medium text-riskora-950">{item.name}</span>
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums">
                <strong style={{ color: item.color }}>{percentage}%</strong>
                <span className="ml-1 text-slate-400">({formatNumber(item.value)})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
