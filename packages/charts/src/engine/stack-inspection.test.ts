import { expect, it } from 'vitest';
import { stackInspectionValue } from './stack';

it('uses percentage-axis units instead of raw contribution totals', () => {
  expect(stackInspectionValue([200, 500, 300], 'percent')).toBe(100);
  expect(stackInspectionValue([0, 0, 0], 'percent')).toBe(0);
  expect(stackInspectionValue([200, null, 300], 'percent')).toBeNull();
});
it('labels the inspected signed boundary rather than the unrelated net total', () => {
  expect(stackInspectionValue([200, 500, -100], 'sum')).toBe(-100);
  expect(stackInspectionValue([-200, 500, 100], 'sum')).toBe(600);
  expect(stackInspectionValue([200, 500, 100], 'sum')).toBe(800);
});
