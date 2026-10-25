import { Boxes, GitBranch, Network } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const cards = [
  { key: 'claims', label: 'Klaim Dianalisis', icon: Boxes, tone: 'bg-riskora-100 text-riskora-800' },
  { key: 'relationships', label: 'Relasi Terpetakan', icon: GitBranch, tone: 'bg-blue-50 text-blue-700' },
  { key: 'clusters', label: 'Klaster Teridentifikasi', icon: Network, tone: 'bg-amber-50 text-amber-700' },
];

export default function NetworkSummaryCards({ summary }) {
  return (
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan jaringan simulasi">
      {cards.map(({ key, label, icon: Icon, tone }) => (
        <article key={key} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-panel">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon size={19} /></span>
          <div><p className="text-xs font-medium text-muted">{label}</p><p className="mt-0.5 font-heading text-xl font-bold tabular-nums text-riskora-950">{formatNumber(summary[key])}</p></div>
        </article>
      ))}
    </section>
  );
}
