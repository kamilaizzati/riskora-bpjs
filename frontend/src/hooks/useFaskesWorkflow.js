import { useCallback, useEffect, useState } from 'react';
import { getFaskesDashboard, getSubmissionOverview, getSubmissionPeriods } from '../services/faskesService';

function usePeriodResource(loader, period) {
  const [state, setState] = useState({ data: null, periods: [], loading: true, error: null });
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => setRequestKey((key) => key + 1), []);

  useEffect(() => {
    const handleBatchUpdate = () => setRequestKey((k) => k + 1);
    window.addEventListener('riskora-batches-updated', handleBatchUpdate);
    return () => window.removeEventListener('riskora-batches-updated', handleBatchUpdate);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([getSubmissionPeriods({ signal: controller.signal }), loader(period, { signal: controller.signal })])
      .then(([periods, data]) => setState({ periods, data, loading: false, error: null }))
      .catch((error) => { if (error.name !== 'AbortError') setState({ data: null, periods: [], loading: false, error }); });
    return () => controller.abort();
  }, [loader, period, requestKey]);

  return { ...state, retry };
}

export function useFaskesDashboard(period) { return usePeriodResource(getFaskesDashboard, period); }
export function useFaskesSubmission(period) { return usePeriodResource(getSubmissionOverview, period); }
