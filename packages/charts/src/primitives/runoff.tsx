import type { ReactElement } from 'react';
import type { ChartSnapshot } from '../chart-context';
import type { GeometrySegment, SeriesGeometry } from '../engine/geometry';

/** Opacity the runoff eases down to at the plot edges; it never vanishes completely. */
const EDGE_OPACITY = 0.32;

export interface RunoffEdges {
  /** Plot edge to extend the first segment to, when the data starts at the scale start. */
  left?: number;
  /** Plot edge to extend the last segment to, when the data ends at the scale end. */
  right?: number;
  dataStart: number;
  dataEnd: number;
}

/**
 * Lines and areas continue flat from the first and last observations to the plot edges.
 * Only when the data starts and ends at the inset scale bounds: a missing first or last
 * observation stays a visible gap rather than being bridged.
 */
export function runoffEdges(
  snapshot: ChartSnapshot<unknown>,
  geometry: SeriesGeometry,
): RunoffEdges | null {
  const { plot } = snapshot;
  const start = snapshot.xToPixel(snapshot.xDomain[0]);
  const end = snapshot.xToPixel(snapshot.xDomain[1]);
  const first = geometry.segments[0]?.points[0];
  const last = geometry.segments.at(-1)?.points.at(-1);
  const left = first && start - plot.left > 0.5 && Math.abs(first.x - start) < 0.5;
  const right = last && plot.right - end > 0.5 && Math.abs(last.x - end) < 0.5;
  if (!left && !right) return null;
  return {
    left: left ? plot.left : undefined,
    right: right ? plot.right : undefined,
    dataStart: start,
    dataEnd: end,
  };
}

/** Which edges a segment extends to: the first segment reaches left, the last reaches right. */
export function segmentEdges(
  edges: RunoffEdges | null,
  index: number,
  count: number,
): { left?: number; right?: number } {
  if (!edges) return {};
  return {
    left: index === 0 ? edges.left : undefined,
    right: index === count - 1 ? edges.right : undefined,
  };
}

type Edges = { left?: number; right?: number };

/**
 * The last extension made for each segment. A path holds every point, so building one is as long
 * as the data; marks redraw on every hover, but a segment and its edges rarely change.
 */
function cachedExtension(
  cache: WeakMap<GeometrySegment, Edges & { path: string }>,
  segment: GeometrySegment,
  edges: Edges,
  build: (segment: GeometrySegment, edges: Edges) => string,
): string {
  const cached = cache.get(segment);
  if (cached && cached.left === edges.left && cached.right === edges.right) return cached.path;
  const path = build(segment, edges);
  cache.set(segment, { left: edges.left, right: edges.right, path });
  return path;
}

const extendedLines = new WeakMap<GeometrySegment, Edges & { path: string }>();
const extendedAreas = new WeakMap<GeometrySegment, Edges & { path: string }>();

/** One continuous line path, so the extension meets the curve without a seam. */
export function extendLinePath(segment: GeometrySegment, edges: Edges): string {
  return cachedExtension(extendedLines, segment, edges, buildExtendedLinePath);
}

function buildExtendedLinePath(segment: GeometrySegment, { left, right }: Edges): string {
  const first = segment.points[0]!;
  const last = segment.points.at(-1)!;
  let path = segment.path;
  if (left !== undefined) path = `M${left},${first.y} L${path.slice(1)}`;
  if (right !== undefined) path = `${path} L${right},${last.y}`;
  return path;
}

const LAST_POINT = /(-?[\d.e+-]+),(-?[\d.e+-]+)\s*Z\s*$/;
const FIRST_LOWER = /^\s*L(-?[\d.e+-]+),(-?[\d.e+-]+)/;

/**
 * One continuous area outline. Area paths trace the upper line forward and the lower boundary
 * back, so the extension adds flat runs at both ends of each boundary.
 */
export function extendAreaPath(segment: GeometrySegment, edges: Edges): string {
  return cachedExtension(extendedAreas, segment, edges, buildExtendedAreaPath);
}

function buildExtendedAreaPath(segment: GeometrySegment, { left, right }: Edges): string {
  if ((left === undefined && right === undefined) || !segment.areaPath.startsWith(segment.path))
    return segment.areaPath;
  const lower = segment.areaPath.slice(segment.path.length);
  const lowerEnd = FIRST_LOWER.exec(lower);
  const lowerStart = LAST_POINT.exec(lower);
  if (!lowerEnd || !lowerStart) return segment.areaPath;
  const first = segment.points[0]!;
  const last = segment.points.at(-1)!;
  let upper = segment.path;
  if (left !== undefined) upper = `M${left},${first.y} L${upper.slice(1)}`;
  if (right !== undefined) upper = `${upper} L${right},${last.y} L${right},${lowerEnd[2]}`;
  const closing =
    left !== undefined ? lower.replace(/Z\s*$/, `L${left},${lowerStart[2]} Z`) : lower;
  return `${upper} ${closing.trim()}`;
}

/**
 * A mask ID that changes with the fade geometry. Chrome can keep painting a stale, empty mask
 * after the gradient inside it changes; a new ID forces a fresh mask on every geometry change.
 */
export function runoffMaskId(base: string, snapshot: ChartSnapshot<unknown>, edges: RunoffEdges) {
  const { plot } = snapshot;
  return [base, plot.left, plot.right, edges.dataStart, edges.dataEnd]
    .map((part) => (typeof part === 'number' ? Math.round(part * 10) : part))
    .join('-');
}

/**
 * A soft horizontal fade over the extensions only: full strength across the data,
 * easing toward the plot edges.
 */
export function RunoffFade({
  id,
  snapshot,
  edges,
}: {
  id: string;
  snapshot: ChartSnapshot<unknown>;
  edges: RunoffEdges;
}): ReactElement {
  const { plot } = snapshot;
  const span = Math.max(1, plot.right - plot.left);
  const at = (x: number) => Math.min(1, Math.max(0, (x - plot.left) / span));
  return (
    <defs>
      <linearGradient
        id={`${id}-ramp`}
        gradientUnits="userSpaceOnUse"
        x1={plot.left}
        x2={plot.right}
        y1={0}
        y2={0}
      >
        <stop
          offset={0}
          stopColor="white"
          stopOpacity={edges.left === undefined ? 1 : EDGE_OPACITY}
        />
        <stop offset={at(edges.dataStart)} stopColor="white" />
        <stop offset={at(edges.dataEnd)} stopColor="white" />
        <stop
          offset={1}
          stopColor="white"
          stopOpacity={edges.right === undefined ? 1 : EDGE_OPACITY}
        />
      </linearGradient>
      <mask id={id} maskUnits="userSpaceOnUse">
        <rect
          x={plot.left - 8}
          y={plot.top - 40}
          width={span + 16}
          height={plot.height + 80}
          fill={`url(#${id}-ramp)`}
        />
      </mask>
    </defs>
  );
}
