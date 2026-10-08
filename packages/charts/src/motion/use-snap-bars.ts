import { useLayoutEffect, useRef, useState } from 'react';
import type { BarGeometry } from '../engine/bars';

/** One bar as drawn on a frame of a snap: its geometry and how far it has risen. */
export interface SnapBar {
  key: string;
  bar: BarGeometry;
  /** Share of the bar's height above its floor: 0 drained, 1 full; a spring may overshoot. */
  rise: number;
  opacity: number;
  /** Gaussian blur in pixels while the bar arrives or leaves. */
  blur: number;
  leaving: boolean;
}

interface Track {
  key: string;
  from: BarGeometry;
  to: BarGeometry;
  kind: 'stay' | 'enter' | 'leave';
  /** Order among the bars of its kind, for the ripple. */
  order: number;
}

/** Closed-form damped spring from 0 to 1 that lands with a slight overshoot in about 0.55s. */
export function snapSpring(seconds: number): number {
  if (seconds <= 0) return 0;
  const omega = (2 * Math.PI) / 0.55;
  const zeta = 0.78;
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  return (
    1 -
    Math.exp(-zeta * omega * seconds) *
      (Math.cos(damped * seconds) + ((zeta * omega) / damped) * Math.sin(damped * seconds))
  );
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 4);
const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** A bar drains into its floor on the same in-out curve the gap closes on. */
const drain = easeInOut;

/** Arrivals ripple in 30ms apart (capped), departures a little quicker. */
const enterDelay = (order: number) => Math.min(order, 14) * 0.03;
const leaveDelay = (order: number) => Math.min(order, 8) * 0.025;
/** Leaving bars drain this long before the rest start closing the gap. */
const CLOSE_UP_DELAY = 0.14;
const CLOSE_UP = 0.42;
const ENTER_BLUR = 8;
const LEAVE_BLUR = 3;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixBar = (from: BarGeometry, to: BarGeometry, x: number, y: number): BarGeometry => ({
  ...to,
  x: mix(from.x, to.x, x),
  width: mix(from.width, to.width, x),
  y: mix(from.y, to.y, y),
  height: mix(from.height, to.height, y),
  baseline: mix(from.baseline, to.baseline, y),
});

/**
 * Bars that behave like real objects when the set of bars changes, such as a new period: new
 * bars rise out of the floor with a soft blur, leaving bars drain back into it and narrow toward
 * where their gap closes, and the rest spring to their new places, widths and heights. Returns
 * the frame to draw while that runs, and `null` when at rest, so ordinary updates and the first
 * entrance are untouched. `pulse` counts snaps, to restart the plot's light motion blur.
 */
export function useSnapBars(
  bars: readonly BarGeometry[] | undefined,
  keyOf: (bar: BarGeometry) => string,
  enabled: boolean,
  /** The chart is revealing its first data: every bar arrives the way new bars do. */
  entrance = false,
): { frame: SnapBar[] | null; pulse: number } {
  const [frame, setFrame] = useState<SnapBar[] | null>(null);
  const [pulse, setPulse] = useState(0);
  const shown = useRef<Map<string, BarGeometry> | null>(null);
  const frameRef = useRef<SnapBar[] | null>(null);
  const signature = bars?.map(keyOf).join('|') ?? '';
  const latest = useRef({ bars, keyOf });
  latest.current = { bars, keyOf };

  useLayoutEffect(() => {
    const { bars: next, keyOf: key } = latest.current;
    const target = new Map((next ?? []).map((bar) => [key(bar), bar]));
    // Where every bar is on screen right now, including a snap still running.
    const current = frameRef.current
      ? new Map(
          frameRef.current.filter((item) => !item.leaving).map((item) => [item.key, item.bar]),
        )
      : shown.current;
    shown.current = target;
    // First bars on an empty plot arrive only during the chart's entrance; otherwise they appear.
    const fresh = !current || current.size === 0;
    if (!enabled || !next?.length || (fresh && !entrance)) {
      frameRef.current = null;
      setFrame(null);
      return;
    }
    const before = current ?? new Map<string, BarGeometry>();
    const tracks: Track[] = [];
    let entering = 0;
    for (const [id, bar] of target) {
      const was = before.get(id);
      tracks.push(
        was
          ? { key: id, from: was, to: bar, kind: 'stay', order: 0 }
          : { key: id, from: bar, to: bar, kind: 'enter', order: entering++ },
      );
    }
    const survivors = tracks.filter((track) => track.kind === 'stay');
    const leaving = [...before].filter(([id]) => !target.has(id));
    if (!leaving.length && !entering) return;
    const last = [...target.values()].reduce<BarGeometry | null>(
      (right, bar) => (!right || bar.x > right.x ? bar : right),
      null,
    );
    leaving
      .sort(([, a], [, b]) => a.x - b.x)
      .forEach(([id, bar], order) => {
        // Narrow toward where the gap closes: the left edge of the next bar that stays.
        const after = survivors
          .filter((track) => track.from.x > bar.x)
          .sort((a, b) => a.from.x - b.from.x)[0];
        const edge = after
          ? after.to.x
          : survivors.length && last
            ? last.x + last.width
            : bar.x + bar.width / 2;
        tracks.push({
          key: id,
          from: bar,
          to: { ...bar, x: edge, width: 0 },
          kind: 'leave',
          order,
        });
      });
    const closing = leaving.length > 0;
    // The plot's motion blur marks a change; a first entrance needs only the bars' own.
    if (!fresh) setPulse((value) => value + 1);

    /** Every bar at `t` seconds into the snap, or `null` once all of them have landed. */
    const frameAt = (t: number): SnapBar[] | null => {
      let busy = false;
      const items: SnapBar[] = [];
      for (const track of tracks) {
        if (track.kind === 'stay') {
          const along = closing ? easeInOut((t - CLOSE_UP_DELAY) / CLOSE_UP) : snapSpring(t);
          const lift = snapSpring(t);
          if (t < (closing ? CLOSE_UP_DELAY + CLOSE_UP : 0.9)) busy = true;
          items.push({
            key: track.key,
            bar: mixBar(track.from, track.to, along, lift),
            rise: 1,
            opacity: 1,
            blur: 0,
            leaving: false,
          });
        } else if (track.kind === 'enter') {
          const local = t - enterDelay(track.order);
          if (local < 0.9) busy = true;
          items.push({
            key: track.key,
            bar: track.to,
            rise: snapSpring(local),
            opacity: easeOut(t / 0.32),
            blur: ENTER_BLUR * (1 - easeOut(t / 0.42)),
            leaving: false,
          });
        } else {
          const local = t - leaveDelay(track.order);
          if (local >= CLOSE_UP_DELAY + CLOSE_UP) continue;
          busy = true;
          const closeUp = easeInOut((local - CLOSE_UP_DELAY) / CLOSE_UP);
          items.push({
            key: track.key,
            bar: mixBar(track.from, track.to, closeUp, 0),
            rise: 1 - drain(local / 0.32),
            opacity: 1 - easeOut((local - 0.2) / 0.16),
            blur: LEAVE_BLUR * easeOut(local / 0.32),
            leaving: true,
          });
        }
      }
      return busy ? items : null;
    };

    // Paint the first frame in this same commit: the new layout must never reach the screen
    // before the snap that leads to it.
    const first = frameAt(0);
    frameRef.current = first;
    setFrame(first);
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const items = frameAt((now - started) / 1000);
      frameRef.current = items;
      setFrame(items);
      if (items) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `entrance` only matters on the render where bars first arrive, which `signature` marks.
  }, [signature, enabled]);

  // Between snaps, keep the record of where bars sit in step with ordinary updates (a value
  // change, a series toggle), so the next snap starts from what is actually on screen.
  useLayoutEffect(() => {
    if (frameRef.current) return;
    const { bars: next, keyOf: key } = latest.current;
    shown.current = new Map((next ?? []).map((bar) => [key(bar), bar]));
  });

  return { frame, pulse };
}
