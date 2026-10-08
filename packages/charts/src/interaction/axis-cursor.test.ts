import { describe, expect, it } from 'vitest';
import { proximityOpacity } from './axis-cursor';

describe('proximityOpacity', () => {
  it('hides a label under the pill, restores it out of reach, and eases in between', () => {
    expect(proximityOpacity(0, 64, 1)).toBe(0);
    expect(proximityOpacity(64, 64, 1)).toBe(1);
    expect(proximityOpacity(-80, 64, 1)).toBe(1);
    const near = proximityOpacity(30, 64, 1);
    const nearer = proximityOpacity(26, 64, 1);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(1);
    expect(nearer).toBeLessThan(near);
  });

  it('leaves labels untouched when no pill is showing', () => {
    expect(proximityOpacity(0, 64, 0)).toBe(1);
    expect(proximityOpacity(0, 64, 0.5)).toBe(0.5);
  });
});
