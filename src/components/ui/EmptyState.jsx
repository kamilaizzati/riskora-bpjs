import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Belum ada data', description = 'Data akan ditampilkan saat tersedia.' }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-4 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Inbox size={21} /></span>
      <p className="mt-3 text-sm font-semibold text-riskora-950">{title}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
    </div>
  );
}
