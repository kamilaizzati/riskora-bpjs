import { ArrowRight, History } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import { getClaimBatches } from '../../services/faskesBatchService';
import { summarizeBatch } from '../../mocks/faskesBatchWorkflow';
import { formatNumber } from '../../utils/formatters';

export default function FaskesSubmissionHistoryPage() {
  const [state, setState] = useState({ rows: [], loading: true, error: null });
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => setRequestKey((key) => key + 1), []);
  useEffect(() => {
    let active = true;
    getClaimBatches().then((rows) => active && setState({ rows, loading: false, error: null })).catch((error) => active && setState({ rows: [], loading: false, error }));
    return () => { active = false; };
  }, [requestKey]);
  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState onRetry={retry} />;
  return <div className="mx-auto max-w-[1500px] space-y-6"><header><h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[28px]">Riwayat Batch</h1><p className="mt-1 text-sm text-muted">Riwayat pre-screening RISKORA dan konfirmasi penerusan manual ke alur resmi VClaim.</p></header><section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel">{state.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead><tr className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><th className="px-5 py-3">Periode / Batch ID</th><th className="px-5 py-3">Sumber</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3 text-right">Lolos</th><th className="px-5 py-3 text-right">Perlu Koreksi</th><th className="px-5 py-3">Status Screening</th><th className="px-5 py-3">Status Penerusan</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-line">{state.rows.map((row) => { const summary = summarizeBatch(row); return <tr key={row.id} className="hover:bg-canvas"><td className="px-5 py-4"><strong className="block">{row.periodLabel}</strong><span className="mt-1 block tabular-nums text-muted">{row.id}</span></td><td className="px-5 py-4">{row.source}</td><td className="px-5 py-4 text-right tabular-nums">{formatNumber(summary.total)}</td><td className="px-5 py-4 text-right tabular-nums text-riskora-700">{formatNumber(summary.passed)}</td><td className="px-5 py-4 text-right tabular-nums text-amber-700">{formatNumber(summary.needsCorrection)}</td><td className="px-5 py-4">{screeningLabel(row.screeningStatus)}</td><td className="px-5 py-4">{handoffLabel(row.handoffStatus)}</td><td className="px-5 py-4 text-right"><Link to={`/faskes/claims/new?batch=${row.id}`} className="inline-flex items-center gap-1 font-semibold text-riskora-700">Lihat Batch <ArrowRight size={13} /></Link></td></tr>; })}</tbody></table></div> : <EmptyState icon={History} title="Belum ada riwayat batch" description="Batch yang sudah dibuat atau diproses akan tersimpan dan tampil di halaman ini." actionLabel="Buat Batch Pertama" actionTo="/faskes/claims/new" />}</section></div>;
}

function screeningLabel(value) { return ({ draft: 'Draft', needs_correction: 'Perlu koreksi', screening_complete: 'Screening selesai', ready_to_handoff: 'Siap diteruskan', handed_off: 'Sudah ditandai diteruskan' })[value] || value; }
function handoffLabel(value) { return ({ not_ready: 'Belum siap', ready: 'Siap untuk VClaim', marked_forwarded: 'Ditandai sudah diteruskan', partially_forwarded: 'Sebagian diteruskan' })[value] || value; }
