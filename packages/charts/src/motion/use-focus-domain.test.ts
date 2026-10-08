import { describe, expect, it } from 'vitest';
import { interpolateDomain } from './use-focus-domain';

describe('focus domain interpolation', () => {
  const full = { x: [0, 28] as const, y: [0, 3000] as const };
  const focused = { x: [4, 22] as const, y: [1000, 2500] as const };
  it('uses the same clamped progress for x and y, including a reverse or interrupted move', () => {
    const middle = interpolateDomain(full, focused, 0.5);
    expect(middle).toEqual({ x: [2, 25], y: [500, 2750] });
    expect(interpolateDomain(middle, full, 0.5)).toEqual({ x: [1, 26.5], y: [250, 2875] });
    expect(interpolateDomain(full, focused, 2)).toEqual(focused);
    expect(interpolateDomain(full, focused, -1)).toEqual(full);
  });
});
