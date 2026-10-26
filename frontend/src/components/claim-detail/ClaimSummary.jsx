import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

function formatServiceRange(start, end) {
  if (!start && !end) return '—';
  const parse = (value) => {
    if (!value) return null;
    const parts = String(value).split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const startDate = parse(start);
  const endDate = parse(end || start);
  if (!startDate || !endDate) return '—';

  const dayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayMonthYear = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  if (startDate.getTime() === endDate.getTime()) {
    return dayMonthYear.format(startDate);
  }
  return `${dayMonth.format(startDate)} – ${dayMonthYear.format(endDate)}`;
}

function formatFacilityMeta(claim) {
  const type = claim.facilityMeta?.match(/Tipe\s+[A-Z]/i)?.[0] || claim.facilityMeta;
  return [type, claim.careType].filter(Boolean).join(' • ');
}

function SummaryItem({ label, children, meta, className = '' }) {
  return (
    <div className={`space-y-1 border-t border-slate-100 pt-3 first:border-0 first:pt-0 md:border-l md:border-t-0 md:pl-4 md:pt-0 md:first:border-l-0 md:first:pl-0 ${className}`}>
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="truncate text-sm font-semibold text-riskora-950">{children}</div>
      {meta && <div className="text-[11px] text-muted">{meta}</div>}
    </div>
  );
}

export default function ClaimSummary({ claim }) {
  const durationMeta = claim.lengthOfStay > 0
    ? `Durasi: ${claim.lengthOfStay} Hari Perawatan`
    : 'Rawat Jalan (1 Hari)';

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-panel">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryItem label="Fasilitas Kesehatan" meta={formatFacilityMeta(claim)}>{claim.facilityName}</SummaryItem>
        <SummaryItem label="Tanggal Pelayanan" meta={durationMeta}>{formatServiceRange(claim.admissionDate, claim.dischargeDate)}</SummaryItem>
        <SummaryItem label="Diagnosis Utama" meta={`ICD-10: ${claim.primaryDiagnosis?.code || '—'}`}>{claim.primaryDiagnosis?.description || '—'}</SummaryItem>
        <SummaryItem label="Nilai Klaim Pengajuan" meta={`INA-CBG: ${claim.inaCbgCode || '—'}`}><span className="text-riskora-700">{formatCurrency(claim.claimAmount)}</span></SummaryItem>
        <SummaryItem label="Hasil Screening AI" className="sm:col-span-2 lg:col-span-1">
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800"><AlertTriangle size={14} /> Perlu Review</span>
        </SummaryItem>
      </div>
    </section>
  );
}
