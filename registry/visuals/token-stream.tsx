'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/*
 * Token Stream – a reply arriving one token at a time, in a single self-contained file.
 * A machined display bar with a recessed well. Tokens arrive inside it as small glass tiles: each one
 * pops in next to a glowing caret, tinted with color, pushes the others to the left and cools down to
 * plain white as it travels. The oldest tiles fade out at the left end. A count underneath keeps up.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type TokenStreamProps = {
  /** The stream, already split into tokens. It loops */
  tokens?: string[];
  /** Small label above the count */
  caption?: string;
  /** Word after the count */
  unit?: string;
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

const defaultTokens = [
  'Your',
  'trial',
  'ends',
  'Fri',
  'day',
  ',',
  'so',
  'I',
  'moved',
  'the',
  'team',
  'to',
  'the',
  'ann',
  'ual',
  'plan',
  'and',
  'kept',
  'all',
  'twelve',
  'seats',
  '.',
];

const TONES = ['255 164 128', '178 146 236', '134 154 255']; // peach, violet, blue
const KEEP = 11; // tiles kept in the well

/** Tokens arriving one by one as warm glass tiles that cool as they travel across a machined bar. */
export function TokenStream({
  tokens: given = defaultTokens,
  caption = 'Streaming',
  unit = 'tokens',
  className,
  label = 'A display bar in which tokens arrive one by one as small glass tiles next to a glowing caret',
}: TokenStreamProps) {
  const tokens = given.length ? given : defaultTokens;
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Reduced motion: a well that is already full, nothing moves
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      setCount(KEEP);
      return;
    }
    let timer = 0;
    let n = 0;
    const tick = () => {
      n += 1;
      setCount(n);
      // An uneven rhythm, with a breath after punctuation
      const last = tokens[(n - 1) % tokens.length];
      const wait = /[.,!?]$/.test(last) ? 620 : 170 + ((n * 97) % 5) * 55;
      timer = window.setTimeout(tick, wait);
    };
    // Plays only while on screen
    const io = new IntersectionObserver(
      ([e]) => {
        window.clearTimeout(timer);
        if (e.isIntersecting) timer = window.setTimeout(tick, 500);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [tokens]);

  const first = Math.max(0, count - KEEP);
  const shown = Array.from({ length: count - first }, (_, k) => first + k);

  return (
    <div
      ref={root}
      className={['lilt-tks', className].filter(Boolean).join(' ')}
      data-still={still || undefined}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-token-stream" precedence="default">
        {css}
      </style>

      <div className="lilt-tks-bar" aria-hidden="true">
        <span className="lilt-tks-pool" />
        <span className="lilt-tks-bezel" />
        <div className="lilt-tks-well">
          <div className="lilt-tks-view">
            <div className="lilt-tks-row">
              {shown.map((i) => (
                <span
                  className="lilt-tks-cell"
                  key={i}
                  style={
                    { '--lilt-tks-tone': TONES[Math.floor(i / 2) % TONES.length] } as CSSProperties
                  }
                >
                  <span className="lilt-tks-tile">{tokens[i % tokens.length]}</span>
                </span>
              ))}
            </div>
          </div>
          <span className="lilt-tks-caret" />
        </div>
      </div>

      <div className="lilt-tks-read" aria-hidden="true">
        <span className="lilt-tks-caption">{caption}</span>
        <span className="lilt-tks-count">
          <span className="lilt-tks-num">{count}</span>
          <span className="lilt-tks-unit">{unit}</span>
        </span>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-tks {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-tks-ink: #1a1a18;
  --lilt-tks-muted: #8c8c87;
  --lilt-tks-bezel-a: #ffffff;
  --lilt-tks-bezel-b: #eceef2;
  --lilt-tks-bezel-ring: rgba(10, 10, 10, 0.07);
  --lilt-tks-bezel-top: #ffffff;
  --lilt-tks-bezel-lip: #dfe2e8;
  --lilt-tks-bezel-drop: 0 calc(24 * var(--u)) calc(38 * var(--u)) calc(-20 * var(--u)) rgba(15, 20, 40, 0.26), 0 calc(3 * var(--u)) calc(8 * var(--u)) rgba(15, 20, 40, 0.06);
  --lilt-tks-well-a: #e4e6eb;
  --lilt-tks-well-b: #f1f2f5;
  --lilt-tks-well-in: inset 0 calc(2.5 * var(--u)) calc(6 * var(--u)) rgba(15, 20, 40, 0.14), inset 0 0 0 calc(1 * var(--u)) rgba(10, 10, 10, 0.05);
  --lilt-tks-well-out: 0 calc(1 * var(--u)) 0 #ffffff;
  --lilt-tks-tile: 255 255 255;
  --lilt-tks-tile-ring: rgba(10, 10, 10, 0.07);
  --lilt-tks-tile-lip: #e8eaee;
  --lilt-tks-tile-drop: 0 calc(3 * var(--u)) calc(6 * var(--u)) calc(-2 * var(--u)) rgba(15, 20, 40, 0.16);
  --lilt-tks-warm: 0.3;
  --lilt-tks-pool: 0.5;
  --lilt-tks-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lilt-tks-pop: cubic-bezier(0.34, 1.5, 0.64, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-tks *, .lilt-tks *::before, .lilt-tks *::after { box-sizing: border-box; margin: 0; }

/* ---------- Bar ---------- */

.lilt-tks-bar {
  position: absolute;
  left: calc(72 * var(--u));
  right: calc(72 * var(--u));
  top: calc(112 * var(--u));
  height: calc(96 * var(--u));
}
/* Pastel light pooling under the bar */
.lilt-tks-pool {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: calc(-16 * var(--u));
  height: calc(44 * var(--u));
  border-radius: 50%;
  background: linear-gradient(90deg, #a8b5ff, #c8a8e5 40%, #ffb89e 72%, #ffa0ab);
  filter: blur(calc(22 * var(--u)));
  opacity: var(--lilt-tks-pool);
}
.lilt-tks-bezel {
  position: absolute;
  inset: 0;
  border-radius: calc(30 * var(--u));
  background: linear-gradient(180deg, var(--lilt-tks-bezel-a), var(--lilt-tks-bezel-b));
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-tks-bezel-ring),
    inset 0 calc(1.5 * var(--u)) 0 var(--lilt-tks-bezel-top),
    inset 0 calc(-3 * var(--u)) 0 var(--lilt-tks-bezel-lip),
    var(--lilt-tks-bezel-drop);
}
.lilt-tks-well {
  position: absolute;
  inset: calc(11 * var(--u)) calc(11 * var(--u)) calc(13 * var(--u));
  overflow: hidden;
  border-radius: calc(20 * var(--u));
  background: linear-gradient(180deg, var(--lilt-tks-well-a), var(--lilt-tks-well-b));
  box-shadow: var(--lilt-tks-well-in), var(--lilt-tks-well-out);
}
/* Anchored at the caret: every new tile pushes the row to the left. Old tiles fade at the far end */
.lilt-tks-view {
  position: absolute;
  inset: 0;
  -webkit-mask: linear-gradient(90deg, transparent calc(6 * var(--u)), #000 calc(120 * var(--u)));
  mask: linear-gradient(90deg, transparent calc(6 * var(--u)), #000 calc(120 * var(--u)));
}
.lilt-tks-row {
  position: absolute;
  right: calc(46 * var(--u));
  top: 0;
  bottom: 0;
  width: max-content;
  display: flex;
  align-items: center;
}

/* ---------- Tiles ---------- */

/* A cell opens from nothing to the width of its tile, which is what moves the row */
.lilt-tks-cell {
  flex: none;
  display: grid;
  grid-template-columns: 1fr;
  animation: lilt-tks-open 420ms var(--lilt-tks-ease) both;
}
@keyframes lilt-tks-open {
  from { grid-template-columns: 0fr; }
  to { grid-template-columns: 1fr; }
}
.lilt-tks-tile {
  min-width: 0;
  height: calc(44 * var(--u));
  margin: calc(8 * var(--u)) 0 calc(8 * var(--u)) calc(7 * var(--u));
  padding: 0 calc(13 * var(--u));
  display: flex;
  align-items: center;
  border-radius: calc(13 * var(--u));
  background-color: rgb(var(--lilt-tks-tile));
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) var(--lilt-tks-tile-ring),
    inset 0 calc(-2 * var(--u)) 0 var(--lilt-tks-tile-lip),
    var(--lilt-tks-tile-drop);
  font-size: calc(18 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.015em;
  white-space: nowrap;
  color: var(--lilt-tks-ink);
  animation: lilt-tks-pop 520ms var(--lilt-tks-pop) both, lilt-tks-cool 2200ms ease-out both;
}
@keyframes lilt-tks-pop {
  from { opacity: 0; transform: scale(0.72); filter: blur(calc(3 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}
/* Fresh tiles carry color, then cool to plain */
@keyframes lilt-tks-cool {
  0%, 18% {
    background-color: color-mix(in srgb, rgb(var(--lilt-tks-tone)) calc(var(--lilt-tks-warm) * 100%), rgb(var(--lilt-tks-tile)));
    box-shadow:
      inset 0 0 0 calc(1 * var(--u)) rgb(var(--lilt-tks-tone) / 0.7),
      inset 0 calc(-2 * var(--u)) 0 rgb(var(--lilt-tks-tone) / 0.35),
      0 calc(3 * var(--u)) calc(10 * var(--u)) calc(-1 * var(--u)) rgb(var(--lilt-tks-tone) / 0.6);
  }
}

/* ---------- Caret ---------- */

.lilt-tks-caret {
  position: absolute;
  right: calc(26 * var(--u));
  top: 50%;
  width: calc(3 * var(--u));
  height: calc(34 * var(--u));
  margin-top: calc(-17 * var(--u));
  border-radius: 999px;
  background: linear-gradient(180deg, #ffb089, #b99be8 50%, #8fa0ff);
  box-shadow: 0 0 calc(10 * var(--u)) calc(1 * var(--u)) rgb(178 146 236 / 0.6), 0 0 calc(24 * var(--u)) calc(4 * var(--u)) rgb(134 154 255 / 0.3);
  animation: lilt-tks-blink 1100ms ease-in-out infinite;
}
@keyframes lilt-tks-blink {
  0%, 55% { opacity: 1; }
  78% { opacity: 0.35; }
  100% { opacity: 1; }
}

/* ---------- Readout ---------- */

.lilt-tks-read {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(246 * var(--u));
  display: grid;
  justify-items: center;
  gap: calc(7 * var(--u));
}
.lilt-tks-caption {
  font-size: calc(14 * var(--u));
  line-height: 1;
  color: var(--lilt-tks-muted);
}
.lilt-tks-count {
  display: flex;
  align-items: baseline;
  gap: calc(7 * var(--u));
  line-height: 1;
}
.lilt-tks-num {
  font-size: calc(27 * var(--u));
  font-weight: 500;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--lilt-tks-ink);
}
.lilt-tks-unit {
  font-size: calc(15 * var(--u));
  color: var(--lilt-tks-muted);
}

.lilt-tks[data-still] .lilt-tks-cell,
.lilt-tks[data-still] .lilt-tks-tile,
.lilt-tks[data-still] .lilt-tks-caret { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .lilt-tks-cell, .lilt-tks-tile, .lilt-tks-caret { animation: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-tks {
  --lilt-tks-ink: #f4f4f2;
  --lilt-tks-muted: #9a9a94;
  --lilt-tks-bezel-a: #37373c;
  --lilt-tks-bezel-b: #27272b;
  --lilt-tks-bezel-ring: rgba(0, 0, 0, 0.5);
  --lilt-tks-bezel-top: rgba(255, 255, 255, 0.14);
  --lilt-tks-bezel-lip: #1c1c1f;
  --lilt-tks-bezel-drop: 0 calc(24 * var(--u)) calc(38 * var(--u)) calc(-20 * var(--u)) rgba(0, 0, 0, 0.75), 0 calc(3 * var(--u)) calc(8 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-tks-well-a: #121214;
  --lilt-tks-well-b: #19191c;
  --lilt-tks-well-in: inset 0 calc(2.5 * var(--u)) calc(6 * var(--u)) rgba(0, 0, 0, 0.7), inset 0 0 0 calc(1 * var(--u)) rgba(0, 0, 0, 0.5);
  --lilt-tks-well-out: 0 calc(1 * var(--u)) 0 rgba(255, 255, 255, 0.08);
  --lilt-tks-tile: 46 46 51;
  --lilt-tks-tile-ring: rgba(255, 255, 255, 0.09);
  --lilt-tks-tile-lip: #232327;
  --lilt-tks-tile-drop: 0 calc(3 * var(--u)) calc(6 * var(--u)) calc(-2 * var(--u)) rgba(0, 0, 0, 0.6);
  --lilt-tks-warm: 0.36;
  --lilt-tks-pool: 0.3;
}
`;
