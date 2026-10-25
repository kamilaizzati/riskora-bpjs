import { AlertTriangle, Bot, CheckCircle2, FileCheck2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

const reviewOptions = [
  { id: 'continue', label: 'Lanjutkan Verifikasi', description: 'Klaim dapat dilanjutkan ke proses verifikasi resmi tanpa revisi faskes.' },
  { id: 'correction', label: 'Minta Koreksi Faskes', description: 'Dokumen atau informasi klaim memerlukan perbaikan atau konfirmasi koder faskes.' },
  { id: 'investigation', label: 'Tandai untuk Investigasi', description: 'Temuan memerlukan pemeriksaan lebih lanjut oleh Tim Anti-Fraud BPJS dan Audit Klinis.' },
];

function FindingCard({ finding }) {
  const high = finding.severity === 'high';
  return (
    <article className={`rounded-xl border bg-white p-4 shadow-panel ${high ? 'border-red-200' : 'border-amber-300'}`}>
      <div className="grid gap-2 sm:grid-cols-[140px_70px_minmax(0,1fr)] sm:items-center">
        <span className={`rounded px-2 py-1 text-center text-[10px] font-bold ${high ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}`}>{finding.category}</span>
        <span className={`flex items-center gap-1.5 text-[10px] font-semibold ${high ? 'text-red-600' : 'text-amber-700'}`}><span className="h-2 w-2 rounded-full bg-current" />{high ? 'Tinggi' : 'Sedang'}</span>
        <span className="truncate text-right text-[10px] text-slate-500">Sumber: {finding.source}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-700">{finding.description}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2"><span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold">#{finding.id}</span><span className="text-[10px] text-muted">Ref: {finding.reference}</span></div>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('riskora:show-evidence', { detail: finding.evidenceId }))} className="text-xs font-semibold text-riskora-700 hover:text-riskora-800">Lihat Bukti pada Dokumen →</button>
      </div>
    </article>
  );
}

export default function AIReviewPanel({ claim }) {
  const storageKey = `riskora-review-${claim.id}`;
  const [decision, setDecision] = useState('investigation');
  const [notes, setNotes] = useState('Terdapat ketidaksesuaian bukti penunjang dengan tingkat keparahan klaim. Membutuhkan konfirmasi audit medis bersama DPJP mengenai dasar penegakan diagnosis sekunder.');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try { const parsed = JSON.parse(saved); setDecision(parsed.decision || 'investigation'); setNotes(parsed.notes || ''); } catch { /* Ignore invalid local draft. */ }
    }
  }, [storageKey]);

  const save = (mode) => {
    window.localStorage.setItem(storageKey, JSON.stringify({ decision, notes, mode, savedAt: new Date().toISOString() }));
    setMessage(mode === 'draft' ? 'Draf tersimpan secara lokal.' : 'Hasil review tersimpan dalam mode mock.');
    window.setTimeout(() => setMessage(''), 2600);
  };

  return (
    <section className="flex min-h-[700px] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-panel lg:h-[calc(100vh-240px)] lg:min-h-[740px]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3"><Bot size={19} className="text-riskora-700" /><h2 className="font-heading text-sm font-semibold">Hasil Analisis AI &amp; Review Verifikator</h2></div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-3 rounded-xl border border-line bg-[#F2FBF6] p-4">
          <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ringkasan Evaluasi Risiko</span><span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-600" />Risiko {claim.riskLevel === 'high' ? 'Tinggi' : claim.riskLevel === 'medium' ? 'Sedang' : 'Rendah'}</span></div>
          <div className="flex items-center gap-4 rounded-lg border border-line bg-white p-3.5">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#DC2626 ${claim.riskScore}%, #E5EBE7 0)` }}><div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-white"><strong className="text-lg text-red-600">{claim.riskScore}</strong><span className="text-[8px] text-slate-500">/100</span></div></div>
            <div><h3 className="font-heading text-sm font-bold">Kategori Risiko {claim.riskLevel === 'high' ? 'Tinggi' : 'Perlu Perhatian'}</h3><p className="mt-1 text-[11px] leading-4 text-muted">Skor indikatif berdasarkan evaluasi semantik dokumen dan disparitas tarif INA-CBG.</p></div>
          </div>
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-xs font-semibold text-amber-900">Indikasi ketidaksesuaian antara diagnosis dan bukti klinis.</p><p className="mt-1 text-[11px] leading-4 text-amber-800">Klaim berpotensi mengalami perubahan grouping akibat kode komplikasi yang perlu dikonfirmasi.</p></div></div>
        </div>

        <div className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-panel">
          <div className="flex items-center justify-between border-b border-line pb-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Data Hasil Ekstraksi OCR</span><span className="inline-flex items-center gap-1 rounded bg-[#F2FBF6] px-2 py-1 text-[9px] text-riskora-700"><FileCheck2 size={12} /> Dokumen Terverifikasi</span></div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-canvas p-3"><span className="block text-[9px] uppercase text-slate-500">No. SEP</span><strong className="mt-1 block truncate tabular-nums">{claim.sepNumber}</strong></div>
            <div className="rounded-lg bg-canvas p-3"><span className="block text-[9px] uppercase text-slate-500">Lama Rawat</span><strong className="mt-1 block">{claim.lengthOfStay} Hari</strong></div>
            <div className="col-span-2 rounded-lg bg-canvas p-3"><span className="block text-[9px] uppercase text-slate-500">Diagnosis Utama Ekstraksi</span><div className="mt-1 flex justify-between gap-2"><strong>{claim.primaryDiagnosis.description}</strong><strong className="text-riskora-700">{claim.primaryDiagnosis.code}</strong></div></div>
            <div className="rounded-lg bg-canvas p-3"><span className="block text-[9px] uppercase text-slate-500">Jenis Pelayanan</span><strong className="mt-1 block">{claim.careType}</strong></div>
            <div className="rounded-lg bg-canvas p-3"><span className="block text-[9px] uppercase text-slate-500">Total Klaim</span><strong className="mt-1 block text-riskora-700">{formatCurrency(claim.claimAmount)}</strong></div>
          </div>
        </div>

        <div className="space-y-3"><div className="flex justify-between"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Temuan &amp; Analisis AI</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600">{claim.findings.length} Temuan Memerlukan Tindakan</span></div>{claim.findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div>

        <div className="space-y-4 rounded-xl border border-line bg-white p-4 shadow-panel">
          <div className="border-b border-line pb-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hasil Review Verifikator</span><h3 className="mt-1 font-heading text-sm font-semibold">Keputusan Tindak Lanjut Klaim</h3></div>
          <div className="space-y-2">{reviewOptions.map((option) => <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${decision === option.id ? 'border-2 border-riskora-700 bg-riskora-50' : 'border-line hover:bg-canvas'}`}><input type="radio" name="claim-decision" value={option.id} checked={decision === option.id} onChange={() => setDecision(option.id)} className="mt-1 accent-green-700" /><span className="flex-1"><span className={`block text-xs font-semibold ${decision === option.id ? 'text-riskora-700' : 'text-riskora-950'}`}>{option.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted">{option.description}</span></span>{decision === option.id && <CheckCircle2 size={17} className="text-riskora-700" />}</label>)}</div>
          <label className="block text-xs font-semibold">Catatan Verifikator <span className="float-right text-[10px] font-normal text-slate-500">{decision === 'investigation' ? 'Wajib untuk Investigasi' : 'Opsional'}</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Tuliskan alasan review dan tindak lanjut..." className="mt-2 w-full rounded-lg border border-line bg-canvas p-3 text-xs font-normal leading-5 outline-none focus:border-riskora-700 focus:ring-3 focus:ring-emerald-100" /></label>
          {message && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-800">{message}</p>}
          <div className="flex flex-col justify-end gap-2 border-t border-line pt-3 sm:flex-row"><button type="button" onClick={() => save('draft')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold hover:bg-canvas"><Save size={15} /> Simpan Draf</button><button type="button" onClick={() => save('review')} disabled={decision === 'investigation' && !notes.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-riskora-700 px-5 py-2 text-xs font-semibold text-white hover:bg-riskora-800 disabled:opacity-50"><FileCheck2 size={15} /> Simpan Hasil Review</button></div>
        </div>
      </div>
    </section>
  );
}
