'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { hash3 } from '../engine/noise';
import { describe, full } from '../charts/chart-kit';

export interface AsciiSparklineProps {
  /** The values, oldest first. Default 32 days of demo data. */
  data?: readonly number[];
  /** Width in characters of the surrounding text. Default 16. */
  width?: number;
  /** Colour of the line. Default the text colour. */
  color?: string;
  /** Shade the area under the line. Default true. */
  fill?: boolean;
  /** Describes the sparkline for screen readers. Default a summary of the data. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** Rows of blocks in a line of text: enough for a shape, small enough to stay text. */
const ROWS = 5;
const DEMO = trend(32, 3);

/** A smooth, gently rising series for demos: a trend, a slow swell and a little noise. */
function trend(length: number, seed: number, rise = 1) {
  return Array.from({ length }, (_, i) => {
    const swell = Math.sin(i / 3.6 + seed) * 16 + Math.sin(i / 1.7 + seed * 2) * 5;
    const noise = (hash3(i, seed, 11) - 0.5) * 5;
    return Math.round(100 + i * 2.2 * rise + swell + noise);
  });
}

/** Reads `#rrggbb` or `rgb(r, g, b)` from a canvas style. */
function rgb(value: string): [number, number, number] {
  if (value.startsWith('#')) {
    const n = parseInt(value.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * The block each column of a sparkline lights: a row from 0 at the bottom to `rows - 1` at the
 * top, sampling the series evenly from first value to last.
 */
export function sparkLevels(data: readonly number[], cols: number, rows: number): number[] {
  if (!data.length || cols < 1) return [];
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const n = data.length;
  return Array.from({ length: cols }, (_, c) => {
    const t = cols === 1 || n === 1 ? n - 1 : (c / (cols - 1)) * (n - 1);
    const i = Math.min(n - 2, Math.floor(t));
    const v = n === 1 ? data[0]! : data[i]! + (data[i + 1]! - data[i]!) * (t - i);
    const share = hi > lo ? (v - lo) / (hi - lo) : 0.5;
    return Math.round(share * (rows - 1));
  });
}

/**
 * A chart the size of a word, for a sentence or a table cell. It is the area chart in miniature:
 * a ridge of small solid blocks along the line, a faint fill beneath, and the latest value lit at
 * the end. It sits on the text's baseline, takes the text's colour, and draws itself in from the
 * left. Screen readers hear its count, lowest, highest and latest values.
 */
export function AsciiSparkline({
  data,
  width = 16,
  color,
  fill = true,
  label,
  className,
  style,
}: AsciiSparklineProps) {
  const values = data?.length ? data : DEMO;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const key = values.join(',');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const series = key.split(',').map(Number);
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let raf = 0;
    let start = 0;

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Square cells in whole device pixels, so the blocks stay crisp at text size. Large enough
      // cells keep a pixel of air between them, the way the charts' blocks do.
      const cell = Math.max(1, Math.floor(h / ROWS));
      const gap = cell >= 4 ? 1 : 0;
      const cols = Math.max(2, Math.floor(w / cell));
      const x0 = Math.floor((w - cols * cell) / 2);
      const y0 = h - ROWS * cell;
      const [r, g, b] = rgb(getComputedStyle(canvas).color);
      const levels = sparkLevels(series, cols, ROWS);
      // The wipe: columns appear left to right over the first half second.
      const front = still ? cols : Math.min(cols, ((now - start) / 520) * cols);

      const block = (c: number, row: number, alpha: number) => {
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(x0 + c * cell, y0 + (ROWS - 1 - row) * cell, cell - gap, cell - gap);
      };

      for (let c = 0; c < Math.min(cols, Math.ceil(front)); c++) {
        const k = levels[c]!;
        if (fill) for (let j = 0; j < k; j++) block(c, j, 0.1 + 0.2 * (j / Math.max(1, k)));
        // Where the line jumps more than a row, a riser keeps it whole.
        const prev = c > 0 ? levels[c - 1]! : k;
        for (let j = Math.min(prev, k) + 1; j < Math.max(prev, k); j++) {
          if (j > k || !fill) block(c, j, 0.5);
        }
        // The ridge, with the latest value lit at its end.
        block(c, k, c === cols - 1 && front >= cols ? 1 : 0.7);
      }
      if (front < cols) raf = requestAnimationFrame(draw);
    };

    const restart = () => {
      cancelAnimationFrame(raf);
      start = performance.now();
      draw(still ? Infinity : start);
    };
    const redraw = () => {
      cancelAnimationFrame(raf);
      draw(Infinity);
    };
    restart();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [key, fill, color]);

  const summary = label ?? describe('Sparkline', values);
  return (
    <span
      role="img"
      aria-label={summary}
      title={`Latest ${full(values[values.length - 1]!)}`}
      className={className}
      style={{
        display: 'inline-block',
        width: `${width}ch`,
        // About the height of a capital, standing on the baseline like the letters around it.
        height: '0.72em',
        verticalAlign: 'baseline',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', color: color ?? 'inherit' }}
      />
    </span>
  );
}

const ROWS_DEMO = [
  { name: 'Visitors', data: trend(30, 1).map((v) => v * 24), unit: '' },
  { name: 'Sign-ups', data: trend(30, 4, 0.6).map((v) => Math.round(v / 2)), unit: '' },
  { name: 'Revenue', data: trend(30, 7, 1.4).map((v) => v * 61), unit: '$' },
];

/**
 * Sparklines where they live: inside a sentence and down a table column, at the size of the
 * text around them.
 */
export function AsciiSparklineDemo({ width = 16, color, fill }: AsciiSparklineProps) {
  const rule = '1px solid color-mix(in srgb, currentColor 14%, transparent)';
  const cell: CSSProperties = { padding: '10px 14px', borderBottom: rule, textAlign: 'left' };
  return (
    <div style={{ maxWidth: 560, fontSize: 16, lineHeight: 1.6 }}>
      <p style={{ margin: '0 0 28px' }}>
        Visitors climbed all month{' '}
        <AsciiSparkline data={ROWS_DEMO[0]!.data} width={width} color={color} fill={fill} /> and
        sign-ups followed{' '}
        <AsciiSparkline data={ROWS_DEMO[1]!.data} width={width} color={color} fill={fill} />, a
        little behind.
      </p>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
        <thead>
          <tr style={{ opacity: 0.55 }}>
            <th style={{ ...cell, fontWeight: 500 }}>Metric</th>
            <th style={{ ...cell, fontWeight: 500 }}>Last 30 days</th>
            <th style={{ ...cell, fontWeight: 500, textAlign: 'right' }}>Today</th>
          </tr>
        </thead>
        <tbody>
          {ROWS_DEMO.map((row) => (
            <tr key={row.name}>
              <td style={cell}>{row.name}</td>
              <td style={cell}>
                <AsciiSparkline data={row.data} width={width} color={color} fill={fill} />
              </td>
              <td style={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {row.unit}
                {full(row.data[row.data.length - 1]!)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
