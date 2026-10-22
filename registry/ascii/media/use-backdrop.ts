'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { isLight } from './colour';
import type { Backdrop } from './media-scene';

/**
 * Whether a picture sits on a light backdrop, judged from its ink: dark ink means a light page.
 * The answer is an object the scene reads every frame, so a theme change redraws the picture as
 * ink on paper without rebuilding it. `ink` is the colour passed in `style`, when there is one;
 * otherwise the element's own text colour is read, and read again when the theme changes.
 */
export function useBackdrop(element: RefObject<HTMLElement | null>, ink?: string): Backdrop {
  const backdrop = useRef<Backdrop>({ light: ink ? !isLight(ink) : false }).current;
  if (ink) backdrop.light = !isLight(ink);

  useEffect(() => {
    if (ink) return;
    const read = () => {
      const el = element.current;
      if (el) backdrop.light = !isLight(getComputedStyle(el).color);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    // A parent's colour can change without the root noticing; a slow check catches it.
    const timer = window.setInterval(read, 1500);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [element, ink, backdrop]);

  return backdrop;
}
