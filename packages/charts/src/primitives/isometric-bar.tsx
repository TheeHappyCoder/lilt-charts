import type { barMarkPath, BarGeometry } from '../engine/bars';
import { isometricBarGeometry } from '../engine/isometric-bars';
import { ramp } from './depth-paint';

/** Ambient occlusion reaches this far up from the floor, in pixels. */
const OCCLUSION = 40;
/** The key light's falloff down the front face, in pixels. */
const FALLOFF = 48;

/**
 * Paint only: the chart still measures, inspects, and animates the original bar geometry.
 * One key light sits above, in front, and to the left: the roof is brightest, the front is lit
 * and falls off toward the floor, and the side turns away into shade. Edges come from the faces
 * meeting, never from stroked lines. `active` raises the light on the inspected bar.
 */
export function IsometricBar({
  bar,
  mark,
  id,
  color,
  fill,
  fillOpacity,
  stroke,
  strokeWidth,
  active = false,
}: {
  bar: BarGeometry;
  mark: Parameters<typeof barMarkPath>[1];
  id: string;
  color: string;
  fill: string;
  fillOpacity: number;
  stroke?: string;
  strokeWidth?: number;
  active?: boolean;
}) {
  const faces = isometricBarGeometry(bar, mark);
  if (!faces) return null;
  const { x, y, width, height, depth, rise, grounded } = faces;
  const right = x + width;
  const bottom = y + height;
  const front = fill === color ? `url(#${id}-front)` : fill;
  const side = `url(#${id}-side)`;
  const top = `url(#${id}-top)`;
  // Offsets in pixels, so a tall bar and a short one share the same light and occlusion.
  const falloff = Math.min(0.45, FALLOFF / height);
  const occlusion = Math.max(falloff, 1 - OCCLUSION / height);
  const lift = active ? 6 : 0;

  return (
    // Group opacity, not fill opacity: the faces overlap underneath and must composite as one.
    <g opacity={fillOpacity < 1 ? fillOpacity : undefined}>
      <defs>
        <linearGradient
          id={`${id}-front`}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={y}
          x2={0}
          y2={bottom}
        >
          {ramp(color, [
            [0, 12 + lift],
            [falloff, lift / 2],
            [occlusion, 0],
            [1, grounded ? -22 : -6],
          ])}
        </linearGradient>
        <linearGradient
          id={`${id}-side`}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={y - rise}
          x2={0}
          y2={bottom}
        >
          {ramp(color, [
            [0, -30 + lift],
            [occlusion, -42],
            [1, grounded ? -58 : -46],
          ])}
        </linearGradient>
        <linearGradient
          id={`${id}-top`}
          gradientUnits="userSpaceOnUse"
          x1={x}
          y1={y}
          x2={right + depth}
          y2={y - rise}
        >
          {ramp(color, [
            [0, 40 + lift],
            [1, 26 + lift],
          ])}
        </linearGradient>
        {faces.shadow ? (
          <>
            <linearGradient
              id={`${id}-shadow`}
              gradientUnits="userSpaceOnUse"
              x1={right}
              y1={0}
              x2={right + depth + faces.cast}
              y2={0}
            >
              <stop offset={0} style={{ stopColor: 'black', stopOpacity: 0.4 }} />
              <stop offset={1} style={{ stopColor: 'black', stopOpacity: 0 }} />
            </linearGradient>
            <filter id={`${id}-soft`} x="-50%" y="-100%" width="200%" height="300%">
              <feGaussianBlur stdDeviation={Math.min(1.6, rise / 4)} />
            </filter>
          </>
        ) : null}
      </defs>
      {faces.shadow ? (
        <path
          data-lilt-bar-shadow=""
          d={faces.shadow}
          filter={`url(#${id}-soft)`}
          fill={`url(#${id}-shadow)`}
          style={{ fill: `url(#${id}-shadow)` }}
        />
      ) : null}
      <path data-lilt-bar-face="side" d={faces.side} fill={side} style={{ fill: side }} />
      {faces.top ? (
        <path data-lilt-bar-face="top" d={faces.top} fill={top} style={{ fill: top }} />
      ) : null}
      <path
        data-lilt-bar-face="front"
        d={faces.front}
        fill={front}
        style={{ fill: front, stroke, strokeWidth }}
      />
    </g>
  );
}
