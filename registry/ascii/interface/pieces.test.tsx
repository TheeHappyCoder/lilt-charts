// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer, AsciiScene } from '../engine/types';
import { AsciiSplitFlap } from '../text/ascii-split-flap';
import { createParticleWord } from '../text/particle-word';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

const grid = { cols: 120, rows: 36, aspect: 1.9 };
const idle: AsciiPointer = { x: 0, y: 0, active: false };

function run(scene: AsciiScene, seconds: number, pointer = idle) {
  scene.resize(grid);
  for (let t = 0; t < seconds; t += 1 / 60) scene.step(1 / 60, pointer);
  const surface = new GlyphSurface();
  surface.resize(grid.cols, grid.rows);
  scene.draw(surface);
  return surface;
}

const inked = (surface: GlyphSurface) => surface.glyph.filter((g) => g && g !== 32).length;

describe('particle word', () => {
  it('draws something, in its own colours, and survives presses and a resize', () => {
    const scene = createParticleWord();
    const surface = run(scene, 2, { x: 60, y: 18, active: true });
    expect(inked(surface)).toBeGreaterThan(10);
    for (let i = 0; i < surface.glyph.length; i++) {
      if (!surface.glyph[i]) continue;
      expect(surface.tone[i]).toBeLessThan(scene.palette.length);
      expect(surface.level[i]).toBeLessThanOrEqual(LEVELS);
    }
    scene.press?.(30, 10);
    scene.resize({ cols: 30, rows: 8, aspect: 2 });
    for (let i = 0; i < 30; i++) scene.step(1 / 60, idle);
    const small = new GlyphSurface();
    small.resize(30, 8);
    scene.draw(small);
  });

  it('scatters on a press and pulls itself back together', () => {
    const scene = createParticleWord({ text: 'HI' });
    const rest = run(scene, 0.5);
    scene.press?.(60, 18);
    for (let i = 0; i < 6; i++) scene.step(1 / 60, idle);
    const burst = new GlyphSurface();
    burst.resize(grid.cols, grid.rows);
    scene.draw(burst);
    const moved = burst.glyph.filter((g, i) => g !== rest.glyph[i]).length;
    expect(moved).toBeGreaterThan(20);
    for (let t = 0; t < 4; t += 1 / 60) scene.step(1 / 60, idle);
    const home = new GlyphSurface();
    home.resize(grid.cols, grid.rows);
    scene.draw(home);
    expect(home.glyph.filter((g, i) => g !== rest.glyph[i]).length).toBeLessThan(moved / 4);
  });
});

describe('DOM pieces', () => {
  let host: HTMLDivElement;
  let root: Root;
  const render = (element: ReactElement) => act(() => root.render(element));
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('gives screen readers the text once behind split-flap tiles', () => {
    render(<AsciiSplitFlap text="GATE 7" />);
    const spoken = Array.from(host.querySelectorAll(':scope > * > span:not([aria-hidden])')).map(
      (el) => el.textContent,
    );
    expect(spoken).toEqual(['GATE 7']);
  });

  it('shows the board’s text at once with reduced motion', () => {
    render(<AsciiSplitFlap text="ON TIME" />);
    const board = host.querySelector('[aria-hidden="true"]')!.textContent!;
    expect(board).toContain('O');
    expect(board).toContain('T');
  });
});
