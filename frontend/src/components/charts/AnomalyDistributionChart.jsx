import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import EmptyState from '../ui/EmptyState';

function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-riskora-950">{item.name}</p>
      <p className="mt-1 text-muted">{item.value} kasus ({item.percentage}%)</p>
    </div>
  );
}

export default function AnomalyDistributionChart({ data = [] }) {
  if (!data.length) return <EmptyState title="Belum ada distribusi anomali" />;
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const normalized = data.map((item) => ({
    ...item,
    percentage: total ? Math.round((item.value / total) * 100) : 0,
  }));

  return (
    <div className="h-[260px] w-full" aria-label="Grafik distribusi temuan anomali">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={normalized} layout="vertical" margin={{ top: 4, right: 42, bottom: 0, left: 2 }} barCategoryGap={17}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={112}
            tick={{ fill: '#172B24', fontSize: 12, fontWeight: 600 }}
          />
          <Tooltip cursor={{ fill: '#F7FAF8' }} content={<TooltipContent />} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={12} isAnimationActive={false} label={{ position: 'right', fill: '#64748B', fontSize: 11, formatter: (value) => `${value} kasus` }}>
            {normalized.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
