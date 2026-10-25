import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';

const DISCLAIMER =
  'Riskora merupakan sistem pendukung keputusan. Temuan AI bersifat indikatif dan keputusan verifikasi akhir dilakukan oleh verifikator berwenang.';

export default function AppLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-canvas text-riskora-950">
      <Sidebar />
      <div className="min-h-screen lg:pl-[250px]">
        <Topbar />
        <div className="flex min-h-screen flex-col pt-16">
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
          <footer className="mx-4 flex flex-col gap-2 border-t border-line py-5 text-[11px] leading-4 text-muted sm:mx-6 lg:mx-8 lg:flex-row lg:items-center lg:justify-between">
            <p>{DISCLAIMER}</p>
            <span className="shrink-0 tabular-nums text-slate-400">{user?.role === 'faskes' ? 'Faskes Workspace' : 'BPJS Verifier Suite'} v1.0</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
