import { describe, expect, it } from 'vitest';
import { nearestVisibleRowIndex } from './lookup';

describe('nearestVisibleRowIndex', () => {
  const rows = Array.from({ length: 2000 }, (_, x) => ({ x }));
  it('looks up actual observations inside a focused domain without an all-row candidate array', () => {
    expect(nearestVisibleRowIndex(rows, [900, 1100], 949.6, (x) => x)).toBe(950);
    expect(nearestVisibleRowIndex(rows, [900, 1100], 0, (x) => x)).toBe(900);
    expect(nearestVisibleRowIndex(rows, [900, 1100], 2000, (x) => x)).toBe(1100);
    expect(nearestVisibleRowIndex(rows, [2500, 3000], 2700, (x) => x)).toBeNull();
  });
});
