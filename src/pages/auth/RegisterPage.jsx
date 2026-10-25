import { AlertCircle, ArrowLeft, ArrowRight, Building2, Eye, EyeOff, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import RoleSelector from '../../components/auth/RoleSelector';
import { registerFaskes } from '../../services/authService';

const inputClass = 'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm outline-none transition focus:border-riskora-700 focus:ring-1 focus:ring-riskora-700';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', organization: '', password: '', confirmation: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Kata sandi minimal 8 karakter.');
    if (form.password !== form.confirmation) return setError('Konfirmasi kata sandi belum sama.');
    setLoading(true);
    try {
      await registerFaskes(form);
      navigate('/login', { replace: true, state: { message: 'Akun Faskes demo berhasil dibuat. Silakan masuk menggunakan email dan kata sandi yang didaftarkan.' } });
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-[460px] py-4">
        <Link to="/login" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-riskora-700"><ArrowLeft size={15} /> Kembali ke Masuk</Link>
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight lg:text-[28px]">Buat Akun Riskora</h2>
          <p className="mt-1.5 text-sm text-muted">Pendaftaran mandiri tersedia khusus untuk Faskes.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <RoleSelector value="faskes" onChange={() => {}} verifierDisabled />
          <Field label="Nama Lengkap" icon={UserRound}><input required value={form.name} onChange={update('name')} placeholder="Contoh: dr. Pratama Wijaya" className={`${inputClass} pl-10`} /></Field>
          <Field label="Alamat Email Resmi" icon={Mail}><input required type="email" value={form.email} onChange={update('email')} placeholder="nama@instansi.co.id" className={`${inputClass} pl-10`} /></Field>
          <Field label="Nama Fasilitas Kesehatan" icon={Building2}><input required value={form.organization} onChange={update('organization')} placeholder="Contoh: RSUP Dr. Sardjito Yogyakarta" className={`${inputClass} pl-10`} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium">Kata Sandi<span className="relative mt-1 block"><input required type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} placeholder="Min. 8 karakter" className={`${inputClass} pr-9`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label="Ubah visibilitas kata sandi">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            <label className="text-xs font-medium">Konfirmasi Sandi<input required type={showPassword ? 'text' : 'password'} value={form.confirmation} onChange={update('confirmation')} placeholder="Ulangi sandi" className={`${inputClass} mt-1`} /></label>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-snug text-amber-900"><AlertCircle size={15} className="shrink-0 text-amber-600" />Pendaftaran Verifikator tidak tersedia untuk umum. Akun tersebut hanya dapat diterbitkan oleh administrator Riskora.</div>
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-riskora-700 px-4 py-3 text-sm font-semibold text-white hover:bg-riskora-800 disabled:opacity-70">{loading ? 'Menyimpan akun...' : 'Daftar Akun Faskes'} {!loading && <ArrowRight size={18} />}</button>
        </form>
      </div>
    </AuthShell>
  );
}

function Field({ label, icon: Icon, children }) {
  return <label className="block text-xs font-medium">{label}<span className="relative mt-1 block"><Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />{children}</span></label>;
}
