'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

/*
 * Prism Router – one request in, the right model out, in a single self-contained file.
 * A request chip on the left sends a pulse of plain light into a glass prism. The prism splits it:
 * the pulse leaves in one color and travels down one of three fanned-out routes to the model that
 * suits the request. The chosen route stays softly lit until the next request arrives.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type PrismTone = 'peach' | 'violet' | 'blue' | 'pink';

export type PrismRoute = { label: string; tone?: PrismTone };
export type PrismRequest = {
  text: string;
  /** Index of the route it is sent to: 0, 1 or 2 */ route: number;
};

export type PrismRouterProps = {
  /** Exactly three destinations, top to bottom */
  routes?: [PrismRoute, PrismRoute, PrismRoute];
  /** Requests, played in order and looped */
  requests?: PrismRequest[];
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

const defaultRoutes: [PrismRoute, PrismRoute, PrismRoute] = [
  { label: 'Fast', tone: 'peach' },
  { label: 'Balanced', tone: 'violet' },
  { label: 'Deep', tone: 'blue' },
];

const defaultRequests: PrismRequest[] = [
  { text: 'Summarise thread', route: 0 },
  { text: 'Draft a reply', route: 1 },
  { text: 'Refactor billing', route: 2 },
  { text: 'Tag 40 tickets', route: 0 },
  { text: 'Plan the migration', route: 2 },
  { text: 'Explain this error', route: 1 },
];

const TONES: Record<PrismTone, string> = {
  peach: '255 164 128',
  violet: '178 146 236',
  blue: '134 154 255',
  pink: '255 140 160',
};
const TONE_ORDER: PrismTone[] = ['peach', 'violet', 'blue'];

/* Choreography, in ms */
const CYCLE = 3000; // one request
const SEND = 520; // the pulse leaves the chip
const SPLIT = 960; // it reaches the prism
const ARRIVE = 1720; // it reaches its model

/* Geometry on the 600 × 400 grid */
const A = [300, 106] as const; // prism: top
const B = [216, 258] as const; // bottom left
const C = [384, 258] as const; // bottom right
const G = [300, 211] as const; // where the facets meet
const ENTRY = [250.8, 195] as const; // on the left face
const on = (t: number) => [A[0] + (C[0] - A[0]) * t, A[1] + (C[1] - A[1]) * t] as const;
const EXITS = [on(0.48), on(0.585), on(0.69)];
const ENDS = [106, 200, 294]; // y of the three model chips
const END_X = 470;
const f = (n: number) => +n.toFixed(1);

/** Route i, from the prism's right face out to its chip */
const routePath = (i: number) => {
  const [x, y] = EXITS[i];
  const dy = ENDS[i] - y;
  return `M${f(x)} ${f(y)}C${f(x + 52)} ${f(y + dy * 0.34)} ${END_X - 62} ${ENDS[i]} ${END_X} ${ENDS[i]}`;
};

/** A triangle with softened corners */
const rounded = (pts: readonly (readonly [number, number])[], r: number) => {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    const toward = (q: readonly [number, number]) => {
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      return `${f(p[0] + ((q[0] - p[0]) / len) * r)} ${f(p[1] + ((q[1] - p[1]) / len) * r)}`;
    };
    d += `${i ? 'L' : 'M'}${toward(a)}Q${p[0]} ${p[1]} ${toward(b)}`;
  }
  return d + 'Z';
};

const PRISM = rounded([A, C, B], 15);

/** A glass prism splitting each request into a coloured pulse toward its matching model. */
export function PrismRouter({
  routes = defaultRoutes,
  requests: given = defaultRequests,
  className,
  label = 'A request passes through a glass prism and leaves as a colored pulse toward the model that suits it',
}: PrismRouterProps) {
  const requests = given.length ? given : defaultRequests;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const root = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0); // request on its way
  const [lit, setLit] = useState(-1); // request that has arrived
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Reduced motion: one request, already delivered
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLit(0);
      return;
    }
    let timers: number[] = [];
    let k = 0;
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const run = () => {
      const mine = k++;
      setTick(mine);
      setPlaying(true);
      timers.push(window.setTimeout(() => setLit(mine), ARRIVE));
      timers.push(window.setTimeout(run, CYCLE));
    };
    // Plays only while on screen
    const io = new IntersectionObserver(
      ([e]) => {
        clear();
        if (e.isIntersecting) run();
        else setPlaying(false);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, []);

  const clampRoute = (n: number) => Math.min(2, Math.max(0, n | 0));
  const request = requests[tick % requests.length];
  const going = clampRoute(request.route);
  const arrived = lit < 0 ? -1 : clampRoute(requests[lit % requests.length].route);
  const tone = (i: number) => TONES[routes[i]?.tone ?? TONE_ORDER[i]];
  const id = (name: string) => `lilt-prm-${uid}-${name}`;

  return (
    <div
      ref={root}
      className={['lilt-prm', className].filter(Boolean).join(' ')}
      style={
        {
          '--lilt-prm-send': `${SEND}ms`,
          '--lilt-prm-split': `${SPLIT}ms`,
          '--lilt-prm-go': tone(going),
        } as CSSProperties
      }
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-prism-router" precedence="default">
        {css}
      </style>

      <svg className="lilt-prm-art" viewBox="0 0 600 400" aria-hidden="true">
        <defs>
          <linearGradient
            id={id('body')}
            x1="240"
            y1="118"
            x2="360"
            y2="262"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-prm-s-body-a" />
            <stop offset="1" className="lilt-prm-s-body-b" />
          </linearGradient>
          <linearGradient
            id={id('rim')}
            x1="216"
            y1="106"
            x2="384"
            y2="258"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-prm-s-rim-a" />
            <stop offset="0.45" className="lilt-prm-s-rim-b" />
            <stop offset="0.7" stopColor="#ffb9a0" />
            <stop offset="0.86" stopColor="#c9abec" />
            <stop offset="1" stopColor="#a3b1ff" />
          </linearGradient>
          <linearGradient
            id={id('left')}
            x1="226"
            y1="250"
            x2="300"
            y2="140"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-prm-s-face" stopOpacity="0" />
            <stop offset="1" className="lilt-prm-s-face" stopOpacity="1" />
          </linearGradient>
          <linearGradient
            id={id('right')}
            x1="300"
            y1="118"
            x2="368"
            y2="258"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#ffc3ad" stopOpacity="0.05" />
            <stop offset="0.6" stopColor="#c9abec" stopOpacity="0.3" />
            <stop offset="1" stopColor="#a3b1ff" stopOpacity="0.42" />
          </linearGradient>
          <linearGradient
            id={id('floor')}
            x1="216"
            y1="0"
            x2="384"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#ffa3ae" />
            <stop offset="0.35" stopColor="#ffb99f" />
            <stop offset="0.68" stopColor="#c8a8e8" />
            <stop offset="1" stopColor="#a3b1ff" />
          </linearGradient>
          {/* The spectrum that fans out of the prism, fading before it reaches the chips */}
          <linearGradient
            id={id('fan')}
            x1="0"
            y1="106"
            x2="0"
            y2="294"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={`rgb(${tone(0)})`} />
            <stop offset="0.5" stopColor={`rgb(${tone(1)})`} />
            <stop offset="1" stopColor={`rgb(${tone(2)})`} />
          </linearGradient>
          <linearGradient
            id={id('fade')}
            x1="344"
            y1="0"
            x2={END_X - 12}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask
            id={id('fan-mask')}
            maskUnits="userSpaceOnUse"
            x="320"
            y="80"
            width="170"
            height="240"
          >
            <rect x="320" y="80" width="170" height="240" fill={`url(#${id('fade')})`} />
          </mask>
          <linearGradient
            id={id('ray')}
            x1={ENTRY[0]}
            y1="0"
            x2="362"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-prm-s-ray" stopOpacity="0.9" />
            <stop offset="1" className="lilt-prm-s-ray" stopOpacity="0.15" />
          </linearGradient>
          <clipPath id={id('clip')}>
            <path d={PRISM} />
          </clipPath>
          <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
          <filter id={id('pool')} x="-60%" y="-200%" width="220%" height="500%">
            <feGaussianBlur stdDeviation="15" />
          </filter>
          <filter id={id('shade')} x="-60%" y="-200%" width="220%" height="500%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* Routes: a faint spectrum, three hairlines, and the one that was chosen last */}
        <path
          className="lilt-prm-fan"
          d={`${routePath(0)}L${END_X} ${ENDS[2]}C${END_X - 62} ${ENDS[2]} ${f(EXITS[2][0] + 52)} ${f(EXITS[2][1] + (ENDS[2] - EXITS[2][1]) * 0.34)} ${f(EXITS[2][0])} ${f(EXITS[2][1])}Z`}
          fill={`url(#${id('fan')})`}
          mask={`url(#${id('fan-mask')})`}
        />
        <path className="lilt-prm-rail" d={`M182 195H${ENTRY[0]}`} />
        {[0, 1, 2].map((i) => (
          <g key={i} style={{ '--lilt-prm-tone': tone(i) } as CSSProperties}>
            <path className="lilt-prm-rail" d={routePath(i)} />
            <path className="lilt-prm-live" data-on={arrived === i || undefined} d={routePath(i)} />
          </g>
        ))}

        {/* Pulses: plain light in, colored light out. Remounted for every request so they replay */}
        {playing && (
          <g key={tick}>
            <path
              className="lilt-prm-pulse lilt-prm-in lilt-prm-halo"
              d={`M182 195H${ENTRY[0]}`}
              pathLength={1}
              filter={`url(#${id('soft')})`}
            />
            <path
              className="lilt-prm-pulse lilt-prm-in"
              d={`M182 195H${ENTRY[0]}`}
              pathLength={1}
            />
            <path
              className="lilt-prm-pulse lilt-prm-out lilt-prm-halo"
              d={routePath(going)}
              pathLength={1}
              filter={`url(#${id('soft')})`}
            />
            <path className="lilt-prm-pulse lilt-prm-out" d={routePath(going)} pathLength={1} />
          </g>
        )}

        {/* Prism */}
        <ellipse
          className="lilt-prm-shade"
          cx="300"
          cy="270"
          rx="80"
          ry="8"
          filter={`url(#${id('shade')})`}
        />
        <ellipse
          className="lilt-prm-pool"
          cx="300"
          cy="275"
          rx="90"
          ry="14"
          fill={`url(#${id('floor')})`}
          filter={`url(#${id('pool')})`}
        />
        <path className="lilt-prm-glass" d={PRISM} fill={`url(#${id('body')})`} />
        <g clipPath={`url(#${id('clip')})`}>
          <path
            d={`M${A[0]} ${A[1]}L${G[0]} ${G[1]}L${B[0]} ${B[1]}Z`}
            fill={`url(#${id('left')})`}
          />
          <path
            d={`M${A[0]} ${A[1]}L${G[0]} ${G[1]}L${C[0]} ${C[1]}Z`}
            fill={`url(#${id('right')})`}
          />
          <path className="lilt-prm-base" d={`M${B[0]} ${B[1]}L${G[0]} ${G[1]}L${C[0]} ${C[1]}Z`} />
          <path
            className="lilt-prm-seam"
            d={`M${A[0]} ${A[1]}L${G[0]} ${G[1]}M${B[0]} ${B[1]}L${G[0]} ${G[1]}L${C[0]} ${C[1]}`}
          />
          {/* The light inside, spreading from where it enters to where it leaves */}
          <path
            key={tick}
            className="lilt-prm-ray"
            data-play={playing || undefined}
            d={`M${ENTRY[0]} ${ENTRY[1]}L${f(EXITS[0][0])} ${f(EXITS[0][1])}L${f(EXITS[2][0])} ${f(EXITS[2][1])}Z`}
            fill={`url(#${id('ray')})`}
          />
        </g>
        <path className="lilt-prm-rim" d={PRISM} stroke={`url(#${id('rim')})`} />
      </svg>

      {/* Request */}
      <div className="lilt-prm-ask" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M8 1.8c.3 2.9 1.3 3.9 4.2 4.2-2.9.3-3.9 1.3-4.2 4.2C7.7 7.300 6.700 6.300 3.800 6c2.900-.3 3.900-1.300 4.200-4.200Z" />
          <path d="M12.300 10.400c.15 1.300.6 1.750 1.900 1.900-1.300.15-1.750.6-1.900 1.900-.15-1.300-.6-1.750-1.900-1.900 1.300-.15 1.750-.6 1.900-1.900Z" />
        </svg>
        <span className="lilt-prm-ask-text" key={tick}>
          {request.text}
        </span>
      </div>

      {/* Models */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="lilt-prm-model"
          data-on={arrived === i || undefined}
          style={{ '--lilt-prm-tone': tone(i), '--lilt-prm-y': ENDS[i] } as CSSProperties}
          aria-hidden="true"
        >
          <span className="lilt-prm-dot" />
          <span>{routes[i]?.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-prm {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-prm-card: #ffffff;
  --lilt-prm-ring: rgba(10, 10, 10, 0.07);
  --lilt-prm-sliver: #eceef1;
  --lilt-prm-shadow: 0 calc(8 * var(--u)) calc(18 * var(--u)) calc(-8 * var(--u)) rgba(15, 20, 40, 0.16), 0 calc(1 * var(--u)) calc(3 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-prm-ink: #1a1a18;
  --lilt-prm-text: #5d6068;
  --lilt-prm-muted: #8c8c87;
  --lilt-prm-rail: rgba(10, 10, 10, 0.09);
  --lilt-prm-light: 23 23 23;
  --lilt-prm-light-a: 0.7;
  --lilt-prm-fan: 0.2;
  --lilt-prm-pool: 0.5;
  --lilt-prm-shade: rgba(15, 20, 40, 0.16);
  --lilt-prm-body-a: rgba(255, 255, 255, 0.96);
  --lilt-prm-body-b: rgba(236, 239, 250, 0.82);
  --lilt-prm-face: #ffffff;
  --lilt-prm-base: rgba(120, 130, 170, 0.1);
  --lilt-prm-seam: rgba(255, 255, 255, 0.9);
  --lilt-prm-rim-a: #ffffff;
  --lilt-prm-rim-b: #dfe2ea;
  --lilt-prm-inner: rgba(255, 255, 255, 0.85);
  --lilt-prm-ray: #ffffff;
  --lilt-prm-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lilt-prm-pop: cubic-bezier(0.34, 1.4, 0.64, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-prm *, .lilt-prm *::before, .lilt-prm *::after { box-sizing: border-box; margin: 0; }
.lilt-prm-art { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }

/* ---------- Routes ---------- */

.lilt-prm-fan { opacity: var(--lilt-prm-fan); }
.lilt-prm-rail { fill: none; stroke: var(--lilt-prm-rail); stroke-width: 1; stroke-linecap: round; }
.lilt-prm-live {
  fill: none;
  stroke: rgb(var(--lilt-prm-tone));
  stroke-width: 1.4;
  stroke-linecap: round;
  opacity: 0;
  transition: opacity 900ms ease;
}
.lilt-prm-live[data-on] { opacity: 0.75; transition: opacity 360ms ease; }

.lilt-prm-pulse {
  fill: none;
  stroke-width: 2.2;
  stroke-linecap: round;
  opacity: 0;
}
.lilt-prm-halo { stroke-width: 6; }
.lilt-prm-in {
  stroke: rgb(var(--lilt-prm-light) / var(--lilt-prm-light-a));
  stroke-dasharray: 0.42 2;
  stroke-dashoffset: 0.42;
  animation: lilt-prm-in calc(var(--lilt-prm-split) - var(--lilt-prm-send)) cubic-bezier(0.5, 0, 0.7, 0.6) var(--lilt-prm-send) both;
}
.lilt-prm-out {
  stroke: rgb(var(--lilt-prm-go));
  stroke-dasharray: 0.3 2;
  stroke-dashoffset: 0.3;
  animation: lilt-prm-out 860ms cubic-bezier(0.3, 0.5, 0.3, 1) calc(var(--lilt-prm-split) - 40ms) both;
}
.lilt-prm-in.lilt-prm-halo { stroke: rgb(var(--lilt-prm-light) / 0.22); }
.lilt-prm-out.lilt-prm-halo { stroke: rgb(var(--lilt-prm-go) / 0.75); }
@keyframes lilt-prm-in {
  0% { stroke-dashoffset: 0.42; opacity: 0; }
  15% { opacity: 1; }
  100% { stroke-dashoffset: -1; opacity: 1; }
}
@keyframes lilt-prm-out {
  0% { stroke-dashoffset: 0.3; opacity: 0; }
  10% { opacity: 1; }
  80% { opacity: 1; }
  100% { stroke-dashoffset: -1; opacity: 0; }
}

/* ---------- Prism ---------- */

.lilt-prm-shade { fill: var(--lilt-prm-shade); }
.lilt-prm-pool { opacity: var(--lilt-prm-pool); }
.lilt-prm-s-body-a { stop-color: var(--lilt-prm-body-a); }
.lilt-prm-s-body-b { stop-color: var(--lilt-prm-body-b); }
.lilt-prm-s-rim-a { stop-color: var(--lilt-prm-rim-a); }
.lilt-prm-s-rim-b { stop-color: var(--lilt-prm-rim-b); }
.lilt-prm-s-face { stop-color: var(--lilt-prm-face); }
.lilt-prm-s-ray { stop-color: var(--lilt-prm-ray); }
.lilt-prm-base { fill: var(--lilt-prm-base); }
.lilt-prm-seam { fill: none; stroke: var(--lilt-prm-seam); stroke-width: 0.8; stroke-linejoin: round; }
.lilt-prm-rim { fill: none; stroke-width: 1.3; }
.lilt-prm-ray { opacity: 0; mix-blend-mode: normal; }
.lilt-prm-ray[data-play] { animation: lilt-prm-ray 1100ms ease calc(var(--lilt-prm-split) - 120ms) both; }
@keyframes lilt-prm-ray {
  0% { opacity: 0; }
  22% { opacity: 1; }
  100% { opacity: 0; }
}

/* ---------- Request chip ---------- */

.lilt-prm-ask {
  position: absolute;
  right: calc(418 * var(--u));
  top: calc(195 * var(--u));
  max-width: calc(170 * var(--u));
  height: calc(38 * var(--u));
  margin-top: calc(-19 * var(--u));
  display: flex;
  align-items: center;
  gap: calc(7 * var(--u));
  padding: 0 calc(12 * var(--u)) 0 calc(11 * var(--u));
  border-radius: calc(13 * var(--u));
  background: var(--lilt-prm-card);
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-prm-ring),
    inset 0 calc(-2 * var(--u)) 0 var(--lilt-prm-sliver),
    var(--lilt-prm-shadow);
  font-size: calc(11.5 * var(--u));
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--lilt-prm-text);
}
.lilt-prm-ask svg {
  flex: none;
  width: calc(14 * var(--u));
  height: calc(14 * var(--u));
  fill: var(--lilt-prm-muted);
}
.lilt-prm-ask-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  animation: lilt-prm-swap 520ms var(--lilt-prm-ease) both;
}
@keyframes lilt-prm-swap {
  from { opacity: 0; transform: translateY(calc(5 * var(--u))); filter: blur(calc(2.5 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}

/* ---------- Model chips ---------- */

.lilt-prm-model {
  position: absolute;
  left: calc(${END_X} * var(--u));
  top: calc(var(--lilt-prm-y) * var(--u));
  height: calc(34 * var(--u));
  margin-top: calc(-17 * var(--u));
  display: flex;
  align-items: center;
  gap: calc(8 * var(--u));
  padding: 0 calc(15 * var(--u)) 0 calc(12 * var(--u));
  border-radius: 999px;
  background: var(--lilt-prm-card);
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-prm-ring),
    inset 0 calc(-2 * var(--u)) 0 var(--lilt-prm-sliver),
    0 0 0 0 rgb(var(--lilt-prm-tone) / 0),
    var(--lilt-prm-shadow);
  font-size: calc(13 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--lilt-prm-muted);
  transition: color 700ms ease, box-shadow 900ms ease, transform 700ms var(--lilt-prm-ease);
}
.lilt-prm-model[data-on] {
  color: var(--lilt-prm-ink);
  transform: translateX(calc(3 * var(--u)));
  box-shadow:
    0 0 0 calc(1 * var(--u)) rgb(var(--lilt-prm-tone) / 0.55),
    inset 0 calc(-2 * var(--u)) 0 rgb(var(--lilt-prm-tone) / 0.22),
    0 calc(8 * var(--u)) calc(22 * var(--u)) calc(-4 * var(--u)) rgb(var(--lilt-prm-tone) / 0.5),
    var(--lilt-prm-shadow);
  transition: color 300ms ease, box-shadow 420ms ease, transform 620ms var(--lilt-prm-pop);
}
.lilt-prm-dot {
  flex: none;
  width: calc(8 * var(--u));
  height: calc(8 * var(--u));
  border-radius: 50%;
  background: rgb(var(--lilt-prm-tone));
  opacity: 0.45;
  box-shadow: 0 0 0 0 rgb(var(--lilt-prm-tone) / 0);
  transition: opacity 700ms ease, box-shadow 900ms ease;
}
.lilt-prm-model[data-on] .lilt-prm-dot {
  opacity: 1;
  box-shadow: 0 0 0 calc(3.5 * var(--u)) rgb(var(--lilt-prm-tone) / 0.2), 0 0 calc(9 * var(--u)) rgb(var(--lilt-prm-tone) / 0.8);
  transition: opacity 260ms ease, box-shadow 420ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .lilt-prm-model, .lilt-prm-dot, .lilt-prm-live { transition: none !important; }
  .lilt-prm-ask-text, .lilt-prm-ray, .lilt-prm-pulse { animation: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-prm {
  --lilt-prm-card: #1c1c1a;
  --lilt-prm-ring: rgba(255, 255, 255, 0.09);
  --lilt-prm-sliver: #131312;
  --lilt-prm-shadow: 0 calc(8 * var(--u)) calc(18 * var(--u)) calc(-8 * var(--u)) rgba(0, 0, 0, 0.6), 0 calc(1 * var(--u)) calc(3 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-prm-ink: #f4f4f2;
  --lilt-prm-text: #b0b0b6;
  --lilt-prm-muted: #9a9a94;
  --lilt-prm-rail: rgba(255, 255, 255, 0.1);
  --lilt-prm-light: 255 255 255;
  --lilt-prm-light-a: 0.95;
  --lilt-prm-fan: 0.16;
  --lilt-prm-pool: 0.32;
  --lilt-prm-shade: rgba(0, 0, 0, 0.5);
  --lilt-prm-body-a: rgba(72, 72, 80, 0.9);
  --lilt-prm-body-b: rgba(38, 38, 43, 0.9);
  --lilt-prm-face: rgba(255, 255, 255, 0.16);
  --lilt-prm-base: rgba(0, 0, 0, 0.22);
  --lilt-prm-seam: rgba(255, 255, 255, 0.16);
  --lilt-prm-rim-a: rgba(255, 255, 255, 0.5);
  --lilt-prm-rim-b: rgba(255, 255, 255, 0.14);
  --lilt-prm-inner: rgba(255, 255, 255, 0.12);
  --lilt-prm-ray: #ffffff;
}
:where(.dark, [data-theme="dark"]) .lilt-prm-in.lilt-prm-halo { stroke: rgb(255 255 255 / 0.5); }
`;
