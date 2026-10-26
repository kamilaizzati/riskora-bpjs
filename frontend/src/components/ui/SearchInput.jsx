import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full sm:max-w-[340px]">
      <Search aria-hidden="true" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-riskora-700 focus:ring-3 focus:ring-emerald-100"
        aria-label={placeholder}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Bersihkan pencarian tabel" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-riskora-950">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
