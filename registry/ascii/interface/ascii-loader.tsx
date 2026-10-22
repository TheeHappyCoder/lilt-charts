'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { approach, clamp, hash3 } from '../engine/noise';
import { MONO_STACK, useClock, useReducedMotion } from './motion';

export type AsciiLoaderVariant = 'spinner' | 'dots' | 'bar' | 'scramble';

export interface AsciiLoaderProps {
  /** How it loads: a turning stroke, counting dots, a bar of type, or its label scrambling. Default `bar`. */
  variant?: AsciiLoaderVariant;
  /** Progress from 0 to 1. Given, the bar fills to it and reads out a percentage; without it, the bar sweeps. */
  value?: number;
  /** What is loading, read by screen readers and shown beside the spinner, dots and scramble. Default `Loading`. */
  label?: string;
  /** Characters across the bar, between its brackets. Default 24. */
  width?: number;
  /** Colour of the bar's fill and the moving parts. Default the inherited text colour. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

const SPINNER = ['|', '/', '-', '\\'];
/** What the label shimmers through: quiet, narrow strokes rather than heavy symbols. */
const SHIMMER = '/\\|=+<>:;*~';

const hidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

/** Eases a shown value toward a target, so a jump in progress fills rather than snaps. */
function useEased(target: number, animate: boolean) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (!animate) {
      current.current = target;
      setShown(target);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      current.current = approach(current.current, target, 9, dt);
      if (Math.abs(current.current - target) < 0.002) current.current = target;
      setShown(current.current);
      if (current.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate]);
  return shown;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * A loader made of type: a turning stroke, counting dots, a progress bar, or its label scrambling
 * like a skeleton. Real text in a monospace face, so its width never jitters. Determinate bars are
 * progress bars to assistive technology; everything else is a status that reads its label.
 */
export function AsciiLoader({
  variant = 'bar',
  value,
  label = 'Loading',
  width = 24,
  color,
  className,
  style,
}: AsciiLoaderProps) {
  const reduced = useReducedMotion();
  const determinate = variant === 'bar' && typeof value === 'number' && Number.isFinite(value);
  const target = determinate ? clamp(value, 0, 1) : 0;
  const shown = useEased(target, determinate && !reduced);
  const fps = variant === 'spinner' ? 10 : variant === 'dots' ? 4 : 30;
  const time = useClock(!reduced && !determinate, fps);
  const cells = Math.max(4, Math.round(width));
  const accent = color ?? 'currentColor';

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '1ch',
    fontFamily: `var(--lilt-ascii-font, ${MONO_STACK})`,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'pre',
    lineHeight: 1.4,
    ...style,
  };
  const dim = (opacity: number): CSSProperties => ({ opacity });
  const name = className ? `lilt-ascii-loader ${className}` : 'lilt-ascii-loader';

  if (determinate) {
    const percent = Math.round(target * 100);
    // The fill eases toward its value and can overshoot a little; the track always holds it.
    const filled = Math.max(0, Math.min(cells, Math.round(shown * cells)));
    return (
      <span
        className={name}
        style={base}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span aria-hidden="true">
          <span style={dim(0.45)}>[</span>
          <span style={{ color: accent }}>{'#'.repeat(filled)}</span>
          <span style={dim(0.28)}>{'-'.repeat(cells - filled)}</span>
          <span style={dim(0.45)}>]</span>
        </span>
        <span aria-hidden="true" style={dim(0.7)}>
          {`${String(Math.round(shown * 100)).padStart(3, ' ')}%`}
        </span>
      </span>
    );
  }

  let picture: ReactNode;
  let caption = true;
  if (variant === 'spinner') {
    const glyph = reduced ? '*' : SPINNER[Math.floor(time * 10) % SPINNER.length]!;
    picture = <span style={{ color: accent }}>{glyph}</span>;
  } else if (variant === 'dots') {
    const count = reduced ? 3 : Math.floor(time * 4) % 4;
    picture = (
      <span>
        <span style={dim(0.7)}>{label}</span>
        <span style={{ color: accent }}>{'.'.repeat(count).padEnd(3, ' ')}</span>
      </span>
    );
    caption = false;
  } else if (variant === 'bar') {
    // An indeterminate sweep: a segment easing back and forth along the track.
    const segment = Math.max(3, Math.round(cells * 0.28));
    const phase = (time / 1.5) % 2;
    const along = ease(phase < 1 ? phase : 2 - phase);
    const start = reduced ? -segment : Math.round(along * (cells - segment));
    const glyphs = Array.from({ length: cells }, (_, i) => i >= start && i < start + segment);
    picture = (
      <span>
        <span style={dim(0.45)}>[</span>
        {runs(glyphs).map(([on, length], i) =>
          on ? (
            <span key={i} style={{ color: accent }}>
              {'#'.repeat(length)}
            </span>
          ) : (
            <span key={i} style={dim(0.28)}>
              {'-'.repeat(length)}
            </span>
          ),
        )}
        <span style={dim(0.45)}>]</span>
      </span>
    );
  } else {
    // The label as a skeleton: dim letters, with a band of scrambling glyphs washing through
    // and the letters it passes lighting up behind it.
    const n = label.length;
    const period = n + 10;
    const head = ((time * 14) % period) - 3;
    const tick = Math.floor(time * 18);
    picture = (
      <span>
        {Array.from(label, (ch, i) => {
          if (reduced || ch === ' ') {
            return (
              <span key={i} style={dim(0.45)}>
                {ch}
              </span>
            );
          }
          const d = head - i;
          if (d >= 0 && d < 2.5) {
            const g = SHIMMER[Math.floor(hash3(i, tick, 3) * SHIMMER.length)]!;
            return (
              <span key={i} style={{ color: accent, opacity: 0.95 }}>
                {g}
              </span>
            );
          }
          const glow = d < 0 ? 0 : Math.max(0, 1 - (d - 2.5) / 5);
          return (
            <span key={i} style={dim(0.32 + 0.6 * glow)}>
              {ch}
            </span>
          );
        })}
      </span>
    );
    caption = false;
  }

  return (
    <span className={name} style={base} role="status" aria-live="polite">
      <span style={hidden}>{label}</span>
      <span aria-hidden="true">{picture}</span>
      {caption ? (
        <span aria-hidden="true" style={dim(0.7)}>
          {label}
        </span>
      ) : null}
    </span>
  );
}

/** Groups a row of on and off cells into runs, so a bar is a handful of spans. */
function runs(cells: readonly boolean[]): [boolean, number][] {
  const out: [boolean, number][] = [];
  for (const on of cells) {
    const last = out[out.length - 1];
    if (last && last[0] === on) last[1]++;
    else out.push([on, 1]);
  }
  return out;
}
