'use client';
import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { sunburstTerracesLayout } from './hierarchy-layouts';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
export { sunburstTerracesLayout } from './hierarchy-layouts';

export interface SunburstTerracesCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  path: TextKey<Row>;
  value: Key;
  tilt?: number;
  rise?: number;
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
export function SunburstTerracesCard<Row, const Key extends NumericKey<Row>>({
  path,
  value,
  tilt,
  rise,
  color,
  height = 360,
  depth = true,
  ...props
}: SunburstTerracesCardProps<Row, Key>) {
  const options = { tilt, rise, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        depth={depth}
        height={height}
        color={color}
        family="sunburst-terraces"
        layout={(data, width, h) => sunburstTerracesLayout(data, path, value, width, h, options)}
        placeholder={(width, h) =>
          sunburstTerracesLayout(placeholderRows, 'path', 'value', width, h, {
            ...options,
          }) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
