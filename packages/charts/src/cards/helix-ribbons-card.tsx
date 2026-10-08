'use client';
import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { helixRibbonsLayout } from './spatial-series-layouts';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
export { helixRibbonsLayout } from './spatial-series-layouts';

export interface HelixRibbonsCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  series: TextKey<Row>;
  cycle: NumericKey<Row>;
  phase: NumericKey<Row>;
  value: Key;
  yaw?: number;
  elevation?: number;
  thickness?: number;
  maxGap?: number;
}
const placeholderRows = [
  { series: 'API', cycle: 0, phase: 0, value: 48 },
  { series: 'API', cycle: 0, phase: 0.125, value: 59 },
  { series: 'API', cycle: 0, phase: 0.25, value: 59 },
  { series: 'API', cycle: 0, phase: 0.375, value: 52 },
  { series: 'API', cycle: 0, phase: 0.5, value: 42 },
  { series: 'API', cycle: 0, phase: 0.625, value: 34 },
  { series: 'API', cycle: 0, phase: 0.75, value: 29 },
  { series: 'API', cycle: 0, phase: 0.875, value: 25 },
  { series: 'API', cycle: 1, phase: 0, value: 22 },
  { series: 'API', cycle: 1, phase: 0.125, value: 24 },
  { series: 'API', cycle: 1, phase: 0.25, value: 32 },
  { series: 'API', cycle: 1, phase: 0.375, value: 46 },
  { series: 'API', cycle: 1, phase: 0.5, value: 60 },
  { series: 'API', cycle: 1, phase: 0.625, value: 66 },
  { series: 'API', cycle: 1, phase: 0.75, value: 59 },
  { series: 'API', cycle: 1, phase: 0.875, value: 40 },
  { series: 'API', cycle: 2, phase: 0, value: 18 },
  { series: 'API', cycle: 2, phase: 0.125, value: 5 },
  { series: 'API', cycle: 2, phase: 0.25, value: 8 },
  { series: 'API', cycle: 2, phase: 0.375, value: 27 },
  { series: 'API', cycle: 2, phase: 0.5, value: 50 },
  { series: 'API', cycle: 2, phase: 0.625, value: 66 },
  { series: 'API', cycle: 2, phase: 0.75, value: 68 },
  { series: 'API', cycle: 2, phase: 0.875, value: 55 },
  { series: 'API', cycle: 3, phase: 0, value: 37 },
  { series: 'API', cycle: 3, phase: 0.125, value: 22 },
  { series: 'API', cycle: 3, phase: 0.25, value: 17 },
  { series: 'API', cycle: 3, phase: 0.375, value: 21 },
  { series: 'API', cycle: 3, phase: 0.5, value: 29 },
  { series: 'API', cycle: 3, phase: 0.625, value: 37 },
  { series: 'API', cycle: 3, phase: 0.75, value: 43 },
  { series: 'API', cycle: 3, phase: 0.875, value: 49 },
  { series: 'Workers', cycle: 0, phase: 0, value: 64 },
  { series: 'Workers', cycle: 0, phase: 0.125, value: 72 },
  { series: 'Workers', cycle: 0, phase: 0.25, value: 63 },
  { series: 'Workers', cycle: 0, phase: 0.375, value: 42 },
  { series: 'Workers', cycle: 0, phase: 0.5, value: 20 },
  { series: 'Workers', cycle: 0, phase: 0.625, value: 8 },
  { series: 'Workers', cycle: 0, phase: 0.75, value: 11 },
  { series: 'Workers', cycle: 0, phase: 0.875, value: 26 },
  { series: 'Workers', cycle: 1, phase: 0, value: 44 },
  { series: 'Workers', cycle: 1, phase: 0.125, value: 56 },
  { series: 'Workers', cycle: 1, phase: 0.25, value: 58 },
  { series: 'Workers', cycle: 1, phase: 0.375, value: 53 },
  { series: 'Workers', cycle: 1, phase: 0.5, value: 45 },
  { series: 'Workers', cycle: 1, phase: 0.625, value: 38 },
  { series: 'Workers', cycle: 1, phase: 0.75, value: 31 },
  { series: 'Workers', cycle: 1, phase: 0.875, value: 26 },
  { series: 'Workers', cycle: 2, phase: 0, value: 21 },
  { series: 'Workers', cycle: 2, phase: 0.125, value: 21 },
  { series: 'Workers', cycle: 2, phase: 0.25, value: 28 },
  { series: 'Workers', cycle: 2, phase: 0.375, value: 42 },
  { series: 'Workers', cycle: 2, phase: 0.5, value: 58 },
  { series: 'Workers', cycle: 2, phase: 0.625, value: 67 },
  { series: 'Workers', cycle: 2, phase: 0.75, value: 62 },
  { series: 'Workers', cycle: 2, phase: 0.875, value: 44 },
  { series: 'Workers', cycle: 3, phase: 0, value: 22 },
  { series: 'Workers', cycle: 3, phase: 0.125, value: 6 },
  { series: 'Workers', cycle: 3, phase: 0.25, value: 6 },
  { series: 'Workers', cycle: 3, phase: 0.375, value: 22 },
  { series: 'Workers', cycle: 3, phase: 0.5, value: 46 },
  { series: 'Workers', cycle: 3, phase: 0.625, value: 64 },
  { series: 'Workers', cycle: 3, phase: 0.75, value: 68 },
  { series: 'Workers', cycle: 3, phase: 0.875, value: 58 },
  { series: 'Search', cycle: 0, phase: 0, value: 56 },
  { series: 'Search', cycle: 0, phase: 0.125, value: 54 },
  { series: 'Search', cycle: 0, phase: 0.25, value: 44 },
  { series: 'Search', cycle: 0, phase: 0.375, value: 29 },
  { series: 'Search', cycle: 0, phase: 0.5, value: 14 },
  { series: 'Search', cycle: 0, phase: 0.625, value: 9 },
  { series: 'Search', cycle: 0, phase: 0.75, value: 18 },
  { series: 'Search', cycle: 0, phase: 0.875, value: 39 },
  { series: 'Search', cycle: 1, phase: 0, value: 61 },
  { series: 'Search', cycle: 1, phase: 0.125, value: 72 },
  { series: 'Search', cycle: 1, phase: 0.25, value: 66 },
  { series: 'Search', cycle: 1, phase: 0.375, value: 47 },
  { series: 'Search', cycle: 1, phase: 0.5, value: 24 },
  { series: 'Search', cycle: 1, phase: 0.625, value: 10 },
  { series: 'Search', cycle: 1, phase: 0.75, value: 10 },
  { series: 'Search', cycle: 1, phase: 0.875, value: 23 },
  { series: 'Search', cycle: 2, phase: 0, value: 40 },
  { series: 'Search', cycle: 2, phase: 0.125, value: 53 },
  { series: 'Search', cycle: 2, phase: 0.25, value: 57 },
  { series: 'Search', cycle: 2, phase: 0.375, value: 54 },
  { series: 'Search', cycle: 2, phase: 0.5, value: 47 },
  { series: 'Search', cycle: 2, phase: 0.625, value: 41 },
  { series: 'Search', cycle: 2, phase: 0.75, value: 34 },
  { series: 'Search', cycle: 2, phase: 0.875, value: 28 },
  { series: 'Search', cycle: 3, phase: 0, value: 21 },
  { series: 'Search', cycle: 3, phase: 0.125, value: 19 },
  { series: 'Search', cycle: 3, phase: 0.25, value: 25 },
  { series: 'Search', cycle: 3, phase: 0.375, value: 38 },
  { series: 'Search', cycle: 3, phase: 0.5, value: 56 },
  { series: 'Search', cycle: 3, phase: 0.625, value: 67 },
  { series: 'Search', cycle: 3, phase: 0.75, value: 65 },
  { series: 'Search', cycle: 3, phase: 0.875, value: 49 },
];
export function HelixRibbonsCard<Row, const Key extends NumericKey<Row>>({
  series,
  cycle,
  phase,
  value,
  yaw,
  elevation,
  thickness,
  maxGap,
  color,
  height = 390,
  depth = true,
  ...props
}: HelixRibbonsCardProps<Row, Key>) {
  const options = { yaw, elevation, thickness, maxGap, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        depth={depth}
        height={height}
        color={color}
        family="helix-ribbons"
        layout={(data, width, h) =>
          helixRibbonsLayout(data, series, cycle, phase, value, width, h, options)
        }
        placeholder={(width, h) =>
          helixRibbonsLayout(placeholderRows, 'series', 'cycle', 'phase', 'value', width, h, {
            ...options,
          }) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
