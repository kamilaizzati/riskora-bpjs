import { ArrowLeft, ArrowRight, Check, CheckCircle2, Database, FileSearch, FileText, Hospital, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { submitFaskesClaimForScreening } from '../../services/faskesService';
import { formatCurrency } from '../../utils/formatters';

const steps = ['Data Klaim', 'Coding & Grouping', 'Dokumen', 'Pencocokan AI', 'Review'];
const documentTypes = [
  { id: 'medical_resume', label: 'Resume Medis', required: true },
  { id: 'sep', label: 'Surat Eligibilitas Peserta', required: true },
  { id: 'billing', label: 'Billing Rumah Sakit', required: true },
  { id: 'supporting', label: 'Dokumen Penunjang', required: false },
];

const initialForm = {
  claim: { sepNumber: '', encounterId: '', careType: 'Rawat Inap', careClass: 'Kelas 1', unit: '', attendingDoctor: '', admissionDate: '', dischargeDate: '' },
  clinical: { primaryDiagnosis: { code: '', description: '' }, secondaryDiagnoses: '', procedures: '' },
  financial: { hospitalBilling: '', claimAmount: '', inaCbgCode: '', source: 'manual_unvalidated' },
};

const simrsExample = {
    claim: { sepNumber: '0182R0011024V009821', encounterId: 'ENC-RI-2024-09821', careType: 'Rawat Inap', careClass: 'Kelas 1', unit: 'Neurologi', attendingDoctor: 'dr. Anindita, Sp.N', admissionDate: '2024-10-10', dischargeDate: '2024-10-14' },
    clinical: { primaryDiagnosis: { code: 'I63.9', description: 'Stroke Iskemik Akut' }, secondaryDiagnoses: 'I10 — Hipertensi esensial', procedures: '88.38 — CT Scan kepala non-kontras' },
    financial: { hospitalBilling: '18450000', claimAmount: '', inaCbgCode: '', source: 'simrs_demo_import' },
};

export default function FaskesClaimSubmissionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState('manual');
  const [eclaimImported, setEclaimImported] = useState(false);
  const [eclaimFileName, setEclaimFileName] = useState('');
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState({});
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const facilityName = user?.facilityName || user?.organization || 'Fasilitas Kesehatan';

  const requiredDocumentsReady = documentTypes.filter((item) => item.required).every((item) => files[item.id]);
  const stepValid = useMemo(() => [
    Boolean(form.claim.sepNumber && form.claim.encounterId && form.claim.unit && form.claim.attendingDoctor && form.claim.admissionDate && form.claim.dischargeDate),
    Boolean(form.clinical.primaryDiagnosis.code && form.clinical.primaryDiagnosis.description && form.financial.claimAmount),
    requiredDocumentsReady,
    parsed,
    confirmed,
  ], [confirmed, form, parsed, requiredDocumentsReady]);

  const update = (group, field) => (event) => {
    setForm((current) => ({ ...current, [group]: { ...current[group], [field]: event.target.value } }));
    setParsed(false);
    setConfirmed(false);
  };
  const updateDiagnosis = (field) => (event) => {
    setForm((current) => ({ ...current, clinical: { ...current.clinical, primaryDiagnosis: { ...current.clinical.primaryDiagnosis, [field]: event.target.value } } }));
    setParsed(false);
    setConfirmed(false);
  };
  const importSimrs = (lookupValue) => {
    setSource('simrs');
    setForm({ ...structuredClone(simrsExample), claim: { ...simrsExample.claim, sepNumber: lookupValue || simrsExample.claim.sepNumber } });
    setEclaimImported(false);
    setParsed(false);
    setConfirmed(false);
  };
  const useManual = () => {
    setSource('manual');
    setForm(structuredClone(initialForm));
    setEclaimImported(false);
    setEclaimFileName('');
    setParsed(false);
    setConfirmed(false);
  };
  const importEclaim = (file) => {
    setEclaimImported(true);
    setEclaimFileName(file.name);
    setForm((current) => ({ ...current, financial: { ...current.financial, claimAmount: current.financial.hospitalBilling || '18450000', inaCbgCode: 'DEMO-I-4-10-I', source: 'eclaim_demo_import' } }));
    setParsed(false);
    setConfirmed(false);
  };

  const next = () => {
    if (!stepValid[step]) return setError('Lengkapi bagian wajib sebelum melanjutkan.');
    setError('');
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const runParsing = () => {
    setParsing(true);
    setError('');
    window.setTimeout(() => {
      setParsing(false);
      setParsed(true);
    }, 700);
  };

  const submit = async () => {
    if (!stepValid[4]) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        source,
        facility: { facilityId: user?.facilityId || null, facilityName },
        ...form,
        documents: Object.entries(files).map(([type, file]) => ({ type, name: file.name, mimeType: file.type, size: file.size })),
        parsingReview: { reviewedByUser: true, confirmedAt: new Date().toISOString() },
      };
      setResult(await submitFaskesClaimForScreening(payload));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1380px] space-y-5">
      <header>
        <Link to="/faskes/claims" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-riskora-700"><ArrowLeft size={15} /> Kembali ke Daftar Klaim</Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-[28px]">Pengajuan Klaim Baru</h1>
        <p className="mt-1 text-sm text-muted">Siapkan data dan dokumen untuk pre-screening Riskora sebelum proses pengajuan resmi.</p>
      </header>

      <ol className="grid grid-cols-5 overflow-hidden rounded-xl border border-line bg-white shadow-panel">
        {steps.map((label, index) => <li key={label} className={`relative flex min-h-[66px] items-center gap-2 border-r border-line px-3 last:border-r-0 ${index === step ? 'bg-riskora-50' : ''}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index < step ? 'bg-riskora-700 text-white' : index === step ? 'border-2 border-riskora-700 text-riskora-700' : 'border border-slate-300 text-slate-400'}`}>{index < step ? <Check size={13} /> : index + 1}</span><span className={`hidden text-xs font-semibold sm:block ${index === step ? 'text-riskora-800' : 'text-slate-500'}`}>{label}</span></li>)}
      </ol>

      <section className="min-h-[470px] rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-7">
        {step === 0 && <ClaimStep form={form.claim} update={update} source={source} facilityName={facilityName} onImportSimrs={importSimrs} onManual={useManual} />}
        {step === 1 && <ClinicalStep form={form} update={update} updateDiagnosis={updateDiagnosis} eclaimImported={eclaimImported} eclaimFileName={eclaimFileName} onImportEclaim={importEclaim} />}
        {step === 2 && <DocumentsStep files={files} setFiles={(updater) => { setFiles(updater); setParsed(false); setConfirmed(false); }} />}
        {step === 3 && <ParsingStep form={form} parsing={parsing} parsed={parsed} runParsing={runParsing} />}
        {step === 4 && <ReviewStep form={form} files={files} facilityName={facilityName} source={source} eclaimImported={eclaimImported} eclaimFileName={eclaimFileName} confirmed={confirmed} setConfirmed={setConfirmed} />}
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><button type="button" disabled={step === 0} onClick={() => { setError(''); setStep((current) => current - 1); }} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-40"><ArrowLeft size={16} /> Sebelumnya</button><span className="ml-3 hidden text-[10px] text-muted md:inline">Data masih berupa draft lokal sampai dikirim untuk pre-screening.</span></div>{step < 4 ? <button type="button" onClick={next} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-riskora-700 px-5 text-sm font-semibold text-white hover:bg-riskora-800">Berikutnya <ArrowRight size={16} /></button> : <button type="button" disabled={!stepValid[4] || submitting} onClick={submit} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-riskora-700 px-6 text-sm font-semibold text-white hover:bg-riskora-800 disabled:cursor-not-allowed disabled:opacity-40">{submitting ? 'Mengirim...' : 'Kirim untuk Pre-screening Riskora'} {!submitting && <ArrowRight size={17} />}</button>}</div>
      {result && <SuccessModal result={result} onFinish={() => navigate('/faskes/claims')} />}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return <div className="border-b border-line pb-5"><div className="flex items-center gap-2"><Icon size={20} className="text-riskora-700" /><h2 className="font-heading text-xl font-semibold">{title}</h2></div><p className="mt-1 text-sm text-muted">{description}</p></div>;
}

function ClaimStep({ form, update, source, facilityName, onImportSimrs, onManual }) {
  const [lookup, setLookup] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState(false);
  const searchSimrs = () => {
    if (!lookup.trim()) return;
    setSearching(true);
    setFound(false);
    window.setTimeout(() => { setSearching(false); setFound(true); }, 550);
  };

  return <div><SectionTitle icon={Hospital} title="Data Klaim" description="Cari episode pelayanan di SIMRS/RME, lalu gunakan hasilnya untuk mengisi form. Input manual tetap tersedia sebagai fallback." />
    <div className="mt-5 rounded-xl border border-line bg-canvas p-4">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-riskora-700"><Database size={20} /></span><div><strong className="text-sm">Cari episode di SIMRS/RME</strong><p className="mt-0.5 text-xs text-muted">Masukkan No. SEP atau ID kunjungan dari {facilityName}.</p></div></div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={lookup} onChange={(event) => { setLookup(event.target.value); setFound(false); }} onKeyDown={(event) => event.key === 'Enter' && searchSimrs()} placeholder="No. SEP / ID kunjungan" className="field mt-0 flex-1" /><button type="button" disabled={!lookup.trim() || searching} onClick={searchSimrs} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-riskora-700 px-4 text-xs font-semibold text-white disabled:opacity-50">{searching && <LoaderCircle size={15} className="animate-spin" />}{searching ? 'Mencari...' : 'Cari di SIMRS/RME'}</button><button type="button" onClick={() => { setFound(false); onManual(); }} className="h-11 rounded-lg border border-line bg-white px-4 text-xs font-semibold">Isi Manual</button></div>
      {found && <div className="mt-4 rounded-xl border border-green-200 bg-white p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-green-700" /><strong className="text-sm">1 episode ditemukan</strong></div><div className="mt-3 grid gap-x-8 gap-y-2 text-xs sm:grid-cols-3"><span><span className="block text-[9px] uppercase text-muted">No. SEP</span>{lookup}</span><span><span className="block text-[9px] uppercase text-muted">Pelayanan</span>Rawat Inap • Neurologi</span><span><span className="block text-[9px] uppercase text-muted">Periode</span>10–14 Okt 2024</span></div></div><button type="button" onClick={() => { onImportSimrs(lookup); setFound(false); }} className="shrink-0 rounded-lg bg-riskora-700 px-4 py-2 text-xs font-semibold text-white">Gunakan data ini</button></div></div>}
      {source === 'simrs' && <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-green-700"><CheckCircle2 size={15} /> Data episode di bawah telah diisi dari simulasi SIMRS/RME.</p>}
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Nomor SEP *"><input value={form.sepNumber} onChange={update('claim', 'sepNumber')} placeholder="Contoh: 0182R001..." className="field" /></Field><Field label="ID Episode/Kunjungan *"><input value={form.encounterId} onChange={update('claim', 'encounterId')} placeholder="ENC-2024-001" className="field" /></Field><Field label="Jenis Pelayanan *"><select value={form.careType} onChange={update('claim', 'careType')} className="field"><option>Rawat Inap</option><option>Rawat Jalan</option><option>IGD</option></select></Field><Field label="Kelas/Poli"><input value={form.careClass} onChange={update('claim', 'careClass')} placeholder="Kelas 1" className="field" /></Field><Field label="Unit Pelayanan *"><input value={form.unit} onChange={update('claim', 'unit')} placeholder="Neurologi" className="field" /></Field><Field label="DPJP *"><input value={form.attendingDoctor} onChange={update('claim', 'attendingDoctor')} placeholder="Nama dokter" className="field" /></Field><Field label="Tanggal Masuk *"><input type="date" value={form.admissionDate} onChange={update('claim', 'admissionDate')} className="field" /></Field><Field label="Tanggal Keluar *"><input type="date" value={form.dischargeDate} onChange={update('claim', 'dischargeDate')} className="field" /></Field></div>
  </div>;
}

function ClinicalStep({ form, update, updateDiagnosis, eclaimImported, eclaimFileName, onImportEclaim }) {
  const [selectedFile, setSelectedFile] = useState(null);
  return <div><SectionTitle icon={FileSearch} title="Coding & Hasil Grouping" description="Konfirmasi coding Casemix. Jika grouping sudah dilakukan tetapi klaim belum dikirim ke BPJS, tambahkan hasil ekspor E-Klaim sebagai pembanding." />
    <div className={`mt-5 rounded-xl border p-4 ${eclaimImported ? 'border-green-200 bg-green-50' : 'border-line bg-canvas'}`}>
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-riskora-700"><FileText size={19} /></span><div><strong className="text-sm">Impor hasil E-Klaim <span className="font-normal text-muted">(opsional)</span></strong><p className="mt-1 text-xs leading-5 text-muted">Pilih file ekspor yang dibuat sebelum pengajuan resmi. Format integrasi produksi masih perlu dikonfirmasi bersama rumah sakit.</p></div></div>
      {!eclaimImported && <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 text-xs font-semibold text-riskora-700 hover:border-riskora-600"><UploadCloud size={17} />{selectedFile ? selectedFile.name : 'Pilih file ekspor simulasi (.json, .txt, atau .csv)'}<input type="file" accept=".json,.txt,.csv,application/json,text/plain,text/csv" className="sr-only" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} /></label>}
      {selectedFile && !eclaimImported && <div className="mt-3 rounded-lg border border-line bg-white p-3"><div className="grid gap-2 text-xs sm:grid-cols-3"><span><span className="block text-[9px] uppercase text-muted">Kode grouping</span>DEMO-I-4-10-I</span><span><span className="block text-[9px] uppercase text-muted">Tarif hasil ekspor</span>Rp18.450.000</span><span><span className="block text-[9px] uppercase text-muted">Status</span>Belum dikirim ke BPJS</span></div><button type="button" onClick={() => onImportEclaim(selectedFile)} className="mt-3 rounded-lg bg-riskora-700 px-4 py-2 text-xs font-semibold text-white">Gunakan hasil ekspor ini</button></div>}
      {eclaimImported && <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-white p-3"><div className="min-w-0"><p className="flex items-center gap-1.5 text-xs font-semibold text-green-800"><CheckCircle2 size={15} /> Hasil E-Klaim berhasil dimuat</p><p className="mt-1 truncate text-[10px] text-muted">{eclaimFileName}</p></div><label className="cursor-pointer text-xs font-semibold text-riskora-700">Ganti file<input type="file" accept=".json,.txt,.csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setSelectedFile(file); onImportEclaim(file); } }} /></label></div>}
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Kode Diagnosis Utama *"><input value={form.clinical.primaryDiagnosis.code} onChange={updateDiagnosis('code')} placeholder="Contoh: I63.9" className="field" /></Field><Field label="Deskripsi Diagnosis Utama *"><input value={form.clinical.primaryDiagnosis.description} onChange={updateDiagnosis('description')} placeholder="Diagnosis sesuai resume" className="field" /></Field><Field label="Diagnosis Sekunder"><textarea value={form.clinical.secondaryDiagnoses} onChange={update('clinical', 'secondaryDiagnoses')} placeholder="Satu diagnosis per baris" className="field min-h-24 py-3" /></Field><Field label="Tindakan/Prosedur"><textarea value={form.clinical.procedures} onChange={update('clinical', 'procedures')} placeholder="Kode dan nama prosedur" className="field min-h-24 py-3" /></Field><Field label="Total Billing Rumah Sakit"><input type="number" value={form.financial.hospitalBilling} onChange={update('financial', 'hospitalBilling')} placeholder="0" className="field" /></Field><Field label="Nilai Klaim Diajukan *"><input type="number" value={form.financial.claimAmount} onChange={update('financial', 'claimAmount')} placeholder="0" className="field" /></Field><Field label="Kode Hasil E-Klaim/INA-CBG"><input value={form.financial.inaCbgCode} onChange={update('financial', 'inaCbgCode')} placeholder="Opsional—diimpor jika tersedia" className="field" /></Field></div><p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Riskora hanya membaca dan membandingkan hasil yang dimasukkan atau diimpor. Riskora tidak menghitung ataupun menetapkan grouping INA-CBG.</p>
  </div>;
}

function DocumentsStep({ files, setFiles }) {
  const setFile = (id, file) => setFiles((current) => ({ ...current, [id]: file }));
  return <div><SectionTitle icon={UploadCloud} title="Dokumen Pendukung" description="Unggah dokumen per kategori agar sumber data dan hasil parsing dapat dilacak." /><div className="mt-6 grid gap-3 sm:grid-cols-2">{documentTypes.map((document) => <label key={document.id} className={`flex min-h-[112px] cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${files[document.id] ? 'border-green-200 bg-green-50' : 'border-dashed border-slate-300 hover:border-riskora-600 hover:bg-riskora-50'}`}><input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(event) => setFile(document.id, event.target.files?.[0] || null)} /><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white ${files[document.id] ? 'text-green-700' : 'text-slate-400'}`}>{files[document.id] ? <CheckCircle2 size={20} /> : <FileText size={20} />}</span><span className="min-w-0"><span className="flex items-center gap-2"><strong className="text-sm">{document.label}</strong>{document.required && <span className="text-[10px] font-semibold text-red-600">Wajib</span>}</span><span className="mt-1 block truncate text-xs text-muted">{files[document.id]?.name || 'PDF, JPG, atau PNG maksimal mengikuti backend'}</span></span></label>)}</div><p className="mt-5 text-[10px] leading-4 text-muted">Prototype hanya menyimpan metadata berkas selama sesi. Berkas pasien asli tidak dikirim ke layanan eksternal.</p></div>;
}

function ParsingStep({ form, parsing, parsed, runParsing }) {
  return <div><SectionTitle icon={FileSearch} title="Pencocokan Data & Dokumen" description="Riskora membaca dokumen lalu membandingkan kandidat hasil ekstraksi dengan data yang disiapkan Casemix." /><div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-line bg-canvas p-4 sm:flex-row sm:items-center"><div><strong className="text-sm">Parsing dokumen prototype</strong><p className="mt-1 text-xs text-muted">OCR/AI disimulasikan; tidak ada berkas yang dikirim ke layanan eksternal.</p></div><button type="button" disabled={parsing} onClick={runParsing} className="inline-flex h-10 items-center gap-2 rounded-lg bg-riskora-700 px-4 text-xs font-semibold text-white disabled:opacity-60">{parsing ? <LoaderCircle size={16} className="animate-spin" /> : <FileSearch size={16} />}{parsed ? 'Jalankan Ulang' : 'Jalankan Pencocokan'}</button></div>{!parsed ? <div className="mt-5 rounded-xl border-2 border-dashed border-slate-200 p-14 text-center"><FileSearch size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Belum ada hasil pencocokan</p><p className="mt-1 text-xs text-muted">Jalankan simulasi untuk menampilkan perbandingan field.</p></div> : <div className="mt-5 space-y-3"><ComparisonRow label="Nomor SEP" formValue={form.claim.sepNumber} documentValue={form.claim.sepNumber} confidence="99%" /><ComparisonRow label="Tanggal Keluar" formValue={form.claim.dischargeDate} documentValue={form.claim.dischargeDate} confidence="96%" /><ComparisonRow label="Diagnosis Utama" formValue={form.clinical.primaryDiagnosis.code} documentValue={form.clinical.primaryDiagnosis.code} confidence="92%" /><ComparisonRow label="Total Billing" formValue={formatCurrency(form.financial.hospitalBilling)} documentValue={formatCurrency(form.financial.hospitalBilling)} confidence="94%" /><p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">Hasil di atas adalah kandidat ekstraksi. Keputusan akhir tetap harus dikonfirmasi oleh Tim Casemix.</p></div>}</div>;
}

function ReviewStep({ form, files, facilityName, source, eclaimImported, eclaimFileName, confirmed, setConfirmed }) {
  return <div><SectionTitle icon={CheckCircle2} title="Review Akhir" description="Pastikan paket klaim siap menjalani quality check internal Riskora sebelum pengajuan resmi ke BPJS." /><div className="mt-6 grid gap-5 lg:grid-cols-2"><div className="rounded-xl border border-line bg-canvas p-5"><h3 className="text-sm font-semibold">Ringkasan Klaim</h3><dl className="mt-4 space-y-3 text-xs"><Summary label="Faskes" value={facilityName} /><Summary label="Sumber data episode" value={source === 'simrs' ? 'SIMRS/RME (simulasi)' : 'Input manual'} /><Summary label="No. SEP" value={form.claim.sepNumber} /><Summary label="Pelayanan" value={`${form.claim.careType} • ${form.claim.unit}`} /><Summary label="Diagnosis" value={`${form.clinical.primaryDiagnosis.code} — ${form.clinical.primaryDiagnosis.description}`} /><Summary label="Nilai Pengajuan" value={formatCurrency(form.financial.claimAmount)} /></dl></div><div className="rounded-xl border border-line p-5"><h3 className="text-sm font-semibold">Kesiapan Paket</h3><div className="mt-4 space-y-3"><ReadyRow label="Data episode dan pelayanan" /><ReadyRow label="Coding dikonfirmasi Tim Casemix" /><ReadyRow label={`${Object.values(files).filter(Boolean).length} dokumen pendukung tersedia`} /><ReadyRow label="Pencocokan data dan dokumen selesai" /><div className={`rounded-lg border p-3 text-xs ${eclaimImported ? 'border-green-200 bg-green-50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{eclaimImported ? `Hasil grouping dari ${eclaimFileName} disertakan sebagai pembanding.` : 'Hasil E-Klaim tidak disertakan. Ini diperbolehkan untuk alur sebelum grouping.'}</div></div></div></div><label className="mt-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-xs leading-5"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-riskora-700" /><span><strong className="block">Konfirmasi Tim Casemix</strong>Saya telah meninjau data, dokumen, dan hasil pencocokan. Paket ini siap dikirim untuk pre-screening Riskora dan belum merupakan pengajuan resmi ke BPJS.</span></label></div>;
}

function Field({ label, children }) { return <label className="text-xs font-semibold text-riskora-950">{label}{children}</label>; }
function Summary({ label, value }) { return <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0"><dt className="text-muted">{label}</dt><dd className="max-w-[65%] text-right font-semibold">{value || '—'}</dd></div>; }
function ComparisonRow({ label, formValue, documentValue, confidence }) { return <div className="grid gap-3 rounded-xl border border-line p-3 text-xs sm:grid-cols-[0.8fr_1fr_1fr_auto] sm:items-center"><strong>{label}</strong><div><span className="block text-[9px] uppercase text-muted">Data Klaim</span><span className="mt-1 block truncate">{formValue || '—'}</span></div><div><span className="block text-[9px] uppercase text-muted">Hasil Dokumen</span><span className="mt-1 block truncate">{documentValue || '—'}</span></div><span className="rounded bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">Cocok • {confidence}</span></div>; }
function ReadyRow({ label }) { return <div className="flex items-center gap-2 text-xs"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700"><Check size={12} /></span><span>{label}</span></div>; }

function SuccessModal({ result, onFinish }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="relative w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl"><button type="button" onClick={onFinish} className="absolute right-4 top-4 text-slate-400" aria-label="Tutup"><X size={20} /></button><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700"><CheckCircle2 size={34} /></span><span className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">Dalam Screening</span><h2 className="mt-3 font-heading text-xl font-semibold">Klaim berhasil dikirim ke pre-screening.</h2><p className="mt-2 text-sm leading-6 text-muted">ID klaim <strong className="text-riskora-950">{result.claimId}</strong> telah dicatat pada mode prototype. Pengajuan ini belum dikirim ke BPJS.</p><button type="button" onClick={onFinish} className="mt-5 w-full rounded-lg bg-riskora-700 py-3 text-sm font-semibold text-white">Lihat Daftar Klaim</button></div></div>;
}
