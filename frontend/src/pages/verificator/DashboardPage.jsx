import { ChartNoAxesColumnIncreasing, CheckCircle2, ClipboardCheck, FileSearch, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import AnomalyDistributionChart from '../../components/charts/AnomalyDistributionChart';
import ScreeningResultsChart from '../../components/charts/ScreeningResultsChart';
import DataTable from '../../components/ui/DataTable';
import ErrorState from '../../components/ui/ErrorState';
import FilterTabs from '../../components/ui/FilterTabs';
import LoadingState from '../../components/ui/LoadingState';
import SearchInput from '../../components/ui/SearchInput';
import StatCard from '../../components/ui/StatCard';
import useVerificatorDashboard from '../../hooks/useVerificatorDashboard';
import { formatNumber } from '../../utils/formatters';

export default function DashboardPage() {
  const { data, loading, error, retry } = useVerificatorDashboard();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const claims = useMemo(() => data?.priorityClaims ?? [], [data?.priorityClaims]);
  const counts = useMemo(() => ({
    all: claims.length,
    high: claims.filter((claim) => claim.riskLevel === 'high').length,
    investigation: claims.filter((claim) => claim.status === 'needs_investigation').length,
    pending: claims.filter((claim) => claim.status === 'pending_verification').length,
  }), [claims]);

  const visibleClaims = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('id-ID');
    return claims.filter((claim) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'high' && claim.riskLevel === 'high') ||
        (filter === 'investigation' && claim.status === 'needs_investigation') ||
        (filter === 'pending' && claim.status === 'pending_verification');
      const searchable = [
        claim.sepNumber,
        claim.facilityName,
        claim.facilityMeta,
        claim.primaryDiagnosis?.code,
        claim.primaryDiagnosis?.description,
      ].filter(Boolean).join(' ').toLocaleLowerCase('id-ID');
      return matchesFilter && (!needle || searchable.includes(needle));
    });
  }, [claims, filter, query]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  const summary = data?.summary ?? {};
  const stats = [
    { label: 'Menunggu Verifikasi', value: summary.pendingVerification, description: 'Klaim yang belum ditinjau', icon: ClipboardCheck, tone: 'default' },
    { label: 'Risiko Tinggi', value: summary.highRisk, description: 'Klaim indikasi risiko tinggi', icon: ShieldAlert, tone: 'danger' },
    { label: 'Dalam Review', value: summary.inReview, description: 'Klaim yang sedang ditinjau', icon: FileSearch, tone: 'warning' },
    { label: 'Selesai Diverifikasi', value: summary.completed, description: 'Klaim dengan review selesai', icon: CheckCircle2, tone: 'success' },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-riskora-950 sm:text-[28px]">Dashboard Verifikator</h1>
        <p className="mt-1 text-sm text-slate-600">Pantau antrean verifikasi dan tinjau klaim yang membutuhkan perhatian.</p>
      </header>

      <section aria-label="Ringkasan verifikasi" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} value={formatNumber(stat.value)} />)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel" aria-labelledby="priority-title">
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <h2 id="priority-title" className="font-heading text-xl font-semibold text-riskora-950">Klaim Prioritas Verifikasi</h2>
          <p className="mt-1 text-sm text-muted">Daftar klaim yang membutuhkan perhatian berdasarkan hasil screening dan tingkat risiko.</p>
        </div>
        <div className="flex flex-col gap-3 border-b border-line bg-[#FAFDFB] px-5 py-3 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput value={query} onChange={setQuery} placeholder="Cari No. SEP, faskes, atau diagnosis..." />
          <FilterTabs activeFilter={filter} onChange={setFilter} counts={counts} />
        </div>
        <DataTable
          claims={visibleClaims}
          emptyTitle={claims.length ? 'Klaim tidak ditemukan' : 'Belum ada klaim prioritas'}
          emptyDescription={claims.length ? 'Ubah kata kunci atau filter untuk melihat klaim lainnya.' : 'Klaim yang membutuhkan perhatian akan muncul setelah hasil screening tersedia.'}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2" aria-label="Analitik dashboard">
        <article className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-semibold text-riskora-950">Distribusi Temuan Anomali</h2>
              <p className="mt-1 text-sm text-muted">Jenis indikasi yang paling sering ditemukan pada klaim.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E2F7ED] text-riskora-700">
              <ChartNoAxesColumnIncreasing size={20} />
            </span>
          </div>
          <div className="mt-4"><AnomalyDistributionChart data={data?.anomalyDistribution} /></div>
        </article>

        <article className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6">
          <div>
            <h2 className="font-heading text-xl font-semibold text-riskora-950">Hasil Screening Klaim</h2>
            <p className="mt-1 text-sm text-muted">Distribusi hasil pemeriksaan awal oleh Riskora.</p>
          </div>
          <ScreeningResultsChart data={data?.screeningResults} />
        </article>
      </section>
    </div>
  );
}
