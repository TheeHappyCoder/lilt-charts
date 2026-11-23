'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * Auto Toggle – one oversized, machined switch, in a single self-contained file.
 * A brushed-metal thumb sits in a deep pill-shaped well. When it flips on it slides across on a soft
 * spring, light floods the well from under the thumb – peach to violet to blue – and pools on the
 * surface below. The word under the switch rolls over to the new state. It flips by itself with long,
 * calm holds; click it (or press Space) to flip it yourself.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type AutoToggleProps = {
  /** Small muted line under the switch */
  caption?: string;
  /** Words for the two states */
  onWord?: string;
  offWord?: string;
  /** State to start in */
  defaultOn?: boolean;
  /** Milliseconds the switch stays on / off before it flips by itself */
  holdOn?: number;
  holdOff?: number;
  /** Called when the user flips the switch */
  onChange?: (on: boolean) => void;
  className?: string;
  /** Accessible name of the control */
  label?: string;
};

/* Geometry on the 600 × 400 grid */
const W = 232; // well
const H = 118;
const CX = 300;
const CY = 170;
const PAD = 9; // gap between well and thumb
const THUMB = H - PAD * 2;
const TRAVEL = W - THUMB - PAD * 2;

/** An oversized machined switch that flips on and floods its well with light. */
export function AutoToggle({
  caption = 'Autopilot',
  onWord = 'On',
  offWord = 'Off',
  defaultOn = false,
  holdOn = 3400,
  holdOff = 1900,
  onChange,
  className,
  label = 'Autopilot',
}: AutoToggleProps) {
  const root = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(defaultOn);
  // Bumped whenever the user flips it, so the auto loop waits a full hold again
  const [touched, setTouched] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Plays only while on screen
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reduced motion: it rests switched on, and only the user flips it
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setOn(true);
  }, []);

  useEffect(() => {
    if (!visible || hovered) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setOn((v) => !v), on ? holdOn : holdOff);
    return () => window.clearTimeout(timer);
  }, [on, visible, hovered, touched, holdOn, holdOff]);

  const flip = () => {
    const next = !on;
    setOn(next);
    setTouched((n) => n + 1);
    onChange?.(next);
  };

  return (
    <div
      ref={root}
      className={['lilt-atg', className].filter(Boolean).join(' ')}
      data-on={on || undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-auto-toggle" precedence="default">
        {css}
      </style>

      {/* Light pooling on the surface under the switch */}
      <span className="lilt-atg-pool" aria-hidden="true" />

      <button
        type="button"
        className="lilt-atg-switch"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={flip}
      >
        <span className="lilt-atg-bezel" aria-hidden="true" />
        <span className="lilt-atg-well" aria-hidden="true">
          {/* The light: it spreads from under the thumb */}
          <span className="lilt-atg-light" />
          <span className="lilt-atg-mark lilt-atg-mark--on" />
          <span className="lilt-atg-mark lilt-atg-mark--off" />
          <span className="lilt-atg-depth" />
        </span>
        <span className="lilt-atg-thumb" aria-hidden="true">
          <span className="lilt-atg-skirt" />
          <span className="lilt-atg-grip" />
          <span className="lilt-atg-cap" />
          <span className="lilt-atg-led" />
        </span>
      </button>

      <div className="lilt-atg-readout" aria-hidden="true">
        <span className="lilt-atg-caption">{caption}</span>
        <span className="lilt-atg-value">
          <span key={String(on)} className="lilt-atg-word" data-dir={on ? 'up' : 'down'}>
            {on ? onWord : offWord}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-atg {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-atg-text: #1a1a18;
  --lilt-atg-muted: #8c8c87;
  --lilt-atg-ring: rgba(10, 10, 10, 0.07);
  --lilt-atg-bezel-a: #ffffff;
  --lilt-atg-bezel-b: #eef0f4;
  --lilt-atg-bezel-sliver: #e1e4ea;
  --lilt-atg-bezel-shadow: 0 calc(20 * var(--u)) calc(34 * var(--u)) calc(-14 * var(--u)) rgba(15, 20, 40, 0.16), 0 calc(4 * var(--u)) calc(9 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-atg-well-a: #e4e7ec;
  --lilt-atg-well-b: #f1f3f6;
  --lilt-atg-well-edge: rgba(10, 15, 30, 0.1);
  --lilt-atg-well-shade: rgba(15, 20, 40, 0.17);
  --lilt-atg-well-lip: rgba(255, 255, 255, 0.9);
  --lilt-atg-mark: rgba(15, 20, 40, 0.2);
  --lilt-atg-mark-on: rgba(255, 255, 255, 0.9);
  --lilt-atg-light-a: 1;
  --lilt-atg-pool-a: 0.62;
  --lilt-atg-skirt-a: #ffffff;
  --lilt-atg-skirt-b: #eceef2;
  --lilt-atg-sliver: #dfe2e8;
  --lilt-atg-groove: rgba(15, 20, 30, 0.08);
  --lilt-atg-cap-a: #ffffff;
  --lilt-atg-cap-b: #eff0f3;
  --lilt-atg-cap-c: #f8f9fa;
  --lilt-atg-cap-edge: rgba(10, 10, 10, 0.06);
  --lilt-atg-cap-light: rgba(255, 255, 255, 0.95);
  --lilt-atg-thumb-shadow: 0 calc(10 * var(--u)) calc(16 * var(--u)) calc(-6 * var(--u)) rgba(15, 20, 40, 0.3), 0 calc(3 * var(--u)) calc(6 * var(--u)) rgba(15, 20, 40, 0.1);
  --lilt-atg-well-drop: rgba(15, 20, 40, 0.16);
  --lilt-atg-led-off: #d3d7de;
  --lilt-atg-focus: rgba(23, 23, 23, 0.22);
  --lilt-atg-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lilt-atg-spring: cubic-bezier(0.3, 1.36, 0.5, 1);
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
.lilt-atg *, .lilt-atg *::before, .lilt-atg *::after { box-sizing: border-box; }

/* ---------- Light under the switch ---------- */

.lilt-atg-pool {
  position: absolute;
  left: calc(${CX - 96} * var(--u));
  top: calc(${CY + H / 2 - 6} * var(--u));
  width: calc(192 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 50%;
  background: linear-gradient(90deg, #ffa3ae, #ffb99f 30%, #c8a8e8 64%, #a3b1ff);
  filter: blur(calc(20 * var(--u)));
  opacity: 0;
  transform: scale(0.7, 0.8);
  transition: opacity 900ms ease, transform 900ms var(--lilt-atg-ease);
}
.lilt-atg[data-on] .lilt-atg-pool {
  opacity: var(--lilt-atg-pool-a);
  transform: none;
  transition: opacity 900ms ease 160ms, transform 1100ms var(--lilt-atg-ease) 160ms;
}

/* ---------- Switch ---------- */

.lilt-atg-switch {
  position: absolute;
  left: calc(${CX - W / 2} * var(--u));
  top: calc(${CY - H / 2} * var(--u));
  width: calc(${W} * var(--u));
  height: calc(${H} * var(--u));
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  outline: none;
  appearance: none;
}
.lilt-atg-switch > span { position: absolute; border-radius: 999px; }
.lilt-atg-switch:focus-visible .lilt-atg-bezel { outline: calc(3 * var(--u)) solid var(--lilt-atg-focus); outline-offset: calc(2 * var(--u)); }

/* The housing: a slim machined collar around the well */
.lilt-atg-bezel {
  inset: calc(-7 * var(--u));
  background: linear-gradient(180deg, var(--lilt-atg-bezel-a) 10%, var(--lilt-atg-bezel-b) 100%);
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-atg-ring),
    inset 0 calc(-3 * var(--u)) 0 var(--lilt-atg-bezel-sliver),
    inset 0 calc(1.5 * var(--u)) 0 var(--lilt-atg-cap-light),
    var(--lilt-atg-bezel-shadow);
}
.lilt-atg-well {
  inset: 0;
  overflow: hidden;
  background: linear-gradient(180deg, var(--lilt-atg-well-a), var(--lilt-atg-well-b));
  box-shadow: 0 calc(1 * var(--u)) 0 var(--lilt-atg-well-lip);
}
.lilt-atg-well > span { position: absolute; }
.lilt-atg-light {
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.5), transparent 60%),
    linear-gradient(90deg, #ffc4cb, #ffd6c6 36%, #e2cbf0 66%, #c2cbff);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.5), transparent 60%),
    linear-gradient(90deg in oklab, #ffc4cb, #ffd6c6 36%, #e2cbf0 66%, #c2cbff);
  opacity: 0;
  clip-path: circle(calc(${THUMB / 2} * var(--u)) at calc(${PAD + THUMB / 2} * var(--u)) 50%);
  transition: clip-path 620ms var(--lilt-atg-ease), opacity 420ms ease 120ms;
}
.lilt-atg[data-on] .lilt-atg-light {
  opacity: var(--lilt-atg-light-a);
  clip-path: circle(calc(${W} * var(--u)) at calc(${PAD + THUMB / 2 + TRAVEL} * var(--u)) 50%);
  transition: clip-path 1100ms var(--lilt-atg-ease) 60ms, opacity 260ms ease;
}
/* Engraved marks: a bar where "on" lives, a ring where "off" lives */
.lilt-atg-mark { top: 50%; transition: opacity 500ms ease, background-color 500ms ease, border-color 500ms ease; }
.lilt-atg-mark--on {
  left: calc(${PAD + THUMB / 2 - 1.25} * var(--u));
  width: calc(2.5 * var(--u));
  height: calc(20 * var(--u));
  margin-top: calc(-10 * var(--u));
  border-radius: 999px;
  background: var(--lilt-atg-mark-on);
  opacity: 0;
}
.lilt-atg[data-on] .lilt-atg-mark--on { opacity: 1; transition-delay: 320ms; }
.lilt-atg-mark--off {
  left: calc(${PAD + TRAVEL + THUMB / 2 - 9} * var(--u));
  width: calc(18 * var(--u));
  height: calc(18 * var(--u));
  margin-top: calc(-9 * var(--u));
  border-radius: 50%;
  border: calc(2.5 * var(--u)) solid var(--lilt-atg-mark);
}
.lilt-atg[data-on] .lilt-atg-mark--off { opacity: 0; }
/* The well's depth: shade under its top lip, a hairline all round */
.lilt-atg-depth {
  inset: 0;
  border-radius: 999px;
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) var(--lilt-atg-well-edge),
    inset 0 calc(7 * var(--u)) calc(12 * var(--u)) calc(-4 * var(--u)) var(--lilt-atg-well-shade),
    inset 0 calc(2 * var(--u)) calc(3 * var(--u)) var(--lilt-atg-well-edge);
}

/* ---------- Thumb ---------- */

.lilt-atg-thumb {
  left: calc(${PAD} * var(--u));
  top: calc(${PAD} * var(--u));
  width: calc(${THUMB} * var(--u));
  height: calc(${THUMB} * var(--u));
  transition: transform 760ms var(--lilt-atg-spring);
  will-change: transform;
}
.lilt-atg[data-on] .lilt-atg-thumb { transform: translateX(calc(${TRAVEL} * var(--u))); }
.lilt-atg-switch:active .lilt-atg-thumb { transition-duration: 520ms; }
.lilt-atg-thumb > span { position: absolute; border-radius: 50%; }
.lilt-atg-skirt {
  inset: 0;
  background: linear-gradient(180deg, var(--lilt-atg-skirt-a) 8%, var(--lilt-atg-skirt-b) 100%);
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-atg-ring),
    inset 0 calc(-3 * var(--u)) 0 var(--lilt-atg-sliver),
    inset 0 calc(1.5 * var(--u)) 0 var(--lilt-atg-cap-light),
    var(--lilt-atg-thumb-shadow);
}
/* Fine knurling: only a ring of it shows, fading towards the rim */
.lilt-atg-grip {
  inset: calc(3 * var(--u));
  background: repeating-conic-gradient(var(--lilt-atg-groove) 0deg 1.6deg, transparent 1.6deg 6deg);
  -webkit-mask: radial-gradient(closest-side, transparent 78%, #000 83%, #000 93%, transparent 100%);
  mask: radial-gradient(closest-side, transparent 78%, #000 83%, #000 93%, transparent 100%);
}
/* Brushed metal under a fixed light */
.lilt-atg-cap {
  inset: calc(14 * var(--u));
  background:
    radial-gradient(closest-side, transparent 55%, var(--lilt-atg-cap-light) 140%),
    conic-gradient(from 20deg, var(--lilt-atg-cap-a), var(--lilt-atg-cap-b) 12%, var(--lilt-atg-cap-c) 25%, var(--lilt-atg-cap-b) 38%, var(--lilt-atg-cap-a) 50%, var(--lilt-atg-cap-b) 62%, var(--lilt-atg-cap-c) 75%, var(--lilt-atg-cap-b) 88%, var(--lilt-atg-cap-a));
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-atg-cap-edge),
    0 calc(3 * var(--u)) calc(5 * var(--u)) calc(-1 * var(--u)) var(--lilt-atg-well-drop),
    inset 0 calc(1.5 * var(--u)) 0 var(--lilt-atg-cap-light),
    inset 0 calc(-1 * var(--u)) 0 var(--lilt-atg-cap-edge);
}
/* A pin of light in the middle of the cap */
.lilt-atg-led {
  left: 50%;
  top: 50%;
  width: calc(7 * var(--u));
  height: calc(7 * var(--u));
  margin: calc(-3.5 * var(--u)) 0 0 calc(-3.5 * var(--u));
  background: var(--lilt-atg-led-off);
  box-shadow: 0 0 0 calc(1.5 * var(--u)) var(--lilt-atg-skirt-a), inset 0 calc(1 * var(--u)) calc(1 * var(--u)) rgba(0, 0, 0, 0.12);
  transition: background-color 500ms ease, box-shadow 700ms ease;
}
.lilt-atg[data-on] .lilt-atg-led {
  background: #b9a2f0;
  box-shadow: 0 0 0 calc(1.5 * var(--u)) var(--lilt-atg-skirt-a), 0 0 calc(9 * var(--u)) calc(1 * var(--u)) rgba(178, 150, 240, 0.85);
  transition-delay: 300ms;
}

/* ---------- Readout ---------- */

.lilt-atg-readout {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(${CY + H / 2 + 44} * var(--u));
  display: grid;
  justify-items: center;
  gap: calc(3 * var(--u));
  pointer-events: none;
}
.lilt-atg-caption {
  font-size: calc(12.5 * var(--u));
  line-height: 1.3;
  color: var(--lilt-atg-muted);
}
.lilt-atg-value {
  display: grid;
  height: calc(28 * var(--u));
  font-size: calc(22 * var(--u));
  font-weight: 500;
  line-height: calc(28 * var(--u));
  letter-spacing: -0.02em;
  color: var(--lilt-atg-text);
}
.lilt-atg-word { animation: lilt-atg-in 480ms var(--lilt-atg-ease) 140ms both; }
.lilt-atg-word[data-dir="down"] { animation-name: lilt-atg-in-down; }
@keyframes lilt-atg-in {
  from { opacity: 0; transform: translateY(calc(9 * var(--u))); filter: blur(calc(3 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}
@keyframes lilt-atg-in-down {
  from { opacity: 0; transform: translateY(calc(-9 * var(--u))); filter: blur(calc(3 * var(--u))); }
  to { opacity: 1; transform: none; filter: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lilt-atg-word { animation: none; }
  .lilt-atg-thumb, .lilt-atg-light, .lilt-atg-pool, .lilt-atg-led, .lilt-atg-mark { transition: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-atg {
  --lilt-atg-text: #f4f4f2;
  --lilt-atg-muted: #8c8c87;
  --lilt-atg-ring: rgba(255, 255, 255, 0.09);
  --lilt-atg-bezel-a: #34343a;
  --lilt-atg-bezel-b: #1c1c1a;
  --lilt-atg-bezel-sliver: #18181b;
  --lilt-atg-bezel-shadow: 0 calc(20 * var(--u)) calc(34 * var(--u)) calc(-14 * var(--u)) rgba(0, 0, 0, 0.7), 0 calc(4 * var(--u)) calc(9 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-atg-well-a: #121214;
  --lilt-atg-well-b: #19191c;
  --lilt-atg-well-edge: rgba(0, 0, 0, 0.5);
  --lilt-atg-well-shade: rgba(0, 0, 0, 0.6);
  --lilt-atg-well-lip: rgba(255, 255, 255, 0.07);
  --lilt-atg-mark: rgba(255, 255, 255, 0.16);
  --lilt-atg-mark-on: rgba(255, 255, 255, 0.85);
  --lilt-atg-light-a: 0.88;
  --lilt-atg-pool-a: 0.4;
  --lilt-atg-skirt-a: #3d3d43;
  --lilt-atg-skirt-b: #252528;
  --lilt-atg-sliver: #17171a;
  --lilt-atg-groove: rgba(0, 0, 0, 0.36);
  --lilt-atg-cap-a: #3b3b41;
  --lilt-atg-cap-b: #29292d;
  --lilt-atg-cap-c: #323237;
  --lilt-atg-cap-edge: rgba(0, 0, 0, 0.4);
  --lilt-atg-cap-light: rgba(255, 255, 255, 0.1);
  --lilt-atg-thumb-shadow: 0 calc(10 * var(--u)) calc(16 * var(--u)) calc(-6 * var(--u)) rgba(0, 0, 0, 0.75), 0 calc(3 * var(--u)) calc(6 * var(--u)) rgba(0, 0, 0, 0.4);
  --lilt-atg-well-drop: rgba(0, 0, 0, 0.5);
  --lilt-atg-led-off: #55555c;
  --lilt-atg-focus: rgba(255, 255, 255, 0.3);
}
`;
