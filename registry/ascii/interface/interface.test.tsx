// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer } from '../engine/types';
import {
  AsciiCurtain,
  AsciiCursorTrail,
  AsciiFrame,
  AsciiFrameDemo,
  AsciiLoader,
  AsciiTransition,
  AsciiTransitionDemo,
  createCursorTrail,
} from './index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

/** Pretends the reader asks for reduced motion, or not. */
function preferReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  // jsdom has no canvas; the components draw nothing and keep their content.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  preferReducedMotion(false);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const render = (element: ReactElement) => act(() => root.render(element));

describe('AsciiLoader', () => {
  it('is a progress bar with a value when given one', () => {
    render(<AsciiLoader value={0.58} label="Uploading" />);
    const bar = container.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('58');
    expect(bar.getAttribute('aria-label')).toBe('Uploading');
    expect(bar.textContent).toContain('[');
    expect(bar.textContent).toContain(']');
  });

  it('fills the bar to the value, in characters', () => {
    preferReducedMotion(true);
    render(<AsciiLoader value={0.5} width={20} />);
    const text = container.textContent ?? '';
    expect(text).toContain('#'.repeat(10) + '-'.repeat(10));
    expect(text).toContain(' 50%');
  });

  it.each(['spinner', 'dots', 'bar', 'scramble'] as const)(
    'reads its label as a status when %s',
    (variant) => {
      render(<AsciiLoader variant={variant} label="Fetching rows" />);
      const status = container.querySelector('[role="status"]')!;
      expect(status).not.toBeNull();
      expect(status.textContent).toContain('Fetching rows');
      expect(container.querySelector('[role="progressbar"]')).toBeNull();
    },
  );

  it('holds still with reduced motion', () => {
    preferReducedMotion(true);
    render(<AsciiLoader variant="dots" label="Loading" />);
    const shown = container.querySelector('[aria-hidden="true"]')!;
    expect(shown.textContent).toBe('Loading...');
  });
});

describe('AsciiFrame', () => {
  it('keeps its content real and its border decorative', () => {
    render(
      <AsciiFrame variant="line">
        <button type="button">Get started</button>
      </AsciiFrame>,
    );
    expect(container.querySelector('button')?.textContent).toBe('Get started');
    expect(container.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('survives hover and focus without a canvas', () => {
    render(<AsciiFrameDemo trace="always" />);
    const frame = container.querySelector('.lilt-ascii-frame')!;
    act(() => {
      frame.dispatchEvent(new Event('pointerover', { bubbles: true }));
      container.querySelector('button')!.focus();
    });
    expect(container.textContent).toContain('Get started');
  });
});

describe('AsciiTransition', () => {
  it('shows the new content once the id changes', () => {
    preferReducedMotion(true);
    render(
      <AsciiTransition id="a">
        <p>First</p>
      </AsciiTransition>,
    );
    expect(container.textContent).toBe('First');
    render(
      <AsciiTransition id="b">
        <p>Second</p>
      </AsciiTransition>,
    );
    expect(container.textContent).toBe('Second');
  });

  it('keeps children fresh while the id stays the same', () => {
    render(<AsciiTransition id="a">One</AsciiTransition>);
    render(<AsciiTransition id="a">Two</AsciiTransition>);
    expect(container.textContent).toBe('Two');
  });

  it('demo moves to the next slide on click', () => {
    render(<AsciiTransitionDemo direction="radial" />);
    const button = container.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toMatch(/^Slide 1 of 3/);
    act(() => button.click());
    expect(button.getAttribute('aria-label')).toMatch(/^Slide 2 of 3/);
  });
});

describe('AsciiCurtain', () => {
  it('reports covered at once where it cannot draw, and never takes the pointer', () => {
    const onCovered = vi.fn();
    render(<AsciiCurtain covered={false} onCovered={onCovered} />);
    const canvas = container.querySelector('canvas')!;
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.style.pointerEvents).toBe('none');
    expect(onCovered).not.toHaveBeenCalled();
    render(<AsciiCurtain covered onCovered={onCovered} />);
    expect(onCovered).toHaveBeenCalledTimes(1);
  });

  it('calls onCovered straight away with reduced motion', () => {
    preferReducedMotion(true);
    const onCovered = vi.fn();
    render(<AsciiCurtain covered={false} onCovered={onCovered} />);
    render(<AsciiCurtain covered onCovered={onCovered} />);
    expect(onCovered).toHaveBeenCalled();
  });
});

describe('AsciiCursorTrail', () => {
  it('draws nothing over the page with reduced motion', () => {
    preferReducedMotion(true);
    render(<AsciiCursorTrail />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('lays a click-through canvas over the page', () => {
    render(<AsciiCursorTrail />);
    const canvas = container.querySelector('canvas')!;
    expect(canvas.style.position).toBe('fixed');
    expect(canvas.style.pointerEvents).toBe('none');
  });
});

describe('cursor trail scene', () => {
  const grid = { cols: 150, rows: 50, aspect: 2.1 };
  const idle: AsciiPointer = { x: 0, y: 0, active: false };
  const inked = (surface: GlyphSurface) => surface.glyph.reduce((n, g) => n + (g ? 1 : 0), 0);

  /** Sweeps the pointer across the grid for a while. */
  function sweep(scene: ReturnType<typeof createCursorTrail>, seconds: number) {
    for (let t = 0; t < seconds; t += 1 / 60) {
      scene.step(1 / 60, { x: 20 + t * 40, y: 20 + Math.sin(t * 3) * 8, active: true });
    }
  }

  it('sheds nothing while the pointer is still or away', () => {
    const scene = createCursorTrail();
    scene.resize(grid);
    for (let i = 0; i < 120; i++) scene.step(1 / 60, idle);
    for (let i = 0; i < 120; i++) scene.step(1 / 60, { x: 40, y: 20, active: true });
    expect(scene.alive).toBe(0);
  });

  it('leaves a trail that neither floods nor empties, in its own colours', () => {
    const scene = createCursorTrail();
    scene.resize(grid);
    sweep(scene, 1.5);
    const surface = new GlyphSurface();
    surface.resize(grid.cols, grid.rows);
    scene.draw(surface);
    const share = inked(surface) / (grid.cols * grid.rows);
    expect(share).toBeGreaterThan(0.002);
    expect(share).toBeLessThan(0.1);
    for (let i = 0; i < surface.glyph.length; i++) {
      if (!surface.glyph[i]) continue;
      expect(surface.tone[i]).toBeGreaterThanOrEqual(1);
      expect(surface.tone[i]).toBeLessThan(scene.palette.length);
      expect(surface.level[i]).toBeLessThanOrEqual(LEVELS);
    }
  });

  it('fades out completely after its life', () => {
    const scene = createCursorTrail({ life: 0.5 });
    scene.resize(grid);
    sweep(scene, 0.5);
    expect(scene.alive).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) scene.step(1 / 60, idle);
    expect(scene.alive).toBe(0);
  });

  it('opens a ring on click and draws a loop on autopilot', () => {
    const scene = createCursorTrail({ autopilot: true });
    scene.resize(grid);
    scene.press?.(75, 25);
    expect(scene.alive).toBe(16);
    for (let i = 0; i < 240; i++) scene.step(1 / 60, idle);
    expect(scene.alive).toBeGreaterThan(0);
  });

  it('stays inside a frame budget', () => {
    const scene = createCursorTrail({ life: 3 });
    scene.resize(grid);
    sweep(scene, 3);
    const surface = new GlyphSurface();
    surface.resize(grid.cols, grid.rows);
    const start = performance.now();
    for (let i = 0; i < 60; i++) {
      scene.step(1 / 60, { x: 40 + i, y: 20, active: true });
      surface.clear();
      scene.draw(surface);
    }
    expect((performance.now() - start) / 60).toBeLessThan(4);
  });
});
