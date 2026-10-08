'use client';
import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { marimekkoBlocksLayout } from './spatial-composition-layouts';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
export { marimekkoBlocksLayout } from './spatial-composition-layouts';

export interface MarimekkoBlocksCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  category: TextKey<Row>;
  segment: TextKey<Row>;
  value: Key;
  gap?: number;
}
const placeholderRows = [
  { category: 'Enterprise', segment: 'Platform', value: 140 },
  { category: 'Enterprise', segment: 'Services', value: 157 },
  { category: 'Enterprise', segment: 'Support', value: 174 },
  { category: 'Mid-market', segment: 'Platform', value: 116 },
  { category: 'Mid-market', segment: 'Services', value: 133 },
  { category: 'Mid-market', segment: 'Support', value: 87 },
  { category: 'Startups', segment: 'Platform', value: 110 },
  { category: 'Startups', segment: 'Services', value: 64 },
  { category: 'Startups', segment: 'Support', value: 81 },
  { category: 'Independent', segment: 'Platform', value: 60 },
  { category: 'Independent', segment: 'Services', value: 77 },
  { category: 'Independent', segment: 'Support', value: 31 },
];
export function MarimekkoBlocksCard<Row, const Key extends NumericKey<Row>>({
  category,
  segment,
  value,
  gap,
  color,
  height = 340,
  depth = true,
  ...props
}: MarimekkoBlocksCardProps<Row, Key>) {
  const options = { gap, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        depth={depth}
        height={height}
        color={color}
        family="marimekko-blocks"
        layout={(data, width, h) =>
          marimekkoBlocksLayout(data, category, segment, value, width, h, options)
        }
        placeholder={(width, h) =>
          marimekkoBlocksLayout(placeholderRows, 'category', 'segment', 'value', width, h, {
            ...options,
          }) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
