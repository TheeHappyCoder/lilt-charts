import { useLayoutEffect, type RefObject } from 'react';
import { clamp01, easeOut, film, onFrame, progress } from './runtime';

/** Write an element's style from film time each frame. */
export function useFrameStyle<E extends HTMLElement>(
  ref: RefObject<E | null>,
  paint: (t: number, element: E) => void,
) {
  useLayoutEffect(() => {
    const run = (t: number) => {
      if (ref.current) paint(t, ref.current);
    };
    run(film.t);
    return onFrame(run);
    // `paint` is defined inline by callers; the closure only reads props that never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Rise in from below a mask line with a soft blur, hold, then leave upward faster than it came.
 * Returns 0 before, 1 while held, and the eased phase values for transform and blur.
 */
export function rise(t: number, from: number, to: number, enter = 480, exit = 260) {
  const inK = easeOut(progress(t, from, from + enter));
  const outK = Number.isFinite(to) ? easeOut(progress(t, to - exit, to)) : 0;
  const visible = t >= from && t < to;
  const blur = (1 - inK) * 6 + outK * 6;
  return {
    visible,
    y: (1 - inK) * 100 - outK * 60,
    // A near-zero blur still forces a soft filtered layer; snap it off.
    blur: blur < 0.05 ? 0 : blur,
    opacity: clamp01(inK * 1.4) * (1 - outK),
  };
}
