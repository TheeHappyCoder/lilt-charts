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
import {
  bad,
  bezier,
  clamp,
  frame,
  identity,
  ribbonMark,
  strokeRibbon,
  type Point,
} from './sculpted-geometry';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface RankRibbonsCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  series: TextKey<Row>;
  period: TextKey<Row>;
  value: Key;
  /** Descending puts the largest score first; ascending puts the smallest first. */
  order?: 'descending' | 'ascending';
  /** Ribbon width in pixels, 3–18. Default 10. */
  thickness?: number;
}

export const placeholderRanks = ['Atlas', 'Bloom', 'Cove', 'Dune'].flatMap((team, i) =>
  ['Jan', 'Feb', 'Mar', 'Apr'].map((month, j) => ({
    team,
    month,
    score: 20 + ((i * 13 + j * 7) % 31),
  })),
);

export function rankRibbonsLayout<Row>(
  data: readonly Row[],
  series: string,
  period: string,
  value: string,
  width: number,
  height: number,
  options: { order?: 'descending' | 'ascending'; thickness?: number; color?: string } = {},
): ObservationScene<Row> {
  const names: string[] = [],
    periods: string[] = [];
  const entries = new Map<string, { datum: Row; value: number | null }>();
  for (const datum of data) {
    const name = readField(datum, series),
      at = readField(datum, period);
    if (typeof name !== 'string' || typeof at !== 'string')
      return bad('Each row needs text series and period fields.');
    const id = identity(name, at);
    if (entries.has(id)) return bad('Each series and period needs one row.');
    entries.set(id, { datum, value: readNumber(datum, value) });
    if (!names.includes(name)) names.push(name);
    if (!periods.includes(at)) periods.push(at);
  }
  if (!entries.size) return { marks: [] };
  const size = frame(
    Math.max(width, periods.length * 68 + 72),
    Math.max(height, names.length * 28 + 60),
  );
  const ranks = periods.map((at) => {
    const sorted = names
      .flatMap((name) => {
        const n = entries.get(identity(name, at))?.value;
        return n === null || n === undefined ? [] : [{ name, value: n }];
      })
      .sort((a, b) => (options.order === 'ascending' ? 1 : -1) * (a.value - b.value));
    const result = new Map<string, number>();
    sorted.forEach((item, index) =>
      result.set(
        item.name,
        index > 0 && item.value === sorted[index - 1]!.value
          ? result.get(sorted[index - 1]!.name)!
          : index + 1,
      ),
    );
    return result;
  });
  const x = (i: number) =>
    periods.length === 1 ? size.width / 2 : 58 + (i / (periods.length - 1)) * (size.width - 116);
  const y = (rank: number) =>
    26 + ((rank - 1) / Math.max(1, names.length - 1)) * (size.height - 80);
  const thickness = clamp(options.thickness, 10, 3, 18);
  const marks: ObservationMark<Row>[] = [];
  const readings: NonNullable<ObservationScene<Row>['readings']> = [];
  names.forEach((name, index) =>
    periods.forEach((at, p) => {
      const item = entries.get(identity(name, at));
      const rank = ranks[p]!.get(name);
      const prev = ranks[p - 1]?.get(name);
      const id = identity(name, at);
      const label = `${name} · ${at}`;
      const n = item?.value ?? null;
      readings.push({ id, label, value: n });
      const color = options.color ?? seriesColor(index);
      if (rank === undefined) return;
      const end: Point = [x(p), y(rank)];
      const start: Point = p > 0 && prev !== undefined ? [x(p - 1), y(prev)] : [x(p) - 12, y(rank)];
      const middle = (start[0] + end[0]) / 2;
      marks.push(
        ribbonMark(
          {
            id,
            label: `${label} · Rank ${rank}`,
            datum: item?.datum ?? null,
            value: n,
            color,
            group: name,
            layer: index + 1,
            wave: (p / Math.max(1, periods.length - 1)) * 0.65 + (index / names.length) * 0.2,
          },
          strokeRibbon(bezier(start, [middle, start[1]], [middle, end[1]], end), thickness),
        ),
      );
    }),
  );
  return {
    ...size,
    marks,
    readings,
    highlightGroup: true,
    labels: [
      ...periods.map((at, i) => ({
        x: x(i),
        y: size.height - 10,
        text: at,
        anchor: 'middle' as const,
      })),
      ...names.map((_, i) => ({ x: 14, y: y(i + 1) + 4, text: `#${i + 1}` })),
    ],
    groups: names.map((name, i) => ({
      id: name,
      label: name,
      color: options.color ?? seriesColor(i),
      value: entries.get(identity(name, periods.at(-1)!))?.value ?? null,
    })),
    note: 'Higher tracks rank first · Hover a segment for its ending period · Gaps stay disconnected; ties share a rank',
  };
}

export function RankRibbonsCard<Row, const Key extends NumericKey<Row>>({
  series,
  period,
  value,
  order,
  thickness,
  color,
  height = 300,
  aggregate = 'mean',
  ...props
}: RankRibbonsCardProps<Row, Key>) {
  const options = { order, thickness, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        aggregate={aggregate}
        color={color}
        height={height}
        family="rank-ribbons"
        layout={(data, width, h) =>
          rankRibbonsLayout(data, series, period, value, width, h, options)
        }
        placeholder={(width, h) =>
          rankRibbonsLayout(
            placeholderRanks,
            'team',
            'month',
            'score',
            width,
            h,
            options,
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
