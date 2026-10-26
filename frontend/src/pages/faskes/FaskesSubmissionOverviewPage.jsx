import { CheckCircle2, ClipboardList, FileCheck2, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PeriodSelector from '../../components/faskes/PeriodSelector';
import SubmissionWorkflowTracker from '../../components/faskes/SubmissionWorkflowTracker';
import { BavStatusPanel, SupportingDocumentPanel } from '../../components/faskes/SubmissionStatusPanels';
import VclaimFeedbackSection from '../../components/faskes/VclaimFeedbackSection';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { useFaskesSubmission } from '../../hooks/useFaskesWorkflow';
import { formatNumber } from '../../utils/formatters';

export default function FaskesSubmissionOverviewPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [period, setPeriod] = useState(searchParams.get('period') || '2026-10');
  const { data, periods, loading, error, retry } = useFaskesSubmission(period);
  const facilityName = user?.facilityName || user?.organization || data?.facility?.name || 'Fasilitas Kesehatan';
  const correctionClaims = useMemo(() => (data?.claims || []).filter((claim) => claim.vclaimStatus === 'non_matching'), [data?.claims]);

  const jumpToSection = (stage) => {
    const target = stage === 'vclaim' ? 'vclaim-section' : stage === 'jkn_drive' ? 'jkn-drive-section' : stage === 'bav' ? 'bav-section' : 'workflow-title';
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  const documents = data?.supportingDocuments || {};
  const stats = [
    { label: 'Total Klaim', value: data?.totalClaims, description: 'Agregat simulasi dalam periode', icon: ClipboardList, tone: 'default' },
    { label: 'Sesuai VClaim', value: data?.vclaimMatching, description: 'Cocok secara administratif', icon: CheckCircle2, tone: 'success' },
    { label: 'Tidak Sesuai', value: data?.vclaimNonMatching, description: 'Memerlukan tindak lanjut', icon: TriangleAlert, tone: 'warning' },
    { label: 'Berkas Pendukung Tersedia', value: documents.availableClaimSets, description: `Dari ${formatNumber(documents.expectedClaimSets)} set relevan`, icon: FileCheck2, tone: 'info' },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="font-heading text-2xl font-semibold tracking-tight text-riskora-950 sm:text-[28px]">Pengelolaan Pengajuan Klaim</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Pantau kesiapan, proses pengajuan, dan hasil verifikasi klaim JKN berdasarkan periode penagihan.</p></div><PeriodSelector value={period} periods={periods} onChange={(next) => { setPeriod(next); setSearchParams({ period: next }, { replace: true }); }} /></header>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Fasilitas Kesehatan</p><strong className="mt-1 block text-sm">{facilityName}</strong></div><div className="sm:text-right"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Batch Simulasi</p><strong className="mt-1 block text-sm tabular-nums">{data?.batchId || '—'}</strong></div></section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan periode pengajuan">{stats.map((stat) => <StatCard key={stat.label} {...stat} value={formatNumber(stat.value)} />)}</section>
      <SubmissionWorkflowTracker stages={data?.stages || []} onView={jumpToSection} />
      <VclaimFeedbackSection matching={data?.vclaimMatching} nonMatching={data?.vclaimNonMatching} claims={correctionClaims} />
      <section className="grid items-start gap-4 xl:grid-cols-2"><SupportingDocumentPanel data={documents} /><BavStatusPanel bav={data?.bav} /></section>
      <aside className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">RISKORA menampilkan simulasi alur pengajuan dan pemantauan klaim. Pengiriman dan verifikasi resmi tetap dilakukan melalui sistem yang berlaku.</aside>
    </div>
  );
}
