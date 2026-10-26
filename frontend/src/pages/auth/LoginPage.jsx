import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import RoleSelector from '../../components/auth/RoleSelector';
import { useAuth } from '../../context/AuthContext';
import { demoAccounts } from '../../services/authService';

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('verificator');
  const [email, setEmail] = useState(demoAccounts.verificator.email);
  const [password, setPassword] = useState(demoAccounts.verificator.password);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate replace to={user.role === 'verificator' ? '/verificator/dashboard' : '/faskes/dashboard'} />;

  const selectRole = (nextRole) => {
    setRole(nextRole);
    setEmail(demoAccounts[nextRole].email);
    setPassword(demoAccounts[nextRole].password);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const session = await signIn({ email, password, role });
      navigate(session.role === 'verificator' ? '/verificator/dashboard' : '/faskes/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-[460px] py-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-riskora-950 lg:text-[28px]">Selamat Datang Kembali</h2>
          <p className="mt-1.5 text-sm text-muted">Masuk ke akun Riskora untuk melanjutkan.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <RoleSelector value={role} onChange={selectRole} />

          <label className="block text-xs font-medium text-riskora-950">
            Alamat Email
            <span className="relative mt-1.5 block">
              <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3.5 text-sm outline-none transition focus:border-riskora-700 focus:ring-1 focus:ring-riskora-700" />
            </span>
          </label>

          <label className="block text-xs font-medium text-riskora-950">
            <span className="flex items-center justify-between">
              Kata Sandi
              <button type="button" onClick={() => setNotice('Fitur reset kata sandi akan aktif setelah backend autentikasi tersedia.')} className="font-semibold text-riskora-700 hover:underline">Lupa kata sandi?</button>
            </span>
            <span className="relative mt-1.5 block">
              <LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-10 text-sm outline-none transition focus:border-riskora-700 focus:ring-1 focus:ring-riskora-700" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-riskora-950" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
          </label>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-900">
            <strong>Akun demo {role === 'verificator' ? 'Verifikator' : 'Faskes'}:</strong> {demoAccounts[role].email} / {demoAccounts[role].password}
          </div>

          {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={16} className="shrink-0" />{error}</div>}
          {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={16} className="shrink-0" />{notice}</div>}

          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-riskora-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-riskora-800 disabled:cursor-wait disabled:opacity-70">
            {loading ? 'Memeriksa akun...' : 'Masuk'} {!loading && <ArrowRight size={18} />}
          </button>

          <div className="border-t border-line/80 pt-4 text-center text-xs text-muted">
            {role === 'verificator' ? (
              <span className="mt-1.5 block text-[11px] text-amber-700">Akun Verifikator hanya dibuat melalui undangan administrator.</span>
            ) : (
              <span>Belum punya akun? <Link to="/register" className="ml-1 font-bold text-riskora-700 hover:underline">Daftar sekarang</Link></span>
            )}
          </div>

          
        </form>
      </div>
    </AuthShell>
  );
}
