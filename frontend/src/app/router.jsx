import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import LoadingState from '../components/ui/LoadingState';
import { useAuth } from '../context/AuthContext';
import PlaceholderPage from '../pages/PlaceholderPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import FaskesDashboardPage from '../pages/faskes/FaskesDashboardPage';
import FaskesClaimsPage from '../pages/faskes/FaskesClaimsPage';
import FaskesClaimDetailPage from '../pages/faskes/FaskesClaimDetailPage';
import FaskesClaimCorrectionPage from '../pages/faskes/FaskesClaimCorrectionPage';
import FaskesBatchSubmissionPage from '../pages/faskes/FaskesBatchSubmissionPage';
import FaskesSubmissionHistoryPage from '../pages/faskes/FaskesSubmissionHistoryPage';
import ClaimDetailPage from '../pages/verificator/ClaimDetailPage';
import ClaimsPage from '../pages/verificator/ClaimsPage';
import DashboardPage from '../pages/verificator/DashboardPage';
import FraudAnalysisPage from '../pages/verificator/FraudAnalysisPage';

const AnomalyNetworkPage = lazy(() => import('../pages/verificator/InvestigationNetworkPage'));

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute role="verificator" />}>
        <Route element={<AppLayout />}>
          <Route path="/verificator/dashboard" element={<DashboardPage />} />
          <Route path="/verificator/claims" element={<ClaimsPage />} />
          <Route path="/verificator/fraud-analysis" element={<FraudAnalysisPage />} />
          <Route path="/verificator/anomaly-network" element={<Suspense fallback={<LoadingState />}><AnomalyNetworkPage /></Suspense>} />
          <Route path="/verificator/settings" element={<PlaceholderPage title="Pengaturan" />} />
          <Route path="/verificator/help" element={<PlaceholderPage title="Bantuan" />} />
          <Route path="/verifier/claims/:claimId" element={<ClaimDetailPage />} />
          <Route path="/verificator/claims/:claimId" element={<ClaimDetailPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="faskes" />}>
        <Route element={<AppLayout />}>
          <Route path="/faskes/dashboard" element={<FaskesDashboardPage />} />
          <Route path="/faskes/claims" element={<FaskesClaimsPage />} />
          <Route path="/faskes/claims/new" element={<FaskesBatchSubmissionPage />} />
          <Route path="/faskes/submissions" element={<FaskesSubmissionHistoryPage />} />
          <Route path="/faskes/resubmissions" element={<Navigate replace to="/faskes/claims?status=ready&period=all" />} />
          <Route path="/faskes/claims/:claimId" element={<FaskesClaimDetailPage />} />
          <Route path="/faskes/claims/:claimId/correction" element={<FaskesClaimCorrectionPage />} />
          <Route path="/faskes/settings" element={<PlaceholderPage title="Pengaturan Faskes" backTo="/faskes/dashboard" />} />
          <Route path="/faskes/help" element={<PlaceholderPage title="Bantuan Faskes" backTo="/faskes/dashboard" />} />
        </Route>
      </Route>
      <Route index element={<SessionRedirect />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

function ProtectedRoute({ role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate replace to={user.role === 'verificator' ? '/verificator/dashboard' : '/faskes/dashboard'} />;
  return <Outlet />;
}

function SessionRedirect() {
  const { user } = useAuth();
  return <Navigate replace to={user ? (user.role === 'verificator' ? '/verificator/dashboard' : '/faskes/dashboard') : '/login'} />;
}
