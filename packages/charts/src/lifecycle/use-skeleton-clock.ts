import { useLayoutEffect, useRef } from 'react';
import type { ChartLoadingStyle } from '../types';

export const SKELETON_CYCLE = 2800;

export function skeletonClock(now: number): string {
  return `${-(now % SKELETON_CYCLE)}ms`;
}

/** Read the shared wall clock after hydration, including when the selected style changes. */
export function useSkeletonClock<Element extends HTMLElement | SVGElement>(
  active: boolean,
  style: ChartLoadingStyle,
) {
  const ref = useRef<Element>(null);
  useLayoutEffect(() => {
    ref.current?.style.setProperty('--lilt-skeleton-clock', skeletonClock(Date.now()));
  }, [active, style]);
  return ref;
}
