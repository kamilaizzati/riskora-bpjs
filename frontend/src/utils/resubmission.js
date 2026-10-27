export function isReadyForResubmission(claim) {
  return claim.screeningStatus === 'passed' && claim.correctionStatus === 'completed'
    && claim.rolloverStatus !== 'rolled_over' && !claim.isForwarded
    && (claim.initialScreeningStatus === 'needs_correction' || (!claim.initialScreeningStatus && claim.lastCorrection));
}

export function resubmissionLabel(claim) {
  if (claim.rolloverStatus === 'rolled_over') return 'Diajukan Ulang di Batch Baru';
  if (isReadyForResubmission(claim)) return 'Sudah Diperbaiki — Menunggu Batch Baru';
  return null;
}
