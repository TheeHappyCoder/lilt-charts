'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

/*
 * Usage Capsule – a quota you can see, in a single self-contained file.
 * One tall glass capsule holds a pastel liquid: cool at the bottom, warm towards the top. Its surface
 * rolls gently and a few bubbles drift up through it. The level rises in calm steps as the quota is
 * used, the number under the glass counts along, then the capsule drains and the period starts over.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type UsageCapsuleProps = {
  /** Fill levels the liquid steps through, 0 – 1, then it loops */
  levels?: number[];
  /** Small muted line under the capsule */
  caption?: string;
  /** Sign after the number */
  unit?: string;
  /** Milliseconds each level is held */
  hold?: number;
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

const defaultLevels = [0.38, 0.64, 0.82];

/* Geometry on the 600 × 400 grid */
const CX = 300;
const TOP = 30;
const W = 122;
const H = 232;
const X = CX - W / 2;
const BOTTOM = TOP + H;
const FLOOR = BOTTOM - 6; // liquid at 0 %
const RANGE = H - 30; // travel of the surface from 0 to 100 %
const WAVE = W; // one wavelength

/** A strip of liquid, several wavelengths wide, whose top edge is a soft sine */
const wave = (amp: number) => {
  let d = `M${-WAVE} 0`;
  for (let i = 0; i < 6; i++) d += `q${WAVE / 4} ${i % 2 ? amp : -amp} ${WAVE / 2} 0`;
  return `${d}V${H + 40}H${-WAVE}Z`;
};

const BUBBLES = [
  { x: 0.24, r: 2.6, dur: 5200, delay: 0 },
  { x: 0.62, r: 1.8, dur: 6400, delay: 1500 },
  { x: 0.42, r: 3.2, dur: 7000, delay: 3100 },
  { x: 0.78, r: 2.1, dur: 5600, delay: 4200 },
  { x: 0.33, r: 1.5, dur: 6100, delay: 2400 },
];
const TICKS = [0.25, 0.5, 0.75];
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** A glass capsule filling with rolling pastel liquid and rising bubbles as quota grows. */
export function UsageCapsule({
  levels: given = defaultLevels,
  caption = 'Tokens used',
  unit = '%',
  hold = 2300,
  className,
  label = 'A glass capsule filling with liquid as a usage quota is used up',
}: UsageCapsuleProps) {
  const levels = (given.length ? given : defaultLevels).map(clamp);
  const key = levels.join(',');
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `lilt-ucp-${uid}-${name}`;
  const root = useRef<HTMLDivElement>(null);
  const number = useRef<HTMLSpanElement>(null);
  const [level, setLevel] = useState(levels[0]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const steps = key.split(',').map(Number);
    const out = number.current;
    // Reduced motion: the first level, and it stays there
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let shown = steps[0];
    let i = 0;
    let timer = 0;
    let frame = 0;
    // The number eases along with the liquid
    const count = (to: number) => {
      cancelAnimationFrame(frame);
      const from = shown;
      const t0 = performance.now();
      const dur = to < from ? 1500 : 1700;
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        shown = from + (to - from) * k;
        if (out) out.textContent = String(Math.round(shown * 100));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const next = () => {
      i = (i + 1) % steps.length;
      setLevel(steps[i]);
      count(steps[i]);
      timer = window.setTimeout(next, hold + 1700);
    };
    // Plays only while on screen
    const io = new IntersectionObserver(
      ([e]) => {
        window.clearTimeout(timer);
        setPlaying(e.isIntersecting);
        if (e.isIntersecting && steps.length > 1) timer = window.setTimeout(next, hold);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [key, hold]);

  const surface = FLOOR - level * RANGE;
  const capsule = { x: X, y: TOP, width: W, height: H, rx: W / 2 };

  return (
    <div
      ref={root}
      className={['lilt-ucp', className].filter(Boolean).join(' ')}
      data-playing={playing || undefined}
      style={{ '--lilt-ucp-rise': level * RANGE, '--lilt-ucp-level': level } as CSSProperties}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-usage-capsule" precedence="default">
        {css}
      </style>

      <svg className="lilt-ucp-art" viewBox="0 0 600 400" aria-hidden="true">
        <defs>
          {/* Cool at the bottom, warm at the top – more of the warm end shows as it fills */}
          <linearGradient
            id={id('liquid')}
            x1="0"
            y1={BOTTOM}
            x2="0"
            y2={TOP}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#9fadff" />
            <stop offset="0.36" stopColor="#c0a8ee" />
            <stop offset="0.68" stopColor="#ffbba4" />
            <stop offset="1" stopColor="#ffa2ad" />
          </linearGradient>
          <linearGradient
            id={id('glass')}
            x1={X}
            y1={TOP}
            x2={X + W}
            y2={BOTTOM}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-ucp-s-glass-a" />
            <stop offset="1" className="lilt-ucp-s-glass-b" />
          </linearGradient>
          {/* Roundness: the glass darkens a touch towards both sides */}
          <linearGradient
            id={id('round')}
            x1={X}
            y1="0"
            x2={X + W}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-ucp-s-edge" stopOpacity="1" />
            <stop offset="0.22" className="lilt-ucp-s-edge" stopOpacity="0" />
            <stop offset="0.74" className="lilt-ucp-s-edge" stopOpacity="0" />
            <stop offset="1" className="lilt-ucp-s-edge" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient
            id={id('rim')}
            x1="0"
            y1={TOP}
            x2="0"
            y2={BOTTOM}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className="lilt-ucp-s-rim-a" />
            <stop offset="0.55" className="lilt-ucp-s-rim-b" />
            <stop offset="1" className="lilt-ucp-s-rim-c" />
          </linearGradient>
          <linearGradient
            id={id('streak')}
            x1="0"
            y1={TOP}
            x2="0"
            y2={BOTTOM}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.7" stopColor="#fff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={id('floor')}
            x1={X - 30}
            y1="0"
            x2={X + W + 30}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#a3b1ff" />
            <stop offset="0.5" stopColor="#c8a8e8" />
            <stop offset="1" stopColor="#ffb39f" />
          </linearGradient>
          <mask id={id('waves')} maskUnits="userSpaceOnUse" x={X} y={TOP} width={W} height={H}>
            <g
              className="lilt-ucp-level"
              style={{ transform: `translateY(${surface.toFixed(1)}px)` }}
            >
              <g transform={`translate(${X} -3)`}>
                <path className="lilt-ucp-wave lilt-ucp-wave--b" d={wave(3.4)} />
              </g>
              <g transform={`translate(${X} 0)`}>
                <path className="lilt-ucp-wave" d={wave(4)} />
              </g>
            </g>
          </mask>
          <clipPath id={id('clip')}>
            <rect {...capsule} />
          </clipPath>
          <filter id={id('pool')} x="-60%" y="-300%" width="220%" height="700%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id={id('shade')} x="-60%" y="-300%" width="220%" height="700%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id={id('soft')} x="-100%" y="-20%" width="300%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* On the surface below: a contact shadow and the liquid's color, pooling */}
        <ellipse
          className="lilt-ucp-shade"
          cx={CX}
          cy={BOTTOM + 7}
          rx="50"
          ry="6"
          filter={`url(#${id('shade')})`}
        />
        <ellipse
          className="lilt-ucp-pool"
          cx={CX}
          cy={BOTTOM + 12}
          rx="78"
          ry="15"
          fill={`url(#${id('floor')})`}
          filter={`url(#${id('pool')})`}
        />

        {/* Glass, back wall */}
        <rect {...capsule} fill={`url(#${id('glass')})`} />

        <g clipPath={`url(#${id('clip')})`}>
          {/* Liquid: its color stays put in the capsule, the two rolling waves are only its mask */}
          <rect {...capsule} fill={`url(#${id('liquid')})`} mask={`url(#${id('waves')})`} />
          <rect {...capsule} fill={`url(#${id('round')})`} />

          {/* Bubbles */}
          <g className="lilt-ucp-bubbles">
            {BUBBLES.map((b, i) => (
              <circle
                key={i}
                className="lilt-ucp-bubble"
                cx={X + 16 + b.x * (W - 32)}
                cy={FLOOR - 6}
                r={b.r}
                style={{ animationDuration: `${b.dur}ms`, animationDelay: `${b.delay}ms` }}
              />
            ))}
          </g>

          {/* Graduations etched into the glass */}
          {TICKS.map((t) => (
            <path
              key={t}
              className="lilt-ucp-tick"
              d={`M${X + W - 21} ${FLOOR - t * RANGE}h${t === 0.5 ? 12 : 8}`}
            />
          ))}

          {/* Highlights: a long streak down the left, a short one answering on the right */}
          <rect
            x={X + 13}
            y={TOP + 30}
            width="7"
            height={H - 96}
            rx="3.5"
            fill={`url(#${id('streak')})`}
            filter={`url(#${id('soft')})`}
            className="lilt-ucp-streak"
          />
          <rect
            x={X + W - 17}
            y={BOTTOM - 74}
            width="4"
            height="40"
            rx="2"
            fill="#fff"
            filter={`url(#${id('soft')})`}
            className="lilt-ucp-streak lilt-ucp-streak--b"
          />
          <ellipse
            cx={CX - 14}
            cy={TOP + 15}
            rx="24"
            ry="6"
            fill="#fff"
            filter={`url(#${id('soft')})`}
            className="lilt-ucp-streak lilt-ucp-streak--c"
          />
        </g>

        {/* Rim, and the sliver of light just inside it */}
        <rect
          x={X + 3.5}
          y={TOP + 3.5}
          width={W - 7}
          height={H - 7}
          rx={(W - 7) / 2}
          className="lilt-ucp-sliver"
        />
        <rect {...capsule} className="lilt-ucp-rim" stroke={`url(#${id('rim')})`} />
      </svg>

      <div className="lilt-ucp-readout" aria-hidden="true">
        <span className="lilt-ucp-value">
          <span ref={number}>{Math.round(levels[0] * 100)}</span>
          <span className="lilt-ucp-unit">{unit}</span>
        </span>
        <span className="lilt-ucp-caption">{caption}</span>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-ucp {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-ucp-text: #1a1a18;
  --lilt-ucp-muted: #8c8c87;
  --lilt-ucp-glass-a: rgba(255, 255, 255, 0.95);
  --lilt-ucp-glass-b: rgba(233, 236, 246, 0.8);
  --lilt-ucp-edge: rgba(40, 50, 90, 0.13);
  --lilt-ucp-rim-a: #e9ebf0;
  --lilt-ucp-rim-b: #dadde6;
  --lilt-ucp-rim-c: #c9cee0;
  --lilt-ucp-sliver: rgba(255, 255, 255, 0.75);
  --lilt-ucp-tick: rgba(20, 30, 60, 0.2);
  --lilt-ucp-shade: rgba(15, 20, 40, 0.2);
  --lilt-ucp-pool: 0.6;
  --lilt-ucp-back: 0.5;
  --lilt-ucp-streak: 0.85;
  --lilt-ucp-bubble: rgba(255, 255, 255, 0.7);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-ucp *, .lilt-ucp *::before, .lilt-ucp *::after { box-sizing: border-box; }
.lilt-ucp-art { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }

.lilt-ucp-s-glass-a { stop-color: var(--lilt-ucp-glass-a); }
.lilt-ucp-s-glass-b { stop-color: var(--lilt-ucp-glass-b); }
.lilt-ucp-s-edge { stop-color: var(--lilt-ucp-edge); }
.lilt-ucp-s-rim-a { stop-color: var(--lilt-ucp-rim-a); }
.lilt-ucp-s-rim-b { stop-color: var(--lilt-ucp-rim-b); }
.lilt-ucp-s-rim-c { stop-color: var(--lilt-ucp-rim-c); }

.lilt-ucp-shade { fill: var(--lilt-ucp-shade); }
/* More liquid, more light on the table */
.lilt-ucp-pool { opacity: calc(var(--lilt-ucp-pool) * (0.35 + var(--lilt-ucp-level) * 0.75)); transition: opacity 1700ms ease; }

/* ---------- Liquid ---------- */

.lilt-ucp-level { transition: transform 1700ms cubic-bezier(0.65, 0, 0.35, 1); }
.lilt-ucp-wave { animation: lilt-ucp-roll 5600ms linear infinite; animation-play-state: paused; }
.lilt-ucp[data-playing] .lilt-ucp-wave, .lilt-ucp[data-playing] .lilt-ucp-bubble { animation-play-state: running; }
.lilt-ucp-wave { fill: #fff; }
.lilt-ucp-wave--b { fill-opacity: var(--lilt-ucp-back); animation-duration: 8200ms; animation-direction: reverse; }
@keyframes lilt-ucp-roll {
  from { translate: 0 0; }
  to { translate: ${-WAVE}px 0; }
}
.lilt-ucp-rim { fill: none; stroke-width: 1.4; }
.lilt-ucp-sliver { fill: none; stroke: var(--lilt-ucp-sliver); stroke-width: 1.2; }
.lilt-ucp-tick { fill: none; stroke: var(--lilt-ucp-tick); stroke-width: 1.1; stroke-linecap: round; }
.lilt-ucp-streak { opacity: var(--lilt-ucp-streak); }
.lilt-ucp-streak--b { opacity: calc(var(--lilt-ucp-streak) * 0.5); }
.lilt-ucp-streak--c { opacity: calc(var(--lilt-ucp-streak) * 0.7); }

.lilt-ucp-bubble {
  fill: var(--lilt-ucp-bubble);
  opacity: 0;
  animation: lilt-ucp-bubble 6000ms cubic-bezier(0.4, 0, 0.7, 1) infinite both;
  animation-play-state: paused;
}
@keyframes lilt-ucp-bubble {
  0% { transform: translate(0, 0); opacity: 0; }
  12% { opacity: 1; }
  50% { transform: translate(3px, calc(var(--lilt-ucp-rise) * -0.5px)); }
  88% { opacity: 0.9; }
  100% { transform: translate(-2px, calc(var(--lilt-ucp-rise) * -1px + 10px)); opacity: 0; }
}

/* ---------- Readout ---------- */

.lilt-ucp-readout {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(${BOTTOM + 34} * var(--u));
  display: grid;
  justify-items: center;
  gap: calc(2 * var(--u));
}
.lilt-ucp-value {
  font-size: calc(30 * var(--u));
  font-weight: 500;
  line-height: calc(34 * var(--u));
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--lilt-ucp-text);
}
.lilt-ucp-unit { margin-left: calc(1.5 * var(--u)); font-size: 0.62em; font-weight: 500; letter-spacing: 0; color: var(--lilt-ucp-muted); }
.lilt-ucp-caption { font-size: calc(12.5 * var(--u)); line-height: 1.3; color: var(--lilt-ucp-muted); }

@media (prefers-reduced-motion: reduce) {
  .lilt-ucp-wave, .lilt-ucp-bubble { animation: none !important; }
  .lilt-ucp-bubble { opacity: 0; }
  .lilt-ucp-level, .lilt-ucp-pool { transition: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-ucp {
  --lilt-ucp-text: #f4f4f2;
  --lilt-ucp-muted: #8c8c87;
  --lilt-ucp-glass-a: rgba(255, 255, 255, 0.12);
  --lilt-ucp-glass-b: rgba(255, 255, 255, 0.035);
  --lilt-ucp-edge: rgba(0, 0, 0, 0.2);
  --lilt-ucp-rim-a: rgba(255, 255, 255, 0.55);
  --lilt-ucp-rim-b: rgba(255, 255, 255, 0.16);
  --lilt-ucp-rim-c: rgba(255, 255, 255, 0.3);
  --lilt-ucp-sliver: rgba(255, 255, 255, 0.09);
  --lilt-ucp-tick: rgba(255, 255, 255, 0.3);
  --lilt-ucp-shade: rgba(0, 0, 0, 0.55);
  --lilt-ucp-pool: 0.42;
  --lilt-ucp-back: 0.4;
  --lilt-ucp-streak: 0.3;
  --lilt-ucp-bubble: rgba(255, 255, 255, 0.5);
}
`;
