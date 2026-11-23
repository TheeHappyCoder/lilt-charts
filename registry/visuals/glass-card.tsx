'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';

/*
 * Glass Card – a frosted payment card floating in space, in a single self-contained file.
 * One card, tilted in 3D, swaying slowly from side to side. Every few seconds a band of
 * holographic light crosses it; the pastel light pooled on the floor drifts the other way.
 * Hover the scene and the card stops swaying and leans toward the pointer.
 * The artwork is laid out on a 600 × 400 grid inside a 3 : 2 frame and scales with its container.
 */

export type GlassCardProps = {
  /** Wordmark in the card's top left corner */
  brand?: string;
  /** Name embossed along the bottom */
  holder?: string;
  /** The four digits left readable */
  last4?: string;
  /** Expiry, e.g. "09/29" */
  expiry?: string;
  className?: string;
  /** Accessible description of the scene */
  label?: string;
};

/** A frosted glass payment card tilting in 3D as a holographic sheen crosses it. */
export function GlassCard({
  brand = 'Lilt',
  holder = 'Maya Okafor',
  last4 = '4242',
  expiry = '09/29',
  className,
  label = 'A frosted glass payment card tilts slowly in space while a band of pastel light passes over it',
}: GlassCardProps) {
  const root = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  const [hover, setHover] = useState(false);

  // Sways only while on screen
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPlay(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The card leans toward the pointer: -1 … 1 on both axes, written straight to CSS
  const lean = (e: PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    el.style.setProperty('--lilt-gcd-px', x.toFixed(3));
    el.style.setProperty('--lilt-gcd-py', y.toFixed(3));
    setHover(true);
  };
  const rest = () => {
    const el = root.current;
    if (el) {
      el.style.setProperty('--lilt-gcd-px', '0');
      el.style.setProperty('--lilt-gcd-py', '0');
    }
    setHover(false);
  };

  return (
    <div
      ref={root}
      className={['lilt-gcd', className].filter(Boolean).join(' ')}
      data-play={play || undefined}
      data-hover={hover || undefined}
      onPointerMove={lean}
      onPointerLeave={rest}
      role="img"
      aria-label={label}
    >
      {/* React 19 hoists this into <head> once, no matter how many instances render */}
      <style href="lilt-glass-card" precedence="default">
        {css}
      </style>

      {/* Light and shadow on the floor */}
      <div className="lilt-gcd-floor" aria-hidden="true">
        <span className="lilt-gcd-shade" />
        <span className="lilt-gcd-pool" />
      </div>

      <div className="lilt-gcd-scene" aria-hidden="true">
        <div className="lilt-gcd-sway">
          <div className="lilt-gcd-card">
            <span className="lilt-gcd-tint" />
            <span className="lilt-gcd-sheen" />

            <div className="lilt-gcd-brand">
              <svg viewBox="0 0 16 16">
                <path d="M8 1.500c1.500 0 2.400 1.900 2.400 4.100 2.200 0 4.100.9 4.100 2.400s-1.900 2.400-4.100 2.400c0 2.200-.9 4.100-2.400 4.100s-2.400-1.900-2.400-4.100c-2.200 0-4.100-.9-4.100-2.400s1.900-2.400 4.100-2.400c0-2.200.9-4.100 2.400-4.100Z" />
              </svg>
              <span>{brand}</span>
            </div>
            <svg className="lilt-gcd-wave" viewBox="0 0 18 18">
              <path d="M5.200 6.600a4.200 4.200 0 0 1 0 4.800M8.300 4.600a7.400 7.400 0 0 1 0 8.800M11.400 2.600a10.800 10.800 0 0 1 0 12.800" />
            </svg>

            <span className="lilt-gcd-chip">
              <svg viewBox="0 0 40 30" preserveAspectRatio="none">
                <path d="M0 10.500h12.500M0 19.500h12.500M27.500 10.500H40M27.500 19.500H40M12.500 0v30M27.500 0v30M12.500 15h15" />
              </svg>
            </span>

            <div className="lilt-gcd-number">
              <span>••••</span>
              <span>••••</span>
              <span>••••</span>
              <span className="lilt-gcd-last">{last4}</span>
            </div>

            <div className="lilt-gcd-foot">
              <span>{holder}</span>
              <span className="lilt-gcd-exp">{expiry}</span>
            </div>

            <span className="lilt-gcd-rim" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
.lilt-gcd {
  /* 1 unit of the 600 × 400 layout grid */
  --u: calc(100cqw / 600);
  --lilt-gcd-px: 0;
  --lilt-gcd-py: 0;
  --lilt-gcd-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(244, 245, 251, 0.94) 55%, rgba(236, 238, 249, 0.94));
  --lilt-gcd-ring: rgba(10, 10, 10, 0.07);
  --lilt-gcd-top: rgba(255, 255, 255, 1);
  --lilt-gcd-sliver: rgba(214, 218, 232, 0.7);
  --lilt-gcd-shadow: 0 calc(30 * var(--u)) calc(50 * var(--u)) calc(-22 * var(--u)) rgba(15, 20, 40, 0.22), 0 calc(4 * var(--u)) calc(10 * var(--u)) rgba(15, 20, 40, 0.05);
  --lilt-gcd-ink: #1a1a18;
  --lilt-gcd-text: #62656d;
  --lilt-gcd-muted: #a3a6ad;
  --lilt-gcd-tint-a: 0.3;
  --lilt-gcd-sheen-a: 0.85;
  --lilt-gcd-rim-a: rgba(255, 255, 255, 0.95);
  --lilt-gcd-chip: linear-gradient(140deg, #fbfbfc, #dcdee5 45%, #f1f2f5 70%, #cfd2da);
  --lilt-gcd-chip-line: rgba(60, 66, 84, 0.26);
  --lilt-gcd-chip-ring: rgba(40, 46, 66, 0.16);
  --lilt-gcd-pool: 0.55;
  --lilt-gcd-shade: rgba(15, 20, 40, 0.16);
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  container-type: inline-size;
  font-family: var(--font-ui, inherit), ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lilt-gcd *, .lilt-gcd *::before, .lilt-gcd *::after { box-sizing: border-box; margin: 0; }

/* ---------- Floor ---------- */

.lilt-gcd-floor {
  position: absolute;
  left: calc(170 * var(--u));
  top: calc(302 * var(--u));
  width: calc(260 * var(--u));
  height: calc(40 * var(--u));
  transform: translateX(calc(var(--lilt-gcd-px) * -16 * var(--u)));
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
}
.lilt-gcd-shade, .lilt-gcd-pool { position: absolute; border-radius: 50%; }
.lilt-gcd-shade {
  inset: calc(4 * var(--u)) 14% auto;
  height: calc(12 * var(--u));
  background: var(--lilt-gcd-shade);
  filter: blur(calc(9 * var(--u)));
}
.lilt-gcd-pool {
  inset: 0;
  background: linear-gradient(90deg, #ffa3ae, #ffb99f 34%, #c8a8e8 68%, #a3b1ff);
  filter: blur(calc(20 * var(--u)));
  opacity: var(--lilt-gcd-pool);
}

/* ---------- Card in space ---------- */

.lilt-gcd-scene {
  position: absolute;
  left: calc(150 * var(--u));
  top: calc(92 * var(--u));
  width: calc(300 * var(--u));
  height: calc(190 * var(--u));
  perspective: calc(900 * var(--u));
}
.lilt-gcd-sway {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(9deg) rotateY(-15deg) rotateZ(-1.500deg);
}
.lilt-gcd-card {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: calc(20 * var(--u));
  background: var(--lilt-gcd-bg);
  box-shadow:
    0 0 0 calc(1 * var(--u)) var(--lilt-gcd-ring),
    inset 0 calc(1.500 * var(--u)) 0 var(--lilt-gcd-top),
    inset 0 calc(-3 * var(--u)) 0 var(--lilt-gcd-sliver),
    var(--lilt-gcd-shadow);
  transform: rotateX(calc(var(--lilt-gcd-py) * -9deg)) rotateY(calc(var(--lilt-gcd-px) * 13deg));
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
}
/* Color caught inside the glass */
.lilt-gcd-tint {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(62% 90% at 92% 112%, rgb(150 166 255 / 0.95), transparent 70%),
    radial-gradient(52% 74% at 4% -14%, rgb(255 178 150 / 0.75), transparent 70%),
    radial-gradient(44% 66% at 58% 118%, rgb(205 168 236 / 0.8), transparent 70%);
  opacity: var(--lilt-gcd-tint-a);
}
/* The holographic band – resting off to the right, crossing the card while it plays */
.lilt-gcd-sheen {
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: 0;
  width: 92%;
  background: linear-gradient(
    102deg,
    transparent 27%,
    rgb(255 160 171 / 0.22) 37%,
    rgb(255 198 170 / 0.34) 45%,
    rgb(255 255 255 / 0.8) 50%,
    rgb(200 168 232 / 0.34) 55%,
    rgb(163 177 255 / 0.24) 63%,
    transparent 73%
  );
  opacity: var(--lilt-gcd-sheen-a);
  transform: translateX(34%);
}
/* A rim of light: white where it faces up, pastel where it turns away */
.lilt-gcd-rim {
  position: absolute;
  inset: 0;
  padding: calc(1.200 * var(--u));
  border-radius: inherit;
  background: linear-gradient(135deg, var(--lilt-gcd-rim-a), transparent 30%, transparent 56%, #ffb9a0 74%, #c9abec 87%, #a3b1ff);
  -webkit-mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  pointer-events: none;
}

.lilt-gcd[data-play] .lilt-gcd-sway { animation: lilt-gcd-sway 9s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate; }
.lilt-gcd[data-play] .lilt-gcd-floor { animation: lilt-gcd-drift 9s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate; }
.lilt-gcd[data-play] .lilt-gcd-sheen { animation: lilt-gcd-sheen 6s cubic-bezier(0.4, 0, 0.3, 1) 600ms infinite both; }
.lilt-gcd[data-hover] .lilt-gcd-sway, .lilt-gcd[data-hover] .lilt-gcd-floor { animation-play-state: paused; }
@keyframes lilt-gcd-sway {
  from { transform: translateY(calc(2 * var(--u))) rotateX(9deg) rotateY(-15deg) rotateZ(-1.500deg); }
  to { transform: translateY(calc(-3 * var(--u))) rotateX(6deg) rotateY(13deg) rotateZ(1deg); }
}
@keyframes lilt-gcd-drift {
  from { margin-left: calc(12 * var(--u)); }
  to { margin-left: calc(-12 * var(--u)); }
}
@keyframes lilt-gcd-sheen {
  0% { transform: translateX(-76%); }
  42%, 100% { transform: translateX(86%); }
}

/* ---------- What is printed on it ---------- */

.lilt-gcd-brand {
  position: absolute;
  left: calc(24 * var(--u));
  top: calc(22 * var(--u));
  display: flex;
  align-items: center;
  gap: calc(7 * var(--u));
  font-size: calc(13.500 * var(--u));
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.015em;
  color: var(--lilt-gcd-ink);
}
.lilt-gcd-brand svg { width: calc(16 * var(--u)); height: calc(16 * var(--u)); fill: var(--lilt-gcd-ink); }
.lilt-gcd-wave {
  position: absolute;
  right: calc(22 * var(--u));
  top: calc(20 * var(--u));
  width: calc(20 * var(--u));
  height: calc(20 * var(--u));
  fill: none;
  stroke: var(--lilt-gcd-muted);
  stroke-width: 1.400;
  stroke-linecap: round;
}
.lilt-gcd-chip {
  position: absolute;
  left: calc(24 * var(--u));
  top: calc(66 * var(--u));
  width: calc(40 * var(--u));
  height: calc(30 * var(--u));
  overflow: hidden;
  border-radius: calc(7 * var(--u));
  background: var(--lilt-gcd-chip);
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) var(--lilt-gcd-chip-ring),
    inset 0 calc(1 * var(--u)) 0 calc(1 * var(--u)) rgba(255, 255, 255, 0.5),
    0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(15, 20, 40, 0.1);
}
.lilt-gcd-chip svg { display: block; width: 100%; height: 100%; fill: none; stroke: var(--lilt-gcd-chip-line); stroke-width: 1; vector-effect: non-scaling-stroke; }
.lilt-gcd-number {
  position: absolute;
  left: calc(24 * var(--u));
  top: calc(116 * var(--u));
  display: flex;
  align-items: center;
  gap: calc(13 * var(--u));
  font-size: calc(17 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
  color: var(--lilt-gcd-muted);
}
.lilt-gcd-last { letter-spacing: 0.08em; color: var(--lilt-gcd-ink); }
.lilt-gcd-foot {
  position: absolute;
  left: calc(24 * var(--u));
  right: calc(24 * var(--u));
  bottom: calc(22 * var(--u));
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: calc(11 * var(--u));
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--lilt-gcd-text);
}
.lilt-gcd-exp { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  .lilt-gcd-sway, .lilt-gcd-floor, .lilt-gcd-sheen { animation: none !important; }
  .lilt-gcd-card, .lilt-gcd-floor { transition: none !important; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .lilt-gcd {
  --lilt-gcd-bg: linear-gradient(135deg, #414148, #2b2b30 52%, #232327);
  --lilt-gcd-ring: rgba(255, 255, 255, 0.08);
  --lilt-gcd-top: rgba(255, 255, 255, 0.16);
  --lilt-gcd-sliver: rgba(0, 0, 0, 0.3);
  --lilt-gcd-shadow: 0 calc(30 * var(--u)) calc(50 * var(--u)) calc(-22 * var(--u)) rgba(0, 0, 0, 0.75), 0 calc(4 * var(--u)) calc(10 * var(--u)) rgba(0, 0, 0, 0.3);
  --lilt-gcd-ink: #f4f4f2;
  --lilt-gcd-text: #b4b4ba;
  --lilt-gcd-muted: #85858c;
  --lilt-gcd-tint-a: 0.3;
  --lilt-gcd-sheen-a: 0.42;
  --lilt-gcd-rim-a: rgba(255, 255, 255, 0.4);
  --lilt-gcd-chip: linear-gradient(140deg, #8d8d96, #5c5c64 45%, #7b7b84 70%, #4d4d55);
  --lilt-gcd-chip-line: rgba(0, 0, 0, 0.4);
  --lilt-gcd-chip-ring: rgba(0, 0, 0, 0.4);
  --lilt-gcd-pool: 0.34;
  --lilt-gcd-shade: rgba(0, 0, 0, 0.55);
}
:where(.dark, [data-theme="dark"]) .lilt-gcd-chip {
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) var(--lilt-gcd-chip-ring),
    inset 0 calc(1 * var(--u)) 0 calc(1 * var(--u)) rgba(255, 255, 255, 0.18),
    0 calc(1 * var(--u)) calc(2 * var(--u)) rgba(0, 0, 0, 0.3);
}
`;
