import { Activity, LockKeyhole } from 'lucide-react';

const DISCLAIMER =
  'Riskora merupakan sistem pendukung keputusan. Temuan AI bersifat indikatif dan keputusan verifikasi akhir dilakukan oleh verifikator berwenang.';

export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-white font-heading text-riskora-950">
      <div className="flex min-h-[calc(100vh-49px)] flex-col md:h-[calc(100vh-49px)] md:flex-row md:overflow-hidden">
        <section className="relative flex min-h-[330px] w-full shrink-0 flex-col justify-between overflow-hidden bg-riskora-800 p-8 text-white md:h-full md:min-h-0 md:w-[45%] md:p-12 lg:p-16">
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-riskora-500/20 blur-3xl" />
          <div className="relative z-10 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-bold text-riskora-800 shadow-md">R</span>
            <div>
              <strong className="block text-2xl tracking-tight">RISKORA</strong>
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-200/80">Healthcare Claim Intelligence</span>
            </div>
          </div>

          <div className="relative z-10 my-10 max-w-md md:my-auto">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-emerald-100">
              <Activity size={13} className="text-emerald-300" />
              Registrasi Kemitraan Resmi
            </div>
            <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight lg:text-4xl">Verifikasi lebih cerdas, keputusan lebih tepat.</h1>
            <p className="mb-8 text-sm leading-relaxed text-emerald-100/80 md:text-base">Platform pendukung screening dan verifikasi klaim berbasis analisis data dan kecerdasan buatan.</p>
          </div>

          <div className="relative z-10 flex items-center gap-2 border-t border-white/10 pt-6 text-xs text-emerald-200/60">
            <LockKeyhole size={15} /> Akses Terenkripsi & Terotorisasi Multi-Tingkat
          </div>
        </section>
        <main className="flex w-full flex-1 items-center justify-center bg-white p-8 md:h-full md:w-[55%] md:overflow-y-auto md:p-12 lg:p-16">{children}</main>
      </div>
      <footer className="border-t border-line bg-white px-4 py-3.5 text-center text-xs text-muted">{DISCLAIMER}</footer>
    </div>
  );
}
