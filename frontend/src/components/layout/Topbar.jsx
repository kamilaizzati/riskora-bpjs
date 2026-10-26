import { Menu, Search, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getNavigationGroups } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';

export default function Topbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const navigationGroups = getNavigationGroups(user?.role);
  const isRouteActive = (to, isActive) => {
    if (to === '/verificator/claims' && pathname.startsWith('/verifier/claims/')) return true;
    if (to === '/faskes/claims/new') return pathname === to;
    if (to === '/faskes/claims') return pathname.startsWith('/faskes/claims') && pathname !== '/faskes/claims/new';
    return isActive;
  };
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center border-b border-line bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:left-[250px]">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-canvas lg:hidden"
          aria-label="Buka navigasi"
        >
          <Menu size={21} />
        </button>
        <div className="relative w-full max-w-[690px]">
          <Search aria-hidden="true" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-xl border border-line bg-[#F2FBF6] pl-10 pr-10 text-sm text-riskora-950 outline-none transition placeholder:text-slate-500 focus:border-riskora-700 focus:ring-3 focus:ring-emerald-100"
            placeholder="Cari No. SEP atau klaim..."
            aria-label="Pencarian global (belum terhubung ke layanan pencarian)"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-riskora-950"
              aria-label="Bersihkan pencarian"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-riskora-950/30"
            onClick={() => setMenuOpen(false)}
            aria-label="Tutup navigasi"
          />
          <aside className="relative h-full w-[280px] bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <span className="flex items-center gap-2 font-heading font-bold text-riskora-800">
                <ShieldCheck size={22} /> RISKORA
              </span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Tutup navigasi" className="p-2">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-5 p-3" aria-label="Navigasi seluler">
              {navigationGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.label}</p>
                  {group.items.map(({ label, to, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isRouteActive(to, isActive) ? 'bg-riskora-100 font-semibold text-riskora-800' : 'text-slate-600'}`
                      }
                    >
                      <Icon size={18} /> {label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
