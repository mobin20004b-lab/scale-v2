import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNetWeight } from './net-weight.ts';

test('calculateNetWeight computes net from gross, spool deduction and bag deduction', () => {
  const result = calculateNetWeight({
    grossWeight: 120,
    spoolsCount: 12,
    spoolWeight: 1.5,
    bagWeight: 2,
  });

  assert.equal(result.spoolsTotalWeight, 18);
  assert.equal(result.netWeight, 100);
});

test('calculateNetWeight normalizes invalid numbers to zero', () => {
  const result = calculateNetWeight({
    grossWeight: Number.NaN,
    spoolsCount: Number.POSITIVE_INFINITY,
    spoolWeight: 2,
    bagWeight: Number.NaN,
  });

  assert.equal(result.grossWeight, 0);
  assert.equal(result.spoolsCount, 0);
  assert.equal(result.bagWeight, 0);
  assert.equal(result.spoolsTotalWeight, 0);
  assert.equal(result.netWeight, 0);
});
