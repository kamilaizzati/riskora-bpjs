import { useCallback, useEffect, useState } from 'react';
import { getClaimsQueue } from '../services/claimsService';

export default function useClaimsQueue() {
  const [state, setState] = useState({ claims: [], loading: true, error: null });
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => setRequestKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    getClaimsQueue({ signal: controller.signal })
      .then((claims) => setState({ claims, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ claims: [], loading: false, error });
      });
    return () => controller.abort();
  }, [requestKey]);

  return { ...state, retry };
}
