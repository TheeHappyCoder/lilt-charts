/** Entrance channels share elapsed time; updates keep their own existing clock. */
export const ENTRANCE_DURATION = 720;
export const COMPACT_ENTRANCE_DURATION = 520;

export function entranceProgress(elapsed: number, delay = 0, duration = ENTRANCE_DURATION): number {
  const progress = Math.max(0, Math.min(1, (elapsed - delay) / Math.max(1, duration)));
  return 1 - Math.pow(1 - progress, 3);
}

export function entranceStagger(index: number, count: number, maximum = 100): number {
  return count <= 1 ? 0 : (Math.max(0, Math.min(count - 1, index)) / (count - 1)) * maximum;
}

export function entranceSweep(left: number, width: number, progress: number) {
  const feather = Math.max(20, Math.min(80, width * 0.12));
  const head = left + (Math.max(0, width) + feather) * progress;
  return { start: head - feather, end: head };
}
