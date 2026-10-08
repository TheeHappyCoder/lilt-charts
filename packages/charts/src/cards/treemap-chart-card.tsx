'use client';

import { useState } from 'react';
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

export interface TreemapChartCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  /** Unique text field naming each leaf within its group. */
  label: TextKey<Row>;
  /** Nonnegative area. Null is missing; zero has no area. */
  value: Key;
  /** Optional parent category. Input rows are leaves, never parent totals. */
  group?: TextKey<Row>;
  /** Explore a parent group, with a breadcrumb back to all leaves. */
  drilldown?: boolean;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** Balanced binary tiling. Input order stays deterministic, with no random placement. */
export function tileAreas<T>(
  items: readonly T[],
  weight: (item: T) => number,
  rect: Rect,
): { item: T; rect: Rect }[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ item: items[0]!, rect }];
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let split = 1;
  let before = weight(items[0]!);
  while (
    split < items.length - 1 &&
    Math.abs(before + weight(items[split]!) - total / 2) < Math.abs(before - total / 2)
  ) {
    before += weight(items[split]!);
    split++;
  }
  const share = before / total;
  const horizontal = rect.width >= rect.height;
  const first = {
    ...rect,
    ...(horizontal ? { width: rect.width * share } : { height: rect.height * share }),
  };
  const second = horizontal
    ? { ...rect, x: rect.x + first.width, width: rect.width - first.width }
    : { ...rect, y: rect.y + first.height, height: rect.height - first.height };
  return [
    ...tileAreas(items.slice(0, split), weight, first),
    ...tileAreas(items.slice(split), weight, second),
  ];
}

export function treemapLayout<Row>(
  data: readonly Row[],
  label: string,
  value: string,
  group: string | undefined,
  width: number,
  height: number,
  color?: string,
): ObservationScene<Row> {
  const ids = new Set<string>();
  const rows = data.map((datum) => {
    const name = String(readField(datum, label) ?? '');
    const parent = group ? String(readField(datum, group) ?? '') : '';
    return {
      id: JSON.stringify([parent, name]),
      label: name,
      group: parent,
      datum,
      value: readNumber(datum, value),
    };
  });
  for (const row of rows) {
    if (!row.label.trim() || ids.has(row.id))
      return { marks: [], error: 'Each tile needs a unique, nonempty label within its group.' };
    ids.add(row.id);
    if (row.value !== null && row.value < 0)
      return { marks: [], error: 'Treemap areas must be nonnegative.' };
  }
  const positive = rows.filter((row) => row.value !== null && row.value > 0);
  if (!Number.isFinite(positive.reduce((sum, row) => sum + row.value!, 0)))
    return { marks: [], error: 'The total area is too large to display.' };
  const groups = [...new Set(rows.map((row) => row.group))];
  const parents = groups
    .map((id, index) => ({
      id,
      label: id,
      color: color ?? seriesColor(index),
      value: rows.filter((row) => row.group === id).reduce((sum, row) => sum + (row.value ?? 0), 0),
      rows: positive.filter((row) => row.group === id),
    }))
    .filter((item) => item.rows.length);
  const marks: ObservationMark<Row>[] = [];
  const labels: NonNullable<ObservationScene<Row>['labels']> = [];
  for (const parent of tileAreas(parents, (item) => item.value, {
    x: 0,
    y: 0,
    width,
    height: height - 4,
  })) {
    const { rect, item } = parent;
    const labelHeight = group && rect.width > 60 && rect.height > 44 ? 22 : 0;
    if (labelHeight)
      labels.push({
        x: rect.x + 4,
        y: rect.y + 14,
        text:
          item.label.length > Math.floor(rect.width / 7)
            ? `${item.label.slice(0, Math.max(1, Math.floor(rect.width / 7) - 1))}…`
            : item.label,
      });
    const leaves = tileAreas(item.rows, (row) => row.value!, {
      ...rect,
      y: rect.y + labelHeight,
      height: rect.height - labelHeight,
    });
    for (const { item: row, rect: box } of leaves) {
      const gap = Math.min(4, box.width / 4, box.height / 4);
      marks.push({
        ...row,
        ...box,
        width: Math.max(0, box.width - gap),
        height: Math.max(0, box.height - gap),
        color: group ? item.color : (color ?? seriesColor(rows.indexOf(row))),
        text: box.width > 55 && box.height > 26 ? row.label : undefined,
      });
    }
  }
  const omitted = rows.length - positive.length;
  return {
    marks,
    labels,
    readings: rows,
    groups: group ? parents : undefined,
    note: omitted
      ? `${omitted} ${omitted === 1 ? 'tile has' : 'tiles have'} zero or missing area; all readings remain in the accessible table.`
      : undefined,
  };
}

export function TreemapChartCard<Row, const Key extends NumericKey<Row>>({
  label,
  value,
  group,
  color,
  drilldown = false,
  ...props
}: TreemapChartCardProps<Row, Key>) {
  const [opened, setOpened] = useState<string | null>(null);
  const scope = drilldown && group ? opened : null;
  return (
    <EmptyShapeContext.Provider value="tiles">
      <ObservationsCard
        {...props}
        color={color}
        family="treemap"
        scope={scope ?? ''}
        renderControls={
          drilldown && group
            ? (scene, active) => (
                <nav className="lilt-observations-card__controls" aria-label="Treemap groups">
                  <button type="button" onClick={() => setOpened(null)} disabled={!scope}>
                    All groups
                  </button>
                  {scope && scene.groups?.some((g) => g.id === scope) ? (
                    <span aria-current="page">{scope}</span>
                  ) : (
                    <>
                      {scene.groups?.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          data-active={active?.group === g.id || undefined}
                          onClick={() => setOpened(g.id)}
                        >
                          Open {g.label}
                        </button>
                      ))}
                    </>
                  )}
                </nav>
              )
            : undefined
        }
        layout={(data, width, height) => {
          const complete = treemapLayout(data, label, value, group, width, height, color);
          if (!scope || !group || complete.error) return complete;
          const rows = data.filter((row) => String(readField(row, group)) === scope);
          if (!rows.length) return complete;
          const detail = treemapLayout(
            rows,
            label,
            value,
            undefined,
            width,
            height,
            color ?? complete.groups?.find((g) => g.id === scope)?.color,
          );
          return { ...detail, groups: complete.groups?.filter((g) => g.id === scope) };
        }}
        placeholder={(width, height) =>
          treemapLayout(
            [
              { label: 'A', value: 32 },
              { label: 'B', value: 24 },
              { label: 'C', value: 18 },
              { label: 'D', value: 14 },
              { label: 'E', value: 12 },
            ],
            'label',
            'value',
            undefined,
            width,
            height,
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
