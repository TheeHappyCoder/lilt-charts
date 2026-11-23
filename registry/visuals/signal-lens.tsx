'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

/*
 * Signal Lens – a glass lens finding signal in noise, in a single self-contained file.
 * A quiet field of dots fades out towards the edges. A glass lens drifts across it and magnifies what is
 * underneath; the few dots that matter bloom into color as they come under the glass and go quiet again
 * behind it. A small chip under the lens counts what it sees. Move the pointer over the scene and the
 * lens follows it on a soft spring.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type SignalLensProps = {
  /** Word after the count in the chip, e.g. "matches" – a function receives the count */
  unit?: string | ((count: number) => string);
  /** Show the counting chip under the lens */
  chip?: boolean;
  /** The lens follows the pointer while it's over the illustration */
  followPointer?: boolean;
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

/* Geometry on the 600 × 400 grid */
const W = 600;
const H = 400;
const GRID = 14; // distance between two dots
const R = 80; // lens radius
const ZOOM = 1.7;
const BLOOM = (R / ZOOM) * 0.9; // a signal lights up once it is this close to the middle of the lens
const HOME = { x: 300, y: 180 };

/** Signal colors across the field, left to right – the pastels used across the library, a touch deeper */
const TINTS: [number, number, number][] = [
  [255, 128, 144],
  [255, 166, 122],
  [181, 146, 236],
  [132, 152, 255],
];
const tint = (t: number) => {
  const p = Math.min(0.9999, Math.max(0, t)) * (TINTS.length - 1);
  const a = TINTS[Math.floor(p)];
  const b = TINTS[Math.floor(p) + 1];
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * (p % 1))).join(' ')})`;
};

type Signal = { x: number; y: number; color: string };

/** The same signals on every render and on the server: a tiny seeded generator, denser in a few soft patches */
function scatter(): Signal[] {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const out: Signal[] = [];
  for (let y = GRID / 2; y < H; y += GRID) {
    for (let x = GRID / 2; x < W; x += GRID) {
      const patch = Math.max(0, Math.sin(x * 0.019 + 0.8) * Math.cos(y * 0.027 - 0.5));
      if (rnd() < 0.07 + patch * 0.22) out.push({ x, y, color: tint(x / W + (rnd() - 0.5) * 0.7) });
    }
  }
  return out;
}

/** A magnifying glass lens drifting over a dot field and lighting up matching signals. */
export function SignalLens({
  unit = (n) => (n === 1 ? 'match' : 'matches'),
  chip = true,
  followPointer = true,
  className,
  label = 'A glass lens drifts over a field of dots and lights up the few that match',
}: SignalLensProps) {
  const id = 'lilt-sgl' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const signals = useMemo(scatter, []);
  const [count, setCount] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const zoom = useRef<SVGGElement>(null);
  const marks = useRef<(SVGGElement | null)[]>([]);
  const trail = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const pos = { x: HOME.x, y: HOME.y, vx: 0, vy: 0 };
    const target = { ...HOME };
    let pointer = false;
    let seen = -1;
    let frame = 0;
    let last = 0;
    let time = 0;

    const draw = () => {
      // The lens is placed in grid units; the magnified copy slides the other way underneath it
      lens.current?.style.setProperty('--x', pos.x.toFixed(2));
      lens.current?.style.setProperty('--y', pos.y.toFixed(2));
      zoom.current?.setAttribute(
        'transform',
        `scale(${ZOOM}) translate(${(-pos.x).toFixed(2)} ${(-pos.y).toFixed(2)})`,
      );
      let n = 0;
      signals.forEach((s, i) => {
        const on = Math.hypot(s.x - pos.x, s.y - pos.y) < BLOOM;
        if (on) n++;
        marks.current[i]?.toggleAttribute('data-on', on);
        trail.current[i]?.toggleAttribute('data-on', on);
      });
      if (n !== seen) setCount((seen = n));
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      if (!pointer) {
        // A slow, wide wander that never quite repeats
        time += dt;
        target.x = HOME.x + Math.sin(time * 0.46) * 150 + Math.sin(time * 0.17 + 2) * 22;
        target.y = HOME.y + Math.sin(time * 0.71 + 1.2) * 52;
      }
      const k = pointer ? 90 : 26;
      const c = 2 * Math.sqrt(k) * 0.9;
      pos.vx += (k * (target.x - pos.x) - c * pos.vx) * dt;
      pos.vy += (k * (target.y - pos.y) - c * pos.vy) * dt;
      pos.x += pos.vx * dt;
      pos.y += pos.vy * dt;
      draw();
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || still) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(el);

    const onMove = (e: PointerEvent) => {
      if (!followPointer) return;
      const r = el.getBoundingClientRect();
      pointer = true;
      // Kept away from the edges, so the lens and its chip stay inside the frame
      target.x = Math.min(W - R - 24, Math.max(R + 24, ((e.clientX - r.left) / r.width) * W));
      target.y = Math.min(H - R - 62, Math.max(R + 22, ((e.clientY - r.top) / r.height) * H));
      if (still) {
        pos.x = target.x;
        pos.y = target.y;
        draw();
      }
    };
    const onLeave = () => {
      pointer = false;
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    draw();

    return () => {
      stop();
      io.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [signals, followPointer]);

  const word = typeof unit === 'function' ? unit(count) : unit;

  return (
    <div
      ref={root}
      className={['lilt-sgl', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-signal-lens" precedence="default">
        {css}
      </style>

      <svg className="lilt-sgl-field" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <pattern id={`${id}-dots`} width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <circle className="lilt-sgl-dot" cx={GRID / 2} cy={GRID / 2} r="1.25" />
          </pattern>
          <pattern id={`${id}-near`} width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <circle
              className="lilt-sgl-dot lilt-sgl-dot--near"
              cx={GRID / 2}
              cy={GRID / 2}
              r="1.25"
            />
          </pattern>
          <filter id={`${id}-soft`} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}-dots)`} />
        {/* Signals the lens has passed stay lit for a while, then fade back into the field */}
        {signals.map((s, i) => (
          <g
            key={i}
            ref={(node) => {
              trail.current[i] = node;
            }}
            className="lilt-sgl-found"
            style={{ color: s.color }}
          >
            <circle
              className="lilt-sgl-halo"
              cx={s.x}
              cy={s.y}
              r="4.4"
              filter={`url(#${id}-soft)`}
            />
            <circle cx={s.x} cy={s.y} r="1.9" fill="currentColor" />
          </g>
        ))}
      </svg>

      <div ref={lens} className="lilt-sgl-lens" aria-hidden="true">
        <span className="lilt-sgl-glow" />
        <span className="lilt-sgl-glass" />
        {/* The same field again, larger, seen through the glass */}
        <svg className="lilt-sgl-zoom" viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}>
          <g ref={zoom}>
            <rect width={W} height={H} fill={`url(#${id}-near)`} />
            {signals.map((s, i) => (
              <g
                key={i}
                ref={(node) => {
                  marks.current[i] = node;
                }}
                className="lilt-sgl-signal"
                style={{ color: s.color }}
              >
                <circle
                  className="lilt-sgl-halo"
                  cx={s.x}
                  cy={s.y}
                  r="5.2"
                  filter={`url(#${id}-soft)`}
                />
                <circle className="lilt-sgl-core" cx={s.x} cy={s.y} r="2.5" />
              </g>
            ))}
          </g>
        </svg>
        <span className="lilt-sgl-gloss" />
        {chip && (
          <span className="lilt-sgl-chip">
            <span className="lilt-sgl-chip-dot" data-idle={count === 0 || undefined} />
            <span className="lilt-sgl-count" key={count}>
              {count}
            </span>
            <span>{word}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-sgl {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-sgl-dot: #cdd2d9;
  --lilt-sgl-near: #aab0ba;
  --lilt-sgl-glass: rgba(255, 255, 255, 0.62);
  --lilt-sgl-rim: rgba(255, 255, 255, 0.95);
  --lilt-sgl-edge: rgba(15, 20, 40, 0.1);
  --lilt-sgl-inner: rgba(90, 110, 170, 0.14);
  --lilt-sgl-shine: rgba(255, 255, 255, 0.9);
  --lilt-sgl-shadow: 0 calc(26 * var(--u)) calc(36 * var(--u)) calc(-16 * var(--u)) rgba(15, 20, 40, 0.24), 0 calc(6 * var(--u)) calc(12 * var(--u)) rgba(15, 20, 40, 0.07);
  --lilt-sgl-glow: 0.62;
  --lilt-sgl-chip: #ffffff;
  --lilt-sgl-chip-ring: rgba(10, 10, 10, 0.07);
  --lilt-sgl-chip-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(15, 20, 40, 0.16), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-sgl-text: #1a1a18;
  --lilt-sgl-muted: #8c8c87;
  --lilt-sgl-idle: #c9cdd4;
  --lilt-sgl-pop: cubic-bezier(0.34, 1.4, 0.64, 1);
  --lilt-sgl-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-sgl *, .lilt-sgl *::before, .lilt-sgl *::after { box-sizing: border-box; }

/* ---------- The field: fades out softly towards every edge ---------- */

.lilt-sgl-field {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  -webkit-mask-image: radial-gradient(66% 72% at 50% 46%, #000 38%, transparent 100%);
  mask-image: radial-gradient(66% 72% at 50% 46%, #000 38%, transparent 100%);
}
.lilt-sgl-dot { fill: var(--lilt-sgl-dot); }
.lilt-sgl-found { opacity: 0; transition: opacity 4200ms cubic-bezier(0.5, 0, 0.75, 0.4) 900ms; }
.lilt-sgl-found[data-on] { opacity: 1; transition: opacity 240ms ease; }
.lilt-sgl-dot--near { fill: var(--lilt-sgl-near); }

/* ---------- The lens ---------- */

.lilt-sgl-lens {
  --x: ${HOME.x};
  --y: ${HOME.y};
  position: absolute;
  left: 0;
  top: 0;
  width: calc(${R * 2} * var(--u));
  height: calc(${R * 2} * var(--u));
  transform: translate(calc((var(--x) - ${R}) * var(--u)), calc((var(--y) - ${R}) * var(--u)));
  will-change: transform;
}
.lilt-sgl-lens > span, .lilt-sgl-zoom { position: absolute; }
/* A pastel pool of light the glass throws onto the field below it */
.lilt-sgl-glow {
  left: 12%;
  right: 12%;
  bottom: calc(-16 * var(--u));
  height: calc(42 * var(--u));
  border-radius: 50%;
  background: linear-gradient(90deg, #ffa0ab, #ffb89e 33%, #c8a8e5 66%, #a8b5ff);
  filter: blur(calc(18 * var(--u)));
  opacity: var(--lilt-sgl-glow);
}
/* Frosted body: it blurs away the small dots underneath, so only the magnified ones are seen */
.lilt-sgl-glass {
  inset: 0;
  border-radius: 50%;
  background: var(--lilt-sgl-glass);
  -webkit-backdrop-filter: blur(calc(5 * var(--u)));
  backdrop-filter: blur(calc(5 * var(--u)));
  box-shadow: var(--lilt-sgl-shadow);
}
.lilt-sgl-zoom {
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}
.lilt-sgl-signal {
  opacity: 0;
  transition: opacity 320ms ease;
}
.lilt-sgl-signal[data-on] { opacity: 1; }
.lilt-sgl-core, .lilt-sgl-halo { fill: currentColor; transform-box: fill-box; transform-origin: center; }
.lilt-sgl-core { transform: scale(0.5); transition: transform 520ms var(--lilt-sgl-pop); }
.lilt-sgl-signal[data-on] .lilt-sgl-core { transform: scale(1); }
.lilt-sgl-halo { opacity: 0.5; }
/* Rim and light: a bright edge, a soft shade inside the lower rim, a highlight high on the left */
.lilt-sgl-gloss {
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(58% 34% at 36% 13%, var(--lilt-sgl-shine), transparent 72%),
    radial-gradient(46% 16% at 58% 97%, var(--lilt-sgl-shine), transparent 75%),
    radial-gradient(closest-side, transparent 78%, var(--lilt-sgl-inner) 100%);
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) var(--lilt-sgl-edge),
    inset 0 0 0 calc(3.5 * var(--u)) var(--lilt-sgl-rim),
    inset 0 calc(-7 * var(--u)) calc(12 * var(--u)) calc(-6 * var(--u)) var(--lilt-sgl-inner);
}
/* A hairline of color caught in the lower rim */
.lilt-sgl-gloss::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  padding: calc(1.2 * var(--u));
  background: conic-gradient(from 90deg, transparent 6%, #a8b5ff 14%, #c8a8e5 22%, #ffb89e 30%, #ffa0ab 37%, transparent 46%);
  -webkit-mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}

/* ---------- Chip ---------- */

.lilt-sgl-chip {
  left: 50%;
  top: calc(100% + 13 * var(--u));
  display: inline-flex;
  align-items: center;
  gap: calc(5 * var(--u));
  height: calc(28 * var(--u));
  padding: 0 calc(12 * var(--u)) 0 calc(10 * var(--u));
  transform: translateX(-50%);
  border-radius: 999px;
  background: var(--lilt-sgl-chip);
  box-shadow: 0 0 0 calc(1 * var(--u)) var(--lilt-sgl-chip-ring), var(--lilt-sgl-chip-shadow);
  font-size: calc(12.5 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--lilt-sgl-muted);
  font-variant-numeric: tabular-nums;
}
.lilt-sgl-chip-dot {
  width: calc(7 * var(--u));
  height: calc(7 * var(--u));
  margin-right: calc(2 * var(--u));
  border-radius: 50%;
  background: linear-gradient(135deg, #ff8f9c, #b592ec 60%, #8498ff);
  transition: filter 300ms ease, opacity 300ms ease;
}
.lilt-sgl-chip-dot[data-idle] { filter: grayscale(1); opacity: 0.45; }
.lilt-sgl-count {
  display: inline-block;
  min-width: 1ch;
  text-align: center;
  color: var(--lilt-sgl-text);
  animation: lilt-sgl-in 320ms var(--lilt-sgl-ease) both;
}
@keyframes lilt-sgl-in {
  from { opacity: 0; transform: translateY(calc(5 * var(--u))); filter: blur(calc(2 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lilt-sgl-signal, .lilt-sgl-core, .lilt-sgl-chip-dot, .lilt-sgl-found, .lilt-sgl-found[data-on] { transition: none; }
  .lilt-sgl-count { animation: none; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-sgl {
  --lilt-sgl-dot: rgba(255, 255, 255, 0.15);
  --lilt-sgl-near: rgba(255, 255, 255, 0.3);
  --lilt-sgl-glass: rgba(52, 52, 58, 0.55);
  --lilt-sgl-rim: rgba(255, 255, 255, 0.1);
  --lilt-sgl-edge: rgba(255, 255, 255, 0.14);
  --lilt-sgl-inner: rgba(0, 0, 0, 0.3);
  --lilt-sgl-shine: rgba(255, 255, 255, 0.13);
  --lilt-sgl-shadow: 0 calc(26 * var(--u)) calc(36 * var(--u)) calc(-16 * var(--u)) rgba(0, 0, 0, 0.75), 0 calc(6 * var(--u)) calc(12 * var(--u)) rgba(0, 0, 0, 0.35);
  --lilt-sgl-glow: 0.4;
  --lilt-sgl-chip: #1c1c1a;
  --lilt-sgl-chip-ring: rgba(255, 255, 255, 0.09);
  --lilt-sgl-chip-shadow: 0 calc(6 * var(--u)) calc(14 * var(--u)) calc(-6 * var(--u)) rgba(0, 0, 0, 0.6), 0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-sgl-text: #f4f4f2;
  --lilt-sgl-muted: #9a9aa0;
  --lilt-sgl-idle: #5c5c63;
}
`;
