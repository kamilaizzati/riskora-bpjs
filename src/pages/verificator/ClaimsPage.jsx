import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdvancedClaimFilters from '../../components/claims/AdvancedClaimFilters';
import ClaimsPagination from '../../components/claims/ClaimsPagination';
import ClaimsQueueTable from '../../components/claims/ClaimsQueueTable';
import ErrorState from '../../components/ui/ErrorState';
import FilterTabs from '../../components/ui/FilterTabs';
import LoadingState from '../../components/ui/LoadingState';
import SearchInput from '../../components/ui/SearchInput';
import useClaimsQueue from '../../hooks/useClaimsQueue';

const PAGE_SIZE = 10;
const initialAdvancedFilters = { risk: 'all', status: 'all', anomaly: 'all' };

export default function ClaimsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const anomalyFromUrl = searchParams.get('anomaly') || 'all';
  const { claims, loading, error, retry } = useClaimsQueue();
  const [query, setQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [advancedOpen, setAdvancedOpen] = useState(anomalyFromUrl !== 'all');
  const [advanced, setAdvanced] = useState({ ...initialAdvancedFilters, anomaly: anomalyFromUrl });
  const [page, setPage] = useState(1);

  const counts = useMemo(() => ({
    all: claims.length,
    high: claims.filter((claim) => claim.riskLevel === 'high').length,
    investigation: claims.filter((claim) => claim.status === 'needs_investigation').length,
    pending: claims.filter((claim) => claim.status === 'pending_verification').length,
  }), [claims]);

  const filteredClaims = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('id-ID');
    return claims.filter((claim) => {
      const matchesQuick =
        quickFilter === 'all' ||
        (quickFilter === 'high' && claim.riskLevel === 'high') ||
        (quickFilter === 'investigation' && claim.status === 'needs_investigation') ||
        (quickFilter === 'pending' && claim.status === 'pending_verification');
      const matchesAdvanced =
        (advanced.risk === 'all' || claim.riskLevel === advanced.risk) &&
        (advanced.status === 'all' || claim.status === advanced.status) &&
        (advanced.anomaly === 'all' || claim.anomalyTypes?.includes(advanced.anomaly));
      const searchable = [claim.sepNumber, claim.facilityName, claim.primaryDiagnosis?.code, claim.primaryDiagnosis?.description]
        .filter(Boolean).join(' ').toLocaleLowerCase('id-ID');
      return matchesQuick && matchesAdvanced && (!needle || searchable.includes(needle));
    });
  }, [advanced, claims, query, quickFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredClaims.length / PAGE_SIZE));
  const visibleClaims = filteredClaims.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [query, quickFilter, advanced]);
  useEffect(() => {
    if (anomalyFromUrl !== advanced.anomaly) setAdvanced((current) => ({ ...current, anomaly: anomalyFromUrl }));
  }, [advanced.anomaly, anomalyFromUrl]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  const advancedFilterCount = Object.values(advanced).filter((value) => value !== 'all').length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-riskora-950 sm:text-[28px]">Antrean Klaim</h1>
        <p className="mt-1 text-sm text-slate-600">Kelola klaim yang menunggu pemeriksaan dan tindak lanjut.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel" aria-labelledby="claims-list-title">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <h2 id="claims-list-title" className="font-heading text-xl font-semibold text-riskora-950">Daftar Klaim Masuk</h2>
            <p className="mt-1 text-sm text-muted">Kelola klaim yang membutuhkan pemeriksaan dan tindak lanjut berdasarkan hasil screening.</p>
          </div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
            className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition ${advancedOpen ? 'border-riskora-700 bg-riskora-50 text-riskora-800' : 'border-line bg-white text-riskora-950 hover:border-riskora-700 hover:bg-canvas'}`}
          >
            <SlidersHorizontal size={17} /> Filter Lanjutan
            {advancedFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-riskora-700 px-1 text-[10px] text-white">{advancedFilterCount}</span>}
          </button>
        </div>

        {advancedOpen && (
          <AdvancedClaimFilters
            value={advanced}
            onChange={(next) => {
              setAdvanced(next);
              if (next.anomaly === 'all') searchParams.delete('anomaly'); else searchParams.set('anomaly', next.anomaly);
              setSearchParams(searchParams, { replace: true });
            }}
            onReset={() => {
              setAdvanced({ ...initialAdvancedFilters });
              searchParams.delete('anomaly');
              setSearchParams(searchParams, { replace: true });
            }}
          />
        )}

        <div className="flex flex-col gap-3 border-b border-line bg-[#FAFDFB] px-5 py-3.5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput value={query} onChange={setQuery} placeholder="Cari No. SEP, faskes, atau diagnosis..." />
          <FilterTabs activeFilter={quickFilter} onChange={setQuickFilter} counts={counts} />
        </div>

        <ClaimsQueueTable claims={visibleClaims} />
        <ClaimsPagination page={page} pageCount={pageCount} total={filteredClaims.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </section>
    </div>
  );
}
