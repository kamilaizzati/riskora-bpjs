const HttpError = require('./http-error');

const EXPECTED_HEADERS = [
  'claim_id',
  'sep_no',
  'submission_date',
  'service_type',
  'diagnosis_code',
  'diagnosis_name',
  'procedure_code',
  'procedure_name',
  'ina_cbg_code',
  'claim_value_idr',
  'facility_code',
  'facility_name',
  'batch_period',
];

/**
 * Validates date in YYYY-MM-DD format.
 */
function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

/**
 * Parses and validates an E-Claim Demo TXT string (pipe delimited).
 *
 * Requirements:
 * 1. Supports comments starting with '#'
 * 2. Detects header line (must match EXPECTED_HEADERS)
 * 3. Uses delimiter '|'
 * 4. Trims whitespace
 * 5. Validates mandatory columns
 * 6. Validates date format (YYYY-MM-DD)
 * 7. Validates claim_value_idr as a non-negative integer/number
 * 8. Handles '-' for optional fields (procedure_code, procedure_name) -> maps to null
 * 9. Rejects invalid headers
 * 10. Handles/skips empty lines
 * 11. Reports line number and reason on failure
 * 12. Rejects duplicate claim_id and sep_no
 * 13. Rejects on validation error (no silent partial import)
 *
 * @param {string} content - Raw TXT file string
 * @param {object} [options]
 * @returns {Array<object>} Array of parsed and validated claim records
 */
function parseDemoClaimTxt(content, options = {}) {
  if (typeof content !== 'string') {
    throw HttpError.badRequest('Konten file TXT harus berupa string.');
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw HttpError.badRequest('File TXT tidak boleh kosong.');
  }

  // Split by CRLF or LF
  const rawLines = content.split(/\r?\n/);
  let headerFound = false;
  let headerIndex = -1;
  const dataRows = [];
  const errors = [];

  const seenClaimIds = new Map();
  const seenSepNos = new Map();

  for (let i = 0; i < rawLines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = rawLines[i].trim();

    // Skip blank lines
    if (!rawLine) continue;

    // Skip comment lines
    if (rawLine.startsWith('#')) continue;

    // Find first non-comment, non-empty line as header
    if (!headerFound) {
      const headerCols = rawLine.split('|').map((col) => col.trim().toLowerCase());
      const isHeaderMatch =
        headerCols.length === EXPECTED_HEADERS.length &&
        EXPECTED_HEADERS.every((expected, idx) => headerCols[idx] === expected);

      if (!isHeaderMatch) {
        throw HttpError.badRequest(
          `Format header pada baris ${lineNumber} tidak sesuai. Header harus: ${EXPECTED_HEADERS.join('|')}`
        );
      }

      headerFound = true;
      headerIndex = lineNumber;
      continue;
    }

    // Process data rows
    const columns = rawLine.split('|').map((col) => col.trim());

    if (columns.length !== EXPECTED_HEADERS.length) {
      errors.push({
        line: lineNumber,
        reason: `Jumlah kolom tidak sesuai (diharapkan ${EXPECTED_HEADERS.length}, ditemukan ${columns.length}).`,
      });
      continue;
    }

    const [
      claimId,
      sepNo,
      submissionDate,
      serviceType,
      diagnosisCode,
      diagnosisName,
      procedureCode,
      procedureName,
      inaCbgCode,
      claimValueIdr,
      facilityCode,
      facilityName,
      batchPeriod,
    ] = columns;

    // Mandatory validations
    if (!claimId) {
      errors.push({ line: lineNumber, field: 'claim_id', reason: 'claim_id wajib diisi.' });
    }
    if (!sepNo) {
      errors.push({ line: lineNumber, field: 'sep_no', reason: 'sep_no wajib diisi.' });
    }
    if (!submissionDate || !isValidDate(submissionDate)) {
      errors.push({ line: lineNumber, field: 'submission_date', reason: `Format submission_date tidak valid (${submissionDate}), gunakan YYYY-MM-DD.` });
    }
    if (!serviceType) {
      errors.push({ line: lineNumber, field: 'service_type', reason: 'service_type wajib diisi.' });
    }
    if (!diagnosisCode) {
      errors.push({ line: lineNumber, field: 'diagnosis_code', reason: 'diagnosis_code wajib diisi.' });
    }
    if (!diagnosisName) {
      errors.push({ line: lineNumber, field: 'diagnosis_name', reason: 'diagnosis_name wajib diisi.' });
    }
    if (!inaCbgCode) {
      errors.push({ line: lineNumber, field: 'ina_cbg_code', reason: 'ina_cbg_code wajib diisi.' });
    }

    const claimValue = Number(claimValueIdr);
    if (isNaN(claimValue) || claimValue < 0) {
      errors.push({ line: lineNumber, field: 'claim_value_idr', reason: `claim_value_idr harus berupa bilangan nonnegatif (${claimValueIdr}).` });
    }

    if (!facilityCode) {
      errors.push({ line: lineNumber, field: 'facility_code', reason: 'facility_code wajib diisi.' });
    }
    if (!facilityName) {
      errors.push({ line: lineNumber, field: 'facility_name', reason: 'facility_name wajib diisi.' });
    }
    if (!batchPeriod || !/^\d{4}-\d{2}$/.test(batchPeriod)) {
      errors.push({ line: lineNumber, field: 'batch_period', reason: `Format batch_period harus YYYY-MM (${batchPeriod}).` });
    }

    // Duplicate detection within the file
    if (claimId) {
      if (seenClaimIds.has(claimId)) {
        errors.push({
          line: lineNumber,
          field: 'claim_id',
          reason: `Duplikasi claim_id '${claimId}' (sebelumnya ditemukan pada baris ${seenClaimIds.get(claimId)}).`,
        });
      } else {
        seenClaimIds.set(claimId, lineNumber);
      }
    }

    if (sepNo) {
      if (seenSepNos.has(sepNo)) {
        errors.push({
          line: lineNumber,
          field: 'sep_no',
          reason: `Duplikasi sep_no '${sepNo}' (sebelumnya ditemukan pada baris ${seenSepNos.get(sepNo)}).`,
        });
      } else {
        seenSepNos.set(sepNo, lineNumber);
      }
    }

    // Optional procedures handling ('-' denotes absent)
    const procCode = procedureCode === '-' || !procedureCode ? null : procedureCode;
    const procName = procedureName === '-' || !procedureName ? null : procedureName;

    // Service type normalization
    const normalizedServiceType =
      serviceType.toLowerCase().includes('inap') || serviceType.toUpperCase() === 'INPATIENT'
        ? 'INPATIENT'
        : 'OUTPATIENT';

    const normalizedCareType =
      normalizedServiceType === 'INPATIENT' ? 'Rawat Inap • Reguler' : 'Rawat Jalan • Poli';

    dataRows.push({
      lineNumber,
      claimId,
      sepNo,
      submissionDate,
      serviceType: normalizedServiceType,
      rawServiceType: serviceType,
      careType: normalizedCareType,
      diagnosisCode,
      diagnosisName,
      procedureCode: procCode,
      procedureName: procName,
      inaCbgCode,
      claimAmount: claimValue,
      facilityCode,
      facilityName,
      batchPeriod,
    });
  }

  if (!headerFound) {
    throw HttpError.badRequest('Header file TXT tidak ditemukan.');
  }

  if (errors.length > 0) {
    const errorMsg = errors.map((e) => `Baris ${e.line}: ${e.reason}`).join('; ');
    const err = HttpError.badRequest(`Validasi file TXT gagal: ${errorMsg}`);
    err.validationErrors = errors;
    throw err;
  }

  return dataRows;
}

module.exports = {
  parseDemoClaimTxt,
  EXPECTED_HEADERS,
};
