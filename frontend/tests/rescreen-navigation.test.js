import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRescreenNavigation } from '../src/utils/rescreenNavigation.js';
import { getCorrectionDocument } from '../src/utils/correctionDocument.js';

test('appendectomy correction requests an operation report rather than a discharge summary', () => {
  const document = getCorrectionDocument({ screeningFindings: [{ code: 'missing_op_report' }] });
  assert.equal(document.type, 'operation_report');
  assert.equal(document.label, 'Laporan Operasi');
  assert.equal(getCorrectionDocument({ screeningFindings: [{ code: 'clinical_lab_review' }] }).type, 'discharge_summary');
});

test('passed correction opens ready claims across all periods with a success notice', () => {
  const destination = getRescreenNavigation({ screeningStatus: 'passed' });
  assert.equal(destination.to, '/faskes/claims?status=ready&period=all');
  assert.equal(destination.options.state.noticeTone, 'success');
});

test('failed correction opens the correction tab and preserves the screening reason', () => {
  const destination = getRescreenNavigation({ screeningStatus: 'needs_correction', screeningFindings: [{ message: 'Laporan operasi belum tersedia.' }] });
  assert.equal(destination.to, '/faskes/claims?status=needs_correction&period=all');
  assert.equal(destination.options.state.noticeTone, 'warning');
  assert.match(destination.options.state.notice, /Laporan operasi belum tersedia/);
});

test('an empty response cannot be treated as a passed correction', () => {
  assert.throws(() => getRescreenNavigation(null), /belum tersedia/);
});
