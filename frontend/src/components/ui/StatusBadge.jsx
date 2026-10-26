import { riskLabels, statusLabels } from '../../utils/formatters';

const riskStyles = {
  low: 'border-green-200 bg-green-100 text-green-800',
  medium: 'border-amber-200 bg-amber-100 text-amber-700',
  high: 'border-red-200 bg-red-100 text-red-600',
};
const statusStyles = {
  pending_verification: 'border-slate-200 bg-slate-100 text-slate-600',
  needs_investigation: 'border-indigo-200 bg-indigo-50 text-indigo-600',
  in_review: 'border-sky-200 bg-sky-100 text-sky-700',
  completed: 'border-green-200 bg-green-100 text-green-800',
};

export default function StatusBadge({ type, value }) {
  const isRisk = type === 'risk';
  const styles = isRisk ? riskStyles[value] : statusStyles[value];
  const label = isRisk ? riskLabels[value] : statusLabels[value];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold leading-none ${styles ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>
      {isRisk && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label ?? value ?? '—'}
    </span>
  );
}
