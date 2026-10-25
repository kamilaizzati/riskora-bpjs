const numberFormatter = new Intl.NumberFormat('id-ID');
const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatNumber = (value) => numberFormatter.format(Number(value) || 0);
export const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);
export const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormatter.format(parsed);
};

export const riskLabels = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' };
export const statusLabels = {
  pending_verification: 'Menunggu',
  needs_investigation: 'Investigasi',
  in_review: 'Review',
  completed: 'Selesai',
};
export const anomalyLabels = {
  Upcoding: 'Indikasi Upcoding',
  Unbundling: 'Indikasi Unbundling',
  'Repeat Billing': 'Repeat Billing',
  'Clinical Mismatch': 'Ketidaksesuaian',
  'Incomplete Documents': 'Dokumen Kurang',
};
