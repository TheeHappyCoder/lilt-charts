import {
  curveLinear,
  curveMonotoneX,
  curveStepAfter,
  curveStepBefore,
  line as d3Line,
} from 'd3-shape';
import type { ChartCurve, ChartObservationStatus, ChartSeries } from '../types';
import type { NormalizedData, NormalizedRow } from './normalize';
import type { BarGeometry } from './bars';
import { stackTotal } from './stack';
import type { StackMode } from './stack';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface LinearPiece {
  kind: 'line';
  from: ScreenPoint;
  to: ScreenPoint;
}

export interface CubicPiece {
  kind: 'cubic';
  from: ScreenPoint;
  control1: ScreenPoint;
  control2: ScreenPoint;
  to: ScreenPoint;
}

export type CurvePiece = LinearPiece | CubicPiece;

export interface GeometrySegment {
  status?: ChartObservationStatus;
  points: readonly ScreenPoint[];
  pieces: readonly CurvePiece[];
  path: string;
  areaPath: string;
  startX: number;
  endX: number;
}

export interface SeriesGeometry {
  seriesId: string;
  curve: ChartCurve;
  segments: readonly GeometrySegment[];
  isolated: readonly ScreenPoint[];
}

export interface PlotGeometry {
  series: Readonly<Record<string, SeriesGeometry>>;
  bars: Readonly<Record<string, readonly BarGeometry[]>>;
  baselineY: number;
}

interface MoveCommand {
  type: 'move';
  point: ScreenPoint;
}

interface LineCommand {
  type: 'line';
  point: ScreenPoint;
}

interface CubicCommand {
  type: 'cubic';
  control1: ScreenPoint;
  control2: ScreenPoint;
  point: ScreenPoint;
}

type PathCommand = MoveCommand | LineCommand | CubicCommand;

class PathRecorder {
  readonly commands: PathCommand[] = [];
  readonly pieces: CurvePiece[] = [];
  private current: ScreenPoint | null = null;

  moveTo(x: number, y: number): void {
    const point = { x, y };
    this.commands.push({ type: 'move', point });
    this.current = point;
  }

  lineTo(x: number, y: number): void {
    const point = { x, y };
    this.commands.push({ type: 'line', point });
    if (this.current) this.pieces.push({ kind: 'line', from: this.current, to: point });
    this.current = point;
  }

  bezierCurveTo(
    control1x: number,
    control1y: number,
    control2x: number,
    control2y: number,
    x: number,
    y: number,
  ): void {
    const point = { x, y };
    const control1 = { x: control1x, y: control1y };
    const control2 = { x: control2x, y: control2y };
    this.commands.push({ type: 'cubic', control1, control2, point });
    if (this.current)
      this.pieces.push({ kind: 'cubic', from: this.current, control1, control2, to: point });
    this.current = point;
  }

  closePath(): void {}

  toPath(): string {
    return this.commands
      .map((command) => {
        if (command.type === 'move') return `M${command.point.x},${command.point.y}`;
        if (command.type === 'line') return `L${command.point.x},${command.point.y}`;
        return `C${command.control1.x},${command.control1.y} ${command.control2.x},${command.control2.y} ${command.point.x},${command.point.y}`;
      })
      .join(' ');
  }
}

function createAreaPath(
  recorder: PathRecorder,
  baselineY: number,
  points: readonly ScreenPoint[],
): string {
  const last = points[points.length - 1];
  const first = points[0];
  return `${recorder.toPath()} L${last.x},${baselineY} L${first.x},${baselineY} Z`;
}

function contiguousSegments<T>(
  rows: readonly NormalizedRow<T>[],
  seriesId: string,
): NormalizedRow<T>[][] {
  const result: NormalizedRow<T>[][] = [];
  let current: NormalizedRow<T>[] = [];
  for (const row of rows) {
    // A missing value (null) or one these rows do not carry yet (undefined) is a gap.
    if (row.values[seriesId] === null || row.values[seriesId] === undefined) {
      if (current.length) result.push(current);
      current = [];
    } else {
      current.push(row);
    }
  }
  if (current.length) result.push(current);
  return result;
}

function statusRuns<T>(
  rows: readonly NormalizedRow<T>[],
  seriesId: string,
): { rows: NormalizedRow<T>[]; status: ChartObservationStatus }[] {
  if (rows.length < 2) return [];
  const runs: { rows: NormalizedRow<T>[]; status: ChartObservationStatus }[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const status = rows[index].statuses[seriesId] ?? 'observed';
    const last = runs.at(-1);
    if (last && last.status === status) last.rows.push(rows[index]);
    else runs.push({ rows: [rows[index - 1], rows[index]], status });
  }
  return runs;
}

function pathForSegment(
  points: readonly ScreenPoint[],
  curve: ChartCurve,
  baselineY: number,
): GeometrySegment {
  const recorder = new PathRecorder();
  const generator = d3Line<ScreenPoint>()
    .x((point) => point.x)
    .y((point) => point.y)
    .curve(
      curve === 'linear'
        ? curveLinear
        : curve === 'step-after'
          ? curveStepAfter
          : curve === 'step-before'
            ? curveStepBefore
            : curveMonotoneX,
    )
    .context(recorder as unknown as CanvasRenderingContext2D);
  generator(points);
  return {
    points,
    pieces: recorder.pieces,
    path: recorder.toPath(),
    areaPath: createAreaPath(recorder, baselineY, points),
    startX: points[0].x,
    endX: points[points.length - 1].x,
  };
}

/** Series that stack, in chart series order, and how their layers are drawn. */
export interface GeometryStack {
  series: readonly string[];
  mode: StackMode;
  /** Draw each layer as bar segments rather than an area band. */
  bars: boolean;
  /** A sum stack with values below zero: positives rise from zero and negatives hang below. */
  signed: boolean;
  /** Animated visibility of each layer, from 0 to 1. */
  weights?: Readonly<Record<string, number>>;
}

export interface GeometryBuildOptions<T> {
  plotLeft: number;
  plotTop: number;
  plotWidth: number;
  plotHeight: number;
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  series: readonly ChartSeries<T>[];
  curveBySeries: Readonly<Record<string, ChartCurve>>;
  xInset?: number;
  /** Grouped bars outside any stack, in slot order. */
  barSeries?: readonly string[];
  barGroupWidth?: number;
  barGap?: number;
  stack?: GeometryStack;
  /** Series plotted against their own value scale, e.g. a rate line over revenue bars. */
  yDomainBySeries?: Readonly<Record<string, readonly [number, number]>>;
  /** Map values on a logarithmic scale; every plotted value is positive. */
  yLog?: boolean;
}

function mapX(value: number, domain: readonly [number, number], width: number): number {
  if (domain[0] === domain[1]) return width / 2;
  return ((value - domain[0]) / (domain[1] - domain[0])) * width;
}

function mapY(
  value: number,
  domain: readonly [number, number],
  height: number,
  log = false,
): number {
  if (domain[0] === domain[1]) return height / 2;
  if (log) {
    const [low, high] = [Math.log(domain[0]), Math.log(domain[1])];
    return height - ((Math.log(value) - low) / (high - low)) * height;
  }
  return height - ((value - domain[0]) / (domain[1] - domain[0])) * height;
}

export function buildGeometry<T>(
  data: NormalizedData<T>,
  options: GeometryBuildOptions<T>,
): PlotGeometry {
  const zeroPosition =
    options.yDomain[0] <= 0 && options.yDomain[1] >= 0
      ? mapY(0, options.yDomain, options.plotHeight, options.yLog)
      : options.yDomain[0] > 0
        ? options.plotHeight
        : 0;
  const baselineY = options.plotTop + zeroPosition;
  const seriesGeometry: Record<string, SeriesGeometry> = {};
  const bars: Record<string, BarGeometry[]> = {};
  const inset = options.xInset ?? 0;
  const barSeries = options.barSeries ?? [];
  const groupWidth = options.barGroupWidth ?? 0;
  const slot = groupWidth / Math.max(1, barSeries.length);
  const gap =
    options.barGap === undefined
      ? slot * (barSeries.length > 1 ? 0.16 : 0)
      : Math.min(
          options.barGap,
          barSeries.length > 1
            ? Math.max(0, (groupWidth - barSeries.length) / (barSeries.length - 1))
            : 0,
        );
  const barWidth =
    options.barGap === undefined
      ? slot * (barSeries.length > 1 ? 0.84 : 1)
      : (groupWidth - gap * (barSeries.length - 1)) / Math.max(1, barSeries.length);
  const xPixel = (value: number) =>
    options.plotLeft + inset + mapX(value, options.xDomain, options.plotWidth - inset * 2);
  const screenY = (value: number) =>
    options.plotTop + mapY(value, options.yDomain, options.plotHeight, options.yLog);

  const stack = options.stack;
  if (stack) {
    const layers = options.series.filter((item) => stack.series.includes(item.id));
    const weights = stack.weights ?? {};
    if (stack.bars) stackBars(layers, weights, stack.mode);
    else if (stack.signed) signedStackAreas(layers, weights);
    else stackAreas(layers, weights, stack.mode);
  }

  /** Segments share one slot per row; a row with an unknown visible layer draws none. */
  function stackBars(
    layers: readonly ChartSeries<T>[],
    weights: Readonly<Record<string, number>>,
    mode: StackMode,
  ): void {
    for (const descriptor of layers) {
      bars[descriptor.id] = [];
      seriesGeometry[descriptor.id] = {
        seriesId: descriptor.id,
        curve: descriptor.curve ?? 'monotone',
        segments: [],
        isolated: [],
      };
    }
    for (const row of data.rows) {
      if (row.x < options.xDomain[0] || row.x > options.xDomain[1]) continue;
      const visible = layers.filter((item) => (weights[item.id] ?? 1) > 0);
      if (visible.some((item) => row.values[item.id] === null || row.values[item.id] === undefined))
        continue;
      const weighted = layers.map((item) => (row.values[item.id] ?? 0) * (weights[item.id] ?? 1));
      const total = weighted.reduce((sum, value) => sum + Math.max(0, value), 0);
      let positive = 0;
      let negative = 0;
      for (const [index, descriptor] of layers.entries()) {
        const raw = weighted[index];
        const value = mode === 'percent' && total > 0 ? (raw / total) * 100 : raw;
        const from = value >= 0 ? positive : negative;
        const to = from + value;
        if (value >= 0) positive = to;
        else negative = to;
        const fromY = screenY(from);
        const toY = screenY(to);
        bars[descriptor.id].push({
          valueX: row.x,
          x: xPixel(row.x) - groupWidth / 2,
          y: Math.min(fromY, toY),
          width: groupWidth,
          height: Math.abs(fromY - toY),
          baseline: fromY,
          negative: value < 0,
        });
      }
    }
  }

  /** Straight bands on each side of zero, so a layer can change sign between rows. */
  function signedStackAreas(
    layers: readonly ChartSeries<T>[],
    weights: Readonly<Record<string, number>>,
  ): void {
    const visible = layers.filter((item) => (weights[item.id] ?? 0) > 0).map((item) => item.id);
    const runs = contiguousSegments(
      data.rows.map((row) => ({
        ...row,
        values: { ...row.values, __stack: stackTotal(row, visible) },
      })),
      '__stack',
    );
    const positive = new Map<number, number>();
    const negative = new Map<number, number>();
    const polygon = (upper: readonly ScreenPoint[], lower: readonly ScreenPoint[]) =>
      `M${upper.map((point) => `${point.x},${point.y}`).join(' L')} L${[...lower]
        .reverse()
        .map((point) => `${point.x},${point.y}`)
        .join(' L')} Z`;
    for (const descriptor of layers) {
      const segments: GeometrySegment[] = [];
      const isolated: ScreenPoint[] = [];
      for (const rows of runs) {
        const outer: ScreenPoint[] = [];
        const positiveUpper: ScreenPoint[] = [];
        const positiveLower: ScreenPoint[] = [];
        const negativeUpper: ScreenPoint[] = [];
        const negativeLower: ScreenPoint[] = [];
        for (const row of rows) {
          const value = (row.values[descriptor.id] ?? 0) * (weights[descriptor.id] ?? 0);
          const x = xPixel(row.x);
          const fromPositive = positive.get(row.x) ?? 0;
          const fromNegative = negative.get(row.x) ?? 0;
          const toPositive = fromPositive + Math.max(0, value);
          const toNegative = fromNegative + Math.min(0, value);
          positive.set(row.x, toPositive);
          negative.set(row.x, toNegative);
          positiveUpper.push({ x, y: screenY(toPositive) });
          positiveLower.push({ x, y: screenY(fromPositive) });
          negativeUpper.push({ x, y: screenY(toNegative) });
          negativeLower.push({ x, y: screenY(fromNegative) });
          outer.push({ x, y: screenY(value < 0 ? toNegative : toPositive) });
        }
        if (outer.length === 1) isolated.push(outer[0]);
        else {
          const segment = pathForSegment(outer, 'linear', baselineY);
          segments.push({
            ...segment,
            areaPath: `${polygon(positiveUpper, positiveLower)} ${polygon(negativeUpper, negativeLower)}`,
          });
        }
      }
      seriesGeometry[descriptor.id] = {
        seriesId: descriptor.id,
        curve: 'linear',
        segments,
        isolated,
      };
    }
  }

  function stackAreas(
    layers: readonly ChartSeries<T>[],
    weights: Readonly<Record<string, number>>,
    mode: StackMode,
  ): void {
    const stackData =
      mode === 'percent'
        ? {
            ...data,
            rows: data.rows.map((row) => {
              const total = layers.reduce(
                (sum, item) => sum + (row.values[item.id] ?? 0) * (weights[item.id] ?? 0),
                0,
              );
              return {
                ...row,
                values: {
                  ...row.values,
                  ...Object.fromEntries(
                    layers.map((item) => [
                      item.id,
                      row.values[item.id] === null || row.values[item.id] === undefined
                        ? null
                        : total > 0
                          ? (row.values[item.id]! / total) * 100
                          : 0,
                    ]),
                  ),
                },
              };
            }),
          }
        : data;
    const visible = layers.filter((item) => (weights[item.id] ?? 0) > 0).map((item) => item.id);
    const runs = contiguousSegments(
      stackData.rows.map((row) => ({
        ...row,
        values: { ...row.values, __stack: stackTotal(row, visible) },
      })),
      '__stack',
    );
    const scale = options.plotHeight / (options.yDomain[1] - options.yDomain[0]);
    const zeroY = screenY(0);
    const curve = layers[0]?.curve ?? 'monotone';
    const previous: Record<number, GeometrySegment> = {};
    const isolatedY: Record<number, number> = {};
    for (const descriptor of layers) {
      const segments: GeometrySegment[] = [];
      const isolated: ScreenPoint[] = [];
      const weight = weights[descriptor.id] ?? 0;
      for (const rows of runs) {
        const points = rows.map((row) => ({
          x: xPixel(row.x),
          y: (weight === 0 ? 0 : (row.values[descriptor.id] ?? 0)) * weight * scale,
        }));
        if (points.length === 1) {
          const point = points[0];
          const y = (isolatedY[point.x] ?? zeroY) - point.y;
          isolatedY[point.x] = y;
          isolated.push({ x: point.x, y });
          continue;
        }
        // Interpolate each non-negative thickness, then add its curve to the boundary below.
        // Unlike independently smoothed totals this cannot make thin layers cross each other.
        const thickness = pathForSegment(points, curve, 0);
        const lower = previous[rows[0].x];
        const subtract = (a: ScreenPoint | undefined, b: ScreenPoint): ScreenPoint => ({
          x: b.x,
          y: (a?.y ?? zeroY) - b.y,
        });
        const pieces: CurvePiece[] = thickness.pieces.map((piece, index) => {
          const below = lower?.pieces[index];
          const from = subtract(below?.from, piece.from);
          const to = subtract(below?.to, piece.to);
          return piece.kind === 'cubic'
            ? {
                kind: 'cubic',
                from,
                to,
                control1: subtract(
                  below?.kind === 'cubic' ? below.control1 : undefined,
                  piece.control1,
                ),
                control2: subtract(
                  below?.kind === 'cubic' ? below.control2 : undefined,
                  piece.control2,
                ),
              }
            : { kind: 'line', from, to };
        });
        const boundary = thickness.points.map((point, index) =>
          subtract(lower?.points[index], point),
        );
        const path = `M${boundary[0].x},${boundary[0].y} ` + pieces.map(pieceCommand).join(' ');
        const bottomPath = lower
          ? `L${lower.points.at(-1)!.x},${lower.points.at(-1)!.y} ` +
            [...lower.pieces]
              .reverse()
              .map((piece) => pieceCommand(reversePiece(piece)))
              .join(' ')
          : `L${boundary.at(-1)!.x},${zeroY} L${boundary[0].x},${zeroY}`;
        const segment: GeometrySegment = {
          points: boundary,
          pieces,
          path,
          areaPath: `${path} ${bottomPath} Z`,
          startX: boundary[0].x,
          endX: boundary.at(-1)!.x,
        };
        previous[rows[0].x] = segment;
        segments.push(segment);
      }
      seriesGeometry[descriptor.id] = { seriesId: descriptor.id, curve, segments, isolated };
    }
  }

  // Everything outside the stack: lines, grouped bars, and marks drawn over a stack.
  for (const descriptor of options.series) {
    if (stack?.series.includes(descriptor.id)) continue;
    const curve = options.curveBySeries[descriptor.id] ?? descriptor.curve ?? 'monotone';
    const yDomain = options.yDomainBySeries?.[descriptor.id] ?? options.yDomain;
    const segments: GeometrySegment[] = [];
    const isolated: ScreenPoint[] = [];
    for (const rows of contiguousSegments(data.rows, descriptor.id)) {
      if (rows.length === 1) {
        isolated.push({
          x: xPixel(rows[0].x),
          y:
            options.plotTop +
            mapY(
              rows[0].values[descriptor.id] as number,
              yDomain,
              options.plotHeight,
              options.yLog,
            ),
        });
        continue;
      }
      for (const run of statusRuns(rows, descriptor.id)) {
        const points = run.rows.map((row) => ({
          x: xPixel(row.x),
          y:
            options.plotTop +
            mapY(row.values[descriptor.id] as number, yDomain, options.plotHeight, options.yLog),
        }));
        segments.push({ ...pathForSegment(points, curve, baselineY), status: run.status });
      }
    }
    seriesGeometry[descriptor.id] = { seriesId: descriptor.id, curve, segments, isolated };
    const barIndex = barSeries.indexOf(descriptor.id);
    if (barIndex !== -1) {
      const zeroY = options.plotTop + mapY(0, yDomain, options.plotHeight, options.yLog);
      bars[descriptor.id] = data.rows.flatMap((row) => {
        const value = row.values[descriptor.id];
        if (
          value === null ||
          value === undefined ||
          row.x < options.xDomain[0] ||
          row.x > options.xDomain[1]
        )
          return [];
        const endY = options.plotTop + mapY(value, yDomain, options.plotHeight, options.yLog);
        return [
          {
            valueX: row.x,
            x:
              xPixel(row.x) -
              groupWidth / 2 +
              (options.barGap === undefined
                ? barIndex * slot + (slot - barWidth) / 2
                : barIndex * (barWidth + gap)),
            y: Math.min(zeroY, endY),
            width: barWidth,
            height: Math.abs(zeroY - endY),
            baseline: zeroY,
            negative: value < 0,
          },
        ];
      });
    }
  }

  return { series: seriesGeometry, bars, baselineY };
}

function pieceCommand(piece: CurvePiece): string {
  return piece.kind === 'line'
    ? `L${piece.to.x},${piece.to.y}`
    : `C${piece.control1.x},${piece.control1.y} ${piece.control2.x},${piece.control2.y} ${piece.to.x},${piece.to.y}`;
}

function reversePiece(piece: CurvePiece): CurvePiece {
  return piece.kind === 'line'
    ? { kind: 'line', from: piece.to, to: piece.from }
    : {
        kind: 'cubic',
        from: piece.to,
        to: piece.from,
        control1: piece.control2,
        control2: piece.control1,
      };
}

export function pointAtX(geometry: SeriesGeometry, x: number): ScreenPoint | null {
  let low = 0;
  let high = geometry.segments.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const segment = geometry.segments[middle];
    if (x < segment.startX) high = middle - 1;
    else if (x > segment.endX) low = middle + 1;
    else {
      if (geometry.curve === 'step-after' || geometry.curve === 'step-before') {
        let pointLow = 0;
        let pointHigh = segment.points.length - 1;
        while (pointLow <= pointHigh) {
          const pointMiddle = Math.floor((pointLow + pointHigh) / 2);
          const point = segment.points[pointMiddle];
          if (Math.abs(point.x - x) < 0.000001) return point;
          if (point.x < x) pointLow = pointMiddle + 1;
          else pointHigh = pointMiddle - 1;
        }
      }
      return pointInSegment(segment, x);
    }
  }
  for (const point of geometry.isolated) if (Math.abs(point.x - x) < 0.05) return point;
  return null;
}

function pointInSegment(segment: GeometrySegment, x: number): ScreenPoint | null {
  const pieces = segment.pieces;
  if (!pieces.length) return segment.points[0] ?? null;
  let low = 0;
  let high = pieces.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const piece = pieces[middle];
    const minX = Math.min(piece.from.x, piece.to.x);
    const maxX = Math.max(piece.from.x, piece.to.x);
    if (x < minX) high = middle - 1;
    else if (x > maxX) low = middle + 1;
    else return evaluatePiece(piece, x);
  }
  return null;
}

function evaluatePiece(piece: CurvePiece, x: number): ScreenPoint {
  if (piece.kind === 'line') {
    const span = piece.to.x - piece.from.x;
    const t = span === 0 ? 0 : (x - piece.from.x) / span;
    return { x, y: piece.from.y + (piece.to.y - piece.from.y) * t };
  }

  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const t = (low + high) / 2;
    const point = cubicPoint(piece, t);
    if (Math.abs(point.x - x) < 0.05) return { x, y: point.y };
    if (point.x < x) low = t;
    else high = t;
  }
  const point = cubicPoint(piece, (low + high) / 2);
  return { x, y: point.y };
}

function cubicPoint(piece: CubicPiece, t: number): ScreenPoint {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * piece.from.x +
      3 * inverse ** 2 * t * piece.control1.x +
      3 * inverse * t ** 2 * piece.control2.x +
      t ** 3 * piece.to.x,
    y:
      inverse ** 3 * piece.from.y +
      3 * inverse ** 2 * t * piece.control1.y +
      3 * inverse * t ** 2 * piece.control2.y +
      t ** 3 * piece.to.y,
  };
}
