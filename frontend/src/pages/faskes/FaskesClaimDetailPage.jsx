import { ArrowLeft, CheckCircle2, ChevronDown, ClipboardList, Clock3, Download, ExternalLink, FileText, HeartPulse, ReceiptText, ShieldCheck, Stethoscope } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import useFaskesClaimDetail from '../../hooks/useFaskesClaimDetail';
import { formatCurrency } from '../../utils/formatters';
import { isReadyForResubmission } from '../../utils/resubmission';

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const documentIcons = {
  discharge_summary: FileText,
  medical_resume: FileText,
  sep: ShieldCheck,
  hospital_bill: ReceiptText,
  hospital_billing: ReceiptText,
  supporting_test_result: HeartPulse,
  lab_result: HeartPulse,
  patient_identity: ClipboardList,
  patient_identity_summary: ClipboardList,
  inacbg_output: Stethoscope,
  operation_report: FileText,
  control_letter: FileText,
  consultation_response: FileText,
};

function getDocumentIcon(type) {
  return documentIcons[type] || FileText;
}

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
  const [activeDocId, setActiveDocId] = useState(null);

  // Reset active document selection when claim changes
  useEffect(() => {
    setActiveDocId(null);
  }, [claimId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;
  if (!claim) return <EmptyClaim claimId={claimId} />;

  const status = isReadyForResubmission(claim)
    ? { label: 'Siap Diajukan Ulang', message: 'Klaim sudah diperbaiki dan lolos pemeriksaan ulang. Klaim menunggu dipilih untuk batch baru.', className: 'border-blue-200 bg-blue-50 text-blue-900' }
    : statusContent[claim.screeningStatus] ?? statusContent[claim.status] ?? statusContent.submitted;
  const submittedAt = new Date(claim.submittedAt);
  const submittedLabel = Number.isNaN(submittedAt.getTime()) ? '—' : `${dateTimeFormatter.format(submittedAt)} WIB`;

  const claimDocs = claim.documents || [];
  const availableCount = claimDocs.filter((item) => item.status === 'available').length;
  const activeDocument = claimDocs.find((item) => item.id === activeDocId)
    || claimDocs.find((item) => item.status === 'available')
    || claimDocs[0]
    || null;

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
      {isReadyForResubmission(claim) && <Link to="/faskes/claims?status=ready&period=all" className="block text-sm font-semibold text-riskora-700">Lihat Klaim Siap Diajukan Ulang →</Link>}

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
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">Dokumen Pendukung</h2>
            <p className="mt-1 text-xs text-muted">Kebutuhan dokumen menyesuaikan jenis layanan dan kondisi klaim.</p>
          </div>
          <span className="rounded-full bg-riskora-50 px-3 py-1 text-[11px] font-semibold text-riskora-700">
            {availableCount} Tersedia
          </span>
        </div>

        {claimDocs.length > 0 && <DocumentChecklist documents={claimDocs} />}

        <div className="grid min-h-[460px] lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-2 border-b border-line p-4 lg:border-b-0 lg:border-r">
            {claimDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                Tidak ada dokumen pendukung terdaftar untuk klaim ini.
              </div>
            ) : (
              claimDocs.map((doc) => {
                const Icon = getDocumentIcon(doc.documentType);
                const isSelected = activeDocument?.id === doc.id;
                const isAvailable = doc.status === 'available';

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setActiveDocId(doc.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      isSelected ? 'border-riskora-700 bg-riskora-50' : 'border-transparent hover:bg-canvas'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm ${
                      isAvailable ? 'bg-white text-riskora-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1">
                        <strong className="block truncate text-xs text-riskora-950">{doc.label}</strong>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                          isAvailable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isAvailable ? 'Tersedia' : 'Belum tersedia'}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted">
                        {doc.fileName || 'Berkas belum diunggah'}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <DocumentPreview document={activeDocument} claim={claim} />
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
  return (
    <div className="border-b border-line bg-[#FAFCFB] p-5 sm:px-6">
      <h3 className="text-xs font-semibold">Checklist Dokumen {documents.length ? 'Sesuai Jenis Layanan' : ''}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => {
          const [label, className] = meta[document.status] || meta.missing;
          return (
            <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-xs">
              <span>
                {document.label}
                {document.requirement === 'conditional' && <span className="ml-1 text-[9px] text-muted">(kondisional)</span>}
              </span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${className}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</dt><dd className={`mt-1 text-sm font-medium text-riskora-950 ${mono ? 'tabular-nums' : ''}`}>{value}</dd></div>;
}

function Accordion({ title, subtitle, open, onClick, children }) {
  return <div className="overflow-hidden rounded-xl border border-line"><button type="button" onClick={onClick} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-canvas"><span><strong className="block text-xs">{title}</strong><span className="mt-0.5 block text-[10px] text-muted">{subtitle}</span></span><ChevronDown size={17} className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="border-t border-line bg-[#FAFDFB] p-4">{children}</div>}</div>;
}

function DocumentPreview({ document: doc, claim }) {
  if (!doc) {
    return (
      <div className="flex min-h-[460px] flex-col items-center justify-center p-8 text-center text-muted">
        <FileText size={36} className="text-slate-300" />
        <p className="mt-2 text-xs">Pilih dokumen di sebelah kiri untuk melihat pratinjau.</p>
      </div>
    );
  }

  const isAvailable = doc.status === 'available';
  const fileUrl = doc.previewUrl || `/api/documents/${doc.id}/preview`;
  const downloadUrl = doc.downloadUrl || doc.fileUrl || `/api/documents/${doc.id}/file`;

  return (
    <div className="flex flex-col bg-slate-50 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Pratinjau Dokumen</span>
          <h3 className="font-heading text-base font-bold text-riskora-950">{doc.label}</h3>
          <p className="mt-0.5 text-xs font-mono text-slate-500">{doc.fileName || 'Nama berkas tidak tersedia'}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAvailable ? (
            <>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ExternalLink size={13} /> Buka Tab Baru
              </a>
              <a
                href={downloadUrl}
                download={doc.fileName || `${doc.label}.pdf`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-riskora-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-riskora-800"
              >
                <Download size={13} /> Unduh PDF
              </a>
            </>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Belum Tersedia
            </span>
          )}
        </div>
      </div>

      {isAvailable ? (
        <div className="relative min-h-[580px] flex-1 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <iframe
            key={`${claim.id}-${doc.id}`}
            src={fileUrl}
            title={doc.label}
            className="h-[640px] w-full border-0"
          />
        </div>
      ) : (
        <div className="flex min-h-[460px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-8 text-center">
          <FileText size={40} className="text-amber-500" />
          <h4 className="mt-3 text-sm font-semibold text-amber-900">Berkas Dokumen Belum Tersedia</h4>
          <p className="mt-1 max-w-md text-xs leading-5 text-amber-700">
            Berkas fisik untuk dokumen &ldquo;{doc.label}&rdquo; belum diunggah atau tidak ditemukan di penyimpanan backend untuk klaim {claim.sepNumber || claim.id}.
          </p>
          <div className="mt-4 rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-[11px] text-slate-600">
            Lengkapi berkas pendukung ini agar klaim dapat diproses lebih lanjut.
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyClaim({ claimId }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-8 text-center">
      <h1 className="font-heading text-xl font-semibold">Klaim tidak ditemukan</h1>
      <p className="mt-2 text-sm text-muted">ID klaim &ldquo;{claimId}&rdquo; tidak tersedia pada data Faskes saat ini.</p>
      <Link to="/faskes/claims" className="mt-5 inline-flex text-sm font-semibold text-riskora-700">Kembali ke Daftar Klaim</Link>
    </div>
  );
}
