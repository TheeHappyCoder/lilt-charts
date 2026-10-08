import type { ReactElement, SVGProps } from 'react';

/** Positive lightens toward white, negative darkens toward black, in oklab to keep chroma. */
export const shade = (color: string, amount: number) =>
  Math.abs(amount) < 0.05
    ? color
    : `color-mix(in oklab, ${color}, ${amount > 0 ? 'white' : 'black'} ${Math.abs(amount).toFixed(1)}%)`;

/**
 * Gradient stops through `[offset, shade]` keys, eased between each pair. Linear ramps between
 * a few stops leave visible bands where the slope changes; smoothstep keeps every join soft.
 */
export function ramp(color: string, keys: readonly (readonly [number, number])[]) {
  const stops: { offset: number; color: string }[] = [];
  keys.forEach(([offset, amount], index) => {
    const next = keys[index + 1];
    stops.push({ offset, color: shade(color, amount) });
    if (!next || next[0] - offset < 0.02) return;
    for (let step = 1; step < 6; step += 1) {
      const t = step / 6;
      const eased = t * t * (3 - 2 * t);
      stops.push({
        offset: offset + (next[0] - offset) * t,
        color: shade(color, amount + (next[1] - amount) * eased),
      });
    }
  });
  return stops.map((stop, index) => (
    <stop key={index} offset={stop.offset} style={{ stopColor: stop.color }} />
  ));
}

/** Flat face colors for marks drawn in batches, where one gradient per shape would cost too much. */
export const prismShades = (color: string) => ({
  front: color,
  top: shade(color, 36),
  side: shade(color, -40),
});

/** Batched prism faces: every side, then every top, then every front, each in its own shade. */
export function PrismPaths({
  batches,
  front,
}: {
  batches: {
    sides: { entries(): { color: string; d: string }[] };
    tops: { entries(): { color: string; d: string }[] };
    fronts: { entries(): { color: string; d: string }[] };
  };
  /** Front paint for a color; defaults to the color itself. */
  front?: (color: string) => SVGProps<SVGPathElement>;
}): ReactElement {
  return (
    <>
      {batches.sides.entries().map(({ color, d }) => (
        <path key={`side-${color}`} d={d} style={{ fill: prismShades(color).side }} />
      ))}
      {batches.tops.entries().map(({ color, d }) => (
        <path key={`top-${color}`} d={d} style={{ fill: prismShades(color).top }} />
      ))}
      {batches.fronts.entries().map(({ color, d }) => (
        <path key={`front-${color}`} d={d} style={{ fill: color }} {...front?.(color)} />
      ))}
    </>
  );
}

/** A clip with headroom for the tops of marks drawn with depth. */
export function DepthClip({
  clip,
}: {
  clip: { id: string; x: number; y: number; width: number; height: number };
}): ReactElement {
  return (
    <defs>
      <clipPath id={clip.id}>
        <rect x={clip.x} y={clip.y} width={clip.width} height={clip.height} />
      </clipPath>
    </defs>
  );
}

/** Smoothstep through `[t, value]` keys. */
function profile(keys: readonly (readonly [number, number])[], t: number): number {
  const index = Math.max(0, keys.findIndex(([at]) => at >= t) - 1);
  const [a, from] = keys[index]!;
  const [b, to] = keys[Math.min(keys.length - 1, index + 1)]!;
  const u = b > a ? Math.min(1, Math.max(0, (t - a) / (b - a))) : 1;
  return from + (to - from) * u * u * (3 - 2 * u);
}

export interface TubeLayer {
  strokeWidth: number;
  /** Shade applied to the band's color, as in `shade`. */
  amount: number;
  transform: string;
}

/**
 * The cross-section of a band lit as a tube or a groove, as stacked strokes of its centerline:
 * the full width first, then ever narrower strokes moved toward the light. Every layer stays
 * inside the full stroke, round caps included, so the band's outline never changes: a ring,
 * arc, or progress track keeps its exact angle and length.
 *
 * A `tube` bulges toward the reader: a shaded rim, a lit crown, and a narrow highlight toward
 * the upper left. A `groove` is cut into the card: its upper-left wall is in shadow.
 */
export function tubeLayers(
  width: number,
  kind: 'tube' | 'groove' = 'tube',
  /** Where the light falls from, as a unit vector; the upper left by default. */
  light: readonly [number, number] = [0.6, 0.8],
): TubeLayer[] {
  // Enough layers that each step is under half a pixel across the band, so it reads as smooth.
  const count = kind === 'tube' ? Math.max(12, Math.min(32, Math.ceil(width * 1.1))) : 8;
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    const strokeWidth = width * (kind === 'tube' ? 1 - 0.9 * t : 1 - 0.24 * t);
    // At most half of the room the narrower stroke leaves, so it never crosses the rim.
    const room = (width - strokeWidth) / 2;
    const reach = kind === 'tube' ? -0.55 * room : 0.9 * room;
    return {
      strokeWidth,
      amount:
        kind === 'tube'
          ? profile(
              [
                [0, -38],
                [0.35, -10],
                [0.62, 2],
                [0.86, 14],
                [1, 30],
              ],
              t,
            )
          : profile(
              [
                [0, -30],
                [1, 2],
              ],
              t,
            ),
      transform: `translate(${(reach * light[0]).toFixed(3)} ${(reach * light[1]).toFixed(3)})`,
    };
  });
}

/** A soft shadow under a drawing lit from the upper left, lifting it off the card. */
export function DropShadow({
  id,
  size,
  region,
}: {
  id: string;
  size: number;
  /**
   * The area the shadow may cover, in the SVG's units. Defaults to a margin around the shape,
   * which is too tight for a thin, nearly flat line.
   */
  region?: { x: number; y: number; width: number; height: number };
}): ReactElement {
  return (
    <filter
      id={id}
      {...(region
        ? { filterUnits: 'userSpaceOnUse', ...region }
        : { x: '-25%', y: '-25%', width: '150%', height: '160%' })}
    >
      <feDropShadow
        dx={size * 0.2}
        dy={size * 0.55}
        stdDeviation={size * 0.7}
        floodColor="black"
        floodOpacity={0.32}
      />
    </filter>
  );
}

/**
 * A line drawn as a lit tube: every layer of `tubeLayers` along one path. The centerline stays
 * the line's own path, so every point reads exactly where the flat line puts it.
 */
export function TubePath({
  d,
  color,
  width,
  dasharray,
  opacity,
  pathLength,
  className,
}: {
  d: string;
  color: string;
  width: number;
  dasharray?: string;
  opacity?: number;
  /** With `dasharray`, lets every layer draw along the line together, e.g. a loading pen. */
  pathLength?: number;
  /** Set on every layer. */
  className?: string;
}): ReactElement {
  return (
    <g data-lilt-tube="" opacity={opacity}>
      {tubeLayers(width).map((layer, index) => (
        <path
          key={index}
          d={d}
          className={className}
          fill="none"
          transform={layer.transform}
          pathLength={pathLength}
          strokeDasharray={dasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{
            stroke: shade(color, layer.amount),
            strokeWidth: layer.strokeWidth,
            strokeOpacity: 1,
          }}
        />
      ))}
    </g>
  );
}

/** The width a line takes as a tube: wide enough for its light to read. */
export const tubeWidth = (lineWidth = 2) => Math.max(5, lineWidth * 2.4);

/**
 * A lit sphere for any circle, mapped to the circle's own bounds: a highlight toward the upper
 * left, the series color through the middle, and shade at the far rim.
 */
export function SphereGradient({ id, color }: { id: string; color: string }): ReactElement {
  return (
    <radialGradient id={id} cx="0.4" cy="0.36" r="0.72" fx="0.3" fy="0.24">
      {ramp(color, [
        [0, 58],
        [0.24, 20],
        [0.58, 0],
        [0.86, -22],
        [1, -36],
      ])}
    </radialGradient>
  );
}
