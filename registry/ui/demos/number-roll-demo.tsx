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

/** The docs stage's number: a revenue card that rolls to a new figure, or on a click. */
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
  const tone = up ? '#3ecf8e' : '#ff6369';
  const { format: options, scale } = FORMATS[format];

  return (
    <button
      type="button"
      onClick={() => setIndex((i) => (i + 1) % VALUES.length)}
      aria-label="Roll to the next figure"
      style={{
        display: 'grid',
        gap: 10,
        minWidth: 300,
        padding: '18px 22px 20px',
        borderRadius: 14,
        border: '1px solid color-mix(in srgb, currentColor 11%, transparent)',
        background:
          'linear-gradient(to bottom, color-mix(in srgb, currentColor 5%, transparent), color-mix(in srgb, currentColor 2%, transparent))',
        boxShadow:
          'inset 0 1px 0 color-mix(in srgb, currentColor 7%, transparent), 0 1px 2px rgb(0 0 0 / 0.16)',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        ...style,
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 500, opacity: 0.55 }}>Revenue this month</span>
      <NumberRoll
        value={value * scale}
        format={options}
        locales="en-US"
        style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.035em' }}
      />
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 22,
            padding: '0 7px 0 5px',
            borderRadius: 6,
            fontWeight: 600,
            color: tone,
            background: `color-mix(in srgb, ${tone} 13%, transparent)`,
            transition: 'color 240ms ease, background-color 240ms ease',
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
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }}
          >
            <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" />
          </motion.svg>
          <NumberRoll value={change} format={CHANGE} locales="en-US" />
        </span>
        <span style={{ opacity: 0.45 }}>on last month</span>
      </span>
    </button>
  );
}
