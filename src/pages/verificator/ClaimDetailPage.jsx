import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AIReviewPanel from '../../components/claim-detail/AIReviewPanel';
import ClaimSummary from '../../components/claim-detail/ClaimSummary';
import DocumentViewer from '../../components/claim-detail/DocumentViewer';
import LoadingState from '../../components/ui/LoadingState';
import useClaimDetail from '../../hooks/useClaimDetail';

export default function ClaimDetailPage() {
  const { claimId } = useParams();
  const { claim, loading, error } = useClaimDetail(claimId);

  if (loading) return <LoadingState />;
  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-white p-8 text-center"><h1 className="font-heading text-xl font-semibold">Detail klaim gagal dimuat</h1><p className="mt-2 text-sm text-muted">{error.message}</p><Link to="/verificator/claims" className="mt-5 inline-flex text-sm font-semibold text-riskora-700">Kembali ke Antrean Klaim</Link></div>;
  }
  if (!claim) {
    return <div className="rounded-2xl border border-line bg-white p-8 text-center"><h1 className="font-heading text-xl font-semibold">Klaim tidak ditemukan</h1><p className="mt-2 text-sm text-muted">ID klaim “{claimId}” tidak tersedia pada dataset saat ini.</p><Link to="/verificator/claims" className="mt-5 inline-flex text-sm font-semibold text-riskora-700">Kembali ke Antrean Klaim</Link></div>;
  }

  const riskLabel = claim.riskLevel === 'high' ? 'Risiko Tinggi' : claim.riskLevel === 'medium' ? 'Risiko Sedang' : 'Risiko Rendah';

  return (
    <div className="mx-auto max-w-[1720px] space-y-5">
      <header>
        <Link to="/verificator/claims" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-riskora-700"><ArrowLeft size={15} /> Kembali ke Antrean Klaim</Link>
        <div className="mt-2 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-riskora-950">Detail Verifikasi Klaim</h1>
            <span className="rounded-md border border-line bg-white px-2.5 py-1 text-xs tabular-nums text-slate-600">No. SEP: {claim.sepNumber}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Menunggu Review</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${claim.riskLevel === 'high' ? 'bg-red-100 text-red-700' : claim.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-800'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{riskLabel}</span>
          </div>
        </div>
      </header>

      <ClaimSummary claim={claim} />
      <div className="grid items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6"><DocumentViewer claim={claim} /></div>
        <div className="lg:col-span-6"><AIReviewPanel claim={claim} /></div>
      </div>
    </div>
  );
}
