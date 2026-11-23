'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

/*
 * Passkey Scan – a fingerprint read by light, in a single self-contained file.
 * A glass tile holds a fingerprint. A fine line of light rises through it and the ridges fill
 * with color from the bottom up. When it reaches the top the ridges settle, a check badge pops
 * onto the tile's corner and the chip underneath confirms. After a pause it starts over.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type PasskeyScanProps = {
  /** Chip text while the scan runs */
  scanning?: string;
  /** Chip text once it has passed */
  verified?: string;
  /** Show the chip under the tile */
  chip?: boolean;
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

/* Choreography, in ms */
const REST = 900; // plain fingerprint
const SCAN = 2000; // the light rises
const HOLD = 3000; // verified
const FADE = 700; // color drains away

/* The ridges, on a 100 × 100 grid: arches around a core, legs of uneven length, a few breaks */
const RIDGES = [
  'M10 63V50A40 40 0 0 1 79.500 23',
  'M86.500 33.500A40 40 0 0 1 90 50V59',
  'M18 75V50A32 32 0 0 1 82 50V55',
  'M82 64V73',
  'M26 83V50A24 24 0 0 1 74 50V71Q74 79 71.500 85',
  'M34 88V50A16 16 0 0 1 66 50V61',
  'M66 70Q66 82 62.500 90',
  'M42 90V50A8 8 0 0 1 58 50V75Q58 85 54.500 92',
  'M50 51V79Q50 87 47.500 93',
];

/** A fingerprint on glass that fills with rising light and confirms with a check. */
export function PasskeyScan({
  scanning = 'Verifying…',
  verified = 'Passkey verified',
  chip = true,
  className,
  label = 'A fingerprint on a glass tile fills with light from the bottom up and is confirmed with a check',
}: PasskeyScanProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const root = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'rest' | 'scan' | 'done' | 'fade'>('rest');

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Reduced motion: verified, and it stays that way
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('done');
      return;
    }
    let timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const run = () => {
      setPhase('rest');
      later(() => setPhase('scan'), REST);
      later(() => setPhase('done'), REST + SCAN);
      later(() => setPhase('fade'), REST + SCAN + HOLD);
      later(run, REST + SCAN + HOLD + FADE);
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

  const done = phase === 'done';
  const grad = `lilt-pks-${uid}-light`;

  return (
    <div
      ref={root}
      className={['lilt-pks', className].filter(Boolean).join(' ')}
      data-phase={phase}
      style={{ '--lilt-pks-scan': `${SCAN}ms`, '--lilt-pks-fade': `${FADE}ms` } as CSSProperties}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-passkey-scan" precedence="default">
        {css}
      </style>

      <div className="lilt-pks-stack" aria-hidden="true">
        <div className="lilt-pks-tile">
          <span className="lilt-pks-pool" />
          <div className="lilt-pks-face">
            <span className="lilt-pks-wash" />
            <svg className="lilt-pks-print" viewBox="0 0 100 100">
              {RIDGES.map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
            {/* The same ridges in color, uncovered from the bottom as the light rises */}
            <div className="lilt-pks-lit">
              <svg className="lilt-pks-print" viewBox="0 0 100 100">
                <defs>
                  <linearGradient
                    id={grad}
                    x1="20"
                    y1="94"
                    x2="80"
                    y2="10"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#8a9cff" />
                    <stop offset="0.38" stopColor="#b596ee" />
                    <stop offset="0.72" stopColor="#ffa98a" />
                    <stop offset="1" stopColor="#ff94a4" />
                  </linearGradient>
                </defs>
                <g stroke={`url(#${grad})`}>
                  {RIDGES.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </g>
              </svg>
            </div>
            <span className="lilt-pks-beam" />
          </div>
          <span className="lilt-pks-lip" />
          <span className="lilt-pks-badge">
            <svg viewBox="0 0 16 16">
              <path d="m4.300 8.400 2.500 2.500 5-5.500" />
            </svg>
          </span>
        </div>

        {chip && (
          <span className="lilt-pks-chip">
            <span className="lilt-pks-dot" />
            <span className="lilt-pks-word" key={done ? 'done' : 'busy'}>
              {done ? verified : scanning}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-pks {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-pks-card: #ffffff;
  --lilt-pks-ring: rgba(10, 10, 10, 0.06);
  --lilt-pks-sliver: #eceef1;
  --lilt-pks-shadow: 0 calc(22 * var(--u)) calc(38 * var(--u)) calc(-16 * var(--u)) rgba(15, 20, 40, 0.16), 0 calc(3 * var(--u)) calc(8 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-pks-ridge: #d9dce3;
  --lilt-pks-ink: #1a1a18;
  --lilt-pks-on-ink: #ffffff;
  --lilt-pks-muted: #8c8c87;
  --lilt-pks-pool: 0.5;
  --lilt-pks-wash: 0.5;
  --lilt-pks-beam-a: 0.2;
  --lilt-pks-glow: 0.5;
  --lilt-pks-chip-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(15, 20, 40, 0.14), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-pks-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lilt-pks-pop: cubic-bezier(0.34, 1.500, 0.64, 1);
  /* The scan runs a touch slower at both ends, like a sensor settling */
  --lilt-pks-sweep: cubic-bezier(0.4, 0.1, 0.5, 0.95);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-pks *, .lilt-pks *::before, .lilt-pks *::after { box-sizing: border-box; margin: 0; }

.lilt-pks-stack {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: calc(30 * var(--u));
}

/* ---------- Tile ---------- */

.lilt-pks-tile {
  position: relative;
  width: calc(176 * var(--u));
  height: calc(176 * var(--u));
}
/* Pastel light pooling under the tile, stronger once it has passed */
.lilt-pks-pool {
  position: absolute;
  left: 6%;
  right: 6%;
  bottom: calc(-14 * var(--u));
  height: calc(44 * var(--u));
  border-radius: 50%;
  background: linear-gradient(90deg, #a3b1ff, #c8a8e8 36%, #ffb99f 68%, #ffa3ae);
  filter: blur(calc(20 * var(--u)));
  opacity: calc(var(--lilt-pks-pool) * 0.6);
  transition: opacity 900ms ease;
}
.lilt-pks[data-phase="done"] .lilt-pks-pool { opacity: var(--lilt-pks-pool); }
.lilt-pks-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: calc(46 * var(--u));
  background: var(--lilt-pks-card);
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-pks-ring),
    inset 0 calc(-4 * var(--u)) 0 var(--lilt-pks-sliver),
    var(--lilt-pks-shadow);
}
/* A breath of color inside the tile once it has passed */
.lilt-pks-wash {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(70% 60% at 50% 112%, rgb(150 166 255 / 0.3), transparent 70%),
    radial-gradient(60% 50% at 50% -14%, rgb(255 170 150 / 0.22), transparent 70%);
  opacity: 0;
  transition: opacity var(--lilt-pks-fade) ease;
}
.lilt-pks[data-phase="done"] .lilt-pks-wash { opacity: var(--lilt-pks-wash); transition: opacity 900ms ease; }
/* A hairline of color along the bottom edge, gray again where it turns up the sides */
.lilt-pks-lip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(50 * var(--u));
  padding: 0 calc(1 * var(--u)) calc(1 * var(--u));
  border-radius: 0 0 calc(46 * var(--u)) calc(46 * var(--u));
  background: linear-gradient(90deg, transparent 8%, #b5c0ff 28%, #d5bbef 46%, #ffc5ab 64%, #ffb5bc 80%, transparent 92%);
  -webkit-mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  pointer-events: none;
}

/* ---------- Fingerprint ---------- */

.lilt-pks-print {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(116 * var(--u));
  height: calc(116 * var(--u));
  margin: calc(-61 * var(--u)) 0 0 calc(-58 * var(--u));
  overflow: visible;
  fill: none;
  stroke: var(--lilt-pks-ridge);
  stroke-width: 4;
  stroke-linecap: round;
}
.lilt-pks-lit {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 0 calc(5 * var(--u)) rgb(160 150 255 / var(--lilt-pks-glow)));
  clip-path: inset(100% 0 0 0);
  opacity: 1;
}
.lilt-pks[data-phase="scan"] .lilt-pks-lit { animation: lilt-pks-fill var(--lilt-pks-scan) var(--lilt-pks-sweep) both; }
.lilt-pks[data-phase="done"] .lilt-pks-lit { clip-path: inset(0); }
.lilt-pks[data-phase="fade"] .lilt-pks-lit { clip-path: inset(0); opacity: 0; transition: opacity var(--lilt-pks-fade) ease; }
/* The print sits between 20% and 82% of the tile's height – the color follows the line exactly */
@keyframes lilt-pks-fill {
  from { clip-path: inset(100% 0 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

/* The light: a hairline with a short trail beneath it, as tall as the tile and moved by its height */
.lilt-pks-beam {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: calc(46 * var(--u));
  background: linear-gradient(180deg, rgb(181 150 238 / var(--lilt-pks-beam-a)), rgb(138 156 255 / calc(var(--lilt-pks-beam-a) * 0.4)) 45%, transparent);
  transform: translateY(calc(176 * var(--u)));
  opacity: 0;
  pointer-events: none;
}
.lilt-pks-beam::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: calc(1.500 * var(--u));
  background: linear-gradient(90deg, transparent, #a3b1ff 16%, #c8a8e8 40%, #ffb89e 64%, #ff9aa6 86%, transparent);
}
.lilt-pks[data-phase="scan"] .lilt-pks-beam { animation: lilt-pks-rise var(--lilt-pks-scan) var(--lilt-pks-sweep) both; }
@keyframes lilt-pks-rise {
  0% { transform: translateY(calc(176 * var(--u))); opacity: 0; }
  8% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(0); opacity: 0; }
}

/* ---------- Check badge ---------- */

.lilt-pks-badge {
  position: absolute;
  right: calc(-9 * var(--u));
  top: calc(-9 * var(--u));
  display: grid;
  place-items: center;
  width: calc(40 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 50%;
  background: var(--lilt-pks-ink);
  box-shadow:
    0 0 0 calc(3.500 * var(--u)) var(--lilt-pks-card),
    0 calc(8 * var(--u)) calc(16 * var(--u)) calc(-4 * var(--u)) rgba(15, 20, 40, 0.3);
  opacity: 0;
  transform: scale(0.4);
  transition: opacity 260ms ease, transform 320ms var(--lilt-pks-ease);
}
.lilt-pks[data-phase="done"] .lilt-pks-badge {
  opacity: 1;
  transform: none;
  transition: opacity 200ms ease 120ms, transform 620ms var(--lilt-pks-pop) 120ms;
}
.lilt-pks-badge svg {
  width: calc(20 * var(--u));
  height: calc(20 * var(--u));
  fill: none;
  stroke: var(--lilt-pks-on-ink);
  stroke-width: 1.900;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 12;
  stroke-dashoffset: 12;
}
.lilt-pks[data-phase="done"] .lilt-pks-badge svg { stroke-dashoffset: 0; transition: stroke-dashoffset 420ms var(--lilt-pks-ease) 320ms; }

/* ---------- Chip ---------- */

.lilt-pks-chip {
  display: inline-flex;
  align-items: center;
  gap: calc(8 * var(--u));
  height: calc(32 * var(--u));
  padding: 0 calc(15 * var(--u)) 0 calc(12 * var(--u));
  border-radius: 999px;
  background: var(--lilt-pks-card);
  box-shadow: 0 0 0 calc(1 * var(--u)) var(--lilt-pks-ring), var(--lilt-pks-chip-shadow);
  font-size: calc(13.500 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--lilt-pks-muted);
  transition: color 500ms ease;
}
.lilt-pks[data-phase="done"] .lilt-pks-chip { color: var(--lilt-pks-ink); }
.lilt-pks-dot {
  flex: none;
  width: calc(7 * var(--u));
  height: calc(7 * var(--u));
  border-radius: 50%;
  background: var(--lilt-pks-muted);
  opacity: 0.6;
  transition: background 500ms ease, box-shadow 500ms ease, opacity 500ms ease;
}
.lilt-pks[data-phase="scan"] .lilt-pks-dot { animation: lilt-pks-blink 900ms ease-in-out infinite alternate; }
.lilt-pks[data-phase="done"] .lilt-pks-dot {
  background: #a48cf0;
  opacity: 1;
  box-shadow: 0 0 0 calc(3 * var(--u)) rgb(164 140 240 / 0.2), 0 0 calc(8 * var(--u)) rgb(164 140 240 / 0.7);
}
@keyframes lilt-pks-blink {
  from { opacity: 0.3; }
  to { opacity: 0.9; }
}
.lilt-pks-word { display: inline-block; line-height: 1.400; animation: lilt-pks-swap 460ms var(--lilt-pks-ease) both; }
@keyframes lilt-pks-swap {
  from { opacity: 0; transform: translateY(calc(5 * var(--u))); filter: blur(calc(2.500 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lilt-pks-lit, .lilt-pks-beam, .lilt-pks-dot, .lilt-pks-word { animation: none !important; }
  .lilt-pks-badge, .lilt-pks-badge svg, .lilt-pks-chip, .lilt-pks-dot, .lilt-pks-pool, .lilt-pks-wash, .lilt-pks-lit { transition: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-pks {
  --lilt-pks-card: #1c1c1a;
  --lilt-pks-ring: rgba(255, 255, 255, 0.08);
  --lilt-pks-sliver: #131312;
  --lilt-pks-shadow: 0 calc(22 * var(--u)) calc(38 * var(--u)) calc(-16 * var(--u)) rgba(0, 0, 0, 0.65), 0 calc(3 * var(--u)) calc(8 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-pks-ridge: #3d3d43;
  --lilt-pks-ink: #f4f4f2;
  --lilt-pks-on-ink: #19191b;
  --lilt-pks-muted: #9a9a94;
  --lilt-pks-pool: 0.34;
  --lilt-pks-wash: 0.6;
  --lilt-pks-beam-a: 0.2;
  --lilt-pks-glow: 0.6;
  --lilt-pks-chip-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(0, 0, 0, 0.6), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(0, 0, 0, 0.3);
}
:where(.dark, [data-theme="dark"]) .lilt-pks-lip { opacity: 0.8; }
`;
