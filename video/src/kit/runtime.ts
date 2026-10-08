import { useSyncExternalStore } from 'react';

/**
 * The film's clock. `performance.now()` is virtual while rendering (Playwright's clock), so the
 * film time is a pure function of the frame index. In a normal browser it runs in real time,
 * which makes `pnpm dev` a live preview.
 */
let origin = 0;
let offset = 0;
let running = false;
let current = 0;
const listeners = new Set<() => void>();
const frameHooks = new Set<(t: number) => void>();

export const film = {
  ready: false,
  /** The camera's current zoom; the cursor grows with it like a screen recording. */
  zoom: 1,
  duration: 0,
  get t() {
    return current;
  },
  start(from = 0) {
    offset = from;
    origin = performance.now();
    running = true;
    tick();
  },
  pointer(): Pointer | null {
    return pointerAt(current);
  },
};

declare global {
  interface Window {
    __film: typeof film;
  }
}
window.__film = film;

function tick() {
  if (!running) return;
  current = performance.now() - origin + offset;
  for (const hook of frameHooks) hook(current);
  for (const listener of listeners) listener();
  requestAnimationFrame(tick);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** True once the film reaches `ms`. Re-renders only when it flips. */
export function useAfter(ms: number) {
  return useSyncExternalStore(subscribe, () => current >= ms);
}

/** A value computed from film time, re-rendering only when it changes. */
export function useFilmValue<T>(at: (t: number) => T) {
  return useSyncExternalStore(subscribe, () => at(current));
}

/** The index of the last cue reached. */
export function useCueIndex(cues: readonly number[]) {
  return useSyncExternalStore(subscribe, () => {
    let index = -1;
    for (let i = 0; i < cues.length; i += 1) if (current >= cues[i]!) index = i;
    return index;
  });
}

export function onFrame(hook: (t: number) => void) {
  frameHooks.add(hook);
  return () => void frameHooks.delete(hook);
}

// Easing ----------------------------------------------------------------------------------------

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const progress = (t: number, start: number, end: number) =>
  clamp01((t - start) / (end - start));

/** cubic-bezier evaluated by Newton iterations, like CSS. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
  const b = (a1: number, a2: number) => 3 * a2 - 6 * a1;
  const c = (a1: number) => 3 * a1;
  const calc = (t: number, a1: number, a2: number) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
  const slope = (t: number, a1: number, a2: number) =>
    3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const s = slope(t, x1, x2);
      if (s === 0) break;
      t -= (calc(t, x1, x2) - x) / s;
    }
    return calc(t, y1, y2);
  };
}

/** Camera and cursor travel: quick to leave, long settle, like a screen recording zoom. */
export const travel = bezier(0.65, 0, 0.2, 1);
export const easeOut = bezier(0.23, 1, 0.32, 1);
export const easeInOut = bezier(0.77, 0, 0.175, 1);

// Cursor ----------------------------------------------------------------------------------------

export interface Pointer {
  x: number;
  y: number;
  down: boolean;
}

/**
 * A point on screen, measured live so it follows the camera. `hit` aims at the point nearest
 * (`fx`, `fy`) that actually hits the element, for marks clipped to a silhouette (ribbons, beads,
 * prisms) whose box centre may fall outside them.
 */
export type Aim =
  | {
      el: string;
      nth?: number;
      fx?: number;
      fy?: number;
      dx?: number;
      dy?: number;
      hit?: boolean;
    }
  | { x: number; y: number };

export interface CursorKey {
  /** Arrive here at `t` (ms). The cursor travels from the previous key, starting `move` ms before. */
  t: number;
  at: Aim;
  move?: number;
}

let cursorKeys: CursorKey[] = [];
let clicks: { t: number; hold?: number }[] = [];

export function setCursor(keys: CursorKey[], clickList: { t: number; hold?: number }[] = []) {
  cursorKeys = [...keys].sort((a, b) => a.t - b.t);
  clicks = clickList;
}

export function resolveAim(aim: Aim): { x: number; y: number } | null {
  if ('x' in aim) return { x: aim.x, y: aim.y };
  const element = document.querySelectorAll(aim.el)[aim.nth ?? 0];
  if (!element) return null;
  const box = element.getBoundingClientRect();
  const at = (aim.hit && hitFraction(element, box, aim.fx ?? 0.5, aim.fy ?? 0.5)) || {
    fx: aim.fx ?? 0.5,
    fy: aim.fy ?? 0.5,
  };
  return {
    x: box.left + box.width * at.fx + (aim.dx ?? 0),
    y: box.top + box.height * at.fy + (aim.dy ?? 0),
  };
}

const hits = new WeakMap<Element, { fx: number; fy: number }>();
const grid = Array.from({ length: 21 * 21 }, (_, i) => ({
  fx: (i % 21) / 20,
  fy: Math.floor(i / 21) / 20,
}));

/** Where in its box an element really takes the pointer, found once and kept with the element. */
function hitFraction(element: Element, box: DOMRect, fx: number, fy: number) {
  const known = hits.get(element);
  if (known) return known;
  const order = [...grid].sort(
    (a, b) => Math.hypot(a.fx - fx, a.fy - fy) - Math.hypot(b.fx - fx, b.fy - fy),
  );
  // Stay a little inside the silhouette rather than on its edge.
  for (const point of order) {
    const inside = [0, 0.02, -0.02].every((d) => {
      const hit = document.elementFromPoint(
        box.left + box.width * (point.fx + d),
        box.top + box.height * (point.fy + d),
      );
      return hit !== null && (hit === element || element.contains(hit));
    });
    if (inside) {
      hits.set(element, point);
      return point;
    }
  }
  return null;
}

function pointerAt(t: number): Pointer | null {
  if (cursorKeys.length === 0) return null;
  const down = clicks.some((click) => t >= click.t && t < click.t + (click.hold ?? 90));
  let index = cursorKeys.findIndex((key) => key.t > t);
  if (index === -1) index = cursorKeys.length;
  const previous = cursorKeys[index - 1];
  const next = cursorKeys[index];
  if (!previous) {
    const first = resolveAim(cursorKeys[0]!.at);
    return first ? { ...first, down } : null;
  }
  const from = resolveAim(previous.at);
  if (!next || !from) return from ? { ...round(from), down } : null;
  const to = resolveAim(next.at);
  if (!to) return { ...round(from), down };
  const move = next.move ?? Math.min(700, next.t - previous.t);
  const k = travel(progress(t, next.t - move, next.t));
  // A slight arc, like a hand moving a mouse.
  const arc = Math.sin(k * Math.PI) * Math.min(28, Math.hypot(to.x - from.x, to.y - from.y) * 0.08);
  return {
    ...round({ x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) - arc }),
    down,
  };
}

const round = (p: { x: number; y: number }) => ({
  x: Math.round(p.x * 100) / 100,
  y: Math.round(p.y * 100) / 100,
});
