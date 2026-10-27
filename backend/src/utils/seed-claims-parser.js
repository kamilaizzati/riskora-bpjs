const fs = require('fs');
const path = require('path');

function parseCurrencyNumber(val) {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return 0;
  let str = String(val).trim().replace(/^Rp\.?\s*/i, '');
  if (str.includes('.') && !str.includes(',')) {
    str = str.replace(/\./g, '');
  } else if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = Number(str);
  return Number.isNaN(num) ? 0 : Math.round(num);
}

function parseDateString(val) {
  if (!val) return '2026-10-23';
  const str = String(val).trim();
  const match = str.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const dmy = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  return str.slice(0, 10);
}

function getConsistentDates(claim) {
  const isOutpatient = (claim.serviceType || '').toUpperCase() === 'OUTPATIENT';
  let los = isOutpatient ? 0 : Number(claim.lengthOfStayDays ?? claim.losDays ?? claim.lengthOfStay ?? 0);
  if (!isOutpatient && los <= 0) {
    los = 3;
  }

  let dischargeDate = claim.dischargeDate || claim.serviceDate || '2026-10-23';
  let admissionDate = claim.admissionDate;

  if (isOutpatient) {
    admissionDate = dischargeDate;
  } else if (!admissionDate || admissionDate === dischargeDate) {
    if (los > 1) {
      const dis = new Date(`${dischargeDate}T00:00:00Z`);
      const adm = new Date(dis.getTime() - (los - 1) * 24 * 60 * 60 * 1000);
      admissionDate = adm.toISOString().slice(0, 10);
    } else {
      admissionDate = dischargeDate;
    }
  } else {
    const adm = new Date(`${admissionDate}T00:00:00Z`).getTime();
    const dis = new Date(`${dischargeDate}T00:00:00Z`).getTime();
    if (!Number.isNaN(adm) && !Number.isNaN(dis) && dis >= adm) {
      los = Math.round((dis - adm) / (24 * 60 * 60 * 1000)) + 1;
    }
  }

  return { admissionDate, dischargeDate, lengthOfStay: los };
}

function getBillingBreakdown(claim) {
  if (claim.billingBreakdown && Array.isArray(claim.billingBreakdown.items)) {
    return claim.billingBreakdown;
  }

  const total = Number(claim.claimAmount) || 0;
  const isOutpatient = (claim.serviceType || '').toUpperCase() === 'OUTPATIENT' || (claim.careType || '').toLowerCase().includes('jalan');

  if (total === 18450000 && (claim.id === '66a1f8b1c200000000001001' || claim.noSep === '0182R0011026V001' || claim.sepNumber === '0182R0011026V001')) {
    const items = [
      { name: 'Akomodasi Rawat Inap', amount: 4800000 },
      { name: 'Tindakan dan Jasa Medis', amount: 5250000 },
      { name: 'Farmasi dan Alat Kesehatan', amount: 2200000 },
      { name: 'Pemeriksaan Penunjang', amount: 6200000 }
    ];
    return { items, total: 18450000 };
  }

  const seedStr = String(claim.noSep || claim.sepNumber || claim.id || 'seed');
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }

  let rAkomodasi, rTindakan, rFarmasi;
  if (!isOutpatient) {
    const v1 = 20 + (hash % 11);
    const v2 = 25 + ((hash >> 4) % 11);
    const v3 = 15 + ((hash >> 8) % 11);
    rAkomodasi = v1 / 100;
    rTindakan = v2 / 100;
    rFarmasi = v3 / 100;
  } else {
    rAkomodasi = 0;
    const v2 = 35 + ((hash >> 4) % 15);
    const v3 = 25 + ((hash >> 8) % 15);
    rTindakan = v2 / 100;
    rFarmasi = v3 / 100;
  }

  let c1 = Math.round((total * rAkomodasi) / 1000) * 1000;
  let c2 = Math.round((total * rTindakan) / 1000) * 1000;
  let c3 = Math.round((total * rFarmasi) / 1000) * 1000;
  let c4 = total - (c1 + c2 + c3);

  if (c4 < 0) {
    c4 = Math.max(0, Math.round((total * 0.2) / 1000) * 1000);
    c2 = total - (c1 + c3 + c4);
  }

  const items = [
    { name: 'Akomodasi Rawat Inap', amount: c1 },
    { name: 'Tindakan dan Jasa Medis', amount: c2 },
    { name: 'Farmasi dan Alat Kesehatan', amount: c3 },
    { name: 'Pemeriksaan Penunjang', amount: c4 }
  ];

  return {
    items,
    total: items.reduce((sum, it) => sum + it.amount, 0)
  };
}

function normalizeClaim(raw, index = 0) {
  const id = String(raw._id || raw.claim_id || raw.id || raw.claimId || `seed-claim-${index + 1}`).trim();
  const sepNumber = String(raw.noSep || raw.sep_no || raw.sepNumber || raw.no_sep || '').trim();

  if (!id || !sepNumber) {
    return {
      isValid: false,
      error: `Row ${index + 1}: Missing required claim ID or SEP number`
    };
  }

  const rawCareType = String(raw.jenisPelayanan || raw.service_type || raw.careType || 'Rawat Inap • Kls 1').trim();
  const isInpatient = rawCareType.toLowerCase().includes('inap') || rawCareType.toUpperCase().includes('INPATIENT');
  const serviceType = isInpatient ? 'INPATIENT' : 'OUTPATIENT';

  const parts = rawCareType.split('•').map((s) => s.trim());
  const serviceClass = parts[1] || (isInpatient ? 'Kls 1' : 'Poli Rawat Jalan');

  const serviceDate = parseDateString(raw.tglPelayanan || raw.submission_date || raw.serviceDate || raw.submissionDate);
  const claimAmount = parseCurrencyNumber(raw.nilaiKlaim ?? raw.claim_value_idr ?? raw.claimAmount ?? raw.amount);

  const diagCode = String(raw.primaryIcd10 || raw.diagnosis_code || raw.icd10 || raw.primaryDiagnosis?.code || 'I63.9').trim();
  const diagDesc = String(raw.primaryDiagnosisTeks || raw.diagnosis_name || raw.diagnosis || raw.primaryDiagnosis?.description || 'Stroke Iskemik Akut').trim();

  let secondaryDiagnoses = [];
  if (Array.isArray(raw.secondaryIcd10)) {
    secondaryDiagnoses = raw.secondaryIcd10.map((c) => (typeof c === 'string' ? { code: c, description: c } : c));
  } else if (typeof raw.secondaryIcd10 === 'string' && raw.secondaryIcd10.trim()) {
    secondaryDiagnoses = raw.secondaryIcd10.split(',').map((c) => c.trim()).filter(Boolean).map((c) => ({ code: c, description: c }));
  } else if (Array.isArray(raw.secondaryDiagnoses)) {
    secondaryDiagnoses = raw.secondaryDiagnoses;
  }

  let procedures = [];
  if (Array.isArray(raw.procedureIcd9)) {
    procedures = raw.procedureIcd9.map((p) => (typeof p === 'string' ? { code: p, name: p } : p));
  } else if (typeof raw.procedureIcd9 === 'string' && raw.procedureIcd9.trim()) {
    procedures = raw.procedureIcd9.split(',').map((p) => p.trim()).filter(Boolean).map((p) => ({ code: p, name: p }));
  } else if (Array.isArray(raw.procedures)) {
    procedures = raw.procedures;
  }

  const inacbgCode = String(raw.kodeGrouperInacbg || raw.inacbg_code || raw.inacbgCode || raw.submittedInaCbgCode || 'I-4-10-III').trim();
  const facilityName = String(raw.faskesNama || raw.facility_name || raw.facilityName || 'RSUP Dr. Sardjito').trim();

  // Status mapping
  const rawStatus = String(raw.statusVerifikasi || raw.verification_status || raw.status || raw.workflowStatus || 'Menunggu').trim();
  let status = 'pending_verification';
  let workflowStatus = 'SUBMITTED';

  const lowerStatus = rawStatus.toLowerCase();
  if (lowerStatus === 'investigasi' || lowerStatus === 'needs_investigation' || lowerStatus === 'investigation') {
    status = 'needs_investigation';
    workflowStatus = 'INVESTIGATION';
  } else if (lowerStatus === 'review' || lowerStatus === 'in_review' || lowerStatus === 'under_review') {
    status = 'in_review';
    workflowStatus = 'UNDER_REVIEW';
  } else if (lowerStatus === 'selesai' || lowerStatus === 'completed') {
    status = 'completed';
    workflowStatus = 'COMPLETED';
  } else {
    status = 'pending_verification';
    workflowStatus = 'SUBMITTED';
  }

  // Risk mapping
  const aiAnalysis = raw.aiAnalysis || {};
  const rawRiskCat = String(aiAnalysis.kategoriRisiko || raw.kategori_risiko || raw.riskLevel || raw.riskCategory || '').trim();
  let riskLevel = 'low';
  let riskCategory = 'LOW';

  const lowerRisk = rawRiskCat.toLowerCase();
  if (lowerRisk === 'tinggi' || lowerRisk === 'high') {
    riskLevel = 'high';
    riskCategory = 'HIGH';
  } else if (lowerRisk === 'sedang' || lowerRisk === 'medium') {
    riskLevel = 'medium';
    riskCategory = 'MEDIUM';
  } else {
    riskLevel = 'low';
    riskCategory = 'LOW';
  }

  const riskScore = typeof aiAnalysis.skorRisiko === 'number'
    ? aiAnalysis.skorRisiko
    : (typeof raw.skor_risiko === 'number' ? raw.skor_risiko : (riskLevel === 'high' ? 89 : riskLevel === 'medium' ? 64 : 28));

  const anomalyType = aiAnalysis.jenisTemuan || raw.jenis_temuan || (riskLevel === 'high' ? 'Indikasi Upcoding' : riskLevel === 'medium' ? 'Indikasi Unbundling' : 'Ketidaksesuaian');
  const anomalyTypes = [anomalyType];

  const losDays = Number(raw.losDays ?? raw.los_days ?? (isInpatient ? 3 : 0));
  const dates = getConsistentDates({
    serviceType,
    serviceDate,
    admissionDate: raw.admissionDate,
    dischargeDate: raw.dischargeDate || serviceDate,
    lengthOfStayDays: losDays
  });

  const billingBreakdown = getBillingBreakdown({
    id,
    noSep: sepNumber,
    sepNumber,
    claimAmount,
    serviceType,
    careType: rawCareType
  });

  return {
    isValid: true,
    claim: {
      id,
      claimId: id,
      _id: id,
      batchId: raw.batchId || 'BATCH-20261023-DAILY',
      sepNumber,
      noSep: sepNumber,
      noRm: String(raw.noRm || raw.no_rm || raw.patient_mrn || `RM-2026-${id.slice(-6)}`).trim(),
      serviceType,
      careType: rawCareType,
      serviceClass,
      serviceDate,
      submissionDate: serviceDate,
      submittedAt: raw.createdAt || `${serviceDate}T08:00:00.000Z`,
      admissionDate: dates.admissionDate,
      dischargeDate: dates.dischargeDate,
      lengthOfStay: dates.lengthOfStay,
      lengthOfStayDays: dates.lengthOfStay,
      primaryDiagnosis: { code: diagCode, description: diagDesc },
      secondaryDiagnoses,
      procedures,
      submittedInaCbgCode: inacbgCode,
      inacbgCode,
      claimAmount,
      facilityName,
      facilityMeta: `${facilityName} (Tipe A)`,
      status,
      statusVerifikasi: rawStatus,
      workflowStatus,
      claimStatus: workflowStatus,
      processingStatus: workflowStatus === 'COMPLETED' ? 'FORWARDED' : 'READY',
      screeningStatus: 'passed',
      correctionStatus: 'not_needed',
      riskScore,
      riskLevel,
      riskCategory,
      anomalyTypes,
      aiAnalysis: {
        isAutoChecked: Boolean(aiAnalysis.isAutoChecked ?? true),
        skorRisiko: riskScore,
        kategoriRisiko: rawRiskCat || (riskLevel === 'high' ? 'Tinggi' : riskLevel === 'medium' ? 'Sedang' : 'Rendah'),
        jenisTemuan: anomalyType,
        ringkasanEvaluasi: aiAnalysis.ringkasanEvaluasi || raw.ringkasan_evaluasi || 'Hasil evaluasi klinis dan pengelompokan klaim.'
      },
      billingBreakdown,
      isSeed: true,
      isSynthetic: true,
      isDeleted: false,
      createdAt: raw.createdAt || `${serviceDate}T08:00:00.000Z`,
      updatedAt: raw.createdAt || `${serviceDate}T08:00:00.000Z`
    }
  };
}

function parseMarkdownTable(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'));
  if (tableLines.length < 2) return [];

  const rawHeaders = tableLines[0]
    .split('|')
    .slice(1, -1)
    .map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, ''));

  // Check if second line is separator
  const separatorLine = tableLines[1];
  const isSeparator = /^\|(\s*:?-+:?\s*\|)+$/.test(separatorLine);
  const dataLines = isSeparator ? tableLines.slice(2) : tableLines.slice(1);

  const headerMap = {
    'claim_id': '_id',
    'id': '_id',
    '_id': '_id',
    'sep_no': 'noSep',
    'no_sep': 'noSep',
    'nosep': 'noSep',
    'sep': 'noSep',
    'submission_date': 'tglPelayanan',
    'tanggal_pengajuan': 'tglPelayanan',
    'tgl_pelayanan': 'tglPelayanan',
    'service_date': 'tglPelayanan',
    'service_type': 'jenisPelayanan',
    'jenis_pelayanan': 'jenisPelayanan',
    'diagnosis_code': 'primaryIcd10',
    'kode_icd_10': 'primaryIcd10',
    'kode_icd10': 'primaryIcd10',
    'primary_icd10': 'primaryIcd10',
    'icd10': 'primaryIcd10',
    'diagnosis_name': 'primaryDiagnosisTeks',
    'nama_diagnosis': 'primaryDiagnosisTeks',
    'primary_diagnosis': 'primaryDiagnosisTeks',
    'diagnosis': 'primaryDiagnosisTeks',
    'claim_value_idr': 'nilaiKlaim',
    'nilai_klaim_rp': 'nilaiKlaim',
    'nilai_klaim': 'nilaiKlaim',
    'claim_amount': 'nilaiKlaim',
    'amount': 'nilaiKlaim',
    'facility_name': 'faskesNama',
    'faskes_nama': 'faskesNama',
    'faskes': 'faskesNama',
    'rm_no': 'noRm',
    'no_rm': 'noRm',
    'norm': 'noRm',
    'los': 'losDays',
    'los_days': 'losDays',
    'grouper': 'kodeGrouperInacbg',
    'status': 'statusVerifikasi',
    'status_verifikasi': 'statusVerifikasi',
    'skor_risiko': 'skorRisiko',
    'kategori_risiko': 'kategoriRisiko',
    'jenis_temuan': 'jenisTemuan'
  };

  const records = [];
  dataLines.forEach((line) => {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const obj = {};
    rawHeaders.forEach((hdr, idx) => {
      const standardKey = headerMap[hdr] || hdr;
      obj[standardKey] = cells[idx] || '';
    });
    records.push(obj);
  });

  return records;
}

function parseSeedClaims(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Seed content is empty or invalid string');
  }

  const trimmed = content.trim();
  let rawList = null;

  // 1. Try direct JSON parse
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      rawList = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      rawList = null;
    }
  }

  // 2. Try Markdown fenced code block
  if (!rawList) {
    const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        rawList = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        rawList = null;
      }
    }
  }

  // 3. Try Markdown table
  if (!rawList && trimmed.includes('|')) {
    rawList = parseMarkdownTable(trimmed);
  }

  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
    throw new Error('Unable to parse seed claims data: unrecognized format');
  }

  const validClaims = [];
  const diagnostics = [];

  rawList.forEach((raw, idx) => {
    const result = normalizeClaim(raw, idx);
    if (result.isValid) {
      validClaims.push(result.claim);
    } else {
      diagnostics.push({ index: idx, error: result.error });
    }
  });

  return {
    claims: validClaims,
    totalParsed: rawList.length,
    validCount: validClaims.length,
    invalidCount: diagnostics.length,
    diagnostics
  };
}

function loadSeedClaimsFile(filePath = null) {
  const possiblePaths = [
    filePath,
    path.resolve(__dirname, '../../mock_claims_seed_data_20_cases.md'),
    path.resolve(process.cwd(), 'backend/mock_claims_seed_data_20_cases.md'),
    path.resolve(process.cwd(), 'mock_claims_seed_data_20_cases.md'),
    'D:\\KADA-2026\\GITHUB SC\\riskora-bpjs\\backend\\mock_claims_seed_data_20_cases.md'
  ].filter(Boolean);

  let targetPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }

  if (!targetPath) {
    throw new Error(`Seed claims file not found in candidates: ${possiblePaths.join(', ')}`);
  }

  const content = fs.readFileSync(targetPath, 'utf8');
  const result = parseSeedClaims(content);
  return {
    success: true,
    ...result,
    sourceFile: targetPath
  };
}

module.exports = {
  parseSeedClaims,
  parseSeedClaimsMarkdown: parseSeedClaims,
  loadSeedClaimsFile,
  normalizeClaim,
  getBillingBreakdown,
  getConsistentDates,
  parseCurrencyNumber,
  parseDateString
};
