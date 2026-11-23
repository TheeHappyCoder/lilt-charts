'use client';

import { motion } from 'motion/react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { DynamicIsland } from '../dynamic-island';
import { NumberRoll } from '../number-roll';

type View = 'idle' | 'silent' | 'timer' | 'upload' | 'call';

const SCRIPT: readonly [View, number][] = [
  ['idle', 1600],
  ['silent', 2200],
  ['timer', 3400],
  ['upload', 3200],
  ['call', 4200],
];

const ORANGE = '#ff9f0a';
const BLUE = '#4ea2ff';
const TWO_DIGITS: Intl.NumberFormatOptions = { minimumIntegerDigits: 2 };
const PERCENT: Intl.NumberFormatOptions = { style: 'percent', maximumFractionDigits: 0 };

const POOLS: Record<View, { gradient: string; opacity: number }> = {
  idle: { gradient: 'linear-gradient(90deg, #9fadff, #c8a8e8)', opacity: 0.14 },
  silent: { gradient: 'linear-gradient(90deg, #ff9f0a, #ffb89e)', opacity: 0.44 },
  timer: { gradient: 'linear-gradient(90deg, #ff9f0a, #ff7062)', opacity: 0.46 },
  upload: { gradient: 'linear-gradient(90deg, #4ea2ff, #a3b1ff)', opacity: 0.48 },
  call: { gradient: 'linear-gradient(90deg, #c8a8e8, #30d158)', opacity: 0.46 },
};

/** The docs stage's island: plays a phone's afternoon, or holds one view. */
export function DynamicIslandDemo({
  view = 'call',
  cycle = true,
  style,
}: {
  view?: View;
  cycle?: boolean;
  style?: CSSProperties;
}) {
  const [step, setStep] = useState(0);
  const [hungUp, setHungUp] = useState(false);
  useEffect(() => {
    if (!cycle) return;
    const timer = setTimeout(() => {
      setHungUp(false);
      setStep((s) => (s + 1) % SCRIPT.length);
    }, SCRIPT[step]![1]);
    return () => clearTimeout(timer);
  }, [cycle, step]);
  useEffect(() => setHungUp(false), [view]);

  const scripted = cycle ? SCRIPT[step]![0] : view;
  const shown = hungUp ? 'idle' : scripted;
  const pool = POOLS[shown];

  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        minHeight: 132,
        isolation: 'isolate',
        ...style,
      }}
    >
      {/* Ambient state-tinted light pool beneath the obsidian island */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: shown === 'call' ? 280 : 180,
          height: 44,
          borderRadius: '50%',
          background: pool.gradient,
          filter: 'blur(26px)',
          opacity: pool.opacity,
          transform: 'translateY(22px)',
          pointerEvents: 'none',
          zIndex: 0,
          transition:
            'width 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease, background 500ms ease',
        }}
      />
      <DynamicIsland view={shown} style={{ position: 'relative', zIndex: 1 }}>
        {shown === 'silent' ? (
          <Silent />
        ) : shown === 'timer' ? (
          <Timer />
        ) : shown === 'upload' ? (
          <Upload />
        ) : shown === 'call' ? (
          <Call onAnswer={() => setHungUp(true)} />
        ) : (
          <Idle />
        )}
      </DynamicIsland>
    </div>
  );
}

/** Resting hardware pill with a subtle recessed optical camera lens reflection. */
function Idle() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 122,
        height: 36,
        padding: '0 11px',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          width: 13,
          height: 13,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 36%, #2a3354 0%, #101322 52%, #05060a 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: 'rgba(154, 184, 255, 0.55)',
          }}
        />
      </span>
    </div>
  );
}

function Compact({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 28,
        height: 38,
        padding: '0 14px 0 8px',
        fontSize: 13.5,
        fontWeight: 600,
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </div>
  );
}

function Silent() {
  return (
    <Compact>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 36,
          height: 24,
          borderRadius: 12,
          background: `linear-gradient(180deg, #ffb43b, ${ORANGE})`,
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 0 12px rgba(255, 159, 10, 0.45)',
          color: '#fff',
        }}
      >
        <Glyph size={13}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          <path d="M3 3l18 18" />
        </Glyph>
      </span>
      <span style={{ color: ORANGE, paddingRight: 2 }}>Silent</span>
    </Compact>
  );
}

function Timer() {
  const [left, setLeft] = useState(4 * 60 + 59);
  useEffect(() => {
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Compact>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: `color-mix(in srgb, ${ORANGE} 22%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${ORANGE} 35%, transparent)`,
          color: ORANGE,
        }}
      >
        <Glyph size={14}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 1.5M10 2h4" />
        </Glyph>
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          color: ORANGE,
          fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {Math.floor(left / 60)}:
        <NumberRoll value={left % 60} format={TWO_DIGITS} locales="en-US" />
      </span>
    </Compact>
  );
}

function Upload() {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setDone((p) => Math.min(1, p + 0.035)), 70);
    return () => clearInterval(timer);
  }, []);
  return (
    <Compact>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <svg
          width={22}
          height={22}
          viewBox="0 0 22 22"
          fill="none"
          style={{
            rotate: '-90deg',
            filter: 'drop-shadow(0 0 5px rgba(78, 162, 255, 0.55))',
          }}
        >
          <circle cx="11" cy="11" r="9" stroke={BLUE} strokeOpacity={0.24} strokeWidth={2.5} />
          <motion.circle
            cx="11"
            cy="11"
            r="9"
            stroke={BLUE}
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: done }}
            transition={{ duration: 0.12, ease: 'linear' }}
          />
        </svg>
        <span>Uploading 3 files</span>
      </span>
      <span style={{ color: BLUE, fontVariantNumeric: 'tabular-nums' }}>
        <NumberRoll value={done} format={PERCENT} locales="en-US" />
      </span>
    </Compact>
  );
}

function Call({ onAnswer }: { onAnswer: () => void }) {
  const round = (top: string, bottom: string, glow: string, label: string, turn: number) => (
    <button
      type="button"
      aria-label={label}
      onClick={onAnswer}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 44,
        height: 44,
        padding: 0,
        border: 0,
        borderRadius: '50%',
        background: `linear-gradient(180deg, ${top}, ${bottom})`,
        boxShadow: `inset 0 1.5px 0 rgba(255, 255, 255, 0.34), 0 6px 16px -4px ${glow}`,
        color: '#fff',
        cursor: 'pointer',
      }}
    >
      <Glyph size={22} strokeWidth={3.6} style={{ rotate: `${turn}deg` }}>
        <path d="M6.5 3.8c-2.9 1.6-3.4 6.8 1.3 12s10.4 5.9 12.4 3" />
        <path d="M6.5 3.8l2.6 4.4M19.9 19l-4.6-2.4" />
      </Glyph>
    </button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, width: 344 }}>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #9fadff, #c8a8e8 52%, #ffa3ae)',
          boxShadow:
            'inset 0 1.5px 0 rgba(255, 255, 255, 0.42), 0 0 0 2px rgba(255, 255, 255, 0.1)',
          fontSize: 15,
          fontWeight: 650,
          textShadow: '0 1px 2px rgba(15, 20, 40, 0.25)',
        }}
      >
        AO
      </span>
      <span style={{ display: 'grid', gap: 1, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.52)', letterSpacing: '0.01em' }}>
          mobile
        </span>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Ada Okafor</span>
      </span>
      {round('#ff5e57', '#e5332a', 'rgba(255, 59, 48, 0.55)', 'Decline', 135)}
      {round('#4be06f', '#24b84b', 'rgba(48, 209, 88, 0.55)', 'Accept', 0)}
    </div>
  );
}

function Glyph({
  size,
  strokeWidth = 2.2,
  style,
  children,
}: {
  size: number;
  strokeWidth?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </svg>
  );
}
