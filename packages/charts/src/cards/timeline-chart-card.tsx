'use client';

import type { TextKey, TimeKey } from './keys';
import { utcDate } from './calendar-heatmap-card';
import {
  ObservationsCard,
  readField,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
  type ObservationMark,
} from './observations-card';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface TimelineChartCardProps<Row> extends ObservationsCardProps<Row> {
  label: TextKey<Row>;
  /** Optional stable identity when labels repeat. */
  id?: TextKey<Row>;
  start: TimeKey<Row>;
  end: TimeKey<Row>;
  /** Intervals sharing a lane stack into subrows when they overlap. */
  lane?: TextKey<Row>;
  /** Optional color category, such as a machine state. */
  group?: TextKey<Row>;
  /** Formats UTC axis labels and interval endpoints. */
  formatTime?: (timestamp: number) => string;
}

export function intervalTime(value: unknown): number | null {
  if (typeof value === 'string' && utcDate(value.slice(0, 10)) === null) return null;
  const result =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)
          ? Date.parse(
              value.includes('T') && !/(Z|[+-]\d{2}:\d{2})$/.test(value) ? `${value}Z` : value,
            )
          : NaN;
  return Number.isFinite(result) && Number.isFinite(new Date(result).getTime()) ? result : null;
}

export function timelineLayout<Row>(
  data: readonly Row[],
  options: Pick<
    TimelineChartCardProps<Row>,
    'label' | 'id' | 'start' | 'end' | 'lane' | 'group' | 'color'
  >,
  width: number,
  height: number,
  formatTime: (time: number) => string,
): ObservationScene<Row> {
  const ids = new Set<string>();
  const readings = data.map((datum, index) => {
    const label = String(readField(datum, options.label) ?? '');
    const id = options.id ? String(readField(datum, options.id) ?? '') : label;
    const start = intervalTime(readField(datum, options.start));
    const end = intervalTime(readField(datum, options.end));
    return {
      id,
      label,
      datum,
      start,
      end,
      value: start === null || end === null ? null : end - start,
      lane: options.lane ? String(readField(datum, options.lane) ?? '') : label,
      group: options.group ? String(readField(datum, options.group) ?? '') : undefined,
      index,
      detail:
        start === null || end === null ? 'No data' : `${formatTime(start)} – ${formatTime(end)}`,
    };
  });
  for (const row of readings) {
    if (!row.id.trim() || ids.has(row.id))
      return { marks: [], error: 'Each interval needs a unique label or id.' };
    ids.add(row.id);
    if (row.value !== null && row.value < 0)
      return { marks: [], error: 'An interval ends before it starts.' };
  }
  const valid = readings.filter((row) => row.start !== null && row.end !== null);
  if (!valid.length)
    return {
      marks: [],
      readings,
      note: data.length ? 'No intervals have both endpoints.' : undefined,
    };
  const low = Math.min(...valid.map((row) => row.start!));
  const high = Math.max(low + 1, ...valid.map((row) => row.end!));
  const lanes = [...new Set(valid.map((row) => row.lane))];
  const groups = [
    ...new Set(valid.map((row) => row.group).filter((g): g is string => g !== undefined)),
  ];
  const sceneWidth = Math.max(280, width);
  const left = Math.min(100, sceneWidth * 0.25);
  const right = sceneWidth - 10;
  const position = (time: number) => left + ((time - low) / (high - low)) * (right - left);
  const marks: ObservationMark<Row>[] = [];
  const labels: NonNullable<ObservationScene<Row>['labels']> = [];
  let top = 8;
  for (const [laneIndex, lane] of lanes.entries()) {
    const ends: number[] = [];
    const rows = valid
      .filter((row) => row.lane === lane)
      .sort((a, b) => a.start! - b.start! || a.index - b.index);
    for (const row of rows) {
      let track = ends.findIndex((end) => end <= row.start!);
      if (track < 0) track = ends.length;
      ends[track] = row.end!;
      const x = position(row.start!);
      const barWidth = position(row.end!) - x;
      marks.push({
        ...row,
        x: Math.min(x, right - 2),
        y: top + track * 32,
        width: Math.max(2, barWidth),
        height: 22,
        color:
          options.color ??
          seriesColor(row.group === undefined ? laneIndex : groups.indexOf(row.group)),
        shape: 'bar',
        text: barWidth > 60 ? row.label : undefined,
      });
    }
    labels.push({
      x: left - 10,
      y: top + 15,
      text: lane.length > 13 ? `${lane.slice(0, 12)}…` : lane,
      anchor: 'end',
    });
    top += Math.max(1, ends.length) * 32 + 12;
  }
  const sceneHeight = Math.max(height, top + 28);
  const ticks = sceneWidth < 420 ? 3 : 4;
  for (let i = 0; i < ticks; i++) {
    const time = low + (i / (ticks - 1)) * (high - low);
    labels.push({
      x: position(time),
      y: sceneHeight - 6,
      text: formatTime(time),
      anchor: i === 0 ? 'start' : i === ticks - 1 ? 'end' : 'middle',
    });
  }
  return {
    marks,
    labels,
    readings,
    width: sceneWidth,
    height: sceneHeight,
    groups: groups.length
      ? groups.map((id, index) => ({
          id,
          label: id,
          color: options.color ?? seriesColor(index),
          value: valid.filter((row) => row.group === id).reduce((sum, row) => sum + row.value!, 0),
        }))
      : undefined,
    note:
      readings.length > valid.length
        ? `${readings.length - valid.length} intervals are missing endpoints and are not plotted.`
        : 'Times in UTC · Overlapping intervals occupy separate rows',
  };
}

export function TimelineChartCard<Row>({
  label,
  id,
  start,
  end,
  lane,
  group,
  color,
  formatTime: suppliedFormatTime,
  locale,
  formatValue,
  aggregate = 'sum',
  ...props
}: TimelineChartCardProps<Row>) {
  const time = new Intl.DateTimeFormat(locale ?? 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  const number = new Intl.NumberFormat(locale ?? 'en-US', { maximumFractionDigits: 1 });
  const formatTime = suppliedFormatTime ?? ((value: number) => time.format(value));
  return (
    <EmptyShapeContext.Provider value="rows">
      <ObservationsCard
        {...props}
        locale={locale}
        aggregate={aggregate}
        formatValue={formatValue ?? ((duration) => `${number.format(duration / 3_600_000)} h`)}
        color={color}
        family="timeline"
        layout={(data, width, height) =>
          timelineLayout(
            data,
            { label, id, start, end, lane, group, color },
            width,
            height,
            formatTime,
          )
        }
        placeholder={(width, height) => ({
          height,
          marks: Array.from({ length: 5 }, (_, index) => ({
            id: String(index),
            label: '',
            datum: null,
            value: null,
            x: 80 + (index % 3) * (width - 100) * 0.13,
            y: 12 + index * ((height - 50) / 5),
            width: (width - 100) * [0.55, 0.38, 0.45, 0.7, 0.3][index]!,
            height: 22,
            color: '',
            shape: 'bar' as const,
          })),
        })}
      />
    </EmptyShapeContext.Provider>
  );
}
