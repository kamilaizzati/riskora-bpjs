import { useCallback, useEffect, useState } from 'react';
import { getClaimBatches } from '../services/faskesBatchService';

export default function useClaimBatches() {
  const [state, setState] = useState({ batches: [], loading: true, error: null });
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => setRequestKey((key) => key + 1), []);
  useEffect(() => {
    let active = true;
    const load = () => getClaimBatches().then((batches) => active && setState({ batches, loading: false, error: null })).catch((error) => active && setState({ batches: [], loading: false, error }));
    load();
    window.addEventListener('riskora-batches-updated', load);
    return () => { active = false; window.removeEventListener('riskora-batches-updated', load); };
  }, [requestKey]);
  return { ...state, retry };
}
