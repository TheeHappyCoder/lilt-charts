'use client';
import type { NumericKey, KeysOfType } from './keys';
import {
  ObservationsCard,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { intersectionTowersLayout } from './spatial-composition-layouts';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
export { intersectionTowersLayout } from './spatial-composition-layouts';

export interface IntersectionTowersCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  members: KeysOfType<Row, readonly string[]>;
  value: Key;
  sort?: 'value' | 'input';
}
const placeholderRows = [
  { sets: ['Search'], value: 128 },
  { sets: ['Email'], value: 96 },
  { sets: ['Social'], value: 72 },
  { sets: ['Search', 'Email'], value: 84 },
  { sets: ['Search', 'Social'], value: 56 },
  { sets: ['Email', 'Social'], value: 42 },
  { sets: ['Search', 'Email', 'Social'], value: 32 },
];
export function IntersectionTowersCard<Row, const Key extends NumericKey<Row>>({
  members,
  value,
  sort,
  color,
  height = 340,
  depth = true,
  ...props
}: IntersectionTowersCardProps<Row, Key>) {
  const options = { sort, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        depth={depth}
        height={height}
        color={color}
        family="intersection-towers"
        layout={(data, width, h) =>
          intersectionTowersLayout(data, members, value, width, h, options)
        }
        placeholder={(width, h) =>
          intersectionTowersLayout(placeholderRows, 'sets', 'value', width, h, {
            ...options,
          }) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
