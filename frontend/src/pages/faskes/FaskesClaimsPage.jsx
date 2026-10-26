import { UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [filters, setFilters] = useState({ period: '2026-10', serviceType: 'all', batchId: 'all', screeningStatus: 'all', finding: 'all' });
  const { claims, periods, loading, error, retry } = useFaskesClaims(filters);
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
  useEffect(() => setPage(1), [filters, query]);

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

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel" aria-labelledby="faskes-claims-title">
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <h2 id="faskes-claims-title" className="font-heading text-xl font-semibold">Seluruh Klaim</h2>
          <p className="mt-1 text-sm text-muted">Daftar klaim {facilityName} yang telah masuk ke batch pre-screening RISKORA.</p>
        </div>
        <div className="grid gap-3 border-b border-line bg-[#FAFDFB] px-5 py-4 sm:px-6 lg:grid-cols-2 xl:grid-cols-[minmax(250px,1.3fr)_repeat(4,minmax(150px,0.7fr))]">
          <SearchInput value={query} onChange={setQuery} placeholder="Cari No. SEP, ID klaim, atau diagnosis..." />
          <PeriodSelector value={filters.period} periods={periods} onChange={(period) => setFilters((current) => ({ ...current, period }))} />
          <SelectFilter label="Batch" value={filters.batchId} onChange={(batchId) => setFilters((current) => ({ ...current, batchId }))} options={batchOptions} />
          <SelectFilter label="Status screening" value={filters.screeningStatus} onChange={(screeningStatus) => setFilters((current) => ({ ...current, screeningStatus }))} options={[["all","Semua hasil"],["not_screened","Belum diperiksa"],["passed","Lolos screening awal"],["needs_correction","Perlu koreksi"]]} />
          <SelectFilter label="Jenis temuan" value={filters.finding} onChange={(finding) => setFilters((current) => ({ ...current, finding }))} options={[["all","Semua temuan"],["none","Tanpa temuan"],["missing_sep","SEP belum tersedia"],["missing_document_metadata","Metadata dokumen"],["care_class_review","Kelas rawat"]]} />
        </div>
        <FaskesScreeningClaimsTable
          claims={visibleClaims}
          emptyTitle={claims.length ? 'Klaim tidak ditemukan' : 'Belum ada klaim'}
          emptyDescription={claims.length ? 'Ubah pencarian atau filter untuk melihat data lainnya.' : 'Mulai dengan mengunggah batch data klaim yang sudah disiapkan oleh Tim Casemix.'}
          actionLabel={claims.length ? undefined : 'Upload Batch E-Claim'}
          actionTo={claims.length ? undefined : '/faskes/claims/new'}
        />
        {filteredClaims.length > 0 && <ClaimsPagination page={page} pageCount={pageCount} total={filteredClaims.length} pageSize={PAGE_SIZE} onChange={setPage} />}
      </section>
    </div>
  );
}

function SelectFilter({ label, value, onChange, options }) {
  return <label className="rounded-lg border border-line bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-6 w-full bg-transparent text-xs font-medium normal-case tracking-normal text-riskora-950 outline-none" aria-label={label}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
}
