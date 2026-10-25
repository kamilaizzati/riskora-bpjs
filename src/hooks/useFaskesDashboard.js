import { useCallback, useEffect, useState } from 'react';
import {
  getFaskesActionRequiredClaims,
  getFaskesDashboardSummary,
  getFaskesRecentActivities,
  getFaskesScreeningDistribution,
} from '../services/faskesService';

export default function useFaskesDashboard() {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => setRequestKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([
      getFaskesDashboardSummary({ signal: controller.signal }),
      getFaskesActionRequiredClaims({ signal: controller.signal }),
      getFaskesScreeningDistribution({ signal: controller.signal }),
      getFaskesRecentActivities({ signal: controller.signal }),
    ]).then(([summary, actionRequiredClaims, screeningDistribution, recentActivities]) => {
      setState({ data: { summary, actionRequiredClaims, screeningDistribution, recentActivities }, loading: false, error: null });
    }).catch((error) => {
      if (error.name !== 'AbortError') setState({ data: null, loading: false, error });
    });
    return () => controller.abort();
  }, [requestKey]);

  return { ...state, retry };
}
