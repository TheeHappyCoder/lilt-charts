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

/** The docs stage's number: a clean revenue card that rolls to a new figure, or on a click. */
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
  const tone = up ? 'var(--nrd-up)' : 'var(--nrd-down)';
  const { format: options, scale } = FORMATS[format];

  return (
    <>
      <style href="lilt-ui-number-roll-demo" precedence="default">
        {css}
      </style>
      <button
        type="button"
        onClick={() => setIndex((i) => (i + 1) % VALUES.length)}
        aria-label="Roll to the next figure"
        className="lilt-nrd"
        style={style}
      >
        <span className="lilt-nrd-head">
          <span className="lilt-nrd-title">Revenue this month</span>
          <span className="lilt-nrd-hint">Click to roll</span>
        </span>
        <NumberRoll
          value={value * scale}
          format={options}
          locales="en-US"
          style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-0.04em' }}
        />
        <span className="lilt-nrd-foot">
          <span
            className="lilt-nrd-delta"
            style={{
              color: tone,
              background: `color-mix(in srgb, ${tone} 11%, transparent)`,
            }}
          >
            <motion.svg
              aria-hidden="true"
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
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
    </>
  );
}

const css = /* css */ `
.lilt-nrd {
  --nrd-bg: #ffffff;
  --nrd-hover: #fafaf8;
  --nrd-chip: #f4f4f2;
  --nrd-line: rgb(26 26 24 / 0.08);
  --nrd-muted: #6b6b66;
  --nrd-faint: #8c8c87;
  --nrd-up: #2d8a4e;
  --nrd-down: #d93848;
  --nrd-shadow: 0 1px 2px rgb(26 26 24 / 0.04);
  display: grid;
  gap: 10px;
  min-width: 316px;
  padding: 20px 22px;
  border: 1px solid var(--nrd-line);
  border-radius: 14px;
  background: var(--nrd-bg);
  box-shadow: var(--nrd-shadow);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-font-smoothing: antialiased;
  transition: background-color 160ms ease, transform 140ms ease;
}
:where(.dark, [data-theme="dark"]) .lilt-nrd {
  --nrd-bg: #181817;
  --nrd-hover: #1d1d1b;
  --nrd-chip: #111110;
  --nrd-line: rgb(244 244 242 / 0.09);
  --nrd-muted: #a3a39d;
  --nrd-faint: #73736e;
  --nrd-up: #5cc485;
  --nrd-down: #f05d6c;
  --nrd-shadow: 0 1px 2px rgb(0 0 0 / 0.28);
}
[data-theme="light"] .lilt-nrd {
  --nrd-bg: #ffffff;
  --nrd-hover: #fafaf8;
  --nrd-chip: #f4f4f2;
  --nrd-line: rgb(26 26 24 / 0.08);
  --nrd-muted: #6b6b66;
  --nrd-faint: #8c8c87;
  --nrd-up: #2d8a4e;
  --nrd-down: #d93848;
  --nrd-shadow: 0 1px 2px rgb(26 26 24 / 0.04);
}
.lilt-nrd:hover {
  background: var(--nrd-hover);
}
.lilt-nrd:active {
  transform: scale(0.99);
}

.lilt-nrd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.lilt-nrd-title {
  color: var(--nrd-muted);
  font-size: 13px;
  font-weight: 500;
}
.lilt-nrd-hint {
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--nrd-chip);
  color: var(--nrd-faint);
  font-size: 11.5px;
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
  height: 22px;
  padding: 0 7px 0 5px;
  border-radius: 6px;
  font-weight: 500;
  transition: color 240ms ease, background-color 240ms ease;
}
.lilt-nrd-sub {
  color: var(--nrd-faint);
}
`;
