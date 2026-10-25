import { ArrowRight, Check, Copy, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { anomalyLabels, formatCurrency, formatDate } from '../../utils/formatters';
import EmptyState from '../ui/EmptyState';
import StatusBadge from '../ui/StatusBadge';

export default function ClaimsQueueTable({ claims }) {
  const [copiedId, setCopiedId] = useState(null);

  const copySep = async (claim) => {
    try {
      await navigator.clipboard.writeText(claim.sepNumber);
      setCopiedId(claim.id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      setCopiedId(null);
    }
  };

  if (!claims.length) {
    return <EmptyState title="Klaim tidak ditemukan" description="Ubah kata kunci atau filter untuk melihat klaim lainnya." />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[960px] table-fixed border-collapse text-left text-xs">
        <colgroup>
          <col className="w-[14%]" /><col className="w-[15%]" /><col className="w-[9%]" />
          <col className="w-[15%]" /><col className="w-[11%]" /><col className="w-[13%]" />
          <col className="w-[7%]" /><col className="w-[7%]" /><col className="w-[9%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line bg-canvas text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            <th className="px-3 py-3.5">No. SEP</th><th className="px-3 py-3.5">Faskes</th>
            <th className="px-3 py-3.5">Tgl Pelayanan</th><th className="px-3 py-3.5">Diagnosis</th>
            <th className="px-3 py-3.5 text-right">Nilai Klaim</th><th className="px-3 py-3.5">Jenis Temuan</th>
            <th className="px-2 py-3.5 text-center">Risiko</th><th className="px-2 py-3.5 text-center">Status</th>
            <th className="px-3 py-3.5 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {claims.map((claim) => (
            <tr key={claim.id} className="group hover:bg-[#F7FAF8]">
              <td className="px-3 py-3.5">
                <div className="flex items-center gap-1">
                  <p className="min-w-0 truncate font-semibold tabular-nums text-riskora-950" title={claim.sepNumber}>{claim.sepNumber}</p>
                  <button type="button" onClick={() => copySep(claim)} className="shrink-0 text-slate-400 opacity-0 transition hover:text-riskora-700 group-hover:opacity-100 focus:opacity-100" aria-label={`Salin SEP ${claim.sepNumber}`}>
                    {copiedId === claim.id ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
                <p className="mt-1 truncate text-[10px] text-slate-500">{claim.careType}</p>
              </td>
              <td className="px-3 py-3.5">
                <p className="truncate font-medium text-riskora-950" title={claim.facilityName}>{claim.facilityName}</p>
                <p className="mt-1 truncate text-[10px] text-slate-500">{claim.facilityMeta}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">{formatDate(claim.serviceDate)}</td>
              <td className="px-3 py-3.5">
                <p className="truncate font-medium text-riskora-950" title={claim.primaryDiagnosis?.description}>{claim.primaryDiagnosis?.description || '—'}</p>
                <p className="mt-1 text-[10px] tabular-nums text-slate-500">ICD-10: {claim.primaryDiagnosis?.code || '—'}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold tabular-nums text-riskora-950">{formatCurrency(claim.claimAmount)}</td>
              <td className="px-3 py-3.5">
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                  <TrendingUp size={11} /><span className="truncate">{anomalyLabels[claim.anomalyTypes?.[0]] ?? claim.anomalyTypes?.[0] ?? '—'}</span>
                </span>
              </td>
              <td className="px-2 py-3.5 text-center"><StatusBadge type="risk" value={claim.riskLevel} /></td>
              <td className="px-2 py-3.5 text-center"><StatusBadge type="status" value={claim.status} /></td>
              <td className="px-3 py-3.5 text-right">
                <Link to={`/verifier/claims/${encodeURIComponent(claim.id)}`} className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-riskora-700 hover:text-riskora-800" aria-label={`Lihat detail klaim ${claim.sepNumber}`}>
                  Lihat Detail <ArrowRight size={13} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
