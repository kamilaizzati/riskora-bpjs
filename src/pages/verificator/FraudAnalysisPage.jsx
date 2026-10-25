import { ArrowRight, EyeOff, GitFork, Repeat2, TrendingUp } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AnomalyClaimsDialog from '../../components/fraud/AnomalyClaimsDialog';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import useClaimsQueue from '../../hooks/useClaimsQueue';

const anomalyTypes = [
  { id: 'Upcoding', label: 'Upcoding', code: 'ANOM-UPC', icon: TrendingUp, description: 'Indikasi pengkodean diagnosis atau tindakan yang tidak sesuai dengan bukti klinis rekam medis.' },
  { id: 'Unbundling', label: 'Unbundling', code: 'ANOM-UNB', icon: GitFork, description: 'Indikasi pemisahan layanan atau tindakan yang memerlukan pemeriksaan kesesuaian aturan klaim paket.' },
  { id: 'Repeat Billing', label: 'Repeat Billing', code: 'ANOM-RPT', icon: Repeat2, description: 'Indikasi penagihan berulang yang memerlukan pemeriksaan kronologi dan resep tanggal ganda.' },
  { id: 'Phantom Billing', label: 'Phantom Billing', code: 'ANOM-PHT', icon: EyeOff, description: 'Indikasi tagihan atas pelayanan atau alat penunjang yang perlu diverifikasi bukti autentikasinya.' },
];

const trendData = [
  { month: 'Mei', Upcoding: 28, Unbundling: 22, RepeatBilling: 15, PhantomBilling: 9 },
  { month: 'Jun', Upcoding: 34, Unbundling: 25, RepeatBilling: 18, PhantomBilling: 11 },
  { month: 'Jul', Upcoding: 31, Unbundling: 28, RepeatBilling: 20, PhantomBilling: 9 },
  { month: 'Agu', Upcoding: 40, Unbundling: 31, RepeatBilling: 24, PhantomBilling: 12 },
  { month: 'Sep', Upcoding: 43, Unbundling: 34, RepeatBilling: 26, PhantomBilling: 15 },
  { month: 'Okt', Upcoding: 50, Unbundling: 40, RepeatBilling: 32, PhantomBilling: 18 },
];

export default function FraudAnalysisPage() {
  const { claims, loading, error, retry } = useClaimsQueue();
  const [selected, setSelected] = useState(null);
  const closeDialog = useCallback(() => setSelected(null), []);
  const claimsByAnomaly = useMemo(() => Object.fromEntries(anomalyTypes.map((type) => [type.id, claims.filter((claim) => claim.anomalyTypes?.includes(type.id))])), [claims]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-riskora-950 sm:text-[28px]">Analisis Fraud</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">Identifikasi pola anomali pada klaim JKN untuk mendukung investigasi lebih lanjut.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6">
        <div className="pb-5">
          <h2 className="font-heading text-xl font-bold">Daftar Pola Anomali Terdeteksi</h2>
          <p className="mt-1 text-sm text-muted">Pilih kategori anomali untuk meninjau rincian berkas dan mengeksekusi audit klinis.</p>
        </div>
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full min-w-[780px] border-collapse text-left text-sm">
            <thead><tr className="bg-canvas text-[10px] font-semibold uppercase tracking-wider text-muted"><th className="px-4 py-3">Jenis Anomali</th><th className="px-4 py-3">Deskripsi Singkat</th><th className="px-4 py-3 text-right">Jumlah Klaim</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y divide-line">
              {anomalyTypes.map((type) => { const Icon = type.icon; const count = claimsByAnomaly[type.id].length; return (
                <tr key={type.id} className="hover:bg-canvas">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${type.id === 'Phantom Billing' ? 'bg-red-100 text-red-700' : type.id === 'Repeat Billing' ? 'bg-amber-50 text-amber-700' : 'bg-riskora-100 text-riskora-800'}`}><Icon size={17} /></span><div><strong className="block text-sm">{type.label}</strong><span className="text-[10px] tabular-nums text-muted">Kode: {type.code}</span></div></div></td>
                  <td className="max-w-xl px-4 py-3 text-xs leading-5 text-muted">{type.description}</td>
                  <td className="px-4 py-3 text-right"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold tabular-nums">{count} Klaim</span></td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelected(type)} className="group inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-riskora-700 hover:bg-riskora-50">Lihat Klaim <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></button></td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6">
        <div className="mb-5"><h2 className="font-heading text-xl font-bold">Tren Temuan Anomali</h2><p className="mt-1 text-sm text-muted">Data tren enam bulan bersifat fiktif untuk kebutuhan prototipe.</p></div>
        <div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}><CartesianGrid stroke="#E5EBE7" strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} /><YAxis tick={{ fontSize: 11, fill: '#64748B' }} /><Tooltip contentStyle={{ border: '1px solid #E5EBE7', borderRadius: 10, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} /><Line type="monotone" dataKey="Upcoding" stroke="#166534" strokeWidth={2.5} /><Line type="monotone" dataKey="Unbundling" stroke="#DC2626" strokeWidth={2.5} /><Line type="monotone" dataKey="RepeatBilling" name="Repeat Billing" stroke="#D97706" strokeWidth={2.5} /><Line type="monotone" dataKey="PhantomBilling" name="Phantom Billing" stroke="#2563EB" strokeWidth={2.5} /></LineChart></ResponsiveContainer></div>
      </section>

      <AnomalyClaimsDialog anomaly={selected} claims={selected ? claimsByAnomaly[selected.id] : []} onClose={closeDialog} />
    </div>
  );
}
