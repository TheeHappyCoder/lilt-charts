import { describe, expect, it } from 'vitest';
import { barPath, type BarGeometry } from './bars';
import { ISOMETRIC_BAR_RISE, isometricBarGeometry } from './isometric-bars';

const positive: BarGeometry = {
  valueX: 0,
  x: 12,
  y: 40,
  width: 48,
  height: 60,
  baseline: 100,
  negative: false,
};
const mark = { stacked: false, geometry: {}, seriesIds: ['a'], seriesId: 'a', radius: 3 };

describe('isometric bar geometry', () => {
  it('preserves the front value and baseline for positive and negative readings', () => {
    for (const bar of [positive, { ...positive, y: 100, negative: true }]) {
      const faces = isometricBarGeometry(bar, mark)!;
      expect(faces.y).toBe(bar.y);
      expect(faces.height).toBe(bar.height);
      // Square even though the mark asks for a radius: a rounded front reads as a stuck-on plate.
      expect(faces.front).toBe(barPath({ ...bar, width: faces.width }, 1, { radius: 0 }));
      // Depth must fit inside the allocated slot, including at the chart's right edge.
      expect(faces.x + faces.width + faces.depth).toBeCloseTo(bar.x + bar.width);
      expect(faces.rise).toBeLessThanOrEqual(ISOMETRIC_BAR_RISE);
    }
  });

  it('does not invent volume for zero values or at the start of an entrance', () => {
    expect(isometricBarGeometry({ ...positive, height: 0 }, mark)).toBeNull();
    expect(isometricBarGeometry(positive, { ...mark, progress: 0 })).toBeNull();
    const tiny = isometricBarGeometry({ ...positive, y: 99.5, height: 0.5, width: 2 }, mark)!;
    expect(tiny.height).toBe(0.5);
    expect(tiny.rise).toBeLessThan(tiny.height);
    expect(tiny.width).toBeGreaterThan(0);
    expect(`${tiny.front}${tiny.side}${tiny.top}`).not.toMatch(/NaN|Infinity/);
  });

  it('grows all faces from the same origin during entrance', () => {
    const faces = isometricBarGeometry(positive, { ...mark, progress: 0.5, originY: 100 })!;
    expect(faces.y).toBe(70);
    expect(faces.height).toBe(30);
    expect(faces.y + faces.height).toBe(positive.baseline);
  });

  it('caps only exposed stack tops, including stacks below zero', () => {
    for (const negative of [false, true]) {
      const a = { ...positive, negative, y: negative ? 100 : 40 };
      const b = { ...a, y: negative ? 160 : 0, height: 40 };
      const options = {
        ...mark,
        stacked: true,
        geometry: { a: [a], b: [b] },
        seriesIds: ['a', 'b'],
      };
      const lower = isometricBarGeometry(a, options)!;
      const upper = isometricBarGeometry(b, { ...options, seriesId: 'b' })!;
      expect(lower.top !== null).toBe(negative);
      expect(upper.top !== null).toBe(!negative);
      expect(lower.height + upper.height).toBe(100);
      // Deliberate segment gaps reveal a cap without adding to the measured stack.
      const separated = isometricBarGeometry(a, { ...options, segmentGap: 2 })!;
      expect(separated.top).not.toBeNull();
      expect(separated.height).toBe(58);
      expect(separated.y).toBe(negative ? 100 : 42);
    }
  });

  it('grounds only the floor segment and keeps its shadow inside the slot', () => {
    const next = { ...positive, valueX: 1, x: 72 };
    const faces = isometricBarGeometry(positive, { ...mark, geometry: { a: [positive, next] } })!;
    expect(faces.grounded).toBe(true);
    // A 12px gap between bars: the shadow may reach halfway, never under the plot edge.
    expect(faces.x + faces.width + faces.depth + faces.cast).toBeLessThanOrEqual(
      positive.x + positive.width + 6,
    );
    const upper = { ...positive, y: 0, height: 40 };
    const stack = {
      ...mark,
      stacked: true,
      geometry: { a: [positive], b: [upper] },
      seriesIds: ['a', 'b'],
    };
    expect(isometricBarGeometry(upper, { ...stack, seriesId: 'b' })!.grounded).toBe(false);
    expect(isometricBarGeometry(upper, { ...stack, seriesId: 'b' })!.shadow).toBeNull();
    expect(isometricBarGeometry({ ...positive, y: 100, negative: true }, mark)!.shadow).toBeNull();
  });
});
