'use client';
import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { ternaryPrismLayout } from './spatial-point-layouts';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
export { ternaryPrismLayout } from './spatial-point-layouts';

export interface TernaryPrismCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  label: TextKey<Row>;
  a: NumericKey<Row>;
  b: NumericKey<Row>;
  c: NumericKey<Row>;
  value: Key;
  tilt?: number;
  rise?: number;
}
const placeholderRows = [
  { name: 'Balanced', a: 34, b: 33, c: 33, value: 48 },
  { name: 'Explorer', a: 16, b: 30, c: 54, value: 72 },
  { name: 'Builder', a: 62, b: 24, c: 14, value: 56 },
  { name: 'Connector', a: 22, b: 65, c: 13, value: 38 },
  { name: 'Generalist', a: 44, b: 36, c: 20, value: 65 },
  { name: 'Specialist', a: 8, b: 18, c: 74, value: 86 },
];
export function TernaryPrismCard<Row, const Key extends NumericKey<Row>>({
  label,
  a,
  b,
  c,
  value,
  tilt,
  rise,
  color,
  height = 340,
  depth = true,
  ...props
}: TernaryPrismCardProps<Row, Key>) {
  const options = { tilt, rise, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        depth={depth}
        height={height}
        color={color}
        family="ternary-prism"
        layout={(data, width, h) =>
          ternaryPrismLayout(data, label, a, b, c, value, width, h, options)
        }
        placeholder={(width, h) =>
          ternaryPrismLayout(placeholderRows, 'name', 'a', 'b', 'c', 'value', width, h, {
            ...options,
          }) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
