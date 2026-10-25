import { useCallback, useEffect, useState } from 'react';
import { getVerificatorDashboard } from '../services/verificatorService';

export default function useVerificatorDashboard() {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [requestKey, setRequestKey] = useState(0);

  const retry = useCallback(() => setRequestKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));

    getVerificatorDashboard({ signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, loading: false, error });
      });

    return () => controller.abort();
  }, [requestKey]);

  return { ...state, retry };
}
