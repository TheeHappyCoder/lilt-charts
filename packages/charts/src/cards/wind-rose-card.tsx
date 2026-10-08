'use client';
import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { windRoseLayout } from './spatial-composition-layouts';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
export { windRoseLayout } from './spatial-composition-layouts';

export interface WindRoseCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  direction: NumericKey<Row>;
  band: TextKey<Row>;
  value: Key;
  sectors?: number;
  tilt?: number;
}
const placeholderRows = [
  { direction: 0, band: 'Light', value: 5 },
  { direction: 0, band: 'Moderate', value: 18 },
  { direction: 0, band: 'Strong', value: 7 },
  { direction: 45, band: 'Light', value: 12 },
  { direction: 45, band: 'Moderate', value: 25 },
  { direction: 45, band: 'Strong', value: 14 },
  { direction: 90, band: 'Light', value: 19 },
  { direction: 90, band: 'Moderate', value: 8 },
  { direction: 90, band: 'Strong', value: 21 },
  { direction: 135, band: 'Light', value: 26 },
  { direction: 135, band: 'Moderate', value: 15 },
  { direction: 135, band: 'Strong', value: 28 },
  { direction: 180, band: 'Light', value: 9 },
  { direction: 180, band: 'Moderate', value: 22 },
  { direction: 180, band: 'Strong', value: 11 },
  { direction: 225, band: 'Light', value: 16 },
  { direction: 225, band: 'Moderate', value: 5 },
  { direction: 225, band: 'Strong', value: 18 },
  { direction: 270, band: 'Light', value: 23 },
  { direction: 270, band: 'Moderate', value: 12 },
  { direction: 270, band: 'Strong', value: 25 },
  { direction: 315, band: 'Light', value: 6 },
  { direction: 315, band: 'Moderate', value: 19 },
  { direction: 315, band: 'Strong', value: 8 },
];
export function WindRoseCard<Row, const Key extends NumericKey<Row>>({
  direction,
  band,
  value,
  sectors,
  tilt,
  color,
  height = 340,
  depth = true,
  ...props
}: WindRoseCardProps<Row, Key>) {
  const options = { sectors, tilt, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        depth={depth}
        height={height}
        color={color}
        family="wind-rose"
        layout={(data, width, h) => windRoseLayout(data, direction, band, value, width, h, options)}
        placeholder={(width, h) =>
          windRoseLayout(placeholderRows, 'direction', 'band', 'value', width, h, {
            ...options,
          }) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
