import { CheckCircle2, CircleAlert, Clock3, Eye, LoaderCircle } from 'lucide-react';

const statusMeta = {
  completed: { label: 'Selesai', icon: CheckCircle2, className: 'border-green-200 bg-green-50 text-green-800' },
  attention: { label: 'Perlu perhatian', icon: CircleAlert, className: 'border-amber-200 bg-amber-50 text-amber-800' },
  in_progress: { label: 'Dalam proses', icon: LoaderCircle, className: 'border-blue-200 bg-blue-50 text-blue-800' },
  waiting: { label: 'Menunggu', icon: Clock3, className: 'border-slate-200 bg-slate-50 text-slate-600' },
};

export default function SubmissionWorkflowTracker({ stages = [], onView }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6" aria-labelledby="workflow-title">
      <div><h2 id="workflow-title" className="font-heading text-xl font-semibold">Alur Pengajuan Periode</h2><p className="mt-1 text-sm text-muted">Status berikut merupakan simulasi pemantauan proses pada sistem eksternal yang berlaku.</p></div>
      <ol className="mt-5 grid gap-3 lg:grid-cols-5">
        {stages.map((stage, index) => {
          const meta = statusMeta[stage.status] || statusMeta.waiting;
          const Icon = meta.icon;
          return (
            <li key={stage.id} className="relative rounded-xl border border-line bg-[#FAFCFB] p-4">
              <div className="flex items-center justify-between gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-riskora-700 text-xs font-bold text-white">{index + 1}</span><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${meta.className}`}><Icon size={11} />{meta.label}</span></div>
              <h3 className="mt-4 min-h-10 font-heading text-sm font-bold leading-5">{stage.name}</h3><p className="mt-2 min-h-[60px] text-[11px] leading-5 text-muted">{stage.description}</p><p className="mt-3 border-t border-line pt-3 text-[11px] font-semibold text-riskora-950">{stage.summary}</p>
              <button type="button" onClick={() => onView(stage.id)} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-riskora-700 hover:underline"><Eye size={13} /> Lihat Detail</button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
