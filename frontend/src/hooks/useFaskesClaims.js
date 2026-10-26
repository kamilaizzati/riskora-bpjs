import { useCallback, useEffect, useState } from 'react';
import { getFaskesClaims, getSubmissionPeriods } from '../services/faskesService';

export default function useFaskesClaims(filters = {}) {
  const { period, serviceType, vclaimStatus, verificationStatus } = filters;
  const [state, setState] = useState({ claims: [], periods: [], loading: true, error: null });
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => setRequestKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([getFaskesClaims({ period, serviceType, vclaimStatus, verificationStatus }, { signal: controller.signal }), getSubmissionPeriods({ signal: controller.signal })])
      .then(([claims, periods]) => setState({ claims, periods, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ claims: [], periods: [], loading: false, error });
      });
    return () => controller.abort();
  }, [period, requestKey, serviceType, vclaimStatus, verificationStatus]);

  return { ...state, retry };
}
