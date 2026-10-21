import { createContext, useContext, useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Whether a card has been seen yet. A card mounted below the fold holds its entrance at the
 * first frame and plays it when it scrolls into view, so the arrival is seen rather than spent
 * off screen. Charts outside a card, and environments without IntersectionObserver, are always
 * seen.
 */
const EntranceSeenContext = createContext(true);

export const EntranceSeenProvider = EntranceSeenContext.Provider;

export function useEntranceSeen(): boolean {
  return useContext(EntranceSeenContext);
}

/** Share of a card that must be on screen before its entrance plays. */
const THRESHOLD = 0.2;

/**
 * Latches true the first time `ref` is on screen. The check runs before paint, so a card that
 * starts on screen never waits, and one that starts off screen never shows its end state first.
 */
export function useFirstSight(ref: RefObject<Element | null>, enabled = true): boolean {
  const [seen, setSeen] = useState(true);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!enabled || !node || typeof IntersectionObserver === 'undefined') return;
    const box = node.getBoundingClientRect();
    const height = window.innerHeight || document.documentElement.clientHeight;
    const width = window.innerWidth || document.documentElement.clientWidth;
    const onScreen =
      box.bottom > box.height * THRESHOLD &&
      box.top < height - box.height * THRESHOLD &&
      box.right > 0 &&
      box.left < width;
    if (onScreen) {
      setSeen(true);
      return;
    }
    setSeen(false);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold: THRESHOLD },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // Only the first sight matters: later scrolling never replays an entrance.
  }, []);
  return seen;
}
