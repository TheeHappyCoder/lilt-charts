/**
 * Measuring cards in the reader's own browser: how long a card takes to reach the screen, and how
 * long each frame takes while a pointer sweeps across it. Browser-only; call from effects or
 * event handlers.
 */

export interface BenchRow {
  t: Date;
  a: number;
  b: number;
  c: number;
}

/** A deterministic random walk, one row per minute, so every run draws the same shapes. */
export function benchRows(points: number, shift = 0): BenchRow[] {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const start = Date.UTC(2026, 8, 1);
  let a = 400;
  let b = 250;
  let c = 120;
  return Array.from({ length: points }, (_, index) => {
    a = Math.max(10, a + (random() - 0.5) * 24);
    b = Math.max(10, b + (random() - 0.5) * 16);
    c = Math.max(10, c + (random() - 0.5) * 10);
    return { t: new Date(start + index * 60_000), a: a + shift, b: b + shift, c: c + shift };
  });
}

export const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/** Resolves once the page is visible: a hidden page runs few frames and paints nothing. */
export function whenVisible(): Promise<void> {
  if (document.visibilityState === 'visible') return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', check);
      resolve();
    };
    document.addEventListener('visibilitychange', check);
  });
}

/** A frame this long is the browser holding frames back (a hidden or covered page), not work. */
const THROTTLED_FRAME_MS = 1_000;

export const percentile = (sorted: readonly number[], fraction: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(fraction * (sorted.length - 1)))] ?? 0;

export const round = (value: number) => Math.round(value * 10) / 10;

/** A plot with its marks drawn: a line or area path with real geometry, or a bar. */
function drawn(host: HTMLElement): boolean {
  return Boolean(
    host.querySelector(
      '.lilt-chart__svg :is(path[data-lilt-path], .lilt-chart__area path, .lilt-chart__bar-mark)',
    ),
  );
}

/** Quiet for this many frames and this long, so a card that renders in stages is not cut short. */
const QUIET_FRAMES = 3;
const QUIET_MS = 150;

/**
 * Resolves once the host's marks are drawn and its DOM has been quiet for a few frames and a
 * moment, with the time from `start` to the first frame after the last change: roughly when the
 * final chart reached the screen. Null when it has not settled within `timeout`.
 */
export async function settle(
  host: HTMLElement,
  start: number,
  timeout = 60_000,
): Promise<number | null> {
  let dirty = true;
  const observer = new MutationObserver(() => {
    dirty = true;
  });
  observer.observe(host, { subtree: true, childList: true, attributes: true, characterData: true });
  let settledAt = start;
  let quiet = 0;
  try {
    for (;;) {
      await nextFrame();
      // Not the frame's timestamp: that is when the frame began, which can be before a long
      // render that delayed this callback.
      const time = performance.now();
      if (time - start > timeout) return null;
      if (dirty) {
        dirty = false;
        quiet = 0;
        settledAt = time;
      } else if (drawn(host) && ++quiet >= QUIET_FRAMES && time - settledAt >= QUIET_MS) {
        return Math.max(0, settledAt - start);
      }
    }
  } finally {
    observer.disconnect();
  }
}

export interface HoverResult {
  /** Median and 95th-percentile frame time while the pointer moved, in milliseconds. */
  p50: number;
  p95: number;
  /** Total time in tasks over 50 ms, or null where the browser does not report them. */
  longTaskMs: number | null;
  /** The page was hidden or held back mid-sweep, so the frames do not measure the chart. */
  throttled: boolean;
}

/** One synthetic pointer move per frame for `frames` frames, sweeping across the host's plot. */
export async function sweepHover(host: HTMLElement, frames = 60): Promise<HoverResult | null> {
  const plot = host.querySelector<SVGSVGElement>('.lilt-chart__svg');
  if (!plot) return null;
  const bounds = plot.getBoundingClientRect();
  const deltas: number[] = [];
  const tasks: number[] = [];
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) tasks.push(entry.duration);
    });
    observer.observe({ type: 'longtask' });
  } catch {
    observer = null;
  }
  let last = 0;
  for (let step = 0; step <= frames; step += 1) {
    const time = await nextFrame();
    if (last) deltas.push(time - last);
    last = time;
    plot.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: bounds.left + 8 + ((step * 37) % Math.max(1, bounds.width - 16)),
        clientY: bounds.top + bounds.height / 2,
      }),
    );
  }
  observer?.disconnect();
  plot.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }));
  deltas.sort((a, b) => a - b);
  return {
    p50: round(percentile(deltas, 0.5)),
    p95: round(percentile(deltas, 0.95)),
    longTaskMs: observer ? round(tasks.reduce((sum, value) => sum + value, 0)) : null,
    throttled: document.visibilityState !== 'visible' || deltas.at(-1)! >= THROTTLED_FRAME_MS,
  };
}

/** How many points the host's line and area paths draw, summed over every path. */
export function drawnPoints(host: HTMLElement): number {
  let count = 0;
  for (const path of host.querySelectorAll('.lilt-chart__svg path[data-lilt-path]')) {
    // Each move, line or curve command ends at one drawn point.
    count += (path.getAttribute('d')?.match(/[MLC]/g) ?? []).length;
  }
  return count;
}
