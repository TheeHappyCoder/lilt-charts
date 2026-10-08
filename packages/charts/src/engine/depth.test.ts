import { describe, expect, it } from 'vitest';
import {
  DEPTH_SLOPE,
  MAX_RISE,
  centeredPrism,
  columnDepth,
  depthOffset,
  prismFaces,
} from './depth';
import { boxBlock, rangeBarPrism, type RangeScales } from './ranges';

const scales: RangeScales = {
  x: (value) => value,
  y: (value) => 200 - value,
  xDomain: [0, 100],
  columnWidth: 20,
};

describe('depth geometry', () => {
  it('recedes every family up and to the right on one slope', () => {
    expect(depthOffset(14)).toEqual({ dx: 14, dy: -8 });
    expect(MAX_RISE).toBeCloseTo(8);
    expect(prismFaces(0, 50, 40, 100, 10).rise).toBeCloseTo(10 * DEPTH_SLOPE);
  });

  it('keeps the measured front and fits the whole prism in its footprint', () => {
    const faces = prismFaces(10, 40, 48, 60);
    expect(faces.front).toBe(`M10,40H${10 + faces.frontWidth}V100H10Z`);
    expect(faces.frontWidth + faces.depth).toBe(48);
    expect(faces.top).not.toBeNull();
    expect(prismFaces(10, 40, 48, 60, 11, false).top).toBeNull();
  });

  it('gives tiny or empty columns proportionately less depth, never a false minimum', () => {
    expect(columnDepth(0, 40)).toBe(0);
    expect(columnDepth(40, 0)).toBe(0);
    expect(columnDepth(40, 2)).toBeLessThan(columnDepth(40, 40));
    expect(columnDepth(400, 400)).toBe(14);
  });

  it('centers range and box fronts on the reading, spanning exactly their two values', () => {
    const range = rangeBarPrism(50, 30, 90, scales);
    const [, left, top, right, bottom] = /M([\d.]+),([\d.]+)H([\d.]+)V([\d.]+)/
      .exec(range.front)!
      .map(Number);
    expect((left + right) / 2).toBeCloseTo(50);
    expect(top).toBe(110);
    expect(bottom).toBe(170);
    expect(centeredPrism(50, 0, 20, 40).frontWidth).toBeLessThan(20);
  });

  it('centers a box block on the reading, with whiskers through the middle of its faces', () => {
    const block = boxBlock(50, { min: 10, q1: 40, median: 60, q3: 80, max: 95 }, scales);
    // The front spans Q1 to Q3 exactly; the block's footprint is centered on the reading.
    expect(block.faces.front).toBe(`M40,120H${40 + block.faces.frontWidth}V160H40Z`);
    expect(block.faces.frontWidth + block.faces.depth).toBe(20);
    expect(block.lift).toBeCloseTo(block.faces.rise / 2);
    // Both stems run straight up and down the middle, half the depth back.
    const start = (d: string) => /^M([\d.]+),([\d.]+)V/.exec(d)!.slice(1).map(Number);
    expect(start(block.upper)[0]).toBe(50);
    expect(start(block.upper)[1]).toBeCloseTo(120 - block.lift, 1);
    expect(start(block.lower)[0]).toBe(50);
    expect(start(block.lower)[1]).toBeCloseTo(160 - block.lift, 1);
    // The median crosses the front, then wraps up the side.
    expect(block.median).toMatch(/^M40,140H[\d.]+L[\d.]+,[\d.]+$/);
  });
});
