import { useCallback, useEffect, useState } from 'react';
import { getFaskesClaimById } from '../services/faskesService';

export default function useFaskesClaimDetail(claimId) {
  const [state, setState] = useState({ claim: null, loading: true, error: null });
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => setRequestKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ claim: null, loading: true, error: null });
    getFaskesClaimById(claimId, { signal: controller.signal })
      .then((claim) => setState({ claim, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ claim: null, loading: false, error });
      });
    return () => controller.abort();
  }, [claimId, requestKey]);

  return { ...state, retry };
}
