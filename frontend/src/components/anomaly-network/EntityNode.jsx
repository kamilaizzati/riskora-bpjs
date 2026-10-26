import { Activity, Building2, CalendarRange, CircleUserRound, FileCheck2, FileText, Network, Stethoscope } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';

const icons = { claim: FileText, patient: CircleUserRound, facility: Building2, provider: Building2, diagnosis: Activity, episode: CalendarRange, procedure: Stethoscope, document: FileCheck2, case: Network };
const styles = {
  claim: 'rounded-xl border-blue-300 bg-blue-50 text-blue-950', patient: 'rounded-full border-violet-300 bg-violet-50 text-violet-950',
  facility: 'rounded-xl border-emerald-300 bg-emerald-50 text-emerald-950 [clip-path:polygon(12%_0,88%_0,100%_50%,88%_100%,12%_100%,0_50%)]',
  provider: 'rounded-xl border-emerald-300 bg-emerald-50 text-emerald-950 [clip-path:polygon(12%_0,88%_0,100%_50%,88%_100%,12%_100%,0_50%)]',
  diagnosis: 'rounded-xl border-rose-300 bg-rose-50 text-rose-950',
  episode: 'rounded-lg border-amber-300 bg-amber-50 text-amber-950 rotate-3', procedure: 'rounded-full border-slate-300 bg-slate-100 text-slate-800', document: 'rounded-lg border-teal-300 bg-teal-50 text-teal-950', case: 'rounded-xl border-slate-300 bg-white text-riskora-950',
};

export default function EntityNode({ data }) {
  const Icon = icons[data.entityType] || FileText;
  return (
    <div className={`relative min-w-[126px] border-2 px-3 py-2.5 shadow-sm transition-all ${styles[data.entityType] || styles.claim} ${data.isSelected ? 'ring-4 ring-riskora-700/25 shadow-lg scale-105' : ''} ${data.isDimmed ? 'opacity-20 grayscale' : 'opacity-100'} ${data.isExpanded ? 'ring-2 ring-blue-300' : ''}`}>
      <Handle type="target" position={Position.Left} className="!h-1 !w-1 !border-0 !bg-transparent" />
      <div className={`flex items-center gap-2 ${data.entityType === 'episode' ? '-rotate-3' : ''}`}><Icon size={14} className="shrink-0" /><div className="min-w-0"><p className="truncate text-[10px] font-bold">{data.label}</p><p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide opacity-60">{data.entityTypeLabel || data.entityType}</p></div></div>
      <Handle type="source" position={Position.Right} className="!h-1 !w-1 !border-0 !bg-transparent" />
    </div>
  );
}
