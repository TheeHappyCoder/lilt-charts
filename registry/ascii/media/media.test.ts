import { describe, expect, it } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer, AsciiScene } from '../engine/types';
import { createImage } from './ascii-image';
import { isLight, parseColour } from './colour';
import { functionFeed } from './feed';
import { createMediaScene } from './media-scene';
import { shapeSolid } from './meshes';
import { createModel } from './model';
import { chromaOnDark, chromaOnLight, forPaper, kMeans, Quantiser, wheelPalette } from './palette';
import { picturePixel } from './picture';
import { pictureColours } from './picture-colours';
import { boxAverage, cellPixels, levels, place, shape } from './sample';

const grid = { cols: 120, rows: 40, aspect: 1.8 };
const idle: AsciiPointer = { x: 0, y: 0, active: false };

function run(scene: AsciiScene, seconds: number, pointer = idle, g = grid) {
  scene.resize(g);
  const surface = new GlyphSurface();
  surface.resize(g.cols, g.rows);
  // A first frame, as the stage paints one at once: video starts its reveal on it.
  scene.draw(surface);
  for (let t = 0; t < seconds; t += 1 / 60) scene.step(1 / 60, pointer);
  surface.clear();
  scene.draw(surface);
  return surface;
}

const inked = (s: GlyphSurface) =>
  s.glyph.reduce((n, g, i) => n + (g || s.blockLevel[i] ? 1 : 0), 0);

/** A test card: a white disc with a red half, on transparent. */
const disc = functionFeed(200, 100, (x, y, out) => {
  const inside = Math.hypot(x - 100, y - 50) < 40;
  out[0] = 1;
  out[1] = x < 100 ? 0.1 : 1;
  out[2] = x < 100 ? 0.1 : 1;
  out[3] = inside ? 1 : 0;
});

describe('sampling', () => {
  it('keeps a picture its shape on tall cells, and centres it', () => {
    const p = place(200, 100, { cols: 100, rows: 40, aspect: 2 }, 'contain');
    // 2:1 picture: twice as many square units across as down.
    expect(p.cols / (p.rows * 2)).toBeCloseTo(2, 0);
    expect(p.col * 2 + p.cols).toBeLessThanOrEqual(100);
    expect(p.sw).toBe(200);
  });

  it('crops to cover the frame', () => {
    const p = place(400, 100, { cols: 100, rows: 50, aspect: 2 }, 'cover');
    expect(p.cols).toBe(100);
    expect(p.rows).toBe(50);
    expect(p.sh).toBe(100);
    expect(p.sw).toBeLessThan(400);
    expect(p.sx).toBeCloseTo((400 - p.sw) / 2);
  });

  it('averages every pixel under a cell, weighted by opacity', () => {
    const rgba = new Uint8ClampedArray([
      // A 2×2 block: white, black, and two transparent reds that mustn't tint it.
      255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 0, 255, 0, 0, 0,
    ]);
    const out = cellPixels(1, 1);
    boxAverage(rgba, 2, 2, 2, out);
    expect(out.r[0]).toBeCloseTo(0.5);
    expect(out.g[0]).toBeCloseTo(0.5);
    expect(out.a[0]).toBeCloseTo(0.5);
  });

  it('spreads a dull picture across the ramp', () => {
    const values = Float32Array.from({ length: 100 }, (_, i) => 0.4 + (i / 99) * 0.2);
    const [lo, hi] = levels(values, new Float32Array(100).fill(1));
    expect(lo).toBeGreaterThan(0.35);
    expect(hi).toBeLessThan(0.65);
    expect(shape(0.6, lo, hi, 1, 1)).toBeGreaterThan(0.95);
    expect(shape(0.4, lo, hi, 1, 1)).toBeLessThan(0.05);
  });
});

describe('colour', () => {
  it('parses hex and rgb, and judges ink', () => {
    expect(parseColour('#f00', [0, 0, 0])).toEqual([1, 0, 0]);
    expect(parseColour('rgb(0, 255, 0)', [0, 0, 0])).toEqual([0, 1, 0]);
    expect(parseColour('nonsense', [0.5, 0.5, 0.5])).toEqual([0.5, 0.5, 0.5]);
    expect(isLight('#e8e8ee')).toBe(true);
    expect(isLight('#1d1c1a')).toBe(false);
  });

  it('takes brightness out of a colour, and gives it back as opacity', () => {
    const c: [number, number, number] = [0, 0, 0];
    const a = chromaOnDark(0.4, 0.2, 0.1, c);
    expect(a).toBeCloseTo(0.4);
    expect(c.map((v) => v * a)).toEqual([0.4, 0.2, 0.1].map((v) => expect.closeTo(v)));
    // On paper: paper (1) mixed toward the colour by the opacity gives the pixel back.
    const d = chromaOnLight(0.4, 0.2, 0.1, c);
    expect(c.map((v) => 1 + (v - 1) * d)).toEqual([0.4, 0.2, 0.1].map((v) => expect.closeTo(v)));
  });

  it('finds a picture’s own colours', () => {
    const points = new Float32Array([1, 0, 0, 1, 0.05, 0, 0, 0, 1, 0, 0.05, 1]);
    const centres = kMeans(points, new Float32Array(4).fill(1), 2);
    const reds = centres.filter((c) => c[0] > 0.9).length;
    expect(reds).toBe(1);
    const q = new Quantiser(centres);
    expect(centres[q.index(0.9, 0, 0.05)]![0]).toBeGreaterThan(0.9);
    expect(centres[q.index(0, 0.1, 0.9)]![2]).toBeGreaterThan(0.9);
  });

  it('builds palettes the stage can afford', () => {
    const wheel = wheelPalette();
    expect(wheel.length).toBeLessThan(64);
    expect(forPaper(wheel)[0]).toEqual([0, 0, 0]);
    const colours = pictureColours(disc)!;
    expect(colours.dark.length).toBeGreaterThan(1);
    expect(colours.dark.length + colours.light.length).toBeLessThan(250);
  });
});

describe('default picture', () => {
  it('is lit spheres on nothing', () => {
    const out = new Float32Array(4);
    picturePixel(2, 2, out);
    expect(out[3]).toBe(0);
    picturePixel(270, 215, out);
    expect(out[3]).toBe(1);
    // Brighter toward the light, up and left, than away from it.
    const lit = new Float32Array(4);
    const dim = new Float32Array(4);
    picturePixel(200, 140, lit);
    picturePixel(340, 300, dim);
    expect(lit[0]! + lit[1]! + lit[2]!).toBeGreaterThan(dim[0]! + dim[1]! + dim[2]! + 0.5);
  });
});

const scenes: [string, () => AsciiScene][] = [
  ['image glyphs', () => createImage()],
  ['image blocks', () => createImage({ mode: 'blocks' })],
  ['image mono', () => createImage({ color: 'mono', tint: '#8b6cff' })],
  ['image cover', () => createImage({ feed: disc, fit: 'cover' })],
  [
    'video',
    () =>
      createMediaScene({
        feed: disc,
        live: true,
        palette: { dark: wheelPalette(), light: forPaper(wheelPalette()) },
      }),
  ],
  ['model torus', () => createModel()],
  ['model cube', () => createModel({ shape: 'cube' })],
  ['model sphere', () => createModel({ shape: 'sphere', mode: 'glyphs' })],
  ['model knot', () => createModel({ shape: 'knot' })],
  ['model icosahedron', () => createModel({ shape: 'icosahedron' })],
  [
    'model mesh',
    () =>
      createModel({
        mesh: {
          vertices: [
            [0, 1, 0],
            [-1, -1, 1],
            [1, -1, 1],
            [0, -1, -1],
          ],
          faces: [
            [0, 1, 2],
            [0, 2, 3],
            [0, 3, 1],
            [1, 3, 2],
          ],
        },
      }),
  ],
];

describe.each(scenes)('%s', (_name, create) => {
  it('draws a picture that neither floods nor empties the grid', () => {
    const share = inked(run(create(), 3)) / (grid.cols * grid.rows);
    expect(share).toBeGreaterThan(0.03);
    expect(share).toBeLessThan(_name === 'image cover' ? 0.9 : 0.7);
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

  it('survives a pointer, a press and a resize', () => {
    const scene = create();
    const pointer = { x: grid.cols / 2, y: grid.rows / 3, active: true };
    run(scene, 1, pointer);
    scene.press?.(grid.cols / 2, grid.rows / 2);
    for (let i = 0; i < 60; i++) scene.step(1 / 60, { ...pointer, x: pointer.x + i });
    const small = run(scene, 0.5, idle, { cols: 40, rows: 12, aspect: 2 });
    expect(small.glyph.every((g) => Number.isInteger(g))).toBe(true);
  });

  it('draws a frame within budget', () => {
    const scene = create();
    const big = { cols: 150, rows: 50, aspect: 1.8 };
    const surface = run(scene, 2, idle, big);
    const start = performance.now();
    for (let k = 0; k < 10; k++) {
      scene.step(1 / 60, idle);
      surface.clear();
      scene.draw(surface);
    }
    // Generous for slow CI; a browser frame runs well under this.
    expect((performance.now() - start) / 10).toBeLessThan(25);
  });
});

describe('image', () => {
  it('scrambles in, then settles into the picture', () => {
    const scene = createImage();
    const early = run(scene, 0.05);
    const later = run(createImage(), 3);
    expect(inked(early)).toBeLessThan(inked(later) / 4);
  });

  it('draws dark parts dense on paper, as ink', () => {
    const backdrop = { light: false };
    const scene = createImage({ backdrop, color: 'mono' });
    const night = run(scene, 3);
    backdrop.light = true;
    const surface = new GlyphSurface();
    surface.resize(grid.cols, grid.rows);
    scene.draw(surface);
    // The same cells, but the picture redraws: something changed.
    expect(Array.from(surface.glyph).join()).not.toBe(Array.from(night.glyph).join());
  });
});

describe('model', () => {
  it('stays centred and inside its frame', () => {
    const surface = run(createModel({ shape: 'sphere' }), 1);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < surface.glyph.length; i++) {
      if (!surface.blockLevel[i]) continue;
      const col = i % grid.cols;
      const row = Math.floor(i / grid.cols);
      expect(row).toBeGreaterThan(0);
      expect(row).toBeLessThan(grid.rows - 1);
      sum += col;
      n++;
    }
    expect(Math.abs(sum / n - grid.cols / 2)).toBeLessThan(3);
  });

  it('builds closed shapes that fit a unit sphere', () => {
    for (const shape of ['torus', 'cube', 'sphere', 'knot', 'icosahedron'] as const) {
      const solid = shapeSolid(shape);
      let r = 0;
      for (let i = 0; i < solid.position.length; i += 3) {
        r = Math.max(
          r,
          Math.hypot(solid.position[i]!, solid.position[i + 1]!, solid.position[i + 2]!),
        );
      }
      expect(r).toBeCloseTo(1, 2);
      expect(solid.triangles.length % 3).toBe(0);
    }
  });

  it('spins faster after a press', () => {
    const a = createModel();
    const b = createModel();
    run(a, 0.5);
    run(b, 0.5);
    b.press?.(grid.cols - 2, 5);
    const sa = new GlyphSurface();
    const sb = new GlyphSurface();
    sa.resize(grid.cols, grid.rows);
    sb.resize(grid.cols, grid.rows);
    for (let i = 0; i < 20; i++) {
      a.step(1 / 60, idle);
      b.step(1 / 60, idle);
    }
    a.draw(sa);
    b.draw(sb);
    expect(Array.from(sa.blockTone).join()).not.toBe(Array.from(sb.blockTone).join());
  });
});
