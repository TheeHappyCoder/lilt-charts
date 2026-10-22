/**
 * Lilt's motion, shared by every component: one ease for things arriving, one spring for things
 * gliding between places, and one for things that should feel pressed.
 */

/** Fast out, long settle: popups, values and checks arriving. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** A highlight or indicator gliding between items: quick, no overshoot. */
export const GLIDE = { type: 'spring', duration: 0.28, bounce: 0 } as const;

/** A value swapping in place: it rises in through a light blur, the old one rises out. */
export const SWAP = {
  initial: { opacity: 0, y: 4, filter: 'blur(3px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -4, filter: 'blur(3px)' },
  transition: { duration: 0.2, ease: EASE_OUT },
} as const;

/** The same swap with reduced motion: a plain fade. */
export const SWAP_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12 },
} as const;
