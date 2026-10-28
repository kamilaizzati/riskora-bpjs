export function getCorrectionDocument(claim) {
  const operation = claim?.screeningFindings?.some((finding) => finding.code === 'missing_op_report');
  return operation
    ? { type: 'operation_report', label: 'Laporan Operasi', title: 'Lengkapi Laporan Operasi', description: 'Unggah laporan operasi yang telah ditandatangani DPJP bedah.' }
    : { type: 'discharge_summary', label: 'Resume Medis', title: 'Lengkapi Resume Medis', description: 'Unggah resume medis resmi yang telah ditandatangani DPJP.' };
}

export function createCorrectionDemoFile(document) {
  const title = document.type === 'operation_report' ? 'LAPORAN OPERASI' : 'RESUME MEDIS';
  const content = `BT /F1 16 Tf 50 740 Td (SIMULASI - ${title}) Tj 0 -30 Td /F1 10 Tf (Dokumen fiktif untuk demo RISKORA.) Tj 0 -20 Td (Bukan dokumen klinis atau tanda tangan DPJP asli.) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { name: document.type === 'operation_report' ? 'demo-laporan-operasi.pdf' : 'demo-resume-medis.pdf',
    type: 'application/pdf', size: pdf.length, contentBase64: btoa(pdf) };
}
