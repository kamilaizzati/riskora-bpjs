import { UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { includeResubmissions } from '../../services/faskesBatchService';
import ClaimsPagination from '../../components/claims/ClaimsPagination';
import FaskesScreeningClaimsTable from '../../components/faskes/FaskesScreeningClaimsTable';
import PeriodSelector from '../../components/faskes/PeriodSelector';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import SearchInput from '../../components/ui/SearchInput';
import { useAuth } from '../../context/AuthContext';
import useFaskesClaims from '../../hooks/useFaskesClaims';
import useClaimBatches from '../../hooks/useClaimBatches';

const PAGE_SIZE = 10;
export default function FaskesClaimsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tab = ['ready', 'needs_correction'].includes(searchParams.get('status')) ? searchParams.get('status') : 'all';
  const period = searchParams.get('period') || '2026-10';
  const [selected, setSelected] = useState([]);
  const [batchPeriod, setBatchPeriod] = useState('2026-10');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [filters, setFilters] = useState({ serviceType: 'all', batchId: 'all', screeningStatus: 'all', finding: 'all' });
  const { claims, periods, loading, error, retry } = useFaskesClaims({ ...filters, period, submissionStatus: tab === 'ready' ? 'ready' : 'all', screeningStatus: tab === 'needs_correction' ? 'needs_correction' : filters.screeningStatus });
  const { batches } = useClaimBatches();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const facilityName = user?.facilityName || user?.organization || 'Fasilitas Kesehatan';

  const filteredClaims = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('id-ID');
    return claims.filter((claim) => {
      const searchable = [claim.sepNumber, claim.claimId, claim.primaryDiagnosis?.code, claim.primaryDiagnosis?.description]
        .filter(Boolean).join(' ').toLocaleLowerCase('id-ID');
      return !needle || searchable.includes(needle);
    });
  }, [claims, query]);

  const pageCount = Math.max(1, Math.ceil(filteredClaims.length / PAGE_SIZE));
  const visibleClaims = filteredClaims.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); setSelected([]); setActionError(''); }, [filters, query, tab, period]);
  const selectTab = (status) => {
    setFilters({ serviceType: 'all', batchId: 'all', screeningStatus: 'all', finding: 'all' });
    setQuery('');
    setSearchParams({ status, period: status === 'ready' ? 'all' : period });
  };
  const createBatch = async () => {
    setBusy(true); setActionError('');
    try {
      const batch = await includeResubmissions({ period: batchPeriod,
        selections: filteredClaims.filter((claim) => selected.includes(claim.id)).map((claim) => ({ sourceBatchId: claim.batchId, claimId: claim.id })) });
      navigate(`/faskes/claims/new?batch=${encodeURIComponent(batch.id)}`);
    } catch (requestError) { setActionError(requestError.message || 'Batch belum dapat dibuat.'); }
    finally { setBusy(false); }
  };

  const batchOptions = useMemo(() => {
    const seen = new Set();
    const list = [['all', 'Semua batch']];
    for (const batch of batches || []) {
      if (batch?.id && !seen.has(batch.id)) {
        seen.add(batch.id);
        list.push([batch.id, batch.periodLabel || batch.name || batch.id]);
      }
    }
    return list;
  }, [batches]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-riskora-950 sm:text-[28px]">Daftar Klaim</h1>
          <p className="mt-1 text-sm text-slate-600">Pantau status pengajuan dan hasil screening klaim {facilityName}.</p>
        </div>
        <Link to="/faskes/claims/new" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-riskora-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-riskora-800"><UploadCloud size={17} /> Upload Batch E-Claim</Link>
      </header>

      {location.state?.notice && <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">{location.state.notice}</div>}

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel" aria-labelledby="faskes-claims-title">
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <h2 id="faskes-claims-title" className="font-heading text-xl font-semibold">Seluruh Klaim</h2>
          <p className="mt-1 text-sm text-muted">Daftar klaim {facilityName} yang telah masuk ke batch pre-screening RISKORA.</p>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3" aria-label="Status klaim">
          {[['all', 'Semua'], ['needs_correction', 'Perlu Koreksi'], ['ready', 'Siap Diajukan Ulang']].map(([id, label]) => <button key={id} type="button" disabled={busy} aria-pressed={tab === id} onClick={() => selectTab(id)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === id ? 'bg-riskora-700 text-white' : 'text-slate-600 hover:bg-canvas'}`}>{label}</button>)}
        </div>
        {tab === 'ready' && <p className="border-b border-line bg-blue-50 px-5 py-3 text-xs leading-5 text-blue-900">Klaim sudah diperbaiki dan lolos pemeriksaan ulang. Pilih untuk membuat batch baru, atau sertakan saat Preview Data setelah upload E-Claim. Klaim belum menambah jumlah yang diteruskan dari batch asal.</p>}
        <div className="grid gap-3 border-b border-line bg-[#FAFDFB] px-5 py-4 sm:px-6 lg:grid-cols-2 xl:grid-cols-[minmax(250px,1.3fr)_repeat(4,minmax(150px,0.7fr))]">
          <SearchInput value={query} onChange={setQuery} placeholder="Cari No. SEP, ID klaim, atau diagnosis..." />
          <PeriodSelector value={period} periods={[{ id: 'all', label: 'Semua periode' }, ...periods.filter((item) => item.id !== 'all')]} onChange={(value) => setSearchParams({ status: tab, period: value })} />
          <SelectFilter label="Batch" value={filters.batchId} onChange={(batchId) => setFilters((current) => ({ ...current, batchId }))} options={batchOptions} />
          {tab === 'all' && <SelectFilter label="Status screening" value={filters.screeningStatus} onChange={(screeningStatus) => setFilters((current) => ({ ...current, screeningStatus }))} options={[["all","Semua hasil"],["not_screened","Belum diperiksa"],["passed","Lolos screening awal"],["needs_correction","Perlu koreksi"]]} />}
          <SelectFilter label="Jenis temuan" value={filters.finding} onChange={(finding) => setFilters((current) => ({ ...current, finding }))} options={[["all","Semua temuan"],["none","Tanpa temuan"],["missing_sep","SEP belum tersedia"],["missing_document_metadata","Metadata dokumen"],["care_class_review","Kelas rawat"]]} />
        </div>
        <FaskesScreeningClaimsTable
          claims={visibleClaims}
          selectedIds={selected}
          onSelect={tab === 'ready' ? (claim, checked) => setSelected((items) => checked ? [...items, claim.id] : items.filter((id) => id !== claim.id)) : undefined}
          selectionDisabled={busy}
          emptyTitle={tab === 'ready' ? 'Tidak ada klaim siap diajukan ulang' : claims.length ? 'Klaim tidak ditemukan' : 'Belum ada klaim'}
          emptyDescription={tab === 'ready' ? 'Klaim akan tampil di sini setelah lolos pemeriksaan ulang. Periksa juga filter periode dan batch.' : claims.length ? 'Ubah pencarian atau filter untuk melihat data lainnya.' : 'Mulai dengan mengunggah batch data klaim yang sudah disiapkan oleh Tim Casemix.'}
          actionLabel={tab === 'ready' || claims.length ? undefined : 'Upload Batch E-Claim'}
          actionTo={tab === 'ready' || claims.length ? undefined : '/faskes/claims/new'}
        />
        {tab === 'ready' && filteredClaims.length > 0 && <div className="flex flex-wrap items-end justify-end gap-4 border-t border-line p-5">
          <span className="text-xs text-muted">{selected.length} klaim dipilih</span>
          <label className="text-xs font-semibold">Periode Batch Baru<input type="month" value={batchPeriod} disabled={busy} onChange={(event) => setBatchPeriod(event.target.value)} className="mt-2 block rounded-lg border border-line px-3 py-2" /></label>
          <button type="button" onClick={createBatch} disabled={busy || !selected.length || !batchPeriod} className="rounded-lg bg-riskora-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Menyimpan...' : 'Buat Batch dari Pilihan'}</button>
        </div>}
        {actionError && <div role="alert" className="p-5 text-sm text-red-700">{actionError} <button type="button" onClick={retry} className="underline">Muat Ulang</button></div>}
        {filteredClaims.length > 0 && <ClaimsPagination page={page} pageCount={pageCount} total={filteredClaims.length} pageSize={PAGE_SIZE} onChange={setPage} />}
      </section>
    </div>
  );
}

function SelectFilter({ label, value, onChange, options }) {
  return <label className="rounded-lg border border-line bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-6 w-full bg-transparent text-xs font-medium normal-case tracking-normal text-riskora-950 outline-none" aria-label={label}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
}
