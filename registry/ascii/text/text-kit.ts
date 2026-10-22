'use client';

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from 'react';

/** Hides text from sight but keeps it for screen readers, copy and find-in-page. */
export const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** Characters text scrambles through: code-like, so the decode reads as computing. */
export const CODE_GLYPHS = '01<>/\\{}[]#$%&*+=?~';

/** A stable pseudo-random number in [0, 1) for a pair of integers and a salt. */
export function rand(a: number, b: number, salt = 0): number {
  let h =
    Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(salt | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const REDUCED = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const query = window.matchMedia(REDUCED);
  query.addEventListener?.('change', onChange);
  return () => query.removeEventListener?.('change', onChange);
}

const readReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED).matches;

/** True when the reader prefers reduced motion. False on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, readReduced, () => false);
}

/**
 * Becomes true the first time the element scrolls into view, and stays true. Without an
 * IntersectionObserver (old browsers, tests) it is true at once.
 */
export function useSeen(ref: RefObject<Element | null>, enabled = true): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!enabled || seen) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled, seen]);
  return seen;
}

/** requestAnimationFrame, or a 60 Hz timer where there is none. Returns a cancel function. */
export function frame(callback: (now: number) => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(() => callback(performance.now()), 16);
  return () => clearTimeout(id);
}
