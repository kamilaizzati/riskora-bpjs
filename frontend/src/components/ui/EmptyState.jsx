import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  title = 'Belum ada data',
  description = 'Data akan ditampilkan saat tersedia.',
  icon: Icon = Inbox,
  actionLabel,
  actionTo,
  onAction,
}) {
  const actionClassName = 'mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-riskora-700 px-4 text-xs font-semibold text-white transition hover:bg-riskora-800';

  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-4 py-10 text-center" role="status">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Icon size={21} /></span>
      <p className="mt-3 text-sm font-semibold text-riskora-950">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-muted">{description}</p>
      {actionLabel && actionTo && <Link to={actionTo} className={actionClassName}>{actionLabel}</Link>}
      {actionLabel && !actionTo && onAction && <button type="button" onClick={onAction} className={actionClassName}>{actionLabel}</button>}
    </div>
  );
}
