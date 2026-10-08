'use client';

import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationMark,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { bad, bezier, clamp, frame, identity, ribbonMark, strokeRibbon } from './sculpted-geometry';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface ParallelRibbonsCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'aggregate'> {
  label: TextKey<Row>;
  /** Two or more numeric keys, ordered left to right. Each axis has its own scale. */
  metrics: readonly Key[];
  /** Optional display names for the metric keys. */
  metricLabels?: Partial<Record<Key, string>>;
  /** Fixed domains must contain all readings on their axis. */
  domains?: Partial<Record<Key, readonly [number, number]>>;
  /** Ribbon width in pixels, 2–14. Default 5. */
  thickness?: number;
}

export const placeholderProfiles = Array.from({ length: 6 }, (_, i) => ({
  name: `Profile ${i + 1}`,
  speed: 25 + ((i * 19) % 70),
  quality: 40 + ((i * 11) % 60),
  cost: 20 + ((i * 23) % 80),
  reach: 35 + ((i * 17) % 65),
}));

export function parallelRibbonsLayout<Row>(
  data: readonly Row[],
  label: string,
  metrics: readonly string[],
  width: number,
  height: number,
  options: {
    thickness?: number;
    color?: string;
    metricLabels?: Readonly<Record<string, string | undefined>>;
    domains?: Readonly<Record<string, readonly [number, number] | undefined>>;
  } = {},
): ObservationScene<Row> {
  if (metrics.length < 2 || new Set(metrics).size !== metrics.length)
    return bad('Choose at least two distinct numeric metrics.');
  const names = data.map((row) => readField(row, label));
  if (names.some((name) => typeof name !== 'string') || new Set(names).size !== names.length)
    return bad('Each row needs a unique text label.');
  if (!data.length) return { marks: [] };
  const domains = metrics.map((key) => {
    const values = data.flatMap((row) => {
      const n = readNumber(row, key);
      return n === null ? [] : [n];
    });
    const fixed = options.domains?.[key];
    const low = fixed?.[0] ?? Math.min(...values),
      high = fixed?.[1] ?? Math.max(...values);
    return {
      low: values.length || fixed ? low : 0,
      high: values.length || fixed ? high : 1,
      invalid:
        fixed !== undefined &&
        (!Number.isFinite(low) ||
          !Number.isFinite(high) ||
          low >= high ||
          values.some((n) => n < low || n > high)),
    };
  });
  if (domains.some((domain) => domain.invalid))
    return bad('Each fixed domain needs finite increasing bounds containing every reading.');
  const size = frame(Math.max(width, metrics.length * 96), height);
  const x = (i: number) => 36 + (i / (metrics.length - 1)) * (size.width - 72);
  const y = (value: number, i: number) => {
    const { low, high } = domains[i]!;
    return high === low
      ? size.height / 2
      : 30 + (1 - (value - low) / (high - low)) * (size.height - 85);
  };
  const thickness = clamp(options.thickness, 5, 2, 14);
  const marks: ObservationMark<Row>[] = [];
  const readings: NonNullable<ObservationScene<Row>['readings']> = [];
  data.forEach((datum, row) => {
    const name = names[row] as string;
    metrics.forEach((key, i) => {
      const value = readNumber(datum, key),
        previous = i ? readNumber(datum, metrics[i - 1]!) : null;
      const title = options.metricLabels?.[key] ?? key;
      const id = identity(name, key);
      readings.push({ id, label: `${name} · ${title}`, value });
      if (value === null) return;
      const sx = previous !== null ? x(i - 1) : x(i) - 10,
        sy = previous !== null ? y(previous, i - 1) : y(value, i);
      const ex = x(i),
        ey = y(value, i),
        middle = (sx + ex) / 2;
      marks.push(
        ribbonMark(
          {
            id,
            label: `${name} · ${title}`,
            datum,
            value,
            group: name,
            color: options.color ?? seriesColor(row),
            layer: row + 1,
            wave: (i / metrics.length) * 0.6 + (row / data.length) * 0.2,
          },
          strokeRibbon(bezier([sx, sy], [middle, sy], [middle, ey], [ex, ey]), thickness),
        ),
      );
    });
  });
  const labels = metrics.flatMap((key, i) => [
    {
      x: x(i),
      y: size.height - 10,
      text: options.metricLabels?.[key] ?? key,
      anchor: 'middle' as const,
    },
    {
      x: x(i),
      y: 17,
      text: String(Number(domains[i]!.high.toPrecision(4))),
      anchor: 'middle' as const,
    },
    {
      x: x(i),
      y: size.height - 39,
      text: String(Number(domains[i]!.low.toPrecision(4))),
      anchor: 'middle' as const,
    },
  ]);
  return {
    ...size,
    marks,
    labels,
    readings,
    highlightGroup: true,
    paths: metrics.map((key, i) => ({
      id: key,
      d: `M${x(i)},30 V${size.height - 55}`,
      stroke: 'var(--lilt-muted)',
      enter: 'draw',
      wave: i / metrics.length,
    })),
    groups: names.map((name, i) => ({
      id: name as string,
      label: name as string,
      color: options.color ?? seriesColor(i),
      value: null,
    })),
    note: 'Each axis has its own scale · Hover a ribbon for its ending metric · Missing readings break the thread',
  };
}

export function ParallelRibbonsCard<Row, const Key extends NumericKey<Row>>({
  label,
  metrics,
  metricLabels,
  domains,
  thickness,
  color,
  height = 300,
  ...props
}: ParallelRibbonsCardProps<Row, Key>) {
  const options = { metricLabels, domains, thickness, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        color={color}
        height={height}
        family="parallel-ribbons"
        layout={(rows, width, h) => ({
          ...parallelRibbonsLayout(rows, label, metrics, width, h, options),
          headline: rows.length || undefined,
        })}
        placeholder={(width, h) =>
          parallelRibbonsLayout(
            placeholderProfiles,
            'name',
            ['speed', 'quality', 'cost', 'reach'],
            width,
            h,
            { thickness, color },
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
