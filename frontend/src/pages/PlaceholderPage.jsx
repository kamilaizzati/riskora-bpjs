import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export default function PlaceholderPage({ title, showClaimId = false, backTo = '/verificator/dashboard', backLabel = 'Kembali ke dashboard' }) {
  const { claimId } = useParams();

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-8 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-wider text-riskora-700">RISKORA</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-riskora-950">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        {showClaimId ? `Halaman detail untuk klaim ${claimId} belum diimplementasikan.` : 'Halaman ini disiapkan sebagai rute untuk pengembangan berikutnya.'}
      </p>
      <Link to={backTo} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-riskora-700 hover:text-riskora-800">
        <ArrowLeft size={16} /> {backLabel}
      </Link>
    </section>
  );
}
