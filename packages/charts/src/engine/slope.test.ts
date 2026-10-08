import { describe, expect, it } from 'vitest';
import { changeBetween, slopeDomain, slopeRows, slopeTotals, spreadLabels } from './slope';

const regions = [
  { region: 'North', before: 100, after: 130 },
  { region: 'South', before: 200, after: 150 },
  { region: 'East', before: null, after: 90 },
  { region: 'West', before: 0, after: 40 },
];

describe('slope engine', () => {
  it('reads both ends and orders by change, with incomplete rows last', () => {
    const rows = slopeRows(regions, 'region', 'before', 'after');
    expect(rows.map((row) => row.id)).toEqual(['West', 'North', 'South', 'East']);
    expect(rows[1]).toMatchObject({ from: 100, to: 130, change: 30, ratio: 0.3 });
    expect(rows[3]).toMatchObject({ from: null, to: 90, change: null, ratio: null });
  });

  it('gives no percentage against a zero or negative start', () => {
    expect(changeBetween(0, 40)).toEqual({ change: 40, ratio: null });
    expect(changeBetween(-10, 10)).toEqual({ change: 20, ratio: null });
  });

  it('keeps input order or sorts by the later value', () => {
    expect(slopeRows(regions, 'region', 'before', 'after', 'input').map((row) => row.id)).toEqual([
      'North',
      'South',
      'East',
      'West',
    ]);
    expect(slopeRows(regions, 'region', 'before', 'after', 'to').map((row) => row.id)).toEqual([
      'South',
      'North',
      'East',
      'West',
    ]);
  });

  it('totals every later value, and compares only categories measured at both ends', () => {
    const totals = slopeTotals(slopeRows(regions, 'region', 'before', 'after'));
    expect(totals.to).toBe(410);
    // North, South and West: 300 → 320.
    expect(totals.change).toBe(20);
    expect(totals.ratio).toBeCloseTo(20 / 300);
  });

  it('rejects duplicate names and non-numeric values', () => {
    expect(() =>
      slopeRows(
        [
          { region: 'A', before: 1, after: 2 },
          { region: 'A', before: 1, after: 2 },
        ],
        'region',
        'before',
        'after',
      ),
    ).toThrow(/Duplicate/);
    expect(() =>
      slopeRows([{ region: 'A', before: '1', after: 2 }], 'region', 'before', 'after'),
    ).toThrow(/finite number or null/);
  });

  it('pads the domain around both ends', () => {
    const [min, max] = slopeDomain(slopeRows(regions, 'region', 'before', 'after'));
    expect(min).toBeLessThan(0);
    expect(max).toBeGreaterThan(200);
  });

  it('spreads colliding labels at least a gap apart, near their targets and in bounds', () => {
    const placed = spreadLabels([50, 52, 54, 120], 16, 0, 200);
    const sorted = [...placed].sort((a, b) => a - b);
    for (let index = 1; index < sorted.length; index += 1)
      expect(sorted[index]! - sorted[index - 1]!).toBeGreaterThanOrEqual(16 - 1e-9);
    // The cluster centres on its targets rather than only pushing down.
    expect(placed[0]).toBeLessThan(50);
    expect(placed[3]).toBe(120);
    const crowded = spreadLabels([195, 196, 197], 16, 0, 200);
    expect(Math.max(...crowded)).toBeLessThanOrEqual(200);
  });
});
