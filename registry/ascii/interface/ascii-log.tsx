'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { CODE_GLYPHS, frame, rand } from '../text/text-kit';
import { MONO_STACK, useReducedMotion } from './motion';

export type LogLevel = 'debug' | 'info' | 'ok' | 'warn' | 'error';

export interface LogLine {
  /** A stable key for the line. Default its position. */
  id?: string | number;
  /** When it happened. Default when it arrived. */
  time?: Date | string | number;
  level?: LogLevel;
  message: string;
}

export interface AsciiLogProps {
  /**
   * The lines, oldest first. Append to the array and new lines stream in. Without it the log plays
   * a demo stream of deploys and requests.
   */
  lines?: readonly LogLine[];
  /** Lines a second the demo stream writes. Default 1.4. */
  rate?: number;
  /** Lines kept on screen. Default 200. */
  max?: number;
  /** Height of the pane in pixels. Default 280. */
  height?: number;
  /** Show the time at the start of each line. Default true. */
  timestamps?: boolean;
  /** Freeze the view while the pointer is over it, counting what arrives meanwhile. Default true. */
  pauseOnHover?: boolean;
  /** A title over the pane, such as the service's name. Default none. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const LEVELS: Record<LogLevel, { tag: string; color: string }> = {
  debug: { tag: 'DBG', color: '#8a8f98' },
  info: { tag: 'INF', color: '#6aa7ff' },
  ok: { tag: ' OK', color: '#4cc38a' },
  warn: { tag: 'WRN', color: '#f5b544' },
  error: { tag: 'ERR', color: '#ff6369' },
};

const DEMO: readonly [LogLevel, string][] = [
  ['info', 'GET /api/charts 200 in 38ms'],
  ['info', 'build started for main@9f2c1e7'],
  ['debug', 'cache hit: r/area.json (2.1 kB)'],
  ['ok', 'deployed to production in 41s'],
  ['info', 'POST /api/events 202 in 12ms'],
  ['warn', 'slow query: revenue_by_day took 812ms'],
  ['info', 'GET /ascii/koi 200 in 64ms'],
  ['error', 'webhook to billing failed: 503, retrying in 5s'],
  ['ok', 'webhook to billing delivered on retry 1'],
  ['debug', 'warmed 48 registry items'],
  ['info', 'GET /components/counter 200 in 22ms'],
  ['warn', 'rate limit at 80% for key pk_live_…3f'],
];

const clock = (time: Date) => time.toTimeString().slice(0, 8);

/** A line's message decoding in from glyphs when it first arrives. */
function Decoding({ text, fresh, reduced }: { text: string; fresh: boolean; reduced: boolean }) {
  const [shown, setShown] = useState(fresh && !reduced ? 0 : 1);
  useEffect(() => {
    if (shown >= 1) return;
    const start = performance.now();
    let cancel = () => undefined as void;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 280);
      setShown(t);
      if (t < 1) cancel = frame(step);
    };
    cancel = frame(step);
    return () => cancel();
    // Plays once, when the line arrives.
  }, []);
  if (shown >= 1) return <>{text}</>;
  const tick = Math.floor(shown * 20);
  const cut = Math.floor(text.length * shown);
  return (
    <>
      {text.slice(0, cut)}
      <span style={{ opacity: 0.5 }}>
        {Array.from(text.slice(cut, cut + 12), (ch, i) =>
          ch === ' ' ? ' ' : CODE_GLYPHS[Math.floor(rand(cut + i, tick, 4) * CODE_GLYPHS.length)],
        ).join('')}
      </span>
    </>
  );
}

/**
 * A log pane that streams. New lines decode in from glyphs at the bottom and the rest glide up to
 * make room; levels are tagged in colour. Hover to freeze the view and read; it counts what
 * arrived meanwhile and catches up when you leave. Screen readers hear new lines as they arrive.
 */
export function AsciiLog({
  lines,
  rate = 1.4,
  max = 200,
  height = 280,
  timestamps = true,
  pauseOnHover = true,
  title,
  className,
  style,
}: AsciiLogProps) {
  const reduced = useReducedMotion();
  const [demo, setDemo] = useState<LogLine[]>([]);
  const [frozen, setFrozen] = useState<readonly LogLine[] | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set<string | number>());
  const firstPaint = useRef(true);

  // The demo stream, when no lines are given.
  useEffect(() => {
    if (lines) return;
    let n = 0;
    const timer = window.setInterval(
      () => {
        const [level, message] = DEMO[n % DEMO.length]!;
        const id = n++;
        setDemo((current) => [
          ...current.slice(-max + 1),
          { id, level, message, time: new Date() },
        ]);
      },
      1000 / Math.max(0.1, rate),
    );
    return () => window.clearInterval(timer);
  }, [lines, rate, max]);

  const live = (lines ?? demo).slice(-max);
  const view = frozen ?? live;
  const keyOf = (line: LogLine, i: number) => line.id ?? i;
  // Lines that arrived after the last one on screen when the view froze.
  const lastFrozen = frozen?.at(-1);
  const waiting = lastFrozen ? live.length - 1 - live.indexOf(lastFrozen) : 0;
  const fresh = view.filter((line, i) => !seenIds.current.has(keyOf(line, i)));

  // When lines arrive, the list starts a line lower and glides up into place.
  useLayoutEffect(() => {
    const el = list.current;
    if (el && fresh.length && !firstPaint.current && !reduced) {
      const step = el.lastElementChild?.getBoundingClientRect().height ?? 18;
      el.animate?.(
        [
          { transform: `translateY(${step * Math.min(3, fresh.length)}px)` },
          { transform: 'translateY(0)' },
        ],
        {
          duration: 220,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        },
      );
    }
    firstPaint.current = false;
    view.forEach((line, i) => seenIds.current.add(keyOf(line, i)));
  });

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateRows: title ? 'auto 1fr' : '1fr',
        height,
        fontFamily: MONO_STACK,
        fontSize: 12.5,
        lineHeight: 1.55,
        border: '1px solid color-mix(in srgb, currentColor 14%, transparent)',
        borderRadius: 10,
        background: 'color-mix(in srgb, currentColor 3%, transparent)',
        overflow: 'hidden',
        ...style,
      }}
      onPointerEnter={() => pauseOnHover && setFrozen(live)}
      onPointerLeave={() => setFrozen(null)}
    >
      {title ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
            opacity: 0.8,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: frozen ? '#f5b544' : '#4cc38a',
            }}
          />
          {title}
        </div>
      ) : null}
      <div
        role="log"
        aria-live="polite"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden',
          padding: '8px 12px',
        }}
      >
        <div ref={list}>
          {view.map((line, i) => {
            const meta = LEVELS[line.level ?? 'info'];
            const time = line.time ? new Date(line.time) : null;
            return (
              <div key={keyOf(line, i)} style={{ display: 'flex', gap: 10, whiteSpace: 'nowrap' }}>
                {timestamps ? (
                  <span style={{ opacity: 0.45 }}>
                    {time && !Number.isNaN(time.getTime()) ? clock(time) : '--:--:--'}
                  </span>
                ) : null}
                <span style={{ color: meta.color, fontWeight: 600 }}>{meta.tag}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Decoding
                    text={line.message}
                    fresh={!seenIds.current.has(keyOf(line, i)) && !firstPaint.current}
                    reduced={reduced}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {frozen ? (
        <span
          style={{
            position: 'absolute',
            right: 10,
            bottom: 10,
            padding: '3px 9px',
            borderRadius: 999,
            fontSize: 11,
            background: 'color-mix(in srgb, currentColor 12%, transparent)',
            backdropFilter: 'blur(6px)',
          }}
        >
          Paused{waiting > 0 ? ` · ${waiting} new` : ''}
        </span>
      ) : null}
    </div>
  );
}
