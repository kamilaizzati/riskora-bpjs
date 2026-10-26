import { ArrowLeft, CheckCircle2, ChevronDown, ClipboardList, Clock3, FileText, HeartPulse, ReceiptText, ShieldCheck, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import useFaskesClaimDetail from '../../hooks/useFaskesClaimDetail';
import { formatCurrency } from '../../utils/formatters';

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const documents = [
  { id: 'resume', label: 'Resume Medis', file: 'resume-medis.pdf', icon: FileText },
  { id: 'sep', label: 'Surat Eligibilitas Peserta', file: 'sep.pdf', icon: ShieldCheck },
  { id: 'billing', label: 'Rincian Biaya', file: 'billing.pdf', icon: ReceiptText },
  { id: 'lab', label: 'Hasil Laboratorium', file: 'hasil-lab.pdf', icon: HeartPulse },
];

const statusContent = {
  needs_correction: { label: 'Perlu Koreksi', message: 'Pre-screening RISKORA menemukan data yang perlu ditindaklanjuti sebelum batch siap diteruskan ke VClaim.', className: 'border-amber-200 bg-amber-50 text-amber-900' },
  passed: { label: 'Lolos Screening Awal', message: 'Klaim lolos pemeriksaan awal RISKORA. Hasil ini bukan jaminan kesesuaian VClaim atau persetujuan BPJS.', className: 'border-green-200 bg-green-50 text-green-900' },
  in_screening: { label: 'Dalam Screening', message: 'Berkas klaim sedang menjalani pemeriksaan awal oleh Riskora.', className: 'border-blue-200 bg-blue-50 text-blue-900' },
  submitted: { label: 'Menunggu Screening', message: 'Klaim telah diajukan dan menunggu proses pemeriksaan awal.', className: 'border-slate-200 bg-slate-50 text-slate-700' },
};

export default function FaskesClaimDetailPage() {
  const { claimId } = useParams();
  const { claim, loading, error, retry } = useFaskesClaimDetail(claimId);
  const [openSection, setOpenSection] = useState('diagnosis');
  const [activeDocument, setActiveDocument] = useState('resume');

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;
  if (!claim) return <EmptyClaim claimId={claimId} />;

  const status = statusContent[claim.screeningStatus] ?? statusContent[claim.status] ?? statusContent.submitted;
  const submittedAt = new Date(claim.submittedAt);
  const submittedLabel = Number.isNaN(submittedAt.getTime()) ? '—' : `${dateTimeFormatter.format(submittedAt)} WIB`;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header>
        <Link to="/faskes/claims" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-riskora-700"><ArrowLeft size={15} /> Kembali ke Daftar Klaim</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div><h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[28px]">Detail Klaim</h1><p className="mt-1 text-sm text-muted">Lihat informasi lengkap dan dokumen pendukung klaim yang telah diajukan.</p></div>
          <span className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs tabular-nums text-slate-600">No. SEP: {claim.sepNumber}</span>
        </div>
      </header>

      <section className={`flex items-start gap-3 rounded-xl border p-4 ${status.className}`}>
        <CheckCircle2 size={21} className="mt-0.5 shrink-0" />
        <div><h2 className="text-sm font-semibold">{status.label}</h2><p className="mt-1 text-xs leading-5 opacity-80">{status.message}</p></div>
      </section>

      <SubmissionStatus claim={claim} />

      <section className="grid items-start gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6">
          <div className="flex items-center gap-2 border-b border-line pb-4"><ClipboardList size={19} className="text-riskora-700" /><h2 className="font-heading text-lg font-semibold">Informasi Klaim</h2></div>
          <dl className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <Info label="No. SEP" value={claim.sepNumber} mono />
            <Info label="Tanggal Pengajuan" value={submittedLabel} />
            <Info label="Jenis Pelayanan" value={claim.careType || '—'} />
            <Info label="Status Klaim" value={status.label} />
            <Info label="Nilai Klaim" value={formatCurrency(claim.claimAmount)} />
            <Info label="Kode INA-CBG Pengajuan" value={claim.submittedInaCbgCode || '—'} mono />
          </dl>
        </article>

        <article className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6">
          <div className="border-b border-line pb-4"><div className="flex items-center gap-2"><Stethoscope size={19} className="text-riskora-700" /><h2 className="font-heading text-lg font-semibold">Diagnosis, Tindakan &amp; Tarif</h2></div><p className="mt-1 text-xs text-muted">Pilih kategori untuk melihat rincian informasi klaim.</p></div>
          <div className="mt-4 space-y-2">
            <Accordion title="Informasi Diagnosis (ICD-10)" subtitle="Diagnosis utama klaim" open={openSection === 'diagnosis'} onClick={() => setOpenSection(openSection === 'diagnosis' ? '' : 'diagnosis')}>
              <span className="rounded-md bg-riskora-100 px-2 py-1 text-xs font-bold text-riskora-800">{claim.primaryDiagnosis?.code || '—'}</span>
              <p className="mt-2 text-sm font-medium">{claim.primaryDiagnosis?.description || '—'}</p>
            </Accordion>
            <Accordion title="Tindakan dan Prosedur (ICD-9-CM)" subtitle="Prosedur medis dan pemeriksaan penunjang" open={openSection === 'procedure'} onClick={() => setOpenSection(openSection === 'procedure' ? '' : 'procedure')}>
              <p className="text-xs leading-5 text-slate-600">Data tindakan akan mengikuti informasi prosedur yang dikirim bersama detail klaim.</p>
            </Accordion>
            <Accordion title="Informasi Klaim dan Tarif INA-CBG" subtitle="Kode grouper dan nilai pengajuan" open={openSection === 'tariff'} onClick={() => setOpenSection(openSection === 'tariff' ? '' : 'tariff')}>
              <div className="flex items-center justify-between gap-4 text-xs"><span className="text-muted">Kode pengajuan</span><strong className="tabular-nums">{claim.submittedInaCbgCode || '—'}</strong></div>
              <div className="mt-2 flex items-center justify-between gap-4 border-t border-line pt-2 text-xs"><span className="text-muted">Total nilai klaim</span><strong className="text-riskora-700">{formatCurrency(claim.claimAmount)}</strong></div>
              <p className="mt-3 text-[10px] leading-4 text-muted">Kode dan nilai ditampilkan sesuai data pengajuan. Riskora tidak menghitung atau memvalidasi grouping INA-CBG.</p>
            </Accordion>
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6"><div><h2 className="font-heading text-lg font-semibold">Dokumen Pendukung</h2><p className="mt-1 text-xs text-muted">Kebutuhan dokumen menyesuaikan jenis layanan dan kondisi klaim.</p></div><span className="rounded-full bg-riskora-50 px-3 py-1 text-[11px] font-semibold text-riskora-700">{claim.documents?.filter((item) => item.status === 'available').length ?? 4} Tersedia</span></div>
        {claim.documents?.length > 0 && <DocumentChecklist documents={claim.documents} />}
        <div className="grid min-h-[360px] lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2 border-b border-line p-4 lg:border-b-0 lg:border-r">
            {documents.map(({ id, label, file, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveDocument(id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${activeDocument === id ? 'border-riskora-700 bg-riskora-50' : 'border-transparent hover:bg-canvas'}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-riskora-700 shadow-sm"><Icon size={18} /></span><span className="min-w-0"><strong className="block truncate text-xs">{label}</strong><span className="mt-0.5 block truncate text-[10px] text-muted">{file}</span></span></button>)}
          </div>
          <DocumentPreview type={activeDocument} claim={claim} />
        </div>
      </section>
    </div>
  );
}

function SubmissionStatus({ claim }) {
  const steps = [
    ['E-Claim', 'Data batch disiapkan', 'complete'],
    ['RISKORA', claim.screeningStatus === 'passed' ? 'Lolos screening awal' : claim.screeningStatus === 'needs_correction' ? 'Perlu koreksi' : 'Belum diperiksa', claim.screeningStatus === 'passed' ? 'complete' : claim.screeningStatus === 'needs_correction' ? 'attention' : 'waiting'],
    ['Finalisasi Batch', claim.screeningStatus === 'passed' ? 'Menunggu klaim lain' : 'Belum siap', claim.screeningStatus === 'passed' ? 'waiting' : 'attention'],
    ['VClaim', 'Belum diteruskan dari prototipe', 'waiting'],
  ];
  return <section className="rounded-2xl border border-line bg-white p-5 shadow-panel"><div className="flex items-center gap-2"><Clock3 size={18} className="text-riskora-700" /><h2 className="font-heading text-lg font-semibold">Posisi Klaim</h2></div><p className="mt-1 text-xs text-muted">RISKORA berada setelah persiapan data E-Claim dan sebelum penerusan manual ke proses resmi VClaim.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{steps.map(([label, value, tone]) => <div key={label} className="rounded-xl border border-line bg-canvas p-3"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span><strong className={`mt-2 block text-xs ${tone === 'complete' ? 'text-riskora-700' : tone === 'attention' ? 'text-amber-700' : 'text-slate-600'}`}>{value}</strong></div>)}</div></section>;
}

function DocumentChecklist({ documents }) {
  const meta = { available: ['Tersedia', 'text-green-700 bg-green-50 border-green-200'], missing: ['Belum tersedia', 'text-amber-700 bg-amber-50 border-amber-200'], not_required: ['Tidak diperlukan', 'text-slate-500 bg-slate-50 border-slate-200'] };
  return <div className="border-b border-line bg-[#FAFCFB] p-5 sm:px-6"><h3 className="text-xs font-semibold">Checklist Dokumen {documents.length ? 'Sesuai Jenis Layanan' : ''}</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{documents.map((document) => { const [label, className] = meta[document.status] || meta.missing; return <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-xs"><span>{document.label}{document.requirement === 'conditional' && <span className="ml-1 text-[9px] text-muted">(kondisional)</span>}</span><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${className}`}>{label}</span></div>; })}</div></div>;
}

function Info({ label, value, mono = false }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</dt><dd className={`mt-1 text-sm font-medium text-riskora-950 ${mono ? 'tabular-nums' : ''}`}>{value}</dd></div>;
}

function Accordion({ title, subtitle, open, onClick, children }) {
  return <div className="overflow-hidden rounded-xl border border-line"><button type="button" onClick={onClick} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-canvas"><span><strong className="block text-xs">{title}</strong><span className="mt-0.5 block text-[10px] text-muted">{subtitle}</span></span><ChevronDown size={17} className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="border-t border-line bg-[#FAFDFB] p-4">{children}</div>}</div>;
}

function DocumentPreview({ type, claim }) {
  const active = documents.find((document) => document.id === type) ?? documents[0];
  return <div className="bg-slate-100 p-5 sm:p-7"><div className="mx-auto max-w-[700px] rounded-lg border border-line bg-white p-6 shadow-sm sm:p-8"><div className="border-b-2 border-riskora-950 pb-4 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Dokumen Pendukung Klaim</p><h3 className="mt-1 font-heading text-lg font-bold uppercase">{active.label}</h3></div><div className="mt-5 grid gap-3 text-xs sm:grid-cols-2"><Info label="No. SEP" value={claim.sepNumber} mono /><Info label="Diagnosis Utama" value={`${claim.primaryDiagnosis?.code || '—'} — ${claim.primaryDiagnosis?.description || '—'}`} /><Info label="Jenis Pelayanan" value={claim.careType || '—'} /><Info label="Nilai Klaim" value={formatCurrency(claim.claimAmount)} /></div><div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><FileText size={28} className="mx-auto text-slate-400" /><p className="mt-2 text-xs font-semibold text-slate-600">Pratinjau {active.file}</p><p className="mt-1 text-[10px] text-muted">Dokumen prototipe—berkas asli akan dimuat dari penyimpanan backend.</p></div></div></div>;
}

function EmptyClaim({ claimId }) {
  return <div className="rounded-2xl border border-line bg-white p-8 text-center"><h1 className="font-heading text-xl font-semibold">Klaim tidak ditemukan</h1><p className="mt-2 text-sm text-muted">ID klaim “{claimId}” tidak tersedia pada data Faskes saat ini.</p><Link to="/faskes/claims" className="mt-5 inline-flex text-sm font-semibold text-riskora-700">Kembali ke Daftar Klaim</Link></div>;
}
