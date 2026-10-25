import { ArrowRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { anomalyLabels, formatCurrency, formatDate } from '../../utils/formatters';
import EmptyState from './EmptyState';
import StatusBadge from './StatusBadge';

export default function DataTable({ claims }) {
  if (!claims.length) {
    return <EmptyState title="Klaim tidak ditemukan" description="Ubah kata kunci atau filter untuk melihat klaim lainnya." />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1080px] table-fixed border-collapse text-left text-xs">
        <colgroup>
          <col className="w-[14%]" />
          <col className="w-[15%]" />
          <col className="w-[9%]" />
          <col className="w-[15%]" />
          <col className="w-[11%]" />
          <col className="w-[13%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[9%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line bg-canvas text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            <th className="px-3 py-3">No. SEP</th>
            <th className="px-3 py-3">Faskes</th>
            <th className="px-3 py-3">Tgl Pelayanan</th>
            <th className="px-3 py-3">Diagnosis</th>
            <th className="px-3 py-3 text-right">Nilai Klaim</th>
            <th className="px-3 py-3">Jenis Temuan</th>
            <th className="px-3 py-3 text-center">Risiko</th>
            <th className="px-3 py-3 text-center">Status</th>
            <th className="px-3 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {claims.map((claim) => (
            <tr key={claim.id} className="group hover:bg-[#FAFCFB]">
              <td className="px-3 py-3">
                <p className="max-w-[170px] truncate font-semibold tabular-nums text-riskora-950" title={claim.sepNumber}>{claim.sepNumber}</p>
                <p className="mt-1 text-[10px] text-slate-500">{claim.careType || '—'}</p>
              </td>
              <td className="px-3 py-3">
                <p className="max-w-[180px] truncate font-medium text-riskora-950" title={claim.facilityName}>{claim.facilityName || '—'}</p>
                <p className="mt-1 max-w-[180px] truncate text-[10px] text-slate-500">{claim.facilityMeta || '—'}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(claim.serviceDate)}</td>
              <td className="px-3 py-3">
                <p className="max-w-[180px] truncate font-medium text-riskora-950" title={claim.primaryDiagnosis?.description}>{claim.primaryDiagnosis?.description || '—'}</p>
                <p className="mt-1 text-[10px] tabular-nums text-slate-500">ICD-10: {claim.primaryDiagnosis?.code || '—'}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-riskora-950">{formatCurrency(claim.claimAmount)}</td>
              <td className="px-3 py-3">
                <span className="inline-flex max-w-[150px] items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                  <TrendingUp size={11} />
                  <span className="truncate">{anomalyLabels[claim.anomalyTypes?.[0]] ?? claim.anomalyTypes?.[0] ?? '—'}</span>
                </span>
              </td>
              <td className="px-3 py-3 text-center"><StatusBadge type="risk" value={claim.riskLevel} /></td>
              <td className="px-3 py-3 text-center"><StatusBadge type="status" value={claim.status} /></td>
              <td className="px-3 py-3 text-right">
                <Link
                  to={`/verifier/claims/${encodeURIComponent(claim.id)}`}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-semibold text-riskora-700 hover:bg-riskora-50 hover:text-riskora-800"
                  aria-label={`Lihat detail klaim ${claim.sepNumber}`}
                >
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
