import { describe, expect, it } from 'vitest';
import { syncTarget } from './chart-sync';

const day = 86_400_000;

describe('syncTarget', () => {
  it('matches labels exactly and only within the same x kind', () => {
    expect(syncTarget({ key: 'Feb', kind: 'category' }, 'category', ['Jan', 'Feb'], [0, 1])).toBe(
      1,
    );
    expect(syncTarget({ key: 'Mar', kind: 'category' }, 'category', ['Jan', 'Feb'], [0, 1])).toBe(
      null,
    );
    expect(syncTarget({ key: 1, kind: 'number' }, 'category', ['Jan', 'Feb'], [0, 1])).toBe(null);
  });

  it('snaps dates to the nearest row within half a step', () => {
    const weeks = [0, 7, 14, 21].map((offset) => offset * day);
    // Day 9 is nearest week two's start.
    expect(syncTarget({ key: 9 * day, kind: 'time' }, 'time', [], weeks)).toBe(7 * day);
    // Far past the last week there is no row to follow.
    expect(syncTarget({ key: 40 * day, kind: 'time' }, 'time', [], weeks)).toBe(null);
    expect(syncTarget({ key: 14 * day, kind: 'time' }, 'time', [], weeks)).toBe(14 * day);
  });
});
