export function getRescreenNavigation(claim) {
  if (claim?.screeningStatus === 'passed') {
    return { to: '/faskes/claims?status=ready&period=all', options: { state: {
      notice: 'Klaim lolos pemeriksaan ulang dan siap dipilih untuk batch baru.', noticeTone: 'success',
    } } };
  }
  if (claim?.screeningStatus === 'needs_correction') {
    const reason = claim.screeningFindings?.[0]?.message || 'Klaim masih memerlukan perbaikan lanjutan.';
    return { to: '/faskes/claims?status=needs_correction&period=all', options: { state: {
      notice: `Klaim belum lolos pemeriksaan ulang: ${reason}`, noticeTone: 'warning',
    } } };
  }
  throw new Error('Hasil pemeriksaan ulang belum tersedia. Silakan coba lagi.');
}
