'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

/*
 * Guard Shield – threats that never arrive, in a single self-contained file.
 * One glass shield sits in the middle of the frame. Small red dots drift in from the edges, one or
 * two at a time, and dissolve on an invisible dome around it: where each one lands, a short arc of
 * the dome lights up in a pastel color and fades again. A chip underneath keeps count.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type GuardTone = 'peach' | 'violet' | 'blue' | 'pink';

export type GuardShieldProps = {
  /** Number the counter starts from */
  start?: number;
  /** Word after the count in the chip – a function receives the count */
  unit?: string | ((count: number) => string);
  /** Colors the dome answers in, used in turn */
  tones?: GuardTone[];
  /** Show the counting chip under the shield */
  chip?: boolean;
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

const TONES: Record<GuardTone, string> = {
  peach: '255 164 128',
  violet: '178 146 236',
  blue: '134 154 255',
  pink: '255 140 160',
};
const defaultTones: GuardTone[] = ['blue', 'peach', 'violet'];

/* Choreography, in ms */
const SPAWN = 1750; // a new threat sets off
const TRAVEL = 2900; // it reaches the dome
const FADE = 1200; // the arc it lit fades

/* Geometry on the 600 × 400 grid */
const CX = 300;
const CY = 174;
const R = 112; // the dome
const SHIELD =
  'M300 98C318 109 340 115 358 117Q364 117.6 364 124V170C364 208 338 234 300 250C262 234 236 208 236 170V124Q236 117.6 242 117C260 115 282 109 300 98Z';
const ARC = 'M107.1 -32.7A112 112 0 0 1 107.1 32.7'; // 34° of the dome, facing +x
/* Directions the threats come from, in degrees clockwise from the right. The chip's side is left out */
const ANGLES = [205, 338, 158, 22, 252, 300, 186, 352, 230, 282, 142, 36];

/** How far from the centre a threat has to start so that it enters from outside the frame */
const startAt = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  const dx = Math.abs(Math.cos(a)) || 1e-6;
  const dy = Math.abs(Math.sin(a)) || 1e-6;
  return Math.round(Math.min(CX / dx, (Math.sin(a) < 0 ? CY : 400 - CY) / dy) + 12);
};

type Threat = { id: number; angle: number; tone: string };

/** A glass shield whose invisible dome dissolves incoming threats in pastel arcs. */
export function GuardShield({
  start = 128,
  unit = 'blocked',
  tones: given = defaultTones,
  chip = true,
  className,
  label = 'A glass shield – small red dots drift toward it and dissolve on an invisible dome that lights up where they land',
}: GuardShieldProps) {
  const tones = given.length ? given : defaultTones;
  const palette = tones.map((t) => TONES[t] ?? TONES.blue).join('|');
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const root = useRef<HTMLDivElement>(null);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [count, setCount] = useState(start);
  const [hit, setHit] = useState<string | null>(null);
  const [still, setStill] = useState(false);

  useEffect(() => setCount(start), [start]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Reduced motion: the shield, one lit arc, and the count
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      return;
    }
    const colors = palette.split('|');
    let timers: number[] = [];
    let k = 0;
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const spawn = () => {
      const id = k++;
      const tone = colors[id % colors.length];
      setThreats((list) => [...list, { id, angle: ANGLES[id % ANGLES.length], tone }]);
      later(() => {
        setCount((c) => c + 1);
        setHit(tone);
      }, TRAVEL);
      later(() => setThreats((list) => list.filter((t) => t.id !== id)), TRAVEL + FADE + 100);
      later(spawn, SPAWN);
    };
    // Plays only while on screen
    const io = new IntersectionObserver(
      ([e]) => {
        clear();
        setThreats([]);
        if (e.isIntersecting) later(spawn, 300);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, [palette]);

  const word = typeof unit === 'function' ? unit(count) : unit;
  const id = (name: string) => `lilt-gsh-${uid}-${name}`;

  return (
    <div
      ref={root}
      className={['lilt-gsh', className].filter(Boolean).join(' ')}
      style={
        { '--lilt-gsh-travel': `${TRAVEL}ms`, '--lilt-gsh-fade': `${FADE}ms` } as CSSProperties
      }
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-guard-shield" precedence="default">
        {css}
      </style>

      <svg className="lilt-gsh-art" viewBox="0 0 600 400" aria-hidden="true">
        <defs>
          <linearGradient
            id={id('body')}
            x1="246"
            y1="104"
            x2="354"
            y2="244"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-gsh-s-body-a" />
            <stop offset="1" className="lilt-gsh-s-body-b" />
          </linearGradient>
          <linearGradient
            id={id('rim')}
            x1="240"
            y1="100"
            x2="356"
            y2="244"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-gsh-s-rim-a" />
            <stop offset="0.42" className="lilt-gsh-s-rim-b" />
            <stop offset="0.66" stopColor="#ffb9a0" />
            <stop offset="0.84" stopColor="#c9abec" />
            <stop offset="1" stopColor="#a3b1ff" />
          </linearGradient>
          <linearGradient
            id={id('left')}
            x1="244"
            y1="236"
            x2="296"
            y2="112"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-gsh-s-face" stopOpacity="0" />
            <stop offset="1" className="lilt-gsh-s-face" stopOpacity="1" />
          </linearGradient>
          <linearGradient
            id={id('right')}
            x1="304"
            y1="106"
            x2="352"
            y2="236"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#ffc3ad" stopOpacity="0.04" />
            <stop offset="0.55" stopColor="#c9abec" stopOpacity="0.26" />
            <stop offset="1" stopColor="#a3b1ff" stopOpacity="0.44" />
          </linearGradient>
          <linearGradient
            id={id('floor')}
            x1="232"
            y1="0"
            x2="368"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#ffa3ae" />
            <stop offset="0.35" stopColor="#ffb99f" />
            <stop offset="0.68" stopColor="#c8a8e8" />
            <stop offset="1" stopColor="#a3b1ff" />
          </linearGradient>
          <linearGradient
            id={id('tail')}
            x1="2"
            y1="0"
            x2="34"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-gsh-s-threat" stopOpacity="0.55" />
            <stop offset="1" className="lilt-gsh-s-threat" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={id('ring')} cx={CX} cy={CY} r={R} gradientUnits="userSpaceOnUse">
            <stop offset="0.9" className="lilt-gsh-s-ring" stopOpacity="0" />
            <stop offset="1" className="lilt-gsh-s-ring" stopOpacity="1" />
          </radialGradient>
          <clipPath id={id('clip')}>
            <path d={SHIELD} />
          </clipPath>
          <filter id={id('soft')} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.4" />
          </filter>
          {/* For the small parts drawn around the rotated centre: a fixed region, so thin shapes aren't clipped */}
          <filter
            id={id('near')}
            filterUnits="userSpaceOnUse"
            x="-420"
            y="-420"
            width="840"
            height="840"
          >
            <feGaussianBlur stdDeviation="3.4" />
          </filter>
          <filter id={id('pool')} x="-60%" y="-200%" width="220%" height="500%">
            <feGaussianBlur stdDeviation="15" />
          </filter>
          <filter id={id('shade')} x="-60%" y="-200%" width="220%" height="500%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* The dome: barely there until something touches it */}
        <circle className="lilt-gsh-dome-fill" cx={CX} cy={CY} r={R} fill={`url(#${id('ring')})`} />
        <circle className="lilt-gsh-dome" cx={CX} cy={CY} r={R} />

        {/* Threats, and the arc each one lights where it lands */}
        {threats.map((t) => (
          <g
            key={t.id}
            transform={`translate(${CX} ${CY}) rotate(${t.angle})`}
            style={
              { '--lilt-gsh-tone': t.tone, '--lilt-gsh-from': startAt(t.angle) } as CSSProperties
            }
          >
            <path
              className="lilt-gsh-arc lilt-gsh-arc-halo"
              d={ARC}
              pathLength={1}
              filter={`url(#${id('near')})`}
            />
            <path className="lilt-gsh-arc" d={ARC} pathLength={1} />
            <g className="lilt-gsh-threat">
              <path className="lilt-gsh-tail" d="M2 0H34" stroke={`url(#${id('tail')})`} />
              <circle
                className="lilt-gsh-dot lilt-gsh-dot-halo"
                r="5.5"
                filter={`url(#${id('near')})`}
              />
              <circle className="lilt-gsh-dot" r="2.8" />
            </g>
          </g>
        ))}
        {still && (
          <g
            transform={`translate(${CX} ${CY}) rotate(${ANGLES[1]})`}
            style={{ '--lilt-gsh-tone': TONES[tones[0]] ?? TONES.blue } as CSSProperties}
          >
            <path
              className="lilt-gsh-arc lilt-gsh-arc-halo lilt-gsh-arc-still"
              d={ARC}
              filter={`url(#${id('near')})`}
            />
            <path className="lilt-gsh-arc lilt-gsh-arc-still" d={ARC} />
          </g>
        )}

        {/* Shield */}
        <ellipse
          className="lilt-gsh-shade"
          cx={CX}
          cy="262"
          rx="46"
          ry="6"
          filter={`url(#${id('shade')})`}
        />
        <ellipse
          className="lilt-gsh-pool"
          cx={CX}
          cy="266"
          rx="62"
          ry="12"
          fill={`url(#${id('floor')})`}
          filter={`url(#${id('pool')})`}
        />
        <path d={SHIELD} fill={`url(#${id('body')})`} />
        <g clipPath={`url(#${id('clip')})`}>
          <rect x="230" y="90" width="70" height="170" fill={`url(#${id('left')})`} />
          <rect x="300" y="90" width="70" height="170" fill={`url(#${id('right')})`} />
          <path className="lilt-gsh-seam" d="M300 96V252" />
        </g>
        <path
          className="lilt-gsh-bevel"
          d={SHIELD}
          transform={`translate(${CX} ${CY}) scale(0.8) translate(${-CX} ${-CY})`}
        />
        <path className="lilt-gsh-rim" d={SHIELD} stroke={`url(#${id('rim')})`} />
        {hit && (
          <g key={count} style={{ '--lilt-gsh-tone': hit } as CSSProperties}>
            <path
              className="lilt-gsh-flash lilt-gsh-flash-halo"
              d={SHIELD}
              filter={`url(#${id('soft')})`}
            />
            <path className="lilt-gsh-flash" d={SHIELD} />
          </g>
        )}
        <path className="lilt-gsh-check" d="M284.5 175.5L295.5 186.5L316 163" />
      </svg>

      {chip && (
        <span className="lilt-gsh-chip" aria-hidden="true">
          <span className="lilt-gsh-chip-dot" />
          <span className="lilt-gsh-count" key={count}>
            {count.toLocaleString('en-US')}
          </span>
          <span>{word}</span>
        </span>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-gsh {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-gsh-card: #ffffff;
  --lilt-gsh-ring: rgba(10, 10, 10, 0.07);
  --lilt-gsh-sliver: #eceef1;
  --lilt-gsh-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(15, 20, 40, 0.14), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-gsh-ink: #1a1a18;
  --lilt-gsh-muted: #8c8c87;
  --lilt-gsh-threat: #e8747f;
  --lilt-gsh-dome: rgba(10, 10, 10, 0.1);
  --lilt-gsh-dome-fill: rgba(120, 130, 170, 0.07);
  --lilt-gsh-pool: 0.5;
  --lilt-gsh-shade: rgba(15, 20, 40, 0.1);
  --lilt-gsh-body-a: rgba(255, 255, 255, 0.97);
  --lilt-gsh-body-b: rgba(236, 239, 250, 0.84);
  --lilt-gsh-face: #ffffff;
  --lilt-gsh-seam: rgba(255, 255, 255, 0.95);
  --lilt-gsh-bevel: rgba(255, 255, 255, 0.9);
  --lilt-gsh-bevel-fill: rgba(255, 255, 255, 0.28);
  --lilt-gsh-rim-a: #ffffff;
  --lilt-gsh-rim-b: #dde0e9;
  --lilt-gsh-check: #353843;
  --lilt-gsh-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lilt-gsh-pop: cubic-bezier(0.34, 1.4, 0.64, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-gsh *, .lilt-gsh *::before, .lilt-gsh *::after { box-sizing: border-box; margin: 0; }
.lilt-gsh-art { position: absolute; inset: 0; width: 100%; height: 100%; }

/* ---------- Dome ---------- */

.lilt-gsh-s-ring { stop-color: var(--lilt-gsh-dome-fill); }
.lilt-gsh-dome {
  fill: none;
  stroke: var(--lilt-gsh-dome);
  stroke-width: 1;
  stroke-linecap: round;
  stroke-dasharray: 0.1 7;
}
.lilt-gsh-arc {
  fill: none;
  stroke: rgb(var(--lilt-gsh-tone));
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-dasharray: 0 1;
  stroke-dashoffset: -0.5;
  opacity: 0;
  animation: lilt-gsh-arc var(--lilt-gsh-fade) var(--lilt-gsh-ease) calc(var(--lilt-gsh-travel) - 60ms) both;
}
.lilt-gsh-arc-halo { stroke-width: 6; stroke-opacity: 0.6; }
.lilt-gsh-arc-still { stroke-dasharray: none; opacity: 0.9; animation: none; }
.lilt-gsh-arc-halo.lilt-gsh-arc-still { opacity: 0.5; }
@keyframes lilt-gsh-arc {
  0% { stroke-dasharray: 0 1; stroke-dashoffset: -0.5; opacity: 0; }
  8% { opacity: 1; }
  40% { stroke-dasharray: 1 1; stroke-dashoffset: 0; opacity: 1; }
  100% { stroke-dasharray: 1 1; stroke-dashoffset: 0; opacity: 0; }
}

/* ---------- Threats ---------- */

.lilt-gsh-s-threat { stop-color: var(--lilt-gsh-threat); }
.lilt-gsh-threat {
  opacity: 0;
  animation: lilt-gsh-fly var(--lilt-gsh-travel) cubic-bezier(0.3, 0.2, 0.55, 1) both;
}
.lilt-gsh-tail { fill: none; stroke-width: 1.4; stroke-linecap: round; animation: lilt-gsh-gone 260ms ease calc(var(--lilt-gsh-travel) - 200ms) both; }
.lilt-gsh-dot {
  fill: var(--lilt-gsh-threat);
  transform-box: fill-box;
  transform-origin: center;
  animation: lilt-gsh-burst 620ms cubic-bezier(0.2, 0.7, 0.3, 1) var(--lilt-gsh-travel) both;
}
.lilt-gsh-dot-halo { opacity: 0.4; animation-name: lilt-gsh-burst-halo; }
@keyframes lilt-gsh-fly {
  0% { transform: translateX(calc(var(--lilt-gsh-from) * 1px)); opacity: 0; }
  12% { opacity: 1; }
  100% { transform: translateX(${R + 3}px); opacity: 1; }
}
@keyframes lilt-gsh-gone {
  to { opacity: 0; }
}
@keyframes lilt-gsh-burst {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(3.2); opacity: 0; }
}
@keyframes lilt-gsh-burst-halo {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(3); opacity: 0; }
}

/* ---------- Shield ---------- */

.lilt-gsh-shade { fill: var(--lilt-gsh-shade); }
.lilt-gsh-pool { opacity: var(--lilt-gsh-pool); }
.lilt-gsh-s-body-a { stop-color: var(--lilt-gsh-body-a); }
.lilt-gsh-s-body-b { stop-color: var(--lilt-gsh-body-b); }
.lilt-gsh-s-rim-a { stop-color: var(--lilt-gsh-rim-a); }
.lilt-gsh-s-rim-b { stop-color: var(--lilt-gsh-rim-b); }
.lilt-gsh-s-face { stop-color: var(--lilt-gsh-face); }
.lilt-gsh-seam { fill: none; stroke: var(--lilt-gsh-seam); stroke-width: 0.8; }
.lilt-gsh-bevel { fill: var(--lilt-gsh-bevel-fill); stroke: var(--lilt-gsh-bevel); stroke-width: 1; vector-effect: non-scaling-stroke; }
.lilt-gsh-rim { fill: none; stroke-width: 1.3; }
.lilt-gsh-check { fill: none; stroke: var(--lilt-gsh-check); stroke-width: 3.1; stroke-linecap: round; stroke-linejoin: round; }
.lilt-gsh-flash {
  fill: none;
  stroke: rgb(var(--lilt-gsh-tone));
  stroke-width: 1.2;
  opacity: 0;
  animation: lilt-gsh-flash 1200ms ease both;
}
.lilt-gsh-flash-halo { stroke-width: 5; stroke-opacity: 0.45; }
@keyframes lilt-gsh-flash {
  0% { opacity: 0; }
  18% { opacity: 0.5; }
  100% { opacity: 0; }
}

/* ---------- Chip ---------- */

.lilt-gsh-chip {
  position: absolute;
  left: 50%;
  top: calc(326 * var(--u));
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  gap: calc(5 * var(--u));
  height: calc(32 * var(--u));
  padding: 0 calc(14 * var(--u)) 0 calc(12 * var(--u));
  border-radius: 999px;
  background: var(--lilt-gsh-card);
  box-shadow: 0 0 0 calc(1 * var(--u)) var(--lilt-gsh-ring), inset 0 calc(-2 * var(--u)) 0 var(--lilt-gsh-sliver), var(--lilt-gsh-shadow);
  font-size: calc(13.5 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--lilt-gsh-muted);
  font-variant-numeric: tabular-nums;
}
.lilt-gsh-chip-dot {
  width: calc(7 * var(--u));
  height: calc(7 * var(--u));
  margin-right: calc(3 * var(--u));
  border-radius: 50%;
  background: var(--lilt-gsh-threat);
  box-shadow: 0 0 0 calc(3 * var(--u)) color-mix(in srgb, var(--lilt-gsh-threat) 18%, transparent);
}
.lilt-gsh-count {
  display: inline-block;
  color: var(--lilt-gsh-ink);
  animation: lilt-gsh-in 380ms var(--lilt-gsh-ease) both;
}
@keyframes lilt-gsh-in {
  from { opacity: 0; transform: translateY(calc(6 * var(--u))); filter: blur(calc(2 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lilt-gsh-count, .lilt-gsh-flash, .lilt-gsh-threat, .lilt-gsh-dot, .lilt-gsh-tail { animation: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-gsh {
  --lilt-gsh-card: #1c1c1a;
  --lilt-gsh-ring: rgba(255, 255, 255, 0.09);
  --lilt-gsh-sliver: #131312;
  --lilt-gsh-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(0, 0, 0, 0.6), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-gsh-ink: #f4f4f2;
  --lilt-gsh-muted: #9a9a94;
  --lilt-gsh-threat: #f0858f;
  --lilt-gsh-dome: rgba(255, 255, 255, 0.14);
  --lilt-gsh-dome-fill: rgba(255, 255, 255, 0.035);
  --lilt-gsh-pool: 0.32;
  --lilt-gsh-shade: rgba(0, 0, 0, 0.5);
  --lilt-gsh-body-a: rgba(74, 74, 82, 0.92);
  --lilt-gsh-body-b: rgba(38, 38, 43, 0.92);
  --lilt-gsh-face: rgba(255, 255, 255, 0.15);
  --lilt-gsh-seam: rgba(255, 255, 255, 0.16);
  --lilt-gsh-bevel: rgba(255, 255, 255, 0.13);
  --lilt-gsh-bevel-fill: rgba(255, 255, 255, 0.035);
  --lilt-gsh-rim-a: rgba(255, 255, 255, 0.5);
  --lilt-gsh-rim-b: rgba(255, 255, 255, 0.14);
  --lilt-gsh-check: #f2f2f4;
}
`;
