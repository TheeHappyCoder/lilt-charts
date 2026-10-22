import { describe, expect, it } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer, AsciiScene } from '../engine/types';
import { createEmber } from './ember';
import { createGlow } from './glow';
import { createMurmuration } from './murmuration';
import { createPlanet } from './planet';
import { createRain } from './rain';
import { createAurora } from './aurora';
import { createGalaxy } from './galaxy';
import { createJellyfish } from './jellyfish';
import { createKoi } from './koi';
import { createMeadow } from './meadow';
import { createSea } from './sea';

const grid = { cols: 120, rows: 40, aspect: 2.1 };
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
  return surface.glyph.reduce((n, g) => n + (g ? 1 : 0), 0);
}

const scenes: [string, () => AsciiScene][] = [
  ['planet', () => createPlanet()],
  ['ember', () => createEmber()],
  ['murmuration', () => createMurmuration()],
  ['rain', () => createRain()],
  ['glow', () => createGlow()],
  ['koi', () => createKoi()],
  ['jellyfish', () => createJellyfish()],
  ['aurora', () => createAurora()],
  ['meadow', () => createMeadow()],
  ['sea', () => createSea()],
  ['galaxy', () => createGalaxy()],
];

describe.each(scenes)('%s', (_name, create) => {
  it('draws a picture that neither floods nor empties the grid', () => {
    const surface = run(create(), 3);
    const share = inked(surface) / (grid.cols * grid.rows);
    expect(share).toBeGreaterThan(0.01);
    // The glow is a full-bleed background; everything else leaves air around it.
    expect(share).toBeLessThan(_name === 'glow' ? 0.95 : 0.6);
  });

  it('only writes colours its palette has', () => {
    const scene = create();
    const surface = run(scene, 2);
    for (let i = 0; i < surface.glyph.length; i++) {
      if (!surface.glyph[i]) continue;
      expect(surface.tone[i]).toBeLessThan(scene.palette.length);
      expect(surface.level[i]).toBeGreaterThanOrEqual(1);
      expect(surface.level[i]).toBeLessThanOrEqual(LEVELS);
    }
  });

  it('survives a pointer, a press and a resize', () => {
    const scene = create();
    const pointer = { x: grid.cols / 2, y: grid.rows / 3, active: true };
    run(scene, 1, pointer);
    scene.press?.(grid.cols / 2, grid.rows / 2);
    for (let i = 0; i < 60; i++) scene.step(1 / 60, pointer);
    scene.resize({ cols: 40, rows: 12, aspect: 2 });
    const surface = new GlyphSurface();
    surface.resize(40, 12);
    for (let i = 0; i < 30; i++) scene.step(1 / 60, idle);
    scene.draw(surface);
    expect(surface.glyph.every((g) => Number.isInteger(g))).toBe(true);
  });
});

describe('planet', () => {
  it('stays round: ink is centred on the grid', () => {
    const surface = run(createPlanet({ ring: false }), 1);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < surface.glyph.length; i++) {
      // Ignore the faint stars; weigh the planet.
      if (!surface.glyph[i] || surface.level[i]! < 4) continue;
      sum += i % grid.cols;
      n++;
    }
    expect(Math.abs(sum / n - grid.cols / 2)).toBeLessThan(grid.cols * 0.12);
  });
});

describe('ember', () => {
  it('burns from the floor up and leaves the sky dark', () => {
    const surface = run(createEmber(), 3);
    const rowInk = (row: number) =>
      surface.glyph.slice(row * grid.cols, (row + 1) * grid.cols).filter(Boolean).length;
    expect(rowInk(grid.rows - 4)).toBeGreaterThan(rowInk(2));
  });
});

describe('surface', () => {
  it('paints each colour on a row as one string, spaced by the gaps', () => {
    const surface = new GlyphSurface();
    surface.resize(10, 2);
    surface.put(1, 0, 'a', 0, 1);
    surface.put(4, 0, 'b', 0, 1);
    surface.put(2, 0, 'z', 1, 1);
    surface.put(0, 1, 'c', 0, 1);
    const calls: [string, number][] = [];
    const ctx = {
      fillStyle: '',
      textAlign: 'center',
      fillText: (text: string, x: number) => calls.push([text, x]),
      fillRect: () => undefined,
    } as unknown as CanvasRenderingContext2D;
    surface.paint(
      ctx,
      Array.from({ length: 2 * LEVELS }, () => 'x'),
      8,
      16,
    );
    expect(calls).toEqual([
      ['a  b', 8],
      ['c', 0],
      ['z', 16],
    ]);
  });

  it('paints each colour and opacity with one fill style', () => {
    const surface = new GlyphSurface();
    surface.resize(10, 2);
    surface.put(0, 0, 'a', 0, 1);
    surface.put(1, 0, 'b', 1, 1);
    surface.put(2, 0, 'c', 0, 1);
    surface.put(3, 1, 'd', 0, 0.5);
    surface.put(99, 99, 'x', 0, 1);
    const styles: string[] = [];
    const text: string[] = [];
    const ctx = {
      set fillStyle(value: string) {
        styles.push(value);
      },
      fillText: (glyph: string) => text.push(glyph),
      fillRect: () => undefined,
    } as unknown as CanvasRenderingContext2D;
    const palette = Array.from({ length: 2 * LEVELS }, (_, i) => `s${i}`);
    surface.paint(ctx, palette, 8, 16, false);
    expect(styles).toEqual([`s${LEVELS / 2 - 1}`, `s${LEVELS - 1}`, `s${2 * LEVELS - 1}`]);
    expect(text.sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('sea', () => {
  it('moves the moon to follow the pointer', () => {
    const moonColumn = (x: number) => {
      const surface = run(createSea(), 4, { x, y: 5, active: true });
      let sum = 0;
      let n = 0;
      // The moon is drawn in its own colour in the sky.
      for (let i = 0; i < surface.glyph.length / 3; i++) {
        if (surface.glyph[i] && surface.tone[i] === 1 && surface.level[i]! > 4) {
          sum += i % grid.cols;
          n++;
        }
      }
      return sum / n;
    };
    expect(moonColumn(20)).toBeLessThan(moonColumn(100) - 40);
  });
});
