export default function StatCard({ label, value, description, icon: Icon, tone = 'default' }) {
  const tones = {
    default: { value: 'text-riskora-950', icon: 'bg-[#E2F7ED] text-riskora-700', card: 'border-line' },
    danger: { value: 'text-red-600', icon: 'bg-red-100 text-red-600', card: 'border-line' },
    warning: { value: 'text-amber-600', icon: 'bg-amber-100 text-amber-600', card: 'border-amber-200' },
    success: { value: 'text-riskora-700', icon: 'bg-green-100 text-riskora-700', card: 'border-line' },
    info: { value: 'text-blue-700', icon: 'bg-blue-100 text-blue-700', card: 'border-line' },
  };
  const selectedTone = tones[tone] ?? tones.default;

  return (
    <article className={`flex min-h-[154px] flex-col justify-between rounded-2xl border bg-white p-5 shadow-panel ${selectedTone.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className={`mt-2 font-heading text-[34px] font-bold leading-none tracking-tight tabular-nums ${selectedTone.value}`}>
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selectedTone.icon}`}>
          <Icon aria-hidden="true" size={22} strokeWidth={2.2} />
        </span>
      </div>
      <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-muted">{description}</p>
    </article>
  );
}
