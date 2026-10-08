'use client';
import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { circleArchipelagoLayout } from './hierarchy-layouts';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
export { circleArchipelagoLayout } from './hierarchy-layouts';

export interface CircleArchipelagoCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  path: TextKey<Row>;
  value: Key;
  padding?: number;
}
const placeholderRows = [
  { path: 'Product/Platform/API', value: 42 },
  { path: 'Product/Platform/Storage', value: 26 },
  { path: 'Product/Experience/Web', value: 32 },
  { path: 'Product/Experience/Mobile', value: 24 },
  { path: 'Operations/Support', value: 29 },
  { path: 'Operations/Success', value: 18 },
  { path: 'Growth/Acquisition', value: 34 },
  { path: 'Growth/Retention', value: 22 },
];
export function CircleArchipelagoCard<Row, const Key extends NumericKey<Row>>({
  path,
  value,
  padding,
  color,
  height = 380,
  depth = true,
  ...props
}: CircleArchipelagoCardProps<Row, Key>) {
  const options = { padding, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        depth={depth}
        height={height}
        color={color}
        family="circle-archipelago"
        layout={(data, width, h) => circleArchipelagoLayout(data, path, value, width, h, options)}
        placeholder={(width, h) =>
          circleArchipelagoLayout(placeholderRows, 'path', 'value', width, h, {
            ...options,
          }) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
