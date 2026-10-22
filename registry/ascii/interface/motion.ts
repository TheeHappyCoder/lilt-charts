import { useEffect, useState } from 'react';

/** True when the reader asks for less motion. False on the server and before the first effect. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Seconds since the clock started, re-rendering at most `fps` times a second while `running`.
 * Stopped, it costs nothing and holds its last value.
 */
export function useClock(running: boolean, fps = 30) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = -1;
    const start = performance.now();
    const tick = (now: number) => {
      // A frame's timestamp can fall a little before the clock started; time never runs back.
      const t = Math.max(0, (now - start) / 1000);
      const frame = Math.floor(t * fps);
      if (frame !== last) {
        last = frame;
        setTime(t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, fps]);
  return time;
}

/** A monospace stack for components that set their own type. */
export const MONO_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/**
 * The font a canvas overlay draws its glyphs in: the element's own family when it is monospace,
 * otherwise a monospace stack at the element's size, so glyphs always sit on a grid.
 */
export function monoFont(ctx: CanvasRenderingContext2D, element: Element, weight = 500) {
  const css = getComputedStyle(element);
  const size = parseFloat(css.fontSize) || 14;
  const own = `${weight} ${size}px ${css.fontFamily || 'monospace'}`;
  ctx.font = own;
  const mono = Math.abs(ctx.measureText('i').width - ctx.measureText('M').width) < 0.01;
  const font = mono ? own : `${weight} ${size}px ${MONO_STACK}`;
  ctx.font = font;
  return { font, size, cw: Math.max(4, ctx.measureText('M').width) };
}

/** Sizes a canvas's backing store to its box at the device's pixel ratio, capped at 2. */
export function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(width * dpr));
  const h = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  return dpr;
}

/** Mixes two `#rrggbb` colours; anything else returns the nearer one unchanged. */
export function mixHex(a: string, b: string, t: number) {
  const pa = /^#([0-9a-f]{6})$/i.exec(a);
  const pb = /^#([0-9a-f]{6})$/i.exec(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const na = parseInt(pa[1]!, 16);
  const nb = parseInt(pb[1]!, 16);
  const ch = (shift: number) =>
    Math.round(((na >> shift) & 255) * (1 - t) + ((nb >> shift) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
