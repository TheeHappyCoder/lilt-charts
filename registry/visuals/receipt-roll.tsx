'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/*
 * Receipt Roll – a receipt printing itself, in a single self-contained file.
 * A machined bar with a dark slot sits near the top of the frame. A paper receipt feeds down out of
 * the slot in small mechanical steps: a few quiet rows, a dashed divider, a bold total and a torn
 * zigzag edge. Once it is out it hangs for a moment, drops away, and the next one starts printing.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type ReceiptRow = { label: string; amount: string };

export type ReceiptRollProps = {
  /** Name printed at the top of the receipt */
  merchant?: string;
  /** Number of the first receipt – every new one counts up */
  number?: number;
  /** Line items, top to bottom – three to five read best */
  rows?: ReceiptRow[];
  /** Label and amount of the bold last line */
  totalLabel?: string;
  total?: string;
  /** Small muted note at the very bottom */
  note?: string;
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

const defaultRows: ReceiptRow[] = [
  { label: 'Pro plan', amount: '$49.00' },
  { label: 'Extra seats × 3', amount: '$27.00' },
  { label: 'API usage', amount: '$6.40' },
  { label: 'Tax', amount: '$1.60' },
];

/* Paper geometry on the 600 × 400 grid */
const WIDTH = 224;
const PAD_TOP = 29; // includes the part still inside the slot
const HEAD = 22;
const GAP = 12;
const ROW = 26;
const RULE = 21;
const TOTAL = 27;
const NOTE = 27;
const PAD_BOTTOM = 10;
const TEETH = 5; // height of the torn edge
const FEED = 26; // paper fed per step

/* Choreography, in ms */
const STEP = 310; // one feed
const HOLD = 2800; // finished receipt hangs
const DROP = 760; // it falls away
const REST = 420; // empty slot before the next one

/** The torn edge: a row of small teeth across the paper's width */
const teeth = (() => {
  const n = 32;
  const w = WIDTH / n;
  let d = 'M0 0';
  for (let i = 0; i < n; i++)
    d += `L${+(i * w + w / 2).toFixed(2)} ${TEETH}L${+((i + 1) * w).toFixed(2)} 0`;
  return d + 'Z';
})();

/** A paper receipt feeding line by line out of a machined slot with a torn edge. */
export function ReceiptRoll({
  merchant = 'Lilt',
  number = 1042,
  rows: given = defaultRows,
  totalLabel = 'Total',
  total = '$84.00',
  note = 'Paid · Visa 4242',
  className,
  label = 'A paper receipt prints out of a slot line by line, hangs for a moment and drops away',
}: ReceiptRollProps) {
  const rows = given.length ? given : defaultRows;
  const root = useRef<HTMLDivElement>(null);
  const height =
    PAD_TOP +
    HEAD +
    GAP +
    rows.length * ROW +
    RULE +
    TOTAL +
    (note ? NOTE : 6) +
    PAD_BOTTOM +
    TEETH;
  const steps = Math.ceil(height / FEED);
  const [step, setStep] = useState(0);
  const [nth, setNth] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Reduced motion: one finished receipt, and it stays
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(steps);
      return;
    }
    let timers: number[] = [];
    let k = 0;
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const run = () => {
      // A fresh sheet: remounted by its key, so it starts inside the slot without sliding back up
      setNth(k++);
      setOut(false);
      setStep(0);
      for (let i = 1; i <= steps; i++) later(() => setStep(i), REST + i * STEP);
      const done = REST + steps * STEP;
      later(() => setOut(true), done + HOLD);
      later(run, done + HOLD + DROP);
    };
    // Plays only while on screen, and starts from an empty slot when it comes back
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
  }, [steps]);

  const fed = Math.min(height, step * FEED);
  const printing = step > 0 && step < steps;

  return (
    <div
      ref={root}
      className={['lilt-rcr', className].filter(Boolean).join(' ')}
      data-printing={printing || undefined}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-receipt-roll" precedence="default">
        {css}
      </style>

      <div className="lilt-rcr-scene" aria-hidden="true">
        <span className="lilt-rcr-pool" />

        {/* The printer: a machined bar with a dark slot */}
        <div className="lilt-rcr-bar">
          <span className="lilt-rcr-slot" />
          <span className="lilt-rcr-led" />
        </div>

        {/* Everything below the slot's centre line: the paper is clipped where it leaves the slot */}
        <div className="lilt-rcr-window">
          <div className="lilt-rcr-drop" data-out={out || undefined}>
            <div
              key={nth}
              className="lilt-rcr-feed"
              style={{ '--lilt-rcr-h': height, '--lilt-rcr-fed': fed } as CSSProperties}
            >
              <div className="lilt-rcr-paper">
                <div className="lilt-rcr-head">
                  <span className="lilt-rcr-mark" />
                  <span className="lilt-rcr-merchant">{merchant}</span>
                  <span className="lilt-rcr-no">#{number + nth}</span>
                </div>
                {rows.map((r, i) => (
                  <div className="lilt-rcr-row" key={i}>
                    <span className="lilt-rcr-label">{r.label}</span>
                    <span>{r.amount}</span>
                  </div>
                ))}
                <span className="lilt-rcr-rule" />
                <div className="lilt-rcr-total">
                  <span>{totalLabel}</span>
                  <span>{total}</span>
                </div>
                {note && <div className="lilt-rcr-note">{note}</div>}
              </div>
              <svg
                className="lilt-rcr-teeth"
                viewBox={`0 0 ${WIDTH} ${TEETH}`}
                preserveAspectRatio="none"
              >
                <path d={teeth} />
              </svg>
            </div>
          </div>
          {/* The slot's own shadow on the paper – stays put while the paper moves under it */}
          <span className="lilt-rcr-lipshade" data-on={(step > 0 && !out) || undefined} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-rcr {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-rcr-bar-a: #ffffff;
  --lilt-rcr-bar-b: #eef0f3;
  --lilt-rcr-ring: rgba(10, 10, 10, 0.08);
  --lilt-rcr-sliver: #dfe2e7;
  --lilt-rcr-bar-light: rgba(255, 255, 255, 1);
  --lilt-rcr-bar-shadow: 0 calc(14 * var(--u)) calc(26 * var(--u)) calc(-12 * var(--u)) rgba(15, 20, 40, 0.2), 0 calc(2 * var(--u)) calc(5 * var(--u)) rgba(15, 20, 40, 0.06);
  --lilt-rcr-slot-a: #14151a;
  --lilt-rcr-slot-b: #3a3c45;
  --lilt-rcr-slot-lip: rgba(255, 255, 255, 0.95);
  --lilt-rcr-paper: #ffffff;
  --lilt-rcr-paper-edge: rgba(15, 20, 40, 0.1);
  --lilt-rcr-paper-shadow: rgba(15, 20, 40, 0.16);
  --lilt-rcr-curl: rgba(15, 20, 40, 0.045);
  --lilt-rcr-lipshade: rgba(15, 20, 40, 0.16);
  --lilt-rcr-ink: #1a1a18;
  --lilt-rcr-text: #5d6068;
  --lilt-rcr-muted: #8c8c87;
  --lilt-rcr-rule: #cfd2d8;
  --lilt-rcr-led: #c9ccd3;
  --lilt-rcr-pool: 0.42;
  --lilt-rcr-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-rcr *, .lilt-rcr *::before, .lilt-rcr *::after { box-sizing: border-box; margin: 0; }
.lilt-rcr-scene { position: absolute; inset: 0; }

/* ---------- Printer ---------- */

/* Pastel light spilling out under the bar */
.lilt-rcr-pool {
  position: absolute;
  left: calc(140 * var(--u));
  top: calc(72 * var(--u));
  width: calc(320 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 50%;
  background: linear-gradient(90deg, #ffa0ab, #ffb89e 33%, #c8a8e5 66%, #a8b5ff);
  filter: blur(calc(22 * var(--u)));
  opacity: var(--lilt-rcr-pool);
  transition: opacity 900ms ease;
}
.lilt-rcr[data-printing] .lilt-rcr-pool { opacity: calc(var(--lilt-rcr-pool) * 1.7); transition-duration: 400ms; }

.lilt-rcr-bar {
  position: absolute;
  left: calc(144 * var(--u));
  top: calc(38 * var(--u));
  width: calc(312 * var(--u));
  height: calc(44 * var(--u));
  border-radius: calc(16 * var(--u));
  background: linear-gradient(180deg, var(--lilt-rcr-bar-a), var(--lilt-rcr-bar-b));
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-rcr-ring),
    inset 0 calc(1.5 * var(--u)) 0 var(--lilt-rcr-bar-light),
    inset 0 calc(-3 * var(--u)) 0 var(--lilt-rcr-sliver),
    var(--lilt-rcr-bar-shadow);
}
.lilt-rcr-slot {
  position: absolute;
  left: calc(32 * var(--u));
  right: calc(32 * var(--u));
  top: calc(17 * var(--u));
  height: calc(8 * var(--u));
  border-radius: 999px;
  background: linear-gradient(180deg, var(--lilt-rcr-slot-a), var(--lilt-rcr-slot-b));
  box-shadow:
    inset 0 calc(1.5 * var(--u)) calc(2 * var(--u)) rgba(0, 0, 0, 0.5),
    0 calc(1 * var(--u)) 0 var(--lilt-rcr-slot-lip);
}
.lilt-rcr-led {
  position: absolute;
  right: calc(14 * var(--u));
  top: calc(19 * var(--u));
  width: calc(4 * var(--u));
  height: calc(4 * var(--u));
  border-radius: 50%;
  background: var(--lilt-rcr-led);
  transition: background 500ms ease, box-shadow 500ms ease;
}
.lilt-rcr[data-printing] .lilt-rcr-led {
  background: #9aa8ff;
  box-shadow: 0 0 0 calc(2.5 * var(--u)) rgb(154 168 255 / 0.22), 0 0 calc(7 * var(--u)) rgb(154 168 255 / 0.9);
  transition-duration: 200ms;
}

/* ---------- Paper ---------- */

.lilt-rcr-window {
  position: absolute;
  left: calc(120 * var(--u));
  right: calc(120 * var(--u));
  top: calc(59 * var(--u));
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}
.lilt-rcr-drop {
  position: absolute;
  left: calc(${(360 - WIDTH) / 2} * var(--u));
  top: 0;
  width: calc(${WIDTH} * var(--u));
  transform-origin: 50% 0;
}
.lilt-rcr-drop[data-out] {
  transform: translateY(calc(70 * var(--u))) rotate(-3deg);
  opacity: 0;
  transition: transform ${DROP}ms cubic-bezier(0.5, 0, 0.9, 0.5), opacity ${DROP - 160}ms ease 160ms;
}
/* Fed out of the slot in steps: each one a quick push that settles */
.lilt-rcr-feed {
  transform: translateY(calc((var(--lilt-rcr-fed) - var(--lilt-rcr-h)) * var(--u)));
  transition: transform 230ms cubic-bezier(0.3, 0.1, 0.2, 1);
  filter:
    drop-shadow(0 0 calc(0.6 * var(--u)) var(--lilt-rcr-paper-edge))
    drop-shadow(0 calc(1 * var(--u)) calc(1.5 * var(--u)) var(--lilt-rcr-paper-edge))
    drop-shadow(0 calc(14 * var(--u)) calc(14 * var(--u)) var(--lilt-rcr-paper-shadow));
}
.lilt-rcr-paper {
  position: relative;
  padding: calc(${PAD_TOP} * var(--u)) calc(20 * var(--u)) calc(${PAD_BOTTOM} * var(--u));
  /* A faint roundness left over from the roll */
  background:
    linear-gradient(90deg, var(--lilt-rcr-curl), transparent 14%, transparent 86%, var(--lilt-rcr-curl)),
    var(--lilt-rcr-paper);
  font-size: calc(13.5 * var(--u));
  line-height: 1;
  letter-spacing: -0.005em;
  white-space: nowrap;
  color: var(--lilt-rcr-text);
  font-variant-numeric: tabular-nums;
}
.lilt-rcr-teeth {
  display: block;
  width: 100%;
  height: calc(${TEETH} * var(--u));
  margin-top: calc(-0.3 * var(--u));
  fill: var(--lilt-rcr-paper);
}
.lilt-rcr-lipshade {
  position: absolute;
  left: calc(${(360 - WIDTH) / 2} * var(--u));
  top: 0;
  width: calc(${WIDTH} * var(--u));
  height: calc(14 * var(--u));
  background: linear-gradient(180deg, var(--lilt-rcr-lipshade), transparent);
  opacity: 0;
  transition: opacity 300ms ease;
}
.lilt-rcr-lipshade[data-on] { opacity: 1; }

.lilt-rcr-head {
  display: flex;
  align-items: center;
  gap: calc(7 * var(--u));
  height: calc(${HEAD} * var(--u));
  margin-bottom: calc(${GAP} * var(--u));
}
.lilt-rcr-mark {
  flex: none;
  width: calc(15 * var(--u));
  height: calc(15 * var(--u));
  border-radius: calc(5 * var(--u));
  background: var(--lilt-rcr-ink);
  box-shadow: inset 0 0 0 calc(4.2 * var(--u)) var(--lilt-rcr-ink), inset 0 0 0 calc(6 * var(--u)) var(--lilt-rcr-paper);
}
.lilt-rcr-merchant {
  font-size: calc(14.5 * var(--u));
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--lilt-rcr-ink);
}
.lilt-rcr-no { margin-left: auto; font-size: calc(12 * var(--u)); color: var(--lilt-rcr-muted); }
.lilt-rcr-row, .lilt-rcr-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12 * var(--u));
  height: calc(${ROW} * var(--u));
}
.lilt-rcr-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
.lilt-rcr-rule {
  display: block;
  height: calc(${RULE} * var(--u));
  background: repeating-linear-gradient(90deg, var(--lilt-rcr-rule) 0 calc(3.5 * var(--u)), transparent 0 calc(7 * var(--u))) center / 100% calc(1 * var(--u)) no-repeat;
}
.lilt-rcr-total {
  height: calc(${TOTAL} * var(--u));
  font-size: calc(16.5 * var(--u));
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--lilt-rcr-ink);
}
.lilt-rcr-note {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: calc(${NOTE} * var(--u));
  font-size: calc(11.5 * var(--u));
  color: var(--lilt-rcr-muted);
}

@media (prefers-reduced-motion: reduce) {
  .lilt-rcr-feed, .lilt-rcr-drop, .lilt-rcr-pool, .lilt-rcr-led, .lilt-rcr-lipshade { transition: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-rcr {
  --lilt-rcr-bar-a: #303034;
  --lilt-rcr-bar-b: #1c1c1a;
  --lilt-rcr-ring: rgba(255, 255, 255, 0.09);
  --lilt-rcr-sliver: #19191b;
  --lilt-rcr-bar-light: rgba(255, 255, 255, 0.1);
  --lilt-rcr-bar-shadow: 0 calc(14 * var(--u)) calc(26 * var(--u)) calc(-12 * var(--u)) rgba(0, 0, 0, 0.7), 0 calc(2 * var(--u)) calc(5 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-rcr-slot-a: #060607;
  --lilt-rcr-slot-b: #17171a;
  --lilt-rcr-slot-lip: rgba(255, 255, 255, 0.1);
  --lilt-rcr-paper: #2c2c30;
  --lilt-rcr-paper-edge: rgba(255, 255, 255, 0.1);
  --lilt-rcr-paper-shadow: rgba(0, 0, 0, 0.55);
  --lilt-rcr-curl: rgba(0, 0, 0, 0.16);
  --lilt-rcr-lipshade: rgba(0, 0, 0, 0.45);
  --lilt-rcr-ink: #f4f4f2;
  --lilt-rcr-text: #adadb3;
  --lilt-rcr-muted: #9a9a94;
  --lilt-rcr-rule: #4a4a50;
  --lilt-rcr-led: #45454b;
  --lilt-rcr-pool: 0.26;
}
`;
