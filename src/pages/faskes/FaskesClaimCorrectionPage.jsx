import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, FileCheck2, FileText, Save, Trash2, UploadCloud, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import useFaskesClaimDetail from '../../hooks/useFaskesClaimDetail';
import { submitFaskesClaimCorrection } from '../../services/faskesService';
import { rescreenCorrectedClaim } from '../../services/faskesBatchService';

const REQUIRED_DATE = '2024-10-14';

export default function FaskesClaimCorrectionPage() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { claim, loading, error, retry } = useFaskesClaimDetail(claimId);
  const [activeTask, setActiveTask] = useState(1);
  const [resumeFile, setResumeFile] = useState(null);
  const [dischargeDate, setDischargeDate] = useState('2024-10-12');
  const [dateSaved, setDateSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const dateComplete = dischargeDate === REQUIRED_DATE && dateSaved;
  const completed = Number(Boolean(resumeFile)) + Number(dateComplete);
  const ready = completed === 2;
  const fileSize = useMemo(() => resumeFile ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB` : '', [resumeFile]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;
  if (!claim) return <MissingClaim claimId={claimId} />;

  const selectFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') return setMessage('Resume medis harus berformat PDF.');
    if (file.size > 10 * 1024 * 1024) return setMessage('Ukuran berkas maksimal 10 MB.');
    setMessage('');
    setResumeFile(file);
  };

  const saveDate = () => {
    if (dischargeDate !== REQUIRED_DATE) {
      setDateSaved(false);
      setMessage('Tanggal keluar harus sesuai dengan dokumen pembanding: 14 Oktober 2024.');
      return;
    }
    setMessage('');
    setDateSaved(true);
  };

  const submit = async () => {
    if (!ready) return;
    setSubmitting(true);
    setMessage('');
    try {
      const response = await submitFaskesClaimCorrection(claim.id, {
        dischargeDate,
        document: { name: resumeFile.name, type: resumeFile.type, size: resumeFile.size },
      });
      setResult(response);
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header>
        <Link to="/faskes/claims" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-riskora-700"><ArrowLeft size={15} /> Kembali ke Daftar Klaim</Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h1 className="font-heading text-2xl font-bold tracking-tight sm:text-[28px]">Perbaikan Klaim</h1><p className="mt-1 text-sm text-muted">Tindak lanjuti temuan pre-screening RISKORA sebelum batch difinalisasi untuk proses VClaim.</p></div>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs tabular-nums text-slate-600">No. SEP: {claim.sepNumber}</span><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">Perlu Koreksi</span></div>
        </div>
      </header>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-panel"><div className="grid gap-3 sm:grid-cols-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Claim ID</p><strong className="mt-1 block text-sm">{claim.claimId || claim.id}</strong></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">No. SEP</p><strong className="mt-1 block text-sm">{claim.sepNumber || 'Belum tersedia'}</strong></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Status Tindak Lanjut Internal</p><strong className="mt-1 block text-sm text-blue-700">{claim.correctionStatus === 'ready_for_rescreen' ? 'Siap diperiksa ulang' : claim.internalFollowUpStatus === 'recorded' ? 'Tercatat' : 'Belum selesai'}</strong></div></div><div className="mt-4 border-t border-line pt-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Temuan & tindak lanjut yang disarankan</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{(claim.screeningFindings || []).map((finding) => <div key={finding.code} className="rounded-lg border border-amber-200 bg-amber-50 p-3"><strong className="text-xs text-amber-900">{finding.message}</strong><p className="mt-1 text-[11px] leading-5 text-amber-800">{finding.followUp}</p></div>)}</div></div></section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6">
        <div className="flex items-center justify-between gap-4"><div><h2 className="font-heading text-lg font-semibold">Checklist Perbaikan</h2><p className="mt-1 text-xs text-muted">Pilih tindakan untuk membuka area perbaikannya.</p></div><strong className="text-xs">{completed} dari 2 selesai</strong></div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-riskora-700 transition-all" style={{ width: `${completed * 50}%` }} /></div>
        <div className="mt-4 divide-y divide-line">
          <ChecklistRow active={activeTask === 1} complete={Boolean(resumeFile)} icon={FileText} title="Lengkapi Resume Medis" description="Unggah resume medis resmi yang telah ditandatangani DPJP." onClick={() => setActiveTask(1)} />
          <ChecklistRow active={activeTask === 2} complete={dateComplete} icon={CalendarDays} title="Perbaiki Tanggal Keluar" description="Sesuaikan tanggal keluar dengan dokumen ringkasan pulang." onClick={() => setActiveTask(2)} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white shadow-panel">
        <div className="p-5 sm:p-6">
          {activeTask === 1 ? <ResumeTask file={resumeFile} fileSize={fileSize} inputRef={inputRef} onSelect={selectFile} onRemove={() => { setResumeFile(null); if (inputRef.current) inputRef.current.value = ''; }} /> : <DateTask value={dischargeDate} saved={dateComplete} onChange={(value) => { setDischargeDate(value); setDateSaved(false); }} onPrefill={() => { setDischargeDate(REQUIRED_DATE); setDateSaved(false); }} onSave={saveDate} />}
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-4 sm:px-6">
          <button type="button" disabled={activeTask === 1} onClick={() => setActiveTask(1)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs font-semibold hover:bg-canvas disabled:opacity-40"><ArrowLeft size={15} /> Sebelumnya</button>
          <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${activeTask === 1 ? 'bg-riskora-700' : 'bg-slate-200'}`} /><span className={`h-2.5 w-2.5 rounded-full ${activeTask === 2 ? 'bg-riskora-700' : 'bg-slate-200'}`} /></div>
          <button type="button" disabled={activeTask === 2} onClick={() => setActiveTask(2)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-4 py-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40">Berikutnya <ArrowRight size={15} /></button>
        </div>
      </section>

      {message && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{message}</div>}
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="flex items-center gap-3"><Link to="/faskes/claims" className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-canvas">Batal</Link><span className="hidden text-xs text-muted md:inline">Catatan ini hanya untuk pelacakan internal RISKORA dan tidak otomatis dikirim ke BPJS.</span></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><strong className={`text-xs ${ready ? 'text-green-700' : 'text-amber-700'}`}>{completed} dari 2 tindakan perbaikan selesai</strong><button type="button" disabled={!ready || submitting} onClick={submit} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-riskora-700 px-6 text-sm font-semibold text-white hover:bg-riskora-800 disabled:cursor-not-allowed disabled:opacity-40">{submitting ? 'Menyimpan...' : 'Simpan Tindak Lanjut Internal'} {!submitting && <ArrowRight size={17} />}</button></div></section>
      {result && <SuccessModal claim={claim} onClose={() => setResult(null)} onFinish={async () => { setSubmitting(true); try { await rescreenCorrectedClaim(claim.id); navigate('/faskes/claims'); } catch (requestError) { setResult(null); setMessage(requestError.message); } finally { setSubmitting(false); } }} />}
    </div>
  );
}

function ChecklistRow({ active, complete, icon: Icon, title, description, onClick }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-4 text-left transition ${active ? 'bg-riskora-50 ring-1 ring-riskora-700/20' : 'hover:bg-canvas'}`}><span className="flex min-w-0 items-center gap-3"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-riskora-700 text-white' : 'border border-slate-300 text-slate-400'}`}>{complete ? <Check size={15} /> : <Icon size={14} />}</span><span className="min-w-0"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs text-muted">{description}</span></span></span><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${complete ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{complete ? 'Selesai' : 'Belum Selesai'}</span></button>;
}

function ResumeTask({ file, fileSize, inputRef, onSelect, onRemove }) {
  return <div className="space-y-5"><TaskHeader number="1" title="Lengkapi Resume Medis" description="Unggah resume medis resmi yang telah ditandatangani DPJP." /><input ref={inputRef} type="file" accept="application/pdf" onChange={onSelect} className="sr-only" />{!file ? <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[250px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-riskora-600 hover:bg-riskora-50"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-riskora-700 shadow-sm"><UploadCloud size={23} /></span><strong className="mt-3 text-sm">Pilih Resume Medis PDF</strong><span className="mt-1 text-xs text-muted">PDF maksimal 10 MB</span></button> : <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]"><div className="rounded-xl border border-green-200 bg-green-50 p-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-green-700"><FileCheck2 size={20} /></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{file.name}</strong><p className="mt-1 text-xs text-muted">PDF • {fileSize}</p><span className="mt-2 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">Terunggah</span></div><button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-600" aria-label="Hapus dokumen"><Trash2 size={18} /></button></div><button type="button" onClick={() => inputRef.current?.click()} className="mt-4 text-xs font-semibold text-riskora-700 hover:underline">Ganti dokumen</button></div><DocumentPreview /></div>}</div>;
}

function TaskHeader({ number, title, description }) {
  return <div className="border-b border-line pb-4"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-riskora-700 text-xs font-bold text-white">{number}</span><h2 className="font-heading text-xl font-bold">{title}</h2></div><p className="mt-1 pl-8 text-sm text-muted">{description}</p></div>;
}

function DocumentPreview() {
  return <div className="rounded-xl border border-line bg-slate-100 p-4"><div className="mb-3 flex items-center justify-between text-[10px] text-muted"><span>Pratinjau Lembar Ringkasan Pulang</span><span>Halaman 1 dari 2</span></div><div className="mx-auto max-w-xl rounded-lg border border-line bg-white p-5 shadow-sm"><div className="border-b border-line pb-3 text-center"><strong className="text-sm text-riskora-700">FASILITAS KESEHATAN</strong><p className="mt-1 text-[10px] text-muted">RINGKASAN PULANG PASIEN</p></div><div className="mt-4 grid grid-cols-2 gap-3 text-[10px]"><div><span className="text-muted">Tanggal Masuk</span><strong className="mt-1 block">10 Oktober 2024</strong></div><div className="rounded border border-green-200 bg-green-50 p-2"><span className="text-green-700">Tanggal Keluar</span><strong className="mt-1 block text-green-900">14 Oktober 2024</strong></div></div><div className="mt-4 border-t border-line pt-3 text-right text-[10px]"><span className="rounded bg-riskora-50 px-2 py-1 font-semibold text-riskora-700">TTE DPJP Valid</span></div></div></div>;
}

function DateTask({ value, saved, onChange, onPrefill, onSave }) {
  return <div className="space-y-5"><TaskHeader number="2" title="Perbaiki Tanggal Keluar" description="Sesuaikan tanggal keluar pada data klaim dengan dokumen pendukung." /><div className="grid gap-6 lg:grid-cols-2"><div className="space-y-4"><div className="rounded-xl border border-line bg-canvas p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Nilai Tercatat</span><span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${saved ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{saved ? 'Sesuai Dokumen' : 'Tidak Sesuai Dokumen'}</span></div><p className="mt-3 text-xs text-muted">Tanggal Keluar Saat Ini</p><strong className={`mt-1 block text-base ${saved ? 'text-riskora-700' : ''}`}>{saved ? '14 Oktober 2024 (Tersimpan)' : '12 Oktober 2024'}</strong></div><div className="rounded-xl border border-line p-5"><label className="text-xs font-semibold">Tanggal Keluar yang Benar<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-riskora-700 focus:ring-1 focus:ring-riskora-700" /></label><button type="button" onClick={onPrefill} className="mt-3 rounded-lg border border-line bg-riskora-50 px-3 py-2 text-xs font-semibold text-riskora-700 hover:bg-riskora-100">Gunakan tanggal sesuai resume: 14 Okt 2024</button><div className="mt-4 flex items-center justify-between border-t border-line pt-4"><span className="text-xs text-muted">Lama rawat: {value === REQUIRED_DATE ? '4 Hari' : '2 Hari (Awal)'}</span><button type="button" onClick={onSave} className="inline-flex items-center gap-1.5 rounded-lg bg-riskora-700 px-4 py-2 text-xs font-semibold text-white hover:bg-riskora-800"><Save size={15} /> Simpan Perubahan</button></div></div></div><div><div className="mb-2 flex items-center justify-between text-[10px]"><strong className="uppercase tracking-wider text-muted">Dokumen Pembanding</strong><span className="text-riskora-700">Ringkasan Pulang</span></div><div className="rounded-xl border border-line bg-slate-50 p-4"><div className="rounded-lg border border-line bg-white p-4"><div className="flex items-center justify-between border-b border-line pb-2 text-[10px]"><strong className="text-riskora-700">FASILITAS KESEHATAN</strong><span className="text-muted">Dokumen resmi</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><span className="text-muted">Tanggal Masuk</span><strong className="mt-1 block">10 Oktober 2024</strong></div><div className="rounded border border-green-200 bg-green-50 p-2"><span className="text-green-700">Tanggal Keluar</span><strong className="mt-1 block text-green-900">14 Oktober 2024</strong></div></div><p className="mt-4 text-xs leading-5 text-muted">Pasien dipulangkan pada 14 Oktober 2024 pukul 11.00 WIB setelah visitasi akhir DPJP.</p></div><p className="mt-3 flex items-center gap-1.5 text-[10px] text-riskora-700"><CheckCircle2 size={14} /> Data berasal dari discharge summary resmi.</p></div></div></div></div>;
}

function SuccessModal({ claim, onClose, onFinish }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-7 text-center shadow-2xl"><button type="button" onClick={onClose} className="absolute right-4 top-4 text-slate-400" aria-label="Tutup"><X size={20} /></button><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-700"><CheckCircle2 size={34} /></span><span className="mt-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-800">Siap Diperiksa Ulang</span><h2 className="mt-3 font-heading text-xl font-bold">Tindak lanjut koreksi tersimpan.</h2><p className="mt-2 text-sm leading-6 text-muted">Perubahan untuk <strong className="tabular-nums text-riskora-950">{claim.sepNumber || claim.claimId}</strong> perlu melewati pre-screening ulang sebelum dapat dinyatakan lolos.</p><button type="button" onClick={onFinish} className="mt-5 w-full rounded-lg bg-riskora-700 py-3 text-sm font-semibold text-white">Jalankan Pemeriksaan Ulang</button></div></div>;
}

function MissingClaim({ claimId }) {
  return <div className="rounded-2xl border border-line bg-white p-8 text-center"><AlertTriangle size={28} className="mx-auto text-amber-600" /><h1 className="mt-3 font-heading text-xl font-semibold">Klaim tidak ditemukan</h1><p className="mt-2 text-sm text-muted">ID klaim “{claimId}” tidak tersedia.</p><Link to="/faskes/claims" className="mt-5 inline-flex text-sm font-semibold text-riskora-700">Kembali ke Daftar Klaim</Link></div>;
}
