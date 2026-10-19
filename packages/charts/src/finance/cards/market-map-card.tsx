'use client';

import { useMemo, type ReactElement } from 'react';
import type { NumericKey, TextKey } from '../../cards/keys';
import {
  ObservationsCard,
  readField,
  readNumber,
  type ObservationsCardProps,
  type ObservationScene,
} from '../../cards/observations-card';
import { treemapLayout } from '../../cards/treemap-chart-card';
import { EmptyShapeContext } from '../../lifecycle/chart-empty';
import { changeTone, percentFormat, signedPercent } from './change-tone';

export interface MarketMapCardProps<Row, Key extends NumericKey<Row>>
  extends Omit<ObservationsCardProps<Row>, 'color'> {
  /** Unique text field naming each instrument within its group, such as its ticker. */
  label: TextKey<Row>;
  /** Tile area, such as market cap. Nonnegative; null is missing and zero has no area. */
  value: Key;
  /** Fractional change that colors each tile: 0.012 is up 1.2%. */
  change: NumericKey<Row>;
  /** Optional parent category, such as a sector, named over its tiles. */
  group?: TextKey<Row>;
  /** The change at which tiles reach full color. Defaults to 0.03, a 3% move. */
  scale?: number;
}

const demo = [
  { label: 'A', value: 32, change: 0.02 },
  { label: 'B', value: 24, change: -0.01 },
  { label: 'C', value: 18, change: 0.03 },
  { label: 'D', value: 14, change: -0.02 },
  { label: 'E', value: 12, change: 0.005 },
];

/** The treemap's tiles, recolored by each instrument's change and labeled with it. */
export function marketMapLayout<Row>(
  data: readonly Row[],
  label: string,
  value: string,
  change: string,
  group: string | undefined,
  scale: number,
  width: number,
  height: number,
  percent: (value: number) => string,
): ObservationScene<Row> {
  if (!(scale > 0)) return { marks: [], error: 'The color scale must be a positive change.' };
  const scene = treemapLayout(data, label, value, group, width, height);
  if (scene.error) return scene;
  const marks = scene.marks.map((mark) => {
    const moved = mark.datum ? readNumber(mark.datum, change) : null;
    const text = moved === null ? '—' : signedPercent(moved, percent);
    // Big tiles carry the name and the move; small ones the name alone; the smallest neither.
    const room = mark.width > 64 && mark.height > 40;
    return {
      ...mark,
      color: changeTone(moved, scale),
      text: room ? `${mark.label} ${text}` : mark.text,
      description: moved === null ? 'No change' : text,
    };
  });
  // Every row stays in the accessible table, including tiles too small or empty to draw.
  const readings = data.map((datum) => {
    const name = String(readField(datum, label) ?? '');
    const parent = group ? String(readField(datum, group) ?? '') : '';
    const moved = readNumber(datum, change);
    return {
      id: JSON.stringify([parent, name]),
      label: parent ? `${name} (${parent})` : name,
      value: readNumber(datum, value),
      description: moved === null ? 'No change' : signedPercent(moved, percent),
    };
  });
  return {
    ...scene,
    marks,
    readings,
    // Tiles carry the move, so a sector legend in palette colors would contradict them.
    groups: undefined,
  };
}

/**
 * A market at a glance: every instrument a tile sized by its weight, such as market cap, and
 * colored green or red by how far it moved, grouped by sector. Hover reads its value and move.
 */
export function MarketMapCard<Row, const Key extends NumericKey<Row>>({
  label,
  value,
  change,
  group,
  scale = 0.03,
  legend = false,
  locale = 'en-US',
  ...props
}: MarketMapCardProps<Row, Key>): ReactElement {
  const percent = useMemo(() => percentFormat(locale), [locale]);
  return (
    <EmptyShapeContext.Provider value="tiles">
      <ObservationsCard
        {...props}
        locale={locale}
        legend={legend}
        family="market-map"
        layout={(data, width, height) =>
          marketMapLayout(data, label, value, change, group, scale, width, height, percent)
        }
        placeholder={(width, height) =>
          marketMapLayout(
            demo,
            'label',
            'value',
            'change',
            undefined,
            0.03,
            width,
            height,
            percent,
          ) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
