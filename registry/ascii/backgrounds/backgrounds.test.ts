import { describe, expect, it } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer, AsciiScene } from '../engine/types';
import { createDotGrid } from './dot-grid';
import { createMatrix } from './matrix';
import { createStarfield } from './starfield';
import { createTopography } from './topography';

const grid = { cols: 120, rows: 40, aspect: 2.1 };
const idle: AsciiPointer = { x: 0, y: 0, active: false };

function run(scene: AsciiScene, seconds: number, pointer = idle, g = grid) {
  scene.resize(g);
  for (let t = 0; t < seconds; t += 1 / 60) scene.step(1 / 60, pointer);
  return frame(scene, g);
}

function frame(scene: AsciiScene, g = grid) {
  const surface = new GlyphSurface();
  surface.resize(g.cols, g.rows);
  scene.draw(surface);
  return surface;
}

const inked = (surface: GlyphSurface) => surface.glyph.reduce((n, g) => n + (g ? 1 : 0), 0);

/** Mean opacity step of the inked cells: backgrounds must stay quiet. */
function meanLevel(surface: GlyphSurface) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < surface.glyph.length; i++) {
    if (!surface.glyph[i]) continue;
    sum += surface.level[i]!;
    n++;
  }
  return n ? sum / n / LEVELS : 0;
}

const scenes: [string, () => AsciiScene][] = [
  ['dot grid', () => createDotGrid()],
  ['matrix', () => createMatrix()],
  ['topography', () => createTopography()],
  ['starfield', () => createStarfield()],
];

describe.each(scenes)('%s', (_name, create) => {
  it('draws a picture that neither floods nor empties the grid', () => {
    const share = inked(run(create(), 3)) / (grid.cols * grid.rows);
    expect(share).toBeGreaterThan(0.01);
    expect(share).toBeLessThan(0.4);
  });

  it('stays quiet enough to sit behind text', () => {
    expect(meanLevel(run(create(), 3))).toBeLessThan(0.55);
  });

  it('only writes colours its palette has', () => {
    const scene = create();
    const surface = run(scene, 2, { x: 60, y: 20, active: true });
    for (let i = 0; i < surface.glyph.length; i++) {
      if (!surface.glyph[i]) continue;
      expect(surface.tone[i]).toBeLessThan(scene.palette.length);
      expect(surface.level[i]).toBeGreaterThanOrEqual(1);
      expect(surface.level[i]).toBeLessThanOrEqual(LEVELS);
    }
  });

  it('answers the pointer and a press, and survives a resize', () => {
    const scene = create();
    const before = run(scene, 1);
    const pointer = { x: grid.cols / 2, y: grid.rows / 2, active: true };
    for (let i = 0; i < 40; i++) scene.step(1 / 60, pointer);
    scene.press?.(grid.cols / 2, grid.rows / 2);
    for (let i = 0; i < 20; i++) scene.step(1 / 60, pointer);
    const after = frame(scene);
    let changed = 0;
    for (let i = 0; i < before.glyph.length; i++) {
      if (before.glyph[i] !== after.glyph[i] || before.level[i] !== after.level[i]) changed++;
    }
    expect(changed).toBeGreaterThan(0);

    const small = { cols: 40, rows: 12, aspect: 2 };
    scene.resize(small);
    for (let i = 0; i < 30; i++) scene.step(1 / 60, idle);
    const surface = frame(scene, small);
    expect(surface.glyph.every((g) => Number.isInteger(g))).toBe(true);
  });

  it('draws and steps a large screen within a few milliseconds', () => {
    const big = { cols: 160, rows: 50, aspect: 2.1 };
    const scene = create();
    run(scene, 0.5, { x: 80, y: 25, active: true }, big);
    scene.press?.(80, 25);
    const surface = new GlyphSurface();
    surface.resize(big.cols, big.rows);
    const frames = 30;
    const start = performance.now();
    for (let i = 0; i < frames; i++) {
      scene.step(1 / 60, { x: 80 + i, y: 25, active: true });
      surface.clear();
      scene.draw(surface);
    }
    // Generous for slow CI machines; in a browser each frame takes about a millisecond or two.
    expect((performance.now() - start) / frames).toBeLessThan(12);
  });
});

describe('dot grid', () => {
  it('keeps an even lattice at rest', () => {
    const surface = run(createDotGrid({ spacing: 4, breathe: false }), 2);
    const cols = new Set<number>();
    for (let i = 0; i < surface.glyph.length; i++) if (surface.glyph[i]) cols.add(i % grid.cols);
    const sorted = [...cols].sort((a, b) => a - b);
    for (let k = 1; k < sorted.length; k++) expect(sorted[k]! - sorted[k - 1]!).toBe(4);
  });

  it('lights dots in the accent colour near the pointer', () => {
    const surface = run(createDotGrid(), 1, { x: 60, y: 20, active: true });
    expect(surface.tone.some((t, i) => t === 1 && surface.glyph[i] !== 0)).toBe(true);
  });
});

describe('matrix', () => {
  it('rains only the given characters', () => {
    const surface = run(createMatrix({ characters: '01' }), 3);
    for (const g of surface.glyph) if (g) expect([48, 49]).toContain(g);
  });

  it('a press sends more rain', () => {
    const scene = createMatrix({ density: 0.1 });
    const before = inked(run(scene, 2));
    scene.press?.(60, 5);
    for (let i = 0; i < 30; i++) scene.step(1 / 60, idle);
    expect(inked(frame(scene))).toBeGreaterThan(before);
  });
});

describe('topography', () => {
  it('draws contours with strokes only', () => {
    const surface = run(createTopography(), 1);
    const strokes = new Set([...'-_/|\\'].map((c) => c.charCodeAt(0)));
    for (const g of surface.glyph) if (g) expect(strokes.has(g)).toBe(true);
  });

  it('more levels draw more lines', () => {
    const few = inked(run(createTopography({ levels: 6, drift: 0 }), 0.5));
    const many = inked(run(createTopography({ levels: 24, drift: 0 }), 0.5));
    expect(many).toBeGreaterThan(few);
  });
});

describe('starfield', () => {
  it('a press stretches the streaks', () => {
    const calm = createStarfield();
    const surfaceCalm = run(calm, 2);
    const warp = createStarfield();
    run(warp, 2);
    warp.press?.(60, 20);
    for (let i = 0; i < 20; i++) warp.step(1 / 60, idle);
    expect(inked(frame(warp))).toBeGreaterThan(inked(surfaceCalm));
  });
});
