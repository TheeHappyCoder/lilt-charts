import { describe, expect, it } from 'vitest';
import { compositionShares } from './composition';

describe('composition shares', () => {
  it('normalizes each period and preserves measured zeros', () => {
    expect(compositionShares([30, 70, 0])).toEqual([30, 70, 0]);
    expect(compositionShares([6, 2])).toEqual([75, 25]);
    expect(compositionShares([5])).toEqual([100]);
    expect(compositionShares([])).toEqual([]);
  });
  it.each([null, undefined, NaN, Infinity, -1, '10'])(
    'leaves an incomplete or invalid period as gaps (%s)',
    (invalid) => {
      expect(compositionShares([20, invalid])).toEqual([null, null]);
    },
  );
  it('does not invent a composition for a zero-total period', () => {
    expect(compositionShares([0, 0])).toEqual([null, null]);
  });
  it('handles large and tiny finite measurements without overflow', () => {
    expect(compositionShares([Number.MAX_VALUE, Number.MAX_VALUE])).toEqual([50, 50]);
    expect(compositionShares([Number.MIN_VALUE, Number.MIN_VALUE])).toEqual([50, 50]);
  });
});
