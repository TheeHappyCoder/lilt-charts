'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/*
 * Growth Bars – a row of glass pillars filling with light, in a single self-contained file.
 * Each pillar is a small block of frosted glass standing on a faintly reflective floor. One after
 * another they rise to their height, lit from inside – cool blue at the start of the row, warm at the
 * end. The last pillar glows brightest, and a pill above it counts up to the latest value. After a
 * pause the pillars sink back to short stubs and rise again.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type GrowthBarsProps = {
  /** One value per pillar, oldest first – any scale, five to nine work best */
  values?: number[];
  /** Small word in the pill */
  caption?: string;
  /** Turns the latest value into text */
  format?: (value: number) => string;
  /** Change against the previous period, shown after the value */
  delta?: string;
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

const defaultValues = [13.4, 17.2, 15.9, 24.1, 29.8, 36.5, 48.2];

/* Geometry on the 600 × 400 grid */
const FLOOR = 292; // y of the floor
const TALL = 188; // height of the tallest pillar
const STUB = 12; // height while resting
const WIDTH = 42;
const SPAN = 420; // room for the whole row

/* Choreography, in ms */
const STEP = 110; // delay from one pillar to the next
const HOLD = 4600;
const REST = 1100;

const STOPS = [
  [134, 154, 255],
  [178, 146, 236],
  [255, 164, 128],
  [255, 140, 160],
];
/** Color along the row: blue → violet → peach → pink */
const tone = (t: number) => {
  const p = Math.min(0.9999, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.floor(p);
  return STOPS[i].map((c, k) => Math.round(c + (STOPS[i + 1][k] - c) * (p - i))).join(' ');
};

/** A row of frosted glass pillars rising and filling with light from cool to warm. */
export function GrowthBars({
  values: given = defaultValues,
  caption = 'MRR',
  format = (v) => `$${v.toFixed(1)}k`,
  delta = '+32%',
  className,
  label = 'A row of glass pillars rising from left to right, lit from inside, the last one tallest and brightest',
}: GrowthBarsProps) {
  const values = given.length > 1 ? given : defaultValues;
  const root = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);
  const [shown, setShown] = useState(0); // the number in the pill
  const last = values[values.length - 1];
  const max = Math.max(...values, 1e-9);
  const n = values.length;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Reduced motion: the finished chart
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setUp(true);
      setShown(last);
      return;
    }
    let timers: number[] = [];
    let frame = 0;
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
      cancelAnimationFrame(frame);
    };
    const count = () => {
      const t0 = performance.now();
      const from = values[n - 2] ?? 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / 1300);
        setShown(from + (last - from) * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const run = () => {
      setUp(true);
      timers.push(window.setTimeout(count, n * STEP + 250));
      timers.push(window.setTimeout(() => setUp(false), n * STEP + HOLD));
      timers.push(window.setTimeout(run, n * STEP + HOLD + REST));
    };
    // Plays only while on screen, and starts from the stubs when it comes back
    const io = new IntersectionObserver(
      ([e]) => {
        clear();
        if (e.isIntersecting) timers.push(window.setTimeout(run, 350));
        else setUp(false);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, [values, last, n]);

  const pitch = SPAN / n;
  const left = (600 - SPAN) / 2 + (pitch - WIDTH) / 2;

  return (
    <div
      ref={root}
      className={['lilt-grb', className].filter(Boolean).join(' ')}
      data-up={up || undefined}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-growth-bars" precedence="default">
        {css}
      </style>

      <span className="lilt-grb-floor" aria-hidden="true" />

      {values.map((v, i) => {
        const h = Math.max(STUB + 10, (v / max) * TALL);
        return (
          <div
            key={i}
            className="lilt-grb-col"
            data-live={i === n - 1 || undefined}
            style={
              {
                '--lilt-grb-x': left + i * pitch,
                '--lilt-grb-h': h,
                '--lilt-grb-tone': tone(i / (n - 1)),
                '--lilt-grb-d': `${i * STEP}ms`,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            <span className="lilt-grb-mirror" />
            <span className="lilt-grb-pool" />
            <span className="lilt-grb-bar">
              <span className="lilt-grb-light" />
              <span className="lilt-grb-streak" />
            </span>
            {i === n - 1 && (
              <span className="lilt-grb-pill">
                <span className="lilt-grb-caption">{caption}</span>
                <span className="lilt-grb-value">{format(shown)}</span>
                {delta && (
                  <span className="lilt-grb-delta">
                    <svg viewBox="0 0 10 10">
                      <path d="M5 8.2V2M2.3 4.6 5 1.9l2.7 2.7" />
                    </svg>
                    {delta}
                  </span>
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-grb {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-grb-ink: #1a1a18;
  --lilt-grb-muted: #8c8c87;
  --lilt-grb-floor: rgba(10, 10, 10, 0.1);
  --lilt-grb-glass-a: rgba(255, 255, 255, 0.95);
  --lilt-grb-glass-b: rgba(244, 245, 250, 0.7);
  --lilt-grb-edge: rgba(255, 255, 255, 0.95);
  --lilt-grb-edge-top: #ffffff;
  --lilt-grb-outline: rgba(100, 110, 170, 0.2);
  --lilt-grb-fill: 0.5;
  --lilt-grb-fill-live: 0.92;
  --lilt-grb-streak: rgba(255, 255, 255, 0.85);
  --lilt-grb-pool: 0.4;
  --lilt-grb-mirror: 0.3;
  --lilt-grb-card: #ffffff;
  --lilt-grb-ring: rgba(10, 10, 10, 0.07);
  --lilt-grb-shadow: 0 calc(8 * var(--u)) calc(18 * var(--u)) calc(-8 * var(--u)) rgba(15, 20, 40, 0.18), 0 calc(1 * var(--u)) calc(3 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-grb-rise: cubic-bezier(0.3, 1.3, 0.4, 1);
  --lilt-grb-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lilt-grb-pop: cubic-bezier(0.34, 1.4, 0.64, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-grb *, .lilt-grb *::before, .lilt-grb *::after { box-sizing: border-box; margin: 0; }

/* The floor: a hairline that fades toward both ends */
.lilt-grb-floor {
  position: absolute;
  left: calc(48 * var(--u));
  right: calc(48 * var(--u));
  top: calc(${FLOOR} * var(--u));
  height: calc(1 * var(--u));
  background: linear-gradient(90deg, transparent, var(--lilt-grb-floor) 18%, var(--lilt-grb-floor) 82%, transparent);
}

/* ---------- Pillars ---------- */

/* A column is as tall as its pillar is right now – everything else hangs off it */
.lilt-grb-col {
  position: absolute;
  left: calc(var(--lilt-grb-x) * var(--u));
  bottom: calc(${400 - FLOOR} * var(--u));
  width: calc(${WIDTH} * var(--u));
  height: calc(${STUB} * var(--u));
  transition: height 620ms cubic-bezier(0.6, 0, 0.4, 1);
}
.lilt-grb[data-up] .lilt-grb-col {
  height: calc(var(--lilt-grb-h) * var(--u));
  transition: height 1200ms var(--lilt-grb-rise) var(--lilt-grb-d);
}
.lilt-grb-bar {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: calc(12 * var(--u)) calc(12 * var(--u)) calc(5 * var(--u)) calc(5 * var(--u));
  background: linear-gradient(180deg, var(--lilt-grb-glass-a), var(--lilt-grb-glass-b));
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) var(--lilt-grb-edge),
    inset 0 calc(1.5 * var(--u)) 0 var(--lilt-grb-edge-top),
    0 0 0 calc(1 * var(--u)) var(--lilt-grb-outline);
}
/* Light inside the glass, strongest at the floor */
.lilt-grb-light {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgb(var(--lilt-grb-tone)), rgb(var(--lilt-grb-tone) / 0.45) 55%, rgb(var(--lilt-grb-tone) / 0.08));
  opacity: 0.12;
  transition: opacity 500ms ease;
}
.lilt-grb[data-up] .lilt-grb-light {
  opacity: var(--lilt-grb-fill);
  transition: opacity 1200ms ease calc(var(--lilt-grb-d) + 200ms);
}
.lilt-grb[data-up] .lilt-grb-col[data-live] .lilt-grb-light { opacity: var(--lilt-grb-fill-live); }
.lilt-grb-streak {
  position: absolute;
  left: calc(6 * var(--u));
  top: calc(8 * var(--u));
  bottom: calc(8 * var(--u));
  width: calc(3.5 * var(--u));
  border-radius: 999px;
  background: linear-gradient(180deg, var(--lilt-grb-streak), transparent 85%);
}
/* Colored light on the floor under each pillar, and a short reflection below it */
.lilt-grb-pool {
  position: absolute;
  left: -30%;
  right: -30%;
  bottom: calc(-12 * var(--u));
  height: calc(26 * var(--u));
  border-radius: 50%;
  background: rgb(var(--lilt-grb-tone));
  filter: blur(calc(12 * var(--u)));
  opacity: 0;
  transition: opacity 500ms ease;
}
.lilt-grb[data-up] .lilt-grb-pool { opacity: calc(var(--lilt-grb-pool) * 0.55); transition: opacity 1200ms ease calc(var(--lilt-grb-d) + 300ms); }
.lilt-grb[data-up] .lilt-grb-col[data-live] .lilt-grb-pool { opacity: var(--lilt-grb-pool); }
.lilt-grb-mirror {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 3 * var(--u));
  height: calc(34 * var(--u));
  border-radius: calc(5 * var(--u)) calc(5 * var(--u)) calc(12 * var(--u)) calc(12 * var(--u));
  background: linear-gradient(180deg, rgb(var(--lilt-grb-tone) / var(--lilt-grb-mirror)), transparent 90%);
  -webkit-mask: linear-gradient(180deg, #000, transparent);
  mask: linear-gradient(180deg, #000, transparent);
  opacity: 0.25;
  transition: opacity 500ms ease;
}
.lilt-grb[data-up] .lilt-grb-mirror { opacity: 1; transition: opacity 1200ms ease calc(var(--lilt-grb-d) + 300ms); }

/* ---------- Pill ---------- */

.lilt-grb-pill {
  position: absolute;
  right: calc(-20 * var(--u));
  bottom: calc(100% + 14 * var(--u));
  display: flex;
  align-items: center;
  gap: calc(7 * var(--u));
  height: calc(34 * var(--u));
  padding: 0 calc(13 * var(--u));
  border-radius: 999px;
  background: var(--lilt-grb-card);
  box-shadow: 0 0 0 calc(1 * var(--u)) var(--lilt-grb-ring), var(--lilt-grb-shadow);
  font-size: calc(13.5 * var(--u));
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--lilt-grb-muted);
  opacity: 0;
  transform: translateY(calc(8 * var(--u))) scale(0.92);
  transform-origin: 80% 100%;
  transition: opacity 260ms ease, transform 300ms ease;
}
.lilt-grb[data-up] .lilt-grb-pill {
  opacity: 1;
  transform: none;
  transition: opacity 300ms ease calc(var(--lilt-grb-d) + 500ms), transform 600ms var(--lilt-grb-pop) calc(var(--lilt-grb-d) + 500ms);
}
.lilt-grb-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--lilt-grb-ink);
}
.lilt-grb-delta {
  display: flex;
  align-items: center;
  gap: calc(2 * var(--u));
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--lilt-grb-tone));
  filter: saturate(1.4) brightness(0.86);
}
.lilt-grb-delta svg {
  width: calc(10 * var(--u));
  height: calc(10 * var(--u));
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (prefers-reduced-motion: reduce) {
  .lilt-grb-col, .lilt-grb-light, .lilt-grb-pool, .lilt-grb-mirror, .lilt-grb-pill { transition: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-grb {
  --lilt-grb-ink: #f4f4f2;
  --lilt-grb-muted: #9a9a94;
  --lilt-grb-floor: rgba(255, 255, 255, 0.12);
  --lilt-grb-glass-a: rgba(255, 255, 255, 0.15);
  --lilt-grb-glass-b: rgba(255, 255, 255, 0.05);
  --lilt-grb-edge: rgba(255, 255, 255, 0.13);
  --lilt-grb-edge-top: rgba(255, 255, 255, 0.4);
  --lilt-grb-outline: rgba(0, 0, 0, 0.4);
  --lilt-grb-fill: 0.42;
  --lilt-grb-fill-live: 0.9;
  --lilt-grb-streak: rgba(255, 255, 255, 0.3);
  --lilt-grb-pool: 0.34;
  --lilt-grb-mirror: 0.24;
  --lilt-grb-card: #1c1c1a;
  --lilt-grb-ring: rgba(255, 255, 255, 0.09);
  --lilt-grb-shadow: 0 calc(8 * var(--u)) calc(18 * var(--u)) calc(-8 * var(--u)) rgba(0, 0, 0, 0.6), 0 calc(1 * var(--u)) calc(3 * var(--u)) rgba(0, 0, 0, 0.3);
}
:where(.dark, [data-theme="dark"]) .lilt-grb-delta { filter: none; }
`;
