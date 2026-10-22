// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer } from '../engine/types';
import { AsciiGlitch } from './ascii-glitch';
import { AsciiScramble } from './ascii-scramble';
import { AsciiTerminal, DEFAULT_TERMINAL_LINES } from './ascii-terminal';
import { createLogo } from './logo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no 2D canvas: say so quietly, as a browser without one would.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

let host: HTMLDivElement;
let root: Root;

function prefersReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

function render(element: React.ReactElement) {
  act(() => root.render(element));
}

/** What a sighted reader sees: the text of the parts hidden from assistive technology. */
const visible = () =>
  Array.from(host.querySelectorAll('[aria-hidden="true"]'))
    .map((el) => el.textContent)
    .join('');

/** Fakes timers, frames and the clock together, so time can be stepped through. */
function fakeClock() {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'Date',
    ],
  });
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe('AsciiScramble', () => {
  it('gives screen readers the text once, and decodes into it', () => {
    fakeClock();
    prefersReducedMotion(false);
    render(createElement(AsciiScramble, { text: 'Hello there', trigger: 'mount', duration: 0.5 }));
    const all = host.textContent ?? '';
    // The readable copy plus the animated one, which is hidden from screen readers.
    expect(all.startsWith('Hello there')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(visible()).toBe('Hello there');
  });

  it('shows the final text at once with reduced motion, keeping spaces', () => {
    prefersReducedMotion(true);
    render(createElement(AsciiScramble, { text: 'a  b c', as: 'h1' }));
    const h1 = host.querySelector('h1')!;
    expect(h1).toBeTruthy();
    expect(visible()).toBe('a  b c');
  });

  it('keeps every letter in its own slot while scrambling, so nothing moves', () => {
    fakeClock();
    prefersReducedMotion(false);
    render(createElement(AsciiScramble, { text: 'abc def', trigger: 'mount', duration: 2 }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    // Each unfinished letter still holds its own character, hidden, to keep its width.
    const held = Array.from(host.querySelectorAll('span[style*="visibility: hidden"]')).map(
      (el) => el.textContent,
    );
    expect(held.length).toBeGreaterThan(0);
    for (const ch of held) expect('abcdef').toContain(ch);
  });
});

describe('AsciiTerminal', () => {
  it('holds the whole session as text for screen readers', () => {
    prefersReducedMotion(false);
    render(createElement(AsciiTerminal));
    const pre = host.querySelector('pre')!;
    expect(pre.textContent).toBe(DEFAULT_TERMINAL_LINES.join('\n'));
    expect(host.querySelector('[role="group"]')?.getAttribute('aria-label')).toContain('Terminal');
  });

  it('types commands out over time', () => {
    fakeClock();
    prefersReducedMotion(false);
    render(createElement(AsciiTerminal, { lines: ['$ echo hi', 'hi'], speed: 20 }));
    const shown = () =>
      Array.from(host.querySelectorAll('[aria-hidden="true"] div'))
        .filter((el) => (el as HTMLElement).style.visibility !== 'hidden')
        .map((el) => el.textContent)
        .join('|');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(shown()).not.toContain('echo hi');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(shown()).toContain('echo hi');
    expect(shown()).toContain('hi');
  });

  it('shows every line at once with reduced motion', () => {
    prefersReducedMotion(true);
    render(createElement(AsciiTerminal, { lines: ['$ ls', 'a.txt', 'b.txt'] }));
    const hidden = Array.from(host.querySelectorAll('[aria-hidden="true"] div')).filter(
      (el) => (el as HTMLElement).style.visibility === 'hidden',
    );
    expect(hidden).toHaveLength(0);
  });
});

describe('AsciiGlitch', () => {
  it('keeps its text readable and glitches on hover, then snaps back', () => {
    fakeClock();
    prefersReducedMotion(false);
    render(createElement(AsciiGlitch, { text: '404', interval: 0 }));
    const el = host.firstElementChild as HTMLElement;
    expect(el.textContent).toBe('404');
    act(() => {
      // React builds pointerenter from pointerover; jsdom has no PointerEvent, so send its type.
      el.dispatchEvent(
        new MouseEvent('pointerover', { bubbles: true, relatedTarget: document.body }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(host.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(host.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
    expect(el.textContent).toBe('404');
  });

  it('never glitches with reduced motion', () => {
    fakeClock();
    prefersReducedMotion(true);
    render(createElement(AsciiGlitch, { interval: 0.1 }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(host.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
  });
});

describe('createLogo', () => {
  const grid = { cols: 120, rows: 40, aspect: 1.7 };
  const idle: AsciiPointer = { x: 0, y: 0, active: false };

  function run(seconds: number, pointer = idle, text?: string) {
    const scene = createLogo({ text });
    scene.resize(grid);
    for (let t = 0; t < seconds; t += 1 / 60) scene.step(1 / 60, pointer);
    const surface = new GlyphSurface();
    surface.resize(grid.cols, grid.rows);
    scene.draw(surface);
    return { scene, surface };
  }

  const inked = (s: GlyphSurface) =>
    s.glyph.reduce((n, g, i) => n + (g || s.blockLevel[i] ? 1 : 0), 0);

  it('sets the word in solid blocks that neither flood nor empty the grid', () => {
    const { surface } = run(2.5);
    const share = inked(surface) / (grid.cols * grid.rows);
    expect(share).toBeGreaterThan(0.08);
    expect(share).toBeLessThan(0.6);
    expect(surface.blockLevel.filter(Boolean).length).toBeGreaterThan(100);
  });

  it('leaves room around the word', () => {
    const { surface } = run(2.5, idle, 'WWWWWWWW');
    for (let row = 0; row < grid.rows; row++) {
      for (const col of [0, 1, 2, grid.cols - 3, grid.cols - 2, grid.cols - 1]) {
        expect(surface.blockLevel[row * grid.cols + col]).toBe(0);
      }
    }
  });

  it('only uses colours its palette has', () => {
    const { scene, surface } = run(2);
    for (let i = 0; i < surface.glyph.length; i++) {
      if (surface.glyph[i]) {
        expect(surface.tone[i]).toBeLessThan(scene.palette.length);
        expect(surface.level[i]).toBeGreaterThanOrEqual(1);
        expect(surface.level[i]).toBeLessThanOrEqual(LEVELS);
      }
      if (surface.blockLevel[i]) expect(surface.blockTone[i]).toBeLessThan(scene.palette.length);
    }
  });

  it('settles to the same picture each time', () => {
    const a = run(2).surface;
    const b = run(2).surface;
    expect(Array.from(a.blockTone)).toEqual(Array.from(b.blockTone));
    expect(Array.from(a.glyph)).toEqual(Array.from(b.glyph));
  });

  it('knocks cells loose under the pointer and brings them home', () => {
    const { scene, surface: before } = run(2);
    const pointer = { x: grid.cols / 2, y: grid.rows / 2, active: true };
    scene.press?.(grid.cols / 2, grid.rows / 2);
    for (let i = 0; i < 20; i++) scene.step(1 / 60, pointer);
    const during = new GlyphSurface();
    during.resize(grid.cols, grid.rows);
    scene.draw(during);
    expect(Array.from(during.blockLevel)).not.toEqual(Array.from(before.blockLevel));
    for (let i = 0; i < 60 * 5; i++) scene.step(1 / 60, idle);
    const after = new GlyphSurface();
    after.resize(grid.cols, grid.rows);
    scene.draw(after);
    const moved = after.blockLevel.reduce(
      (n, level, i) => n + (level > 0 !== before.blockLevel[i]! > 0 ? 1 : 0),
      0,
    );
    expect(moved).toBeLessThan(4);
  });

  it('survives a resize to a tiny grid', () => {
    const { scene } = run(1);
    scene.resize({ cols: 8, rows: 3, aspect: 2 });
    const surface = new GlyphSurface();
    surface.resize(8, 3);
    scene.step(1 / 60, { x: 4, y: 1, active: true });
    scene.press?.(4, 1);
    scene.draw(surface);
    expect(surface.glyph.every((g) => Number.isInteger(g))).toBe(true);
  });

  it('draws a frame in a few milliseconds at a large size', () => {
    const scene = createLogo();
    const big = { cols: 160, rows: 52, aspect: 1.7 };
    scene.resize(big);
    const surface = new GlyphSurface();
    surface.resize(big.cols, big.rows);
    const pointer = { x: 80, y: 26, active: true };
    for (let i = 0; i < 120; i++) scene.step(1 / 60, idle);
    scene.press?.(80, 26);
    const start = performance.now();
    for (let i = 0; i < 30; i++) {
      scene.step(1 / 60, { ...pointer, x: 60 + i });
      surface.clear();
      scene.draw(surface);
    }
    expect((performance.now() - start) / 30).toBeLessThan(16);
  });
});

describe('createLogo with snow', () => {
  const grid = { cols: 120, rows: 50, aspect: 1.7 };
  const idle: AsciiPointer = { x: 0, y: 0, active: false };

  function run(options: Parameters<typeof createLogo>[0], seconds: number, pointer = idle) {
    const scene = createLogo(options);
    scene.resize(grid);
    for (let t = 0; t < seconds; t += 1 / 60) scene.step(1 / 60, pointer);
    const surface = new GlyphSurface();
    surface.resize(grid.cols, grid.rows);
    scene.draw(surface);
    return { scene, surface, snow: scene.palette.length - 1 };
  }

  it('lets flakes fall and settles caps on the letters', () => {
    const { surface, snow } = run({ snow: 1 }, 4);
    const flakes = surface.glyph.reduce(
      (n, g, i) => n + (g && surface.tone[i] === snow && !surface.blockLevel[i] ? 1 : 0),
      0,
    );
    const caps = surface.blockTone.reduce(
      (n, tone, i) => n + (surface.blockLevel[i] && tone === snow ? 1 : 0),
      0,
    );
    expect(flakes).toBeGreaterThan(10);
    expect(caps).toBeGreaterThan(5);
  });

  it('draws no snow without the option', () => {
    const { surface, snow } = run({}, 4);
    expect(surface.blockTone.some((tone, i) => surface.blockLevel[i] && tone === snow)).toBe(false);
  });

  it('keeps the share below the word clear for content', () => {
    const { surface, snow } = run({ clearBelow: 0.5 }, 3);
    const lower = Math.ceil(grid.rows * 0.5);
    for (let row = lower; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const i = row * grid.cols + col;
        if (surface.blockLevel[i]) expect(surface.blockTone[i]).toBe(snow);
      }
    }
  });

  it('melts the caps under a still pointer, and a click throws them off', () => {
    const { surface: before, snow } = run({ snow: 1 }, 3);
    const capsIn = (s: GlyphSurface) =>
      s.blockTone.reduce((n, tone, i) => n + (s.blockLevel[i] && tone === snow ? 1 : 0), 0);
    const { scene } = run({ snow: 1 }, 3);
    scene.press?.(grid.cols / 2, grid.rows / 2);
    for (let i = 0; i < 20; i++) scene.step(1 / 60, idle);
    const after = new GlyphSurface();
    after.resize(grid.cols, grid.rows);
    scene.draw(after);
    expect(capsIn(after)).toBeLessThan(capsIn(before));
  });
});
