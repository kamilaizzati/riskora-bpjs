import { CircleAlert, RotateCcw } from 'lucide-react';

export default function ErrorState({ onRetry }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><CircleAlert size={23} /></span>
      <h2 className="mt-4 font-heading text-lg font-semibold text-riskora-950">Dashboard belum dapat dimuat</h2>
      <p className="mt-1 max-w-md text-sm text-muted">Layanan data mungkin sedang tidak tersedia. Coba muat ulang dashboard.</p>
      <button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-riskora-700 px-4 py-2 text-sm font-semibold text-white hover:bg-riskora-800">
        <RotateCcw size={16} /> Coba lagi
      </button>
    </div>
  );
}
