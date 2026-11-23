'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export interface DynamicIslandProps {
  /** Names what it shows now. A new name swaps the content and reshapes the island to fit it. */
  view: string;
  /** What it shows for this view. The island takes the size of whatever you put here. */
  children: ReactNode;
  /** Corner radius once it is taller than a pill. Default 24. */
  radius?: number;
  className?: string;
  style?: CSSProperties;
}

// A little give, so the shape lands rather than stops.
const SHAPE = { type: 'spring', stiffness: 340, damping: 26, mass: 0.9 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One anodized obsidian shape that becomes whatever it needs to be: a pill for a timer, a wide
 * card for a call. Change `view` and the old content blurs away first, then the shape springs to
 * the size of the new content, and the new content clears out of a blur as it lands. Growing, the
 * shape leads; shrinking, it waits for the old content to go, so nothing is ever squeezed.
 */
export function DynamicIsland({
  view,
  children,
  radius = 24,
  className,
  style,
}: DynamicIslandProps) {
  const reduced = useReducedMotion();
  const content = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style href="lilt-ui-dynamic-island" precedence="default">
        {css}
      </style>
      <motion.div
        className={['lilt-dis', className].filter(Boolean).join(' ')}
        initial={false}
        animate={
          size
            ? {
                width: size.width,
                height: size.height,
                borderRadius: Math.min(size.height / 2, radius),
              }
            : undefined
        }
        transition={reduced ? { duration: 0 } : SHAPE}
        style={style}
      >
        <span className="lilt-dis-sheen" aria-hidden="true" />
        <div ref={content} className="lilt-dis-inner">
          <AnimatePresence initial={false}>
            <motion.div
              key={view}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
              animate={{
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
                transition: { duration: 0.38, delay: reduced ? 0 : 0.1, ease: EASE },
              }}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0.12 } }
                  : { opacity: 0, scale: 0.96, filter: 'blur(6px)', transition: { duration: 0.16 } }
              }
              style={{ gridArea: '1 / 1' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

const css = /* css */ `
.lilt-dis {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #111216 0%, #050507 52%, #000000 100%);
  color: #f4f4f6;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -1.5px 0 rgba(0, 0, 0, 0.9),
    0 22px 44px -16px rgba(0, 0, 0, 0.72),
    0 4px 12px rgba(0, 0, 0, 0.36);
  color-scheme: dark;
  -webkit-font-smoothing: antialiased;
}
.lilt-dis-sheen {
  position: absolute;
  inset: 0 14% auto;
  height: 44%;
  background: radial-gradient(80% 100% at 50% 0%, rgba(255, 255, 255, 0.09), transparent 72%);
  pointer-events: none;
}
.lilt-dis-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  display: grid;
  place-items: center;
  width: max-content;
}
`;
