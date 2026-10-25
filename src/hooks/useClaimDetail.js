import { useEffect, useState } from 'react';
import { getClaimDetail } from '../services/claimDetailService';

export default function useClaimDetail(claimId) {
  const [state, setState] = useState({ claim: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ claim: null, loading: true, error: null });
    getClaimDetail(claimId, { signal: controller.signal })
      .then((claim) => setState({ claim, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ claim: null, loading: false, error });
      });
    return () => controller.abort();
  }, [claimId]);

  return state;
}
