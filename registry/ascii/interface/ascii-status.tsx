'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { rand, useSeen } from '../text/text-kit';
import { MONO_STACK, useReducedMotion } from './motion';

export type StatusLevel = 'up' | 'degraded' | 'down' | 'none';

export interface StatusDay {
  /** The day, as a date string such as '2026-10-22'. */
  date: string;
  status: StatusLevel;
  /** What happened, shown on hover. */
  note?: string;
}

export interface AsciiStatusProps {
  /** One entry a day, oldest first. Default 90 days of a mostly healthy service. */
  days?: readonly StatusDay[];
  /** The service's name. Default 'API'. */
  title?: string;
  /** Colours for each status. */
  colors?: Partial<Record<StatusLevel, string>>;
  /** Height of the bars in pixels. Default 30. */
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const COLORS: Record<StatusLevel, string> = {
  up: '#4cc38a',
  degraded: '#f5b544',
  down: '#ff6369',
  none: 'color-mix(in srgb, currentColor 18%, transparent)',
};

const WORDS: Record<StatusLevel, string> = {
  up: 'No incidents',
  degraded: 'Degraded performance',
  down: 'Outage',
  none: 'No data',
};

/** Ninety made-up days: mostly fine, with a wobble or two and one bad afternoon. */
function demoDays(): StatusDay[] {
  const today = new Date();
  return Array.from({ length: 90 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (89 - i));
    const date = day.toISOString().slice(0, 10);
    if (i === 23) return { date, status: 'down', note: 'Database failover took 14 minutes' };
    if (i === 24 || i === 61)
      return { date, status: 'degraded', note: 'Elevated latency in one region' };
    if (i === 77) return { date, status: 'degraded', note: 'Slow builds while a cache rebuilt' };
    return { date, status: 'up' };
  });
}

/** Glyphs a bar passes through as it fills in. */
const FILL = '░▒▓█';

/**
 * A status page's uptime rail: a bar a day, coloured by how the day went, with the uptime figure
 * beside it. When it first comes into view the bars fill in from the left through shades of type;
 * hover one to read the day and what happened.
 */
export function AsciiStatus({
  days,
  title = 'API',
  colors,
  height = 30,
  className,
  style,
}: AsciiStatusProps) {
  const [fallback] = useState(demoDays);
  const list = days ?? fallback;
  const palette = { ...COLORS, ...colors };
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const seen = useSeen(ref, !reduced);
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    if (!seen) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, reduced]);

  const known = list.filter((d) => d.status !== 'none');
  // A degraded day still counts as up; only an outage counts against it.
  const uptime = known.length ? known.filter((d) => d.status !== 'down').length / known.length : 1;
  const shownUptime = (uptime * 100 * progress).toFixed(2);
  const pick = active === null ? null : list[active];
  return (
    <div
      ref={ref}
      className={className}
      style={{ width: 'min(560px, 100%)', fontFamily: MONO_STACK, fontSize: 12.5, ...style }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <strong style={{ fontWeight: 600 }}>{title}</strong>
        <span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
          {shownUptime}% uptime
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        {pick ? (
          <div
            role="status"
            style={{
              position: 'absolute',
              bottom: height + 10,
              left: `clamp(0px, calc(${((active! + 0.5) / list.length) * 100}% - 110px), calc(100% - 220px))`,
              width: 220,
              padding: '7px 10px',
              borderRadius: 8,
              background: 'color-mix(in srgb, currentColor 10%, transparent)',
              backdropFilter: 'blur(10px)',
              lineHeight: 1.45,
              pointerEvents: 'none',
            }}
          >
            <div style={{ opacity: 0.6 }}>
              {new Date(`${pick.date}T12:00:00`).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            <div style={{ color: palette[pick.status] }}>{WORDS[pick.status]}</div>
            {pick.note ? <div style={{ opacity: 0.8 }}>{pick.note}</div> : null}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 2, height }} onPointerLeave={() => setActive(null)}>
          {list.map((day, i) => {
            // Each bar fills at its moment in a sweep from the left, through shades of type.
            const at = (i / list.length) * 0.75;
            const local = Math.max(0, Math.min(1, (progress - at) / 0.25));
            const filled = local >= 1;
            const glyph = FILL[Math.min(FILL.length - 1, Math.floor(local * FILL.length))]!;
            const lift = active === i;
            return (
              <button
                key={day.date + i}
                type="button"
                aria-label={`${day.date}: ${WORDS[day.status]}${day.note ? `. ${day.note}` : ''}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: 0,
                  border: 0,
                  borderRadius: 2,
                  background: filled ? palette[day.status] : 'transparent',
                  color: palette[day.status],
                  font: 'inherit',
                  fontSize: height * 0.9,
                  lineHeight: `${height}px`,
                  overflow: 'hidden',
                  cursor: 'default',
                  transform: lift ? 'scaleY(1.14)' : 'none',
                  transformOrigin: 'bottom',
                  opacity: active !== null && !lift ? 0.55 : 1,
                  transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 160ms',
                }}
              >
                {filled ? '' : local > 0 ? glyph : rand(i, 1, 2) > 0.5 ? '·' : ''}
              </button>
            );
          })}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          opacity: 0.45,
          fontSize: 11,
        }}
      >
        <span>{list.length} days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
