'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/*
 * Diff Patch – one line of code turning over into its fix, in a single self-contained file.
 * A few lines of code sit faintly on the page. The line with the problem is lifted out of them as a
 * thick slab, washed in red with a minus beside it. The slab turns over on its long axis and lands
 * on its other face: the corrected line, washed in green with a plus, and a glint running across it.
 * A chip underneath says what happened. After a pause it turns back.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type DiffPatchLine = {
  code: string;
  /** Part of the code to emphasise – the piece that is wrong, or the piece that fixes it */
  mark?: string;
};

export type DiffPatchProps = {
  /** Up to two lines above the change */
  before?: string[];
  /** Up to two lines below the change */
  after?: string[];
  /** The line with the problem */
  bad?: DiffPatchLine;
  /** The corrected line */
  fix?: DiffPatchLine;
  /** Line number of the first line shown */
  start?: number;
  /** Chip text while the problem is showing, and once it is fixed */
  notes?: [string, string];
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

const defaultBefore = [
  'async function retry(fn, tries = 3) {',
  '  for (let i = 0; i < tries; i++) {',
];
const defaultAfter = ['    catch { await wait(2 ** i * 100); }', '  }'];

/* Geometry on the 600 × 400 grid */
const MID = 176; // centre of the slab
const SLAB = 64;
const LINE = 33;
const GAP = 13; // between the slab and the nearest line

/* Choreography, in ms */
const REST = 1700; // the problem
const HOLD = 4200; // the fix

const split = (line: DiffPatchLine): ReactNode => {
  const at = line.mark ? line.code.indexOf(line.mark) : -1;
  if (at < 0 || !line.mark) return line.code;
  return (
    <>
      {line.code.slice(0, at)}
      <span className="lilt-dfp-mark">{line.mark}</span>
      {line.code.slice(at + line.mark.length)}
    </>
  );
};

/** A faulty line of code lifted as a slab, flipping over into its fix. */
export function DiffPatch({
  before = defaultBefore,
  after = defaultAfter,
  bad = { code: '    try { return fn(); }', mark: 'fn()' },
  fix = { code: '    try { return await fn(); }', mark: 'await' },
  start = 12,
  notes = ['1 issue found', 'Fix applied'],
  className,
  label = 'A faulty line of code, lifted out of its file as a slab, turns over into the corrected line',
}: DiffPatchProps) {
  const above = before.slice(-2);
  const below = after.slice(0, 2);
  const root = useRef<HTMLDivElement>(null);
  const [fixed, setFixed] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Reduced motion: the fixed line, and it stays there
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFixed(true);
      return;
    }
    let timers: number[] = [];
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const run = () => {
      setFixed(false);
      timers.push(window.setTimeout(() => setFixed(true), REST));
      timers.push(window.setTimeout(run, REST + HOLD));
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

  const context = (lines: string[], first: number, side: 'above' | 'below') => (
    <div
      className={`lilt-dfp-ctx lilt-dfp-${side}`}
      style={{ '--lilt-dfp-n': lines.length } as CSSProperties}
    >
      {lines.map((code, i) => (
        <div
          className="lilt-dfp-line"
          key={i}
          data-far={(side === 'above' ? i < lines.length - 1 : i > 0) || undefined}
        >
          <span className="lilt-dfp-no">{first + i}</span>
          <span className="lilt-dfp-code">{code}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={root}
      className={['lilt-dfp', className].filter(Boolean).join(' ')}
      data-fixed={fixed || undefined}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-diff-patch" precedence="default">
        {css}
      </style>

      <div className="lilt-dfp-file" aria-hidden="true">
        {context(above, start, 'above')}
        {context(below, start + above.length + 1, 'below')}
      </div>

      <div className="lilt-dfp-stage" aria-hidden="true">
        <span className="lilt-dfp-pool lilt-dfp-pool-bad" />
        <span className="lilt-dfp-pool lilt-dfp-pool-good" />
        <div className="lilt-dfp-slab">
          <div className="lilt-dfp-face lilt-dfp-bad">
            <span className="lilt-dfp-sign">
              <svg viewBox="0 0 12 12">
                <path d="M3 6h6" />
              </svg>
            </span>
            <span className="lilt-dfp-code">{split(bad)}</span>
          </div>
          <div className="lilt-dfp-face lilt-dfp-good">
            <span className="lilt-dfp-sign">
              <svg viewBox="0 0 12 12">
                <path d="M3 6h6M6 3v6" />
              </svg>
            </span>
            <span className="lilt-dfp-code">{split(fix)}</span>
            <span className="lilt-dfp-glint" />
          </div>
        </div>
      </div>

      <span className="lilt-dfp-chip" aria-hidden="true">
        <span className="lilt-dfp-note" key={fixed ? 'fixed' : 'bad'}>
          {fixed ? (
            <svg viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="6" />
              <path d="m5.4 8.2 1.8 1.8 3.5-3.9" />
            </svg>
          ) : (
            <span className="lilt-dfp-dot" />
          )}
          {notes[fixed ? 1 : 0]}
        </span>
      </span>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-dfp {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-dfp-bad: 240 106 122;
  --lilt-dfp-good: 62 186 132;
  --lilt-dfp-ink: #1a1a18;
  --lilt-dfp-code: #6c7078;
  --lilt-dfp-ctx: #8d9199;
  --lilt-dfp-no: #b9bcc3;
  --lilt-dfp-muted: #8f9299;
  --lilt-dfp-card: 255 255 255;
  --lilt-dfp-wash: 0.1;
  --lilt-dfp-ring: 0.42;
  --lilt-dfp-lip: 0.3;
  --lilt-dfp-top: #ffffff;
  --lilt-dfp-drop: 0 calc(22 * var(--u)) calc(34 * var(--u)) calc(-18 * var(--u)) rgba(15, 20, 40, 0.26), 0 calc(3 * var(--u)) calc(8 * var(--u)) rgba(15, 20, 40, 0.06);
  --lilt-dfp-pool: 0.42;
  --lilt-dfp-glint: rgba(255, 255, 255, 0.85);
  --lilt-dfp-chip: #ffffff;
  --lilt-dfp-chip-ring: rgba(10, 10, 10, 0.07);
  --lilt-dfp-chip-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(15, 20, 40, 0.14), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-dfp-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-dfp *, .lilt-dfp *::before, .lilt-dfp *::after { box-sizing: border-box; margin: 0; }
.lilt-dfp-code {
  font-family: var(--font-mono, ui-monospace), "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace;
  font-size: calc(15.5 * var(--u));
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: pre;
}

/* ---------- The file around the change ---------- */

/* Faint lines, fading out toward the right and away from the slab */
.lilt-dfp-file {
  position: absolute;
  inset: 0;
  -webkit-mask: linear-gradient(90deg, #000 58%, transparent 88%);
  mask: linear-gradient(90deg, #000 58%, transparent 88%);
}
.lilt-dfp-ctx {
  position: absolute;
  left: calc(66 * var(--u));
  right: 0;
}
.lilt-dfp-above { top: calc((${MID - SLAB / 2 - GAP} - var(--lilt-dfp-n) * ${LINE}) * var(--u)); }
.lilt-dfp-below { top: calc(${MID + SLAB / 2 + GAP} * var(--u)); }
.lilt-dfp-line {
  display: flex;
  align-items: center;
  height: calc(${LINE} * var(--u));
  color: var(--lilt-dfp-ctx);
  opacity: 0.72;
}
.lilt-dfp-line[data-far] { opacity: 0.36; }
.lilt-dfp-no {
  flex: none;
  width: calc(56 * var(--u));
  padding-left: calc(19 * var(--u));
  font-family: var(--font-mono, ui-monospace), "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: calc(12.5 * var(--u));
  font-variant-numeric: tabular-nums;
  color: var(--lilt-dfp-no);
}

/* ---------- Slab ---------- */

.lilt-dfp-stage {
  position: absolute;
  left: calc(66 * var(--u));
  right: calc(66 * var(--u));
  top: calc(${MID - SLAB / 2} * var(--u));
  height: calc(${SLAB} * var(--u));
  perspective: calc(900 * var(--u));
}
.lilt-dfp-pool {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: calc(-15 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 50%;
  filter: blur(calc(20 * var(--u)));
  transition: opacity 900ms ease;
}
.lilt-dfp-pool-bad { background: rgb(var(--lilt-dfp-bad)); opacity: var(--lilt-dfp-pool); }
.lilt-dfp-pool-good { background: linear-gradient(90deg, rgb(var(--lilt-dfp-good)), #8fd6c0 55%, #a8b5ff); opacity: 0; }
.lilt-dfp[data-fixed] .lilt-dfp-pool-bad { opacity: 0; }
.lilt-dfp[data-fixed] .lilt-dfp-pool-good { opacity: var(--lilt-dfp-pool); transition-delay: 350ms; }

.lilt-dfp-slab {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 1100ms cubic-bezier(0.3, 1.25, 0.4, 1);
}
.lilt-dfp[data-fixed] .lilt-dfp-slab { transform: rotateX(-180deg); }
.lilt-dfp-face {
  --lilt-dfp-tone: var(--lilt-dfp-bad);
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  border-radius: calc(18 * var(--u));
  background-color: color-mix(in srgb, rgb(var(--lilt-dfp-tone)) calc(var(--lilt-dfp-wash) * 100%), rgb(var(--lilt-dfp-card)));
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) rgb(var(--lilt-dfp-tone) / var(--lilt-dfp-ring)),
    inset 0 calc(1.5 * var(--u)) 0 var(--lilt-dfp-top),
    inset 0 calc(-4 * var(--u)) 0 rgb(var(--lilt-dfp-tone) / var(--lilt-dfp-lip)),
    var(--lilt-dfp-drop);
  color: var(--lilt-dfp-code);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
.lilt-dfp-good {
  --lilt-dfp-tone: var(--lilt-dfp-good);
  transform: rotateX(180deg);
}
.lilt-dfp-face .lilt-dfp-code { font-size: calc(16.5 * var(--u)); margin-left: calc(-2 * var(--u)); }
.lilt-dfp-mark {
  color: var(--lilt-dfp-ink);
  font-weight: 600;
  border-radius: calc(5 * var(--u));
  padding: calc(3 * var(--u)) calc(4 * var(--u));
  margin: 0 calc(-4 * var(--u));
  background: rgb(var(--lilt-dfp-tone) / 0.2);
  box-shadow: inset 0 calc(-1.5 * var(--u)) 0 rgb(var(--lilt-dfp-tone) / 0.75);
}
/* Minus or plus, where the line number would be */
.lilt-dfp-sign {
  flex: none;
  display: grid;
  place-items: center;
  width: calc(26 * var(--u));
  height: calc(26 * var(--u));
  margin: 0 calc(14 * var(--u)) 0 calc(16 * var(--u));
  border-radius: 50%;
  background: rgb(var(--lilt-dfp-tone) / 0.2);
  box-shadow: inset 0 0 0 calc(1 * var(--u)) rgb(var(--lilt-dfp-tone) / 0.5);
}
.lilt-dfp-sign svg {
  width: calc(12 * var(--u));
  height: calc(12 * var(--u));
  fill: none;
  stroke: rgb(var(--lilt-dfp-tone));
  stroke-width: 1.7;
  stroke-linecap: round;
}
.lilt-dfp-glint {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 40%, var(--lilt-dfp-glint) 50%, transparent 60%);
  transform: translateX(-110%);
}
.lilt-dfp[data-fixed] .lilt-dfp-glint { animation: lilt-dfp-glint 1300ms var(--lilt-dfp-ease) 800ms both; }
@keyframes lilt-dfp-glint {
  from { transform: translateX(-110%); }
  to { transform: translateX(110%); }
}

/* ---------- Chip ---------- */

.lilt-dfp-chip {
  position: absolute;
  left: 50%;
  top: calc(306 * var(--u));
  transform: translateX(-50%);
  height: calc(32 * var(--u));
  padding: 0 calc(14 * var(--u)) 0 calc(11 * var(--u));
  display: flex;
  align-items: center;
  border-radius: 999px;
  background: var(--lilt-dfp-chip);
  box-shadow: 0 0 0 calc(1 * var(--u)) var(--lilt-dfp-chip-ring), var(--lilt-dfp-chip-shadow);
}
.lilt-dfp-note {
  display: flex;
  align-items: center;
  gap: calc(7 * var(--u));
  font-size: calc(13.5 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--lilt-dfp-ink);
  animation: lilt-dfp-swap 520ms var(--lilt-dfp-ease) both;
}
@keyframes lilt-dfp-swap {
  from { opacity: 0; transform: translateY(calc(5 * var(--u))); filter: blur(calc(2.5 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}
.lilt-dfp-note svg {
  width: calc(16 * var(--u));
  height: calc(16 * var(--u));
  fill: none;
  stroke: rgb(var(--lilt-dfp-good));
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.lilt-dfp-dot {
  width: calc(8 * var(--u));
  height: calc(8 * var(--u));
  margin: 0 calc(3 * var(--u));
  border-radius: 50%;
  background: rgb(var(--lilt-dfp-bad));
  box-shadow: 0 0 0 calc(3.5 * var(--u)) rgb(var(--lilt-dfp-bad) / 0.2);
}

@media (prefers-reduced-motion: reduce) {
  .lilt-dfp-slab, .lilt-dfp-pool { transition: none !important; }
  .lilt-dfp-glint, .lilt-dfp-note { animation: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-dfp {
  --lilt-dfp-bad: 244 124 138;
  --lilt-dfp-good: 86 204 152;
  --lilt-dfp-ink: #f4f4f2;
  --lilt-dfp-code: #b3b3ba;
  --lilt-dfp-ctx: #8a8a92;
  --lilt-dfp-no: #55555c;
  --lilt-dfp-muted: #9a9a94;
  --lilt-dfp-card: 38 38 42;
  --lilt-dfp-wash: 0.14;
  --lilt-dfp-ring: 0.45;
  --lilt-dfp-lip: 0.3;
  --lilt-dfp-top: rgba(255, 255, 255, 0.1);
  --lilt-dfp-drop: 0 calc(22 * var(--u)) calc(34 * var(--u)) calc(-18 * var(--u)) rgba(0, 0, 0, 0.7), 0 calc(3 * var(--u)) calc(8 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-dfp-pool: 0.3;
  --lilt-dfp-glint: rgba(255, 255, 255, 0.22);
  --lilt-dfp-chip: #1c1c1a;
  --lilt-dfp-chip-ring: rgba(255, 255, 255, 0.09);
  --lilt-dfp-chip-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(0, 0, 0, 0.6), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(0, 0, 0, 0.3);
}
`;
