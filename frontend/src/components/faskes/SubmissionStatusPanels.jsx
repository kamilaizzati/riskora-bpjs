import { CheckCircle2, Clock3, FileCheck2, FileWarning, ShieldCheck } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import EmptyState from '../ui/EmptyState';

export function SupportingDocumentPanel({ data = {} }) {
  const expected = Number(data.expectedClaimSets) || 0;
  const available = Number(data.availableClaimSets) || 0;
  const incomplete = Number(data.incompleteClaimSets) || 0;
  const percentage = expected ? Math.round((available / expected) * 100) : 0;
  return <section id="jkn-drive-section" className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FileCheck2 size={19} /></span><div><h2 className="font-heading text-lg font-semibold">Status Dokumen JKN Drive</h2><p className="mt-1 text-xs leading-5 text-muted">Dihitung per set dokumen klaim relevan, bukan jumlah file PDF.</p></div></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><Metric label="Set diharapkan" value={expected} /><Metric label="Tersedia" value={available} tone="text-riskora-700" /><Metric label="Belum lengkap" value={incomplete} tone="text-amber-700" /></div><div className="mt-5"><div className="flex justify-between text-xs"><span className="text-muted">Kelengkapan</span><strong>{percentage}%</strong></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${percentage}%` }} /></div></div></section>;
}

export function BavStatusPanel({ bav = {} }) {
  return <section id="bav-section" className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-6"><div className="flex items-start gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${bav.received ? 'bg-green-50 text-riskora-700' : 'bg-slate-100 text-slate-500'}`}>{bav.received ? <ShieldCheck size={19} /> : <Clock3 size={19} />}</span><div><h2 className="font-heading text-lg font-semibold">Status BAV</h2><p className="mt-1 text-xs leading-5 text-muted">Hasil verifikasi resmi tetap berasal dari proses BPJS yang berlaku.</p></div></div>{bav.received ? <div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Lolos Verifikasi" value={bav.passed} icon={CheckCircle2} tone="text-riskora-700" /><Metric label="Pending" value={bav.pending} icon={Clock3} tone="text-amber-700" /><Metric label="Tidak Layak" value={bav.notEligible} icon={FileWarning} tone="text-red-700" /></div> : <div className="mt-5"><EmptyState title="BAV belum tersedia" description="Belum ada keputusan akhir untuk periode ini. Status pending proses bukan penolakan." /></div>}</section>;
}

function Metric({ label, value, tone = 'text-riskora-950', icon: Icon }) { return <div className="rounded-lg border border-line bg-canvas px-2 py-3 text-center">{Icon && <Icon size={15} className={`mx-auto mb-1 ${tone}`} />}<strong className={`block text-base tabular-nums ${tone}`}>{formatNumber(value)}</strong><span className="mt-1 block text-[9px] leading-3 text-muted">{label}</span></div>; }
