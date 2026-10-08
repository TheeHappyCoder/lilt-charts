import type { ReactNode } from 'react';
import type { RouteIcon } from '@/lib/routes';

/*
 * Miniature charts for the navigation panel's rows: each family drawn as itself, small, in the site's
 * palette (the series tokens of the nearest `data-lilt-chart`). Drawn on an 80 × 36 canvas.
 */

const c1 = 'var(--lilt-series-1)';
const c2 = 'var(--lilt-series-2)';
const c3 = 'var(--lilt-series-3)';
const up = 'var(--lilt-positive)';
const down = 'var(--lilt-negative)';
const track = 'color-mix(in srgb, currentColor 16%, transparent)';

const line = {
  fill: 'none',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** A deterministic shade for heatmap cells, so the tile reads the same on every render. */
const shade = [0.2, 0.55, 0.35, 0.8, 0.25, 0.6, 0.95, 0.4];

const glyphs: Partial<Record<RouteIcon, ReactNode>> = {
  treemap: (
    <>
      <rect x={7} y={5} width={30} height={26} rx={2} fill={c1} />
      <rect x={40} y={5} width={33} height={12} rx={2} fill={c2} />
      <rect x={40} y={20} width={18} height={11} rx={2} fill={c3} />
      <rect x={61} y={20} width={12} height={11} rx={2} fill={c1} opacity={0.65} />
    </>
  ),
  area: (
    <>
      <path d="M6 24 C18 18 26 20 36 15 S56 10 74 7 V30 H6Z" fill={c1} opacity={0.28} />
      <path d="M6 24 C18 18 26 20 36 15 S56 10 74 7" stroke={c1} {...line} />
      <path d="M6 28 C20 25 30 26 40 22 S60 19 74 17 V30 H6Z" fill={c2} opacity={0.3} />
      <path d="M6 28 C20 25 30 26 40 22 S60 19 74 17" stroke={c2} {...line} />
    </>
  ),
  line: (
    <>
      <path d="M6 24 L18 17 L28 20 L40 11 L52 14 L62 8 L74 10" stroke={c1} {...line} />
      <path d="M6 28 L18 25 L30 26 L42 21 L54 23 L74 18" stroke={c2} {...line} />
      <circle cx={74} cy={10} r={2.2} fill={c1} />
    </>
  ),
  combo: (
    <>
      {[16, 11, 19, 14, 22, 17].map((h, i) => (
        <rect
          key={i}
          x={8 + i * 11}
          y={30 - h}
          width={6}
          height={h}
          rx={1.5}
          fill={c2}
          opacity={0.55}
        />
      ))}
      <path d="M11 20 L22 16 L33 18 L44 11 L55 13 L66 7" stroke={c1} {...line} />
    </>
  ),
  bar: (
    <>
      {[12, 19, 10, 23, 16, 20].map((h, i) => (
        <rect key={i} x={8 + i * 11} y={30 - h} width={7} height={h} rx={1.5} fill={c1} />
      ))}
    </>
  ),
  ranking: (
    <>
      {[66, 52, 38, 24].map((w, i) => (
        <rect
          key={i}
          x={6}
          y={5 + i * 7}
          width={w}
          height={4.5}
          rx={2}
          fill={c1}
          opacity={1 - i * 0.18}
        />
      ))}
    </>
  ),
  slope: (
    <>
      <path d="M16 5 V31 M64 5 V31" stroke={track} strokeWidth={1} />
      {(
        [
          [24, 9, c1],
          [11, 23, c2],
          [17, 15, c3],
        ] as const
      ).map(([a, b, color]) => (
        <g key={color}>
          <path d={`M16 ${a} L64 ${b}`} stroke={color} {...line} />
          <circle cx={16} cy={a} r={2.2} fill={color} />
          <circle cx={64} cy={b} r={2.2} fill={color} />
        </g>
      ))}
    </>
  ),
  range: (
    <>
      {(
        [
          [10, 24],
          [14, 29],
          [7, 20],
          [12, 26],
          [5, 17],
          [9, 22],
        ] as const
      ).map(([top, bottom], i) => (
        <rect
          key={i}
          x={9 + i * 11}
          y={top}
          width={6}
          height={bottom - top}
          rx={3}
          fill={c1}
          opacity={0.85}
        />
      ))}
    </>
  ),
  radial: (
    <>
      <circle cx={40} cy={18} r={12} stroke={track} strokeWidth={4} fill="none" />
      <circle
        cx={40}
        cy={18}
        r={12}
        stroke={c1}
        strokeWidth={4}
        fill="none"
        pathLength={100}
        strokeDasharray="70 100"
        strokeLinecap="round"
        transform="rotate(-90 40 18)"
      />
      <circle
        cx={40}
        cy={18}
        r={6}
        stroke={c2}
        strokeWidth={3}
        fill="none"
        pathLength={100}
        strokeDasharray="45 100"
        strokeLinecap="round"
        transform="rotate(-90 40 18)"
      />
    </>
  ),
  funnel: (
    <>
      {[64, 48, 34, 20].map((w, i) => (
        <rect
          key={i}
          x={40 - w / 2}
          y={5 + i * 7}
          width={w}
          height={5}
          rx={2}
          fill={c1}
          opacity={1 - i * 0.17}
        />
      ))}
    </>
  ),
  sankey: (
    <>
      <path d="M10 5 C40 5 40 5 70 5 V13 C40 13 40 11 10 11Z" fill={c1} opacity={0.35} />
      <path d="M10 11 C40 11 40 15 70 15 V21 C40 21 40 17 10 17Z" fill={c1} opacity={0.22} />
      <path d="M10 19 C40 19 40 21 70 21 V25 C40 25 40 25 10 25Z" fill={c2} opacity={0.35} />
      <path d="M10 25 C40 25 40 27 70 27 V31 C40 31 40 31 10 31Z" fill={c2} opacity={0.22} />
      <rect x={6} y={5} width={4} height={12} rx={1} fill={c1} />
      <rect x={6} y={19} width={4} height={12} rx={1} fill={c2} />
      <rect x={70} y={5} width={4} height={8} rx={1} fill={c1} />
      <rect x={70} y={15} width={4} height={10} rx={1} fill={c3} />
      <rect x={70} y={27} width={4} height={4} rx={1} fill={c2} />
    </>
  ),
  sparkline: (
    <>
      <rect x={6} y={7} width={22} height={7} rx={2} fill="currentColor" opacity={0.5} />
      <rect x={6} y={18} width={13} height={3.5} rx={1.75} fill="currentColor" opacity={0.22} />
      <path d="M34 26 L42 22 L48 24 L56 15 L64 17 L74 9 V30 H34Z" fill={c1} opacity={0.22} />
      <path d="M34 26 L42 22 L48 24 L56 15 L64 17 L74 9" stroke={c1} {...line} />
    </>
  ),
  progress: (
    <>
      {(
        [
          [48, c1],
          [32, c2],
          [58, c3],
        ] as const
      ).map(([w, color], i) => (
        <g key={color}>
          <rect x={6} y={8 + i * 8} width={68} height={4} rx={2} fill={track} />
          <rect x={6} y={8 + i * 8} width={w} height={4} rx={2} fill={color} />
        </g>
      ))}
    </>
  ),
  activity: (
    <>
      {(
        [
          [13, c1, 75],
          [9, c2, 60],
          [5, c3, 85],
        ] as const
      ).map(([r, color, dash]) => (
        <g key={color}>
          <circle cx={40} cy={18} r={r} stroke={track} strokeWidth={3} fill="none" />
          <circle
            cx={40}
            cy={18}
            r={r}
            stroke={color}
            strokeWidth={3}
            fill="none"
            pathLength={100}
            strokeDasharray={`${dash} 100`}
            strokeLinecap="round"
            transform="rotate(-90 40 18)"
          />
        </g>
      ))}
    </>
  ),
  heatmap: (
    <>
      {Array.from({ length: 32 }, (_, i) => (
        <rect
          key={i}
          x={6 + (i % 8) * 8.75}
          y={5 + Math.floor(i / 8) * 6.75}
          width={7.5}
          height={5.5}
          rx={1.2}
          fill={c1}
          opacity={shade[(i * 5 + Math.floor(i / 8)) % 8]}
        />
      ))}
    </>
  ),
  scatter: (
    <>
      {(
        [
          [10, 26],
          [16, 22],
          [21, 25],
          [27, 18],
          [33, 20],
          [38, 14],
          [45, 16],
          [51, 11],
          [58, 13],
          [64, 8],
          [70, 10],
        ] as const
      ).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2} fill={i % 3 === 2 ? c2 : c1} />
      ))}
    </>
  ),
  radar: (
    <>
      <polygon
        points="40,4 52,11 52,25 40,32 28,25 28,11"
        fill="none"
        stroke={track}
        strokeWidth={1}
      />
      <polygon
        points="40,11 46,14.5 46,21.5 40,25 34,21.5 34,14.5"
        fill="none"
        stroke={track}
        strokeWidth={1}
      />
      <polygon points="40,6 50,13 47,23 40,29 31,23 33,12" fill={c1} opacity={0.3} />
      <polygon points="40,6 50,13 47,23 40,29 31,23 33,12" stroke={c1} {...line} />
    </>
  ),
  boxplot: (
    <>
      {(
        [
          [12, 6, 12, 20, 28],
          [30, 9, 15, 22, 30],
          [48, 5, 10, 17, 24],
          [66, 8, 14, 21, 29],
        ] as const
      ).map(([x, lo, q1, q3, hi]) => (
        <g key={x}>
          <path d={`M${x} ${lo} V${hi}`} stroke={c1} strokeWidth={1.2} />
          <rect x={x - 5} y={q1} width={10} height={q3 - q1} rx={1.5} fill={c1} opacity={0.35} />
          <path d={`M${x - 5} ${(q1 + q3) / 2} H${x + 5}`} stroke={c1} strokeWidth={1.6} />
        </g>
      ))}
    </>
  ),
  candlestick: (
    <>
      {(
        [
          [8, 22, 12, 26, true],
          [18, 18, 10, 24, true],
          [28, 16, 20, 25, false],
          [38, 12, 6, 18, true],
          [48, 10, 16, 21, false],
          [58, 8, 4, 14, true],
          [68, 6, 11, 17, false],
        ] as const
      ).map(([x, open, close, low, rising], i) => {
        const top = Math.min(open, close);
        return (
          <g key={i}>
            <path
              d={`M${x + 2.5} ${top - 3} V${low}`}
              stroke={rising ? up : down}
              strokeWidth={1}
            />
            <rect
              x={x}
              y={top}
              width={5}
              height={Math.abs(open - close)}
              rx={1}
              fill={rising ? up : down}
            />
          </g>
        );
      })}
    </>
  ),
  indicator: (
    <>
      <path
        d="M6 14 C20 10 30 16 42 10 S62 6 74 5 V15 C62 16 52 20 42 19 S20 22 6 22Z"
        fill={c2}
        opacity={0.18}
      />
      <path d="M6 18 L16 14 L24 17 L34 12 L44 15 L54 9 L64 11 L74 8" stroke={c1} {...line} />
      {[4, 6, 3, 7, 5, 8, 4].map((h, i) => (
        <rect
          key={i}
          x={8 + i * 10}
          y={31 - h}
          width={5}
          height={h}
          rx={1}
          fill="currentColor"
          opacity={0.25}
        />
      ))}
    </>
  ),
  price: (
    <>
      <path
        d="M6 26 L14 22 L20 24 L28 17 L36 19 L44 12 L52 15 L60 10 L68 13 L74 9 V31 H6Z"
        fill={c1}
        opacity={0.18}
      />
      <path
        d="M6 26 L14 22 L20 24 L28 17 L36 19 L44 12 L52 15 L60 10 L68 13 L74 9"
        stroke={c1}
        {...line}
      />
      <path d="M6 9 H74" stroke={c1} strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />
      <circle cx={74} cy={9} r={2.4} fill={c1} />
    </>
  ),
  depth: (
    <>
      <path d="M6 8 H14 V12 H22 V18 H30 V24 H38 V31 H6Z" fill={up} opacity={0.25} />
      <path d="M6 8 H14 V12 H22 V18 H30 V24 H38 V31" stroke={up} {...line} />
      <path d="M74 8 H66 V12 H58 V18 H50 V24 H42 V31 H74Z" fill={down} opacity={0.25} />
      <path d="M74 8 H66 V12 H58 V18 H50 V24 H42 V31" stroke={down} {...line} />
    </>
  ),
  orderbook: (
    <>
      {[30, 44, 22].map((w, i) => (
        <rect
          key={`a${i}`}
          x={74 - w}
          y={4 + i * 5}
          width={w}
          height={3.5}
          rx={1}
          fill={down}
          opacity={0.55}
        />
      ))}
      <path d="M6 18 H74" stroke={track} strokeWidth={1} />
      {[26, 48, 36].map((w, i) => (
        <rect
          key={`b${i}`}
          x={74 - w}
          y={21 + i * 5}
          width={w}
          height={3.5}
          rx={1}
          fill={up}
          opacity={0.55}
        />
      ))}
    </>
  ),
  portfolio: (
    <>
      {(
        [
          [c1, '45 100', 0],
          [c2, '30 100', 45],
          [c3, '25 100', 75],
        ] as const
      ).map(([color, dash, offset]) => (
        <circle
          key={color}
          cx={20}
          cy={18}
          r={10}
          stroke={color}
          strokeWidth={5}
          fill="none"
          pathLength={100}
          strokeDasharray={dash}
          strokeDashoffset={-offset}
          transform="rotate(-90 20 18)"
        />
      ))}
      {[c1, c2, c3].map((color, i) => (
        <g key={color}>
          <circle cx={40} cy={10 + i * 8} r={2} fill={color} />
          <rect
            x={46}
            y={8.5 + i * 8}
            width={28 - i * 6}
            height={3}
            rx={1.5}
            fill="currentColor"
            opacity={0.25}
          />
        </g>
      ))}
    </>
  ),
};

export const hasGlyph = (icon: RouteIcon) => icon in glyphs;

/** The family's miniature, or nothing for a page that is not a chart. */
export function ChartGlyph({ icon }: { icon: RouteIcon }) {
  const glyph = glyphs[icon];
  if (!glyph) return null;
  return (
    <svg
      className="lilt-chart-glyph"
      viewBox="0 0 80 36"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      data-lilt-chart=""
    >
      {glyph}
    </svg>
  );
}
