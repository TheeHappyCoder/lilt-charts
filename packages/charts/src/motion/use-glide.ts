import { useMotionValue, type MotionValue } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

export interface GlideSpring {
  stiffness: number;
  damping: number;
  mass?: number;
}

/** The most time one frame may advance a glide, so a slow frame cannot skip it ahead. */
const MAX_STEP = 1 / 60;
/** Integration step within a frame, small enough to stay stable at any stiffness used here. */
const SUBSTEP = 1 / 240;
const REST = 0.01;

/**
 * A motion value that springs to each target it is given and always lands exactly on it.
 * Every move is its own glide to a known destination, rather than a spring that follows another
 * value, so an interrupted gesture or a paused frame can never leave it resting short of its
 * target. A new target takes over from wherever the value is, keeping its speed.
 *
 * The spring advances by at most one frame's time per frame. When the page stalls, such as while
 * linked charts re-render together, the glide carries on from where it was instead of jumping
 * ahead to where the clock says it should be.
 */
export function useGlide(
  initial: number,
  spring: GlideSpring,
): readonly [MotionValue<number>, (to: number, instant?: boolean) => void, MotionValue<number>] {
  const value = useMotionValue(initial);
  // Pixels per second, so a reader can blur what is moving fast; zero at rest.
  const speedValue = useMotionValue(0);
  const target = useRef(initial);
  const velocity = useRef(0);
  const frame = useRef<number | null>(null);
  const last = useRef(0);
  const springRef = useRef(spring);
  springRef.current = spring;

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const step = useCallback(
    (now: number) => {
      const elapsed = Math.min(Math.max(0, (now - last.current) / 1000), MAX_STEP);
      last.current = now;
      const { stiffness, damping, mass = 1 } = springRef.current;
      const to = target.current;
      let position = value.get();
      let speed = velocity.current;
      for (let spent = 0; spent < elapsed; spent += SUBSTEP) {
        const dt = Math.min(SUBSTEP, elapsed - spent);
        speed += ((-stiffness * (position - to) - damping * speed) / mass) * dt;
        position += speed * dt;
      }
      if (Math.abs(position - to) < REST && Math.abs(speed) < REST) {
        velocity.current = 0;
        frame.current = null;
        speedValue.set(0);
        value.jump(to);
        return;
      }
      velocity.current = speed;
      speedValue.set(speed);
      value.set(position);
      frame.current = requestAnimationFrame(step);
    },
    [speedValue, value],
  );

  const glide = useCallback(
    (to: number, instant = false) => {
      // Already on its way there: let the running glide finish rather than restart it.
      if (!instant && to === target.current && frame.current !== null) return;
      target.current = to;
      if (instant || value.get() === to || typeof requestAnimationFrame !== 'function') {
        stop();
        velocity.current = 0;
        speedValue.set(0);
        value.jump(to);
        return;
      }
      if (frame.current === null) {
        last.current = performance.now();
        frame.current = requestAnimationFrame(step);
      }
    },
    [speedValue, step, stop, value],
  );

  useEffect(() => stop, [stop]);
  return [value, glide, speedValue] as const;
}
