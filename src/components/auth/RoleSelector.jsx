import { Building2, ClipboardCheck } from 'lucide-react';

const roles = [
  { id: 'verificator', label: 'Verifikator', description: 'Verifikasi dan analisis klaim', icon: ClipboardCheck },
  { id: 'faskes', label: 'Faskes', description: 'Pengajuan & kelola klaim', icon: Building2 },
];

export default function RoleSelector({ value, onChange, verifierDisabled = false }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">{verifierDisabled ? 'Daftar sebagai' : 'Masuk sebagai'}</legend>
      <div className="grid grid-cols-2 gap-3">
        {roles.map(({ id, label, description, icon: Icon }) => {
          const active = value === id;
          const disabled = verifierDisabled && id === 'verificator';
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(id)}
              className={`flex min-h-[68px] items-start gap-3 rounded-xl border p-3.5 text-left transition ${active ? 'border-riskora-700 bg-riskora-50 ring-1 ring-riskora-700' : 'border-line hover:border-riskora-700/40'} ${disabled ? 'cursor-not-allowed bg-slate-50 opacity-55 hover:border-line' : ''}`}
              aria-pressed={active}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-riskora-700/10 text-riskora-700' : 'bg-slate-100 text-muted'}`}><Icon size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="text-xs text-riskora-950">{label}</strong>
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${active ? 'border-riskora-700 bg-riskora-700' : 'border-slate-300'}`}>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                </span>
                <span className="mt-1 block truncate text-[11px] text-muted">{disabled ? 'Hanya melalui undangan admin' : description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
