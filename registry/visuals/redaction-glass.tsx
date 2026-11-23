'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/*
 * Redaction Glass – private details disappearing behind one plate of frosted glass, in a single file.
 * A short record sits on the page in large, plain type: a name, a card number, an email. A thick plate
 * of frosted glass glides in from the side and comes to rest over the values; everything behind it
 * blurs away for real, the plate catches a little color, and a chip counts what is hidden. After a
 * pause the plate glides off again.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type RedactionField = { label: string; value: string };

export type RedactionGlassProps = {
  /** Two to four fields – keep the values short, they don't wrap */
  fields?: RedactionField[];
  /** Words after the count in the chip – a function receives the count */
  unit?: string | ((count: number) => string);
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

const defaultFields: RedactionField[] = [
  { label: 'Name', value: 'Maya Okafor' },
  { label: 'Card', value: '4242 8891 0032' },
  { label: 'Email', value: 'maya@lilt.ui' },
];

/* Geometry on the 600 × 400 grid */
const ROW = 58;
const MID = 178; // vertical centre of the record
const OVER = 17; // how far the plate reaches past the first and last row

/* Choreography, in ms */
const REST = 1500; // plain record
const HOLD = 4300; // glass in place
const LIFT = 1300; // glass on its way out

/** A frosted glass plate sliding over a record to blur private values away. */
export function RedactionGlass({
  fields: given = defaultFields,
  unit = (n) => (n === 1 ? 'field hidden' : 'fields hidden'),
  className,
  label = 'A record with a name, card number and email – a plate of frosted glass slides over the values and blurs them away',
}: RedactionGlassProps) {
  const fields = (given.length ? given : defaultFields).slice(0, 4);
  const root = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Reduced motion: the glass is simply in place
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOn(true);
      return;
    }
    let timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const run = () => {
      setOn(false);
      later(() => setOn(true), REST);
      later(() => setOn(false), REST + HOLD);
      later(run, REST + HOLD + LIFT);
    };
    // Plays only while on screen, and starts from the top when it comes back
    const io = new IntersectionObserver(
      ([e]) => {
        clear();
        if (e.isIntersecting) run();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, []);

  const top = MID - (fields.length * ROW) / 2;
  const word = typeof unit === 'function' ? unit(fields.length) : unit;

  return (
    <div
      ref={root}
      className={['lilt-rgl', className].filter(Boolean).join(' ')}
      data-on={on || undefined}
      style={{ '--lilt-rgl-top': top, '--lilt-rgl-rows': fields.length } as CSSProperties}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-redaction-glass" precedence="default">
        {css}
      </style>

      <div className="lilt-rgl-record" aria-hidden="true">
        {fields.map((f, i) => (
          <div className="lilt-rgl-row" key={i}>
            <span className="lilt-rgl-label">{f.label}</span>
            <span className="lilt-rgl-value">{f.value}</span>
          </div>
        ))}
      </div>

      {/* The plate: light pooled under it, the glass itself, a glint and a small lock */}
      <div className="lilt-rgl-plate" aria-hidden="true">
        <span className="lilt-rgl-pool" />
        <span className="lilt-rgl-glass">
          <span className="lilt-rgl-tint" />
          <span className="lilt-rgl-streak" />
          <span className="lilt-rgl-glint" />
          <svg className="lilt-rgl-lock" viewBox="0 0 16 16">
            <rect x="3.4" y="7.1" width="9.2" height="6.4" rx="1.9" />
            <path d="M5.5 7.1V5.3a2.5 2.5 0 0 1 5 0v1.8" />
          </svg>
        </span>
      </div>

      <span className="lilt-rgl-chip" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M8 1.9 3 3.8v3.7c0 3.1 2 5.4 5 6.6 3-1.2 5-3.5 5-6.6V3.8L8 1.9Z" />
          <path d="m5.9 7.9 1.5 1.5 2.8-3" />
        </svg>
        <span className="lilt-rgl-count">{fields.length}</span>
        <span>{word}</span>
      </span>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-rgl {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-rgl-ink: #1a1a18;
  --lilt-rgl-muted: #8c8c87;
  --lilt-rgl-rule: rgba(10, 10, 10, 0.08);
  --lilt-rgl-card: #ffffff;
  --lilt-rgl-ring: rgba(10, 10, 10, 0.07);
  --lilt-rgl-glass-a: rgba(255, 255, 255, 0.62);
  --lilt-rgl-glass-b: rgba(255, 255, 255, 0.16);
  --lilt-rgl-tint: 0.2;
  --lilt-rgl-edge: rgba(255, 255, 255, 0.9);
  --lilt-rgl-edge-top: #ffffff;
  --lilt-rgl-outline: rgba(110, 120, 190, 0.2);
  --lilt-rgl-sliver: rgba(150, 160, 225, 0.3);
  --lilt-rgl-drop: 0 calc(26 * var(--u)) calc(40 * var(--u)) calc(-20 * var(--u)) rgba(50, 60, 130, 0.32), 0 calc(4 * var(--u)) calc(10 * var(--u)) rgba(50, 60, 130, 0.07);
  --lilt-rgl-streak: rgba(255, 255, 255, 0.75);
  --lilt-rgl-glint: rgba(255, 255, 255, 0.7);
  --lilt-rgl-pool: 0.5;
  --lilt-rgl-lock: rgba(23, 23, 23, 0.42);
  --lilt-rgl-chip-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(15, 20, 40, 0.14), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-rgl-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lilt-rgl-pop: cubic-bezier(0.34, 1.4, 0.64, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-rgl *, .lilt-rgl *::before, .lilt-rgl *::after { box-sizing: border-box; margin: 0; }

/* ---------- Record ---------- */

.lilt-rgl-record {
  position: absolute;
  left: calc(92 * var(--u));
  right: calc(92 * var(--u));
  top: calc(var(--lilt-rgl-top) * var(--u));
}
.lilt-rgl-row {
  position: relative;
  display: flex;
  align-items: center;
  height: calc(${ROW} * var(--u));
  white-space: nowrap;
}
/* Hairlines between the rows, fading out toward both ends */
.lilt-rgl-row + .lilt-rgl-row::before {
  content: "";
  position: absolute;
  left: calc(-40 * var(--u));
  right: calc(-40 * var(--u));
  top: 0;
  height: calc(1 * var(--u));
  background: linear-gradient(90deg, transparent, var(--lilt-rgl-rule) 16%, var(--lilt-rgl-rule) 84%, transparent);
}
.lilt-rgl-label {
  flex: none;
  width: calc(150 * var(--u));
  font-size: calc(14 * var(--u));
  letter-spacing: -0.005em;
  color: var(--lilt-rgl-muted);
}
.lilt-rgl-value {
  font-size: calc(22 * var(--u));
  font-weight: 500;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--lilt-rgl-ink);
}

/* ---------- Plate ---------- */

.lilt-rgl-plate {
  position: absolute;
  left: calc(222 * var(--u));
  width: calc(300 * var(--u));
  top: calc((var(--lilt-rgl-top) - ${OVER}) * var(--u));
  height: calc((var(--lilt-rgl-rows) * ${ROW} + ${OVER * 2}) * var(--u));
  opacity: 0;
  transform: translateX(calc(150 * var(--u))) rotate(5deg);
  transition: transform ${LIFT}ms cubic-bezier(0.6, 0, 0.8, 0.4), opacity 700ms ease 500ms;
}
.lilt-rgl[data-on] .lilt-rgl-plate {
  opacity: 1;
  transform: rotate(-2.2deg);
  transition: transform 1500ms var(--lilt-rgl-ease), opacity 220ms ease;
}
.lilt-rgl-pool {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: calc(-16 * var(--u));
  height: calc(46 * var(--u));
  border-radius: 50%;
  background: linear-gradient(90deg, #ffa0ab, #ffb89e 33%, #c8a8e5 66%, #a8b5ff);
  filter: blur(calc(22 * var(--u)));
  opacity: var(--lilt-rgl-pool);
}
.lilt-rgl-glass {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: calc(26 * var(--u));
  background: linear-gradient(155deg, var(--lilt-rgl-glass-a), var(--lilt-rgl-glass-b) 52%);
  -webkit-backdrop-filter: blur(calc(9 * var(--u))) saturate(1.6);
  backdrop-filter: blur(calc(9 * var(--u))) saturate(1.6);
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) var(--lilt-rgl-edge),
    inset 0 calc(1.5 * var(--u)) 0 0 var(--lilt-rgl-edge-top),
    inset 0 calc(-4 * var(--u)) 0 0 var(--lilt-rgl-sliver),
    0 0 0 calc(1 * var(--u)) var(--lilt-rgl-outline),
    var(--lilt-rgl-drop);
}
/* A wash of color that deepens toward the lower edge */
.lilt-rgl-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(170deg, rgb(255 176 150 / 0.5), rgb(196 164 236 / 0.75) 50%, rgb(150 166 255));
  opacity: var(--lilt-rgl-tint);
}
/* A soft specular streak down the left side */
.lilt-rgl-streak {
  position: absolute;
  left: calc(11 * var(--u));
  top: calc(16 * var(--u));
  bottom: calc(30 * var(--u));
  width: calc(5 * var(--u));
  border-radius: 999px;
  background: linear-gradient(180deg, var(--lilt-rgl-streak), transparent);
  filter: blur(calc(1.5 * var(--u)));
}
.lilt-rgl-glint {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 36%, var(--lilt-rgl-glint) 50%, transparent 64%);
  transform: translateX(-120%);
}
.lilt-rgl[data-on] .lilt-rgl-glint { animation: lilt-rgl-glint 1500ms var(--lilt-rgl-ease) 900ms both; }
@keyframes lilt-rgl-glint {
  from { transform: translateX(-120%); }
  to { transform: translateX(120%); }
}
.lilt-rgl-lock {
  position: absolute;
  right: calc(15 * var(--u));
  top: calc(14 * var(--u));
  width: calc(17 * var(--u));
  height: calc(17 * var(--u));
  fill: none;
  stroke: var(--lilt-rgl-lock);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---------- Chip ---------- */

.lilt-rgl-chip {
  position: absolute;
  left: 50%;
  top: calc((var(--lilt-rgl-top) + var(--lilt-rgl-rows) * ${ROW} + 50) * var(--u));
  display: inline-flex;
  align-items: center;
  gap: calc(5 * var(--u));
  height: calc(32 * var(--u));
  padding: 0 calc(14 * var(--u)) 0 calc(11 * var(--u));
  border-radius: 999px;
  background: var(--lilt-rgl-card);
  box-shadow: 0 0 0 calc(1 * var(--u)) var(--lilt-rgl-ring), var(--lilt-rgl-chip-shadow);
  font-size: calc(13.5 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--lilt-rgl-muted);
  font-variant-numeric: tabular-nums;
  opacity: 0;
  transform: translate(-50%, calc(-6 * var(--u))) scale(0.94);
  transition: opacity 320ms ease, transform 420ms var(--lilt-rgl-ease);
}
.lilt-rgl[data-on] .lilt-rgl-chip {
  opacity: 1;
  transform: translate(-50%, 0);
  transition: opacity 280ms ease 1000ms, transform 560ms var(--lilt-rgl-pop) 1000ms;
}
.lilt-rgl-chip svg {
  width: calc(15 * var(--u));
  height: calc(15 * var(--u));
  margin-right: calc(1 * var(--u));
  fill: none;
  stroke: var(--lilt-rgl-ink);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.lilt-rgl-count { color: var(--lilt-rgl-ink); }

@media (prefers-reduced-motion: reduce) {
  .lilt-rgl-plate, .lilt-rgl-chip { transition: none !important; }
  .lilt-rgl-glint { animation: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-rgl {
  --lilt-rgl-ink: #f4f4f2;
  --lilt-rgl-muted: #9a9a94;
  --lilt-rgl-rule: rgba(255, 255, 255, 0.09);
  --lilt-rgl-card: #1c1c1a;
  --lilt-rgl-ring: rgba(255, 255, 255, 0.09);
  --lilt-rgl-glass-a: rgba(255, 255, 255, 0.17);
  --lilt-rgl-glass-b: rgba(255, 255, 255, 0.04);
  --lilt-rgl-tint: 0.2;
  --lilt-rgl-edge: rgba(255, 255, 255, 0.16);
  --lilt-rgl-edge-top: rgba(255, 255, 255, 0.34);
  --lilt-rgl-outline: rgba(0, 0, 0, 0.5);
  --lilt-rgl-sliver: rgba(150, 160, 235, 0.3);
  --lilt-rgl-drop: 0 calc(26 * var(--u)) calc(40 * var(--u)) calc(-20 * var(--u)) rgba(0, 0, 0, 0.7), 0 calc(4 * var(--u)) calc(10 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-rgl-streak: rgba(255, 255, 255, 0.24);
  --lilt-rgl-glint: rgba(255, 255, 255, 0.2);
  --lilt-rgl-pool: 0.32;
  --lilt-rgl-lock: rgba(255, 255, 255, 0.5);
  --lilt-rgl-chip-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(0, 0, 0, 0.6), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(0, 0, 0, 0.3);
}
`;
