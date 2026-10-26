import { RotateCcw } from 'lucide-react';

export default function AdvancedClaimFilters({ value, onChange, onReset }) {
  const setField = (field, nextValue) => onChange({ ...value, [field]: nextValue });
  const selectClass = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-riskora-950 outline-none focus:border-riskora-700 focus:ring-3 focus:ring-emerald-100';

  return (
    <div className="grid gap-4 border-b border-line bg-[#F7FAF8] px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
      <label className="space-y-1.5 text-xs font-semibold text-slate-600">
        Tingkat risiko
        <select value={value.risk} onChange={(event) => setField('risk', event.target.value)} className={selectClass}>
          <option value="all">Semua risiko</option>
          <option value="high">Tinggi</option>
          <option value="medium">Sedang</option>
          <option value="low">Rendah</option>
        </select>
      </label>
      <label className="space-y-1.5 text-xs font-semibold text-slate-600">
        Status pemeriksaan
        <select value={value.status} onChange={(event) => setField('status', event.target.value)} className={selectClass}>
          <option value="all">Semua status</option>
          <option value="pending_verification">Menunggu</option>
          <option value="needs_investigation">Investigasi</option>
          <option value="in_review">Review</option>
        </select>
      </label>
      <label className="space-y-1.5 text-xs font-semibold text-slate-600">
        Jenis temuan
        <select value={value.anomaly} onChange={(event) => setField('anomaly', event.target.value)} className={selectClass}>
          <option value="all">Semua temuan</option>
          <option value="Upcoding">Upcoding</option>
          <option value="Unbundling">Unbundling</option>
          <option value="Repeat Billing">Repeat Billing</option>
          <option value="Clinical Mismatch">Ketidaksesuaian</option>
          <option value="Incomplete Documents">Dokumen Kurang</option>
          <option value="Phantom Billing">Phantom Billing</option>
        </select>
      </label>
      <button type="button" onClick={onReset} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-slate-600 hover:border-riskora-700 hover:text-riskora-700">
        <RotateCcw size={15} /> Reset
      </button>
    </div>
  );
}
