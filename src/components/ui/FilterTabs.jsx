const filters = [
  { id: 'all', label: 'Semua' },
  { id: 'high', label: 'Risiko Tinggi' },
  { id: 'investigation', label: 'Perlu Investigasi' },
  { id: 'pending', label: 'Menunggu' },
];

export default function FilterTabs({ activeFilter, onChange, counts }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter cepat klaim">
      {filters.map((filter) => {
        const active = activeFilter === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onChange(filter.id)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? 'border-riskora-700 bg-riskora-700 text-white'
                : filter.id === 'high'
                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : filter.id === 'investigation'
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-line bg-white text-slate-600 hover:bg-canvas'
            }`}
          >
            {filter.label} ({counts[filter.id] ?? 0})
          </button>
        );
      })}
    </div>
  );
}
