// Stable categories shared by queue and detail responses. Risk scores alone
// are not evidence of a particular anomaly.
function categoryFor(value) {
  const text = String(value || '').toLowerCase().replace(/[_-]/g, ' ');
  if (text.includes('upcoding')) return 'Upcoding';
  if (text.includes('unbundling')) return 'Unbundling';
  if (text.includes('phantom billing')) return 'Phantom Billing';
  if (/repeat billing|duplicate billing|tagihan berulang|nomor sep ganda/.test(text)) return 'Repeat Billing';
  if (/incomplete documents|missing required document|dokumen kurang|ketidaklengkapan berkas/.test(text)) return 'Incomplete Documents';
  if (/tariff review|ketidaksesuaian tarif/.test(text)) return 'Tariff Review';
  if (/length of stay|lama rawat/.test(text)) return 'Length of Stay';
  if (/clinical mismatch|field inconsistency|coding review|ketidaksesuaian klinis/.test(text)) return 'Clinical Mismatch';
  return null;
}

function getAnomalyTypes(claim, findings = []) {
  const categories = findings.length
    ? findings.map((finding) => categoryFor(finding.anomalyType) || categoryFor(finding.title) || categoryFor(finding.findingType))
    : (Array.isArray(claim.anomalyTypes) ? claim.anomalyTypes : [claim.anomalyType]).map(categoryFor);
  return [...new Set(categories.filter(Boolean))];
}

module.exports = { getAnomalyTypes };
