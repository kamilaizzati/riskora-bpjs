import { ArrowRight, ExternalLink, X } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';

export default function AnomalyClaimsDialog({ anomaly, claims, onClose }) {
  useEffect(() => {
    if (!anomaly) return undefined;
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [anomaly, onClose]);

  if (!anomaly) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="anomaly-dialog-title">
      <button type="button" className="absolute inset-0 bg-riskora-950/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Tutup daftar klaim" />
      <section className="relative flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="anomaly-dialog-title" className="font-heading text-base font-bold text-riskora-950">Filter Antrean Klaim Terapan</h2>
            <p className="mt-1 text-xs text-muted">Menampilkan berkas klaim berdasarkan parameter temuan.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-riskora-950" aria-label="Tutup"><X size={19} /></button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-[#FAFDFB] px-5 py-3 sm:px-6">
          <span className="text-xs text-muted">Filter aktif:</span>
          <span className="rounded-full bg-riskora-100 px-3 py-1 text-xs font-semibold text-riskora-800">Jenis Temuan: {anomaly.label}</span>
          <span className="text-xs font-medium tabular-nums text-muted">({claims.length} Klaim Ditemukan)</span>
        </div>

        <div className="flex-1 divide-y divide-line overflow-y-auto">
          {claims.length ? claims.map((claim, index) => (
            <article key={claim.id} className="flex flex-col gap-3 px-5 py-4 hover:bg-canvas sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-xs tabular-nums text-riskora-950">{claim.sepNumber}</strong>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${claim.riskLevel === 'high' ? 'bg-red-100 text-red-700' : claim.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-800'}`}>Anomali {Math.max(62, 94 - index * 3)}%</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted">{claim.facilityName} • {claim.careType}</p>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
                <strong className="text-xs tabular-nums text-riskora-950">{formatCurrency(claim.claimAmount)}</strong>
                <Link to={`/verifier/claims/${encodeURIComponent(claim.id)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-riskora-700 hover:text-riskora-800">Detail <ArrowRight size={14} /></Link>
              </div>
            </article>
          )) : <p className="px-6 py-12 text-center text-sm text-muted">Belum ada klaim untuk kategori anomali ini.</p>}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-line px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-canvas">Tutup</button>
          <Link to={`/verificator/claims?anomaly=${encodeURIComponent(anomaly.id)}`} className="inline-flex items-center gap-2 rounded-lg bg-riskora-700 px-4 py-2 text-sm font-semibold text-white hover:bg-riskora-800">Buka di Antrean Klaim <ExternalLink size={15} /></Link>
        </footer>
      </section>
    </div>
  );
}
