import { CalendarRange } from 'lucide-react';

export default function PeriodSelector({ value, periods = [], onChange, label = 'Periode Penagihan' }) {
  return (
    <label className="inline-flex min-w-[220px] items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-riskora-950 shadow-sm">
      <CalendarRange size={16} className="text-riskora-700" />
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" aria-label={label}>
        {periods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
      </select>
    </label>
  );
}
