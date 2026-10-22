'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GLIDE } from './motion';

/** What arrives in turn when a list opens. */
const ROWS = '.lilt-list__item, .lilt-list__label, .lilt-list__separator';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * One highlight that glides between a list's items instead of each item lighting on its own.
 * Place it first inside the element that holds the items; it follows whichever item Base UI marks
 * `data-highlighted` (pointer or keyboard), measured by offset so it stays true inside a scaled or
 * moving popup. It fades out when nothing is highlighted, and jumps rather than glides with
 * reduced motion.
 *
 * A vertical list's highlight spans the list and only moves up and down (`axis="y"`), so it never
 * depends on a width measured while a popup is still settling; a row of tabs moves sideways
 * (`axis="x"`); a grid moves both ways.
 *
 * It also numbers the rows that are there when the list opens (`--lilt-row`), before they are
 * painted, so they can arrive in turn; rows added later stay unnumbered and arrive at once.
 */
export function Glide({
  className,
  selector = '[data-highlighted]',
  axis = 'y',
}: {
  className?: string;
  /** Which item to follow; a list of selectors follows the first match. */
  selector?: string;
  /** Which way the items run. */
  axis?: 'y' | 'x' | 'both';
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [box, setBox] = useState<Box | null>(null);
  // The highlighted item's `data-variant`, so a destructive row can tint the highlight.
  const [tone, setTone] = useState<string>();
  // The first box appears where it is; only later moves glide.
  const [placed, setPlaced] = useState(false);

  useLayoutEffect(() => {
    const rows = ref.current?.parentElement?.querySelectorAll<HTMLElement>(ROWS) ?? [];
    rows.forEach((row, index) => row.style.setProperty('--lilt-row', String(index)));
  }, []);

  useEffect(() => {
    const list = ref.current?.parentElement;
    if (!list) return;
    const sync = () => {
      const item = list.querySelector<HTMLElement>(
        `:is(${selector}):not([data-disabled]):not([aria-disabled="true"])`,
      );
      setTone(item?.dataset.variant);
      setBox(
        item
          ? {
              top: item.offsetTop,
              left: item.offsetLeft,
              width: item.offsetWidth,
              height: item.offsetHeight,
            }
          : null,
      );
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(list, {
      attributes: true,
      attributeFilter: [
        'data-highlighted',
        'data-selected',
        'data-active',
        'data-popup-open',
        'aria-selected',
      ],
      childList: true,
      subtree: true,
    });
    // A popup can settle its width after it opens; the highlight follows.
    const resize = new ResizeObserver(sync);
    resize.observe(list);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, [selector]);

  useEffect(() => {
    if (box && !placed) setPlaced(true);
    if (!box) setPlaced(false);
  }, [box, placed]);

  // Along the list it follows the item; across it, it fills the list, with no measuring.
  const across =
    axis === 'y'
      ? { left: 0, right: 0 }
      : axis === 'x'
        ? { top: 0, bottom: 0 }
        : { top: 0, left: 0 };
  const along = !box
    ? { opacity: 0 }
    : axis === 'y'
      ? { opacity: 1, y: box.top, height: box.height }
      : axis === 'x'
        ? { opacity: 1, x: box.left, width: box.width }
        : { opacity: 1, x: box.left, y: box.top, width: box.width, height: box.height };
  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      data-tone={tone}
      className={className}
      style={{ position: 'absolute', ...across, pointerEvents: 'none', zIndex: 0 }}
      initial={false}
      animate={along}
      transition={reduced || !placed ? { duration: 0 } : { ...GLIDE, opacity: { duration: 0.12 } }}
    />
  );
}
