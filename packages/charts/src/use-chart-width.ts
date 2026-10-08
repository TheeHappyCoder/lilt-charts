import { useLayoutEffect, useRef, useState } from 'react';

/**
 * An element's laid-out size, ignoring CSS transforms, so a chart drawn into a scaled-down frame
 * (a thumbnail, a zoomed preview) still lays out at its own size instead of a squashed one. The
 * bounding box is exact but includes transforms; offset sizes ignore them but round, so they are
 * used only when a transform has changed the box.
 */
export function layoutSize(element: HTMLElement): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  const transformed = (offset: number, box: number) => offset > 0 && Math.abs(offset - box) > 1;
  return {
    width: transformed(element.offsetWidth, rect.width) ? element.offsetWidth : rect.width,
    height: transformed(element.offsetHeight, rect.height) ? element.offsetHeight : rect.height,
  };
}

/** Measured width keeps SVG text at a readable CSS-pixel size in compact cards. */
export function useChartWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(layoutSize(element).width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
