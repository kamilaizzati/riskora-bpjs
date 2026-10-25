import { AlertTriangle, ArrowRight, GitBranch, Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';

const evidenceLabels = {
  sharedPatientId: 'ID pasien pseudonim', episodeId: 'ID episode', episodeIds: 'ID episode',
  diagnosisCode: 'Kode diagnosis', inaCbgCode: 'Kelompok INA-CBG', procedureCodes: 'Kode prosedur',
  serviceIntervals: 'Interval pelayanan', serviceDates: 'Tanggal pelayanan', reviewWindowDays: 'Jendela tinjauan',
  medicallyExpectedRecurringService: 'Layanan berulang yang diharapkan', context: 'Konteks tinjauan',
};

const evidenceValue = (key, value) => key === 'reviewWindowDays' ? `${value} hari` : Array.isArray(value) ? value.join(' · ') : typeof value === 'boolean' ? (value ? 'Ya' : 'Tidak') : value;

export default function NetworkDetailPanel({ selectedNode, selectedEdge, nodes, edges, onSelectNode }) {
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));

  if (selectedEdge) {
    const source = nodeById[selectedEdge.source];
    const target = nodeById[selectedEdge.target];
    return (
      <aside className="rounded-2xl border border-line bg-white p-5 shadow-panel" aria-labelledby="edge-detail-title">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><GitBranch size={19} /></span>
        <h2 id="edge-detail-title" className="mt-4 font-heading text-lg font-bold">Detail Relasi</h2>
        <p className="mt-1 text-xs leading-5 text-muted">Relasi berbasis aturan pada data sintetis, bukan kesimpulan fraud.</p>
        <DetailRow label="Jenis Relasi" value={selectedEdge.label} />
        <DetailRow label="Status Review" value={selectedEdge.reviewStatus} />
        <DetailRow label="Klaim" value={`${source?.shortId || selectedEdge.source} ↔ ${target?.shortId || selectedEdge.target}`} />
        <DetailRow label="Pasien pseudonim" value={selectedEdge.supportingEvidence?.sharedPatientId || '—'} />
        <DetailRow label="Tanggal relevan" value={selectedEdge.supportingEvidence?.serviceIntervals?.join(' · ') || selectedEdge.supportingEvidence?.serviceDates?.join(' · ') || '—'} />
        <DetailRow label="Diagnosis / prosedur" value={selectedEdge.supportingEvidence?.diagnosisCode || selectedEdge.supportingEvidence?.procedureCodes?.join(', ') || '—'} />
        <div className="mt-4 border-t border-line pt-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Penjelasan</p><p className="mt-2 text-xs leading-5 text-riskora-950">{selectedEdge.explanation}</p></div>
        <div className={`mt-4 rounded-xl border p-3 ${selectedEdge.reviewStatus === 'Requires Review' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Mengapa {selectedEdge.reviewStatus === 'Requires Review' ? 'perlu' : 'tidak perlu'} review</p><p className="mt-1 text-xs leading-5">{selectedEdge.reviewReason}</p></div>
        <div className="mt-4 rounded-xl bg-canvas p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Bukti Pendukung</p>
          <dl className="mt-2 space-y-2">{Object.entries(selectedEdge.supportingEvidence || {}).map(([key, value]) => <div key={key} className="flex items-start justify-between gap-3 text-[11px]"><dt className="text-muted">{evidenceLabels[key] || key}</dt><dd className="max-w-[58%] text-right font-semibold text-riskora-950">{evidenceValue(key, value)}</dd></div>)}</dl>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[source, target].filter(Boolean).map((node) => <button key={node.id} type="button" onClick={() => onSelectNode(node.id)} className="rounded-lg border border-line px-2 py-2 text-[11px] font-semibold text-riskora-700 hover:bg-riskora-50">Buka {node.shortId}</button>)}
        </div>
      </aside>
    );
  }

  if (!selectedNode) {
    return (
      <aside className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white p-6 text-center shadow-panel">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Network size={21} /></span>
        <h2 className="mt-3 font-heading text-base font-bold">Detail Klaim</h2>
        <p className="mt-2 text-xs leading-5 text-muted">Pilih salah satu klaim pada jaringan untuk melihat detail dan relasinya.</p>
      </aside>
    );
  }

  const relatedEdges = edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id);
  return (
    <aside className="rounded-2xl border border-line bg-white p-5 shadow-panel" aria-labelledby="claim-detail-title">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-riskora-700">{selectedNode.shortId}</p><h2 id="claim-detail-title" className="mt-1 font-heading text-lg font-bold">Detail Klaim</h2></div>{selectedNode.needsReviewAttention && <span title="Perlu perhatian review" className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><AlertTriangle size={17} /></span>}</div>
      {selectedNode.needsReviewAttention && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900">Ditandai untuk perhatian review pada skenario simulasi. Ini bukan kesimpulan fraud.</p>}
      <dl className="mt-4 divide-y divide-line border-y border-line">
        <DetailRow label="No. SEP" value={selectedNode.sepNumber} />
        <DetailRow label="Claim ID" value={selectedNode.id} />
        <DetailRow label="Pasien pseudonim" value={selectedNode.patientId} />
        <DetailRow label="Episode" value={selectedNode.episodeId} />
        <DetailRow label="Faskes" value={selectedNode.facilityName} />
        <DetailRow label="Interval layanan" value={`${formatDate(selectedNode.serviceStart)} – ${formatDate(selectedNode.serviceEnd)}`} />
        <DetailRow label="Jenis perawatan" value={selectedNode.careType} />
        <DetailRow label="Diagnosis utama" value={selectedNode.primaryDiagnosis?.description || '—'} />
        <DetailRow label="ICD-10" value={selectedNode.primaryDiagnosis?.code || '—'} />
        <DetailRow label="Nilai klaim" value={formatCurrency(selectedNode.claimAmount)} />
        <DetailRow label="Klaim terhubung" value={new Set(relatedEdges.flatMap((edge) => [edge.source, edge.target]).filter((id) => id !== selectedNode.id)).size} />
      </dl>

      <div className="mt-5"><h3 className="font-heading text-sm font-bold">Relasi Terkait</h3>
        {relatedEdges.length ? <div className="mt-3 space-y-2">{relatedEdges.map((edge) => { const other = nodeById[edge.source === selectedNode.id ? edge.target : edge.source]; return <button key={edge.id} type="button" onClick={() => other && onSelectNode(other.id)} className="w-full rounded-lg border border-line p-3 text-left hover:border-riskora-700 hover:bg-riskora-50"><span className="block text-[11px] font-semibold text-riskora-950">{other?.shortId || 'Klaim terkait'} · {edge.label}</span><span className="mt-1 block text-[10px] leading-4 text-muted">{edge.explanation}</span></button>; })}</div> : <p className="mt-2 text-xs leading-5 text-muted">Tidak ada relasi yang tampil untuk klaim ini pada filter aktif.</p>}
      </div>
      <Link to={`/verifier/claims/${selectedNode.id}`} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-riskora-700 text-xs font-semibold text-white hover:bg-riskora-800">Lihat Detail Klaim <ArrowRight size={15} /></Link>
    </aside>
  );
}

function DetailRow({ label, value }) {
  return <div className="flex items-start justify-between gap-3 py-2.5 text-[11px]"><dt className="shrink-0 text-muted">{label}</dt><dd className="break-words text-right font-semibold text-riskora-950">{value ?? '—'}</dd></div>;
}
