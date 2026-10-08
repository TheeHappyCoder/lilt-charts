import { describe, expect, it } from 'vitest';
import type { GeometrySegment } from '../engine/geometry';
import { extendAreaPath, extendLinePath, segmentEdges } from './runoff';

const segment = (areaTail: string): GeometrySegment => ({
  points: [
    { x: 20, y: 50 },
    { x: 80, y: 30 },
  ],
  pieces: [],
  path: 'M20,50 L80,30',
  areaPath: `M20,50 L80,30 ${areaTail}`,
  startX: 20,
  endX: 80,
});

describe('runoff paths', () => {
  it('extends a line flat to both edges as one continuous path', () => {
    expect(extendLinePath(segment(''), { left: 0, right: 100 })).toBe(
      'M0,50 L20,50 L80,30 L100,30',
    );
  });

  it('extends a baseline area into one closed outline without a seam', () => {
    const area = segment('L80,200 L20,200 Z');
    expect(extendAreaPath(area, { left: 0, right: 100 })).toBe(
      'M0,50 L20,50 L80,30 L100,30 L100,200 L80,200 L20,200 L0,200 Z',
    );
  });

  it('extends a stacked band along both of its boundaries', () => {
    const band = segment('L80,90 L20,120 Z');
    expect(extendAreaPath(band, { left: 0 })).toBe('M0,50 L20,50 L80,30 L80,90 L20,120 L0,120 Z');
  });

  it('only extends the outer ends of the first and last segments', () => {
    const edges = { left: 0, right: 100, dataStart: 20, dataEnd: 80 };
    expect(segmentEdges(edges, 0, 3)).toEqual({ left: 0, right: undefined });
    expect(segmentEdges(edges, 1, 3)).toEqual({ left: undefined, right: undefined });
    expect(segmentEdges(edges, 2, 3)).toEqual({ left: undefined, right: 100 });
    expect(segmentEdges(null, 0, 1)).toEqual({});
  });

  it('reuses an extension until its segment or edges change', () => {
    // Marks redraw on every hover; rebuilding a path as long as the data each time was the cost.
    const area = segment('L80,200 L20,200 Z');
    const first = extendAreaPath(area, { left: 0, right: 100 });
    expect(extendAreaPath(area, { left: 0, right: 100 })).toBe(first);
    expect(extendAreaPath(area, { left: 0 })).toBe('M0,50 L20,50 L80,30 L80,200 L20,200 L0,200 Z');
    expect(extendAreaPath(segment('L80,200 L20,200 Z'), { left: 0, right: 100 })).toBe(first);
    expect(extendLinePath(area, { right: 100 })).toBe('M20,50 L80,30 L100,30');
  });
});
