'use client';
import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { horizonFoldsLayout } from './spatial-series-layouts';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
export { horizonFoldsLayout } from './spatial-series-layouts';

export interface HorizonFoldsCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  series: TextKey<Row>;
  time: NumericKey<Row>;
  value: Key;
  bands?: number;
}
const placeholderRows = [
  { series: 'API', time: 0, value: 19 },
  { series: 'API', time: 1, value: 28 },
  { series: 'API', time: 2, value: 25 },
  { series: 'API', time: 3, value: 17 },
  { series: 'API', time: 4, value: 14 },
  { series: 'API', time: 5, value: 16 },
  { series: 'API', time: 6, value: 18 },
  { series: 'API', time: 7, value: 11 },
  { series: 'API', time: 8, value: -7 },
  { series: 'API', time: 9, value: -31 },
  { series: 'API', time: 10, value: -48 },
  { series: 'API', time: 11, value: -47 },
  { series: 'API', time: 12, value: -27 },
  { series: 'API', time: 13, value: 4 },
  { series: 'API', time: 14, value: 32 },
  { series: 'API', time: 15, value: 44 },
  { series: 'API', time: 16, value: 38 },
  { series: 'API', time: 17, value: 21 },
  { series: 'API', time: 18, value: 5 },
  { series: 'API', time: 19, value: -3 },
  { series: 'API', time: 20, value: -4 },
  { series: 'API', time: 21, value: -5 },
  { series: 'API', time: 22, value: -13 },
  { series: 'API', time: 23, value: -26 },
  { series: 'API', time: 24, value: -38 },
  { series: 'Storage', time: 0, value: 35 },
  { series: 'Storage', time: 1, value: 51 },
  { series: 'Storage', time: 2, value: 47 },
  { series: 'Storage', time: 3, value: 26 },
  { series: 'Storage', time: 4, value: -1 },
  { series: 'Storage', time: 5, value: -21 },
  { series: 'Storage', time: 6, value: -26 },
  { series: 'Storage', time: 7, value: -22 },
  { series: 'Storage', time: 8, value: -16 },
  { series: 'Storage', time: 9, value: -15 },
  { series: 'Storage', time: 10, value: -19 },
  { series: 'Storage', time: 11, value: -19 },
  { series: 'Storage', time: 12, value: -10 },
  { series: 'Storage', time: 13, value: 11 },
  { series: 'Storage', time: 14, value: 36 },
  { series: 'Storage', time: 15, value: 50 },
  { series: 'Storage', time: 16, value: 45 },
  { series: 'Storage', time: 17, value: 22 },
  { series: 'Storage', time: 18, value: -10 },
  { series: 'Storage', time: 19, value: -35 },
  { series: 'Storage', time: 20, value: -43 },
  { series: 'Storage', time: 21, value: -34 },
  { series: 'Storage', time: 22, value: -17 },
  { series: 'Storage', time: 23, value: -4 },
  { series: 'Storage', time: 24, value: 1 },
  { series: 'Workers', time: 0, value: 26 },
  { series: 'Workers', time: 1, value: 38 },
  { series: 'Workers', time: 2, value: 37 },
  { series: 'Workers', time: 3, value: 19 },
  { series: 'Workers', time: 4, value: -11 },
  { series: 'Workers', time: 5, value: -39 },
  { series: 'Workers', time: 6, value: -52 },
  { series: 'Workers', time: 7, value: -44 },
  { series: 'Workers', time: 8, value: -21 },
  { series: 'Workers', time: 9, value: 5 },
  { series: 'Workers', time: 10, value: 21 },
  { series: 'Workers', time: 11, value: 24 },
  { series: 'Workers', time: 12, value: 19 },
  { series: 'Workers', time: 13, value: 15 },
  { series: 'Workers', time: 14, value: 17 },
  { series: 'Workers', time: 15, value: 21 },
  { series: 'Workers', time: 16, value: 20 },
  { series: 'Workers', time: 17, value: 7 },
  { series: 'Workers', time: 18, value: -16 },
  { series: 'Workers', time: 19, value: -40 },
  { series: 'Workers', time: 20, value: -51 },
  { series: 'Workers', time: 21, value: -42 },
  { series: 'Workers', time: 22, value: -16 },
  { series: 'Workers', time: 23, value: 15 },
  { series: 'Workers', time: 24, value: 37 },
  { series: 'Search', time: 0, value: 4 },
  { series: 'Search', time: 1, value: -1 },
  { series: 'Search', time: 2, value: -2 },
  { series: 'Search', time: 3, value: -4 },
  { series: 'Search', time: 4, value: -15 },
  { series: 'Search', time: 5, value: -30 },
  { series: 'Search', time: 6, value: -40 },
  { series: 'Search', time: 7, value: -36 },
  { series: 'Search', time: 8, value: -14 },
  { series: 'Search', time: 9, value: 17 },
  { series: 'Search', time: 10, value: 43 },
  { series: 'Search', time: 11, value: 52 },
  { series: 'Search', time: 12, value: 40 },
  { series: 'Search', time: 13, value: 16 },
  { series: 'Search', time: 14, value: -8 },
  { series: 'Search', time: 15, value: -21 },
  { series: 'Search', time: 16, value: -22 },
  { series: 'Search', time: 17, value: -17 },
  { series: 'Search', time: 18, value: -15 },
  { series: 'Search', time: 19, value: -19 },
  { series: 'Search', time: 20, value: -23 },
  { series: 'Search', time: 21, value: -20 },
  { series: 'Search', time: 22, value: -4 },
  { series: 'Search', time: 23, value: 21 },
  { series: 'Search', time: 24, value: 44 },
];
export function HorizonFoldsCard<Row, const Key extends NumericKey<Row>>({
  series,
  time,
  value,
  bands,
  color,
  height = 330,
  depth = true,
  ...props
}: HorizonFoldsCardProps<Row, Key>) {
  const options = { bands, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        depth={depth}
        height={height}
        color={color}
        family="horizon-folds"
        layout={(data, width, h) =>
          horizonFoldsLayout(data, series, time, value, width, h, options)
        }
        placeholder={(width, h) =>
          horizonFoldsLayout(placeholderRows, 'series', 'time', 'value', width, h, {
            ...options,
          }) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
