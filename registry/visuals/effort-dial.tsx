'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

/*
 * Effort Dial – a tactile knob for an AI setting, in a single self-contained file.
 * A machined knob sits inside an arc of fine ticks. It turns on a soft spring from one level to the next;
 * the ticks light up behind it from cool to warm, swell a little where the pointer passes, and the word
 * in the gap below rolls over to the new level. Hover holds it, drag the knob to turn it yourself
 * (it lands on the closest level), or use the arrow keys.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type EffortLevel = {
  /** Word shown under the knob, e.g. "High" */
  name: string;
  /** Position on the arc, 0 – 1 */
  value: number;
};

export type EffortDialProps = {
  /** Levels the knob stops at, lowest first */
  levels?: EffortLevel[];
  /** Small muted line above the level */
  caption?: string;
  /** Level to start on */
  defaultIndex?: number;
  /** Milliseconds a level stays before the knob turns on */
  hold?: number;
  /** Called when a level is picked by the user */
  onChange?: (index: number) => void;
  className?: string;
  /** Accessible name of the control */
  label?: string;
};

const defaultLevels: EffortLevel[] = [
  { name: 'Low', value: 0.14 },
  { name: 'Medium', value: 0.42 },
  { name: 'High', value: 0.7 },
  { name: 'Max', value: 1 },
];

/* Geometry on the 600 × 400 grid */
const CX = 300;
const CY = 182;
const TICKS = 45;
const FROM = -135; // degrees, 0 = straight up
const SWEEP = 270;
const R0 = 113; // inner end of a tick
const LEN = 9; // resting length
const SWELL = 10; // extra length where the pointer is

/** Cool to warm along the arc – the pastels used across the library */
const STOPS: [number, [number, number, number]][] = [
  [0, [168, 181, 255]],
  [0.38, [200, 168, 229]],
  [0.72, [255, 184, 158]],
  [1, [255, 112, 98]],
];
const colorAt = (t: number) => {
  const i = Math.max(
    1,
    STOPS.findIndex(([at]) => at >= t),
  );
  const [a, ca] = STOPS[i - 1];
  const [b, cb] = STOPS[i];
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return `rgb(${ca.map((c, n) => Math.round(c + (cb[n] - c) * k)).join(' ')})`;
};
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** A tactile machined knob turning through reasoning levels as ticks light from cool to warm. */
export function EffortDial({
  levels: given = defaultLevels,
  caption = 'Reasoning effort',
  defaultIndex = 1,
  hold = 2100,
  onChange,
  className,
  label = 'Reasoning effort',
}: EffortDialProps) {
  const id = 'lilt-efd' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const levels = given.length ? given : defaultLevels;
  const start = Math.min(Math.max(defaultIndex, 0), levels.length - 1);
  const [index, setIndex] = useState(start);
  const [dir, setDir] = useState(1);

  const root = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const turn = useRef<HTMLSpanElement>(null);
  const glow = useRef<HTMLSpanElement>(null);
  const lit = useRef<(SVGLineElement | null)[]>([]);
  const dim = useRef<(SVGLineElement | null)[]>([]);
  const halo = useRef<(SVGLineElement | null)[]>([]);
  // Lets the keyboard handler and the motion loop share one way of picking a level
  const api = useRef<{ pick: (i: number, user?: boolean) => void }>({ pick: () => {} });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = root.current;
    const grip = knob.current;
    if (!el || !grip) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = levels.length;

    let value = levels[start].value;
    let target = value;
    let vel = 0;
    let current = start;
    let step = 1; // the knob walks up the levels, then back down
    let frame = 0;
    let last = 0;
    let timer = 0;
    let visible = false;
    let hovered = false;
    let dragging = false;

    /* Every tick, the pointer and the glow follow one number */
    const paint = () => {
      turn.current?.style.setProperty(
        'transform',
        `rotate(${(FROM + value * SWEEP).toFixed(2)}deg)`,
      );
      el.style.setProperty('--lilt-efd-now', colorAt(clamp(value)));
      if (glow.current) glow.current.style.opacity = (0.28 + clamp(value) * 0.62).toFixed(3);
      for (let i = 0; i < TICKS; i++) {
        const d = (i / (TICKS - 1) - value) * (TICKS - 1); // distance to the pointer, in ticks
        const on = clamp(0.5 - d);
        const swell = Math.exp(-(d * d) / 5.5);
        const y2 = (CY - R0 - LEN - swell * SWELL).toFixed(2);
        dim.current[i]?.setAttribute('y2', y2);
        const a = lit.current[i];
        if (a) {
          a.setAttribute('y2', y2);
          a.style.opacity = on.toFixed(3);
        }
        const h = halo.current[i];
        if (h) {
          h.setAttribute('y2', y2);
          h.style.opacity = (on * (0.35 + swell * 0.65)).toFixed(3);
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      if (!dragging) {
        // A soft spring: a touch of overshoot, then it settles
        vel += (95 * (target - value) - 12.5 * vel) * dt;
        value += vel * dt;
        if (Math.abs(target - value) < 0.0004 && Math.abs(vel) < 0.004) {
          value = target;
          vel = 0;
          paint();
          frame = 0;
          schedule();
          return;
        }
      }
      paint();
      frame = requestAnimationFrame(loop);
    };
    const run = () => {
      if (still) {
        value = target;
        paint();
        return;
      }
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };

    const pick = (i: number, user = false) => {
      const next = Math.min(Math.max(i, 0), n - 1);
      setDir(next >= current ? 1 : -1);
      current = next;
      target = levels[next].value;
      setIndex(next);
      if (user) onChangeRef.current?.(next);
      run();
    };
    api.current.pick = (i, user) => {
      window.clearTimeout(timer);
      pick(i, user);
    };

    // Auto turn: one level on, back down again at the ends
    const schedule = () => {
      window.clearTimeout(timer);
      if (still || !visible || hovered || dragging || n < 2) return;
      timer = window.setTimeout(() => {
        if (current + step > n - 1 || current + step < 0) step = -step;
        pick(current + step);
      }, hold);
    };

    /* Dragging: the pointer's angle around the middle is the value */
    const fromPointer = (e: PointerEvent) => {
      const r = grip.getBoundingClientRect();
      const a =
        (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) *
          180) /
        Math.PI;
      // In the open gap at the bottom the knob stays at the end it was closer to
      if (Math.abs(a) > 135) return value > 0.5 ? 1 : 0;
      return (a - FROM) / SWEEP;
    };
    const nearest = () =>
      levels.reduce(
        (best, l, i) =>
          Math.abs(l.value - value) < Math.abs(levels[best].value - value) ? i : best,
        0,
      );
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      window.clearTimeout(timer);
      grip.setPointerCapture(e.pointerId);
      grip.setAttribute('data-dragging', '');
      dragging = true;
      vel = 0;
      run();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      if (e.buttons === 0) return onUp();
      // Ease towards the finger, so grabbing the knob off-centre doesn't make it jump
      value += (fromPointer(e) - value) * 0.5;
      const i = nearest();
      if (i !== current) {
        setDir(i > current ? 1 : -1);
        current = i;
        setIndex(i);
      }
      if (still) paint();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      grip.removeAttribute('data-dragging');
      const i = nearest();
      current = i;
      target = levels[i].value;
      setIndex(i);
      onChangeRef.current?.(i);
      run();
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) schedule();
      else window.clearTimeout(timer);
    });
    io.observe(el);
    const enter = () => {
      hovered = true;
      window.clearTimeout(timer);
    };
    const leave = () => {
      hovered = false;
      schedule();
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    grip.addEventListener('pointerdown', onDown);
    grip.addEventListener('pointermove', onMove);
    grip.addEventListener('pointerup', onUp);
    grip.addEventListener('pointercancel', onUp);
    grip.addEventListener('lostpointercapture', onUp);
    paint();

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      grip.removeEventListener('pointerdown', onDown);
      grip.removeEventListener('pointermove', onMove);
      grip.removeEventListener('pointerup', onUp);
      grip.removeEventListener('pointercancel', onUp);
      grip.removeEventListener('lostpointercapture', onUp);
    };
  }, [levels, start, hold]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = levels.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      Home: 0,
      End: last,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    api.current.pick(keys[e.key], true);
  };

  const ticks = Array.from({ length: TICKS }, (_, i) => i / (TICKS - 1));
  const line = { x1: CX, x2: CX, y1: CY - R0, y2: CY - R0 - LEN };
  const set = (store: typeof lit, cls: string, colored: boolean) =>
    ticks.map((t, i) => (
      <line
        key={i}
        ref={(node) => {
          store.current[i] = node;
        }}
        className={cls}
        {...line}
        transform={`rotate(${(FROM + t * SWEEP).toFixed(3)} ${CX} ${CY})`}
        style={colored ? { stroke: colorAt(t) } : undefined}
      />
    ));

  return (
    <div ref={root} className={['lilt-efd', className].filter(Boolean).join(' ')}>
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-effort-dial" precedence="default">
        {css}
      </style>

      <svg className="lilt-efd-ticks" viewBox="0 0 600 400" aria-hidden="true">
        <defs>
          <filter
            id={`${id}-halo`}
            x="0"
            y="0"
            width="600"
            height="400"
            filterUnits="userSpaceOnUse"
          >
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>
        <g>{set(dim, 'lilt-efd-tick', false)}</g>
        <g filter={`url(#${id}-halo)`}>{set(halo, 'lilt-efd-tick lilt-efd-tick--halo', true)}</g>
        <g>{set(lit, 'lilt-efd-tick lilt-efd-tick--lit', true)}</g>
      </svg>

      {/* The glow sits on the knob's bottom edge and grows with the level */}
      <span ref={glow} className="lilt-efd-glow" aria-hidden="true" />

      <div
        ref={knob}
        className="lilt-efd-knob"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={levels.length - 1}
        aria-valuenow={index}
        aria-valuetext={levels[index].name}
        onKeyDown={onKeyDown}
      >
        <span className="lilt-efd-skirt" aria-hidden="true" />
        <span ref={turn} className="lilt-efd-turn" aria-hidden="true">
          <span className="lilt-efd-grip" />
          <span className="lilt-efd-led" />
        </span>
        <span className="lilt-efd-cap" aria-hidden="true" />
      </div>

      <div className="lilt-efd-readout" aria-hidden="true">
        <span className="lilt-efd-caption">{caption}</span>
        <span className="lilt-efd-value">
          <span key={index} className="lilt-efd-word" data-dir={dir > 0 ? 'up' : 'down'}>
            {levels[index].name}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-efd {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-efd-now: #c8a8e5;
  --lilt-efd-tick: #e1e4e9;
  --lilt-efd-text: #1a1a18;
  --lilt-efd-muted: #8c8c87;
  --lilt-efd-ring: rgba(10, 10, 10, 0.07);
  --lilt-efd-skirt-a: #ffffff;
  --lilt-efd-skirt-b: #eceef2;
  --lilt-efd-sliver: #e3e6eb;
  --lilt-efd-groove: rgba(15, 20, 30, 0.075);
  --lilt-efd-cap-a: #ffffff;
  --lilt-efd-cap-b: #eff0f3;
  --lilt-efd-cap-c: #f8f9fa;
  --lilt-efd-cap-edge: rgba(10, 10, 10, 0.06);
  --lilt-efd-cap-light: rgba(255, 255, 255, 0.95);
  --lilt-efd-shadow: 0 calc(22 * var(--u)) calc(34 * var(--u)) calc(-12 * var(--u)) rgba(15, 20, 40, 0.2), 0 calc(5 * var(--u)) calc(10 * var(--u)) rgba(15, 20, 40, 0.06);
  --lilt-efd-well: rgba(15, 20, 40, 0.16);
  --lilt-efd-focus: rgba(23, 23, 23, 0.22);
  --lilt-efd-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.lilt-efd *, .lilt-efd *::before, .lilt-efd *::after { box-sizing: border-box; }

/* ---------- Ticks ---------- */

.lilt-efd-ticks { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.lilt-efd-tick { fill: none; stroke: var(--lilt-efd-tick); stroke-width: 2; stroke-linecap: round; }
.lilt-efd-tick--lit, .lilt-efd-tick--halo { opacity: 0; }
.lilt-efd-tick--halo { stroke-width: 4; }

/* ---------- Knob ---------- */

.lilt-efd-glow {
  position: absolute;
  left: calc(${CX - 62} * var(--u));
  top: calc(${CY + 66} * var(--u));
  width: calc(124 * var(--u));
  height: calc(30 * var(--u));
  border-radius: 50%;
  background: linear-gradient(90deg, #a8b5ff, var(--lilt-efd-now) 60%, var(--lilt-efd-now));
  filter: blur(calc(15 * var(--u)));
  opacity: 0.5;
}
.lilt-efd-knob {
  position: absolute;
  left: calc(${CX - 86} * var(--u));
  top: calc(${CY - 86} * var(--u));
  width: calc(172 * var(--u));
  height: calc(172 * var(--u));
  border-radius: 50%;
  cursor: grab;
  touch-action: none;
  outline: none;
}
.lilt-efd-knob[data-dragging] { cursor: grabbing; }
.lilt-efd-knob:focus-visible { box-shadow: 0 0 0 calc(3 * var(--u)) var(--lilt-efd-focus); }
.lilt-efd-knob > span { position: absolute; border-radius: 50%; }

/* The skirt: a lit top edge, a thin gray sliver at the bottom, one soft shadow underneath */
.lilt-efd-skirt {
  inset: 0;
  background: linear-gradient(180deg, var(--lilt-efd-skirt-a) 8%, var(--lilt-efd-skirt-b) 100%);
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-efd-ring),
    inset 0 calc(-3 * var(--u)) 0 var(--lilt-efd-sliver),
    inset 0 calc(1.5 * var(--u)) 0 var(--lilt-efd-cap-light),
    var(--lilt-efd-shadow);
}
/* Everything that turns with the knob: the fine grip and the light on its edge */
.lilt-efd-turn { inset: 0; will-change: transform; }
.lilt-efd-grip {
  position: absolute;
  inset: calc(4 * var(--u));
  border-radius: 50%;
  background: repeating-conic-gradient(var(--lilt-efd-groove) 0deg 1.2deg, transparent 1.2deg 5deg);
  /* Only a ring of it shows, fading out towards the rim */
  -webkit-mask: radial-gradient(closest-side, transparent 80%, #000 84%, #000 93%, transparent 100%);
  mask: radial-gradient(closest-side, transparent 80%, #000 84%, #000 93%, transparent 100%);
}
.lilt-efd-led {
  position: absolute;
  left: 50%;
  top: calc(5.5 * var(--u));
  width: calc(5 * var(--u));
  height: calc(11 * var(--u));
  margin-left: calc(-2.5 * var(--u));
  border-radius: 999px;
  background: var(--lilt-efd-now);
  box-shadow: 0 0 calc(7 * var(--u)) var(--lilt-efd-now), 0 0 0 calc(1.5 * var(--u)) var(--lilt-efd-skirt-a);
}
/* The cap stays put while the knob turns, like brushed metal under a fixed light */
.lilt-efd-cap {
  inset: calc(21 * var(--u));
  background:
    radial-gradient(closest-side, transparent 55%, var(--lilt-efd-cap-light) 140%),
    conic-gradient(from 20deg, var(--lilt-efd-cap-a), var(--lilt-efd-cap-b) 12%, var(--lilt-efd-cap-c) 25%, var(--lilt-efd-cap-b) 38%, var(--lilt-efd-cap-a) 50%, var(--lilt-efd-cap-b) 62%, var(--lilt-efd-cap-c) 75%, var(--lilt-efd-cap-b) 88%, var(--lilt-efd-cap-a));
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-efd-cap-edge),
    0 calc(3 * var(--u)) calc(5 * var(--u)) calc(-1 * var(--u)) var(--lilt-efd-well),
    inset 0 calc(1.5 * var(--u)) 0 var(--lilt-efd-cap-light),
    inset 0 calc(-1 * var(--u)) 0 var(--lilt-efd-cap-edge);
}

/* ---------- Readout, in the open gap of the arc ---------- */

.lilt-efd-readout {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(${CY + 110} * var(--u));
  display: grid;
  justify-items: center;
  gap: calc(3 * var(--u));
  pointer-events: none;
}
.lilt-efd-caption {
  font-size: calc(12.5 * var(--u));
  line-height: 1.3;
  letter-spacing: 0;
  color: var(--lilt-efd-muted);
}
.lilt-efd-value {
  display: grid;
  height: calc(28 * var(--u));
  font-size: calc(22 * var(--u));
  font-weight: 500;
  line-height: calc(28 * var(--u));
  letter-spacing: -0.02em;
  color: var(--lilt-efd-text);
}
.lilt-efd-word { animation: lilt-efd-in 460ms var(--lilt-efd-ease) both; }
.lilt-efd-word[data-dir="down"] { animation-name: lilt-efd-in-down; }
@keyframes lilt-efd-in {
  from { opacity: 0; transform: translateY(calc(9 * var(--u))); filter: blur(calc(3 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}
@keyframes lilt-efd-in-down {
  from { opacity: 0; transform: translateY(calc(-9 * var(--u))); filter: blur(calc(3 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lilt-efd-word { animation: none; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-efd {
  --lilt-efd-tick: rgba(255, 255, 255, 0.13);
  --lilt-efd-text: #f4f4f2;
  --lilt-efd-muted: #8c8c87;
  --lilt-efd-ring: rgba(255, 255, 255, 0.09);
  --lilt-efd-skirt-a: #3a3a40;
  --lilt-efd-skirt-b: #1c1c1a;
  --lilt-efd-sliver: #17171a;
  --lilt-efd-groove: rgba(0, 0, 0, 0.34);
  --lilt-efd-cap-a: #3b3b41;
  --lilt-efd-cap-b: #29292d;
  --lilt-efd-cap-c: #323237;
  --lilt-efd-cap-edge: rgba(0, 0, 0, 0.4);
  --lilt-efd-cap-light: rgba(255, 255, 255, 0.1);
  --lilt-efd-shadow: 0 calc(22 * var(--u)) calc(34 * var(--u)) calc(-12 * var(--u)) rgba(0, 0, 0, 0.7), 0 calc(5 * var(--u)) calc(10 * var(--u)) rgba(0, 0, 0, 0.35);
  --lilt-efd-well: rgba(0, 0, 0, 0.5);
  --lilt-efd-focus: rgba(255, 255, 255, 0.3);
}
`;
