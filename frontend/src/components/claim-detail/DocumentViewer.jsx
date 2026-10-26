import { CheckCircle2, ChevronLeft, ChevronRight, FileText, FlaskConical, Maximize2, Minus, Plus, ReceiptText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const documentIcons = { 'medical-summary': FileText, laboratory: FlaskConical, billing: ReceiptText };

function MedicalSummary({ claim, zoom }) {
  return (
    <div className="mx-auto max-w-[620px] origin-top rounded-lg border border-slate-200 bg-white p-5 font-serif text-[11px] leading-relaxed text-slate-800 shadow-md" style={{ transform: `scale(${zoom / 100})`, marginBottom: `${Math.max(0, zoom - 100) * 4}px` }}>
      <div className="mb-4 border-b-2 border-slate-800 pb-3 text-center">
        <div className="mb-1 flex justify-between font-mono text-[8px] uppercase tracking-widest text-slate-500"><span>Komite Medis &amp; Rekam Medik</span><span>FORM-RM-04/REV.02</span></div>
        <h2 className="font-sans text-sm font-bold uppercase text-slate-900">{claim.facilityName}</h2>
        <p className="font-sans text-[9px] text-slate-600">Jl. Kesehatan No. 1 Sekip Sinduadi, Sleman, D.I. Yogyakarta 55284</p>
        <div className="mt-2 bg-slate-800 py-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-white">Resume Medis Rawat Inap (Discharge Summary)</div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 border-b border-dashed border-slate-300 pb-3 font-sans text-[10px]">
        <div><span className="text-slate-500">No. Rekam Medis:</span> <strong className="font-mono">RM-2024-889***</strong></div>
        <div><span className="text-slate-500">Ruang Perawatan:</span> <strong>Bangsal Syaraf (Kelas 1)</strong></div>
        <div><span className="text-slate-500">Tanggal Masuk:</span> <strong>20/09/2024 (10:14 WIB)</strong></div>
        <div><span className="text-slate-500">Tanggal Keluar:</span> <strong>24/09/2024 (12:30 WIB)</strong></div>
        <div><span className="text-slate-500">Nama DPJP:</span> <strong>dr. Harun Baskoro, Sp.N(K)</strong></div>
        <div><span className="text-slate-500">Kondisi Pulang:</span> <strong>Perbaikan Klinis</strong></div>
      </div>
      <div className="space-y-3 font-sans">
        <div>
          <strong className="mb-1 block text-[9px] uppercase tracking-wider text-slate-700">1. Anamnesis &amp; Keluhan Utama</strong>
          <p className="rounded border border-slate-200 bg-slate-50 p-2">Pasien datang dengan keluhan kelemahan anggota gerak sisi kanan dan bicara pelo. Riwayat hipertensi terkontrol. Keluhan muncul sekitar enam jam sebelum masuk rumah sakit.</p>
        </div>
        <div id="evidence-1" className="scroll-mt-4 border-l-4 border-red-500">
          <div className="rounded-r-md border border-red-200 bg-red-50 p-2.5">
            <div className="flex items-center justify-between gap-2"><strong className="text-[9px] uppercase tracking-wider text-red-700">2. Pemeriksaan Fisik &amp; Radiologi</strong><span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[8px] font-bold text-red-700">TEMUAN AI #1</span></div>
            <p className="mt-1">Keadaan umum sedang, <mark className="rounded bg-red-100 px-1">GCS E4M6V5 (Kompos Mentis Penuh)</mark>. Hemiparesis dekstra grade 4/5.</p>
            <p className="mt-1 border-t border-red-200 pt-1"><strong>CT-Scan Kepala:</strong> Infark lakunar fokal, tanpa edema serebri difus atau perdarahan intrakranial.</p>
          </div>
        </div>
        <div id="evidence-2" className="scroll-mt-4 border-l-4 border-amber-500">
          <div className="rounded-r-md border border-amber-300 bg-amber-50 p-2.5">
            <div className="flex items-center justify-between gap-2"><strong className="text-[9px] uppercase tracking-wider text-amber-800">3. Diagnosis Akhir &amp; Komorbiditas</strong><span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[8px] font-bold text-amber-800">TEMUAN AI #2</span></div>
            <p className="mt-1 font-medium">Diagnosis Utama: {claim.primaryDiagnosis.description} ({claim.primaryDiagnosis.code})</p>
            <p className="mt-1 rounded bg-amber-100 px-1 font-medium text-amber-950">Diagnosis Sekunder: Ensefalopati Metabolik Akut (G93.4)</p>
            <p className="mt-1 border-t border-amber-200 pt-1 text-[9px] italic text-amber-900">Catatan OCR: bukti laboratorium pendukung diagnosis sekunder belum ditemukan.</p>
          </div>
        </div>
        <div><strong className="mb-1 block text-[9px] uppercase tracking-wider text-slate-700">4. Terapi dan Pemulangan</strong><p>IV Citicoline, Aspirin, Atorvastatin, serta program rehabilitasi medik dan fisioterapi motorik harian.</p></div>
        <div className="mt-4 flex items-end justify-between border-t border-slate-300 pt-4 text-[8px] text-slate-500"><span>Dokumen terotentikasi melalui SIMRS</span><div className="text-right"><strong className="text-riskora-700">Tanda Tangan Digital Terverifikasi</strong><br />dr. Harun Baskoro, Sp.N(K)</div></div>
      </div>
    </div>
  );
}

function LaboratoryDocument({ zoom }) {
  return <div className="mx-auto max-w-[620px] origin-top rounded-lg border border-slate-200 bg-white p-6 shadow-md" style={{ transform: `scale(${zoom / 100})` }}><h2 className="border-b pb-3 text-center font-heading text-base font-bold">HASIL PEMERIKSAAN LABORATORIUM</h2><div className="mt-5 divide-y text-xs">{[['Hemoglobin', '13,8 g/dL', 'Normal'], ['Leukosit', '9.200 /µL', 'Normal'], ['Natrium', '138 mmol/L', 'Normal'], ['Kalium', '4,1 mmol/L', 'Normal'], ['Glukosa Sewaktu', '116 mg/dL', 'Normal']].map((row) => <div key={row[0]} className="grid grid-cols-3 py-3"><strong>{row[0]}</strong><span>{row[1]}</span><span className="text-riskora-700">{row[2]}</span></div>)}</div><p className="mt-5 rounded bg-amber-50 p-3 text-xs text-amber-800">Tidak terdapat pemeriksaan gas darah atau amonia pada dokumen laboratorium.</p></div>;
}

function BillingDocument({ claim, zoom }) {
  return <div className="mx-auto max-w-[620px] origin-top rounded-lg border border-slate-200 bg-white p-6 shadow-md" style={{ transform: `scale(${zoom / 100})` }}><h2 className="border-b pb-3 text-center font-heading text-base font-bold">RINCIAN TAGIHAN KLAIM</h2><div className="mt-5 divide-y text-xs">{[['Akomodasi Rawat Inap', 'Rp 4.800.000'], ['Tindakan dan Jasa Medis', 'Rp 5.250.000'], ['Farmasi dan Alat Kesehatan', 'Rp 2.200.000'], ['Pemeriksaan Penunjang', 'Rp 6.200.000']].map((row) => <div key={row[0]} className="flex justify-between py-3"><span>{row[0]}</span><strong>{row[1]}</strong></div>)}</div><div className="mt-4 flex justify-between border-t-2 border-slate-800 pt-3 text-sm"><strong>Total Pengajuan</strong><strong className="text-riskora-700">Rp {new Intl.NumberFormat('id-ID').format(claim.claimAmount)}</strong></div></div>;
}

export default function DocumentViewer({ claim }) {
  const viewerRef = useRef(null);
  const [activeDocument, setActiveDocument] = useState('medical-summary');
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const active = claim.documents.find((item) => item.id === activeDocument) ?? claim.documents[0];

  useEffect(() => {
    const showEvidence = (event) => {
      setActiveDocument('medical-summary');
      setPage(1);
      window.setTimeout(() => document.getElementById(event.detail)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    };
    window.addEventListener('riskora:show-evidence', showEvidence);
    return () => window.removeEventListener('riskora:show-evidence', showEvidence);
  }, []);

  return (
    <section ref={viewerRef} className="flex min-h-[700px] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-panel lg:h-[calc(100vh-240px)] lg:min-h-[740px]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2"><h2 className="font-heading text-sm font-semibold">Dokumen Pendukung</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">3 Dokumen</span><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-riskora-700"><CheckCircle2 size={13} /> OCR Selesai</span></div>
        <div className="flex items-center gap-1 rounded-lg bg-[#F2FBF6] p-1 text-xs text-slate-600">
          <button type="button" onClick={() => setZoom((value) => Math.max(80, value - 10))} className="rounded p-1 hover:bg-white" aria-label="Perkecil dokumen"><Minus size={14} /></button><span className="w-10 text-center tabular-nums">{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(120, value + 10))} className="rounded p-1 hover:bg-white" aria-label="Perbesar dokumen"><Plus size={14} /></button>
          <span className="mx-1 h-4 w-px bg-line" /><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded p-1 hover:bg-white" aria-label="Halaman sebelumnya"><ChevronLeft size={14} /></button><span>Hal {page} dari {active.pages}</span><button type="button" onClick={() => setPage((value) => Math.min(active.pages, value + 1))} className="rounded p-1 hover:bg-white" aria-label="Halaman berikutnya"><ChevronRight size={14} /></button><span className="mx-1 h-4 w-px bg-line" /><button type="button" onClick={() => viewerRef.current?.requestFullscreen?.()} className="rounded p-1 hover:bg-white" aria-label="Tampilkan dokumen layar penuh"><Maximize2 size={14} /></button>
        </div>
      </div>
      <div className="flex overflow-x-auto border-b border-line bg-[#F7FAF8] px-4 pt-2">
        {claim.documents.map((document) => { const Icon = documentIcons[document.id]; return <button key={document.id} type="button" onClick={() => { setActiveDocument(document.id); setPage(1); }} className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold ${activeDocument === document.id ? 'border-b-2 border-riskora-700 bg-white text-riskora-700' : 'text-slate-600 hover:text-riskora-950'}`}><Icon size={15} /> {document.label}</button>; })}
      </div>
      <div id="claim-document-scroll" className="flex-1 overflow-auto bg-slate-100/70 p-4">
        {activeDocument === 'medical-summary' && <MedicalSummary claim={claim} zoom={zoom} />}
        {activeDocument === 'laboratory' && <LaboratoryDocument zoom={zoom} />}
        {activeDocument === 'billing' && <BillingDocument claim={claim} zoom={zoom} />}
      </div>
    </section>
  );
}
