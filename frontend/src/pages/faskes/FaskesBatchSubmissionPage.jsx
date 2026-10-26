import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, Search, UploadCloud, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PeriodSelector from '../../components/faskes/PeriodSelector';
import EmptyState from '../../components/ui/EmptyState';
import { mockBillingPeriods } from '../../mocks/faskesWorkflow';
import { createDemoBatch, finalizeBatchScreening, getClaimBatch, markBatchForwarded, runBatchPrescreening, uploadClaimBatch } from '../../services/faskesBatchService';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

const steps = ['Upload Batch', 'Preview Data', 'Hasil Pre-screening', 'Finalisasi'];
const PAGE_SIZE = 6;

export default function FaskesBatchSubmissionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPeriod = searchParams.get('period') || '2026-10';
  const [step, setStep] = useState(0);
  const [period, setPeriod] = useState(initialPeriod);
  const [batchName, setBatchName] = useState(`Batch Klaim ${mockBillingPeriods.find((item) => item.id === initialPeriod)?.label || initialPeriod}`);
  const [fileMeta, setFileMeta] = useState(null);
  const [fileError, setFileError] = useState('');
  const [batch, setBatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const batchId = searchParams.get('batch');
    if (!batchId) return;
    getClaimBatch(batchId).then((savedBatch) => {
      if (!savedBatch) return;
      setBatch(savedBatch); setPeriod(savedBatch.period); setBatchName(savedBatch.name);
      setStep(['ready_to_handoff', 'handed_off'].includes(savedBatch.screeningStatus) ? 3 : savedBatch.screeningStatus === 'draft' ? 1 : 2);
    });
  }, [searchParams]);

  const loadDemo = async () => {
    setBusy(true);
    setActionError('');
    try {
      const created = fileMeta?.content
        ? await uploadClaimBatch({
            content: fileMeta.content,
            period,
            name: batchName,
            fileName: fileMeta.name
          })
        : await createDemoBatch({ period, name: batchName, fileMeta });
      setBatch(created);
      setStep(1);
    } catch (error) {
      setActionError(error.message || 'Import batch gagal.');
    } finally {
      setBusy(false);
    }
  };
  const runScreening = async () => { setBusy(true); setBatch(await runBatchPrescreening(batch.id)); setStep(2); setBusy(false); };
  const goToFinalization = () => setStep(3);
  const finalize = async () => { setBusy(true); setActionError(''); try { setBatch(await finalizeBatchScreening(batch.id)); } catch (error) { setActionError(error.message); } finally { setBusy(false); } };
  const markForwarded = async () => { setBusy(true); setBatch(await markBatchForwarded(batch.id)); setBusy(false); };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header><h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[28px]">Pengajuan Batch Klaim</h1><p className="mt-1 text-sm text-muted">Unggah hasil E-Claim untuk pemeriksaan awal sebelum diteruskan ke VClaim.</p></header>
      <ol className="grid overflow-hidden rounded-xl border border-line bg-white shadow-panel sm:grid-cols-4">{steps.map((label, index) => <li key={label} className={`flex min-h-16 items-center gap-3 border-b border-line px-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${index === step ? 'bg-riskora-50' : ''}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index <= step ? 'bg-riskora-700 text-white' : 'border border-slate-300 text-slate-400'}`}>{index < step ? '✓' : index + 1}</span><span className={`text-xs font-semibold ${index === step ? 'text-riskora-800' : 'text-slate-500'}`}>{label}</span></li>)}</ol>
      {step === 0 && <UploadStep period={period} batchName={batchName} fileMeta={fileMeta} fileError={fileError} busy={busy} onPeriod={(next) => { setPeriod(next); setSearchParams({ period: next }, { replace: true }); setBatchName(`Batch Klaim ${mockBillingPeriods.find((item) => item.id === next)?.label || next}`); }} onBatchName={setBatchName} onFile={(meta, error) => { setFileMeta(meta); setFileError(error); }} onDemo={loadDemo} />}
      {step === 1 && <PreviewStep batch={batch} busy={busy} onBack={() => setStep(0)} onScreen={runScreening} />}
      {step === 2 && <ScreeningResultStep batch={batch} onBack={() => setStep(1)} onContinue={goToFinalization} />}
      {step === 3 && <FinalizationStep batch={batch} busy={busy} onBack={() => setStep(2)} onFinalize={finalize} onMarkForwarded={markForwarded} />}
      {actionError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">{actionError}</div>}
      <aside className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">RISKORA melakukan pre-screening sebelum VClaim. Hasilnya bukan jaminan kesesuaian VClaim atau persetujuan BPJS, dan tidak ada pengiriman resmi ke BPJS dari prototipe ini.</aside>
    </div>
  );
}

function UploadStep({ period, batchName, fileMeta, fileError, busy, onPeriod, onBatchName, onFile, onDemo }) {
  const inputRef = useRef(null);
  const validateFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) return onFile(null, 'File harus menggunakan ekstensi .txt.');
    if (file.size <= 0) return onFile(null, 'File TXT tidak boleh kosong.');
    if (file.size > 10 * 1024 * 1024) return onFile(null, 'Ukuran file maksimal 10 MB.');
    const reader = new FileReader();
    reader.onload = () => onFile({ name: file.name, size: file.size, type: file.type || 'text/plain', validatedLocally: true, content: reader.result }, '');
    reader.onerror = () => onFile(null, 'File tidak dapat dibaca secara lokal.');
    reader.readAsText(file);
  };
  return <section className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-7"><div><h2 className="font-heading text-xl font-semibold">1. Upload Batch E-Claim</h2><p className="mt-1 text-sm text-muted">Pilih periode dan file TXT hasil ekspor bulanan E-Claim.</p></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div><span className="text-xs font-semibold">Periode Penagihan</span><div className="mt-2"><PeriodSelector value={period} periods={mockBillingPeriods} onChange={onPeriod} /></div></div><label className="text-xs font-semibold">Nama Batch<input value={batchName} onChange={(event) => onBatchName(event.target.value)} className="field" /></label></div><input ref={inputRef} type="file" accept=".txt,text/plain" className="sr-only" onChange={(event) => validateFile(event.target.files?.[0])} /><div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); validateFile(event.dataTransfer.files?.[0]); }} className={`mt-6 flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center ${fileMeta ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'}`}><span className={`flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ${fileMeta ? 'text-green-700' : 'text-riskora-700'}`}>{fileMeta ? <CheckCircle2 size={26} /> : <UploadCloud size={26} />}</span>{fileMeta ? <><strong className="mt-4 text-sm">{fileMeta.name}</strong><span className="mt-1 text-xs text-muted">{formatFileSize(fileMeta.size)} · File tersedia untuk demo import</span><button type="button" onClick={() => inputRef.current?.click()} className="mt-3 text-xs font-semibold text-riskora-700">Ganti file</button></> : <><strong className="mt-4 text-sm">Tarik file TXT ke sini</strong><span className="mt-1 text-xs text-muted">atau pilih file dari perangkat</span><button type="button" onClick={() => inputRef.current?.click()} className="mt-4 rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-riskora-700">Pilih File TXT</button></>}</div>{fileError && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{fileError}</p>}<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>Mode Import Demo</strong><p className="mt-1">Format TXT E-Claim resmi belum terintegrasi. Data klaim yang ditampilkan merupakan simulasi untuk demonstrasi RISKORA.</p></div><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={busy || !batchName.trim()} onClick={onDemo} className="h-11 rounded-lg border border-riskora-700 px-5 text-sm font-semibold text-riskora-700 disabled:opacity-40">Jalankan Demo dengan Batch Simulasi</button>{fileMeta && <button type="button" disabled={busy || !batchName.trim()} onClick={onDemo} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-riskora-700 px-5 text-sm font-semibold text-white disabled:opacity-40">{busy && <LoaderCircle size={16} className="animate-spin" />} Gunakan Data Simulasi untuk Preview</button>}</div></section>;
}

function PreviewStep({ batch, busy, onBack, onScreen }) {
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1);
  const filtered = useMemo(() => batch.claims.filter((claim) => [claim.claimId, claim.sepNumber, claim.primaryDiagnosis?.description].join(' ').toLowerCase().includes(query.toLowerCase())), [batch.claims, query]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE); const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const ready = batch.claims.filter((claim) => claim.sepNumber && claim.primaryDiagnosis?.code && Number(claim.claimAmount) >= 0).length;
  return <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel"><SectionHeader number="2" title="Preview Data Batch" description="Data berikut berasal dari dataset klaim fiktif, bukan hasil parsing format resmi E-Claim." /><div className="grid gap-3 border-b border-line p-5 sm:grid-cols-4"><Metric label="Periode" value={batch.periodLabel} /><Metric label="Sumber" value="Simulated Claim Dataset" /><Metric label="Total Klaim Fiktif" value={formatNumber(batch.claims.length)} /><Metric label="Data Dasar Lengkap" value={`${ready}/${batch.claims.length}`} /></div><div className="border-b border-line p-4"><div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari Claim ID, SEP, atau diagnosis..." className="h-10 w-full rounded-lg border border-line pl-9 pr-3 text-xs outline-none focus:border-riskora-700" /></div></div><BatchClaimsTable claims={visible} showStatus="data" /><div className="flex items-center justify-between border-t border-line p-4"><button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowLeft size={14} /> Kembali</button><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-line px-3 py-1.5 text-xs disabled:opacity-40">Sebelumnya</button><span className="text-xs text-muted">{page}/{pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)} className="rounded border border-line px-3 py-1.5 text-xs disabled:opacity-40">Berikutnya</button></div><button type="button" disabled={busy} onClick={onScreen} className="inline-flex h-10 items-center gap-2 rounded-lg bg-riskora-700 px-5 text-sm font-semibold text-white">{busy && <LoaderCircle size={15} className="animate-spin" />} Jalankan Pre-screening</button></div></section>;
}

function ScreeningResultStep({ batch, onBack, onContinue }) {
  const [filter, setFilter] = useState('all'); const [query, setQuery] = useState('');
  const summary = useMemo(() => ({ passed: batch.claims.filter((claim) => claim.screeningStatus === 'passed').length, correction: batch.claims.filter((claim) => claim.screeningStatus === 'needs_correction').length, unchecked: batch.claims.filter((claim) => claim.screeningStatus === 'not_screened').length }), [batch.claims]);
  const filtered = batch.claims.filter((claim) => (filter === 'all' || claim.screeningStatus === filter) && [claim.claimId, claim.sepNumber, claim.screeningFindings?.map((item) => item.message).join(' ')].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel"><SectionHeader number="3" title="Hasil Pre-screening RISKORA" description="Pemeriksaan deterministik atas kelengkapan data administratif dasar pada dataset simulasi." /><div className="grid gap-3 border-b border-line p-5 sm:grid-cols-3"><Metric label="Total Diperiksa" value={formatNumber(batch.claims.length)} /><Metric label="Lolos Screening Awal" value={formatNumber(summary.passed)} tone="text-riskora-700" /><Metric label="Perlu Koreksi" value={formatNumber(summary.correction)} tone="text-amber-700" /></div><div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">Hasil screening RISKORA merupakan pemeriksaan awal dan bukan jaminan kesesuaian VClaim atau persetujuan BPJS.</div><div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari hasil screening..." className="h-10 w-full rounded-lg border border-line pl-9 pr-3 text-xs" /></div><div className="flex gap-2">{[['all','Semua'],['passed','Lolos'],['needs_correction','Perlu Koreksi']].map(([id,label]) => <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === id ? 'border-riskora-700 bg-riskora-700 text-white' : 'border-line'}`}>{label}</button>)}</div></div><BatchClaimsTable claims={filtered} showStatus="screening" /><div className="flex justify-between border-t border-line p-4"><button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowLeft size={14} /> Preview</button><button type="button" onClick={onContinue} className="inline-flex h-10 items-center gap-2 rounded-lg bg-riskora-700 px-5 text-sm font-semibold text-white">Lanjut ke Finalisasi <ArrowRight size={15} /></button></div></section>;
}

function FinalizationStep({ batch, busy, onBack, onFinalize, onMarkForwarded }) {
  const [confirmOpen, setConfirmOpen] = useState(false); const summary = useMemo(() => ({ passed: batch.claims.filter((claim) => claim.screeningStatus === 'passed').length, correction: batch.claims.filter((claim) => claim.screeningStatus === 'needs_correction').length, completed: batch.claims.filter((claim) => claim.correctionStatus === 'completed').length }), [batch.claims]);
  const finalized = ['ready_to_handoff','handed_off'].includes(batch.screeningStatus); const forwarded = batch.handoffStatus === 'marked_forwarded';
  return <section className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-7"><SectionHeader number="4" title="Finalisasi & Penerusan" description="Finalisasi hasil pemeriksaan awal dan catat handoff manual ke proses VClaim." /><div className="mt-5 grid gap-3 sm:grid-cols-4"><Metric label="Total Diperiksa" value={formatNumber(batch.claims.length)} /><Metric label="Lolos Awal" value={formatNumber(summary.passed)} tone="text-riskora-700" /><Metric label="Perlu Koreksi" value={formatNumber(summary.correction)} tone="text-amber-700" /><Metric label="Koreksi Selesai" value={`${summary.completed}/${summary.correction}`} /></div>{finalized && <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 text-green-700" size={22} /><div><h3 className="font-heading text-lg font-bold text-green-900">{forwarded ? 'Ditandai Sudah Diteruskan ke VClaim' : 'Batch Siap Diteruskan ke VClaim'}</h3><p className="mt-1 text-xs leading-5 text-green-800">Silakan lanjutkan pengajuan melalui aplikasi VClaim sesuai prosedur yang berlaku.</p></div></div></div>}<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowLeft size={14} /> Hasil Screening</button><div className="flex flex-wrap gap-2"><Link to="/faskes/submissions" className="rounded-lg border border-line px-4 py-2.5 text-xs font-semibold">Lihat Riwayat Batch</Link><Link to="/faskes/dashboard" className="rounded-lg border border-line px-4 py-2.5 text-xs font-semibold">Kembali ke Dashboard</Link>{!finalized && <button type="button" disabled={busy} onClick={onFinalize} className="rounded-lg bg-riskora-700 px-5 py-2.5 text-xs font-semibold text-white">Finalisasi Hasil Screening</button>}{finalized && !forwarded && <button type="button" onClick={() => setConfirmOpen(true)} className="rounded-lg bg-riskora-700 px-5 py-2.5 text-xs font-semibold text-white">Tandai Sudah Diteruskan ke VClaim</button>}</div></div>{confirmOpen && <ConfirmDialog busy={busy} onCancel={() => setConfirmOpen(false)} onConfirm={async () => { await onMarkForwarded(); setConfirmOpen(false); }} />}</section>;
}

function BatchClaimsTable({ claims, showStatus }) { if (!claims.length) return <EmptyState title={showStatus === 'screening' ? 'Tidak ada hasil yang sesuai' : 'Batch belum berisi klaim'} description={showStatus === 'screening' ? 'Ubah pencarian atau filter untuk menampilkan hasil lainnya.' : 'Periksa sumber data batch sebelum menjalankan pre-screening.'} />; return <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead><tr className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><th className="px-4 py-3">Claim ID</th><th className="px-4 py-3">No. SEP</th><th className="px-4 py-3">Jenis Layanan</th><th className="px-4 py-3">Tanggal Pelayanan</th><th className="px-4 py-3">Diagnosis Utama</th><th className="px-4 py-3 text-right">Nilai Klaim</th><th className="px-4 py-3">{showStatus === 'screening' ? 'Hasil / Temuan' : 'Status Data'}</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-line">{claims.map((claim) => { const finding = claim.screeningFindings?.[0]; const ready = claim.sepNumber && claim.primaryDiagnosis?.code && Number(claim.claimAmount) >= 0; return <tr key={claim.id}><td className="px-4 py-3 font-semibold">{claim.claimId}</td><td className="px-4 py-3 tabular-nums">{claim.sepNumber || 'Belum tersedia'}</td><td className="px-4 py-3">{claim.careType}</td><td className="px-4 py-3">{formatDate(claim.serviceDate)}</td><td className="px-4 py-3">{claim.primaryDiagnosis?.code} · {claim.primaryDiagnosis?.description}</td><td className="px-4 py-3 text-right">{formatCurrency(claim.claimAmount)}</td><td className="px-4 py-3">{showStatus === 'screening' ? <div><strong className={claim.screeningStatus === 'passed' ? 'text-riskora-700' : 'text-amber-700'}>{claim.screeningStatus === 'passed' ? 'Lolos Screening Awal' : 'Perlu Koreksi'}</strong>{finding && <span className="mt-1 block max-w-xs text-[10px] text-muted">{finding.message}</span>}</div> : <span className={ready ? 'text-riskora-700' : 'text-amber-700'}>{ready ? 'Siap diperiksa' : 'Data dasar belum lengkap'}</span>}</td><td className="px-4 py-3 text-right"><Link to={claim.screeningStatus === 'needs_correction' ? `/faskes/claims/${claim.id}/correction` : `/faskes/claims/${claim.id}`} className="font-semibold text-riskora-700">{claim.screeningStatus === 'needs_correction' ? 'Review Koreksi' : 'Lihat Detail'}</Link></td></tr>; })}</tbody></table></div>; }
function SectionHeader({ number, title, description }) { return <div className="border-b border-line p-5 sm:p-6"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-riskora-700 text-xs font-bold text-white">{number}</span><h2 className="font-heading text-xl font-semibold">{title}</h2></div><p className="mt-1 pl-9 text-sm text-muted">{description}</p></div>; }
function Metric({ label, value, tone = 'text-riskora-950' }) { return <div className="rounded-xl border border-line bg-canvas p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p><strong className={`mt-1 block text-sm ${tone}`}>{value}</strong></div>; }
function ConfirmDialog({ busy, onCancel, onConfirm }) { return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true"><div className="relative max-w-md rounded-2xl bg-white p-6 shadow-xl"><button type="button" onClick={onCancel} className="absolute right-4 top-4 text-muted" aria-label="Tutup"><X size={18} /></button><AlertTriangle size={28} className="text-amber-600" /><h3 className="mt-3 font-heading text-lg font-bold">Catat penerusan manual?</h3><p className="mt-2 text-sm leading-6 text-muted">Tindakan ini hanya mencatat status penerusan di RISKORA dan tidak mengirimkan data ke sistem BPJS.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-line px-4 py-2 text-xs font-semibold">Batal</button><button type="button" disabled={busy} onClick={onConfirm} className="rounded-lg bg-riskora-700 px-4 py-2 text-xs font-semibold text-white">Ya, Tandai Diteruskan</button></div></div></div>; }
function formatFileSize(bytes) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`; }
