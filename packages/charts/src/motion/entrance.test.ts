import { describe, expect, it } from 'vitest';
import { ENTRANCE_DURATION, entranceProgress, entranceStagger, entranceSweep } from './entrance';

describe('entrance choreography', () => {
  it.each([20, 280, 1400])('fully clears the first and last data at %dpx', (width) => {
    const left = 72;
    expect(entranceSweep(left, width, 0).end).toBeLessThanOrEqual(left);
    expect(entranceSweep(left, width, 1).start).toBeGreaterThanOrEqual(left + width);
  });

  it.each([1, 4, 400])('finishes every bar within one clock for %d observations', (count) => {
    for (let index = 0; index < count; index++) {
      const delay = entranceStagger(index, count);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(100);
      expect(entranceProgress(0, delay, ENTRANCE_DURATION - delay)).toBe(0);
      expect(entranceProgress(ENTRANCE_DURATION, delay, ENTRANCE_DURATION - delay)).toBe(1);
    }
  });
});
