import { LogOut, ShieldCheck } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getNavigationGroups } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const navigationGroups = getNavigationGroups(user?.role);
  const isRouteActive = (to, isActive) => {
    if (to === '/verificator/claims' && pathname.startsWith('/verifier/claims/')) return true;
    if (to === '/faskes/claims/new') return pathname === to;
    if (to === '/faskes/claims') return pathname.startsWith('/faskes/claims') && pathname !== '/faskes/claims/new';
    return isActive;
  };
  const initials = user?.role === 'faskes' ? 'TC' : 'VB';
  const profileSubtitle = user?.role === 'faskes' ? (user.facilityName || user.organization || 'Fasilitas Kesehatan') : 'Claim Verifier';
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[250px] flex-col border-r border-line bg-white lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-riskora-700 text-white">
          <ShieldCheck aria-hidden="true" size={21} strokeWidth={2.2} />
        </span>
        <span className="font-heading text-lg font-bold tracking-tight text-riskora-800">RISKORA</span>
      </div>

      <nav aria-label="Navigasi utama" className="flex-1 space-y-5 overflow-y-auto px-2 py-5">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex min-h-10 items-center gap-3 rounded-r-lg px-3 text-sm transition-colors ${
                      isRouteActive(to, isActive)
                        ? 'border-l-4 border-riskora-800 bg-riskora-100 font-semibold text-riskora-800'
                        : 'border-l-4 border-transparent text-slate-600 hover:bg-canvas hover:text-riskora-950'
                    }`
                  }
                >
                  <Icon aria-hidden="true" size={18} strokeWidth={2} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-canvas">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-riskora-100 text-xs font-bold text-riskora-800">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-riskora-950">{user?.displayName || user?.name || 'Verifikator BPJS'}</p>
            <p className="truncate text-xs text-muted">{profileSubtitle}</p>
          </div>
          <button type="button" onClick={() => { signOut(); navigate('/login', { replace: true }); }} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Keluar dari akun"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
  );
}
