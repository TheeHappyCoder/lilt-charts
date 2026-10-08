'use client';

import { useReducedMotion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

const BAR = 8;
const BAR_GAP = 5;
const CELL = 4;
const CELL_GAP = 3;
/** Seconds for a peak marker to fall the full height, like a meter's peak hold. */
const PEAK_FALL = 2.4;
const POINTER_REACH = 110;

interface Palette {
  low: string;
  high: string;
  peak: string;
}

function readPalette(element: HTMLElement): Palette {
  const styles = getComputedStyle(element);
  return {
    low: styles.getPropertyValue('--story-violet').trim() || '#8b6dff',
    high: styles.getPropertyValue('--story-rose').trim() || '#ee5aa6',
    peak: styles.getPropertyValue('--foreground').trim() || '#ededed',
  };
}

/**
 * The page's closing graphic: the hero's level meter as a skyline across the frame. Bars sway in
 * a slow, uneven lilt, rise under the pointer, and leave peak markers that fall back like a real
 * meter's. It only animates while on screen, and stands still for reduced motion.
 */
export function HomeSkyline() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = Boolean(useReducedMotion());
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const element = canvas.current;
    const host = element?.parentElement;
    const context = element?.getContext('2d');
    if (!element || !host || !context) return;

    let palette = readPalette(element);
    let width = 0;
    let height = 0;
    let levels: number[] = [];
    let peaks: number[] = [];
    let pointer: number | null = null;
    let pull = 0;
    let frame = 0;
    let visible = false;
    let last = performance.now();
    const start = last;

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = element.clientWidth;
      height = element.clientHeight;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.max(1, Math.floor((width + BAR_GAP) / (BAR + BAR_GAP)));
      levels = Array.from({ length: count }, (_, index) => target(index, count, 0));
      peaks = [...levels];
    };

    /** Where a bar wants to be: a broad swell, two slower waves, and the pointer's lift. */
    function target(index: number, count: number, time: number) {
      const u = count > 1 ? index / (count - 1) : 0.5;
      const swell = 0.3 + 0.26 * Math.sin(u * Math.PI);
      const waves =
        0.16 * Math.sin(u * 8.5 + time * 0.9) +
        0.09 * Math.sin(u * 21 - time * 1.6) +
        0.05 * Math.sin(u * 47 + time * 2.3);
      const x = index * (BAR + BAR_GAP) + BAR / 2;
      const lift = pointer === null ? 0 : Math.exp(-(((x - pointer) / POINTER_REACH) ** 2));
      return Math.min(1, Math.max(0.05, swell + waves + 0.42 * lift * pull));
    }

    const draw = (now: number) => {
      const time = reduced ? 0 : (now - start) / 1000;
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      pull += ((pointer === null ? 0 : 1) - pull) * Math.min(1, delta * 6);

      context.clearRect(0, 0, width, height);
      const rows = Math.floor((height + CELL_GAP) / (CELL + CELL_GAP));
      const count = levels.length;
      for (let index = 0; index < count; index += 1) {
        const goal = target(index, count, time);
        const level = reduced
          ? goal
          : levels[index]! + (goal - levels[index]!) * Math.min(1, delta * 8);
        levels[index] = level;
        const peak = reduced ? level : Math.max(level, peaks[index]! - delta / PEAK_FALL);
        peaks[index] = peak;

        const x = index * (BAR + BAR_GAP);
        const lit = Math.round(level * (rows - 1));
        // The lower part reads as the first series, the top as the second, as in the hero.
        const split = Math.round(lit * (0.56 + 0.08 * Math.sin(index * 0.7)));
        for (let row = 0; row < lit; row += 1) {
          context.fillStyle = row < split ? palette.low : palette.high;
          context.globalAlpha = 0.92;
          context.beginPath();
          context.roundRect(x, height - (row + 1) * (CELL + CELL_GAP) + CELL_GAP, BAR, CELL, 1.5);
          context.fill();
        }
        const peakRow = Math.round(peak * (rows - 1));
        if (peakRow > lit) {
          context.fillStyle = palette.peak;
          context.globalAlpha = 0.55;
          context.beginPath();
          context.roundRect(
            x,
            height - (peakRow + 1) * (CELL + CELL_GAP) + CELL_GAP,
            BAR,
            CELL,
            1.5,
          );
          context.fill();
        }
      }
      context.globalAlpha = 1;
      frame = visible && !reduced ? requestAnimationFrame(draw) : 0;
    };

    const kick = () => {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    const onMove = (event: PointerEvent) => {
      if (reduced || event.pointerType === 'touch') return;
      pointer = event.clientX - element.getBoundingClientRect().left;
      kick();
    };
    const onLeave = () => {
      pointer = null;
    };

    const sizeObserver = new ResizeObserver(() => {
      resize();
      kick();
    });
    sizeObserver.observe(element);
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) kick();
    });
    viewObserver.observe(element);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    // Theme tokens land on the root a frame after the switch.
    const themeFrame = requestAnimationFrame(() => {
      palette = readPalette(element);
      kick();
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(themeFrame);
      sizeObserver.disconnect();
      viewObserver.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced, resolvedTheme]);

  return <canvas ref={canvas} className="lilt-story-skyline" aria-hidden="true" />;
}
