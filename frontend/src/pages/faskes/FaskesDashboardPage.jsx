import { ArrowRight, CheckCircle2, ClipboardList, Layers3, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import FaskesActivityFeed from '../../components/faskes/FaskesActivityFeed';
import FaskesScreeningClaimsTable from '../../components/faskes/FaskesScreeningClaimsTable';
import FaskesScreeningChart from '../../components/faskes/FaskesScreeningChart';
import PeriodSelector from '../../components/faskes/PeriodSelector';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { useFaskesDashboard } from '../../hooks/useFaskesWorkflow';
import { formatNumber } from '../../utils/formatters';

export default function FaskesDashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('2026-10');
  const { data, periods, loading, error, retry } = useFaskesDashboard(period);
  const facilityName = user?.facilityName || user?.organization || 'Fasilitas Kesehatan';

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  const summary = data?.summary ?? {};
  const stats = [
    { label: 'Batch Aktif', value: summary.activeBatches ?? 1, description: 'Batch E-Claim periode terpilih', icon: Layers3, tone: 'default' },
    { label: 'Total Klaim Screening', value: summary.totalClaims, description: 'Klaim dalam batch terpilih', icon: ClipboardList, tone: 'info' },
    { label: 'Lolos Screening Awal', value: summary.screeningPassed ?? summary.vclaimMatching, description: 'Siap menuju finalisasi', icon: CheckCircle2, tone: 'success' },
    { label: 'Perlu Perbaikan', value: summary.needsCorrection, description: 'Umpan balik tidak sesuai', icon: Wrench, tone: 'warning' },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-riskora-950 sm:text-[28px]">Dashboard Faskes</h1>
            <span className="rounded-full border border-green-200 bg-riskora-50 px-3 py-1 text-[11px] font-semibold text-riskora-700">{facilityName}</span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Pantau pengajuan, hasil screening, dan tindak lanjut klaim JKN {facilityName} secara berkala.</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end"><PeriodSelector value={period} periods={periods} onChange={setPeriod} /><Link to="/faskes/claims/new" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-riskora-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-riskora-800"><Layers3 size={17} /> Upload Batch E-Claim</Link></div>
      </header>

      <section aria-label="Ringkasan klaim faskes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} value={formatNumber(stat.value)} />)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel" aria-labelledby="action-claims-title">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div><h2 id="action-claims-title" className="font-heading text-xl font-semibold">Klaim yang Memerlukan Tindakan</h2><p className="mt-1 text-sm text-muted">Temuan pre-screening yang harus diperbaiki sebelum finalisasi batch.</p></div>
          <Link to="/faskes/claims" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-riskora-700 hover:text-riskora-800">Lihat Semua Klaim <ArrowRight size={15} /></Link>
        </div>
        <FaskesScreeningClaimsTable claims={(data?.actionRequiredClaims ?? []).slice(0, 5)} compact />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <article className="rounded-2xl border border-line bg-white p-5 shadow-panel">
          <h2 className="font-heading text-xl font-semibold">Distribusi Hasil Pre-screening</h2>
          <p className="mt-1 text-sm text-muted">Ringkasan pemeriksaan awal RISKORA sebelum proses resmi VClaim.</p>
          <div className="mt-2"><FaskesScreeningChart data={data?.statusDistribution ?? []} /></div>
        </article>
        <article className="rounded-2xl border border-line bg-white p-5 shadow-panel">
          <h2 className="font-heading text-xl font-semibold">Aktivitas Batch Terbaru</h2>
          <p className="mt-1 text-sm text-muted">Pembaruan pre-screening dan pencatatan handoff manual.</p>
          <div className="mt-3"><FaskesActivityFeed activities={data?.recentActivities ?? []} /></div>
        </article>
      </section>
    </div>
  );
}
