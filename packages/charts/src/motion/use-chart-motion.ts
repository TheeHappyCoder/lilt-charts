import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import type { ChartMotion } from '../types';
import { useEntranceSeen } from './entrance-gate';

const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

export function useReducedMotion(motion: ChartMotion): boolean {
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return motion === 'none' || systemReduced;
}

export interface TimelineSpec {
  key: string | number;
  duration: number;
  active: boolean;
  /**
   * Run on Lilt's spring instead of the reveal ease, keeping its slight overshoot: progress may
   * pass 1 briefly before it settles there. For marks that should land like physical objects.
   */
  spring?: boolean;
  /** `false` holds the timeline at its first frame, e.g. while its card is still off screen. */
  seen?: boolean;
}

export function useChartTimeline(spec: TimelineSpec, reducedMotion: boolean): number {
  // A card below the fold holds its timeline at the first frame until it is seen.
  const seen = useEntranceSeen() && spec.seen !== false;
  const waiting = spec.active && !reducedMotion && !seen;
  const [progress, setProgress] = useState(spec.active ? (reducedMotion ? 1 : 0) : 1);
  const previousKey = useRef(spec.key);
  const isNewActiveTimeline = spec.active && spec.key !== previousKey.current;

  useLayoutEffect(() => {
    previousKey.current = spec.key;
    if (!spec.active || reducedMotion) {
      setProgress(1);
      return;
    }

    setProgress(0);
    if (waiting) return;
    const controls = animate(0, 1, {
      ...(spec.spring
        ? { type: 'spring' as const, duration: spec.duration / 1000, bounce: 0.18 }
        : { duration: spec.duration / 1000, ease: REVEAL_EASE }),
      onUpdate: (latest) => setProgress(latest),
      onComplete: () => setProgress(1),
    });
    return () => controls.stop();
  }, [reducedMotion, spec.active, spec.duration, spec.key, spec.spring, waiting]);

  if (reducedMotion) return 1;
  if (isNewActiveTimeline || waiting) return 0;
  return Math.max(0, spec.spring ? progress : Math.min(1, progress));
}

export { REVEAL_EASE };
