import { describe, expect, it } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer, AsciiScene } from '../engine/types';
import { createFireworks } from './fireworks';
import { createLava } from './lava';
import { createShore } from './shore';
import { createSnow } from './snow';

const grid = { cols: 150, rows: 50, aspect: 1.9 };
const idle: AsciiPointer = { x: 0, y: 0, active: false };

function run(scene: AsciiScene, seconds: number, pointer = idle) {
  scene.resize(grid);
  for (let t = 0; t < seconds; t += 1 / 60) scene.step(1 / 60, pointer);
  const surface = new GlyphSurface();
  surface.resize(grid.cols, grid.rows);
  scene.draw(surface);
  return surface;
}

/** Cells holding a glyph or a block. */
function inked(surface: GlyphSurface) {
  let n = 0;
  for (let i = 0; i < surface.glyph.length; i++) {
    if (surface.glyph[i] || surface.blockLevel[i]) n++;
  }
  return n;
}

/** A word-shaped mask for the snow: two solid slabs standing on the ground. */
function slabs(cols: number, rows: number) {
  const mask = new Float32Array(cols * rows);
  for (let row = Math.floor(rows * 0.6); row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const inA = col > cols * 0.2 && col < cols * 0.4;
      const inB = col > cols * 0.55 && col < cols * 0.8;
      if (inA || inB) mask[row * cols + col] = 1;
    }
  }
  return mask;
}

const scenes: [string, () => AsciiScene][] = [
  ['fireworks', () => createFireworks()],
  ['snow', () => createSnow({ mask: slabs })],
  ['snow without a word', () => createSnow({ text: '' })],
  ['lava', () => createLava()],
  ['lava full-bleed', () => createLava({ lamp: false })],
  ['shore', () => createShore()],
];

describe.each(scenes)('%s', (_name, create) => {
  it('draws a picture that neither floods nor empties the grid', () => {
    const surface = run(create(), 3);
    const share = inked(surface) / (grid.cols * grid.rows);
    expect(share).toBeGreaterThan(0.01);
    expect(share).toBeLessThan(0.8);
  });

  it('only writes colours its palette has', () => {
    const scene = create();
    const surface = run(scene, 2);
    for (let i = 0; i < surface.glyph.length; i++) {
      if (surface.glyph[i]) {
        expect(surface.tone[i]).toBeLessThan(scene.palette.length);
        expect(surface.level[i]).toBeGreaterThanOrEqual(1);
        expect(surface.level[i]).toBeLessThanOrEqual(LEVELS);
      }
      if (surface.blockLevel[i]) expect(surface.blockTone[i]).toBeLessThan(scene.palette.length);
    }
  });

  it('survives a pointer, presses and a resize', () => {
    const scene = create();
    const pointer = { x: grid.cols / 2, y: grid.rows / 2, active: true };
    run(scene, 1, pointer);
    for (let k = 0; k < 8; k++) scene.press?.(grid.cols * (0.2 + k * 0.08), grid.rows * 0.4);
    for (let i = 0; i < 120; i++) {
      scene.step(1 / 60, { x: pointer.x + Math.sin(i / 9) * 20, y: grid.rows * 0.7, active: true });
    }
    scene.resize({ cols: 40, rows: 12, aspect: 2 });
    const surface = new GlyphSurface();
    surface.resize(40, 12);
    for (let i = 0; i < 30; i++) scene.step(1 / 60, idle);
    scene.draw(surface);
    expect(surface.glyph.every((g) => Number.isInteger(g))).toBe(true);
  });

  it('steps and draws a frame within a few milliseconds', () => {
    const scene = create();
    const surface = run(scene, 2);
    const frames = 60;
    const start = performance.now();
    for (let i = 0; i < frames; i++) {
      scene.step(1 / 60, idle);
      surface.clear();
      scene.draw(surface);
    }
    // Generous for slow CI machines; a frame costs well under this in a browser.
    expect((performance.now() - start) / frames).toBeLessThan(12);
  });
});

describe('snow', () => {
  /** Rows of snow-coloured blocks in the bottom quarter, where the drift lies. */
  const drift = (surface: GlyphSurface) => {
    let n = 0;
    for (let row = Math.floor(grid.rows * 0.75); row < grid.rows; row++) {
      for (let col = 0; col < grid.cols * 0.15; col++) {
        const i = row * grid.cols + col;
        if (surface.blockLevel[i] && surface.blockTone[i] === 0) n++;
      }
    }
    return n;
  };

  it('piles up over time', () => {
    const early = drift(run(createSnow({ mask: slabs }), 1));
    const later = drift(run(createSnow({ mask: slabs }), 40));
    expect(later).toBeGreaterThan(early);
  });

  it('keeps its piles bounded after a long fall', { timeout: 60000 }, () => {
    const surface = run(createSnow({ mask: slabs, density: 2 }), 300);
    let snow = 0;
    for (let i = 0; i < surface.blockLevel.length; i++) {
      if (surface.blockLevel[i] && surface.blockTone[i] === 0) snow++;
    }
    // The drift never climbs past a fifth of the height, and the caps stay small.
    expect(snow / (grid.cols * grid.rows)).toBeLessThan(0.22);
    for (let row = 0; row < grid.rows * 0.45; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const i = row * grid.cols + col;
        expect(Boolean(surface.blockLevel[i] && surface.blockTone[i] === 0)).toBe(false);
      }
    }
  });

  it('shakes the caps off the letters on a click', () => {
    const scene = createSnow({ mask: slabs });
    run(scene, 20);
    const count = () => {
      const surface = new GlyphSurface();
      surface.resize(grid.cols, grid.rows);
      scene.draw(surface);
      let n = 0;
      // Just above the slabs' tops.
      const top = Math.floor(grid.rows * 0.6);
      for (let row = top - 3; row < top; row++) {
        for (let col = Math.floor(grid.cols * 0.25); col < grid.cols * 0.35; col++) {
          const i = row * grid.cols + col;
          if (surface.blockLevel[i] && surface.blockTone[i] === 0) n++;
        }
      }
      return n;
    };
    const before = count();
    scene.press?.(grid.cols / 2, grid.rows / 2);
    scene.step(1 / 60, idle);
    expect(before).toBeGreaterThan(0);
    expect(count()).toBeLessThan(before);
  });
});

describe('shore', () => {
  it('lets the pointer write in the sand', () => {
    const scene = createShore();
    scene.resize(grid);
    for (let i = 0; i < 60; i++) {
      scene.step(1 / 60, { x: 20 + i, y: grid.rows - 4, active: true });
    }
    const surface = new GlyphSurface();
    surface.resize(grid.cols, grid.rows);
    scene.draw(surface);
    let grooves = 0;
    for (let col = 20; col < 80; col++) {
      // A stroke along the path: the pointer moved sideways.
      if (surface.glyph[(grid.rows - 4) * grid.cols + col] === '-'.charCodeAt(0)) grooves++;
    }
    expect(grooves).toBeGreaterThan(30);
  });
});
