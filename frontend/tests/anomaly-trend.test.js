import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnomalyTrend } from '../src/utils/anomalyTrend.js';

const categories = ['Upcoding', 'Repeat Billing', 'Incomplete Documents'];
test('trend counts backend claims per service month and includes categories outside the original four', () => {
  const claims = [
    { id: 'a', serviceDate: '2026-09-10', anomalyTypes: ['Upcoding', 'Upcoding'] },
    { id: 'b', serviceDate: '2026-10-10', anomalyTypes: ['Upcoding', 'Incomplete Documents'] },
    { id: 'c', serviceDate: '2026-10-11', anomalyTypes: ['Repeat Billing'] },
  ];
  const rows = buildAnomalyTrend(claims, categories);
  assert.equal(rows.length, 6);
  assert.equal(rows[4].Upcoding, 1);
  assert.equal(rows[5].Upcoding, 1);
  assert.equal(rows[5]['Repeat Billing'], 1);
  assert.equal(rows[5]['Incomplete Documents'], 1);
  assert.equal(rows[0].Upcoding, 0);
  assert.equal(buildAnomalyTrend([...claims, claims[2]], categories)[5]['Repeat Billing'], 1);
});

test('empty data and invalid dates do not produce fake findings', () => {
  assert.deepEqual(buildAnomalyTrend([], categories), []);
  assert.deepEqual(buildAnomalyTrend([{ id: 'a', serviceDate: '2026-02-31', anomalyTypes: ['Upcoding'] }], categories), []);
  const rows = buildAnomalyTrend([{ id: 'b', serviceDate: '2026-10-10', anomalyTypes: [] }], categories);
  assert.ok(rows.every((row) => categories.every((category) => row[category] === 0)));
});

test('the rolling window crosses a year boundary and changes when backend records change', () => {
  const rows = buildAnomalyTrend([
    { id: 'old', serviceDate: '2025-07-01', anomalyTypes: ['Upcoding'] },
    { id: 'dec', serviceDate: '2025-12-01', anomalyTypes: ['Upcoding'] },
    { id: 'jan', serviceDate: '2026-01-01', anomalyTypes: ['Repeat Billing'] },
  ], categories);
  assert.equal(rows[4].Upcoding, 1);
  assert.equal(rows[5]['Repeat Billing'], 1);
  assert.equal(rows.reduce((sum, row) => sum + row.Upcoding, 0), 1);
});
