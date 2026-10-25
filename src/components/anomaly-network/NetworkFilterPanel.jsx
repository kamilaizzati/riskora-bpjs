import { RotateCcw, Search } from 'lucide-react';
import { relationshipTypes } from '../../mocks/anomalyNetwork';

export default function NetworkFilterPanel({ filters, periods, onChange, onReset }) {
  const toggleRelationship = (type) => {
    const selected = filters.relationshipTypes.includes(type);
    onChange({
      ...filters,
      relationshipTypes: selected
        ? filters.relationshipTypes.filter((item) => item !== type)
        : [...filters.relationshipTypes, type],
    });
  };

  return (
    <aside className="grid gap-4 rounded-2xl border border-line bg-white p-4 shadow-panel md:grid-cols-[minmax(210px,1fr)_minmax(300px,1.3fr)_minmax(210px,1fr)] 2xl:block" aria-labelledby="network-filter-title">
      <div className="flex items-center justify-between md:col-span-3 2xl:mb-4">
        <h2 id="network-filter-title" className="font-heading text-base font-bold">Filter Jaringan</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Lokal</span>
      </div>

      <div>
        <label className="block text-xs font-semibold text-riskora-950" htmlFor="network-search">Cari klaim</label>
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="network-search"
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="Cari No. SEP atau ID klaim..."
            className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-xs outline-none focus:border-riskora-700 focus:ring-1 focus:ring-riskora-700"
          />
        </div>
      </div>

      <fieldset className="border-line md:border-l md:pl-5 2xl:mt-5 2xl:border-l-0 2xl:border-t 2xl:pl-0 2xl:pt-4">
        <legend className="text-xs font-semibold text-riskora-950">Jenis Relasi</legend>
        <div className="mt-3 space-y-2.5">
          {Object.entries(relationshipTypes).map(([type, meta]) => (
            <label key={type} className="flex cursor-pointer items-start gap-2.5 text-xs leading-4 text-slate-600">
              <input
                type="checkbox"
                checked={filters.relationshipTypes.includes(type)}
                onChange={() => toggleRelationship(type)}
                className="mt-0.5 h-4 w-4 rounded border-line text-riskora-700 accent-[#166534]"
              />
              <span><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: meta.color }} />{meta.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="border-line md:border-l md:pl-5 2xl:mt-5 2xl:border-l-0 2xl:border-t 2xl:pl-0 2xl:pt-4">
        <label className="text-xs font-semibold text-riskora-950" htmlFor="network-period">Periode Layanan</label>
        <select
          id="network-period"
          value={filters.period}
          onChange={(event) => onChange({ ...filters, period: event.target.value })}
          className="mt-2 h-10 w-full rounded-lg border border-line bg-white px-3 text-xs text-riskora-950 outline-none focus:border-riskora-700"
        >
          <option value="all">Semua periode</option>
          {periods.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
        </select>
        <button type="button" onClick={onReset} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line text-xs font-semibold text-riskora-700 hover:border-riskora-700 hover:bg-riskora-50">
          <RotateCcw size={15} /> Reset Filter
        </button>
      </div>
    </aside>
  );
}
