import { useRef, type ReactNode } from 'react';
import { useFrameStyle } from './overlay';

/**
 * A small push on each beat: the frame jumps in by `amount` and settles back, so cuts land with
 * a physical hit. `beats` are the cue times.
 */
export function Kick({
  beats,
  amount = 0.016,
  children,
}: {
  beats: readonly number[];
  amount?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFrameStyle(ref, (t, element) => {
    let last = -Infinity;
    for (const beat of beats) if (beat <= t) last = beat;
    const k = Math.exp(-(t - last) / 150);
    element.style.transform = k > 0.002 ? `scale(${1 + amount * k})` : '';
  });
  return (
    <div className="film-kick" ref={ref}>
      {children}
    </div>
  );
}
