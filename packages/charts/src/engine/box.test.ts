import { describe, expect, it } from 'vitest';
import { summarizeBox } from './box';

describe('summarizeBox', () => {
  it('computes quartiles with linear interpolation', () => {
    expect(summarizeBox([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({
      min: 1,
      q1: 3,
      median: 5,
      q3: 7,
      max: 9,
      outliers: [],
      count: 9,
    });
  });

  it('ends whiskers at the furthest sample within 1.5 IQR and lists the rest as outliers', () => {
    const summary = summarizeBox([40, 1, 2, 3, 4, 5, 6, 7, 8, 9, -30]);
    expect(summary).toMatchObject({ q1: 2.5, median: 5, q3: 7.5, min: 1, max: 9 });
    expect(summary?.outliers).toEqual([-30, 40]);
    expect(summary?.count).toBe(11);
  });

  it('ignores non-finite samples and returns null when none remain', () => {
    expect(summarizeBox([Number.NaN, 4, Infinity])).toMatchObject({ median: 4, count: 1 });
    expect(summarizeBox([])).toBeNull();
    expect(summarizeBox([Number.NaN])).toBeNull();
  });
});
