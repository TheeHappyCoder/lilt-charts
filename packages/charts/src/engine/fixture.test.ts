import { describe, expect, it } from 'vitest';

interface TestRevenueDay {
  date: number;
  revenue: number;
  previous: number;
}

const revenueRows: readonly TestRevenueDay[] = [
  { date: Date.UTC(2026, 8, 1), revenue: 55_610, previous: 48_090 },
  { date: Date.UTC(2026, 8, 28), revenue: 0, previous: 0 },
];

function totalFor(rows: readonly TestRevenueDay[], key: 'revenue' | 'previous'): number {
  return rows.reduce((total, row) => total + row[key], 0);
}

function periodDelta(rows: readonly TestRevenueDay[]): number {
  return (totalFor(rows, 'revenue') / totalFor(rows, 'previous') - 1) * 100;
}

describe('daily revenue fixture', () => {
  it('uses deterministic UTC dates and the architected totals', () => {
    expect(revenueRows[0].date).toBe(Date.UTC(2026, 8, 1));
    expect(revenueRows.at(-1)?.date).toBe(Date.UTC(2026, 8, 28));
    expect(totalFor(revenueRows, 'revenue')).toBe(55_610);
    expect(totalFor(revenueRows, 'previous')).toBe(48_090);
    expect(periodDelta(revenueRows)).toBeCloseTo(15.6373466, 6);
  });
});
