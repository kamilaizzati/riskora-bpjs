const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseDemoClaimTxt } = require('../src/utils/txt-parser');

describe('Demo Claim TXT Parser Unit Tests', () => {
  const sampleFilePath = path.join(__dirname, '../../demo_batch_sardjito_oktober_2026.txt');

  it('successfully parses the actual demo_batch_sardjito_oktober_2026.txt into 20 claims', () => {
    assert.ok(fs.existsSync(sampleFilePath), 'File demo_batch_sardjito_oktober_2026.txt harus ada');
    const content = fs.readFileSync(sampleFilePath, 'utf8');
    const result = parseDemoClaimTxt(content);

    assert.equal(result.length, 20, 'Harus menghasilkan tepat 20 klaim');
    assert.equal(result[0].claimId, 'CLM-FKS-202610-0001');
    assert.equal(result[0].sepNo, 'DEMO-SEP-202610-0001');
    assert.equal(result[0].serviceType, 'OUTPATIENT');
    assert.equal(result[0].procedureCode, null, 'Tanda - harus diubah menjadi null');
    assert.equal(result[0].claimAmount, 425000);
    assert.equal(result[0].facilityName, 'RSUP Dr. Sardjito');
    assert.equal(result[0].batchPeriod, '2026-10');

    // Row 5 has procedure 47.09
    const row5 = result.find((r) => r.claimId === 'CLM-FKS-202610-0005');
    assert.ok(row5);
    assert.equal(row5.procedureCode, '47.09');
    assert.equal(row5.serviceType, 'INPATIENT');
    assert.equal(row5.claimAmount, 12800000);
  });

  it('rejects empty content', () => {
    assert.throws(
      () => parseDemoClaimTxt('   '),
      /File TXT tidak boleh kosong/
    );
  });

  it('rejects file without header', () => {
    const content = '# Hanya komentar\n# Komentar kedua';
    assert.throws(
      () => parseDemoClaimTxt(content),
      /Header file TXT tidak ditemukan/
    );
  });

  it('rejects invalid header columns', () => {
    const content = 'claim_id|sep_no|submission_date\n1|2|3';
    assert.throws(
      () => parseDemoClaimTxt(content),
      /Format header pada baris 1 tidak sesuai/
    );
  });

  it('rejects rows with invalid column count', () => {
    const content = [
      'claim_id|sep_no|submission_date|service_type|diagnosis_code|diagnosis_name|procedure_code|procedure_name|ina_cbg_code|claim_value_idr|facility_code|facility_name|batch_period',
      'CLM-01|SEP-01|2026-10-01|Rawat Jalan|J18.9',
    ].join('\n');

    assert.throws(
      () => parseDemoClaimTxt(content),
      /Jumlah kolom tidak sesuai/
    );
  });

  it('rejects rows with invalid date format', () => {
    const content = [
      'claim_id|sep_no|submission_date|service_type|diagnosis_code|diagnosis_name|procedure_code|procedure_name|ina_cbg_code|claim_value_idr|facility_code|facility_name|batch_period',
      'CLM-01|SEP-01|01-10-2026|Rawat Jalan|J18.9|Pneumonia|-|Konsul|DEMO-01|100000|F01|RS|2026-10',
    ].join('\n');

    assert.throws(
      () => parseDemoClaimTxt(content),
      /Format submission_date tidak valid/
    );
  });

  it('rejects rows with negative or invalid claim amount', () => {
    const content = [
      'claim_id|sep_no|submission_date|service_type|diagnosis_code|diagnosis_name|procedure_code|procedure_name|ina_cbg_code|claim_value_idr|facility_code|facility_name|batch_period',
      'CLM-01|SEP-01|2026-10-01|Rawat Jalan|J18.9|Pneumonia|-|Konsul|DEMO-01|-50000|F01|RS|2026-10',
    ].join('\n');

    assert.throws(
      () => parseDemoClaimTxt(content),
      /claim_value_idr harus berupa bilangan nonnegatif/
    );
  });

  it('rejects duplicate claim_id within the file', () => {
    const content = [
      'claim_id|sep_no|submission_date|service_type|diagnosis_code|diagnosis_name|procedure_code|procedure_name|ina_cbg_code|claim_value_idr|facility_code|facility_name|batch_period',
      'CLM-01|SEP-01|2026-10-01|Rawat Jalan|J18.9|Pneumonia|-|Konsul|DEMO-01|100000|F01|RS|2026-10',
      'CLM-01|SEP-02|2026-10-02|Rawat Jalan|J18.9|Pneumonia|-|Konsul|DEMO-01|100000|F01|RS|2026-10',
    ].join('\n');

    assert.throws(
      () => parseDemoClaimTxt(content),
      /Duplikasi claim_id 'CLM-01'/
    );
  });

  it('rejects duplicate sep_no within the file', () => {
    const content = [
      'claim_id|sep_no|submission_date|service_type|diagnosis_code|diagnosis_name|procedure_code|procedure_name|ina_cbg_code|claim_value_idr|facility_code|facility_name|batch_period',
      'CLM-01|SEP-01|2026-10-01|Rawat Jalan|J18.9|Pneumonia|-|Konsul|DEMO-01|100000|F01|RS|2026-10',
      'CLM-02|SEP-01|2026-10-02|Rawat Jalan|J18.9|Pneumonia|-|Konsul|DEMO-01|100000|F01|RS|2026-10',
    ].join('\n');

    assert.throws(
      () => parseDemoClaimTxt(content),
      /Duplikasi sep_no 'SEP-01'/
    );
  });
});
