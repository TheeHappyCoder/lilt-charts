import { ENTRANCE_DURATION } from '../motion/entrance';

export type LifecyclePhase =
  | 'pending'
  | 'loading'
  | 'revealing'
  | 'ready'
  | 'updating'
  | 'empty'
  | 'error';

export interface LifecycleGeneration {
  next: () => number;
  current: () => number;
  isCurrent: (generation: number) => boolean;
}

export function createLifecycleGeneration(): LifecycleGeneration {
  let value = 0;
  return {
    next: () => {
      value += 1;
      return value;
    },
    current: () => value,
    isCurrent: (generation) => generation === value,
  };
}

export function durationForPhase(
  phase: 'initial' | 'matched-update' | 'keyed-update' | 'topology-update',
  reducedMotion: boolean,
  animateIn = true,
): number {
  if (reducedMotion) return 0;
  if (!animateIn && phase === 'initial') return 0;
  if (phase === 'matched-update') return 420;
  // Points travel across the plot, so the morph gets a little longer than a value change.
  if (phase === 'keyed-update') return 620;
  if (phase === 'topology-update') return 240;
  return ENTRANCE_DURATION;
}

/** Preserve full data fidelity while avoiding repeated per-sample geometry tweens. */
export function skipDataTweenForWorkload(
  sampleCount: number,
  millisecondsSinceLastUpdate: number,
): boolean {
  return sampleCount > 6000 || millisecondsSinceLastUpdate < 240;
}
