import { ArrowRight, CheckCircle2, FileCheck2, FileText, ReceiptText, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../ui/EmptyState';

const activityStyles = {
  eclaim_prepared: { icon: FileText, iconClass: 'bg-slate-100 text-slate-600' },
  vclaim_feedback: { icon: CheckCircle2, iconClass: 'bg-blue-100 text-blue-700' },
  correction_required: { icon: Wrench, iconClass: 'bg-amber-100 text-amber-700' },
  document_updated: { icon: FileCheck2, iconClass: 'bg-green-100 text-riskora-700' },
  bav_received: { icon: ReceiptText, iconClass: 'bg-riskora-100 text-riskora-700' },
};

export default function FaskesActivityFeed({ activities = [] }) {
  if (!activities.length) return <EmptyState title="Belum ada aktivitas pengajuan" description="Pembaruan klaim terbaru akan tampil di sini." />;
  return (
    <div className="divide-y divide-line">
      {activities.map((activity) => {
        const config = activityStyles[activity.type] ?? { icon: FileCheck2, label: 'Pembaruan klaim', iconClass: 'bg-slate-100 text-slate-600' };
        const Icon = config.icon;
        return (
          <article key={activity.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.iconClass}`}><Icon size={17} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3"><div><strong className="text-xs text-riskora-950">{activity.title || config.label || 'Pembaruan proses'}</strong><p className="mt-0.5 text-[10px] tabular-nums text-muted">Periode {activity.period || '—'}</p></div><time dateTime={activity.occurredAt} className="shrink-0 text-[10px] text-muted">{activity.relativeTime}</time></div>
              <p className="mt-1 text-xs leading-[1.125rem] text-slate-600">{activity.description}</p>
              <Link to="/faskes/claims/new" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-riskora-700 hover:text-riskora-800">Lihat Pengajuan <ArrowRight size={12} /></Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
