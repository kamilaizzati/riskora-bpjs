import { entityTypes } from '../../mocks/anomalyNetwork';

export default function NetworkLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-white px-4 py-3 text-[10px] text-muted" aria-label="Legenda jaringan">
      {Object.entries(entityTypes).map(([id, item]) => <span key={id} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: item.color }} />{item.label}</span>)}
      <span className="ml-auto inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-amber-500"/>Requires Review</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-slate-400"/>Informational</span>
    </div>
  );
}
