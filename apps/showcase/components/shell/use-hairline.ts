'use client';

import { useLayoutEffect, useState, useSyncExternalStore, type RefObject } from 'react';

/** Device pixels a 1px CSS border paints: browsers snap borders to whole device pixels. */
const borderPixels = (ratio: number) => Math.max(1, Math.floor(ratio));

/**
 * The width a 1px CSS border actually draws at, in CSS pixels: at 125% a 1px border is one device
 * pixel, 0.8px. A notch outline uses it so it continues the sheet's border at the same weight.
 */
function hairline() {
  const ratio = window.devicePixelRatio || 1;
  return borderPixels(ratio) / ratio;
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  query.addEventListener('change', onChange);
  window.addEventListener('resize', onChange);
  return () => {
    query.removeEventListener('change', onChange);
    window.removeEventListener('resize', onChange);
  };
}

export function useHairline(): number {
  return useSyncExternalStore(subscribe, hairline, () => 1);
}

/**
 * Where the sheet's edge paints, in the notch's own depth axis (0 at the frame's edge). With a
 * visible border both follow its pixels; without one both sit on the sheet's outer side.
 */
export interface SheetEdge {
  /** The border's centre line: the outline leaves and rejoins the sheet here. */
  centre: number;
  /** The border's inner side: the notch covers the border from the frame up to here. */
  inner: number;
}

/**
 * The device pixels the sheet's border really landed on, measured against the notch's SVG. Box
 * edges snap to whole device pixels while SVG does not, so a notch drawn at the nominal position
 * steps off the border at most window sizes. `side` is the frame edge the notch pours from.
 */
export function useSheetEdge(
  svg: RefObject<SVGSVGElement | null>,
  side: 'right' | 'bottom',
  fallback: SheetEdge,
): SheetEdge {
  const [edge, setEdge] = useState(fallback);
  useLayoutEffect(() => {
    const element = svg.current;
    const shell = element?.closest('.lilt-shell');
    const sheet = shell?.querySelector('.lilt-shell__sheet');
    if (!element || !shell || !sheet) return;
    const measure = () => {
      const ratio = window.devicePixelRatio || 1;
      const box = sheet.getBoundingClientRect();
      const own = element.getBoundingClientRect();
      // The border's outer side is the sheet's snapped edge; it runs inward by whole pixels.
      const outer = Math.round((side === 'right' ? box.right : box.bottom) * ratio);
      const innerPixel = outer - borderPixels(ratio);
      const toDepth = (pixel: number) =>
        side === 'right' ? own.right - pixel / ratio : own.bottom - pixel / ratio;
      // With a transparent border (light themes) the visible edge is the sheet's outer side.
      const bordered = !/rgba\([^)]*,\s*0\)|transparent/.test(
        getComputedStyle(sheet).borderTopColor,
      );
      const next = bordered
        ? { centre: toDepth((outer + innerPixel) / 2), inner: toDepth(innerPixel) }
        : { centre: toDepth(outer), inner: toDepth(outer) };
      setEdge((current) =>
        Math.abs(current.centre - next.centre) < 0.001 &&
        Math.abs(current.inner - next.inner) < 0.001
          ? current
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    observer.observe(sheet);
    // A theme change can turn the border on or off.
    const theme = new MutationObserver(measure);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      theme.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [svg, side]);
  return edge;
}

/**
 * Moves the sheet's right and bottom edges by under a pixel onto whole device pixels. An edge
 * between two pixels paints its border on whichever one the browser picks, and an SVG outline
 * cannot know which; on a whole pixel there is only one answer.
 */
export function useSnappedSheet(shell: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const element = shell.current;
    const sheet = element?.querySelector<HTMLElement>('.lilt-shell__sheet');
    if (!element || !sheet) return;
    const current = (name: string) => parseFloat(element.style.getPropertyValue(name)) || 0;
    const measure = () => {
      const ratio = window.devicePixelRatio || 1;
      const box = sheet.getBoundingClientRect();
      // Where the edge would sit without a snap, then the nearest whole pixel inward.
      const right = box.right + current('--lilt-sheet-snap-right');
      const bottom = box.bottom + current('--lilt-sheet-snap-bottom');
      const offset = (edge: number) => edge - Math.floor(edge * ratio + 1e-4) / ratio;
      element.style.setProperty('--lilt-sheet-snap-right', `${offset(right).toFixed(4)}px`);
      element.style.setProperty('--lilt-sheet-snap-bottom', `${offset(bottom).toFixed(4)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [shell]);
}
