// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { layoutSize } from './use-chart-width';

afterEach(() => vi.restoreAllMocks());

function element(
  box: { width: number; height: number },
  offset: { width: number; height: number },
) {
  const node = document.createElement('div');
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
    ...box,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: box.width,
    bottom: box.height,
    toJSON: () => ({}),
  });
  Object.defineProperty(node, 'offsetWidth', { value: offset.width });
  Object.defineProperty(node, 'offsetHeight', { value: offset.height });
  return node;
}

describe('layoutSize', () => {
  it('ignores a scale transform, so a chart in a thumbnail lays out at its own size', () => {
    // A 560 × 240 card drawn at 0.3 reports a 168 × 72 bounding box.
    expect(layoutSize(element({ width: 168, height: 72 }, { width: 560, height: 240 }))).toEqual({
      width: 560,
      height: 240,
    });
  });

  it('keeps the exact fractional box when nothing is transformed', () => {
    expect(
      layoutSize(element({ width: 523.6, height: 240.4 }, { width: 524, height: 240 })),
    ).toEqual({ width: 523.6, height: 240.4 });
  });

  it('falls back to the box where layout reports nothing', () => {
    expect(layoutSize(element({ width: 320, height: 200 }, { width: 0, height: 0 }))).toEqual({
      width: 320,
      height: 200,
    });
  });
});
