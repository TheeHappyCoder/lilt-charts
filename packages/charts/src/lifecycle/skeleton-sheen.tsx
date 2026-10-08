import { useId, type CSSProperties, type ReactNode } from 'react';
import type { ChartLoadingStyle } from '../types';
import { useSkeletonClock } from './use-skeleton-clock';

export const SKELETON_INK = 'color-mix(in srgb, var(--lilt-skeleton) 64%, var(--lilt-surface))';

/** Paint for the mask copy: skeleton shapes turn white, gaps between them black. */
const MASK_PAINT = {
  '--lilt-skeleton-paint': 'white',
  '--lilt-skeleton-gap': 'black',
} as CSSProperties;

export interface SkeletonSheenProps {
  /** The skeleton shapes. Their CSS paints them with `--lilt-skeleton-paint`. */
  children: ReactNode;
  /** A plain silhouette when shaded children contain their own SVG definitions. */
  mask?: ReactNode;
  /**
   * For rings: a white path with `pathLength={1}`, `strokeDasharray="1"`, and the
   * `lilt-skeleton__sweep` class. Drawing sweeps it round; breathing fills and empties part of
   * it. Other skeletons move each mark on its own with `data-skeleton` (see loading.css).
   */
  sweep?: ReactNode;
  loadingStyle?: ChartLoadingStyle;
  depth?: boolean;
  /** The area the sheen sweeps across, in the SVG's own units. */
  width: number;
  height: number;
  x?: number;
  y?: number;
  /** Draw the shapes without the moving highlight. */
  reduced?: boolean;
}

/**
 * Skeleton shapes with the same moving highlight as the Cartesian loading state. The shapes are
 * drawn once for the eye and once more, in white, as the mask the highlight shows through, so
 * the sheen lights only the placeholder and never the space around it. With `draw` or `breathe`
 * the highlight gives way to the marks' own motion.
 */
export function SkeletonSheen({
  children,
  mask,
  sweep,
  loadingStyle = 'shimmer',
  depth = false,
  width,
  height,
  x = 0,
  y = 0,
  reduced = false,
}: SkeletonSheenProps) {
  const id = useId().replace(/:/g, '');
  const clockRef = useSkeletonClock<SVGGElement>(true, loadingStyle);
  const band = Math.max(width * 0.3, Math.min(width, 60));
  const sweeping = sweep !== undefined && !reduced && loadingStyle !== 'shimmer';
  return (
    <g
      ref={clockRef}
      className="lilt-skeleton"
      aria-hidden="true"
      data-style={loadingStyle}
      data-depth={depth || undefined}
      data-reduced-motion={reduced || undefined}
    >
      {sweeping ? (
        <defs>
          <mask
            id={`${id}-sweep`}
            maskUnits="userSpaceOnUse"
            x={x}
            y={y}
            width={width}
            height={height}
          >
            {sweep}
          </mask>
        </defs>
      ) : null}
      <g mask={sweeping ? `url(#${id}-sweep)` : undefined}>{children}</g>
      {reduced || loadingStyle !== 'shimmer' ? null : (
        <>
          <defs>
            <linearGradient id={`${id}-sheen`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--lilt-skeleton-sheen)" stopOpacity="0" />
              <stop offset="0.5" stopColor="var(--lilt-skeleton-sheen)" stopOpacity="0.75" />
              <stop offset="1" stopColor="var(--lilt-skeleton-sheen)" stopOpacity="0" />
            </linearGradient>
            <mask
              id={`${id}-mask`}
              maskUnits="userSpaceOnUse"
              x={x}
              y={y}
              width={width}
              height={height}
            >
              <g style={MASK_PAINT}>{mask ?? children}</g>
            </mask>
          </defs>
          <g mask={`url(#${id}-mask)`}>
            <rect
              className="lilt-chart__skeleton-sheen"
              fill={`url(#${id}-sheen)`}
              x={x}
              y={y}
              width={band}
              height={height}
              style={
                {
                  '--lilt-sheen-start': `${-band}px`,
                  '--lilt-sheen-end': `${width}px`,
                } as CSSProperties
              }
            />
          </g>
        </>
      )}
    </g>
  );
}
