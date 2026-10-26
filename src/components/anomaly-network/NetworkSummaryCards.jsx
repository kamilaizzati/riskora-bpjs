import { AlertTriangle, Boxes, Network, Share2 } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const cards = [
  { key: 'claims', label: 'Klaim Dianalisis', icon: Boxes, tone: 'bg-blue-50 text-blue-700' },
  { key: 'entities', label: 'Entitas Terhubung', icon: Share2, tone: 'bg-violet-50 text-violet-700' },
  { key: 'clusters', label: 'Klaster Terdeteksi', icon: Network, tone: 'bg-riskora-100 text-riskora-800' },
  { key: 'reviewClusters', label: 'Klaster Perlu Peninjauan', icon: AlertTriangle, tone: 'bg-amber-50 text-amber-700' },
];

export default function NetworkSummaryCards({ summary }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan jaringan simulasi">
      {cards.map(({ key, label, icon: Icon, tone }) => (
        <article key={key} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-panel">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon size={19} /></span>
          <div><p className="text-xs font-medium text-muted">{label}</p><p className="mt-0.5 font-heading text-xl font-bold tabular-nums text-riskora-950">{formatNumber(summary[key])}</p></div>
        </article>
      ))}
    </section>
  );
}
