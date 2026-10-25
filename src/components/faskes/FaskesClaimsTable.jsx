import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import EmptyState from '../ui/EmptyState';

const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

function formatSubmission(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '—', time: '—' };
  return { date: dateFormatter.format(date), time: `${timeFormatter.format(date)} WIB` };
}

const statusStyles = {
  submitted: ['Menunggu Screening', 'border-slate-200 bg-slate-50 text-slate-600'],
  in_screening: ['Dalam Screening', 'border-blue-200 bg-blue-50 text-blue-700'],
  needs_correction: ['Perlu Koreksi', 'border-amber-200 bg-amber-50 text-amber-700'],
  screening_passed: ['Lolos Screening', 'border-green-200 bg-green-50 text-riskora-700'],
};

export default function FaskesClaimsTable({
  claims = [],
  emptyTitle = 'Tidak ada klaim yang memerlukan tindakan',
  emptyDescription = 'Klaim yang perlu diperbaiki akan ditampilkan di sini.',
}) {
  if (!claims.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-xs">
        <colgroup><col className="w-[21%]" /><col className="w-[15%]" /><col className="w-[24%]" /><col className="w-[17%]" /><col className="w-[13%]" /><col className="w-[10%]" /></colgroup>
        <thead><tr className="border-b border-line bg-canvas text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500"><th className="px-4 py-3.5">No. SEP</th><th className="px-4 py-3.5">Tgl Pengajuan</th><th className="px-4 py-3.5">Diagnosis</th><th className="px-4 py-3.5 text-right">Nilai Klaim</th><th className="px-4 py-3.5 text-center">Status</th><th className="px-4 py-3.5 text-right">Aksi</th></tr></thead>
        <tbody className="divide-y divide-line">
          {claims.map((claim) => {
            const submitted = formatSubmission(claim.submittedAt);
            const needsCorrection = claim.status === 'needs_correction';
            const [statusLabel, statusClass] = statusStyles[claim.status] ?? ['Status Tidak Diketahui', 'border-slate-200 bg-slate-50 text-slate-600'];
            return (
              <tr key={claim.id} className="hover:bg-[#FAFCFB]">
                <td className="px-4 py-4"><strong className="block truncate tabular-nums text-riskora-950">{claim.sepNumber}</strong><span className="mt-1 block truncate text-[10px] text-muted">{claim.careType || '—'}</span></td>
                <td className="px-4 py-4"><span className="block text-slate-700">{submitted.date}</span><span className="mt-1 block text-[10px] text-muted">{submitted.time}</span></td>
                <td className="px-4 py-4"><strong className="block truncate font-medium text-riskora-950">{claim.primaryDiagnosis?.description || '—'}</strong><span className="mt-1 block text-[10px] tabular-nums text-muted">ICD-10: {claim.primaryDiagnosis?.code || '—'}</span></td>
                <td className="px-4 py-4 text-right"><strong className="block tabular-nums text-riskora-950">{formatCurrency(claim.claimAmount)}</strong><span className="mt-1 block text-[10px] tabular-nums text-muted">INA-CBG: {claim.submittedInaCbgCode || '—'}</span></td>
                <td className="px-4 py-4 text-center"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>{statusLabel}</span></td>
                <td className="px-4 py-4 text-right"><Link to={needsCorrection ? `/faskes/claims/${encodeURIComponent(claim.id)}/correction` : `/faskes/claims/${encodeURIComponent(claim.id)}`} className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-riskora-700 hover:text-riskora-800">{needsCorrection ? 'Perbaiki' : 'Lihat Detail'} <ArrowRight size={13} /></Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
