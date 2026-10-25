import {
  CircleHelp,
  FilePlus2,
  History,
  LayoutDashboard,
  Network,
  Settings,
  ShieldCheck,
  SquareStack,
} from 'lucide-react';

const accountItems = (namespace) => ({
  label: 'Akun',
  items: [
    { label: 'Pengaturan', to: `/${namespace}/settings`, icon: Settings },
    { label: 'Bantuan', to: `/${namespace}/help`, icon: CircleHelp },
  ],
});

export const navigationConfig = {
  verificator: [
    {
      label: 'Workspace',
      items: [
        { label: 'Ringkasan', to: '/verificator/dashboard', icon: LayoutDashboard },
        { label: 'Antrean Klaim', to: '/verificator/claims', icon: SquareStack },
      ],
    },
    {
      label: 'Analisis Risiko',
      items: [
        { label: 'Analisis Fraud', to: '/verificator/fraud-analysis', icon: ShieldCheck },
        { label: 'Jaringan Anomali', to: '/verificator/anomaly-network', icon: Network },
      ],
    },
    accountItems('verificator'),
  ],
  faskes: [
    {
      label: 'Workspace',
      items: [
        { label: 'Ringkasan', to: '/faskes/dashboard', icon: LayoutDashboard },
        { label: 'Daftar Klaim', to: '/faskes/claims', icon: SquareStack },
        { label: 'Pengajuan Klaim', to: '/faskes/claims/new', icon: FilePlus2 },
        { label: 'Riwayat Pengajuan', to: '/faskes/submissions', icon: History },
      ],
    },
    accountItems('faskes'),
  ],
};

export const getNavigationGroups = (role) => navigationConfig[role] ?? navigationConfig.verificator;
