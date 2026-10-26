import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatNumber } from '../../utils/formatters';
import EmptyState from '../ui/EmptyState';

function ChartTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const percentage = total ? Math.round((Number(item.value) / total) * 100) : 0;
  return <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg"><strong>{item.label}</strong><p className="mt-1 text-muted">{formatNumber(item.value)} klaim ({percentage}%)</p></div>;
}

export default function FaskesScreeningChart({ data = [] }) {
  const validData = data.filter((item) => Number(item.value) > 0);
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  if (!total) return <EmptyState title="Belum ada status screening" description="Distribusi akan tersedia setelah klaim diajukan." />;

  return (
    <div>
      <div className="relative mx-auto h-[180px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={validData} dataKey="value" nameKey="label" innerRadius={55} outerRadius={76} paddingAngle={2} stroke="none" isAnimationActive={false}>{validData.map((item) => <Cell key={item.status} fill={item.color} />)}</Pie><Tooltip content={<ChartTooltip total={total} />} /></PieChart></ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="font-heading text-2xl tabular-nums text-riskora-950">{formatNumber(total)}</strong><span className="text-[9px] font-semibold uppercase tracking-wider text-muted">Total Klaim</span></div>
      </div>
      <div className="mt-2 space-y-2">
        {data.map((item) => {
          const percentage = total ? Math.round((Number(item.value) / total) * 100) : 0;
          return <div key={item.status} className="flex items-center justify-between rounded-lg border border-line bg-[#FAFCFB] px-3 py-2 text-xs"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="font-medium">{item.label}</span></div><div className="tabular-nums"><strong style={{ color: item.color }}>{percentage}%</strong><span className="ml-1.5 text-muted">({formatNumber(item.value)})</span></div></div>;
        })}
      </div>
    </div>
  );
}
