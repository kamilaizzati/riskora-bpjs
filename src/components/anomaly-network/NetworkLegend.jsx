const items = [
  ['#166534', 'Klaim dipilih'], ['#2563EB', 'Terhubung langsung'], ['#D97706', 'Perlu perhatian review'], ['#CBD5E1', 'Klaim lainnya'],
];

export default function NetworkLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line bg-white px-4 py-3 text-[10px] text-muted" aria-label="Legenda warna node">
      {items.map(([color, label]) => <span key={label} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />{label}</span>)}
    </div>
  );
}
