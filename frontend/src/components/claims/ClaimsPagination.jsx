import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ClaimsPagination({ page, pageCount, total, pageSize, onChange }) {
  if (!total) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const candidates = Array.from(new Set([1, page - 1, page, page + 1, pageCount])).filter((item) => item >= 1 && item <= pageCount).sort((a, b) => a - b);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-[#FAFDFB] px-5 py-3.5 text-sm sm:flex-row sm:px-6">
      <p className="text-slate-600">Menampilkan <strong className="text-riskora-950">{start} - {end}</strong> dari <strong className="text-riskora-950">{total}</strong> klaim</p>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft size={15} /> <span className="hidden sm:inline">Sebelumnya</span>
        </button>
        <div className="flex items-center gap-1">
          {candidates.map((item, index) => (
            <span key={item} className="contents">
              {index > 0 && item - candidates[index - 1] > 1 && <span className="w-5 text-center text-slate-400">…</span>}
              <button type="button" onClick={() => onChange(item)} aria-current={page === item ? 'page' : undefined} className={`h-8 w-8 rounded-lg text-xs font-semibold ${page === item ? 'bg-riskora-700 text-white' : 'border border-line bg-white text-slate-700 hover:bg-canvas'}`}>{item}</button>
            </span>
          ))}
        </div>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page === pageCount} className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40">
          <span className="hidden sm:inline">Selanjutnya</span> <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
