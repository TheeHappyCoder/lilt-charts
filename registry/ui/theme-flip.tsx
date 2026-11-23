'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useId, type CSSProperties, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

export interface ThemeFlipProps {
  /** The theme showing now. */
  theme: Theme;
  /** Called with the other theme. Apply it synchronously, as setting state or a class does. */
  onThemeChange: (theme: Theme) => void;
  /** Milliseconds the new theme takes to spread across the page. Default 700. */
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

const SPRING = { type: 'spring', stiffness: 260, damping: 20 } as const;
/** How soft the edge of the spreading circle is, in pixels. */
const FEATHER = 72;
const STYLE_ID = 'lilt-theme-flip';
const VIEW_CSS = `
@property --lilt-flip-r { syntax: '<length>'; inherits: true; initial-value: 0px; }
:root[data-lilt-flip]::view-transition-old(root),
:root[data-lilt-flip]::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
:root[data-lilt-flip]::view-transition-new(root) {
  -webkit-mask-image: radial-gradient(circle at var(--lilt-flip-x) var(--lilt-flip-y), #000 calc(var(--lilt-flip-r) - ${FEATHER}px), transparent var(--lilt-flip-r));
  mask-image: radial-gradient(circle at var(--lilt-flip-x) var(--lilt-flip-y), #000 calc(var(--lilt-flip-r) - ${FEATHER}px), transparent var(--lilt-flip-r));
}`;

type Transitioning = Document & {
  startViewTransition?: (update: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

/**
 * A machined hardware theme keycap whose new theme spreads out from the button. The sun's rays
 * draw in as a bite slides across it and it swells into a moon, on a spring; an internal solar or
 * lunar wash tints the recessed lens, and the whole page changes inside a circle growing from
 * where you pressed with a soft, feathered edge. Uses browser view transitions when available.
 */
export function ThemeFlip({
  theme,
  onThemeChange,
  duration = 700,
  className,
  style,
}: ThemeFlipProps) {
  const reduced = Boolean(useReducedMotion());
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  const flip = (event: MouseEvent<HTMLButtonElement>) => {
    const doc = document as Transitioning;
    if (!doc.startViewTransition || reduced) {
      onThemeChange(next);
      return;
    }
    // From the button's centre, so a keyboard press spreads from the same place as a click.
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + FEATHER;
    const root = document.documentElement;
    if (!document.getElementById(STYLE_ID)) {
      const sheet = document.createElement('style');
      sheet.id = STYLE_ID;
      sheet.textContent = VIEW_CSS;
      document.head.append(sheet);
    }
    root.style.setProperty('--lilt-flip-x', `${x}px`);
    root.style.setProperty('--lilt-flip-y', `${y}px`);
    root.dataset.liltFlip = '';
    const transition = doc.startViewTransition(() => flushSync(() => onThemeChange(next)));
    void transition.ready.then(() =>
      root.animate(
        { '--lilt-flip-r': ['0px', `${reach}px`] },
        {
          duration,
          easing: 'cubic-bezier(0.32, 0, 0.18, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      ),
    );
    void transition.finished.finally(() => {
      delete root.dataset.liltFlip;
    });
  };

  return (
    <>
      <style href="lilt-ui-theme-flip" precedence="default">
        {css}
      </style>
      <button
        type="button"
        onClick={flip}
        aria-label={`Switch to ${next} theme`}
        className={['lilt-tfl', className].filter(Boolean).join(' ')}
        data-mode={theme}
        style={style}
      >
        <span className="lilt-tfl-glow" aria-hidden="true" />
        <SunMoon dark={theme === 'dark'} reduced={reduced} />
      </button>
    </>
  );
}

const RAYS = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

/**
 * One drawing that is both: a sun is a small disc in its rays; a moon is a larger disc with a
 * second disc biting into it. Flipping moves the bite, swells the disc and draws the rays in.
 */
function SunMoon({ dark, reduced }: { dark: boolean; reduced: boolean }) {
  const mask = useId();
  const transition = reduced ? { duration: 0 } : SPRING;
  return (
    <motion.svg
      aria-hidden="true"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      initial={false}
      animate={{ rotate: dark ? -24 : 90 }}
      transition={transition}
      style={{ position: 'relative', zIndex: 1, overflow: 'visible' }}
    >
      <mask id={mask}>
        <rect x="-4" y="-4" width="32" height="32" fill="#fff" />
        <motion.circle
          r={7}
          fill="#000"
          initial={false}
          animate={dark ? { cx: 17.5, cy: 6.5 } : { cx: 30, cy: -6 }}
          transition={transition}
        />
      </mask>
      <motion.circle
        cx={12}
        cy={12}
        fill="currentColor"
        mask={`url(#${mask})`}
        initial={false}
        animate={{ r: dark ? 8.5 : 4.6 }}
        transition={transition}
      />
      {RAYS.map((angle, i) => (
        <motion.line
          key={i}
          x1={12 + Math.cos(angle) * 7.6}
          y1={12 + Math.sin(angle) * 7.6}
          x2={12 + Math.cos(angle) * 10.2}
          y2={12 + Math.sin(angle) * 10.2}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          initial={false}
          animate={
            dark
              ? { opacity: 0, pathLength: 0, filter: 'blur(1.5px)' }
              : { opacity: 1, pathLength: 1, filter: 'blur(0px)' }
          }
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.32, delay: dark ? 0 : 0.08 + i * 0.025, ease: [0.22, 1, 0.36, 1] }
          }
        />
      ))}
    </motion.svg>
  );
}

const css = /* css */ `
.lilt-tfl {
  --tfl-a: #ffffff;
  --tfl-b: #f0f2f6;
  --tfl-ring: rgba(15, 20, 40, 0.09);
  --tfl-top: #ffffff;
  --tfl-lip: #dde0e8;
  --tfl-drop: 0 8px 18px -8px rgba(15, 20, 40, 0.22), 0 2px 4px rgba(15, 20, 40, 0.06);
  --tfl-glow: radial-gradient(circle at 50% 50%, rgba(255, 190, 120, 0.36), transparent 72%);
  --tfl-ink: #c97c24;
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--tfl-a), var(--tfl-b));
  box-shadow:
    0 0 0 1px var(--tfl-ring),
    inset 0 1.5px 0 var(--tfl-top),
    inset 0 -2px 0 var(--tfl-lip),
    var(--tfl-drop);
  color: var(--tfl-ink);
  cursor: pointer;
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1),
    color 240ms ease;
}
.lilt-tfl[data-mode="dark"] {
  --tfl-a: #272a34;
  --tfl-b: #191b22;
  --tfl-ring: rgba(255, 255, 255, 0.11);
  --tfl-top: rgba(255, 255, 255, 0.12);
  --tfl-lip: rgba(0, 0, 0, 0.78);
  --tfl-drop: 0 10px 20px -8px rgba(0, 0, 0, 0.72), 0 2px 5px rgba(0, 0, 0, 0.38);
  --tfl-glow: radial-gradient(circle at 50% 50%, rgba(163, 177, 255, 0.32), transparent 72%);
  --tfl-ink: #b9c4ff;
}
.lilt-tfl:hover {
  transform: translateY(-1px);
}
.lilt-tfl:active {
  transform: translateY(1px) scale(0.94);
}
.lilt-tfl:focus-visible {
  outline: 2px solid color-mix(in srgb, currentColor 45%, transparent);
  outline-offset: 2px;
}
.lilt-tfl-glow {
  position: absolute;
  inset: 0;
  background: var(--tfl-glow);
  pointer-events: none;
  z-index: 0;
}
`;
