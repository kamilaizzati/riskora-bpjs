import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReadyResubmissions, includeResubmissions } from '../../services/faskesBatchService';
import { formatCurrency } from '../../utils/formatters';

export default function ResubmissionPicker({ batch, onIncluded }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [period, setPeriod] = useState('2026-10');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getReadyResubmissions().then((items) => {
      if (active) { setRows(items.filter((claim) => claim.sourceBatchId !== batch?.id)); setSelected([]); }
    }).catch((requestError) => active && setError(requestError.message || 'Daftar belum dapat dimuat.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [batch?.id, revision]);
  const include = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await includeResubmissions({ targetBatchId: batch?.id, period: batch?.period || period,
        selections: rows.filter((claim) => selected.includes(`${claim.sourceBatchId}:${claim.id}`))
          .map((claim) => ({ sourceBatchId: claim.sourceBatchId, claimId: claim.id })) });
      onIncluded(updated);
      setRevision((value) => value + 1);
    } catch (requestError) { setError(requestError.message || 'Klaim belum dapat dimasukkan ke batch.'); }
    finally { setBusy(false); }
  };
  return <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel">
    <div className="border-b border-line p-5">
      <h2 className="font-heading text-lg font-semibold">{batch ? 'Tambahkan Klaim Siap Diajukan Ulang' : 'Klaim Siap Diajukan Ulang'}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">Klaim berikut sudah diperbaiki dan lolos pemeriksaan ulang. Pilih untuk disertakan dalam {batch ? 'batch ini' : 'batch baru'}. Klaim yang belum dipilih tetap tersimpan di daftar ini.</p>
    </div>
    {loading ? <p className="p-5 text-sm text-muted">Memuat daftar klaim...</p> : rows.length ? <>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs">
        <thead className="bg-canvas text-muted"><tr><th className="p-4">Pilih</th><th className="p-4">Klaim / SEP</th><th className="p-4">Batch Asal</th><th className="p-4">Status</th><th className="p-4 text-right">Nilai Klaim</th></tr></thead>
        <tbody className="divide-y divide-line">{rows.map((claim) => {
          const key = `${claim.sourceBatchId}:${claim.id}`;
          return <tr key={key}><td className="p-4"><input type="checkbox" disabled={busy} aria-label={`Pilih ${claim.claimId || claim.id}`} checked={selected.includes(key)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, key] : items.filter((item) => item !== key))} /></td>
            <td className="p-4"><strong className="block">{claim.claimId || claim.id}</strong><span className="mt-1 block text-muted">{claim.sepNumber}</span></td>
            <td className="p-4"><Link to={`/faskes/claims/new?batch=${encodeURIComponent(claim.sourceBatchId)}`} className="font-semibold text-riskora-700">{claim.sourceBatchName || claim.sourceBatchId}</Link><span className="mt-1 block text-muted">{claim.sourcePeriod}</span></td>
            <td className="p-4"><span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-800">Siap Diajukan Ulang</span></td>
            <td className="p-4 text-right">{formatCurrency(claim.claimAmount)}</td></tr>;
        })}</tbody></table></div>
      <div className="flex flex-wrap items-end justify-end gap-4 border-t border-line p-5">
        {!batch && <label className="text-xs font-semibold">Periode Batch Baru<input type="month" value={period} disabled={busy} onChange={(event) => setPeriod(event.target.value)} className="mt-2 block rounded-lg border border-line px-3 py-2" /></label>}
        <button type="button" disabled={!selected.length || busy || (!batch && !period)} onClick={include} className="rounded-lg bg-riskora-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Menyimpan...' : batch ? `Tambahkan ke Batch Ini (${selected.length})` : `Buat Batch dari Pilihan (${selected.length})`}</button>
      </div>
    </> : !error && <div className="p-6 text-sm text-muted">Belum ada klaim yang menunggu pengajuan ulang. Klaim akan muncul di sini setelah koreksinya lolos pemeriksaan ulang.</div>}
    {error && <div role="alert" className="p-5 text-sm text-red-700">{error} <button type="button" onClick={() => setRevision((value) => value + 1)} className="underline">Muat Ulang Daftar</button></div>}
  </section>;
}
