import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react';

/** How long a skeleton takes to leave once data has landed (lilt-skeleton-exit in loading.css). */
export const SKELETON_EXIT_MS = 240;

/**
 * Where a leaving skeleton sinks to: the floor its marks grow from, the edge its bars grow from,
 * or the middle its rings and webs grow from. The data's own entrance starts from the same place.
 */
export type SkeletonExitOrigin = 'bottom' | 'left' | 'center';

/**
 * Follows a skeleton through its exit. When loading ends it reports `leaving` for
 * SKELETON_EXIT_MS, then lets the data in. Reduced motion skips the exit, and loading again
 * mid-exit brings the skeleton straight back.
 */
export function useSkeletonExit(loading: boolean, reduced: boolean): boolean {
  const [previous, setPrevious] = useState(loading);
  const [leaving, setLeaving] = useState(false);
  // Decided during render, so the frame where loading ends already shows the skeleton leaving.
  if (previous !== loading) {
    setPrevious(loading);
    setLeaving(!loading && !reduced);
  }
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(false), SKELETON_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);
  return leaving;
}

interface SkeletonExitProps {
  leaving: boolean;
  origin: SkeletonExitOrigin;
  /** What the card shows in place while loading, then its data. Its root must be a DOM element. */
  children: ReactElement;
}

/**
 * Holds a card's loading view through its exit. While leaving it keeps rendering exactly the
 * last loading view, the very same elements, so nothing redraws from the data that has just
 * landed; its root is marked to freeze every loop inside it on its current frame and sink toward
 * `origin` as it fades. Once gone, the data view mounts with its own entrance.
 */
export function SkeletonExit({ leaving, origin, children }: SkeletonExitProps): ReactElement {
  const last = useRef(children);
  if (!leaving) {
    last.current = children;
    return children;
  }
  return cloneElement(last.current as ReactElement<Record<string, unknown>>, {
    'data-skeleton-leaving': origin,
  });
}
