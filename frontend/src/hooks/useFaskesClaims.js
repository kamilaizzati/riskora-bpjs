import { useCallback, useEffect, useState } from 'react';
import { getFaskesClaims, getSubmissionPeriods } from '../services/faskesService';

export default function useFaskesClaims(filters = {}) {
  const { period, serviceType, batchId, screeningStatus, finding, vclaimStatus, verificationStatus } = filters;
  const [state, setState] = useState({ claims: [], periods: [], loading: true, error: null });
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
    Promise.all([
      getFaskesClaims(
        { period, serviceType, batchId, screeningStatus, finding, vclaimStatus, verificationStatus },
        { signal: controller.signal }
      ),
      getSubmissionPeriods({ signal: controller.signal })
    ])
      .then(([claims, periods]) => setState({ claims, periods, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ claims: [], periods: [], loading: false, error });
      });
    return () => controller.abort();
  }, [period, requestKey, serviceType, batchId, screeningStatus, finding, vclaimStatus, verificationStatus]);

  return { ...state, retry };
}
