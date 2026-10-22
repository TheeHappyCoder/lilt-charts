// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer, AsciiScene } from '../engine/types';
import { clockGroups, createClock, parseEnd } from './clock';
import { AsciiCounter, formatCount } from './counter';
import { createGlobe, describeGlobe } from './globe';
import { MASK_HEIGHT, MASK_WIDTH, landAt, landMask } from './land-mask';
import { AsciiSparkline, sparkLevels } from './sparkline';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const inked = (s: GlyphSurface) =>
  s.glyph.reduce((n, g, i) => n + (g || s.blockLevel[i] ? 1 : 0), 0);

describe('land mask', () => {
  it('decodes to the whole grid with about 29% of the surface as land', () => {
    const mask = landMask();
    expect(mask.length).toBe(MASK_WIDTH * MASK_HEIGHT);
    let land = 0;
    let all = 0;
    for (let r = 0; r < MASK_HEIGHT; r++) {
      const w = Math.cos(((90 - r - 0.5) * Math.PI) / 180);
      for (let c = 0; c < MASK_WIDTH; c++) {
        land += mask[r * MASK_WIDTH + c]! * w;
        all += w;
      }
    }
    expect(land / all).toBeGreaterThan(0.26);
    expect(land / all).toBeLessThan(0.32);
  });

  it('puts land and sea where they are', () => {
    expect(landAt(0, -60)).toBeGreaterThan(0.5); // the Amazon
    expect(landAt(0, -150)).toBeLessThan(0.5); // the Pacific
    expect(landAt(48, 2)).toBeGreaterThan(0.5); // France
    expect(landAt(-25, 134)).toBeGreaterThan(0.5); // Australia
    expect(landAt(30, -40)).toBeLessThan(0.5); // the Atlantic
    expect(landAt(-85, 0)).toBeGreaterThan(0.5); // Antarctica
  });
});

const scenes: [string, () => AsciiScene][] = [
  ['globe', () => createGlobe()],
  ['clock', () => createClock()],
  ['countdown', () => createClock({ mode: 'countdown', to: '2099-01-01' })],
];

describe.each(scenes)('%s', (_name, create) => {
  it('draws a picture that neither floods nor empties the grid', () => {
    const share = inked(run(create(), 2)) / (grid.cols * grid.rows);
    expect(share).toBeGreaterThan(0.03);
    expect(share).toBeLessThan(0.6);
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
    const pointer = { x: grid.cols / 2, y: grid.rows / 2, active: true };
    run(scene, 1, pointer);
    scene.press?.(grid.cols / 2, grid.rows / 2);
    for (let i = 0; i < 60; i++) scene.step(1 / 60, pointer);
    scene.resize({ cols: 30, rows: 8, aspect: 2 });
    const surface = new GlyphSurface();
    surface.resize(30, 8);
    scene.draw(surface);
    expect(surface.glyph.every((g) => Number.isInteger(g))).toBe(true);
  });

  it('draws a frame within budget', () => {
    const scene = create();
    const surface = run(scene, 1);
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      scene.step(1 / 60, idle);
      surface.clear();
      scene.draw(surface);
    }
    // Generous for a slow CI machine; in a browser a frame takes a few milliseconds.
    expect((performance.now() - start) / 20).toBeLessThan(25);
  });
});

describe('globe', () => {
  it('is deterministic for the same moment', () => {
    const a = run(createGlobe(), 1.5);
    const b = run(createGlobe(), 1.5);
    expect(Array.from(a.glyph)).toEqual(Array.from(b.glyph));
  });

  it('reads out a point under the pointer', () => {
    // Facing the prime meridian with no tilt or spin, a point at 0, 20 sits at the centre.
    const scene = createGlobe({
      points: [{ lat: 0, lon: 20, label: 'Here', value: 42 }],
      spin: 0,
      tilt: 0,
    });
    const centre = { x: grid.cols / 2, y: (grid.rows + 1) / 2, active: true };
    const surface = run(scene, 0.5, centre);
    // A second frame: the first finds the point, the readout follows.
    scene.draw(surface);
    const top = Array.from(surface.glyph.slice(0, grid.cols * 3))
      .map((g) => (g > 31 ? String.fromCharCode(g) : ' '))
      .join('');
    expect(top).toContain('Here');
    expect(top).toContain('42');
  });

  it('describes itself', () => {
    expect(describeGlobe()).toMatch(/London/);
    expect(describeGlobe([{ lat: 0, lon: 0, label: 'A' }], [])).toBe(
      'A turning globe with 1 places marked: A.',
    );
  });
});

describe('clock', () => {
  it('counts down in days, hours, minutes and seconds', () => {
    const now = new Date(2026, 0, 1, 0, 0, 0);
    const end = new Date(2026, 0, 3, 4, 5, 6);
    const { groups, done } = clockGroups('countdown', now, end, true);
    expect(groups.map((g) => g.digits).join(':')).toBe('02:04:05:06');
    expect(done).toBe(false);
  });

  it('holds at zero once the countdown ends', () => {
    const now = new Date(2026, 0, 2);
    const { groups, done } = clockGroups('countdown', now, new Date(2026, 0, 1), false);
    expect(groups.map((g) => g.digits).join('')).toBe('000000');
    expect(done).toBe(true);
  });

  it('reads a date as local midnight and falls back to the new year', () => {
    const now = new Date(2026, 9, 21);
    expect(parseEnd('2027-03-04', now).getTime()).toBe(new Date(2027, 2, 4).getTime());
    expect(parseEnd('nonsense', now).getTime()).toBe(new Date(2027, 0, 1).getTime());
    expect(parseEnd(undefined, now).getTime()).toBe(new Date(2027, 0, 1).getTime());
  });
});

describe('sparkline levels', () => {
  it('runs from the bottom row to the top', () => {
    const levels = sparkLevels([0, 5, 10], 3, 5);
    expect(levels).toEqual([0, 2, 4]);
    expect(sparkLevels([7, 7], 4, 5)).toEqual([2, 2, 2, 2]);
    expect(sparkLevels([], 4, 5)).toEqual([]);
  });
});

describe('DOM components', () => {
  let host: HTMLDivElement;
  beforeAll(() => {
    // jsdom has no canvas, ResizeObserver or matchMedia; stand in quiet ones.
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as never;
  });
  afterEach(() => host?.remove());

  const render = (node: React.ReactNode) => {
    host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(node));
    return root;
  };

  it('formats counts in full and compact', () => {
    expect(formatCount(1204881)).toBe('1,204,881');
    expect(formatCount(1204881, 'compact')).toBe('1.2M');
  });

  it('counter shows its value for screen readers and lands on it with reduced motion', () => {
    const root = render(<AsciiCounter value={48213} prefix="$" />);
    const hidden = host.querySelector('[aria-hidden="true"]');
    expect(host.textContent).toContain('$48,213');
    expect(hidden?.textContent).toBe('$48,213');
    act(() => root.render(<AsciiCounter value={50000} prefix="$" />));
    expect(hidden?.textContent).toBe('$50,000');
    act(() => root.unmount());
  });

  it('sparkline labels itself with a summary', () => {
    const root = render(<AsciiSparkline data={[1, 4, 2, 9]} />);
    const img = host.querySelector('[role="img"]');
    expect(img?.getAttribute('aria-label')).toBe(
      'Sparkline of 4 values: lowest 1, highest 9, latest 9.',
    );
    expect((img as HTMLElement).style.width).toBe('16ch');
    act(() => root.unmount());
  });
});
