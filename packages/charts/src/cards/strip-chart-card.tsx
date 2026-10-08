'use client';

import { scaleLinear } from 'd3-scale';
import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
  type ObservationMark,
} from './observations-card';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface StripChartCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'legend' | 'legendSwatch'> {
  category: TextKey<Row>;
  value: Key;
  /** Unique point identity and accessible name. Falls back to the row index. */
  label?: TextKey<Row>;
  /** Strip uses deterministic vertical jitter; beeswarm avoids collisions. */
  display?: 'strip' | 'beeswarm';
  radius?: number;
}

/** Move only across the category band; each numeric position stays exact. */
export function swarmOffsets(positions: readonly number[], diameter: number): number[] {
  const offsets: number[] = [];
  for (let index = 0; index < positions.length; index++) {
    // Each neighbor excludes one vertical interval. Merge those intervals to find the
    // nearest free location, instead of trying every candidate against every neighbor.
    const intervals = offsets
      .flatMap((offset, previous) => {
        const distance = Math.abs(positions[index]! - positions[previous]!);
        if (distance >= diameter) return [];
        const dy = Math.sqrt(diameter * diameter - distance * distance) + 0.01;
        return [[offset - dy, offset + dy] as const];
      })
      .sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [low, high] of intervals) {
      const previous = merged.at(-1);
      if (previous && low <= previous[1]) previous[1] = Math.max(previous[1], high);
      else merged.push([low, high]);
    }
    const blocked = merged.find(([low, high]) => low < 0 && high > 0);
    offsets.push(blocked ? (Math.abs(blocked[0]) <= blocked[1] ? blocked[0] : blocked[1]) : 0);
  }
  return offsets;
}

function jitter(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++)
    hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  return ((hash >>> 0) % 1000) / 999 - 0.5;
}

export function stripLayout<Row>(
  data: readonly Row[],
  category: string,
  value: string,
  label: string | undefined,
  width: number,
  height: number,
  display: 'strip' | 'beeswarm',
  radius: number,
  format: (value: number) => string,
  color?: string,
): ObservationScene<Row> {
  const rows = data.map((datum, index) => ({
    id: label ? String(readField(datum, label) ?? '') : String(index),
    label: label ? String(readField(datum, label) ?? '') : `Point ${index + 1}`,
    group: String(readField(datum, category) ?? ''),
    datum,
    value: readNumber(datum, value),
  }));
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.id.trim() || ids.has(row.id))
      return { marks: [], error: 'Point labels must be nonempty and unique.' };
    ids.add(row.id);
  }
  const known = rows.filter((row) => row.value !== null);
  if (!known.length) return { marks: [], readings: rows };
  const groups = [...new Set(rows.map((row) => row.group))];
  const sceneWidth = Math.max(260, width);
  const left = Math.min(100, sceneWidth * 0.27);
  const r = Math.max(2, Math.min(12, Number.isFinite(radius) ? radius : 4));
  const values = known.map((row) => row.value!);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const scale = scaleLinear()
    .domain(low === high ? [low - 1, high + 1] : [low, high])
    .nice()
    .range([left + r + 3, sceneWidth - r - 10]);
  const marks: ObservationMark<Row>[] = [];
  const labels: NonNullable<ObservationScene<Row>['labels']> = [];
  let top = 4;
  for (const [index, group] of groups.entries()) {
    const members = known
      .filter((row) => row.group === group)
      .sort((a, b) => a.value! - b.value! || a.id.localeCompare(b.id));
    const positions = members.map((row) => scale(row.value!));
    const offsets =
      display === 'beeswarm'
        ? swarmOffsets(positions, r * 2 + 1.5)
        : members.map((row) => jitter(row.id) * 28);
    const extent = Math.max(16, ...offsets.map((offset) => Math.abs(offset) + r));
    const bandHeight = Math.max(extent * 2 + 16, (height - 32) / groups.length);
    const center = top + bandHeight / 2;
    labels.push({
      x: left - 8,
      y: center + 4,
      text: group.length > 13 ? `${group.slice(0, 12)}…` : group,
      anchor: 'end',
    });
    members.forEach((row, point) =>
      marks.push({
        ...row,
        label: `${row.label} · ${group}`,
        x: positions[point]! - r,
        y: center + offsets[point]! - r,
        width: r * 2,
        height: r * 2,
        color: color ?? seriesColor(index),
        shape: 'dot',
      }),
    );
    top += bandHeight;
  }
  const sceneHeight = Math.max(height, top + 26);
  for (const tick of scale.ticks(sceneWidth < 400 ? 3 : 5))
    labels.push({ x: scale(tick), y: sceneHeight - 4, text: format(tick), anchor: 'middle' });
  return {
    marks,
    labels,
    readings: rows,
    height: sceneHeight,
    width: sceneWidth,
    note:
      known.length < rows.length
        ? `${rows.length - known.length} ${rows.length - known.length === 1 ? 'point is' : 'points are'} missing a value and not plotted.`
        : undefined,
  };
}

export function StripChartCard<Row, const Key extends NumericKey<Row>>({
  category,
  value,
  label,
  display = 'strip',
  radius = 4,
  color,
  locale,
  valueFormat,
  formatValue,
  aggregate = 'mean',
  ...props
}: StripChartCardProps<Row, Key>) {
  const format =
    formatValue ??
    new Intl.NumberFormat(locale ?? 'en-US', valueFormat ?? { maximumFractionDigits: 2 }).format;
  return (
    <EmptyShapeContext.Provider value="points">
      <ObservationsCard
        {...props}
        color={color}
        locale={locale}
        valueFormat={valueFormat}
        formatValue={formatValue}
        aggregate={aggregate}
        family="strip"
        legend={false}
        layout={(data, width, height) =>
          stripLayout(data, category, value, label, width, height, display, radius, format, color)
        }
        placeholder={(width, height) => ({
          marks: Array.from({ length: 30 }, (_, index) => ({
            id: String(index),
            label: '',
            datum: null,
            value: null,
            x: 80 + (((index * 37) % 97) / 100) * (width - 100),
            y: 32 + Math.floor(index / 10) * ((height - 65) / 3) + jitter(String(index)) * 20,
            width: 8,
            height: 8,
            color: '',
            shape: 'dot' as const,
          })),
        })}
      />
    </EmptyShapeContext.Provider>
  );
}
