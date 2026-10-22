// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlyphSurface, LEVELS } from '../engine/surface';
import type { AsciiPointer, AsciiScene } from '../engine/types';
import { AsciiRedact } from '../text/ascii-redact';
import { AsciiSplitFlap } from '../text/ascii-split-flap';
import { AsciiWave } from '../text/ascii-wave';
import { createParticleWord } from '../text/particle-word';
import { AsciiLog } from './ascii-log';
import { AsciiStatus, type StatusDay } from './ascii-status';
import { createCountdown, remaining } from './countdown';
import { createEmptyScene } from './empty-scenes';

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

describe.each([
  ['empty: no data', () => createEmptyScene({ variant: 'no-data' })],
  ['empty: not found', () => createEmptyScene({ variant: 'not-found' })],
  ['empty: offline', () => createEmptyScene({ variant: 'offline' })],
  ['empty: done', () => createEmptyScene({ variant: 'done' })],
  ['countdown', () => createCountdown({ to: Date.now() + 90_000_000 })],
  ['particle word', () => createParticleWord()],
] as const)('%s', (_name, create) => {
  it('draws something, in its own colours, and survives presses and a resize', () => {
    const scene = create();
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
});

describe('countdown', () => {
  it('reads the time left in days, hours, minutes and seconds', () => {
    expect(remaining(((2 * 24 + 7) * 3600 + 23 * 60 + 41) * 1000)).toMatchObject({
      days: '02',
      hours: '07',
      minutes: '23',
      seconds: '41',
    });
    expect(remaining(-5).total).toBe(0);
  });

  it('bursts at zero and shows the done text', () => {
    const scene = createCountdown({ to: Date.now() + 500, done: 'GO' });
    const before = inked(run(scene, 0.1));
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 2000 });
    const surface = new GlyphSurface();
    surface.resize(grid.cols, grid.rows);
    for (let t = 0; t < 1.5; t += 1 / 60) scene.step(1 / 60, idle);
    scene.draw(surface);
    vi.useRealTimers();
    // The four groups of digits give way to two letters.
    expect(inked(surface)).toBeGreaterThan(0);
    expect(inked(surface)).toBeLessThan(before);
  });
});

describe('particle word', () => {
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

  it('gives screen readers the text once, behind flaps, bars and waves', () => {
    render(
      <>
        <AsciiSplitFlap text="GATE 7" />
        <AsciiRedact text="Top secret" />
        <AsciiWave text="Hello" />
      </>,
    );
    const spoken = Array.from(host.querySelectorAll(':scope > * > span:not([aria-hidden])')).map(
      (el) => el.textContent,
    );
    expect(spoken).toEqual(['GATE 7', 'Top secret', 'Hello']);
  });

  it('shows the board’s text at once with reduced motion', () => {
    render(<AsciiSplitFlap text="ON TIME" />);
    const board = host.querySelector('[aria-hidden="true"]')!.textContent!;
    expect(board).toContain('O');
    expect(board).toContain('T');
  });

  it('works out uptime from the days, counting only outages against it', () => {
    const days: StatusDay[] = [
      { date: '2026-10-01', status: 'up' },
      { date: '2026-10-02', status: 'degraded' },
      { date: '2026-10-03', status: 'down' },
      { date: '2026-10-04', status: 'up' },
      { date: '2026-10-05', status: 'none' },
    ];
    render(<AsciiStatus days={days} />);
    expect(host.textContent).toContain('75.00% uptime');
    expect(host.querySelectorAll('button')).toHaveLength(5);
  });

  it('streams the lines it is given, tagged by level', () => {
    render(<AsciiLog lines={[{ id: 1, level: 'error', message: 'disk full' }]} />);
    render(
      <AsciiLog
        lines={[
          { id: 1, level: 'error', message: 'disk full' },
          { id: 2, level: 'ok', message: 'recovered' },
        ]}
      />,
    );
    const log = host.querySelector('[role="log"]')!;
    expect(log.textContent).toContain('ERR');
    expect(log.textContent).toContain('disk full');
    expect(log.textContent).toContain('recovered');
  });
});
