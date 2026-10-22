import { describe, expect, it } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer, AsciiScene } from '../engine/types';
import { createBlackHole } from './black-hole';
import { createBonsai } from './bonsai';
import { createFireflies } from './fireflies';
import { createFlag } from './flag';
import { createHelix } from './helix';
import { createLighthouse } from './lighthouse';
import { createNightCity } from './night-city';
import { createOrrery } from './orrery';
import { createRidges } from './ridges';
import { createSmoke } from './smoke';
import { createWindowRain } from './window-rain';
import { createWormhole } from './wormhole';

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

function inked(surface: GlyphSurface) {
  let n = 0;
  for (let i = 0; i < surface.glyph.length; i++) {
    if ((surface.glyph[i] && surface.glyph[i] !== 32) || surface.blockLevel[i]) n++;
  }
  return n;
}

/** A loud, steady sound: every bin near the top of its range. */
const loud = () => new Uint8Array(512).fill(220);

const scenes: [string, () => AsciiScene][] = [
  ['black hole', () => createBlackHole()],
  ['wormhole', () => createWormhole()],
  ['ridges', () => createRidges()],
  ['ridges with sound', () => createRidges({ listen: loud })],
  ['night city', () => createNightCity()],
  ['lighthouse', () => createLighthouse()],
  ['lighthouse on the left', () => createLighthouse({ side: 'left' })],
  ['bonsai', () => createBonsai()],
  ['smoke', () => createSmoke()],
  ['helix', () => createHelix()],
  ['window rain', () => createWindowRain()],
  ['orrery', () => createOrrery()],
  ['fireflies', () => createFireflies()],
  ['flag', () => createFlag()],
];

describe.each(scenes)('%s', (_name, create) => {
  it('draws a picture that neither floods nor empties the grid', () => {
    const surface = run(create(), 4);
    const share = inked(surface) / (grid.cols * grid.rows);
    expect(share).toBeGreaterThan(0.01);
    expect(share).toBeLessThan(0.85);
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
    // The best of three batches, so a busy machine's spikes do not count against the scene.
    let best = Infinity;
    for (let batch = 0; batch < 3; batch++) {
      const start = performance.now();
      for (let i = 0; i < 20; i++) {
        scene.step(1 / 60, idle);
        surface.clear();
        scene.draw(surface);
      }
      best = Math.min(best, (performance.now() - start) / 20);
    }
    expect(best).toBeLessThan(12);
  });
});

describe('fireflies', () => {
  /** The most fireflies lit at once over a few seconds: a field in step lights up together. */
  const peak = (scene: AsciiScene) => {
    const surface = new GlyphSurface();
    surface.resize(grid.cols, grid.rows);
    let most = 0;
    for (let t = 0; t < 4; t += 1 / 60) {
      scene.step(1 / 60, idle);
      surface.clear();
      scene.draw(surface);
      let lit = 0;
      for (let i = 0; i < surface.glyph.length; i++)
        if (surface.glyph[i] === 64 && surface.tone[i] === 1) lit++;
      most = Math.max(most, lit);
    }
    return most;
  };

  it('falls into step over time, and only when they can see each other flash', () => {
    const settled = (sync: number) => {
      const scene = createFireflies({ sync });
      run(scene, 60);
      return peak(scene);
    };
    expect(settled(1)).toBeGreaterThan(settled(0) * 2);
  });
});

describe('ridges', () => {
  it('stands taller when there is sound', () => {
    const tops = (surface: GlyphSurface) => {
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++)
          if (surface.glyph[row * grid.cols + col]) return row;
      }
      return grid.rows;
    };
    expect(tops(run(createRidges({ listen: loud }), 3))).toBeLessThan(tops(run(createRidges(), 3)));
  });
});
