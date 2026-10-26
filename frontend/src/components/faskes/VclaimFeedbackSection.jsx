import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNumber } from '../../utils/formatters';
import EmptyState from '../ui/EmptyState';

const statusClass = 'border-amber-200 bg-amber-50 text-amber-800';

export default function VclaimFeedbackSection({ matching = 0, nonMatching = 0, claims = [] }) {
  const total = matching + nonMatching;
  const matchingPercentage = total ? Math.round((matching / total) * 100) : 0;
  return (
    <section id="vclaim-section" className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel">
      <div className="p-5 sm:p-6"><h2 className="font-heading text-xl font-semibold">Umpan Balik VClaim</h2><p className="mt-1 text-sm text-muted">Status kecocokan administratif simulasi; “Sesuai” bukan persetujuan akhir verifikasi BPJS.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-green-200 bg-green-50 p-4"><p className="text-xs text-green-800">Sesuai VClaim</p><strong className="mt-1 block font-heading text-2xl tabular-nums text-green-900">{formatNumber(matching)}</strong></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-amber-800">Tidak Sesuai</p><strong className="mt-1 block font-heading text-2xl tabular-nums text-amber-900">{formatNumber(nonMatching)}</strong></div></div>
        <div className="mt-4"><div className="flex justify-between text-[11px] text-muted"><span>Distribusi kecocokan</span><strong className="text-riskora-700">{matchingPercentage}% sesuai</strong></div><div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-amber-100"><span className="bg-riskora-700" style={{ width: `${matchingPercentage}%` }} /><span className="bg-amber-500" style={{ width: `${100 - matchingPercentage}%` }} /></div></div>
      </div>
      {claims.length ? <div className="overflow-x-auto border-t border-line"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><th className="px-5 py-3">No. SEP</th><th className="px-5 py-3">Jenis Layanan</th><th className="px-5 py-3">Keterangan Ketidaksesuaian</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-line">{claims.map((claim) => <tr key={claim.id}><td className="px-5 py-3 font-semibold tabular-nums">{claim.sepNumber}</td><td className="px-5 py-3">{claim.careType}</td><td className="px-5 py-3 text-muted">{claim.correctionReason}</td><td className="px-5 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass}`}>Perlu perbaikan</span></td><td className="px-5 py-3 text-right"><Link to={`/faskes/claims/${claim.id}/correction`} className="inline-flex items-center gap-1 font-semibold text-riskora-700">Tindak Lanjut <ArrowRight size={13} /></Link></td></tr>)}</tbody></table></div> : <EmptyState title="Tidak ada ketidaksesuaian pada sampel klaim" description="Umpan balik yang memerlukan koreksi akan tampil di bagian ini." />}
    </section>
  );
}
