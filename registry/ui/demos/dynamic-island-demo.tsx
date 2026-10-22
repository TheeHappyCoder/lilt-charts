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
const BLUE = '#0a84ff';
const TWO_DIGITS: Intl.NumberFormatOptions = { minimumIntegerDigits: 2 };
const PERCENT: Intl.NumberFormatOptions = { style: 'percent', maximumFractionDigits: 0 };

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

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 120, ...style }}>
      <DynamicIsland view={shown}>
        {shown === 'silent' ? (
          <Silent />
        ) : shown === 'timer' ? (
          <Timer />
        ) : shown === 'upload' ? (
          <Upload />
        ) : shown === 'call' ? (
          <Call onAnswer={() => setHungUp(true)} />
        ) : (
          <div style={{ width: 118, height: 36 }} />
        )}
      </DynamicIsland>
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
        height: 36,
        padding: '0 14px 0 8px',
        fontSize: 14,
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
          width: 34,
          height: 22,
          borderRadius: 11,
          background: ORANGE,
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
          color: ORANGE,
        }}
      >
        <Glyph size={14}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 1.5M10 2h4" />
        </Glyph>
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', color: ORANGE, fontSize: 15 }}>
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
        <svg width={22} height={22} viewBox="0 0 22 22" fill="none" style={{ rotate: '-90deg' }}>
          <circle cx="11" cy="11" r="9" stroke={BLUE} strokeOpacity={0.28} strokeWidth={2.5} />
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
      <span style={{ color: BLUE }}>
        <NumberRoll value={done} format={PERCENT} locales="en-US" />
      </span>
    </Compact>
  );
}

function Call({ onAnswer }: { onAnswer: () => void }) {
  const round = (tone: string, label: string, turn: number) => (
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
        background: tone,
        boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.25)',
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, width: 340 }}>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b6cff, #e5489c)',
          boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.22)',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        AO
      </span>
      <span style={{ display: 'grid', gap: 1, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: 'rgb(255 255 255 / 0.55)' }}>mobile</span>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Ada Okafor</span>
      </span>
      {round('#ff3b30', 'Decline', 135)}
      {round('#30d158', 'Accept', 0)}
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
