import { useTransform, type MotionValue } from 'motion/react';

/** Speed, in pixels per second, that earns one pixel of blur. */
const SPEED_PER_PIXEL = 400;
/** Below this the blur is invisible, so the filter comes off rather than costing a repaint. */
const THRESHOLD = 0.2;

/**
 * A CSS `filter` that blurs with a glide's speed, the way a fast-moving object smears, and clears
 * as it lands. Reduced motion never blurs.
 */
export function useMotionBlur(
  speed: MotionValue<number>,
  reducedMotion: boolean,
  max = 2.5,
): MotionValue<string> {
  return useTransform(speed, (value) => {
    if (reducedMotion) return 'none';
    const blur = Math.min(max, Math.abs(value) / SPEED_PER_PIXEL);
    return blur < THRESHOLD ? 'none' : `blur(${blur.toFixed(2)}px)`;
  });
}
