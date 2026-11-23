'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

/*
 * Eval Radar – model profiles on a radar chart, in a single self-contained file.
 * Six axes on a web of hairline hexagons. A tinted, softly lit polygon shows how one model scores,
 * then eases into the shape of the next one while its color shifts with it. A chip below names the
 * profile on show.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type RadarTone = 'peach' | 'violet' | 'blue' | 'pink';

export type RadarProfile = {
  name: string;
  /** One score per axis, 0 – 1, in the order of the axes */
  scores: number[];
  tone?: RadarTone;
};

export type EvalRadarProps = {
  /** Axis names, clockwise from the top – six read best */
  axes?: string[];
  /** Profiles shown one after the other */
  profiles?: RadarProfile[];
  /** Show the chip that names the profile */
  chip?: boolean;
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

const defaultAxes = ['Speed', 'Cost', 'Quality', 'Context', 'Safety', 'Tools'];
const defaultProfiles: RadarProfile[] = [
  { name: 'Swift', tone: 'peach', scores: [0.96, 0.9, 0.56, 0.46, 0.7, 0.58] },
  { name: 'Core', tone: 'violet', scores: [0.7, 0.66, 0.8, 0.74, 0.88, 0.82] },
  { name: 'Max', tone: 'blue', scores: [0.44, 0.36, 0.98, 0.94, 0.9, 0.96] },
];

const TONES: Record<RadarTone, [number, number, number]> = {
  peach: [255, 160, 124],
  violet: [176, 144, 236],
  blue: [128, 150, 255],
  pink: [255, 138, 160],
};
const TONE_ORDER: RadarTone[] = ['peach', 'violet', 'blue', 'pink'];

/* Geometry on the 600 × 400 grid */
const CX = 300;
const CY = 182;
const R = 112;
const RINGS = [0.25, 0.5, 0.75, 1];

/* Choreography, in ms */
const HOLD = 2300;
const MORPH = 1200;

const f = (n: number) => +n.toFixed(2);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const spot = (i: number, n: number, r: number) => {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r] as const;
};
const ring = (n: number, r: number) =>
  Array.from({ length: n }, (_, i) => spot(i, n, r).map(f).join(' ')).join(' ');

/** Six-axis model profiles morphing smoothly between tinted polygons. */
export function EvalRadar({
  axes: givenAxes = defaultAxes,
  profiles: givenProfiles = defaultProfiles,
  chip = true,
  className,
  label = "A radar chart with six axes – a tinted shape eases from one model's scores to the next",
}: EvalRadarProps) {
  const axes = givenAxes.length > 2 ? givenAxes : defaultAxes;
  const profiles = givenProfiles.length ? givenProfiles : defaultProfiles;
  const n = axes.length;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `lilt-evr-${uid}-${name}`;

  const root = useRef<HTMLDivElement>(null);
  const shapes = useRef<(SVGPolygonElement | null)[]>([]);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const [shown, setShown] = useState(0);

  const score = (p: RadarProfile, i: number) => Math.min(1, Math.max(0.06, p.scores[i] ?? 0.5));
  const toneOf = (k: number) => TONES[profiles[k].tone ?? TONE_ORDER[k % TONE_ORDER.length]];
  const first = profiles[0];
  const firstPoints = Array.from({ length: n }, (_, i) => spot(i, n, R * score(first, i)));
  const sig = profiles.map((p) => `${p.tone}:${p.scores.join(',')}`).join('|') + `/${n}`;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // The shape and its color are written straight to the DOM – no re-render per frame
    const paint = (from: number, to: number, t: number) => {
      const a = profiles[from];
      const b = profiles[to];
      const pts = Array.from({ length: n }, (_, i) =>
        spot(i, n, R * (score(a, i) + (score(b, i) - score(a, i)) * t)),
      );
      const str = pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' ');
      shapes.current.forEach((s) => s?.setAttribute('points', str));
      dots.current.forEach((d, i) => {
        d?.setAttribute('cx', String(f(pts[i][0])));
        d?.setAttribute('cy', String(f(pts[i][1])));
      });
      const ca = toneOf(from);
      const cb = toneOf(to);
      el.style.setProperty(
        '--lilt-evr-c',
        ca.map((c, j) => Math.round(c + (cb[j] - c) * t)).join(' '),
      );
    };
    paint(0, 0, 0);
    setShown(0);
    if (profiles.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;

    let raf = 0;
    let timer = 0;
    let at = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    const hold = () => {
      timer = window.setTimeout(() => {
        const from = at;
        const to = (at + 1) % profiles.length;
        setShown(to);
        let start = 0;
        const frame = (now: number) => {
          start ||= now;
          const p = Math.min(1, (now - start) / MORPH);
          paint(from, to, ease(p));
          if (p < 1) raf = requestAnimationFrame(frame);
          else {
            at = to;
            hold();
          }
        };
        raf = requestAnimationFrame(frame);
      }, HOLD);
    };
    // Plays only while on screen
    const io = new IntersectionObserver(
      ([e]) => {
        stop();
        if (e.isIntersecting) {
          paint(at, at, 0);
          setShown(at);
          hold();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, [sig]);

  const current = profiles[shown % profiles.length];
  const average = Math.round(
    (Array.from({ length: n }, (_, i) => score(current, i)).reduce((a, b) => a + b, 0) / n) * 100,
  );
  const firstStr = firstPoints.map((p) => `${f(p[0])} ${f(p[1])}`).join(' ');

  return (
    <div
      ref={root}
      className={['lilt-evr', className].filter(Boolean).join(' ')}
      style={{ '--lilt-evr-c': toneOf(0).join(' ') } as CSSProperties}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-eval-radar" precedence="default">
        {css}
      </style>

      <svg className="lilt-evr-art" viewBox="0 0 600 400" aria-hidden="true">
        <defs>
          <radialGradient id={id('fill')} cx={CX} cy={CY} r={R} gradientUnits="userSpaceOnUse">
            <stop offset="0" className="lilt-evr-s" stopOpacity="0.06" />
            <stop offset="0.55" className="lilt-evr-s" stopOpacity="0.2" />
            <stop offset="1" className="lilt-evr-s" stopOpacity="0.46" />
          </radialGradient>
          <linearGradient
            id={id('sheen')}
            x1={CX - R}
            y1={CY - R}
            x2={CX + R * 0.4}
            y2={CY + R * 0.6}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-evr-s-sheen" stopOpacity="1" />
            <stop offset="1" className="lilt-evr-s-sheen" stopOpacity="0" />
          </linearGradient>
          <radialGradient
            id={id('web')}
            cx={CX}
            cy={CY}
            r={R * 1.05}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </radialGradient>
          <mask id={id('web-mask')} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="400">
            <rect width="600" height="400" fill={`url(#${id('web')})`} />
          </mask>
          <filter id={id('glow')} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id={id('pool')} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
        </defs>

        {/* A little colored light behind everything */}
        <circle
          className="lilt-evr-pool"
          cx={CX}
          cy={CY + 6}
          r={R * 0.62}
          filter={`url(#${id('pool')})`}
        />

        {/* Web: hairline hexagons and spokes, fainter toward the centre */}
        <g mask={`url(#${id('web-mask')})`}>
          {RINGS.map((k) => (
            <polygon
              key={k}
              className="lilt-evr-web"
              data-edge={k === 1 || undefined}
              points={ring(n, R * k)}
            />
          ))}
          {axes.map((_, i) => {
            const [x, y] = spot(i, n, R);
            return <line key={i} className="lilt-evr-web" x1={CX} y1={CY} x2={f(x)} y2={f(y)} />;
          })}
        </g>

        {/* The profile */}
        <polygon
          ref={(e) => {
            shapes.current[0] = e;
          }}
          className="lilt-evr-glow"
          points={firstStr}
          filter={`url(#${id('glow')})`}
        />
        <polygon
          ref={(e) => {
            shapes.current[1] = e;
          }}
          points={firstStr}
          fill={`url(#${id('fill')})`}
        />
        <polygon
          ref={(e) => {
            shapes.current[2] = e;
          }}
          className="lilt-evr-sheen"
          points={firstStr}
          fill={`url(#${id('sheen')})`}
        />
        <polygon
          ref={(e) => {
            shapes.current[3] = e;
          }}
          className="lilt-evr-rim"
          points={firstStr}
        />
        {firstPoints.map((p, i) => (
          <circle
            key={i}
            ref={(e) => {
              dots.current[i] = e;
            }}
            className="lilt-evr-dot"
            cx={f(p[0])}
            cy={f(p[1])}
            r="3.3"
          />
        ))}

        {/* Axis names */}
        {axes.map((name, i) => {
          const [x, y] = spot(i, n, R + 15);
          const dx = x - CX;
          const anchor = Math.abs(dx) < 4 ? 'middle' : dx > 0 ? 'start' : 'end';
          const dy = Math.abs(dx) < 4 ? (y < CY ? -1 : 9) : 4;
          return (
            <text key={i} className="lilt-evr-axis" x={f(x)} y={f(y + dy)} textAnchor={anchor}>
              {name}
            </text>
          );
        })}
      </svg>

      {chip && (
        <div className="lilt-evr-chip" aria-hidden="true">
          <span className="lilt-evr-chip-dot" />
          <span className="lilt-evr-swap" key={shown}>
            <span className="lilt-evr-name">{current.name}</span>
            <span className="lilt-evr-score">{average}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-evr {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-evr-card: #ffffff;
  --lilt-evr-ring: rgba(10, 10, 10, 0.07);
  --lilt-evr-sliver: #eceef1;
  --lilt-evr-shadow: 0 calc(8 * var(--u)) calc(18 * var(--u)) calc(-8 * var(--u)) rgba(15, 20, 40, 0.16), 0 calc(1 * var(--u)) calc(3 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-evr-ink: #1a1a18;
  --lilt-evr-muted: #8c8c87;
  --lilt-evr-web: rgba(10, 10, 10, 0.075);
  --lilt-evr-edge: rgba(10, 10, 10, 0.12);
  --lilt-evr-sheen: #ffffff;
  --lilt-evr-sheen-a: 0.5;
  --lilt-evr-pool: 0.2;
  --lilt-evr-glow: 0.5;
  --lilt-evr-dot: #ffffff;
  --lilt-evr-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-evr *, .lilt-evr *::before, .lilt-evr *::after { box-sizing: border-box; margin: 0; }
.lilt-evr-art { position: absolute; inset: 0; width: 100%; height: 100%; }

/* ---------- Web ---------- */

.lilt-evr-web { fill: none; stroke: var(--lilt-evr-web); stroke-width: 1; stroke-linejoin: round; }
.lilt-evr-web[data-edge] { stroke: var(--lilt-evr-edge); }
.lilt-evr-axis {
  font-size: 11.5px;
  letter-spacing: -0.005em;
  fill: var(--lilt-evr-muted);
}

/* ---------- Profile ---------- */

.lilt-evr-s { stop-color: rgb(var(--lilt-evr-c)); }
.lilt-evr-s-sheen { stop-color: var(--lilt-evr-sheen); }
.lilt-evr-pool { fill: rgb(var(--lilt-evr-c)); opacity: var(--lilt-evr-pool); }
.lilt-evr-glow { fill: none; stroke: rgb(var(--lilt-evr-c)); stroke-width: 5; stroke-linejoin: round; opacity: var(--lilt-evr-glow); }
.lilt-evr-sheen { opacity: var(--lilt-evr-sheen-a); }
.lilt-evr-rim { fill: none; stroke: rgb(var(--lilt-evr-c)); stroke-width: 1.7; stroke-linejoin: round; }
.lilt-evr-dot { fill: var(--lilt-evr-dot); stroke: rgb(var(--lilt-evr-c)); stroke-width: 1.7; }

/* ---------- Chip ---------- */

.lilt-evr-chip {
  position: absolute;
  left: 50%;
  top: calc(350 * var(--u));
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: calc(8 * var(--u));
  height: calc(32 * var(--u));
  padding: 0 calc(14 * var(--u)) 0 calc(12 * var(--u));
  border-radius: 999px;
  background: var(--lilt-evr-card);
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-evr-ring),
    inset 0 calc(-2 * var(--u)) 0 var(--lilt-evr-sliver),
    var(--lilt-evr-shadow);
  font-size: calc(13 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.lilt-evr-chip-dot {
  flex: none;
  width: calc(8 * var(--u));
  height: calc(8 * var(--u));
  border-radius: 50%;
  background: rgb(var(--lilt-evr-c));
  box-shadow: 0 0 0 calc(3 * var(--u)) rgb(var(--lilt-evr-c) / 0.18), 0 0 calc(8 * var(--u)) rgb(var(--lilt-evr-c) / 0.7);
}
.lilt-evr-swap {
  display: inline-flex;
  align-items: baseline;
  gap: calc(7 * var(--u));
  animation: lilt-evr-in 520ms var(--lilt-evr-ease) both;
}
.lilt-evr-name { color: var(--lilt-evr-ink); }
.lilt-evr-score { color: var(--lilt-evr-muted); font-weight: 400; font-variant-numeric: tabular-nums; }
@keyframes lilt-evr-in {
  from { opacity: 0; transform: translateY(calc(5 * var(--u))); filter: blur(calc(2.5 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lilt-evr-swap { animation: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-evr {
  --lilt-evr-card: #1c1c1a;
  --lilt-evr-ring: rgba(255, 255, 255, 0.09);
  --lilt-evr-sliver: #131312;
  --lilt-evr-shadow: 0 calc(8 * var(--u)) calc(18 * var(--u)) calc(-8 * var(--u)) rgba(0, 0, 0, 0.6), 0 calc(1 * var(--u)) calc(3 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-evr-ink: #f4f4f2;
  --lilt-evr-muted: #9a9a94;
  --lilt-evr-web: rgba(255, 255, 255, 0.085);
  --lilt-evr-edge: rgba(255, 255, 255, 0.14);
  --lilt-evr-sheen: #ffffff;
  --lilt-evr-sheen-a: 0.1;
  --lilt-evr-pool: 0.16;
  --lilt-evr-glow: 0.6;
  --lilt-evr-dot: #1d1d20;
}
`;
