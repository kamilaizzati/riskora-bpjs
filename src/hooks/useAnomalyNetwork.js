import { useCallback, useEffect, useState } from 'react';
import { getAnomalyNetwork } from '../services/anomalyNetworkService';

export default function useAnomalyNetwork() {
  const [data, setData] = useState({ nodes: [], edges: [], disclaimer: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestKey, setRequestKey] = useState(0);

  const retry = useCallback(() => setRequestKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getAnomalyNetwork({}, { signal: controller.signal })
      .then(setData)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [requestKey]);

  return { ...data, loading, error, retry };
}
