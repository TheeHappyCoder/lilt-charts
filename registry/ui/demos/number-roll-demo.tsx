'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { NumberRoll } from '../number-roll';

// A month's takings as they might move, crossing 100,000 so a column and a comma arrive.
const VALUES = [48_210.4, 52_904.18, 99_870.5, 102_336.75, 87_420, 9_640.25];

type Format = 'currency' | 'number' | 'percent' | 'compact';

const FORMATS: Record<Format, { format: Intl.NumberFormatOptions; scale: number }> = {
  currency: { format: { style: 'currency', currency: 'USD' }, scale: 1 },
  number: { format: { maximumFractionDigits: 0 }, scale: 1 },
  percent: { format: { style: 'percent', maximumFractionDigits: 1 }, scale: 1 / 120_000 },
  compact: { format: { notation: 'compact', maximumFractionDigits: 1 }, scale: 10 },
};
const CHANGE: Intl.NumberFormatOptions = {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'always',
};

/** The docs stage's number: a machined revenue card that rolls to a new figure, or on a click. */
export function NumberRollDemo({
  format = 'currency',
  cycle = true,
  style,
}: {
  format?: Format;
  cycle?: boolean;
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!cycle) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % VALUES.length), 2600);
    return () => clearTimeout(timer);
  }, [cycle, index]);

  const value = VALUES[index]!;
  const before = VALUES[(index + VALUES.length - 1) % VALUES.length]!;
  const change = (value - before) / before;
  const up = change >= 0;
  const tone = up ? '#32c484' : '#f05d6c';
  const { format: options, scale } = FORMATS[format];

  return (
    <>
      <style href="lilt-ui-number-roll-demo" precedence="default">
        {css}
      </style>
      <div className="lilt-nrd-wrap" data-up={up || undefined}>
        <span className="lilt-nrd-pool" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % VALUES.length)}
          aria-label="Roll to the next figure"
          className="lilt-nrd"
          style={style}
        >
          <span className="lilt-nrd-head">
            <span className="lilt-nrd-title">
              <span
                className="lilt-nrd-led"
                style={{ background: tone, boxShadow: `0 0 8px ${tone}` }}
              />
              Revenue this month
            </span>
            <span className="lilt-nrd-hint">Click to roll</span>
          </span>

          <span className="lilt-nrd-well">
            <NumberRoll
              value={value * scale}
              format={options}
              locales="en-US"
              style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-0.035em' }}
            />
          </span>

          <span className="lilt-nrd-foot">
            <span
              className="lilt-nrd-delta"
              style={{
                color: tone,
                background: `color-mix(in srgb, ${tone} 13%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 24%, transparent)`,
              }}
            >
              <motion.svg
                aria-hidden="true"
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={false}
                animate={{ rotate: up ? 0 : 180 }}
                transition={
                  reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }
                }
              >
                <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" />
              </motion.svg>
              <NumberRoll value={change} format={CHANGE} locales="en-US" />
            </span>
            <span className="lilt-nrd-sub">on last month</span>
          </span>
        </button>
      </div>
    </>
  );
}

const css = /* css */ `
.lilt-nrd-wrap {
  --nrd-a: #ffffff;
  --nrd-b: #f1f2f6;
  --nrd-ring: rgba(15, 20, 40, 0.085);
  --nrd-top: #ffffff;
  --nrd-lip: #dde0e8;
  --nrd-drop: 0 22px 40px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --nrd-well-a: #e8eaef;
  --nrd-well-b: #f5f6f9;
  --nrd-well-in: inset 0 2px 5px rgba(15, 20, 40, 0.1), inset 0 0 0 1px rgba(15, 20, 40, 0.05);
  --nrd-well-out: 0 1px 0 rgba(255, 255, 255, 0.92);
  --nrd-hint-bg: rgba(15, 20, 40, 0.045);
  position: relative;
  display: inline-grid;
  isolation: isolate;
}
:where(.dark, [data-theme="dark"]) .lilt-nrd-wrap {
  --nrd-a: #22242c;
  --nrd-b: #16181f;
  --nrd-ring: rgba(255, 255, 255, 0.1);
  --nrd-top: rgba(255, 255, 255, 0.11);
  --nrd-lip: rgba(0, 0, 0, 0.78);
  --nrd-drop: 0 24px 46px -18px rgba(0, 0, 0, 0.78), 0 3px 10px rgba(0, 0, 0, 0.42);
  --nrd-well-a: #0e0f14;
  --nrd-well-b: #14161d;
  --nrd-well-in: inset 0 2px 6px rgba(0, 0, 0, 0.72), inset 0 0 0 1px rgba(255, 255, 255, 0.055);
  --nrd-well-out: 0 1px 0 rgba(255, 255, 255, 0.06);
  --nrd-hint-bg: rgba(255, 255, 255, 0.06);
}
[data-theme="light"] .lilt-nrd-wrap {
  --nrd-a: #ffffff;
  --nrd-b: #f1f2f6;
  --nrd-ring: rgba(15, 20, 40, 0.085);
  --nrd-top: #ffffff;
  --nrd-lip: #dde0e8;
  --nrd-drop: 0 22px 40px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --nrd-well-a: #e8eaef;
  --nrd-well-b: #f5f6f9;
  --nrd-well-in: inset 0 2px 5px rgba(15, 20, 40, 0.1), inset 0 0 0 1px rgba(15, 20, 40, 0.05);
  --nrd-well-out: 0 1px 0 rgba(255, 255, 255, 0.92);
  --nrd-hint-bg: rgba(15, 20, 40, 0.045);
}

.lilt-nrd-pool {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: -14px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f05d6c, #ffb89e);
  filter: blur(20px);
  opacity: 0.36;
  pointer-events: none;
  z-index: 0;
  transition: background 480ms ease, opacity 480ms ease;
}
.lilt-nrd-wrap[data-up] .lilt-nrd-pool {
  background: linear-gradient(90deg, #32c484, #8fd6c0 55%, #a8b5ff);
}

.lilt-nrd {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
  min-width: 330px;
  padding: 16px 18px 18px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--nrd-a), var(--nrd-b));
  box-shadow:
    0 0 0 1px var(--nrd-ring),
    inset 0 1.5px 0 var(--nrd-top),
    inset 0 -2.5px 0 var(--nrd-lip),
    var(--nrd-drop);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-font-smoothing: antialiased;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.lilt-nrd:hover {
  transform: translateY(-1px);
}
.lilt-nrd:active {
  transform: translateY(1px) scale(0.99);
}

.lilt-nrd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.lilt-nrd-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 550;
  opacity: 0.64;
}
.lilt-nrd-led {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: background-color 280ms ease, box-shadow 280ms ease;
}
.lilt-nrd-hint {
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--nrd-hint-bg);
  font-size: 11px;
  font-weight: 500;
  opacity: 0.56;
}
.lilt-nrd-well {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, var(--nrd-well-a), var(--nrd-well-b));
  box-shadow: var(--nrd-well-in), var(--nrd-well-out);
}
.lilt-nrd-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
}
.lilt-nrd-delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 23px;
  padding: 0 8px 0 6px;
  border-radius: 7px;
  font-weight: 600;
  transition: color 240ms ease, background-color 240ms ease, box-shadow 240ms ease;
}
.lilt-nrd-sub {
  opacity: 0.48;
}
`;
